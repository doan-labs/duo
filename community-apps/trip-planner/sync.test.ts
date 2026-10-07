/**
 * Throw-runner tests for the sync primitives in `sync.ts` — the ordering
 * and failure semantics the review called out: stale echoes must never roll
 * back newer pending writes, foreign state is adopted only when nothing is
 * pending, and a failed port write reports failure instead of false success.
 * Run: bun community-apps/trip-planner/sync.test.ts
 */
import { applyWatch, clearPending, queuePending, WriteQueue } from './sync'

let passed = 0
let failed = 0
function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1
    console.log(`ok ${name}`)
  } else {
    failed += 1
    console.log(`FAIL ${name}`)
  }
}
const mkPending = () => new Map<string, (string | null)[]>()

// --- applyWatch ---------------------------------------------------------------

// In-order own echoes: effective value stays the newest write.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'B')
  check('older echo keeps pending tail', applyWatch(p, 'k', 'A') === 'B')
  check('latest echo leaves its own value', applyWatch(p, 'k', 'B') === 'B')
  check('pending drained after echoes', p.size === 0)
}

// The reported loss sequence: C rebases between echoA and echoB must see B.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'AB')
  const afterEchoA = applyWatch(p, 'k', 'A')
  check('echo of A does not roll back AB', afterEchoA === 'AB')
  queuePending(p, 'k', 'ABC')
  check('echo of AB keeps queued ABC', applyWatch(p, 'k', 'AB') === 'ABC')
  check('final echo converges', applyWatch(p, 'k', 'ABC') === 'ABC')
}

// Foreign write with nothing pending is adopted verbatim.
{
  const p = mkPending()
  check('foreign write adopted', applyWatch(p, 'k', 'F') === 'F')
  check('foreign delete adopted', applyWatch(p, 'k', null) === null)
}

// Foreign write while own writes are pending: the queued tail stays
// effective because the own writes land after it on the port (LWW).
{
  const p = mkPending()
  queuePending(p, 'k', 'B')
  check('foreign during pending is overridden by tail', applyWatch(p, 'k', 'F') === 'B')
  check('own echo then applies', applyWatch(p, 'k', 'B') === 'B')
}

// A pending delete (null tail) also survives an older echo.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', null)
  check('echo of A keeps pending delete', applyWatch(p, 'k', 'A') === null)
  check('delete echo converges', applyWatch(p, 'k', null) === null)
}

// Out-of-order echo that does not match the head is foreign data; the
// pending tail still wins and the head stays for its own echo.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'B')
  check('unmatched echo leaves head queued', applyWatch(p, 'k', 'X') === 'B' && p.get('k')?.length === 2)
}

// clearPending drops the mask (post-failure path): next foreign echo applies.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  clearPending(p, 'k')
  check('after clearPending foreign wins', applyWatch(p, 'k', 'F') === 'F')
}

// Per-key isolation: pending on k1 must not affect k2 events.
{
  const p = mkPending()
  queuePending(p, 'k1', 'A')
  check('other key adopts foreign', applyWatch(p, 'k2', 'F') === 'F')
  check('k1 echo still acks', applyWatch(p, 'k1', 'A') === 'A')
}

// --- WriteQueue ---------------------------------------------------------------

// Ordering: writes land serially in enqueue order.
{
  const q = new WriteQueue()
  const order: number[] = []
  let gate = 0
  const done = [
    q.send(
      async () => {
        await new Promise((r) => setTimeout(r, 5))
        order.push(1)
      },
      () => {}
    ),
    q.send(
      async () => {
        order.push(2)
      },
      () => {}
    ),
    q.send(
      async () => {
        order.push(3)
      },
      () => {}
    )
  ]
  const ok = await Promise.all(done)
  gate = 1
  check('writes execute in order', order.join(',') === '1,2,3' && gate === 1)
  check('all succeeded', ok.every(Boolean))
}

// Failure injection: rejected write resolves false, calls onFail once, and
// does not block or poison later writes.
{
  const q = new WriteQueue()
  let fails = 0
  const results = await Promise.all([
    q.send(
      async () => {},
      () => fails++
    ),
    q.send(
      async () => {
        throw new Error('port rejected')
      },
      () => fails++
    ),
    q.send(
      async () => {},
      () => fails++
    )
  ])
  check('failed write reports false', results[1] === false)
  check('neighbors still land', results[0] === true && results[2] === true)
  check('onFail fired once', fails === 1)
}

// settled(): false when any enqueued write failed, true when all landed.
{
  const q = new WriteQueue()
  q.send(
    async () => {},
    () => {}
  )
  check('settled true after success', (await q.settled()) === true)

  const q2 = new WriteQueue()
  q2.send(
    async () => {
      throw new Error('x')
    },
    () => {}
  )
  check('settled false after failure', (await q2.settled()) === false)

  // A failure snapshot taken at call time does not wait on writes enqueued later.
  const q3 = new WriteQueue()
  q3.send(
    async () => {},
    () => {}
  )
  const early = q3.settled()
  q3.send(
    async () => {},
    () => {}
  )
  check('settled snapshots inflight set', (await early) === true)
}

// send() itself never rejects on port failure (callers get boolean outcomes).
{
  const q = new WriteQueue()
  const r = await q.send(
    async () => {
      throw new Error('boom')
    },
    () => {}
  )
  check('send resolves not rejects on failure', r === false)
}

// --- commitLibWrites -----------------------------------------------------------
// Real boolean-adapter fault harness: every op resolves a durable boolean
// (or throws, like a rejected port write). Failures are injected per key,
// foreign writes interleave between steps, and the backing Map is inspected
// afterwards exactly like a resnapshot would.

import { commitLibWrites, type LibStore } from './sync'
import {
  addTrip,
  assembleLibrary,
  isTombValue,
  planLibWrites,
  removeTrip,
  restoreTrip,
  serializeIndex,
  serializeTrip,
  togglePack,
  updateTrip
} from './trips'

class Store implements LibStore {
  map = new Map<string, string>()
  // Rejection counts are keyed per op (`put trip.x` vs `del trip.x`), so a
  // record's forward put can be poisoned separately from its tomb's cleanup.
  rejects = new Map<string, number>()
  // Succeed this many calls, then reject: a repair write to a key whose
  // forward write already landed fails this way.
  failAfter = new Map<string, number>()
  delays = new Map<string, number>()
  log: string[] = []
  foreign: ((store: Store, op: string) => Promise<void>) | null = null
  private okCalls = new Map<string, number>()
  private async op(kind: string, key: string, v?: string) {
    const id = `${kind} ${key}`
    this.log.push(id)
    const d = this.delays.get(key)
    if (d) await new Promise((r) => setTimeout(r, d))
    const left = this.rejects.get(id) ?? 0
    if (left > 0) {
      this.rejects.set(id, left - 1)
      throw new Error(`rejected ${id}`)
    }
    const fa = this.failAfter.get(id)
    if (fa !== undefined && (this.okCalls.get(id) ?? 0) >= fa) throw new Error(`rejected ${id}`)
    this.okCalls.set(id, (this.okCalls.get(id) ?? 0) + 1)
    if (kind === 'put') this.map.set(key, v ?? '')
    else this.map.delete(key)
    return true
  }
  async put(k: string, v: string) {
    await this.foreign?.(this, `put ${k}`)
    return this.op('put', k, v)
  }
  async del(k: string) {
    await this.foreign?.(this, `del ${k}`)
    return this.op('del', k)
  }
  // The authoritative read a snapshot would return.
  async get(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  // What a resnapshot would see: no index ref without a stored live record.
  dangling() {
    const order = JSON.parse(this.map.get('index') ?? '{"order":[]}').order as string[]
    return order.filter((id) => {
      const v = this.map.get(`trip.${id}`)
      return v === undefined || isTombValue(v)
    })
  }
  lib() {
    const records = new Map<string, string>()
    for (const [k, v] of this.map) if (k.startsWith('trip.')) records.set(k, v)
    return assembleLibrary(this.map.get('index') ?? null, records)
  }
}

const lib0 = { order: [] as string[], trips: [] as import('./trips').Trip[] }
const mk = () => {
  const a = addTrip(lib0, { name: 'A', start: '2026-03-01', end: '2026-03-05' }, 1, 'ta')
  const b = addTrip(a.lib, { name: 'B', start: '2026-04-01', end: '2026-04-03' }, 2, 'tb')
  return { lib: b.lib, ta: a.trip, tb: b.trip }
}
const seed = (s: Store, lib: { order: string[]; trips: import('./trips').Trip[] }) => {
  s.map.set('index', serializeIndex(lib.order))
  for (const t of lib.trips) s.map.set(`trip.${t.id}`, serializeTrip(t))
}
const prevOf = (lib: { order: string[]; trips: import('./trips').Trip[] }) => (k: string) => {
  if (k === 'index') return serializeIndex(lib.order)
  const t = lib.trips.find((x) => `trip.${x.id}` === k)
  return t ? serializeTrip(t) : undefined
}

// Plan shape: a delete must commit the index, then tomb the record, then
// schedule the guarded cleanup del.
{
  const { lib } = mk()
  const next = removeTrip(lib, 'ta').lib
  const plan = planLibWrites(lib, next)
  check(
    'delete plan orders index, tomb, then record del',
    plan.map((w) => `${w.kind} ${w.key}`).join('|') === 'put index|tomb trip.ta|del trip.ta'
  )
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const plan2 = planLibWrites(lib, c.lib)
  check(
    'create plan orders record before index',
    plan2.map((w) => `${w.kind} ${w.key}`).join('|') === 'put trip.tc|put index'
  )
}

// Happy delete: index commits, cleanup del lands, result applied.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  await new Promise((r) => setTimeout(r, 30))
  check('delete applied', ok === 'applied')
  check('record deleted', !s.map.has('trip.ta'))
  check('index dropped id', !JSON.parse(s.map.get('index')!).order.includes('ta'))
  check('no dangling', s.dangling().length === 0)
}

// Index put permanently rejected on delete: reported failed AND the trip is
// still stored+indexed - never silently deleted.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  check('delete reports failed', ok === 'failed')
  check('trip survives failed delete', s.map.has('trip.ta'))
  check('index still reaches it', JSON.parse(s.map.get('index')!).order.includes('ta'))
}

// Create, record put rejected: index is never reached, nothing dangles.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.tc', 9)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('create reports failed', ok === 'failed')
  check('new record not stored', !s.map.has('trip.tc'))
  check('index unchanged', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
  check('no dangling after failed create', s.dangling().length === 0)
}

// Create, index rejected after the record landed: the un-referenced record is
// repaired away - the store matches the reported failure.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('create failed terminal', ok === 'failed')
  check('orphaned new record repaired', !s.map.has('trip.tc'))
  check('index still original', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Mixed diff (rename A + add C + delete B), the add is rejected: prior edits
// are repaired to their previous values - nothing half-applied.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  let next = updateTrip(lib, 'ta', { name: 'A2' })
  const c = addTrip(next, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  next = removeTrip(c.lib, 'tb').lib
  s.rejects.set('put trip.tc', 9)
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  check('mixed diff reports failed', ok === 'failed')
  check('earlier edit repaired to prev', JSON.parse(s.map.get('trip.ta')!).name === 'A')
  check('removed trip still stored', s.map.has('trip.tb'))
  check('index unchanged on repair', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Transient reject on the first attempt recovers inside the write.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.tc', 1)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('transient reject still applied', ok === 'applied')
  check('record present', s.map.has('trip.tc'))
}

// Delayed step: a slow put does not reorder later writes.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.delays.set('trip.tc', 150)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('delayed step applied', ok === 'applied')
  check('index written after slow record', s.log.indexOf('put index') > s.log.indexOf('put trip.tc'))
}

// A foreign write landing between the record put and the index put neither
// corrupts the diff nor is lost itself.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  s.foreign = async (store, op) => {
    if (op === 'put index' && !store.map.has('foreign.k')) store.map.set('foreign.k', 'other-copy')
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('foreign write between steps lands', s.map.get('foreign.k') === 'other-copy')
  check('diff still applied', ok === 'applied' && s.map.has('trip.tc'))
}

// Cleanup del rejected permanently: the tomb stays - an acknowledged
// deletion is never resurrected by the assembler, and the unreachable
// debris is reclaimable by any later pass that sees it still tombed.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('del trip.ta', 9)
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  check('cleanup failure still reports applied', ok === 'applied')
  check('index authoritative', !JSON.parse(s.map.get('index')!).order.includes('ta'))
  await new Promise((r) => setTimeout(r, 2600))
  check('del retried to exhaustion', s.log.filter((l) => l === 'del trip.ta').length === 3)
  check('acknowledged delete never resurfaces', !s.lib().trips.some((t) => t.id === 'ta'))
  check('tomb debris is all that remains', isTombValue(s.map.get('trip.ta')))
  check('no dangling index ref', s.dangling().length === 0)
}

// Edit-only diff: a rejected record write leaves the previous record intact.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.ta', 9)
  const next = togglePack(togglePack(lib, 'ta', 'x'), 'ta', 'x')
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  check('edit reports failed', ok === 'failed')
  check('previous record intact', JSON.parse(s.map.get('trip.ta')!).name === 'A')
}
// Generation binding on cleanup: a same-id restore (Undo) committed while an
// old cleanup retry is still pending makes the next attempt read a LIVE
// record and skip the delete - the old generation can never erase the new
// incarnation. Exercises two independent commit calls on one shared store.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('del trip.ta', 1) // first cleanup attempt rejected; retry at 250ms
  const deletedLib = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, deletedLib), prevOf(lib))
  check('delete applied before restore', ok === 'applied')
  // The restore (Undo) lands inside the 250ms cleanup sleep.
  const restored = restoreTrip(deletedLib, ta, 0)
  const ok2 = await commitLibWrites(s, planLibWrites(deletedLib, restored), prevOf(deletedLib))
  check('restore applied during cleanup sleep', ok2 === 'applied')
  await new Promise((r) => setTimeout(r, 2600))
  check(
    'stale cleanup never erased the restore',
    s.lib().trips.some((t) => t.id === 'ta')
  )
  check('restored record is live, not tomb', s.map.has('trip.ta') && !isTombValue(s.map.get('trip.ta')))
  check('index reaches the restore', JSON.parse(s.map.get('index')!).order.includes('ta'))
}

// Same generation guard via an interleaved foreign restore: the cleanup
// read already sees peer live data and skips - no del is even attempted.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  const origGet = s.get.bind(s)
  let restored = false
  s.get = async (k: string) => {
    if (k === 'trip.ta' && !restored) {
      restored = true
      s.map.set('trip.ta', serializeTrip({ ...ta, name: 'RESTORED' }))
      s.map.set('index', serializeIndex(['ta', 'tb']))
    }
    return origGet(k)
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, removeTrip(lib, 'ta').lib), prevOf(lib))
  check('delete applied with pending cleanup', ok === 'applied')
  await new Promise((r) => setTimeout(r, 2600))
  check(
    'cleanup skipped the live restore',
    s.lib().trips.some((t) => t.id === 'ta' && t.name === 'RESTORED')
  )
  check('no del attempted against a live record', !s.log.includes('del trip.ta'))
}

// Honest partial: the second record write is rejected and the repair of the
// first also fails - 'partial', never a clean 'failed' over half-applied
// state; the durable store shows exactly the half that landed.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const next = updateTrip(updateTrip(lib, 'ta', { name: 'A2' }), 'tb', { name: 'B2' })
  s.rejects.set('put trip.tb', 9)
  s.failAfter.set('put trip.ta', 1) // forward put lands; the repair re-put rejects
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  check('unrepairable commit reports partial', ok === 'partial')
  check('landed half remains durable', JSON.parse(s.map.get('trip.ta')!).name === 'A2')
  check('rejected half unchanged', JSON.parse(s.map.get('trip.tb')!).name === 'B')
  check('index untouched', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Foreign write owns a slot mid-commit: the repair must not clobber peer
// data - outcome is partial and the peer value survives.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  s.rejects.set('put index', 9)
  s.foreign = async (store, op) => {
    if (op === 'put index') store.map.set('trip.tc', serializeTrip({ ...c.trip, name: 'PEER' }))
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('foreign-owned slot reports partial', ok === 'partial')
  check('peer value preserved, not clobbered', JSON.parse(s.map.get('trip.tc')!).name === 'PEER')
}

// Legitimate orphan recovery preserved: a create whose record landed but
// whose index write AND repair del both failed leaves an unmarked orphan -
// still recovered by the assembler on resnapshot.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  s.rejects.set('del trip.tc', 9)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib), prevOf(lib))
  check('unrepairable create reports partial', ok === 'partial')
  check('orphan record survives', s.map.has('trip.tc'))
  check(
    'resnapshot recovers the orphan',
    s.lib().trips.some((t) => t.id === 'tc')
  )
}

// Tomb-put rejected after the index moved: repair restores the old index,
// the live record survives - a failed delete leaves the trip intact.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.ta', 9) // the tomb write is a put to trip.ta
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next), prevOf(lib))
  check('tomb failure reports failed', ok === 'failed')
  check('trip survives', s.map.has('trip.ta') && !isTombValue(s.map.get('trip.ta')))
  check('index restored', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Index-only reorder failure: nothing was applied, clean failed.
{
  const { lib, ta, tb } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  const reordered = { order: ['tb', 'ta'], trips: [tb, ta] }
  const ok = await commitLibWrites(s, planLibWrites(lib, reordered), prevOf(lib))
  check('reorder reports failed', ok === 'failed')
  check('index unchanged on reorder failure', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

console.log(`\nsync: ${passed} passed, ${failed} failed`)
if (failed) throw new Error(`${failed} checks failed`)
