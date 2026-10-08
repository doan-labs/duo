// Session-channel regressions for the room-planner doc mirror. Two copies
// share one last-writer-wins key; delivery can be delayed, reordered or
// suppressed the way a folded, parked or starved frame delivers it.
// `bun community-apps/room-planner/sync.test.ts`
import type { History, PlanDoc } from './plan.ts'
import {
  addItem,
  commitHistory,
  coreOf,
  emptyHistory,
  parseMirror,
  resizeRoom,
  sameCore,
  serializeMirror,
  setView,
  undoHistory,
  withCore
} from './plan.ts'
import { admitEditorKey, DocSync } from './sync.ts'

let passed = 0
const failures: string[] = []
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => passed++)
    .catch((error) => failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`))
}
function ok(cond: boolean, what: string) {
  if (!cond) throw new Error(what)
}

// --- hostile session channel ---------------------------------------------
// Raw-string cell plus a watch feed the test can delay, drop or reorder per
// delivery, mirroring how the shell batches frames for an occluded display.
type Watch = (raw: string | null) => void
class Bus {
  raw: string | null = null
  watchers: Watch[] = []
  sets = 0
  hold = false
  private queue: string[] = []
  set(raw: string) {
    this.sets++
    if (this.hold) {
      this.queue.push(raw)
      return
    }
    this.raw = raw
    for (const w of this.watchers) w(raw)
  }
  flush(order?: number[]) {
    const q = this.queue.splice(0)
    const seq = order ? order.map((i) => q[i]).filter((v): v is string => v !== undefined) : q
    for (const raw of seq) {
      this.raw = raw
      for (const w of this.watchers) w(raw)
    }
  }
}

/**
 * One display copy, wired exactly like the app: publishes stamp a DocSync
 * marker then write the raw mirror; incoming mirrors adopt only through
 * DocSync.admit against the live doc, keep the local view when already
 * framed, and fold into local undo history on a same-plan adoption.
 */
class Replica {
  doc: PlanDoc | null = null
  sel: string | null = null
  hist: History = emptyHistory()
  sync: DocSync
  framed = false
  adopted: PlanDoc[] = []
  dropped: string[] = []
  constructor(
    readonly bus: Bus,
    readonly me: string
  ) {
    this.sync = new DocSync(me)
    bus.watchers.push((raw) => this.onRaw(raw))
  }
  publish(doc: PlanDoc, sel: string | null = this.sel) {
    if (this.doc && this.doc.id === doc.id && !sameCore(coreOf(this.doc), coreOf(doc))) {
      this.hist = commitHistory(this.hist, coreOf(this.doc), coreOf(doc), null)
    }
    if (this.doc && this.doc.id !== doc.id) this.hist = emptyHistory()
    this.doc = doc
    this.sel = sel
    const at = this.sync.stamp(doc)
    this.bus.set(serializeMirror(this.me, doc, sel, at))
  }
  onRaw(raw: string | null) {
    if (!raw) return
    const m = parseMirror(raw)
    if (!m || m.by === this.me) return
    const cur = this.doc
    if (!this.sync.admit(m, cur)) {
      this.dropped.push(m.doc.id)
      return
    }
    if (cur?.id === m.doc.id) {
      this.hist = commitHistory(this.hist, coreOf(cur), coreOf(m.doc), null)
    } else {
      this.hist = emptyHistory()
    }
    const keep = cur?.id === m.doc.id && this.framed
    this.doc = keep && cur ? { ...m.doc, view: cur.view } : m.doc
    this.sel = m.sel && m.doc.items[m.sel] ? m.sel : null
    this.adopted.push(m.doc)
  }
  // A fit/observer callback firing late must serve the doc on screen now,
  // never the captured one - exactly what the rebound fitLocal does.
  fireFit(capturedId: string, view: PlanDoc['view']) {
    const cur = this.doc
    if (!cur || cur.id !== capturedId) return
    this.framed = true
    this.publish(setView(cur, { ...cur.view, ...view, framed: true }))
  }
  undo() {
    const r = undoHistory(this.hist, coreOf(this.doc!))
    if (!r.core) return false
    this.hist = r.h
    this.publish(withCore(this.doc!, r.core))
    return true
  }
}

const plan = (id: string, name = id, updated = 0): PlanDoc => ({
  id,
  name,
  room: { w: 420, d: 340 },
  items: {},
  view: { x: 0, y: 0, zoom: 1, framed: false },
  born: updated,
  updated
})
const edit = (doc: PlanDoc, name: string): PlanDoc => ({ ...doc, name, updated: doc.updated + 1 })

await check('stale success after newer core ack: delayed mirror cannot revert', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  const d0 = plan('p', 'v0', 10)
  a.publish(d0)
  ok(b.doc?.updated === 10, 'peer did not adopt base')
  bus.hold = true
  a.publish(edit(a.doc!, 'v1')) // A's older write, delayed on the wire
  a.publish(edit(a.doc!, 'v2')) // A's newer write, also in flight
  bus.hold = false
  b.publish(edit(b.doc!, 'B3')) // B commits a newer core first
  bus.flush() // A's stale payloads arrive after B's newer core acked
  // v1 carries the same version as B3 and loses the writer tie-break; v2 is
  // a causally newer fork (two writes on the shared base) and legitimately
  // wins on both copies. The stale write may not appear at all.
  ok(b.doc?.name === 'v2', `B on ${b.doc?.name}`)
  ok(!b.adopted.some((d) => d.name === 'v1'), 'B adopted the stale payload')
  ok(a.doc?.name === 'v2', `A did not converge: ${a.doc?.name}`)
  ok(a.doc?.room.w === b.doc?.room.w && sameCore(coreOf(a.doc!), coreOf(b.doc!)), 'copies diverged')
})

await check('out-of-order delivery: older mirror arriving last is dropped', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  a.publish(plan('p', 'v0', 10))
  bus.hold = true
  a.publish(edit(a.doc!, 'v1'))
  a.publish(edit(a.doc!, 'v2'))
  bus.hold = false
  bus.flush([1, 0]) // newest first, then the older one
  ok(b.doc?.name === 'v2', `out-of-order delivery left ${b.doc?.name}`)
  ok(b.adopted.length === 2 && b.adopted[1]?.name === 'v2', `adopted ${b.adopted.map((d) => d.name)}`)
  ok(b.dropped.length === 1, 'older trailing mirror was not dropped')
})

await check('suppressed then old/new snapshot delivery resolves to newest', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  a.publish(plan('p', 'v0', 10))
  bus.hold = true // B is occluded: every notification is held
  const b = new Replica(bus, 'B')
  a.publish(edit(a.doc!, 'v1'))
  a.publish(edit(a.doc!, 'v2'))
  bus.hold = false
  bus.flush() // queued writes commit while the copy is still detached
  // Snapshot on resume delivers only the latest raw - a folded copy boots
  // straight onto the newest doc, no replay needed.
  const snap = bus.raw
  b.onRaw(snap)
  ok(b.doc?.name === 'v2', `resume snapshot adopted ${b.doc?.name}`)
})

await check('delayed fit after local core edits publishes the current core', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  const d0 = plan('p', 'v0', 10)
  a.publish(d0)
  // The fit for d0 is scheduled, then real edits land before it fires.
  const renamed = edit(a.doc!, 'Renamed')
  a.publish(renamed)
  const resized = resizeRoom(a.doc!, 500, 400)
  a.publish(resized)
  const spawned = addItem(a.doc!, 'sofa', 100, 100)
  a.publish(spawned.doc)
  const before = a.doc!.updated
  // The delayed RAF/RO callback fires - bound to the doc id it captured.
  a.fireFit(d0.id, { x: 5, y: 5, zoom: 2 })
  ok(a.doc!.updated === before, 'fit rewrote the doc version')
  ok(a.doc!.name === 'Renamed' && a.doc!.room.w === 500, 'fit regressed the core')
  ok(a.doc!.items[spawned.id!] !== undefined, 'fit dropped the spawned item')
  ok(a.doc!.view.zoom === 2, 'fit view did not apply')
  ok(b.doc?.name === 'Renamed' && Object.keys(b.doc!.items).length === 1, 'peer saw a regressed core')
  // A fit bound to a plan we no longer show declines entirely.
  const other = plan('q', 'other', 50)
  a.publish(other)
  const itemsBefore = a.doc!.items
  a.fireFit(d0.id, { x: 9, y: 9, zoom: 3 })
  ok(a.doc!.id === 'q' && a.doc!.items === itemsBefore && a.doc!.view.zoom !== 3, 'stale fit moved a switched plan')
})

await check('plan switch ownership: delayed old-plan mirror cannot pull us back', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  const pa = plan('pa', 'Plan A', 10)
  a.publish(pa)
  ok(b.doc?.id === 'pa', 'peer did not adopt first plan')
  bus.hold = true
  a.publish(edit(a.doc!, 'Plan A late edit')) // still on pa, delayed
  bus.hold = false
  b.publish(plan('pb', 'Plan B', 5)) // B switched to an older-stamped plan
  ok(a.doc?.id === 'pb', `peer's switch did not adopt: ${a.doc?.id}`)
  bus.flush() // A's delayed mirror of pa lands after the switch
  ok(b.doc?.id === 'pb', `stale switch pulled B back to ${b.doc?.id}`)
  ok(b.dropped.includes('pa'), 'dropped mirror not recorded')
  // A's next genuinely newer publish on pa does take the screen back: it is
  // a fresh selection by the peer, not a stale echo.
  a.publish(edit(pa, 'Plan A resumed'))
  ok(b.doc?.id === 'pa', 'newer peer state on the old plan must adopt')
})

await check('equal-ms core conflict resolves deterministically on both copies', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  const d0 = plan('p', 'v0', 10)
  a.publish(d0)
  bus.hold = true // both edit on top of v0 without seeing each other
  const da = { ...d0, name: 'from A', updated: 20 }
  const db = { ...d0, name: 'from B', updated: 20 }
  a.publish(da)
  b.publish(db)
  bus.hold = false
  bus.flush()
  ok(a.doc?.name === b.doc?.name, `diverged: A=${a.doc?.name} B=${b.doc?.name}`)
  ok(['from A', 'from B'].includes(a.doc!.name), 'converged onto phantom core')
})

await check('same-id recreate: a fresh incarnation outranks the old one', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  a.publish(plan('p', 'original', 10))
  // The plan is recreated under the same id (welcome re-seed): newer stamp.
  b.publish(plan('p', 'recreated', 99))
  ok(a.doc?.name === 'recreated', 'recreated incarnation did not adopt')
  // And the old incarnation arriving late cannot undo the recreation.
  bus.set(serializeMirror('ghost', plan('p', 'original', 10), null, 1))
  ok(a.doc?.name === 'recreated', 'stale incarnation reverted the recreate')
})

await check('undo history folds remote edits and stays undoable', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  a.publish(plan('p', 'v0', 10))
  a.publish(edit(a.doc!, 'mine'))
  b.publish(edit(b.doc!, 'theirs'))
  // A sees the remote edit as a local history entry: undo returns to 'mine'.
  ok(a.doc?.name === 'theirs', 'remote edit did not adopt')
  ok(a.undo(), 'undo produced nothing')
  ok(a.doc?.name === 'mine', `undo went to ${a.doc?.name}`)
  ok(b.doc?.name === 'mine', 'undo did not publish back to the peer')
})

await check('converged channel is quiet: no republish storm', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  new Replica(bus, 'B')
  a.publish(plan('p', 'v0', 10))
  const sets = bus.sets
  // The settled value re-delivered (watch replay, snapshot refresh) is a
  // no-op, not an echo that would republish and loop forever.
  for (let i = 0; i < 5; i++) a.onRaw(bus.raw)
  ok(bus.sets === sets, `idle re-delivery caused ${bus.sets - sets} republishes`)
})

await check('modal authority: no editor key reaches the plan under a sheet', () => {
  for (const [live, modal, field, want] of [
    [true, false, false, true],
    [true, true, false, false],
    [true, true, true, false],
    [true, false, true, false],
    [false, false, false, false],
    [false, true, false, false]
  ] as const) {
    ok(admitEditorKey(live, modal, field) === want, `live=${live} modal=${modal} field=${field} admitted ${!want}`)
  }
})

await check('view-only republication adopts only from a newer stamp', () => {
  const bus = new Bus()
  const a = new Replica(bus, 'A')
  const b = new Replica(bus, 'B')
  a.publish(plan('p', 'v0', 10))
  a.framed = true
  // A's own earlier fit republication arriving late carries the same core
  // stamp: it is a no-op for the remote, not a new head.
  const stale = serializeMirror('ghost-peer', plan('p', 'v0', 10), null, 1)
  bus.set(stale)
  ok(b.adopted.length === 1 && b.dropped.length === 1, 'equally-stamped view echo should not re-adopt')
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`sync.test.ts: ${passed} checks passed`)
