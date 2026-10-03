// Pure Minesweeper model: no React, no SDK. Both displays run this code, so
// everything mutating returns a new object and stays serializable.

export type PresetId = 'easy' | 'medium' | 'hard'
export type Preset = { id: PresetId; label: string; cols: number; rows: number; mines: number }

// Square boards only: every preset fits the cover's square well, so no panning
// is needed. Densities stay close to the classic beginner/intermediate curves.
export const PRESETS: readonly Preset[] = [
  { id: 'easy', label: 'Easy', cols: 9, rows: 9, mines: 10 },
  { id: 'medium', label: 'Medium', cols: 12, rows: 12, mines: 24 },
  { id: 'hard', label: 'Hard', cols: 16, rows: 16, mines: 40 }
]

export const presetById = (id: string): Preset => PRESETS.find((p) => p.id === id) ?? PRESETS[0]!

export type CellState = 'hidden' | 'open' | 'flagged'
export type Cell = { mine: boolean; n: number; state: CellState; exploded: boolean }
export type GameStatus = 'ready' | 'playing' | 'won' | 'lost'

export type Game = {
  preset: PresetId
  cols: number
  rows: number
  mines: number
  cells: Cell[]
  /** False until the first reveal; mines are placed only then, so first tap is safe. */
  mined: boolean
  status: GameStatus
  /** Wall-clock ms when the first reveal landed; null while `ready`. */
  startedAt: number | null
  /** Wall-clock ms when the game ended; null while `ready`/`playing`. */
  endedAt: number | null
  /** Index of the mine that was opened, when `lost`. */
  explodedAt: number | null
}

export function newGame(preset: Preset): Game {
  return {
    preset: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    mines: preset.mines,
    cells: Array.from({ length: preset.cols * preset.rows }, () => ({
      mine: false,
      n: 0,
      state: 'hidden' as CellState,
      exploded: false
    })),
    mined: false,
    status: 'ready',
    startedAt: null,
    endedAt: null,
    explodedAt: null
  }
}

/** The up-to-8 in-bounds neighbours of `index`. */
export function neighbors(index: number, cols: number, rows: number): number[] {
  const out: number[] = []
  const x = index % cols
  const y = Math.floor(index / cols)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) out.push(ny * cols + nx)
    }
  }
  return out
}

/**
 * Places `mines` mines, excluding `safeIndex` and its neighbours so the first
 * reveal always opens a region. Mutates and returns the given cells array.
 */
function placeMines(cells: Cell[], cols: number, rows: number, mines: number, safeIndex: number, random: () => number) {
  const zone = new Set([safeIndex, ...neighbors(safeIndex, cols, rows)])
  let candidates = cells.map((_, i) => i).filter((i) => !zone.has(i))
  if (candidates.length < mines) candidates = cells.map((_, i) => i).filter((i) => i !== safeIndex)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = candidates[i]!
    candidates[i] = candidates[j]!
    candidates[j] = swap
  }
  for (const i of candidates.slice(0, mines)) cells[i]!.mine = true
  for (let i = 0; i < cells.length; i++) {
    cells[i]!.n = neighbors(i, cols, rows).reduce((sum, n) => sum + (cells[n]!.mine ? 1 : 0), 0)
  }
}

/** Flood-opens `index` and, while n is 0, every neighbour; mutates `cells`. */
function flood(cells: Cell[], cols: number, rows: number, index: number) {
  const stack = [index]
  while (stack.length) {
    const i = stack.pop()!
    const cell = cells[i]!
    if (cell.state === 'open' || cell.state === 'flagged') continue
    cell.state = 'open'
    if (cell.n === 0 && !cell.mine) {
      for (const n of neighbors(i, cols, rows)) {
        if (cells[n]!.state === 'hidden') stack.push(n)
      }
    }
  }
}

/** True when every safe cell is open and no mine is. */
function cleared(cells: Cell[]) {
  return cells.every((cell) => (cell.mine ? cell.state !== 'open' : cell.state === 'open'))
}

/** End state for a hit mine: every unflagged mine is shown, flags stay up. */
function openAllMines(cells: Cell[], explodedAt: number) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!
    if (cell.mine && cell.state === 'hidden') cell.state = 'open'
    cell.exploded = i === explodedAt
  }
}

const cloneCells = (cells: Cell[]) => cells.map((cell) => ({ ...cell }))

/**
 * Reveals `index`. The first reveal of a `ready` board places the mines and
 * starts the clock. Returns the same object when the reveal is a no-op.
 */
export function reveal(game: Game, index: number, now: number, random: () => number = Math.random): Game {
  if (game.status === 'won' || game.status === 'lost') return game
  const target = game.cells[index]
  if (target?.state !== 'hidden') return game
  const cells = cloneCells(game.cells)
  const next: Game = { ...game, cells }
  if (!next.mined) {
    placeMines(cells, next.cols, next.rows, next.mines, index, random)
    next.mined = true
    next.status = 'playing'
    next.startedAt = now
  }
  if (cells[index]!.mine) {
    next.status = 'lost'
    next.endedAt = now
    next.explodedAt = index
    openAllMines(cells, index)
    return next
  }
  flood(cells, next.cols, next.rows, index)
  if (cleared(cells)) {
    next.status = 'won'
    next.endedAt = now
    for (const cell of cells) {
      if (cell.mine && cell.state === 'hidden') cell.state = 'flagged'
    }
  }
  return next
}

/**
 * Chord on an open number: when exactly `n` neighbours are flagged, opens the
 * rest. A wrong flag opens a mine and loses, exactly like a direct reveal.
 */
export function chord(game: Game, index: number, now: number): Game {
  if (game.status !== 'playing') return game
  const target = game.cells[index]
  if (target?.state !== 'open' || target.n === 0) return game
  const around = neighbors(index, game.cols, game.rows)
  const flagged = around.filter((i) => game.cells[i]!.state === 'flagged').length
  const hidden = around.filter((i) => game.cells[i]!.state === 'hidden')
  if (flagged !== target.n || hidden.length === 0) return game
  const cells = cloneCells(game.cells)
  const next: Game = { ...game, cells }
  const boom = hidden.find((i) => cells[i]!.mine)
  if (boom !== undefined) {
    next.status = 'lost'
    next.endedAt = now
    next.explodedAt = boom
    openAllMines(cells, boom)
    return next
  }
  for (const i of hidden) flood(cells, next.cols, next.rows, i)
  if (cleared(cells)) {
    next.status = 'won'
    next.endedAt = now
    for (const cell of cells) {
      if (cell.mine && cell.state === 'hidden') cell.state = 'flagged'
    }
  }
  return next
}

/** Toggles the flag on a hidden/flagged cell. No-op on open cells or ended games. */
export function toggleFlag(game: Game, index: number): Game {
  if (game.status === 'won' || game.status === 'lost') return game
  const target = game.cells[index]
  if (!target || target.state === 'open') return game
  const cells = cloneCells(game.cells)
  cells[index]!.state = cells[index]!.state === 'flagged' ? 'hidden' : 'flagged'
  return { ...game, cells }
}

/** Mines minus flags; can go negative when over-flagged, like the original. */
export const minesLeft = (game: Game) => game.mines - game.cells.filter((cell) => cell.state === 'flagged').length

/** Elapsed seconds from the timestamp pair; `now` is the tick for a running clock. */
export const elapsedSeconds = (game: Game, now: number) =>
  game.startedAt === null ? 0 : Math.max(0, Math.floor(((game.endedAt ?? now) - game.startedAt) / 1000))

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

// --- Persistence -----------------------------------------------------------

// One char per cell keeps a 16x16 board under 300 bytes of storage.
// h/m hidden safe/mine, F/M flagged safe/mine, digits are open cells, x is an
// open mine (only after a loss). `explodedAt` marks the clicked one.
export type SavedGame = {
  v: 1
  by: string
  preset: string
  status: GameStatus
  startedAt: number | null
  endedAt: number | null
  explodedAt: number | null
  cells: string
}

export function serializeGame(by: string, game: Game): SavedGame {
  const cells = game.cells
    .map((cell) => {
      if (cell.state === 'hidden') return cell.mine ? 'm' : 'h'
      if (cell.state === 'flagged') return cell.mine ? 'M' : 'F'
      return cell.mine ? 'x' : String(cell.n)
    })
    .join('')
  return {
    v: 1,
    by,
    preset: game.preset,
    status: game.status,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
    explodedAt: game.explodedAt,
    cells
  }
}

/** Rebuilds a saved game, or null when the payload is malformed or foreign-versioned. */
export function adoptGame(raw: string): { by: string; game: Game } | null {
  let saved: SavedGame
  try {
    saved = JSON.parse(raw) as SavedGame
  } catch {
    return null
  }
  if (saved.v !== 1 || typeof saved.by !== 'string') return null
  const preset = PRESETS.find((p) => p.id === saved.preset)
  if (!preset || typeof saved.cells !== 'string' || saved.cells.length !== preset.cols * preset.rows) return null
  if (!['ready', 'playing', 'won', 'lost'].includes(saved.status)) return null
  const cells: Cell[] = [...saved.cells].map((char) => {
    const cell: Cell = { mine: false, n: 0, state: 'hidden', exploded: false }
    if (char === 'm' || char === 'M' || char === 'x') cell.mine = true
    if (char === 'F' || char === 'M') cell.state = 'flagged'
    else if (char >= '0' && char <= '8') cell.state = 'open'
    else if (char === 'x') cell.state = 'open'
    return cell
  })
  for (let i = 0; i < cells.length; i++) {
    cells[i]!.n = neighbors(i, preset.cols, preset.rows).reduce((sum, n) => sum + (cells[n]!.mine ? 1 : 0), 0)
  }
  const explodedAt = saved.explodedAt
  if (explodedAt !== null && cells[explodedAt]) cells[explodedAt]!.exploded = true
  return {
    by: saved.by,
    game: {
      preset: preset.id,
      cols: preset.cols,
      rows: preset.rows,
      mines: preset.mines,
      cells,
      mined: cells.some((cell) => cell.mine),
      status: saved.status,
      startedAt: saved.startedAt,
      endedAt: saved.endedAt,
      explodedAt: saved.explodedAt
    }
  }
}

// --- Personal bests --------------------------------------------------------

export type PresetStats = { best: number | null; wins: number; plays: number }
export type Stats = Record<PresetId, PresetStats>

export const EMPTY_STATS: Stats = {
  easy: { best: null, wins: 0, plays: 0 },
  medium: { best: null, wins: 0, plays: 0 },
  hard: { best: null, wins: 0, plays: 0 }
}

export function normalizeStats(raw: unknown): Stats {
  const out = { easy: { ...EMPTY_STATS.easy }, medium: { ...EMPTY_STATS.medium }, hard: { ...EMPTY_STATS.hard } }
  if (raw && typeof raw === 'object') {
    for (const preset of PRESETS) {
      const row = (raw as Record<string, Partial<PresetStats> | undefined>)[preset.id]
      if (!row) continue
      out[preset.id] = {
        best: typeof row.best === 'number' && row.best >= 0 ? row.best : null,
        wins: typeof row.wins === 'number' && row.wins >= 0 ? Math.floor(row.wins) : 0,
        plays: typeof row.plays === 'number' && row.plays >= 0 ? Math.floor(row.plays) : 0
      }
    }
  }
  return out
}

/** A game counts as played once its first reveal landed (status left `ready`). */
export function recordPlay(stats: Stats, preset: PresetId): Stats {
  return { ...stats, [preset]: { ...stats[preset], plays: stats[preset].plays + 1 } }
}

export function recordWin(stats: Stats, preset: PresetId, seconds: number): Stats {
  const row = stats[preset]
  return {
    ...stats,
    [preset]: { wins: row.wins + 1, plays: row.plays, best: row.best === null ? seconds : Math.min(row.best, seconds) }
  }
}
