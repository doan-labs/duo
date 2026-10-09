// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun circuit.test.ts` directly, and `bun
// test` too (a failing check throws while the file is evaluated, which the
// runner reports as a failure).
import { CHALLENGES, challengeRun, scaffold } from './challenges.ts'
import {
  addNode,
  bulbsOf,
  type CircuitNode,
  cleanDoc,
  cleanView,
  commit,
  commitMove,
  connect,
  type Doc,
  decideRemote,
  decodeLibrary,
  evaluate,
  type Library,
  latestDoc,
  layoutPads,
  MAX_SWITCHES,
  type Mirror,
  moveNode,
  type NodeKind,
  newDoc,
  PIN_PAD,
  parseLibrary,
  parseMirror,
  reaches,
  redo,
  removeNode,
  removeWire,
  serializeLibrary,
  serializeMirror,
  switchesOf,
  TABLE_INPUT_LIMIT,
  toggleSwitch,
  truthTable,
  undo,
  type Wire,
  WORLD_LIMIT,
  welcomeDoc,
  wireAt,
  withDoc,
  withoutDoc
} from './circuit.ts'
import { dropDocIntent, dropOpenIntent, libWrite, putDocIntent, solvedIntent, writeConditional } from './persist.ts'

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

let seq = 0
const mk = (kind: NodeKind, label = '', on = false, x = 0, y = 0): CircuitNode => ({
  id: `n${seq++}`,
  kind,
  x,
  y,
  on,
  label
})
const mkDoc = (nodes: CircuitNode[], wires: [string, string, number][] = []): Doc => ({
  id: `d${seq++}`,
  name: 'Test',
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  wires: Object.fromEntries(
    wires.map(([from, to, port], i) => [`w${i}-${seq++}`, { id: `w${i}-${seq}`, from, to, port } satisfies Wire])
  ),
  view: { x: 0, y: 0, zoom: 1 },
  past: [],
  future: [],
  challenge: null,
  updated: 0
})
const mustWire = (doc: Doc, from: string, to: string, port: number): Doc => {
  const r = connect(doc, from, to, port)
  if (r.error) throw new Error(`wire ${from}->${to}:${port} refused: ${r.error}`)
  return r.doc
}
/**
 * Binds a doc variable and adds gates into it: `const g = bind(d)` returns an
 * `add(kind)` that updates the bound doc and hands back the new node's id.
 */
const gateBinder = (target: { d: Doc }) => {
  return (kind: NodeKind): string => {
    const r = addNode(target.d, kind, 0, seq * 8)
    if (r.error) throw new Error(`add ${kind} refused: ${r.error}`)
    target.d = r.doc
    return r.id
  }
}
const val = (doc: Doc, id: string, states?: Record<string, boolean>) => evaluate(doc, states).value[id]

// ---- gates ---------------------------------------------------------------

check('each gate computes its truth table', () => {
  const a = mk('switch', 'A', true)
  const b = mk('switch', 'B', false)
  for (const [kind, want] of [
    ['and', false],
    ['or', true],
    ['xor', true]
  ] as const) {
    const g = mk(kind)
    const d = mkDoc(
      [a, b, g],
      [
        [a.id, g.id, 0],
        [b.id, g.id, 1]
      ]
    )
    eq(val(d, g.id), want)
  }
  const inv = mk('not')
  eq(val(mkDoc([a, inv], [[a.id, inv.id, 0]]), inv.id), false)
  eq(val(mkDoc([b, inv], [[b.id, inv.id, 0]]), inv.id), true)
})

check('evaluation is topological across a gate chain', () => {
  const a = mk('switch', 'A', true)
  const b = mk('switch', 'B', true)
  const g1 = mk('and')
  const g2 = mk('not')
  const out = mk('bulb', 'OUT')
  // !(A && B) = 0; the NOT must not see a stale AND value.
  const d = mkDoc(
    [a, b, g1, g2, out],
    [
      [a.id, g1.id, 0],
      [b.id, g1.id, 1],
      [g1.id, g2.id, 0],
      [g2.id, out.id, 0]
    ]
  )
  eq(val(d, out.id), false)
  const { depth } = evaluate(d)
  eq(depth[a.id], 0)
  eq(depth[g1.id], 1)
  eq(depth[g2.id], 2)
  eq(depth[out.id], 3)
})

check('a disconnected pin reads LOW', () => {
  const a = mk('switch', 'A', true)
  const g = mk('and')
  const out = mk('bulb', 'OUT')
  // AND with only one pin wired is LOW even when that pin is HIGH.
  const d = mkDoc(
    [a, g, out],
    [
      [a.id, g.id, 0],
      [g.id, out.id, 0]
    ]
  )
  eq(val(d, g.id), false)
  eq(val(d, out.id), false)
  // An entirely unwired bulb reads LOW rather than failing.
  eq(val(mkDoc([out]), out.id), false)
})

// ---- wires ---------------------------------------------------------------

check('connect validates pins, self and occupancy', () => {
  const a = mk('switch', 'A')
  const g = mk('or')
  const out = mk('bulb', 'OUT')
  let d = mkDoc([a, g, out])
  eq(connect(d, g.id, a.id, 0).error, 'bad-pin') // a switch has no input pin
  eq(connect(d, out.id, g.id, 0).error, 'bad-pin') // a bulb has no output pin
  eq(connect(d, a.id, g.id, 2).error, 'bad-pin') // OR has only ports 0 and 1
  eq(connect(d, g.id, g.id, 0).error, 'self')
  d = mustWire(d, a.id, g.id, 0)
  const first = wireAt(d, g.id, 0)!
  const r = addNode(d, 'switch', 0, 80, 'C')
  d = r.doc
  // Landing on an occupied pin replaces its wire instead of duplicating it.
  const r2 = connect(d, r.id, g.id, 0)
  eq(r2.error, undefined)
  eq(r2.replaced!.id, first.id)
  eq(wireAt(r2.doc, g.id, 0)!.from, r.id)
  eq(Object.keys(r2.doc.wires).length, 1)
})

check('cycles are refused and stored loops are repaired', () => {
  const a = mk('switch', 'A', true)
  const g1 = mk('and')
  const g2 = mk('not')
  const out = mk('bulb', 'OUT')
  let d = mkDoc([a, g1, g2, out])
  d = mustWire(d, a.id, g1.id, 0)
  d = mustWire(d, a.id, g1.id, 1)
  d = mustWire(d, g1.id, g2.id, 0)
  // Closing g2 back into g1 would make a loop.
  eq(connect(d, g2.id, g1.id, 0).error, 'cycle')
  // reaches(doc, to, from): 'does `to` reach `from`'. g1 feeds g2, so g2 can
  // trace back to g1 through no path... the traversal runs along wires: g1
  // reaches g2 forward, g2 reaches g1 only if it could close the loop.
  eq(reaches(d, g1.id, g2.id), true)
  eq(reaches(d, g2.id, g1.id), false)

  // Data repair: hand cleanDoc a raw loop on otherwise-free pins and it cuts
  // the wire that would close it.
  const raw = {
    nodes: { [a.id]: a, [g1.id]: g1, [g2.id]: g2 },
    wires: {
      w1: { id: 'w1', from: a.id, to: g1.id, port: 0 },
      w3: { id: 'w3', from: g1.id, to: g2.id, port: 0 },
      w4: { id: 'w4', from: g2.id, to: g1.id, port: 1 }
    },
    view: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: []
  }
  const cleaned = parseLibrary(JSON.stringify({ circuits: { t: raw } }))
  const cd = cleaned.circuits.t!
  eq(Object.keys(cd.wires).length, 2)
  eq(evaluate(cd).dead.size, 0)
})

check('evaluate cannot hang on a dead region', () => {
  // Fabricate the corruption cleanDoc would strip: a raw two-node loop that
  // somehow reached evaluate anyway must read LOW and flag both nodes dead.
  const g1 = mk('not')
  const g2 = mk('not')
  const d = mkDoc(
    [g1, g2],
    [
      [g1.id, g2.id, 0],
      [g2.id, g1.id, 0]
    ]
  )
  const { value, dead } = evaluate(d)
  eq(value[g1.id], false)
  eq(value[g2.id], false)
  eq(dead.has(g1.id), true)
  eq(dead.has(g2.id), true)
})

// ---- nodes, undo, limits ---------------------------------------------------

check('deleting a node takes its wires with it', () => {
  const a = mk('switch', 'A')
  const g = mk('and')
  const out = mk('bulb', 'OUT')
  let d = mkDoc([a, g, out])
  d = mustWire(d, a.id, g.id, 0)
  d = mustWire(d, g.id, out.id, 0)
  d = removeNode(d, g.id)
  eq(Object.keys(d.nodes).length, 2)
  eq(Object.keys(d.wires).length, 0)
  d = removeWire(d, 'missing')
  eq(Object.keys(d.wires).length, 0)
})

check('undo and redo walk the structure but keep switch play state', () => {
  const a = mk('switch', 'A')
  let d = mkDoc([a])
  const r = addNode(d, 'and', 100, 0)
  d = r.doc
  eq(Object.keys(d.nodes).length, 2)
  d = undo(d)
  eq(Object.keys(d.nodes).length, 1)
  d = redo(d)
  eq(Object.keys(d.nodes).length, 2)
  // A switch flipped after an undo step keeps its position through redo.
  const swId = switchesOf(d)[0]!.id
  d = toggleSwitch(d, swId)
  d = undo(d)
  eq(d.nodes[swId]!.on, true)
  eq(Object.keys(d.nodes).length, 1)
  d = redo(d)
  eq(d.nodes[swId]!.on, true)
})

check('a drag is one undo step landing on the pre-drag spot', () => {
  const a = mk('switch', 'A', false, 0, 0)
  let d = mkDoc([a])
  d = moveNode(d, a.id, 117, -53)
  d = commitMove(d, a.id, 0, 0)
  const n = d.nodes[a.id]!
  eq([n.x, n.y], [110, -44]) // snapped to the 22px grid
  d = undo(d)
  eq([d.nodes[a.id]!.x, d.nodes[a.id]!.y], [0, 0])
})

check('part and wire limits refuse cleanly', () => {
  let d = mkDoc([])
  for (let i = 0; i < 4; i++) d = addNode(d, 'switch', 0, i * 90, `S${i}`).doc
  eq(addNode(d, 'switch', 0, 500, 'E').error, 'switch-limit')
  for (let i = 0; i < 4; i++) d = addNode(d, 'bulb', 400, i * 90, `Y${i}`).doc
  eq(addNode(d, 'bulb', 400, 500, 'E').error, 'bulb-limit')
  for (let i = 0; i < 22; i++) d = addNode(d, 'not', 200, i * 60).doc!
  eq(addNode(d, 'and', 0, 0).error, 'gate-limit')
})

check('challenge docs lock their I/O row', () => {
  const ch = CHALLENGES[0]!
  const d = scaffold(ch)
  eq(addNode(d, 'switch', 0, 300, 'X').error, 'io-locked')
  eq(addNode(d, 'bulb', 0, 300, 'X').error, 'io-locked')
  eq(addNode(d, 'and', 0, 0).error, undefined)
})

// ---- truth table -----------------------------------------------------------

check('four switches enumerate sixteen rows in binary order', () => {
  const sw = [0, 1, 2, 3].map((i) => mk('switch', 'ABCD'[i]!, false, 0, i * 90))
  const out = mk('bulb', 'OUT')
  let d = mkDoc([...sw, out])
  d = mustWire(d, sw[0]!.id, out.id, 0)
  const t = truthTable(d)
  eq(t.rows.length, 16)
  // Row index equals the input bits: row 5 is 0101 -> A=0,B=1,C=0,D=1.
  eq(t.rows[5]!.ins, [false, true, false, true])
  eq(t.rows[0]!.outs, [false])
  eq(t.rows[15]!.outs, [true]) // row 15 has A=1 and only A feeds OUT
  eq(t.rows[8]!.outs, [true]) // 1000: A on, rest off
  eq(t.rows[7]!.outs, [false]) // 0111: A off
  // A on switch B: rows where B (second input) is 1.
  d = removeWire(d, wireAt(d, out.id, 0)!.id)
  d = mustWire(d, sw[1]!.id, out.id, 0)
  const t2 = truthTable(d)
  eq(t2.rows[5]!.outs, [true]) // 0101: B=1
  eq(t2.rows[8]!.outs, [false]) // 1000: B=0
})

// ---- persistence roundtrips -----------------------------------------------

check('library and mirror roundtrip structurally identical', () => {
  let d = welcomeDoc()
  d = toggleSwitch(d, switchesOf(d)[0]!.id)
  const r = connect(d, switchesOf(d)[0]!.id, bulbsOf(d)[0]!.id, 0)
  d = r.doc
  const lib = withDoc({ circuits: {}, tombs: {}, solved: ['two-keys'], muted: true }, d)
  const back = parseLibrary(serializeLibrary(lib))
  eq(back.solved, ['two-keys'])
  eq(back.muted, true)
  eq(back.circuits[d.id]!.nodes, d.nodes)
  eq(back.circuits[d.id]!.wires, d.wires)
  eq(back.circuits[d.id]!.challenge, null)

  const m = parseMirror(serializeMirror('peer', d, { kind: 'node', id: switchesOf(d)[0]!.id }))
  eq(m!.sel!.id, switchesOf(d)[0]!.id)
  eq(m!.doc.nodes[switchesOf(d)[0]!.id]!.on, true)
  // A selection pointing at a pruned node hydrates to null, not a dangle.
  const m2 = parseMirror(serializeMirror('peer', d, { kind: 'node', id: 'gone' }))
  eq(m2!.sel, null)
})

check('hydration survives nulls, junk and primitives', () => {
  eq(parseLibrary(null).circuits, {})
  eq(parseLibrary('').circuits, {})
  eq(parseLibrary('null').circuits, {})
  eq(parseLibrary('42').circuits, {})
  eq(parseLibrary('{oops').circuits, {})
  eq(parseLibrary('{"circuits":{"x":5}}').circuits, {})
  eq(parseLibrary('{"solved":"no","muted":"yes"}').solved, [])
  eq(parseMirror(null), null)
  eq(parseMirror('null'), null)
  eq(parseMirror('"str"'), null)
  eq(parseMirror('{"by":1}'), null)
})

check('latestDoc and withoutDoc pick and remove', () => {
  const a = { ...newDoc('one'), updated: 10 }
  const b = { ...newDoc('two'), updated: 30 }
  const lib = withDoc(withDoc({ circuits: {}, tombs: {}, solved: [], muted: false }, a), b)
  eq(latestDoc(lib)!.id, b.id)
  eq(Object.keys(withoutDoc(lib, b.id).circuits).length, 1)
})

// ---- every challenge has a working build -------------------------------------

/** Builds A XOR B without the XOR chip: (A and !B) or (!A and B). */
const buildXorFromParts = (d: Doc, a: string, b: string, out: string): Doc => {
  const box = { d }
  const g = gateBinder(box)
  const na = g('not')
  const nb = g('not')
  const ga = g('and')
  const gb = g('and')
  const go = g('or')
  let x = box.d
  // ga = A and !B, gb = !A and B.
  x = mustWire(x, a, na, 0)
  x = mustWire(x, b, nb, 0)
  x = mustWire(x, a, ga, 0)
  x = mustWire(x, nb, ga, 1)
  x = mustWire(x, na, gb, 0)
  x = mustWire(x, b, gb, 1)
  x = mustWire(x, ga, go, 0)
  x = mustWire(x, gb, go, 1)
  return mustWire(x, go, out, 0)
}

check('every challenge can be solved', () => {
  for (const ch of CHALLENGES) {
    let d = scaffold(ch)
    const sw = switchesOf(d)
    const bl = bulbsOf(d)
    ok(sw.length === ch.inputs && bl.length === ch.outputs.length, `${ch.id} scaffold I/O`)
    if (ch.id === 'first-light') {
      d = mustWire(d, sw[0]!.id, bl[0]!.id, 0)
    } else if (ch.id === 'two-keys' || ch.id === 'either-door') {
      const box = { d }
      const g = gateBinder(box)(ch.id === 'two-keys' ? 'and' : 'or')
      d = box.d
      d = mustWire(d, sw[0]!.id, g, 0)
      d = mustWire(d, sw[1]!.id, g, 1)
      d = mustWire(d, g, bl[0]!.id, 0)
    } else if (ch.id === 'the-opposite') {
      const box = { d }
      const g = gateBinder(box)('not')
      d = box.d
      d = mustWire(d, sw[0]!.id, g, 0)
      d = mustWire(d, g, bl[0]!.id, 0)
    } else if (ch.id === 'different') {
      d = buildXorFromParts(d, sw[0]!.id, sw[1]!.id, bl[0]!.id)
    } else if (ch.id === 'all-agree') {
      // (A and B) or (!A and !B)
      const box = { d }
      const g = gateBinder(box)
      const na = g('not')
      const nb = g('not')
      const g1 = g('and')
      const g2 = g('and')
      const go = g('or')
      d = box.d
      d = mustWire(d, sw[0]!.id, na, 0)
      d = mustWire(d, sw[1]!.id, nb, 0)
      d = mustWire(d, sw[0]!.id, g1, 0)
      d = mustWire(d, sw[1]!.id, g1, 1)
      d = mustWire(d, na, g2, 0)
      d = mustWire(d, nb, g2, 1)
      d = mustWire(d, g1, go, 0)
      d = mustWire(d, g2, go, 1)
      d = mustWire(d, go, bl[0]!.id, 0)
    } else if (ch.id === 'majority') {
      // AB or AC or BC
      const box = { d }
      const g = gateBinder(box)
      const ab = g('and')
      const ac = g('and')
      const bc = g('and')
      const o1 = g('or')
      const o2 = g('or')
      d = box.d
      d = mustWire(d, sw[0]!.id, ab, 0)
      d = mustWire(d, sw[1]!.id, ab, 1)
      d = mustWire(d, sw[0]!.id, ac, 0)
      d = mustWire(d, sw[2]!.id, ac, 1)
      d = mustWire(d, sw[1]!.id, bc, 0)
      d = mustWire(d, sw[2]!.id, bc, 1)
      d = mustWire(d, ab, o1, 0)
      d = mustWire(d, ac, o1, 1)
      d = mustWire(d, o1, o2, 0)
      d = mustWire(d, bc, o2, 1)
      d = mustWire(d, o2, bl[0]!.id, 0)
    } else if (ch.id === 'half-adder') {
      const box = { d }
      const g = gateBinder(box)
      const sx = g('xor')
      const cy = g('and')
      d = box.d
      for (const g of [sx, cy]) {
        d = mustWire(d, sw[0]!.id, g, 0)
        d = mustWire(d, sw[1]!.id, g, 1)
      }
      d = mustWire(d, sx, bl[0]!.id, 0)
      d = mustWire(d, cy, bl[1]!.id, 0)
    } else if (ch.id === 'four-door') {
      const box = { d }
      const add = gateBinder(box)
      const o1 = add('or')
      const o2 = add('or')
      const g = add('and')
      d = box.d
      d = mustWire(d, sw[0]!.id, o1, 0)
      d = mustWire(d, sw[1]!.id, o1, 1)
      d = mustWire(d, sw[2]!.id, o2, 0)
      d = mustWire(d, sw[3]!.id, o2, 1)
      d = mustWire(d, o1, g, 0)
      d = mustWire(d, o2, g, 1)
      d = mustWire(d, g, bl[0]!.id, 0)
    } else {
      throw new Error(`no solution builder for ${ch.id}`)
    }
    const run = challengeRun(d, ch)
    ok(run.solved, `${ch.id} solution rejected; first mismatch row ${run.mismatch}`)
  }
})

// ---- integrity: ports, caps, merge ----------------------------------------

check('connect requires an integer in-range port', () => {
  const a = mk('switch', 'A')
  const g = mk('and')
  const d = mkDoc([a, g])
  eq(connect(d, a.id, g.id, 0.5).error, 'bad-pin')
  eq(connect(d, a.id, g.id, 0.9).error, 'bad-pin')
  eq(connect(d, a.id, g.id, 2.1).error, 'bad-pin')
  eq(connect(d, a.id, g.id, 0).error, undefined)
})

check('stored docs drop fractional ports and overflow kinds', () => {
  const nodes: Record<string, unknown> = {}
  for (let i = 0; i < 30; i++) nodes[`s${i}`] = { kind: 'switch', x: 0, y: i * 60, on: i % 2 === 0, label: `S${i}` }
  for (let i = 0; i < 25; i++) nodes[`g${i}`] = { kind: 'and', x: 300, y: i * 60, on: false, label: '' }
  nodes.out = { kind: 'bulb', x: 600, y: 0, on: false, label: 'OUT' }
  const cleaned = cleanDoc({
    id: 't',
    name: 'tampered',
    nodes,
    wires: {
      w1: { from: 's0', to: 'out', port: 0.9 },
      w2: { from: 's1', to: 'out', port: 0 }
    },
    view: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: [],
    challenge: null,
    updated: 1
  })!
  ok(cleaned !== null, 'doc normalizes instead of failing')
  eq(switchesOf(cleaned).length, MAX_SWITCHES)
  eq(cleaned.nodes.out !== undefined, true)
  // The fractional port is dropped, not floored: s0 does not secretly wire.
  eq(Object.keys(cleaned.wires).length, 1)
  eq(Object.values(cleaned.wires)[0]!.from, 's1')
})

check('truthTable is bounded on oversized input sets', () => {
  const sw = Array.from({ length: 30 }, (_, i) => mk('switch', `S${i}`, false, 0, i * 60))
  const d = mkDoc(sw)
  const start = Date.now()
  const t = truthTable(d)
  const ms = Date.now() - start
  ok(ms < 1000, `truth table took ${ms}ms`)
  eq(t.ins.length, TABLE_INPUT_LIMIT)
  eq(t.rows.length, 1 << TABLE_INPUT_LIMIT)
  eq(t.truncated, true)
})

check('mirror ops round-trip through the wire format', () => {
  const a = mk('switch', 'A')
  const d = mkDoc([a])
  const m = parseMirror(serializeMirror('peer', d, null, 4, { t: 'toggle', id: a.id }))!
  eq(m!.base, 4)
  eq(m!.op, { t: 'toggle', id: a.id })
  // Absent, junk and unsafe ops all hydrate to null, never to a crash.
  eq(parseMirror(serializeMirror('peer', d, null, 4))!.op, null)
  const bad = JSON.parse(serializeMirror('peer', d, null, 4, { t: 'wire', from: a.id, to: a.id, port: 0 }))
  bad.op = { t: 'wire', from: 'x', to: 'y', port: 1.5 }
  eq(parseMirror(JSON.stringify(bad))!.op, null)
})

// A pair of copies plus a session counter drives the merge protocol through
// the same decideRemote the app calls - not a reimplementation of it. Revs
// are explicit in each test so stale bases and positions are unambiguous.
const mkPair = () => {
  let rev = 0
  const side = (name: string) => ({ name, doc: null as Doc | null, docRev: 0, answered: -1 })
  const a = side('A')
  const b = side('B')
  const deliver = (to: typeof a, m: Mirror, mRev: number): void => {
    rev = Math.max(rev, mRev)
    const d = decideRemote(to.doc, to.docRev, m, mRev, to.answered)
    if (d.kind === 'drop') return
    if (d.kind === 'adopt') {
      to.doc = d.doc
      to.docRev = mRev
      return
    }
    to.answered = mRev
    to.doc = d.doc
    rev++
    deliver(to === a ? b : a, { by: to.name, sel: null, doc: d.doc, base: d.base, op: null }, rev)
    to.docRev = rev
  }
  return {
    a,
    b,
    deliver,
    get rev() {
      return rev
    }
  }
}

check('a stale fork merges its op instead of overwriting or winning', () => {
  const a = mk('switch', 'A')
  const b = mk('switch', 'B')
  const g = mk('and')
  const shared = { ...mkDoc([a, b, g]), id: 'shared' }
  const pair = mkPair()
  pair.a.doc = shared
  pair.b.doc = shared
  // A's toggle write lands at rev5 and both copies hold it.
  const aDoc = toggleSwitch(shared, a.id)
  pair.a.doc = aDoc
  pair.a.docRev = 5
  pair.deliver(pair.b, { by: 'A', sel: null, doc: aDoc, base: 4, op: { t: 'toggle', id: a.id } }, 5)
  eq(pair.b.docRev, 5)
  eq(pair.b.doc!.nodes[a.id]!.on, true)
  // B's copy was frozen at rev4 and writes anyway: the stale fork.
  pair.b.doc = shared
  pair.b.docRev = 4
  const bDoc = connect(shared, b.id, g.id, 0).doc
  const stale: Mirror = {
    by: 'B',
    sel: null,
    doc: bDoc,
    base: 4,
    op: { t: 'wire', from: b.id, to: g.id, port: 0 }
  }
  pair.deliver(pair.a, stale, 6)
  // A healed, and the merged doc carries both edits.
  ok(wireAt(pair.a.doc!, g.id, 0) !== undefined, 'B wire merged onto A doc')
  eq(pair.a.doc!.nodes[a.id]!.on, true)
  // B adopted the heal - converged on the union, nothing lost.
  eq(pair.b.doc!.nodes[a.id]!.on, true)
  ok(wireAt(pair.b.doc!, g.id, 0) !== undefined, 'B adopted the merged doc')
  ok(pair.b.docRev >= 6, `B docRev ${pair.b.docRev} did not move past the heal`)
})

check('a stale unmergeable op converges without losing the holder doc', () => {
  const a = mk('switch', 'A')
  const shared = { ...mkDoc([a]), id: 'shared2' }
  const pair = mkPair()
  pair.a.doc = shared
  pair.b.doc = shared
  pair.a.docRev = 5
  pair.b.docRev = 4
  // B's stale write is an undo - a whole-doc op that cannot merge.
  const staleDoc = { ...undo({ ...shared, past: [{ nodes: {}, wires: {} }] }), id: 'shared2' }
  const stale: Mirror = { by: 'B', sel: null, doc: staleDoc, base: 4, op: { t: 'doc' } }
  pair.deliver(pair.a, stale, 6)
  eq(pair.a.doc!.nodes[a.id]!.id, a.id)
  eq(pair.b.doc!.nodes[a.id]!.id, a.id)
  // A replay of the same stale write is dropped, not re-healed.
  const before = pair.rev
  pair.deliver(pair.a, stale, 6)
  eq(pair.rev, before)
})

check('a stale op=null write merges its doc content instead of clobbering', () => {
  // The live regression: a fit/selection mirror carries no op, so a holder
  // that answered by republishing its own doc let the stale side adopt it and
  // lose a fresh wire. The heal must union whatever the stale doc holds.
  const a = mk('switch', 'A')
  const b = mk('switch', 'B')
  const g = mk('and')
  const shared = { ...mkDoc([a, b, g]), id: 'shared3' }
  const pair = mkPair()
  // The holder's doc has A's toggle at rev5.
  const aDoc = toggleSwitch(shared, a.id)
  pair.a.doc = aDoc
  pair.a.docRev = 5
  // The stale side forked at rev4, then wired B->g AND moved g before writing
  // a snapshot-style mirror (no op, e.g. a fit or selection write).
  const b1 = connect(shared, b.id, g.id, 0).doc
  // The stale doc is timestamped newest: its last edit came after the fork.
  const bDoc = { ...moveNode(b1, g.id, g.x + 30, g.y), updated: aDoc.updated + 5000 }
  pair.b.doc = bDoc
  pair.b.docRev = 4
  pair.deliver(pair.a, { by: 'B', sel: null, doc: bDoc, base: 4, op: null }, 6)
  // Both sides converge on the union: A's toggle and B's wire and move.
  for (const side of [pair.a.doc, pair.b.doc]) {
    ok(side!.nodes[a.id]!.on === true, 'holder toggle kept')
    ok(wireAt(side!, g.id, 0) !== undefined, 'stale wire kept via union')
    eq(side!.nodes[g.id]!.x, g.x + 30)
  }
})

check('a holder drop is not resurrected by a stale union merge', () => {
  const a = mk('switch', 'A')
  const g = mk('and')
  const shared = { ...mkDoc([a, g]), id: 'shared4' }
  const pair = mkPair()
  // The holder deleted g at rev5: its history shows g was dropped.
  const aDoc = removeNode(commit(shared, { nodes: shared.nodes, wires: {} }), g.id)
  pair.a.doc = aDoc
  pair.a.docRev = 5
  // The stale side forked before the delete and still holds g.
  pair.b.doc = shared
  pair.b.docRev = 4
  pair.deliver(pair.a, { by: 'B', sel: null, doc: shared, base: 4, op: null }, 6)
  for (const side of [pair.a.doc, pair.b.doc]) {
    ok(side!.nodes[g.id] === undefined, 'dropped node must stay dropped')
  }
})

check('pin pads repel to unambiguous 44pt targets', () => {
  // Two input pins 18.67 world units apart, seen at cover zoom ~0.47:
  // pads must end up at least PIN_PAD apart centre-to-centre.
  const pins = [
    { key: 'a:0', x: 0, y: 0, dir: -1 as const },
    { key: 'a:1', x: 0, y: 18.67, dir: -1 as const }
  ]
  const pads = layoutPads(pins, 0.47)
  const dScreen = Math.hypot((pads[0]!.x - pads[1]!.x) * 0.47, (pads[0]!.y - pads[1]!.y) * 0.47)
  ok(dScreen >= PIN_PAD - 0.5, `pads only ${dScreen.toFixed(1)}px apart`)
  ok(!pads[0]!.off && !pads[1]!.off, 'both pads active at cover zoom')
  // Pads anchor outside the body: an input pad's inner edge sits at or left of
  // the pin, never over it.
  for (const p of pads) ok(p.x * 0.47 <= -PIN_PAD / 2 + 0.5, 'input pad covers only outward space')
  // Well separated pins keep their anchored positions.
  const wide = layoutPads(
    [
      { key: 'a', x: 0, y: 0, dir: 1 as const },
      { key: 'b', x: 500, y: 0, dir: -1 as const }
    ],
    1
  )
  eq([wide[0]!.x, wide[0]!.y], [PIN_PAD / 2, 0])
  eq([wide[1]!.x, wide[1]!.y], [500 - PIN_PAD / 2, 0])
  // Deep in the weeds every pad is off - dots render instead.
  ok(
    layoutPads(pins, 0.3).every((p) => p.off),
    'pads off below PIN_PAD_ZOOM'
  )
})

check('dense pin clusters fall back deterministically without ambiguity', () => {
  // Two columns one narrow gap apart at cover zoom: the gap cannot host
  // back-to-back 44pt pads on both sides, so pads retire deterministically -
  // never two live pads overlapping, never a live pad on a foreign body core.
  const bodies = [
    { id: 'a', x: -60, y: -30, w: 60, h: 60, inputs: false, output: true },
    { id: 'b', x: 20, y: -30, w: 60, h: 60, inputs: true, output: false }
  ]
  const pins = [
    { key: 'a:out', x: 0, y: 0, dir: 1 as const },
    { key: 'b:0', x: 20, y: -10, dir: -1 as const },
    { key: 'b:1', x: 20, y: 10, dir: -1 as const }
  ]
  const zoom = 0.55
  const pads = layoutPads(pins, zoom, bodies)
  eq(layoutPads(pins, zoom, bodies), pads)
  const live = pads.filter((p) => !p.off)
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      ok(
        Math.abs(live[i]!.x - live[j]!.x) * zoom >= PIN_PAD - 0.5 ||
          Math.abs(live[i]!.y - live[j]!.y) * zoom >= PIN_PAD - 0.5,
        'live pads stay disjoint'
      )
    }
    for (const b of bodies) {
      const strip = b.w * 0.2
      const coreX = b.x + (b.inputs ? strip : 0)
      const coreW = b.w - (b.inputs ? strip : 0) - (b.output ? strip : 0)
      const hitsCore =
        live[i]!.x * zoom + PIN_PAD / 2 > coreX * zoom &&
        live[i]!.x * zoom - PIN_PAD / 2 < (coreX + coreW) * zoom &&
        live[i]!.y * zoom + PIN_PAD / 2 > b.y * zoom &&
        live[i]!.y * zoom - PIN_PAD / 2 < (b.y + b.h) * zoom
      ok(!(b.id !== live[i]!.key.split(':')[0] && hitsCore), 'no live pad on a foreign body core')
    }
  }
})

check('a stored camera round-trips through cleanView', () => {
  const v = cleanView(JSON.parse('{"x":5,"y":-7,"zoom":0.46,"framed":false}'))
  eq(v, { x: 5, y: -7, zoom: 0.46, framed: false })
  const wild = cleanView({ x: 1e9, y: -1e9, zoom: 99, framed: true })
  ok(wild.zoom <= 2.5 && wild.x <= WORLD_LIMIT * 2, 'wild camera clamps')
  ok(!('framed' in wild) || wild.framed === false, 'no stored camera claims to be framed')
})

check('the welcome circuit is a working half adder', () => {
  const d = welcomeDoc()
  const t = truthTable(d)
  eq(
    t.rows.map((r) => r.outs),
    [
      [false, false],
      [true, false],
      [true, false],
      [false, true]
    ]
  )
})

check('two concurrent welcome seeds merge into one identical half adder', () => {
  // Both displays seed on a fresh boot: constant ids make the two writes
  // describe the same graph, so the heal merge cannot duplicate nodes.
  const seedA = welcomeDoc()
  const seedB = welcomeDoc()
  eq(Object.keys(seedA.nodes).sort(), Object.keys(seedB.nodes).sort())
  eq(Object.keys(seedA.wires).sort(), Object.keys(seedB.wires).sort())
  // Adversarial order: B seeds null state, A's write arrives, then B's own
  // stale seed reaches A and heals - neither direction may double the graph.
  const pair = mkPair()
  pair.deliver(pair.a, { by: 'B', sel: null, doc: seedB, base: 0, op: { t: 'doc' } }, 1)
  pair.a.docRev = 1
  pair.deliver(pair.a, { by: 'B', sel: null, doc: seedA, base: 0, op: { t: 'doc' } }, 2)
  eq(Object.keys(pair.a.doc!.nodes).length, 6)
  eq(Object.keys(pair.a.doc!.wires).length, 6)
  for (const n of Object.values(pair.a.doc!.nodes)) eq(welcomeDoc().nodes[n.id]!.kind, n.kind)
  // And B converges to the same graph once A's mirror answers.
  pair.deliver(pair.b, { by: 'A', sel: null, doc: pair.a.doc!, base: 2, op: null }, 3)
  eq(Object.keys(pair.b.doc!.nodes).length, 6)
  eq(Object.keys(pair.b.doc!.wires).length, 6)
})

// ---- conditional write contract: rev/gen CAS over the durable space ---------
//
// The adapter below implements the accepted SDK contract (rev+gen guard inside
// the write transaction, E_CONFLICT/E_GONE/E_TIMEOUT as distinct failures) so
// the app's actual persist intents and writeConditional/libWrite helpers run
// against it unchanged - not a re-implementation of them.

const asyncChecks: Promise<void>[] = []
function checkAsync(name: string, fn: () => Promise<void>) {
  asyncChecks.push(
    fn()
      .then(() => {
        passed++
      })
      .catch((error) => {
        failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
      })
  )
}

class MemKV {
  values = new Map<string, string>()
  rev = 0
  gen = 1
  /** When set, the next set/del throws this code instead of committing. */
  inject: string | null = null
  /** When true, entry() throws (read failure). */
  entryFails = false
  async entry(k: string) {
    if (this.entryFails) throw new Error('read failed')
    return { k, v: this.values.get(k) ?? null, rev: this.rev, gen: this.gen }
  }
  async set(k: string, v: string, expect?: { rev: number; gen: number }) {
    if (this.inject) {
      const code = this.inject
      this.inject = null
      throw Object.assign(new Error(code), { code })
    }
    if (expect) {
      if (expect.gen !== this.gen) throw Object.assign(new Error('gone'), { code: 'E_GONE' })
      if (expect.rev !== this.rev) throw Object.assign(new Error('conflict'), { code: 'E_CONFLICT' })
    }
    this.values.set(k, v)
    return { rev: ++this.rev }
  }
  async del(k: string, expect?: { rev: number; gen: number }) {
    if (this.inject) {
      const code = this.inject
      this.inject = null
      throw Object.assign(new Error(code), { code })
    }
    if (expect) {
      if (expect.gen !== this.gen) throw Object.assign(new Error('gone'), { code: 'E_GONE' })
      if (expect.rev !== this.rev) throw Object.assign(new Error('conflict'), { code: 'E_CONFLICT' })
    }
    this.values.delete(k)
    return { rev: ++this.rev }
  }
}

const LIBKEY = 'circuitlab-library'
const saved = (kv: MemKV) =>
  kv.values.get(LIBKEY) === undefined ? null : (decodeLibrary(kv.values.get(LIBKEY)!) as Library)
const fresh = () => ({ circuits: {}, tombs: {}, solved: [] as string[], muted: false })

checkAsync('two concurrent null seeds commit exactly one welcome doc', async () => {
  const kv = new MemKV()
  // Both copies read the same null entry, then interleave commits. The loser
  // must rebase onto the winner's seed instead of writing a duplicate.
  const e1 = kv.entry(LIBKEY)
  const e2 = kv.entry(LIBKEY)
  const [r1, r2] = await Promise.all([
    (async () => {
      await e1
      return libWrite(kv, LIBKEY, (l) => putDocIntent(welcomeDoc())(l))
    })(),
    (async () => {
      await e2
      return libWrite(kv, LIBKEY, (l) => putDocIntent(welcomeDoc())(l))
    })()
  ])
  eq(Object.keys(saved(kv)!.circuits), ['welcome'])
  for (const r of [r1, r2]) ok(r === 'written' || r === 'skipped', `unexpected outcome ${r}`)
})

checkAsync('a stale full-snapshot write cannot clobber a confirmed peer delete, either direction', async () => {
  // Direction 1: A holds a stale library containing X; B deletes X; A's stale
  // snapshot write must lose (E_CONFLICT = zero effects), and A's intent
  // rebased on the fresh library must preserve the tomb.
  const kv = new MemKV()
  const X = { ...newDoc('X'), id: 'x-doc', updated: 10 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(X)(l))
  const staleEntry = await kv.entry(LIBKEY) // A's held read
  const libA = decodeLibrary(staleEntry.v!)!
  await libWrite(kv, LIBKEY, dropDocIntent('x-doc', 20, X)) // B deletes the v10 it observed
  // A writes its frozen full library with the stale token: refused.
  await kv
    .set(LIBKEY, serializeLibrary(withDoc(libA, { ...newDoc('Y'), id: 'y-doc', updated: 30 })), {
      rev: staleEntry.rev,
      gen: staleEntry.gen
    })
    .then(
      () => {
        throw new Error('stale write should have conflicted')
      },
      (err) => eq((err as { code?: string }).code, 'E_CONFLICT')
    )
  // Zero effects: the tomb stands, no ghost circuit landed.
  eq(saved(kv)!.tombs['x-doc'], 20)
  eq(Object.keys(saved(kv)!.circuits), [])
  // A's real intent (add Y) rebased on the fresh state keeps the tomb.
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent({ ...newDoc('Y'), id: 'y-doc', updated: 30 })(l))
  eq(r, 'written')
  eq(saved(kv)!.tombs['x-doc'], 20)
  eq(Object.keys(saved(kv)!.circuits), ['y-doc'])

  // Direction 2: the peer that deleted X holds a stale library that still
  // carries X. Re-persisting it after the delete must not resurrect X.
  const kv2 = new MemKV()
  await libWrite(kv2, LIBKEY, (l) => putDocIntent(X)(l))
  const heldB = decodeLibrary((await kv2.entry(LIBKEY)).v!)! // B's held copy still has X
  await libWrite(kv2, LIBKEY, dropDocIntent('x-doc', 50, X)) // A deletes the v10 it observed
  const r2 = await libWrite(kv2, LIBKEY, (l) => {
    let next = l
    for (const d of Object.values(heldB.circuits)) next = putDocIntent(d)(next) ?? next
    return next === l ? null : next
  })
  eq(r2, 'skipped') // intent resolves to nothing: the tomb wins
  eq(Object.keys(saved(kv2)!.circuits), [])
})

checkAsync('failed reads return failed and never seed or blank', async () => {
  const kv = new MemKV()
  kv.entryFails = true
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent(welcomeDoc())(l))
  eq(r, 'failed')
  eq(kv.values.has(LIBKEY), false)
})

checkAsync('unknown ack reads back the same bytes, no blind retry', async () => {
  const kv = new MemKV()
  let sets = 0
  const orig = kv.set.bind(kv)
  kv.set = async (k, v, e) => {
    sets++
    if (sets === 1) {
      // Commit actually happens, ack is lost: write through then report timeout.
      kv.values.set(k, v)
      kv.rev++
      throw Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })
    }
    return orig(k, v, e)
  }
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent(welcomeDoc())(l))
  eq(r, 'written')
  eq(sets, 1) // no second set: readback found the committed bytes
  eq(Object.keys(saved(kv)!.circuits), ['welcome'])
})

checkAsync('a write refused by moved space rebases intent instead of resubmitting frozen bytes', async () => {
  const kv = new MemKV()
  const peerDoc = { ...newDoc('peer'), id: 'peer-doc', updated: 40 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(peerDoc)(l))
  // Writer intents over a read taken BEFORE the peer commit: on conflict the
  // library it writes must contain BOTH the peer's doc and its own.
  const mine = { ...newDoc('mine'), id: 'my-doc', updated: 35 }
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent(mine)(l))
  eq(r, 'written')
  eq(Object.keys(saved(kv)!.circuits).sort(), ['my-doc', 'peer-doc'])
})

checkAsync('dead generation is reported gone with zero effects', async () => {
  const kv = new MemKV()
  kv.gen = 7
  const e = { k: LIBKEY, v: null, rev: 0, gen: 1 } // stale generation token
  await kv.set(LIBKEY, serializeLibrary(fresh()), { rev: e.rev, gen: e.gen }).then(
    () => {
      throw new Error('expected E_GONE')
    },
    (err) => eq((err as { code?: string }).code, 'E_GONE')
  )
  eq(kv.values.has(LIBKEY), false)
})

checkAsync('corrupt stored bytes fail honestly instead of overwriting with empty', async () => {
  const kv = new MemKV()
  kv.values.set(LIBKEY, '{oops-corrupt')
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent(welcomeDoc())(l))
  eq(r, 'failed')
  eq(kv.values.get(LIBKEY), '{oops-corrupt') // untouched
})

checkAsync('persistent contention refuses after the attempt bound', async () => {
  const kv = new MemKV()
  // Every other write in the space bumps rev, so this writer always conflicts.
  const orig = kv.set.bind(kv)
  kv.set = async (k, v, e) => {
    kv.rev++ // sibling write
    return orig(k, v, e)
  }
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent(welcomeDoc())(l))
  eq(r, 'failed')
})

checkAsync('delete beats older recreate, newer recreate beats delete (ABA)', async () => {
  const kv = new MemKV()
  const doc = { ...newDoc('ABA'), id: 'aba', updated: 10 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(doc)(l))
  await libWrite(kv, LIBKEY, dropDocIntent('aba', 100, doc))
  // Stale snapshot of the deleted doc (updated 10 < tomb 100): refused.
  let r = await libWrite(kv, LIBKEY, (l) => putDocIntent(doc)(l))
  eq(r, 'skipped')
  eq(Object.keys(saved(kv)!.circuits), [])
  // Genuine recreation with a newer timestamp: admitted, tomb stays put.
  const reborn = { ...doc, updated: 200 }
  r = await libWrite(kv, LIBKEY, (l) => putDocIntent(reborn)(l))
  eq(r, 'written')
  eq(saved(kv)!.circuits.aba!.updated, 200)
  eq(saved(kv)!.tombs.aba, 100)
  // A second delete on top keeps the max tomb and drops the doc: the tomb
  // floors at the deleted doc's updated so a stale 200-doc cannot slip back
  // in under a smaller tomb.
  r = await libWrite(kv, LIBKEY, dropDocIntent('aba', 150, reborn))
  eq(r, 'written')
  eq(Object.keys(saved(kv)!.circuits), [])
  eq(saved(kv)!.tombs.aba, 200)
})

checkAsync('peer delete plus local undo intent keeps both facts', async () => {
  // App flow: cover deletes doc A while inner's undo restores its pre-delete
  // edit with a FRESH updated stamp - a recreate, not a stale snapshot.
  const kv = new MemKV()
  const a1 = { ...newDoc('one'), id: 'a', updated: 10 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(a1)(l))
  await libWrite(kv, LIBKEY, dropDocIntent('a', 100, a1))
  const undone = { ...a1, updated: 200 } // undo re-stamps the restored doc
  const r = await libWrite(kv, LIBKEY, (l) => putDocIntent(undone)(l))
  eq(r, 'written')
  eq(saved(kv)!.circuits.a!.updated, 200)
  // And a solved flag from the peer survives in the same library.
  const r2 = await libWrite(kv, LIBKEY, solvedIntent('two-keys'))
  eq(r2, 'written')
  eq(saved(kv)!.solved, ['two-keys'])
})

checkAsync('a queued write always writes the latest pending value, not the queued one', async () => {
  // flushCam semantics: the intent samples live state at execution time, so a
  // write queued behind another commits the freshest value, not the frozen one.
  const kv = new MemKV()
  let pending = 'cam-v1'
  kv.inject = null
  const r1 = await writeConditional(kv, 'cam:x', () => pending)
  eq(r1, 'written')
  eq(kv.values.get('cam:x'), 'cam-v1')
  // Peer bumps rev between the read and the commit; queued intent re-reads
  // pending (now v2) on the fresh token.
  pending = 'cam-v2'
  kv.rev++ // foreign write in the same space
  const r2 = await writeConditional(kv, 'cam:x', () => pending)
  eq(r2, 'written')
  eq(kv.values.get('cam:x'), 'cam-v2')
})

checkAsync('lost ack then peer restore: readback mismatch is terminal unknown, never re-deletes', async () => {
  // A's delete commits but the ack is lost; B restores the same id at a newer
  // updated and acks. A's readback sees B's bytes, cannot prove its own
  // request did not land - the only honest answer is 'unknown' and no resend,
  // and the peer's confirmed restore must survive.
  const kv = new MemKV()
  const doc = { ...newDoc('Confirmed circuit'), id: 'doc1', updated: 1 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(doc)(l))
  let peerAck = false
  const orig = kv.set.bind(kv)
  kv.set = async (k, v, e) => {
    // The delete itself lands; the ack is what gets lost.
    await orig(k, v, e)
    // B's restore commits after A's lost write, using the real CAS.
    await libWrite(kv, LIBKEY, (l) => putDocIntent({ ...doc, name: 'Peer restore', updated: 3 })(l))
    peerAck = true
    throw Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })
  }
  const r = await libWrite(kv, LIBKEY, dropDocIntent('doc1', 2, doc))
  eq(r, 'unknown')
  ok(peerAck, 'peer restore must have committed')
  eq(saved(kv)!.circuits.doc1!.name, 'Peer restore') // peer's newer incarnation survives
})

checkAsync('peer newer edit conflicts before a delete: the delete refuses instead of re-deleting', async () => {
  // B's newer edit lands between A's entry read and A's conditional set.
  // Re-deriving the delete intent on the fresh library must refuse: the doc
  // on the wire is a different incarnation than the one the user deleted.
  const kv = new MemKV()
  const doc = { ...newDoc('Confirmed circuit'), id: 'doc1', updated: 1 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(doc)(l))
  let injected = false
  const orig = kv.set.bind(kv)
  kv.set = async (k, v, e) => {
    if (!injected) {
      injected = true
      await libWrite(kv, LIBKEY, (l) => putDocIntent({ ...doc, name: 'Peer edit', updated: 3 })(l))
      throw Object.assign(new Error('conflict'), { code: 'E_CONFLICT' })
    }
    return orig(k, v, e)
  }
  const r = await libWrite(kv, LIBKEY, dropDocIntent('doc1', 2, doc))
  eq(r, 'skipped') // refused: nothing to write for a doc that is not the one observed
  eq(saved(kv)!.circuits.doc1!.name, 'Peer edit')
  eq(saved(kv)!.tombs.doc1, undefined)
})

checkAsync('a delete on the observed incarnation still commits normally', async () => {
  const kv = new MemKV()
  const doc = { ...newDoc('Confirmed circuit'), id: 'doc1', updated: 1 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(doc)(l))
  const r = await libWrite(kv, LIBKEY, dropDocIntent('doc1', 2, doc))
  eq(r, 'written')
  eq(Object.keys(saved(kv)!.circuits), [])
  eq(saved(kv)!.tombs.doc1, 2)
})

checkAsync('refused delete leaves picked empty: no adopt or mirror of a never-written doc', async () => {
  // Literal dropCircuit composite: the open doc's delete picks a fallback on
  // the first attempt, then a peer edit of the same id lands before the set
  // commits -> E_CONFLICT -> re-entry refuses the stale-incarnation delete.
  // 'skipped' means nothing was written: picked must be null so the caller
  // neither adopts nor mirrors a doc the durable library never accepted.
  const kv = new MemKV()
  const oldDoc = { ...newDoc('Delete me'), id: 'docA', updated: 10 }
  await libWrite(kv, LIBKEY, (l) => putDocIntent(oldDoc)(l))
  let injected = false
  const orig = kv.set.bind(kv)
  kv.set = async (k, v, e) => {
    if (!injected) {
      injected = true
      await libWrite(kv, LIBKEY, (l) => putDocIntent({ ...oldDoc, name: 'Peer edit', updated: 20 })(l))
      throw Object.assign(new Error('conflict'), { code: 'E_CONFLICT' })
    }
    return orig(k, v, e)
  }
  const picked: { doc: typeof oldDoc | null } = { doc: null }
  const r = await libWrite(kv, LIBKEY, dropOpenIntent('docA', 30, oldDoc, newDoc('Circuit 1'), picked))
  eq(r, 'skipped')
  eq(picked.doc, null)
  eq(saved(kv)!.circuits.docA!.name, 'Peer edit') // confirmed peer doc preserved

  // Control: same plan, no race -> the delete commits and the fallback is
  // picked from the written library, so adoption is safe.
  const kv2 = new MemKV()
  await libWrite(kv2, LIBKEY, (l) => putDocIntent(oldDoc)(l))
  const picked2: { doc: typeof oldDoc | null } = { doc: null }
  const fallback = { ...newDoc('Circuit 1'), id: 'fallback-doc' }
  const r2 = await libWrite(kv2, LIBKEY, dropOpenIntent('docA', 30, oldDoc, fallback, picked2))
  eq(r2, 'written')
  eq(picked2.doc!.id, 'fallback-doc')
  ok(saved(kv2)!.circuits['fallback-doc'] !== undefined, 'adopted doc must be durable')
  eq(saved(kv2)!.circuits.docA, undefined)
})

await Promise.all(asyncChecks)

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`circuit.test.ts: ${passed} checks passed`)
