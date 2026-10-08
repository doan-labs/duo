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
  isDeadIncarnation,
  isOlderEdit,
  itemRect,
  itemSize,
  latestDoc,
  mergeLib,
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
  sameCore,
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
  const lib = parseLibrary(serializeLibrary({ rev: 0, plans: { [doc.id]: doc }, gone: {} }))
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
  const lib = withDoc(withDoc({ rev: 0, plans: {}, gone: {} }, a), b)
  eq(latestDoc(lib)!.id, 'b')
  eq(latestDoc(withoutDoc(lib, 'b'))!.id, 'a')
})

check('mergeLib unions racing libraries, tombstones stop resurrection', () => {
  const a = { ...plan(), id: 'a', born: 5, updated: 5 }
  const b = { ...plan(), id: 'b', born: 3, updated: 3 }
  const left = { rev: 4, plans: { a, b }, gone: {} }
  // Right deleted plan a while it held a stale b and a fresh c.
  const c = { ...plan(), id: 'c', born: 9, updated: 9 }
  const right = { rev: 4, plans: { b: { ...b, updated: 7 }, c }, gone: { a: { ts: 100, born: 5 } } }
  const merged = mergeLib(left, right)
  eq(Object.keys(merged.plans).sort(), ['b', 'c'])
  eq(merged.plans.b!.updated, 7)
  eq(merged.rev, 4)
  // Order-independent: the same two writes merge the same way either direction.
  eq(mergeLib(right, left), merged)
  // A re-publish of the deleted incarnation always loses to its tomb, no
  // matter how far ahead it stamps `updated` - this is the ghost-publish
  // path that used to resurrect deleted plans.
  const ghost = { ...a, updated: 200 }
  eq(mergeLib({ rev: 0, plans: { a: ghost }, gone: {} }, right).plans.a, undefined)
  // A plan born again after the tomb is a new incarnation, not a ghost:
  // same-id recreation survives legitimately.
  const recreated = { ...a, born: 200, updated: 200 }
  eq(mergeLib({ rev: 0, plans: { a: recreated }, gone: {} }, right).plans.a!.updated, 200)
})

check('a tombstone kills the whole incarnation, ghosts and honest edits alike', () => {
  const a = { ...plan(), id: 'a', born: 50, updated: 50 }
  const dead = withoutDoc({ rev: 0, plans: { a }, gone: {} }, 'a')
  const tomb = dead.gone.a!
  ok(isDeadIncarnation(a, dead.gone), 'the deleted doc is a dead incarnation')
  ok(!isDeadIncarnation({ ...a, born: tomb.born + 1 }, dead.gone), 'a newer incarnation lives')
  // A peer's unsent edit of the deleted plan (newer `updated`, same `born`)
  // is dead too: the tomb witnessed that incarnation and wins causally.
  const ghost = { ...a, updated: tomb.ts + 500 }
  eq(mergeLib(dead, { rev: 0, plans: { a: ghost }, gone: {} }).plans.a, undefined)
  // The same stamp on a plan born after the tomb is a recreation and lives.
  const again = { ...a, born: tomb.born + 1, updated: tomb.ts + 500 }
  eq(mergeLib(dead, { rev: 0, plans: { a: again }, gone: {} }).plans.a, again)
  // Tomb union keeps the stronger bound in either write order.
  const weak = { rev: 0, plans: {}, gone: { a: { ts: 1, born: 1 } } }
  eq(mergeLib(weak, dead).gone.a, tomb)
  eq(mergeLib(dead, weak).gone.a, tomb)
})

check('deleting a doc the write never saw still bounds pre-delete incarnations', () => {
  // The deleted plan sat on a peer newer than this read reached: with no doc
  // in view the tomb bounds by its own delete stamp, so anything born before
  // the deletion dies and later recreations live.
  const dead = withoutDoc({ rev: 0, plans: {}, gone: {} }, 'a')
  const tomb = dead.gone.a!
  const stalePeerDoc = { ...plan(), id: 'a', born: tomb.ts - 1, updated: tomb.ts - 1 }
  eq(mergeLib(dead, { rev: 0, plans: { a: stalePeerDoc }, gone: {} }).plans.a, undefined)
  const peerRecreated = { ...plan(), id: 'a', born: tomb.ts + 1, updated: tomb.ts + 1 }
  eq(mergeLib(dead, { rev: 0, plans: { a: peerRecreated }, gone: {} }).plans.a, peerRecreated)
})

check('isOlderEdit flags a stale-base publish only for the same doc', () => {
  const base = { ...plan(), id: 'a', updated: 5 }
  ok(isOlderEdit(base, { id: 'a', updated: 9 }), 'same doc, older base should be stale')
  ok(!isOlderEdit(base, { id: 'a', updated: 5 }), 'fresh base should publish')
  ok(!isOlderEdit(base, { id: 'other', updated: 9 }), 'different doc unaffected')
  ok(!isOlderEdit(base, null), 'no remote write yet')
})

check('parseLibrary reads rev and gone, defaults on junk', () => {
  const lib = parseLibrary('{"rev":7,"plans":{},"gone":{"a":12}}')
  eq(lib.rev, 7)
  eq(lib.gone, { a: { ts: 12, born: 12 } })
  eq(parseLibrary(null), { rev: 0, plans: {}, gone: {} })
  eq(parseLibrary('{oops'), { rev: 0, plans: {}, gone: {} })
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

check('imperial display never carries a 12-inch remainder', () => {
  eq(fmtLength(457, 'imperial'), '15 ft') // was `14 ft 12 in`
  eq(fmtLength(335.28, 'imperial'), '11 ft')
  eq(fmtLength(396.24, 'imperial'), '13 ft')
  eq(fmtLength(30.48, 'imperial'), '1 ft')
  eq(fmtLength(60.96, 'imperial'), '2 ft')
  eq(fmtLength(55, 'imperial'), '22 in')
  eq(fmtLength(59.69, 'imperial'), '2 ft') // 23.5 in rounds up to 24
  eq(fmtLength(-127, 'imperial'), '-4 ft 2 in')
  eq(fmtLength(-30.48, 'imperial'), '-1 ft')
  // Whole-foot sizes 4..98 ft plus edges: no `12 in` residue anywhere.
  for (let ft = 4; ft <= 98; ft++) {
    const text = fmtLength(ft * 30.48, 'imperial')
    eq(text, `${ft} ft`)
    ok(!text.includes('12 in'), `${text} carried a foot remainder`)
  }
  for (const cm of [0.1, 15.24, 213.36, 335.279, 396.241, 2899.92, -213.36]) {
    ok(!fmtLength(cm, 'imperial').includes('12 in'), `${fmtLength(cm, 'imperial')} carried a foot remainder`)
  }
})

check('rename moves the version and wins the library merge', () => {
  const doc = { ...plan(), id: 'a', updated: 1000 }
  const renamed = renameDoc(doc, 'Kitchen')
  ok(renamed.updated > doc.updated, 'rename did not touch the doc')
  // Same-millisecond stamp on the stored copy: the writer's merge side wins.
  const stored = { ...doc, updated: renamed.updated }
  const lib = mergeLib({ rev: 0, plans: { a: stored }, gone: {} }, { rev: 0, plans: { a: renamed }, gone: {} })
  eq(lib.plans.a!.name, 'Kitchen')
  // And against a genuinely stale stored copy.
  const merged = mergeLib({ rev: 0, plans: { a: doc }, gone: {} }, { rev: 0, plans: { a: renamed }, gone: {} })
  eq(merged.plans.a!.name, 'Kitchen')
  // Strictly increasing even inside one millisecond.
  const now = { ...plan(), updated: Date.now() }
  const r1 = renameDoc(now, 'A')
  const r2 = renameDoc(r1, 'AB')
  ok(r1.updated > now.updated && r2.updated > r1.updated, 'updated must strictly increase')
  eq(renameDoc(now, '   '), now)
  eq(renameDoc(now, now.name), now)
})

check('a tombstone outranks even a clock-inflated doc', () => {
  const doc = { ...plan(), id: 'a', updated: Date.now() + 100000 }
  const lib = withoutDoc({ rev: 0, plans: { a: doc }, gone: {} }, 'a')
  ok(lib.gone.a!.ts > doc.updated, 'tombstone lost to the inflated doc stamp')
  eq(mergeLib(lib, { rev: 0, plans: { a: doc }, gone: {} }).plans.a, undefined)
})

check('sameCore compares structure, so wire clones write no history', () => {
  const doc = addItem(plan(), 'sofa', 100, 100).doc
  // A remote adoption arrives as a fresh parse: identical truth, new objects.
  const wire = parseMirror(serializeMirror('peer', doc, null))!.doc
  ok(doc.items !== wire.items, 'the clone should not share references')
  ok(sameCore(coreOf(doc), coreOf(wire)), 'structural cores should match')
  const h = commitHistory(emptyHistory(), coreOf(doc), coreOf(wire))
  eq(h.past.length, 0)
  const remote = renameDoc(wire, 'Elsewhere')
  eq(commitHistory(emptyHistory(), coreOf(doc), coreOf(remote)).past.length, 1)
})

check('parseLength accepts a leading-dot decimal only when well-formed', () => {
  near(parseLength('.5 m', 'metric', 'room')!, 50)
  near(parseLength('.5', 'metric', 'room')!, 50)
  near(parseLength('.5 ft', 'imperial', 'room')!, 15.24)
  eq(parseLength('5.', 'metric', 'room'), null)
  eq(parseLength('.5.5', 'metric', 'room'), null)
  eq(parseLength('..5', 'metric', 'room'), null)
  eq(parseLength('.', 'metric', 'room'), null)
})

check('snap-stepped nudges land on the grid without drift', () => {
  let doc = addItem(plan(), 'chair', 152, 91).doc
  const id = Object.keys(doc.items)[0]!
  // Five one-foot presses: each lands on a 30.48 cm line at full precision.
  for (let i = 0; i < 5; i++) doc = moveItem(doc, id, doc.items[id]!.x + 30.48, doc.items[id]!.y, 30.48)
  near(doc.items[id]!.x, 182.88 + 4 * 30.48)
  eq(doc.items[id]!.x, 304.8)
  // Back off the grid edge and a rotated piece keeps the same precision.
  const rotated = rotateItem(doc, id)
  const back = moveItem(rotated, id, rotated.items[id]!.x - 30.48, rotated.items[id]!.y, 30.48)
  eq(back.items[id]!.x, 274.32)
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
