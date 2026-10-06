// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun plan.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import {
  addItem,
  cleanDoc,
  commitHistory,
  coreOf,
  emptyHistory,
  fmtDims,
  fmtLength,
  fmtSnap,
  itemRect,
  itemSize,
  latestDoc,
  moveItem,
  newPlan,
  parseLength,
  parseLibrary,
  parseMirror,
  parsePrefs,
  planIssues,
  redoHistory,
  removeItem,
  renameDoc,
  resizeRoom,
  rotateItem,
  serializeLibrary,
  serializeMirror,
  snapTo,
  undoHistory,
  wallGaps,
  welcomePlan,
  withCore,
  withDoc,
  withoutDoc
} from './plan.ts'

let passed = 0
const failures: string[] = []
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
function eq(actual: unknown, want: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}
function ok(cond: boolean, what: string) {
  if (!cond) throw new Error(what)
}
function near(actual: number, want: number, eps = 0.01) {
  if (Math.abs(actual - want) > eps) throw new Error(`got ${actual}, want ~${want}`)
}

const plan = () => newPlan('Test')

check('fmtLength picks sensible units per system', () => {
  eq(fmtLength(95, 'metric'), '95 cm')
  eq(fmtLength(460, 'metric'), '4.6 m')
  eq(fmtLength(250, 'metric'), '2.5 m')
  eq(fmtLength(55, 'imperial'), '22 in')
  eq(fmtLength(220, 'imperial'), '7 ft 3 in')
  eq(fmtLength(304.8, 'imperial'), '10 ft')
  eq(fmtLength(0, 'metric'), '0 cm')
  eq(fmtLength(0, 'imperial'), '0 in')
})

check('fmtDims shares one unit for small pairs', () => {
  eq(fmtDims(220, 95, 'metric'), '220 × 95 cm')
  eq(fmtDims(460, 360, 'metric'), '4.6 m × 3.6 m')
  eq(fmtDims(220, 95, 'imperial'), '87 × 37 in')
})

check('fmtSnap labels steps and Off', () => {
  eq(fmtSnap(0, 'metric'), 'Off')
  eq(fmtSnap(10, 'metric'), '10 cm')
  eq(fmtSnap(30.48, 'imperial'), '1 ft')
})

check('parseLength reads metric room and item fields', () => {
  near(parseLength('4.6', 'metric', 'room')!, 460)
  near(parseLength('460', 'metric', 'room')!, 460)
  near(parseLength('4.6 m', 'metric', 'room')!, 460)
  near(parseLength('460 cm', 'metric', 'room')!, 460)
  near(parseLength('95', 'metric', 'item')!, 95)
  near(parseLength('1200 mm', 'metric', 'item')!, 120)
  eq(parseLength('abc', 'metric', 'room'), null)
  eq(parseLength('', 'metric', 'room'), null)
  eq(parseLength('-3', 'metric', 'room'), null)
})

check('parseLength reads imperial forms', () => {
  near(parseLength('13 ft 6 in', 'imperial', 'room')!, 411.48)
  near(parseLength('13\'6"', 'imperial', 'room')!, 411.48)
  near(parseLength("13'", 'imperial', 'room')!, 396.24)
  near(parseLength('14', 'imperial', 'room')!, 426.72)
  near(parseLength('180', 'imperial', 'room')!, 457.2)
  near(parseLength('95', 'imperial', 'item')!, 241.3)
  near(parseLength('2 ft', 'imperial', 'item')!, 60.96)
})

check('rotated bounds swap width and depth on odd quarter turns', () => {
  const doc = plan()
  const { doc: next, id } = addItem(doc, 'sofa', 200, 100)
  eq(itemSize(next.items[id]!), { w: 220, d: 95 })
  const turned = rotateItem(next, id)
  eq(itemSize(turned.items[id]!), { w: 95, d: 220 })
  eq(turned.items[id]!.rot, 1)
  eq(itemRect(turned.items[id]!), { x0: 152.5, y0: -10, x1: 247.5, y1: 210 })
  eq(rotateItem(turned, id, -1).items[id]!.rot, 0)
  eq(rotateItem(rotateItem(rotateItem(turned, id), id), id).items[id]!.rot, 0)
})

check('containment flags breaches, never touching edges', () => {
  const doc = plan() // 420 x 340
  const { doc: placed, id } = addItem(doc, 'sofa', 210, 100)
  eq(planIssues(placed).out, [])
  const moved = moveItem(placed, id, 400, 100, 0)
  eq(planIssues(moved).out, [id])
  const rotated = rotateItem(placed, id) // 95 x 220 at y=100 breaches top
  eq(planIssues(rotated).out, [id])
  // Flush against the wall is fine.
  const flush = moveItem(placed, id, 110, 47.5, 0)
  eq(planIssues(flush).out, [])
})

check('overlaps flag both items, rugs never flag', () => {
  let doc = plan()
  const a = addItem(doc, 'sofa', 210, 100)
  doc = a.doc
  const b = addItem(doc, 'loveseat', 230, 110)
  doc = b.doc
  const issues = planIssues(doc)
  ok(issues.hits.includes(a.id) && issues.hits.includes(b.id), 'overlap pair not flagged')
  const c = addItem(doc, 'coffee', 420, 300)
  ok(!planIssues(c.doc).hits.includes(c.id), 'far item flagged')
  // A rug under everything is a surface, not a collision.
  const r = addItem(doc, 'rug', 220, 105)
  ok(!planIssues(r.doc).hits.includes(r.id), 'rug flagged for furniture on top')
  const far = moveItem(doc, b.id, 400, 300, 0)
  eq(planIssues(far).hits, [])
})

check('snap rounds to the step, zero disables it', () => {
  eq(snapTo(12.4, 0), 12.4)
  eq(snapTo(12.4, 5), 10)
  eq(snapTo(12.6, 5), 15)
  eq(snapTo(12.4, 10), 10)
  near(snapTo(7.2, 2.54), 7.62)
  const doc = plan()
  const { doc: placed, id } = addItem(doc, 'chair', 100, 100)
  const snapped = moveItem(placed, id, 103, 97, 5)
  eq([snapped.items[id]!.x, snapped.items[id]!.y], [105, 95])
  const free = moveItem(placed, id, 103.4, 96.6, 0)
  eq([free.items[id]!.x, free.items[id]!.y], [103, 97])
})

check('undo/redo walks snapshots and tags collapse runs', () => {
  let doc = plan()
  let h = emptyHistory()
  const commit = (next: typeof doc, tag: string | null = null) => {
    h = commitHistory(h, coreOf(doc), coreOf(next), tag)
    doc = next
  }
  commit(renameDoc(doc, 'A'), 'name')
  commit(renameDoc(doc, 'AB'), 'name') // collapses into the 'name' entry
  const added = addItem(doc, 'sofa', 100, 100)
  commit(added.doc)
  commit(resizeRoom(doc, 500, 400))
  eq(h.past.length, 3)
  const u1 = undoHistory(h, coreOf(doc))
  doc = withCore(doc, u1.core!)
  h = u1.h
  eq(doc.room, { w: 420, d: 340 })
  const u2 = undoHistory(h, coreOf(doc))
  doc = withCore(doc, u2.core!)
  h = u2.h
  eq(Object.keys(doc.items).length, 0)
  const u3 = undoHistory(h, coreOf(doc))
  doc = withCore(doc, u3.core!)
  h = u3.h
  eq(doc.name, 'Test')
  eq(undoHistory(h, coreOf(doc)).core, null)
  const r1 = redoHistory(h, coreOf(doc))
  doc = withCore(doc, r1.core!)
  h = r1.h
  eq(doc.name, 'AB') // the collapsed run redoes to the last typed name
  commit(addItem(doc, 'chair', 60, 60).doc) // a new commit kills the redo tail
  eq(h.future.length, 0)
})

check('undo survives remote adoptions as history entries', () => {
  // Two copies: local A edits, remote B's state arrives, undo on A steps back
  // through B's change too.
  const docA = plan()
  let h = commitHistory(emptyHistory(), coreOf(docA), coreOf(renameDoc(docA, 'A1')))
  const local = renameDoc(docA, 'A1')
  const remote = { ...resizeRoom(local, 600, 500), updated: Date.now() }
  h = commitHistory(h, coreOf(local), coreOf(remote))
  const u = undoHistory(h, coreOf(remote))
  eq(u.core!.room, { w: 420, d: 340 })
})

check('identifiers stay stable across a wire roundtrip', () => {
  const { doc, id } = addItem(plan(), 'desk', 120, 80)
  const mirror = parseMirror(serializeMirror('me', doc, id))!
  eq(mirror.sel, id)
  eq(Object.keys(mirror.doc.items), [id])
  const lib = parseLibrary(serializeLibrary({ plans: { [doc.id]: doc } }))
  eq(Object.keys(lib.plans[doc.id]!.items), [id])
  eq(lib.plans[doc.id]!.id, doc.id)
})

check('cleanDoc repairs corrupt shapes instead of throwing', () => {
  eq(cleanDoc(null), null)
  eq(cleanDoc('junk'), null)
  const doc = cleanDoc({
    id: 'x',
    name: '  ',
    room: { w: -5, d: 99999 },
    items: {
      ok: { kind: 'sofa', x: 10, y: 10, rot: 7 },
      bad: { kind: 'spaceship', x: 0, y: 0, rot: 0 },
      worse: 'nope'
    },
    view: { zoom: 999 }
  })!
  eq(doc.room.w, 120)
  eq(doc.room.d, 3000)
  eq(Object.keys(doc.items), ['ok'])
  eq(doc.items.ok!.rot, 3)
  ok(doc.view.zoom <= 4, 'zoom not clamped')
  eq(doc.name, 'Untitled layout')
})

check('parseLibrary and parseMirror survive garbage', () => {
  eq(parseLibrary(null).plans, {})
  eq(parseLibrary('{oops').plans, {})
  eq(parseLibrary('{"plans":{"a":{"room":{}}}}').plans.a!.room.w, 420)
  eq(parseMirror(null), null)
  eq(parseMirror('{"by":"x","doc":null}'), null)
  eq(parsePrefs('junk'), { units: 'metric', snap: 10, muted: false })
  eq(parsePrefs('{"units":"imperial","snap":30.48,"muted":true}'), { units: 'imperial', snap: 30.48, muted: true })
})

check('library helpers pick newest, drop plans, keep others', () => {
  const a = { ...plan(), id: 'a', updated: 1 }
  const b = { ...plan(), id: 'b', updated: 2 }
  const lib = withDoc(withDoc({ plans: {} }, a), b)
  eq(latestDoc(lib)!.id, 'b')
  eq(latestDoc(withoutDoc(lib, 'b'))!.id, 'a')
})

check('the welcome plan is clean and inside its room', () => {
  const doc = welcomePlan()
  eq(planIssues(doc), { out: [], hits: [] })
  ok(Object.keys(doc.items).length >= 6, 'welcome plan too sparse')
  for (const item of Object.values(doc.items)) {
    const r = itemRect(item)
    ok(r.x0 >= 0 && r.y0 >= 0 && r.x1 <= doc.room.w && r.y1 <= doc.room.d, `${item.id} out of room`)
  }
})

check('wallGaps reads distances and goes negative outside', () => {
  const doc = plan() // 420 x 340
  const { doc: placed, id } = addItem(doc, 'chair', 100, 100)
  const gaps = wallGaps(placed.room, placed.items[id]!)
  near(gaps.l, 77.5)
  near(gaps.t, 76)
  near(gaps.r, 297.5)
  near(gaps.b, 216)
  const moved = moveItem(placed, id, -20, 100, 0)
  ok(wallGaps(moved.room, moved.items[id]!).l < 0, 'gap should be negative')
})

check('edits bump the clock, no-ops do not', () => {
  const doc = { ...plan(), updated: 5 }
  eq(moveItem(doc, 'missing', 0, 0, 0), doc)
  eq(rotateItem(doc, 'missing'), doc)
  eq(removeItem(doc, 'missing'), doc)
  eq(resizeRoom(doc, 420, 340), doc)
  eq(renameDoc(doc, 'Test'), doc)
  ok(
    rotateItem(addItem(doc, 'chair', 50, 50).doc, Object.keys(addItem(doc, 'chair', 50, 50).doc.items)[0]!).updated > 5,
    'rotate should touch'
  )
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`plan.test.ts: ${passed} checks passed`)
