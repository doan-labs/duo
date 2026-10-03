import {
  CELLS,
  candidates,
  conflicts,
  type Difficulty,
  dailySeed,
  type Grid,
  hash,
  makePuzzle,
  PEERS
} from './engine.ts'

export type Mode = 'daily' | Difficulty
export const MODES: readonly Mode[] = ['daily', 'easy', 'medium', 'hard']
export const MODE_LABEL: Record<Mode, string> = { daily: 'Daily', easy: 'Easy', medium: 'Med', hard: 'Hard' }
export const MODE_NAME: Record<Mode, string> = { daily: 'Daily', easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export const today = () => new Date().toISOString().slice(0, 10)

export const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as string[]).includes(v)

export type UndoMark = { cell: number; digit: number; notes: string }

/**
 * The session wire value and the durable slot share one shape: the puzzle, the
 * player's entries and pencil notes, the selection and the undo stack, plus
 * timing. `by` is the writer id - a copy ignores its own session write (both
 * displays share one last-writer-wins key, so adopting any foreign write is
 * what converges them). `solution` rides along because the puzzle is
 * single-player and honest: there is nothing to cheat against.
 */
export type GameState = {
  by: string
  id: string
  mode: Mode
  day: string | null
  seed: number
  givens: string
  solution: string
  entries: string
  notes: string[]
  sel: number | null
  pencil: boolean
  undo: UndoMark[]
  hints: number
  startedAt: number
  endedAt: number | null
}

const UNDO_CAP = 200
const EMPTY_ENTRIES = '.'.repeat(CELLS)
const EMPTY_NOTES = () => Array.from({ length: CELLS }, () => '')

export const toGrid = (s: string): Grid => [...s].map((c) => (c >= '1' && c <= '9' ? Number(c) : 0))
export const fromGrid = (g: Grid): string => g.map((v) => (v ? String(v) : '.')).join('')
export const boardOf = (g: GameState): Grid => {
  const entries = toGrid(g.entries)
  return toGrid(g.givens).map((v, i) => v || entries[i]!)
}
export const givenAt = (g: GameState, i: number) => g.givens[i] !== '.' && g.givens[i] !== '0'
export const entryAt = (g: GameState, i: number) => {
  const c = g.entries[i]
  return c && c >= '1' && c <= '9' ? Number(c) : 0
}
export const isSolved = (g: GameState) => boardOf(g).every(Boolean) && !conflicts(boardOf(g)).size
export const isComplete = (g: GameState) => g.endedAt !== null
export const elapsedMs = (g: GameState, now: number) => (g.endedAt ?? now) - g.startedAt
export const emptyCount = (g: GameState) => boardOf(g).reduce((n, v) => n + (v ? 0 : 1), 0)

/** Remaining count for a digit: how many of `d` are already placed. */
export function digitCount(g: GameState, d: number): number {
  const b = boardOf(g)
  return b.reduce((n, v) => n + (v === d ? 1 : 0), 0)
}

export function newGame(by: string, mode: Mode, seed?: number): GameState {
  const day = mode === 'daily' ? today() : null
  const actual = seed ?? (mode === 'daily' ? dailySeed(day!) : Math.floor(Math.random() * 2 ** 31))
  const puzzle = makePuzzle(actual, mode === 'daily' ? 'medium' : mode)
  return {
    by,
    id: crypto.randomUUID(),
    mode,
    day,
    seed: actual,
    givens: fromGrid(puzzle.givens),
    solution: fromGrid(puzzle.solution),
    entries: EMPTY_ENTRIES,
    notes: EMPTY_NOTES(),
    sel: firstEmpty(puzzle.givens),
    pencil: false,
    undo: [],
    hints: 0,
    startedAt: Date.now(),
    endedAt: null
  }
}

const firstEmpty = (g: Grid) => {
  const i = g.findIndex((v) => !v)
  return i < 0 ? null : i
}

const cleanCellString = (v: unknown): string =>
  typeof v === 'string' && /^[.0-9]{81}$/.test(v) ? v.replace(/0/g, '.') : EMPTY_ENTRIES

const cleanNotes = (v: unknown): string[] => {
  if (!Array.isArray(v)) return EMPTY_NOTES()
  const out = EMPTY_NOTES()
  for (let i = 0; i < CELLS; i++) {
    const cell = v[i]
    if (typeof cell === 'string' && /^[1-9]{0,9}$/.test(cell)) out[i] = [...new Set(cell)].sort().join('')
  }
  return out
}

const cleanUndo = (v: unknown): UndoMark[] => {
  if (!Array.isArray(v)) return []
  const out: UndoMark[] = []
  for (const m of v.slice(-UNDO_CAP)) {
    if (typeof m !== 'object' || !m) continue
    const mark = m as Partial<UndoMark>
    if (typeof mark.cell === 'number' && mark.cell >= 0 && mark.cell < CELLS)
      out.push({
        cell: mark.cell,
        digit: typeof mark.digit === 'number' ? mark.digit : 0,
        notes: typeof mark.notes === 'string' ? mark.notes : ''
      })
  }
  return out
}

/**
 * The wire value is untrusted: anything that is not a coherent game degrades
 * field by field rather than crashing a folded-over copy mid-render.
 */
export function adoptGame(saved: unknown): GameState | null {
  if (!saved || typeof saved !== 'object') return null
  const g = saved as Partial<GameState>
  if (typeof g.id !== 'string' || !isMode(g.mode)) return null
  const givens = cleanCellString(g.givens)
  const solution = cleanCellString(g.solution).replace(/\./g, '0')
  const entries = cleanCellString(g.entries)
  // A corrupt solution would poison hints; rebuild it from the givens instead
  // is out of scope for adoption - trust it only when it is 81 digits that
  // agree with the givens.
  const okSolution = /^[1-9]{81}$/.test(solution) && [...givens].every((c, i) => c === '.' || c === solution[i])
  if (!okSolution) return null
  return {
    by: typeof g.by === 'string' ? g.by : '',
    id: g.id,
    mode: g.mode,
    day: typeof g.day === 'string' ? g.day : null,
    seed: typeof g.seed === 'number' ? g.seed : hash(g.id),
    givens,
    solution,
    entries,
    notes: cleanNotes(g.notes),
    sel: typeof g.sel === 'number' && g.sel >= 0 && g.sel < CELLS ? g.sel : firstEmpty(toGrid(givens)),
    pencil: g.pencil === true,
    undo: cleanUndo(g.undo),
    hints: typeof g.hints === 'number' ? g.hints : 0,
    startedAt: typeof g.startedAt === 'number' ? g.startedAt : Date.now(),
    endedAt: typeof g.endedAt === 'number' ? g.endedAt : null
  }
}

const mark = (g: GameState, cell: number): UndoMark => ({ cell, digit: entryAt(g, cell), notes: g.notes[cell] ?? '' })
const withUndo = (g: GameState, cell: number): UndoMark[] => [...g.undo.slice(-UNDO_CAP + 1), mark(g, cell)]

/** Place (or toggle off) a digit at `cell`. Givens and finished games are read-only. */
export function play(g: GameState, cell: number, digit: number): GameState {
  if (g.endedAt !== null || givenAt(g, cell)) return g
  const cur = entryAt(g, cell)
  if (cur === digit) return g
  const entries = g.entries.split('')
  entries[cell] = String(digit)
  const notes = [...g.notes]
  notes[cell] = ''
  const next: GameState = {
    ...g,
    entries: entries.join(''),
    notes,
    undo: withUndo(g, cell),
    endedAt: null
  }
  if (isSolved(next)) next.endedAt = Date.now()
  return next
}

/** Toggle a pencil mark at `cell` (only on empty cells). */
export function jot(g: GameState, cell: number, digit: number): GameState {
  if (g.endedAt !== null || givenAt(g, cell) || entryAt(g, cell)) return g
  const set = new Set(g.notes[cell]!.split('').filter(Boolean))
  if (set.has(String(digit))) set.delete(String(digit))
  else set.add(String(digit))
  const notes = [...g.notes]
  notes[cell] = [...set].sort().join('')
  return { ...g, notes, undo: withUndo(g, cell) }
}

export function erase(g: GameState, cell: number): GameState {
  if (g.endedAt !== null || givenAt(g, cell)) return g
  if (!entryAt(g, cell) && !g.notes[cell]) return g
  const entries = g.entries.split('')
  entries[cell] = '.'
  const notes = [...g.notes]
  notes[cell] = ''
  return { ...g, entries: entries.join(''), notes, undo: withUndo(g, cell) }
}

export function undo(g: GameState): GameState {
  const last = g.undo[g.undo.length - 1]
  if (!last) return g
  const entries = g.entries.split('')
  entries[last.cell] = last.digit ? String(last.digit) : '.'
  const notes = [...g.notes]
  notes[last.cell] = last.notes
  const next: GameState = {
    ...g,
    entries: entries.join(''),
    notes,
    sel: last.cell,
    undo: g.undo.slice(0, -1),
    endedAt: null
  }
  if (isSolved(next)) next.endedAt = g.endedAt
  return next
}

/** Reveal the correct digit at `cell` through a normal undoable move. */
export function reveal(g: GameState, cell: number): GameState {
  if (g.endedAt !== null || givenAt(g, cell)) return g
  const digit = Number(g.solution[cell])
  if (!digit || entryAt(g, cell) === digit) return g
  const next = play(g, cell, digit)
  return { ...next, hints: g.hints + 1 }
}

/** Clear every entry and note but keep the puzzle, clock and id. */
export function restart(g: GameState): GameState {
  return {
    ...g,
    entries: EMPTY_ENTRIES,
    notes: EMPTY_NOTES(),
    undo: [],
    sel: firstEmpty(toGrid(g.givens)),
    pencil: false,
    hints: 0,
    startedAt: Date.now(),
    endedAt: null
  }
}

export const select = (g: GameState, sel: number | null): GameState =>
  sel === g.sel || (sel !== null && (sel < 0 || sel >= CELLS)) ? g : { ...g, sel }

export const setPencil = (g: GameState, pencil: boolean): GameState => ({ ...g, pencil })

/** Cells related to `sel`: same row, column or box - the board's sweep tint. */
export function relatedTo(sel: number): Set<number> {
  return new Set(PEERS[sel]!)
}

/** Notes the digit can legally take at `cell` under current entries. */
export function legalAt(g: GameState, cell: number): number[] {
  return candidates(boardOf(g), cell)
}

export type Tally = { played: number; solved: number; bestMs: Record<Mode, number> }
export const EMPTY_TALLY: Tally = { played: 0, solved: 0, bestMs: { daily: 0, easy: 0, medium: 0, hard: 0 } }

export function parseTally(value: unknown): Tally {
  if (!value || typeof value !== 'object') return EMPTY_TALLY
  const p = value as Partial<Tally>
  const bestMs = { ...EMPTY_TALLY.bestMs }
  if (p.bestMs && typeof p.bestMs === 'object')
    for (const m of MODES) {
      const v = (p.bestMs as Record<string, unknown>)[m]
      if (typeof v === 'number' && v > 0) bestMs[m] = v
    }
  return {
    played: typeof p.played === 'number' ? p.played : 0,
    solved: typeof p.solved === 'number' ? p.solved : 0,
    bestMs
  }
}

export type Saved = { slots: Partial<Record<Mode, GameState>>; stats: Tally; last: Mode }
export const EMPTY_SAVED: Saved = { slots: {}, stats: EMPTY_TALLY, last: 'daily' }

export function parseSaved(value: string | null): Saved {
  if (!value) return EMPTY_SAVED
  try {
    const parsed = JSON.parse(value) as { slots?: unknown; stats?: unknown; last?: unknown }
    const slots: Saved['slots'] = {}
    if (parsed.slots && typeof parsed.slots === 'object')
      for (const m of MODES) {
        const state = adoptGame((parsed.slots as Record<string, unknown>)[m])
        if (state) slots[m] = state
      }
    return { slots, stats: parseTally(parsed.stats), last: isMode(parsed.last) ? parsed.last : 'daily' }
  } catch {
    return EMPTY_SAVED
  }
}

export function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
}

export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

/**
 * Board and keypad sizing from the real view box. Cover stacks board over a
 * one-row pad and a control row; wide boxes put the rail beside the board.
 * Bottom padding clears the home bar.
 */
export function fitLayout(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 24 : 12
  const top = wide ? 18 : 14
  const bottom = wide ? 34 : 28
  const header = wide ? 54 : 50
  const status = 22
  const gaps = wide ? 40 : 26
  const railW = wide ? 264 : 0
  const padH = wide ? 0 : 44
  const toolsH = wide ? 0 : 42
  const width = view.width || (wide ? 740 : 355)
  const height = view.height || (wide ? 480 : 520)
  const freeH = height - top - header - status - bottom - gaps - padH - toolsH
  const board = wide ? Math.min(freeH, width - padX * 2 - railW) : Math.min(freeH, width - padX * 2)
  return { board: Math.max(180, Math.floor(board)) }
}
