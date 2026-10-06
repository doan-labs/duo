/**
 * Match model and wire format. The durable truth is a compact list of placed
 * moves; passes are never stored because they are forced - derive() inserts a
 * pass wherever the side to move has no legal move, which makes replays,
 * foreign writes and undos all agree on the same position.
 */
import { LEVELS, type Level } from './bot.ts'
import {
  applyMove,
  type Board,
  type Color,
  cellName,
  count,
  flipsFor,
  legalMoves,
  other,
  resolveTurn,
  startBoard
} from './engine.ts'

export type Mode = 'solo' | 'local'

/** Durable match state. `by` is the writing copy's id, so its own echo is ignored. */
export type SavedGame = {
  by: string
  id: string
  v: 1
  mode: Mode
  level: Level
  /** In solo, the color the person plays. Unused in local. */
  you: Color
  /** Cell indexes in play order; passes are implied, never stored. */
  moves: number[]
}

export type LogEntry =
  | { kind: 'move'; side: Color; at: number; name: string; flips: number }
  | { kind: 'pass'; side: Color }

export type Derived = {
  board: Board
  /** Side to move; null once the match is over. */
  toMove: Color | null
  legal: Map<number, number[]>
  scores: { b: number; w: number }
  log: LogEntry[]
  /** The last placed move and its per-direction flip runs, for the stagger. */
  last: { at: number; side: Color; runs: number[][] } | null
  over: null | { winner: Color | 'draw' }
  /** How many stored plies validated - a trimmed foreign write stops early. */
  plies: number
}

export function newGame(by: string, mode: Mode, level: Level, you: Color): SavedGame {
  return { by, id: crypto.randomUUID(), v: 1, mode, level, you, moves: [] }
}

/** Replay `moves` into the board, the log, the side to move and the result. */
export function derive(moves: number[]): Derived {
  let board = startBoard()
  let toMove: Color = 'b'
  const log: LogEntry[] = []
  let last: Derived['last'] = null
  let plies = 0

  for (const at of moves) {
    const turn = resolveTurn(board, toMove)
    if (turn.over) break
    if (turn.pass) log.push({ kind: 'pass', side: turn.pass })
    toMove = turn.toMove
    const legal = legalMoves(board, toMove)
    if (!legal.has(at)) break
    const runs = flipsFor(board, at, toMove)
    board = applyMove(board, at, toMove)
    log.push({ kind: 'move', side: toMove, at, name: cellName(at), flips: runs.flat().length })
    last = { at, side: toMove, runs }
    toMove = other(toMove)
    plies++
  }

  const turn = resolveTurn(board, toMove)
  const scores = count(board)
  if (turn.over) {
    const winner = scores.b === scores.w ? 'draw' : scores.b > scores.w ? 'b' : 'w'
    return { board, toMove: null, legal: new Map(), scores, log, last, over: { winner }, plies }
  }
  if (turn.pass) log.push({ kind: 'pass', side: turn.pass })
  return {
    board,
    toMove: turn.toMove,
    legal: legalMoves(board, turn.toMove),
    scores,
    log,
    last,
    over: null,
    plies
  }
}

/**
 * Hydrate an untrusted wire value. Accepts the JSON string or an object, keeps
 * only what the schema allows, replays moves and stops at the first one that
 * is not legal - a doctored tail cannot corrupt the board, it is just dropped.
 */
export function adoptGame(saved: string | object | null | undefined, me: string): SavedGame {
  const fallback = { ...newGame(me, 'solo', 'Medium', 'b'), by: '' }
  try {
    const parsed = typeof saved === 'string' ? (JSON.parse(saved) as Record<string, unknown>) : saved
    if (!parsed || typeof parsed !== 'object') return fallback
    const raw = parsed as Record<string, unknown>
    const mode: Mode = raw.mode === 'local' ? 'local' : 'solo'
    const level: Level = LEVELS.includes(raw.level as Level) ? (raw.level as Level) : 'Medium'
    const you: Color = raw.you === 'w' ? 'w' : 'b'
    const moves = Array.isArray(raw.moves)
      ? raw.moves.filter((m): m is number => Number.isInteger(m) && m >= 0 && m < 64)
      : []
    const replayed = derive(moves)
    return {
      by: typeof raw.by === 'string' ? raw.by : '',
      id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
      v: 1,
      mode,
      level,
      you,
      moves: moves.slice(0, replayed.plies)
    }
  } catch {
    return fallback
  }
}

/**
 * Undo policy: in local mode take back the last ply. In solo, pop plies until
 * it is your turn again - two plies after the bot answered, one while it has
 * not, so undo never hands the bot a free position.
 */
export function undoCut(game: SavedGame): number[] {
  const moves = game.moves.slice()
  if (moves.length === 0) return moves
  if (game.mode === 'local') return moves.slice(0, -1)
  while (moves.length > 0) {
    moves.pop()
    const d = derive(moves)
    if (!d.over && d.toMove === game.you) break
  }
  return moves
}

/** Whether an undo would change anything right now. */
export function canUndo(game: SavedGame, d: Derived, thinking: boolean): boolean {
  if (thinking || game.moves.length === 0) return false
  if (game.mode === 'local') return true
  if (d.over) return true
  return d.toMove === game.you ? game.moves.length >= 2 : game.moves.length >= 1
}

/** Persisted match tally across sessions. */
export type Tally = { black: number; white: number; draws: number; lastGame: string | null }

export function emptyTally(): Tally {
  return { black: 0, white: 0, draws: 0, lastGame: null }
}

export function parseTally(raw: string | null | undefined): Tally {
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Tally>) : {}
    return {
      black: typeof parsed.black === 'number' ? parsed.black : 0,
      white: typeof parsed.white === 'number' ? parsed.white : 0,
      draws: typeof parsed.draws === 'number' ? parsed.draws : 0,
      lastGame: typeof parsed.lastGame === 'string' ? parsed.lastGame : null
    }
  } catch {
    return emptyTally()
  }
}

/** Persisted preferences: move hints on, sound on. */
export type Prefs = { hints: boolean; muted: boolean }

export function parsePrefs(raw: string | null | undefined): Prefs {
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {}
    return { hints: parsed.hints !== false, muted: parsed.muted === true }
  } catch {
    return { hints: true, muted: false }
  }
}

/** Per-display layout math. Hidden views can measure 0; callers guard on it. */
export function fitLayout(view: { width: number; height: number }, wide: boolean): { board: number } {
  const width = view.width || 740
  const height = view.height || 480
  const padX = wide ? 24 : 14
  const top = wide ? 16 : 10
  const header = wide ? 56 : 40
  const status = wide ? 26 : 20
  const bottom = wide ? 30 : 20
  const rail = wide ? 268 : 0
  const under = wide ? 0 : 218
  const gaps = wide ? 36 : 18
  const freeH = height - top - header - status - bottom - gaps - under
  const board = wide ? Math.min(freeH, width - padX * 2 - rail) : Math.min(freeH, width - padX * 2)
  return { board: Math.max(160, Math.floor(board)) }
}
