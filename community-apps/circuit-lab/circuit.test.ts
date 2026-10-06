// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun circuit.test.ts` directly, and `bun
// test` too (a failing check throws while the file is evaluated, which the
// runner reports as a failure).
import { CHALLENGES, challengeRun, scaffold } from './challenges.ts'
import {
  addNode,
  bulbsOf,
  type CircuitNode,
  commitMove,
  connect,
  type Doc,
  evaluate,
  latestDoc,
  moveNode,
  type NodeKind,
  newDoc,
  parseLibrary,
  parseMirror,
  reaches,
  redo,
  removeNode,
  removeWire,
  serializeLibrary,
  serializeMirror,
  switchesOf,
  toggleSwitch,
  truthTable,
  undo,
  type Wire,
  welcomeDoc,
  wireAt,
  withDoc,
  withoutDoc
} from './circuit.ts'

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
  const lib = withDoc({ circuits: {}, solved: ['two-keys'], muted: true }, d)
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
  const lib = withDoc(withDoc({ circuits: {}, solved: [], muted: false }, a), b)
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

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`circuit.test.ts: ${passed} checks passed`)
