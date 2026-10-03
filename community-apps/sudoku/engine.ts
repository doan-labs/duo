// Sudoku engine: generation, solving and logical grading. Pure functions over
// flat 81-cell grids (0 = empty); the UI layer lives in game.ts and main.tsx.

export type Grid = number[] // 81 entries, 0 is empty
export type Difficulty = 'easy' | 'medium' | 'hard'

export const SIDE = 9
export const CELLS = 81

export const rowOf = (i: number) => Math.floor(i / SIDE)
export const colOf = (i: number) => i % SIDE
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)

// The 27 houses a digit must not repeat in: 9 rows, 9 columns, 9 boxes.
export const UNITS: number[][] = (() => {
  const units: number[][] = []
  for (let r = 0; r < SIDE; r++) units.push(Array.from({ length: SIDE }, (_, c) => r * SIDE + c))
  for (let c = 0; c < SIDE; c++) units.push(Array.from({ length: SIDE }, (_, r) => r * SIDE + c))
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++)
      units.push(Array.from({ length: SIDE }, (_, k) => (br * 3 + Math.floor(k / 3)) * SIDE + bc * 3 + (k % 3)))
  return units
})()

// Every peer a cell shares a unit with; a value here blocks a digit there.
export const PEERS: number[][] = (() => {
  const peers: number[][] = Array.from({ length: CELLS }, () => [])
  for (const unit of UNITS) for (const a of unit) for (const b of unit) if (a !== b) peers[a]!.push(b)
  return peers.map((list) => [...new Set(list)])
})()

/** Deterministic PRNG (mulberry32): one seed always yields one stream. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** String hash (FNV-1a) so dates and labels can act as seeds. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function shuffled<T>(rand: () => number, list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = out[i]!
    out[i] = out[j]!
    out[j] = t
  }
  return out
}

/** Digits still legal at `i`, ascending. Empty for a filled cell. */
export function candidates(grid: Grid, i: number): number[] {
  if (grid[i]) return []
  let used = 0
  for (const p of PEERS[i]!) {
    const v = grid[p]!
    if (v) used |= 1 << v
  }
  const out: number[] = []
  for (let d = 1; d <= SIDE; d++) if (!(used & (1 << d))) out.push(d)
  return out
}

/** Cells whose digit repeats inside one of their units. */
export function conflicts(grid: Grid): Set<number> {
  const bad = new Set<number>()
  for (const unit of UNITS) {
    const seen = new Map<number, number>()
    for (const i of unit) {
      const v = grid[i]!
      if (!v) continue
      const first = seen.get(v)
      if (first === undefined) seen.set(v, i)
      else {
        bad.add(i)
        bad.add(first)
      }
    }
  }
  return bad
}

/**
 * Backtracking solver that counts solutions, stopping at `limit`. Picking the
 * emptiest-candidate cell (MRV) keeps near-full grids fast even when asking
 * "is there a second solution?" on every dig step.
 */
export function countSolutions(grid: Grid, limit = 2): number {
  let found = 0
  const work = [...grid]
  const walk = (): void => {
    if (found >= limit) return
    let best = -1
    let bestCands: number[] = []
    for (let i = 0; i < CELLS; i++) {
      if (work[i]) continue
      const cands = candidates(work, i)
      if (!cands.length) return
      if (best < 0 || cands.length < bestCands.length) {
        best = i
        bestCands = cands
        if (cands.length === 1) break
      }
    }
    if (best < 0) {
      found++
      return
    }
    for (const d of bestCands) {
      work[best] = d
      walk()
      work[best] = 0
      if (found >= limit) return
    }
  }
  walk()
  return found
}

/** One completion of `grid`, or null if none exists. */
export function solveOne(grid: Grid): Grid | null {
  const work = [...grid]
  const walk = (): boolean => {
    let best = -1
    let bestCands: number[] = []
    for (let i = 0; i < CELLS; i++) {
      if (work[i]) continue
      const cands = candidates(work, i)
      if (!cands.length) return false
      if (best < 0 || cands.length < bestCands.length) {
        best = i
        bestCands = cands
        if (cands.length === 1) break
      }
    }
    if (best < 0) return true
    for (const d of bestCands) {
      work[best] = d
      if (walk()) return true
      work[best] = 0
    }
    return false
  }
  return walk() ? work : null
}

// Logical grading: the hardest technique a puzzle actually needs.
// 1 naked singles, 2 hidden singles, 3 naked pairs / locked candidates,
// 4 nothing left - a guess is required (the solver still proves uniqueness).
export type Analysis = { solved: boolean; level: number; solution: Grid | null }

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const bits = (mask: number) => DIGITS.filter((d) => mask & (1 << d))

/**
 * Solve with singles, pairs and locked candidates only - no branching. Because
 * every applied move is forced, a grid this finishes is provably unique; the
 * digger for easy/medium relies on that and skips the counting solver.
 */
export function analyze(givens: Grid): Analysis {
  const grid = [...givens]
  const cand = grid.map((v, i) => {
    if (v) return 0
    let used = 0
    for (const p of PEERS[i]!) if (grid[p]) used |= 1 << grid[p]!
    return ~used & 0x3fe // bits 1..9
  })
  let level = 0
  let moved = true
  const place = (i: number, d: number, at: number) => {
    grid[i] = d
    cand[i] = 0
    if (at > level) level = at
    for (const p of PEERS[i]!) cand[p]! &= ~(1 << d)
    moved = true
  }
  while (moved) {
    moved = false
    // Naked singles.
    for (let i = 0; i < CELLS; i++) {
      if (!grid[i] && cand[i] && (cand[i]! & (cand[i]! - 1)) === 0) place(i, bits(cand[i]!)[0]!, 1)
    }
    // Hidden singles: a digit with only one home in a unit.
    for (const unit of UNITS) {
      for (const d of DIGITS) {
        let only = -1
        let count = 0
        for (const i of unit)
          if (!grid[i] && cand[i]! & (1 << d)) {
            only = i
            count++
          }
        if (count === 1) place(only, d, 2)
      }
    }
    if (moved) continue
    // Naked pairs and locked candidates - eliminations, not placements.
    for (const unit of UNITS) {
      const open = unit.filter((i) => !grid[i])
      const byMask = new Map<number, number[]>()
      for (const i of open) {
        if (!cand[i]) continue
        const list = byMask.get(cand[i]!) ?? []
        list.push(i)
        byMask.set(cand[i]!, list)
      }
      for (const [mask, cells] of byMask) {
        const digits = bits(mask)
        if (digits.length === 2 && cells.length === 2)
          for (const i of open)
            if (!cells.includes(i) && cand[i]! & mask) {
              cand[i]! &= ~mask
              level = Math.max(level, 3)
              moved = true
            }
      }
    }
    // Locked candidates: within a box all spots for a digit share a row or
    // column, so the digit leaves that line outside the box; and mirrored.
    for (let b = 0; b < 9; b++) {
      const cells = UNITS[18 + b]!
      for (const d of DIGITS) {
        const spots = cells.filter((i) => !grid[i] && cand[i]! & (1 << d))
        if (spots.length < 2) continue
        const rows = new Set(spots.map(rowOf))
        const cols = new Set(spots.map(colOf))
        if (rows.size === 1) {
          const r = [...rows][0]!
          for (let c = 0; c < SIDE; c++) {
            const i = r * SIDE + c
            if (boxOf(i) !== b && !grid[i] && cand[i]! & (1 << d)) {
              cand[i]! &= ~(1 << d)
              level = Math.max(level, 3)
              moved = true
            }
          }
        }
        if (cols.size === 1) {
          const c = [...cols][0]!
          for (let r = 0; r < SIDE; r++) {
            const i = r * SIDE + c
            if (boxOf(i) !== b && !grid[i] && cand[i]! & (1 << d)) {
              cand[i]! &= ~(1 << d)
              level = Math.max(level, 3)
              moved = true
            }
          }
        }
      }
    }
  }
  const solved = grid.every(Boolean)
  return { solved, level: solved ? Math.max(level, 1) : 4, solution: solveOne(grid) }
}

/** A grid with every cell filled, uniformly random enough for fair puzzles. */
export function generateSolved(rand: () => number): Grid {
  const grid: Grid = new Array(CELLS).fill(0)
  const fill = (): boolean => {
    let best = -1
    let bestCands: number[] = []
    for (let i = 0; i < CELLS; i++) {
      if (grid[i]) continue
      const cands = candidates(grid, i)
      if (!cands.length) return false
      if (best < 0 || cands.length < bestCands.length) {
        best = i
        bestCands = cands
      }
    }
    if (best < 0) return true
    for (const d of shuffled(rand, bestCands)) {
      grid[best] = d
      if (fill()) return true
      grid[best] = 0
    }
    return false
  }
  fill()
  return grid
}

export type Puzzle = { givens: Grid; solution: Grid; clues: number; level: number }

// Per-difficulty dig targets and the honesty rules the label rests on: easy is
// always solvable by singles, medium never needs a guess, and hard is unique
// while genuinely needing more than singles.
const TARGET: Record<Difficulty, { clues: number; maxLevel: number }> = {
  easy: { clues: 40, maxLevel: 2 },
  medium: { clues: 33, maxLevel: 3 },
  hard: { clues: 26, maxLevel: 4 }
}
const ATTEMPTS = 40

const clueCount = (grid: Grid) => grid.reduce((n, v) => n + (v ? 1 : 0), 0)

/**
 * Build a verified puzzle for `seed`. Digging removes cells in 180-degree
 * symmetric pairs and only keeps a removal while the puzzle stays inside the
 * difficulty's honesty rules: for easy/medium that means "still solvable
 * without a guess" (which also proves uniqueness, since every move is forced);
 * for hard, the counting solver proves a unique solution each step. The label
 * is then checked against the measured analysis level, not the clue count.
 */
export function makePuzzle(seed: number, difficulty: Difficulty): Puzzle {
  const { clues: target, maxLevel } = TARGET[difficulty]
  let best: Puzzle | null = null
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const rand = rng(hash(`${seed}:${attempt}`))
    const solution = generateSolved(rand)
    const grid = [...solution]
    // Cell pairs mirrored across the centre keep the given pattern symmetric.
    const order = shuffled(
      rand,
      Array.from({ length: 41 }, (_, i) => [i, CELLS - 1 - i] as const)
    )
    for (const [a, b] of order) {
      if (clueCount(grid) <= target) break
      const va = grid[a]!
      const vb = grid[b]!
      grid[a] = 0
      grid[b] = 0
      const keeps =
        difficulty === 'hard'
          ? countSolutions(grid, 2) === 1
          : (() => {
              const a = analyze(grid)
              return a.solved && a.level <= maxLevel
            })()
      if (!keeps) {
        grid[a] = va
        grid[b] = vb
      }
    }
    const level = analyze(grid).level
    const clues = clueCount(grid)
    const puzzle: Puzzle = { givens: grid, solution, clues, level }
    // Honesty check on the label before this attempt can ship.
    const labelled =
      difficulty === 'easy' ? level <= 2 : difficulty === 'medium' ? level >= 2 && level <= 3 : level >= 3
    if (labelled) return puzzle
    if (!best || level > best.level) best = puzzle
  }
  // Only reachable when every attempt missed the band; the returned puzzle is
  // still verified unique, just closer to the band edge than usual.
  return best!
}

/** Today's deterministic daily seed: one puzzle per calendar date. */
export function dailySeed(date: string): number {
  return hash(`daily:${date}`)
}

export type Hint = { cell: number; digit: number; reason: string }

const name = (i: number) => `r${rowOf(i) + 1}c${colOf(i) + 1}`

/**
 * A hint worth trusting: prefer the selected cell, then the first deduction a
 * player could make (naked single, then hidden single), and only fall back to
 * the verified solution digit when no logical move exists.
 */
export function findHint(grid: Grid, solution: Grid, selected: number | null): Hint | null {
  const empty = (i: number) => !grid[i]
  if (selected !== null && empty(selected) && solution[selected]) {
    const cands = candidates(grid, selected)
    if (cands.length === 1)
      return { cell: selected, digit: cands[0]!, reason: `${name(selected)} has no other legal digit` }
  }
  // Naked singles anywhere.
  for (let i = 0; i < CELLS; i++) {
    if (!empty(i)) continue
    const cands = candidates(grid, i)
    if (cands.length === 1) return { cell: i, digit: cands[0]!, reason: `${name(i)} has no other legal digit` }
  }
  // Hidden singles: name the unit so the player learns where to look.
  for (const [u, unit] of UNITS.entries()) {
    const label = u < 9 ? `row ${u + 1}` : u < 18 ? `column ${u - 8}` : `box ${u - 17}`
    for (const d of DIGITS) {
      const spots = unit.filter((i) => empty(i) && candidates(grid, i).includes(d))
      if (spots.length === 1) return { cell: spots[0]!, digit: d, reason: `${label} has only one spot for ${d}` }
    }
  }
  if (selected !== null && empty(selected) && solution[selected])
    return {
      cell: selected,
      digit: solution[selected]!,
      reason: `${name(selected)} is ${solution[selected]} in the unique solution`
    }
  const first = grid.findIndex((v) => !v)
  if (first < 0) return null
  return { cell: first, digit: solution[first]!, reason: `${name(first)} is ${solution[first]} in the unique solution` }
}
