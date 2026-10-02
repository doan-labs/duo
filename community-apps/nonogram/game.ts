// The pure rules of the game: clue math, the uniqueness solver, cell
// transitions, the undo stack and session/durable wire shapes. Nothing here
// knows React, the SDK or the display.

export const UNKNOWN = 0
export const FILLED = 1
export const MARKED = 2
export type Cell = typeof UNKNOWN | typeof FILLED | typeof MARKED
export type Tool = 'fill' | 'mark' | 'erase'

export type Puzzle = {
  id: string
  name: string
  /** One string per row, '#' filled and '.' empty. */
  rows: string[]
  /** How hard the logic gets; shown in the picker, never faked. */
  tier: 'Easy' | 'Medium' | 'Tricky'
}

export type Grid = { cols: number; rows: number; cells: boolean[] }

export function toGrid(puzzle: Puzzle): Grid {
  const cols = puzzle.rows[0]?.length ?? 0
  const cells: boolean[] = []
  for (const row of puzzle.rows) {
    if (row.length !== cols) throw new Error(`${puzzle.id}: ragged row`)
    for (const ch of row) cells.push(ch === '#')
  }
  return { cols, rows: puzzle.rows.length, cells }
}

/** Run-length encode one line: [1,1,0,1] -> [2,1]. An empty line clues [0]. */
export function clueLine(line: boolean[]): number[] {
  const clues: number[] = []
  let run = 0
  for (const cell of line) {
    if (cell) run++
    else if (run) {
      clues.push(run)
      run = 0
    }
  }
  if (run) clues.push(run)
  return clues.length ? clues : [0]
}

export function clues(grid: Grid): { rows: number[][]; cols: number[][] } {
  const rows: number[][] = []
  const cols: number[][] = []
  for (let r = 0; r < grid.rows; r++) rows.push(clueLine(grid.cells.slice(r * grid.cols, (r + 1) * grid.cols)))
  for (let c = 0; c < grid.cols; c++)
    cols.push(clueLine(Array.from({ length: grid.rows }, (_, r) => grid.cells[r * grid.cols + c]!)))
  return { rows, cols }
}

/** Every placement of `clue` runs inside `len` cells, as filled-index lists. */
export function linePatterns(len: number, clue: number[]): number[][] {
  if (clue.length === 1 && clue[0] === 0) return [[]]
  const out: number[][] = []
  const walk = (at: number, from: number, acc: number[]) => {
    if (at === clue.length) {
      out.push(acc)
      return
    }
    const rest = clue.slice(at + 1).reduce((a, b) => a + b + 1, 0)
    const run = clue[at]!
    for (let start = from; start + run + rest <= len; start++) {
      const placed = [...acc]
      for (let i = 0; i < run; i++) placed.push(start + i)
      walk(at + 1, start + run + 1, placed)
    }
  }
  walk(0, 0, [])
  return out
}

/**
 * Count solutions to a clue pair by DFS over row patterns, pruning against
 * column patterns; stops at `limit`. Used to prove a shipped puzzle has
 * exactly one solution, so the player solves logic rather than guessing art.
 */
export function countSolutions(grid: Grid, limit = 2): number {
  const { rows: rowClues, cols: colClues } = clues(grid)
  const rowPats = rowClues.map((c) => linePatterns(grid.cols, c))
  const colPats = colClues.map((c) => linePatterns(grid.rows, c))
  // Column-pattern candidates kept live per column as rows commit.
  let live = colPats.map((pats) => pats.slice())
  let count = 0
  const place = (r: number) => {
    if (count >= limit) return
    if (r === grid.rows) {
      count++
      return
    }
    for (const pat of rowPats[r]!) {
      const filled = new Set(pat)
      const next = live.map((pats, c) => {
        const keep = pats.filter((p) => p.includes(r) === filled.has(c))
        return keep
      })
      if (next.some((p) => p.length === 0)) continue
      if (r === grid.rows - 1 && next.some((p) => p.length !== 1)) continue
      const saved = live
      live = next
      place(r + 1)
      live = saved
      if (count >= limit) return
    }
  }
  place(0)
  return count
}

export function freshCells(grid: Grid): Cell[] {
  return new Array<Cell>(grid.cells.length).fill(UNKNOWN)
}

/** The state a tool leaves behind on one cell; `fill`/`mark` toggle, `erase` clears. */
export function targetFor(tool: Tool, cell: Cell): Cell {
  if (tool === 'erase') return UNKNOWN
  const want = tool === 'fill' ? FILLED : MARKED
  return cell === want ? UNKNOWN : want
}

export type Edit = { i: number; prev: Cell }[]
export type UndoEntry = { applied: Cell; edits: Edit }

/** Apply `target` to one index; the returned edit entry is null on a no-op. */
export function applyCell(cells: Cell[], i: number, target: Cell): Edit {
  if (i < 0 || i >= cells.length || cells[i] === target) return []
  const prev = cells[i]!
  cells[i] = target
  return [{ i, prev }]
}

export function undoOnce(cells: Cell[], entry: UndoEntry) {
  // Reverse order: a cell touched twice inside one stroke lands back on its
  // state before the stroke, not on a mid-stroke value.
  for (let i = entry.edits.length - 1; i >= 0; i--) cells[entry.edits[i]!.i] = entry.edits[i]!.prev
}

/** Solved means every filled square is found and nothing extra is inked. */
export function isComplete(cells: Cell[], grid: Grid): boolean {
  return grid.cells.every((want, i) => (want ? cells[i] === FILLED : cells[i] !== FILLED))
}

/** A line reads satisfied when its fills already match the picture's. */
export function lineSatisfied(cells: Cell[], want: boolean[]): boolean {
  return want.every((w, i) => (w ? cells[i] === FILLED : cells[i] !== FILLED))
}

/** How much of the picture is inked, for honest progress labels. */
export function progress(cells: Cell[], grid: Grid): { inked: number; total: number } {
  let inked = 0
  let total = 0
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i]) {
      total++
      if (cells[i] === FILLED) inked++
    }
  }
  return { inked, total }
}

// What both displays share through os.session; `by`/`at` order the
// last-writer-wins store so a copy adopts a peer's settled game and ignores
// its own echo. `undo` travels so a fold keeps the whole edit history.
export type SavedGame = {
  by: string
  at: number
  /** New id every fresh board: how a replay's solve is not the first solve counted twice. */
  run: string
  screen: 'play' | 'pick'
  puzzleId: string
  tool: Tool
  cells: Cell[]
  undo: UndoEntry[]
  moves: number
  startedAt: number | null
  finishedAt: number | null
  done: boolean
  /**
   * Set by the copy that turned this run done, inside the same publish that
   * carried the last cell. Travels with the shared game so whichever display
   * owns the durable write can count the solve once even if the finisher
   * folded before its own write ran.
   */
  scored: boolean
}

// What relaunch keeps through os.storage: per-puzzle marks and truthful stats.
export type PuzzleRecord = {
  cells: Cell[]
  done: boolean
  solves: number
  bestTime: number | null
  /** The SavedGame run the latest counted solve belongs to. */
  run: string | null
}
export type Durable = { schema: 1; last: string; puzzles: Record<string, PuzzleRecord> }

export const emptyDurable: Durable = { schema: 1, last: '', puzzles: {} }

export function parseDurable(value: unknown): Durable {
  if (typeof value !== 'object' || value === null) return emptyDurable
  const v = value as Partial<Durable>
  return { schema: 1, last: typeof v.last === 'string' ? v.last : '', puzzles: v.puzzles ?? {} }
}

export function adoptGame(value: unknown, me: string): SavedGame | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as SavedGame
  if (!Array.isArray(v.cells) || typeof v.puzzleId !== 'string') return null
  return { ...v, scored: v.scored === true, by: typeof v.by === 'string' ? v.by : me }
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export type ViewDimensions = { width: number; height: number }

// Fit math for the clue gutters and the square cell. The gutters price one
// pitch per clue number; whatever is left divides into cells, capped so a 5x5
// never blows up past readability.
export function fitBoard(grid: Grid, rowClues: number[][], colClues: number[][], view: ViewDimensions, wide: boolean) {
  const pitch = wide ? 16 : 13
  const clueW = Math.max(...rowClues.map((c) => c.length)) * pitch
  const clueH = Math.max(...colClues.map((c) => c.length)) * pitch
  const padX = wide ? 20 : 14
  const top = wide ? 16 : 12
  const header = wide ? 54 : 46
  const status = wide ? 22 : 18
  const rail = wide ? 0 : 118
  const home = 30
  const width = view.width || 355
  const height = view.height || 480
  const boardW = Math.max(0, width - padX * 2 - (wide ? 236 : 0))
  const boardH = Math.max(0, height - top - header - status - home - rail)
  const cell = Math.max(
    8,
    Math.floor(Math.min((boardW - clueW) / grid.cols, (boardH - clueH) / grid.rows, wide ? 44 : 34))
  )
  return { cell, clueW, clueH, pitch }
}
