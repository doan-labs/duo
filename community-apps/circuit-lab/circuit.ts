// The document model: a bounded combinational circuit. Input switches feed
// AND/OR/NOT/XOR gates through directed wires; bulbs read the result. The
// graph is kept acyclic at write time - `connect` refuses any wire that would
// close a loop - and `evaluate` defends loaded data the same way, so a corrupt
// circuit degrades to a flagged dead region instead of hanging the sandbox.
//
// Disconnected input pins read LOW (false). It is the one rule that makes
// every circuit evaluable without an error state, and it is stated in the
// README, the in-app hint and the challenge briefs.
//
// One wire feeds one input pin; an output pin fans out freely. Connecting to
// an occupied pin replaces the wire already there, which keeps rewiring a
// one-gesture move on the cover.

export type NodeKind = 'switch' | 'and' | 'or' | 'xor' | 'not' | 'bulb'
export type CircuitNode = {
  id: string
  kind: NodeKind
  /** Centre point in world coordinates. */
  x: number
  y: number
  /** Only switches read this; kept on every node so undo merge stays uniform. */
  on: boolean
  /** Display text: 'A'..'D' for switches, 'Y1'.. or a challenge name for bulbs, free for gates. */
  label: string
}
export type Wire = { id: string; from: string; to: string; port: number }
export type View = { x: number; y: number; zoom: number; framed?: boolean }
export type CircuitState = { nodes: Record<string, CircuitNode>; wires: Record<string, Wire> }
export type Doc = CircuitState & {
  id: string
  name: string
  view: View
  /** Undo stacks of {nodes,wires} snapshots, oldest first. */
  past: CircuitState[]
  future: CircuitState[]
  /** Active challenge id, or null in free build. */
  challenge: string | null
  /** Last-writer-wins clock for picking the newest circuit in a library. */
  updated: number
}
export type Library = {
  circuits: Record<string, Doc>
  /** Solved challenge ids, persisted with the library. */
  solved: string[]
  muted: boolean
}
export type Sel = { kind: 'node' | 'wire'; id: string } | null
/**
 * The content-changing edit a session write carried, described opaquely so a
 * holder can replay it on top of its own doc when the write proves to be a
 * stale fork. Whole-document changes (open, undo, challenge start) carry
 * `{ t: 'doc' }` and never merge; a stale write without an op merges nothing.
 */
export type Op =
  | { t: 'add'; n: CircuitNode }
  | { t: 'drop-node'; id: string }
  | { t: 'move'; id: string; x: number; y: number }
  | { t: 'wire'; from: string; to: string; port: number }
  | { t: 'drop-wire'; id: string }
  | { t: 'toggle'; id: string }
  | { t: 'label'; id: string; label: string }
  | { t: 'name'; name: string }
  | { t: 'doc' }
/**
 * `base` is the session revision the doc was derived from: the fork detector.
 * A copy that writes without having seen the peer's last write carries a base
 * older than the holder's own, so the holder refuses the overwrite and heals
 * the session instead of letting last-writer-wins erase a fresher edit. `op`
 * is what the stale write changed, replayed onto the holder's doc so the
 * merged result keeps every accepted edit from both sides.
 */
export type Mirror = { by: string; sel: Sel; doc: Doc; base: number; op: Op | null }

export const MAX_SWITCHES = 4
export const MAX_BULBS = 4
export const MAX_GATES = 22
export const MAX_WIRES = 64
export const HISTORY_LIMIT = 48
export const GRID = 22
export const WORLD_LIMIT = 2400
/** Truth tables never enumerate past this many inputs (256 rows) whatever the stored doc claims. */
export const TABLE_INPUT_LIMIT = 8
/** Screen-point size of a pin's tap pad: the 44pt primary wiring target. */
export const PIN_PAD = 44
/** Below this zoom pads would collide faster than they can repel; pins show as dots only. */
export const PIN_PAD_ZOOM = 0.45
const LABEL_LIMIT = 24

/** Footprint per kind, in world units, centred on the node's x/y. */
export const NODE_W: Record<NodeKind, number> = { switch: 84, and: 92, or: 92, xor: 92, not: 84, bulb: 68 }
export const NODE_H = 56
export const KIND_NAME: Record<NodeKind, string> = {
  switch: 'Switch',
  and: 'AND',
  or: 'OR',
  xor: 'XOR',
  not: 'NOT',
  bulb: 'Bulb'
}

const spawn = () => crypto.randomUUID().slice(0, 8)
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const snap = (v: number) => Math.round(v / GRID) * GRID

export const inputCount = (kind: NodeKind): number =>
  kind === 'and' || kind === 'or' || kind === 'xor' ? 2 : kind === 'not' || kind === 'bulb' ? 1 : 0
export const hasOutput = (kind: NodeKind): boolean => kind !== 'bulb'

export function outPin(n: CircuitNode): { x: number; y: number } {
  return { x: n.x + NODE_W[n.kind] / 2, y: n.y }
}
export function inPin(n: CircuitNode, port: number): { x: number; y: number } {
  const count = inputCount(n.kind)
  return { x: n.x - NODE_W[n.kind] / 2, y: n.y - NODE_H / 2 + (NODE_H * (port + 1)) / (count + 1) }
}

export const switchesOf = (doc: CircuitState): CircuitNode[] =>
  Object.values(doc.nodes)
    .filter((n) => n.kind === 'switch')
    .sort((a, b) => a.y - b.y || a.x - b.x)

export const bulbsOf = (doc: CircuitState): CircuitNode[] =>
  Object.values(doc.nodes)
    .filter((n) => n.kind === 'bulb')
    .sort((a, b) => a.y - b.y || a.x - b.x)

export const gatesOf = (doc: CircuitState): CircuitNode[] => Object.values(doc.nodes).filter((n) => !isIo(n.kind))
const isIo = (kind: NodeKind) => kind === 'switch' || kind === 'bulb'

/** What the UI and truth table call a node: its label, else its kind name. */
export const displayName = (n: CircuitNode): string => n.label || KIND_NAME[n.kind]

// ---- edits ---------------------------------------------------------------

const touch = (doc: Doc): Doc => ({ ...doc, updated: Date.now() })

/** Push the present structure onto the undo stack and apply the next one. */
export function commit(doc: Doc, next: CircuitState): Doc {
  const past = [...doc.past, { nodes: doc.nodes, wires: doc.wires }].slice(-HISTORY_LIMIT)
  return touch({ ...doc, nodes: next.nodes, wires: next.wires, past, future: [] })
}

/**
 * Undo/redo restore structure but keep the switches' live positions: play
 * state is not an edit, so rewinding a build step must not also rewind the
 * input pattern the person set up to watch.
 */
const revive = (state: CircuitState, current: CircuitState): CircuitState => {
  const nodes: Record<string, CircuitNode> = {}
  for (const [id, n] of Object.entries(state.nodes)) {
    const live = current.nodes[id]
    nodes[id] = n.kind === 'switch' && live ? { ...n, on: live.on } : n
  }
  return { nodes, wires: state.wires }
}

export function undo(doc: Doc): Doc {
  const prev = doc.past.at(-1)
  if (!prev) return doc
  const next = revive(prev, doc)
  return touch({
    ...doc,
    nodes: next.nodes,
    wires: next.wires,
    past: doc.past.slice(0, -1),
    future: [{ nodes: doc.nodes, wires: doc.wires }, ...doc.future].slice(0, HISTORY_LIMIT)
  })
}

export function redo(doc: Doc): Doc {
  const next0 = doc.future[0]
  if (!next0) return doc
  const next = revive(next0, doc)
  return touch({
    ...doc,
    nodes: next.nodes,
    wires: next.wires,
    past: [...doc.past, { nodes: doc.nodes, wires: doc.wires }].slice(-HISTORY_LIMIT),
    future: doc.future.slice(1)
  })
}

export type AddError = 'switch-limit' | 'bulb-limit' | 'gate-limit' | 'io-locked'
export function addNode(
  doc: Doc,
  kind: NodeKind,
  x: number,
  y: number,
  label = ''
): { doc: Doc; id: string; error?: AddError } {
  // Challenge docs own their I/O row: switches and bulbs come from the brief,
  // so the palette hides them and a stray add is refused here too.
  if (doc.challenge && isIo(kind)) return { doc, id: '', error: 'io-locked' }
  if (kind === 'switch' && switchesOf(doc).length >= MAX_SWITCHES) return { doc, id: '', error: 'switch-limit' }
  if (kind === 'bulb' && bulbsOf(doc).length >= MAX_BULBS) return { doc, id: '', error: 'bulb-limit' }
  if (!isIo(kind) && gatesOf(doc).length >= MAX_GATES) return { doc, id: '', error: 'gate-limit' }
  const node: CircuitNode = {
    id: spawn(),
    kind,
    x: clamp(snap(x), -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(snap(y), -WORLD_LIMIT, WORLD_LIMIT),
    on: false,
    label: label.slice(0, LABEL_LIMIT)
  }
  const doc2 = commit(doc, { nodes: { ...doc.nodes, [node.id]: node }, wires: doc.wires })
  return { doc: doc2, id: node.id }
}

export function removeNode(doc: Doc, id: string): Doc {
  if (!doc.nodes[id]) return doc
  const nodes = { ...doc.nodes }
  delete nodes[id]
  const wires = Object.fromEntries(Object.entries(doc.wires).filter(([, w]) => w.from !== id && w.to !== id))
  return commit(doc, { nodes, wires })
}

export function moveNode(doc: Doc, id: string, x: number, y: number): Doc {
  const n = doc.nodes[id]
  if (!n) return doc
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [id]: { ...n, x: clamp(x, -WORLD_LIMIT, WORLD_LIMIT), y: clamp(y, -WORLD_LIMIT, WORLD_LIMIT) }
    }
  }
}

/**
 * Drop gets one undo step for the whole drag, taken when the finger lifts.
 * The snapshot it pushes carries the drag-start position, so undo lands the
 * node back where the gesture picked it up, not on the unsnapped drop point.
 */
export function commitMove(doc: Doc, id: string, fromX: number, fromY: number): Doc {
  const n = doc.nodes[id]
  if (!n) return doc
  const x = clamp(snap(n.x), -WORLD_LIMIT, WORLD_LIMIT)
  const y = clamp(snap(n.y), -WORLD_LIMIT, WORLD_LIMIT)
  const untouched = Math.abs(n.x - fromX) < 0.5 && Math.abs(n.y - fromY) < 0.5
  if (x === n.x && y === n.y && untouched) return doc
  const past = [...doc.past, { nodes: { ...doc.nodes, [id]: { ...n, x: fromX, y: fromY } }, wires: doc.wires }].slice(
    -HISTORY_LIMIT
  )
  return touch({ ...doc, nodes: { ...doc.nodes, [id]: { ...n, x, y } }, past, future: [] })
}

/** Play state, not an edit: no undo step. */
export function toggleSwitch(doc: Doc, id: string): Doc {
  const n = doc.nodes[id]
  if (n?.kind !== 'switch') return doc
  return touch({ ...doc, nodes: { ...doc.nodes, [id]: { ...n, on: !n.on } } })
}

export function setLabel(doc: Doc, id: string, label: string): Doc {
  const n = doc.nodes[id]
  if (!n || n.label === label) return doc
  return commit(doc, { nodes: { ...doc.nodes, [id]: { ...n, label: label.slice(0, LABEL_LIMIT) } }, wires: doc.wires })
}

export function renameDoc(doc: Doc, name: string): Doc {
  return { ...doc, name: name.slice(0, 60) }
}

// ---- wires ---------------------------------------------------------------

/** True when `to` can already reach `from` through existing wires. */
export function reaches(doc: CircuitState, to: string, from: string): boolean {
  const out = new Map<string, string[]>()
  for (const w of Object.values(doc.wires)) {
    const list = out.get(w.from) ?? []
    list.push(w.to)
    out.set(w.from, list)
  }
  const seen = new Set<string>([to])
  const stack = [to]
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === from) return true
    for (const next of out.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next)
        stack.push(next)
      }
    }
  }
  return false
}

export const wireAt = (doc: CircuitState, to: string, port: number): Wire | undefined =>
  Object.values(doc.wires).find((w) => w.to === to && w.port === port)

export type ConnectError = 'bad-pin' | 'self' | 'cycle' | 'wire-limit'
export function connect(
  doc: Doc,
  from: string,
  to: string,
  port: number
): { doc: Doc; wire?: Wire; error?: ConnectError; replaced?: Wire } {
  const a = doc.nodes[from]
  const b = doc.nodes[to]
  if (!a || !b || !hasOutput(a.kind) || !Number.isInteger(port) || port < 0 || port >= inputCount(b.kind))
    return { doc, error: 'bad-pin' }
  if (from === to) return { doc, error: 'self' }
  const occupied = wireAt(doc, to, port)
  const wires = { ...doc.wires }
  if (occupied) delete wires[occupied.id]
  if (Object.keys(wires).length >= MAX_WIRES) return { doc, error: 'wire-limit' }
  const wire: Wire = { id: spawn(), from, to, port }
  const trial = { ...wires, [wire.id]: wire }
  if (reaches({ nodes: doc.nodes, wires: trial }, to, from)) return { doc, error: 'cycle' }
  return {
    doc: commit(doc, { nodes: doc.nodes, wires: trial }),
    wire,
    ...(occupied ? { replaced: occupied } : {})
  }
}

export function removeWire(doc: Doc, wireId: string): Doc {
  if (!doc.wires[wireId]) return doc
  const wires = { ...doc.wires }
  delete wires[wireId]
  return commit(doc, { nodes: doc.nodes, wires })
}

// ---- evaluation ----------------------------------------------------------

export type EvalResult = {
  value: Record<string, boolean>
  /** Nodes stuck inside a feedback loop: they read LOW and the UI flags them. */
  dead: Set<string>
  /** Steps from the nearest input; staggers the lit-wire transition so a signal visibly travels. */
  depth: Record<string, number>
}

/**
 * Evaluates the combinational graph in topological order. `states` overrides
 * switch positions, which is how the truth table enumerates rows. Nodes a
 * cycle would leave unevaluated land in `dead` at LOW - the graph is acyclic
 * by construction, so only damaged stored data can produce them, and even
 * that cannot make this loop hang.
 */
export function evaluate(doc: CircuitState, states?: Record<string, boolean>): EvalResult {
  const incoming = new Map<string, Wire[]>()
  const outgoing = new Map<string, Wire[]>()
  const indegree = new Map<string, number>()
  for (const id of Object.keys(doc.nodes)) indegree.set(id, 0)
  for (const w of Object.values(doc.wires)) {
    if (!doc.nodes[w.from] || !doc.nodes[w.to]) continue
    incoming.set(w.to, [...(incoming.get(w.to) ?? []), w])
    outgoing.set(w.from, [...(outgoing.get(w.from) ?? []), w])
    indegree.set(w.to, (indegree.get(w.to) ?? 0) + 1)
  }
  const queue = Object.keys(doc.nodes).filter((id) => indegree.get(id) === 0)
  const value: Record<string, boolean> = {}
  const depth: Record<string, number> = {}
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!
    const n = doc.nodes[id]!
    const ins = incoming.get(id) ?? []
    const pin = (port: number) => {
      const w = ins.find((w) => w.port === port)
      // The disconnected-input rule: an open pin reads LOW.
      return w ? (value[w.from] ?? false) : false
    }
    let out = false
    if (n.kind === 'switch') out = states ? (states[id] ?? false) : n.on
    else if (n.kind === 'not') out = !pin(0)
    else if (n.kind === 'and') out = pin(0) && pin(1)
    else if (n.kind === 'or') out = pin(0) || pin(1)
    else if (n.kind === 'xor') out = pin(0) !== pin(1)
    else out = pin(0)
    value[id] = out
    depth[id] = n.kind === 'switch' ? 0 : 1 + Math.max(0, ...ins.map((w) => depth[w.from] ?? 0))
    for (const w of outgoing.get(id) ?? []) {
      const left = (indegree.get(w.to) ?? 1) - 1
      indegree.set(w.to, left)
      if (left === 0) queue.push(w.to)
    }
  }
  const dead = new Set(Object.keys(doc.nodes).filter((id) => !(id in value)))
  for (const id of dead) {
    value[id] = false
    depth[id] = 0
  }
  return { value, dead, depth }
}

// ---- truth table ---------------------------------------------------------

export type TableRow = { ins: boolean[]; outs: boolean[] }
export type Table = { ins: CircuitNode[]; outs: CircuitNode[]; rows: TableRow[]; truncated: boolean }

/**
 * Enumerates input combinations (2^rows, at most 16 for the 4-switch limit).
 * A stored doc that somehow carries more inputs than the build limit is cut to
 * TABLE_INPUT_LIMIT columns - bounded work, never a hang - and flags the cut.
 */
export function truthTable(doc: CircuitState): Table {
  const allIns = switchesOf(doc)
  const ins = allIns.slice(0, TABLE_INPUT_LIMIT)
  const outs = bulbsOf(doc).slice(0, MAX_BULBS)
  const rows: TableRow[] = []
  const count = 1 << ins.length
  for (let mask = 0; mask < count; mask++) {
    const states: Record<string, boolean> = {}
    ins.forEach((sw, i) => {
      states[sw.id] = Boolean(mask & (1 << (ins.length - 1 - i)))
    })
    const { value } = evaluate(doc, states)
    rows.push({ ins: ins.map((sw) => states[sw.id]!), outs: outs.map((b) => value[b.id] ?? false) })
  }
  return { ins, outs, rows, truncated: allIns.length > ins.length }
}

// ---- constructors --------------------------------------------------------

const mkNode = (kind: NodeKind, x: number, y: number, label: string, on = false): CircuitNode => ({
  id: spawn(),
  kind,
  x,
  y,
  on,
  label
})

export function newDoc(name: string): Doc {
  const a = mkNode('switch', -220, -44, 'A')
  const b = mkNode('switch', -220, 44, 'B')
  const out = mkNode('bulb', 220, 0, 'OUT')
  return {
    id: spawn(),
    name,
    nodes: { [a.id]: a, [b.id]: b, [out.id]: out },
    wires: {},
    view: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: [],
    challenge: null,
    updated: Date.now()
  }
}

/** First-run circuit: a wired half adder so signals, labels and bulbs show at a glance. */
export function welcomeDoc(): Doc {
  const a = mkNode('switch', -260, -56, 'A')
  const b = mkNode('switch', -260, 56, 'B')
  const xor = mkNode('xor', -20, -50, '')
  const and = mkNode('and', -20, 62, '')
  const sum = mkNode('bulb', 240, -50, 'SUM')
  const carry = mkNode('bulb', 240, 62, 'CARRY')
  const wires: Wire[] = [
    { id: spawn(), from: a.id, to: xor.id, port: 0 },
    { id: spawn(), from: b.id, to: xor.id, port: 1 },
    { id: spawn(), from: a.id, to: and.id, port: 0 },
    { id: spawn(), from: b.id, to: and.id, port: 1 },
    { id: spawn(), from: xor.id, to: sum.id, port: 0 },
    { id: spawn(), from: and.id, to: carry.id, port: 0 }
  ]
  return {
    // A fixed id keeps a both-displays seed race to one doc, not two.
    id: 'welcome',
    name: 'Half adder',
    nodes: { [a.id]: a, [b.id]: b, [xor.id]: xor, [and.id]: and, [sum.id]: sum, [carry.id]: carry },
    wires: Object.fromEntries(wires.map((w) => [w.id, w])),
    view: { x: 0, y: 0, zoom: 1, framed: false },
    past: [],
    future: [],
    challenge: null,
    updated: Date.now()
  }
}

/** The letter a new free-build switch takes: first of A..D not already used. */
export function nextSwitchLabel(doc: CircuitState): string {
  const used = new Set(switchesOf(doc).map((n) => n.label))
  for (const l of ['A', 'B', 'C', 'D']) if (!used.has(l)) return l
  return 'IN'
}

export function nextBulbLabel(doc: CircuitState): string {
  const used = new Set(bulbsOf(doc).map((n) => n.label))
  for (const l of ['Y1', 'Y2', 'Y3', 'Y4']) if (!used.has(l)) return l
  return 'OUT'
}

export function setView(doc: Doc, view: View): Doc {
  return { ...doc, view: cleanView(view) }
}

export function docBounds(doc: CircuitState): { cx: number; cy: number; w: number; h: number } {
  const all = Object.values(doc.nodes)
  if (!all.length) return { cx: 0, cy: 0, w: 1, h: 1 }
  // Padded past node footprints and pin hit targets so a fit never clips a chip.
  const minX = Math.min(...all.map((n) => n.x - NODE_W[n.kind] / 2)) - 60
  const maxX = Math.max(...all.map((n) => n.x + NODE_W[n.kind] / 2)) + 60
  const minY = Math.min(...all.map((n) => n.y - NODE_H / 2)) - 60
  const maxY = Math.max(...all.map((n) => n.y + NODE_H / 2)) + 60
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}

// ---- validation ----------------------------------------------------------

function cleanView(v: unknown): View {
  const view = record(v) ? v : {}
  return {
    x: clamp(num(view.x, 0), -WORLD_LIMIT * 2, WORLD_LIMIT * 2),
    y: clamp(num(view.y, 0), -WORLD_LIMIT * 2, WORLD_LIMIT * 2),
    zoom: clamp(num(view.zoom, 1), 0.2, 2.5),
    ...(view.framed === false ? { framed: false } : {})
  }
}

const KINDS: NodeKind[] = ['switch', 'and', 'or', 'xor', 'not', 'bulb']

function cleanNode(id: string, v: unknown): CircuitNode | null {
  if (!record(v) || !KINDS.includes(v.kind as NodeKind)) return null
  return {
    id,
    kind: v.kind as NodeKind,
    x: clamp(num(v.x, 0), -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(num(v.y, 0), -WORLD_LIMIT, WORLD_LIMIT),
    on: v.on === true,
    label: (typeof v.label === 'string' ? v.label : '').slice(0, LABEL_LIMIT)
  }
}

function cleanState(v: unknown): CircuitState {
  const nodes: Record<string, CircuitNode> = {}
  const raw = record(v) && record(v.nodes) ? v.nodes : {}
  // Per-kind budgets, not one pool: a tampered doc cannot front-load 30
  // switches to crowd out the gates, or ask the truth table for 2^30 rows.
  const room = { switch: MAX_SWITCHES, bulb: MAX_BULBS, gate: MAX_GATES }
  for (const [id, nv] of Object.entries(raw)) {
    if (!/^[\w-]+$/.test(id)) continue
    const n = cleanNode(id, nv)
    if (!n) continue
    const bucket = isIo(n.kind) ? n.kind : 'gate'
    if (room[bucket] <= 0) continue
    room[bucket]--
    nodes[id] = n
  }
  const wires: Record<string, Wire> = {}
  const rawW = record(v) && record(v.wires) ? v.wires : {}
  const usedPins = new Set<string>()
  for (const [id, wv] of Object.entries(rawW)) {
    if (!record(wv) || typeof wv.from !== 'string' || typeof wv.to !== 'string') continue
    const from = nodes[wv.from]
    const to = nodes[wv.to]
    if (!from || !to || !hasOutput(from.kind)) continue
    // A port is an index, not a fraction: 0.9 reads as an error, not as 0.
    const port = num(wv.port, -1)
    if (!Number.isInteger(port) || port < 0 || port >= inputCount(to.kind)) continue
    const pinKey = `${wv.to}:${port}`
    if (usedPins.has(pinKey)) continue
    usedPins.add(pinKey)
    if (wv.from === wv.to) continue
    wires[id] = { id, from: wv.from, to: wv.to, port }
    if (Object.keys(wires).length >= MAX_WIRES) break
  }
  // Repair loops the loader may have been handed: walk each wire; keep it only
  // when it cannot close a cycle against the wires already kept.
  for (const w of Object.values({ ...wires })) {
    if (reaches({ nodes, wires }, w.to, w.from)) delete wires[w.id]
  }
  return { nodes, wires }
}

export function cleanDoc(v: unknown): Doc | null {
  if (!record(v)) return null
  const { nodes, wires } = cleanState(v)
  if (!Object.keys(nodes).length) return null
  const cleanHistory = (list: unknown): CircuitState[] =>
    Array.isArray(list)
      ? list
          .slice(-HISTORY_LIMIT)
          .map(cleanState)
          .filter((s) => Object.keys(s.nodes).length > 0)
      : []
  return {
    id: typeof v.id === 'string' && v.id ? v.id : spawn(),
    name: typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 60) : 'Untitled circuit',
    nodes,
    wires,
    view: cleanView(v.view),
    past: cleanHistory(v.past),
    future: cleanHistory(v.future),
    challenge: typeof v.challenge === 'string' ? v.challenge : null,
    updated: num(v.updated, 0)
  }
}

export function parseLibrary(raw: string | null): Library {
  const empty: Library = { circuits: {}, solved: [], muted: false }
  if (!raw) return empty
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed)) return empty
    const circuits: Record<string, Doc> = {}
    if (record(parsed.circuits)) {
      for (const [id, value] of Object.entries(parsed.circuits)) {
        const doc = cleanDoc(value)
        if (doc) circuits[id] = doc
      }
    }
    return {
      circuits,
      solved: Array.isArray(parsed.solved) ? parsed.solved.filter((s): s is string => typeof s === 'string') : [],
      muted: parsed.muted === true
    }
  } catch {
    return empty
  }
}

export function serializeLibrary(lib: Library) {
  return JSON.stringify(lib)
}

function cleanOp(v: unknown): Op | null {
  if (!record(v) || typeof v.t !== 'string') return null
  switch (v.t) {
    case 'add': {
      const raw = v.n
      if (!record(raw) || typeof raw.id !== 'string' || !/^[\w-]+$/.test(raw.id)) return null
      const n = cleanNode(raw.id, raw)
      return n ? { t: 'add', n } : null
    }
    case 'drop-node':
      return typeof v.id === 'string' ? { t: 'drop-node', id: v.id } : null
    case 'move':
      return typeof v.id === 'string' ? { t: 'move', id: v.id, x: num(v.x, 0), y: num(v.y, 0) } : null
    case 'wire':
      return typeof v.from === 'string' &&
        typeof v.to === 'string' &&
        typeof v.port === 'number' &&
        Number.isInteger(v.port)
        ? { t: 'wire', from: v.from, to: v.to, port: v.port }
        : null
    case 'drop-wire':
      return typeof v.id === 'string' ? { t: 'drop-wire', id: v.id } : null
    case 'toggle':
      return typeof v.id === 'string' ? { t: 'toggle', id: v.id } : null
    case 'label':
      return typeof v.id === 'string' && typeof v.label === 'string'
        ? { t: 'label', id: v.id, label: v.label.slice(0, LABEL_LIMIT) }
        : null
    case 'name':
      return typeof v.name === 'string' ? { t: 'name', name: v.name.slice(0, 60) } : null
    case 'doc':
      return { t: 'doc' }
    default:
      return null
  }
}

export function parseMirror(raw: string | null): Mirror | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || typeof parsed.by !== 'string') return null
    const doc = cleanDoc(parsed.doc)
    if (!doc) return null
    // Older payloads without a base read as -1: older than any live rev, so a
    // holder always outranks them.
    const base = num(parsed.base, -1)
    const op = cleanOp(parsed.op)
    const s = record(parsed.sel) ? parsed.sel : null
    const sel: Sel =
      s && (s.kind === 'node' || s.kind === 'wire') && typeof s.id === 'string'
        ? s.kind === 'node'
          ? doc.nodes[s.id]
            ? { kind: 'node', id: s.id }
            : null
          : doc.wires[s.id]
            ? { kind: 'wire', id: s.id }
            : null
        : null
    return { by: parsed.by, sel, doc, base, op }
  } catch {
    return null
  }
}

export function serializeMirror(by: string, doc: Doc, sel: Sel, base = 0, op: Op | null = null) {
  return JSON.stringify({ by, sel, doc, base, op } satisfies Mirror)
}

// ---- merge ---------------------------------------------------------------

/**
 * Replays a remote write's op onto the holder's doc. Every variant is
 * content-keyed or idempotent enough to replay once per remote revision; an
 * op that no longer applies (its node is gone, the pin errored) is a no-op
 * rather than an error, and `{ t: 'doc' }` - a whole-doc change like undo or
 * opening another circuit - merges nothing by design.
 */
export function applyOp(doc: Doc, op: Op | null): Doc {
  switch (op?.t) {
    case 'add':
      return doc.nodes[op.n.id] ? doc : commit(doc, { nodes: { ...doc.nodes, [op.n.id]: op.n }, wires: doc.wires })
    case 'drop-node':
      return removeNode(doc, op.id)
    case 'move': {
      const n = doc.nodes[op.id]
      if (!n) return doc
      // The merged move keeps an undo step back to where this copy had it.
      return commitMove(moveNode(doc, op.id, op.x, op.y), op.id, n.x, n.y)
    }
    case 'wire': {
      const r = connect(doc, op.from, op.to, op.port)
      return r.error ? doc : r.doc
    }
    case 'drop-wire':
      return removeWire(doc, op.id)
    case 'toggle':
      return toggleSwitch(doc, op.id)
    case 'label':
      return setLabel(doc, op.id, op.label)
    case 'name':
      return renameDoc(doc, op.name)
    default:
      return doc
  }
}

export type RemoteDecision =
  | { kind: 'adopt'; doc: Doc; sel: Sel }
  | { kind: 'heal'; doc: Doc; base: number }
  | { kind: 'drop' }

/**
 * Fork arbitration for one incoming foreign mirror, pure so it is directly
 * testable. `curRev` is the session revision of the write that produced this
 * copy's doc; `answeredRev` is the newest remote revision already healed, so
 * answering the same stale write twice cannot happen.
 *
 * - A write whose base is at least our producing revision has seen everything
 *   we did: adopt it outright. A different doc id is an open-pointer, same
 *   rule.
 * - A write whose base is older forked before our producing write. The holder
 *   republishes with the stale op merged in, at a base past the stale write's
 *   own revision, so the stale side reads the heal as fresher than itself and
 *   adopts - no escalated-base duel, no lost mergeable edit.
 */
export function decideRemote(
  cur: Doc | null,
  curRev: number,
  next: Mirror,
  nextRev: number,
  answeredRev: number
): RemoteDecision {
  if (!cur || next.doc.id !== cur.id) return { kind: 'adopt', doc: next.doc, sel: next.sel }
  if (next.base >= curRev) return { kind: 'adopt', doc: next.doc, sel: next.sel }
  if (nextRev <= answeredRev) return { kind: 'drop' }
  const merged = applyOp(cur, next.op)
  return { kind: 'heal', doc: merged, base: Math.max(curRev, nextRev) }
}

// ---- pin hit pads ----------------------------------------------------------

export type Pad = { key: string; x: number; y: number; off: boolean }

/**
 * Lays out PIN_PAD-screen-point hit pads over world-space pin centres. Pads
 * that overlap (two input pins sit 18.7 world units apart - under 9 px at
 * cover zoom) are repelled along the axis of least overlap, capped so a pad
 * never drifts so far its pin lies outside it. A pad that still collides after
 * the pass comes back `off`: it renders as a dot only, so no tap ever lands on
 * an ambiguous boundary, and the inspector's wire rows stay the reachable
 * path. Below PIN_PAD_ZOOM every pad is off.
 */
export function layoutPads(pins: { key: string; x: number; y: number }[], zoom: number): Pad[] {
  const size = PIN_PAD
  const maxOff = size * 0.45
  const pts = pins.map((p) => ({ key: p.key, sx: p.x * zoom, sy: p.y * zoom, ox: 0, oy: 0 }))
  const eff = (p: (typeof pts)[number]) => ({ x: p.sx + p.ox, y: p.sy + p.oy })
  for (let it = 0; it < 12; it++) {
    let moved = false
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!
        const b = pts[j]!
        const pa = eff(a)
        const pb = eff(b)
        const dx = pb.x - pa.x
        const dy = pb.y - pa.y
        const ox = size - Math.abs(dx)
        const oy = size - Math.abs(dy)
        if (ox <= 0 || oy <= 0) continue
        moved = true
        // Push on the axis that resolves fastest: stacked input pins part
        // vertically, a neighbouring node's pads part sideways.
        const axis = oy <= ox ? ('y' as const) : ('x' as const)
        const push = (axis === 'y' ? oy : ox) / 2
        const dir = axis === 'y' ? (dy >= 0 ? 1 : -1) : dx >= 0 ? 1 : -1
        if (axis === 'y') {
          a.oy = clamp(a.oy - dir * push, -maxOff, maxOff)
          b.oy = clamp(b.oy + dir * push, -maxOff, maxOff)
        } else {
          a.ox = clamp(a.ox - dir * push, -maxOff, maxOff)
          b.ox = clamp(b.ox + dir * push, -maxOff, maxOff)
        }
      }
    }
    if (!moved) break
  }
  return pts.map((p) => {
    const pos = eff(p)
    const blocked = pts.some((q) => q !== p && Math.abs(eff(q).x - pos.x) < size && Math.abs(eff(q).y - pos.y) < size)
    return { key: p.key, x: pos.x / zoom, y: pos.y / zoom, off: blocked || zoom < PIN_PAD_ZOOM }
  })
}

export const latestDoc = (lib: Library): Doc | null =>
  Object.values(lib.circuits).reduce<Doc | null>(
    (best, doc) => (doc.updated > (best?.updated ?? -1) ? doc : best),
    null
  )

export const withDoc = (lib: Library, doc: Doc): Library => ({
  ...lib,
  circuits: { ...lib.circuits, [doc.id]: doc }
})

export const withoutDoc = (lib: Library, id: string): Library => {
  const circuits = { ...lib.circuits }
  delete circuits[id]
  return { ...lib, circuits }
}
