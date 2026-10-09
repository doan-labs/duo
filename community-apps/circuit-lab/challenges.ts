// The challenge set: small, original logic tasks with a fixed I/O row. A
// challenge doc is scaffolded with its switches and bulbs already placed and
// the palette's I/O tiles locked, so the work is always "build the logic" -
// never "guess what to add". Validation is positional: switches top-to-bottom
// map to A, B, C, D and bulbs top-to-bottom map to the listed outputs, so a
// renamed label never breaks the check.

import { bulbsOf, type CircuitNode, type Doc, evaluate, type NodeKind, switchesOf } from './circuit.ts'

export type Challenge = {
  id: string
  title: string
  /** One sentence of objective, shown on the canvas banner. */
  brief: string
  /** Number of input switches the scaffold lays out (1..4). */
  inputs: number
  /** Bulb labels, top to bottom. */
  outputs: string[]
  /** Gate kinds the palette disables for this challenge. */
  forbid: NodeKind[]
  /** Expected bulb values for one input row. */
  want: (ins: boolean[]) => boolean[]
}

const and = (a: boolean, b: boolean) => a && b
const or = (a: boolean, b: boolean) => a || b
const not = (a: boolean) => !a
const xor = (a: boolean, b: boolean) => a !== b

export const CHALLENGES: Challenge[] = [
  {
    id: 'first-light',
    title: 'First Light',
    brief: 'Light OUT whenever A is on. No gates needed - wire it straight through.',
    inputs: 1,
    outputs: ['OUT'],
    forbid: [],
    want: ([a]) => [a!]
  },
  {
    id: 'two-keys',
    title: 'Two Keys',
    brief: 'OUT lights only while A and B are both on.',
    inputs: 2,
    outputs: ['OUT'],
    forbid: [],
    want: ([a, b]) => [and(a!, b!)]
  },
  {
    id: 'either-door',
    title: 'Either Door',
    brief: 'OUT lights when A or B (or both) are on.',
    inputs: 2,
    outputs: ['OUT'],
    forbid: [],
    want: ([a, b]) => [or(a!, b!)]
  },
  {
    id: 'the-opposite',
    title: 'The Opposite',
    brief: 'OUT lights only while A is off.',
    inputs: 1,
    outputs: ['OUT'],
    forbid: [],
    want: ([a]) => [not(a!)]
  },
  {
    id: 'different',
    title: 'Different',
    brief: 'OUT lights when A and B disagree - and the XOR chip is off the shelf.',
    inputs: 2,
    outputs: ['OUT'],
    forbid: ['xor'],
    want: ([a, b]) => [xor(a!, b!)]
  },
  {
    id: 'all-agree',
    title: 'All Agree',
    brief: 'OUT lights when A and B match, on or off.',
    inputs: 2,
    outputs: ['OUT'],
    forbid: [],
    want: ([a, b]) => [!xor(a!, b!)]
  },
  {
    id: 'majority',
    title: 'Majority',
    brief: 'OUT lights when at least two of A, B and C are on.',
    inputs: 3,
    outputs: ['OUT'],
    forbid: [],
    want: ([a, b, c]) => [or(or(and(a!, b!), and(a!, c!)), and(b!, c!))]
  },
  {
    id: 'half-adder',
    title: 'Half Adder',
    brief: 'Two outputs at once: SUM is A XOR B, CARRY is A AND B.',
    inputs: 2,
    outputs: ['SUM', 'CARRY'],
    forbid: [],
    want: ([a, b]) => [xor(a!, b!), and(a!, b!)]
  },
  {
    id: 'four-door',
    title: 'Four Doors',
    brief: 'OUT lights when at least one of A/B and at least one of C/D are on.',
    inputs: 4,
    outputs: ['OUT'],
    forbid: [],
    want: ([a, b, c, d]) => [and(or(a!, b!), or(c!, d!))]
  }
]

export const challengeById = (id: string | null | undefined): Challenge | null =>
  CHALLENGES.find((c) => c.id === id) ?? null

/** Fresh doc for a challenge: its switches and bulbs in place, logic empty. */
export function scaffold(ch: Challenge): Doc {
  const nodes: Record<string, CircuitNode> = {}
  const ys = (count: number) => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 92)
  for (const [i, y] of ys(ch.inputs).entries()) {
    const n: CircuitNode = {
      id: crypto.randomUUID().slice(0, 8),
      kind: 'switch',
      x: -240,
      y,
      on: false,
      label: 'ABCD'[i]!
    }
    nodes[n.id] = n
  }
  for (const [i, y] of ys(ch.outputs.length).entries()) {
    const n: CircuitNode = {
      id: crypto.randomUUID().slice(0, 8),
      kind: 'bulb',
      x: 240,
      y,
      on: false,
      label: ch.outputs[i]!
    }
    nodes[n.id] = n
  }
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: ch.title,
    nodes,
    wires: {},
    view: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: [],
    challenge: ch.id,
    updated: Date.now()
  }
}

export type ChallengeRow = { ins: boolean[]; want: boolean[]; got: (boolean | null)[] }
export type ChallengeRun = {
  /** Row-by-row detail for the banner/inspector. */
  rows: ChallengeRow[]
  /** First failing row index, or null. */
  mismatch: number | null
  solved: boolean
}

/**
 * Runs the circuit over every input row and compares the challenge's bulbs -
 * matched positionally (top-to-bottom against `outputs`), so a renamed bulb
 * still counts. Missing I/O reads as unsolved rather than crashing.
 */
export function challengeRun(doc: Doc, ch: Challenge): ChallengeRun {
  const ins = switchesOf(doc)
  const outs = bulbsOf(doc)
  const rows: ChallengeRow[] = []
  const count = 1 << ch.inputs
  let mismatch: number | null = null
  for (let mask = 0; mask < count; mask++) {
    const states: Record<string, boolean> = {}
    const row: boolean[] = []
    for (let i = 0; i < ch.inputs; i++) {
      const bit = Boolean(mask & (1 << (ch.inputs - 1 - i)))
      row.push(bit)
      const sw = ins[i]
      if (sw) states[sw.id] = bit
    }
    const want = ch.want(row)
    const { value } = evaluate(doc, states)
    const got = ch.outputs.map((_, i) => (outs[i] ? (value[outs[i]!.id] ?? false) : null))
    const ok = got.every((g, i) => g === want[i])
    if (!ok && mismatch === null) mismatch = mask
    rows.push({ ins: row, want, got })
  }
  const enoughIo = ins.length >= ch.inputs && outs.length >= ch.outputs.length
  return { rows, mismatch, solved: enoughIo && mismatch === null }
}
