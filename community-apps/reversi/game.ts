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

// The seeded opening shares one id on both displays so a first move from
// either side lands on the same match instead of forking two identities.
export const OPENING_ID = 'reversi-opening'

/** A write's verdict: apply the next document or reject the stale input. */
export type Mutation = { ok: true; game: SavedGame } | { ok: false }

/**
 * A placement is only legal on the exact settled document the tap was aimed
 * at. When the wire carries a newer match or newer moves, the input is stale:
 * rejecting it is what stops a lagging display from clobbering foreign plies.
 */
export function tryPlace(base: SavedGame, expected: SavedGame, at: number): Mutation {
  if (base.id !== expected.id || base.moves.length !== expected.moves.length) return { ok: false }
  const d = derive(base.moves)
  if (d.over || !d.legal.has(at)) return { ok: false }
  if (base.mode === 'solo' && d.toMove !== base.you) return { ok: false }
  return { ok: true, game: { ...base, moves: [...base.moves, at] } }
}

/** Same identity check for a takeback; the match keeps its id for the tally. */
export function tryUndo(base: SavedGame, expected: SavedGame): Mutation {
  if (base.id !== expected.id) return { ok: false }
  const d = derive(base.moves)
  if (!canUndo(base, d, false) || d.plies === 0) return { ok: false }
  return { ok: true, game: { ...base, moves: undoCut(base) } }
}

/** The bot's deferred reply only lands while the position it read is settled. */
export function tryReply(base: SavedGame, snapshot: SavedGame, at: number): Mutation {
  if (base.mode !== 'solo') return { ok: false }
  if (base.id !== snapshot.id || base.moves.length !== snapshot.moves.length) return { ok: false }
  const d = derive(base.moves)
  if (d.over || d.toMove === base.you || d.toMove === null || !d.legal.has(at)) return { ok: false }
  return { ok: true, game: { ...base, moves: [...base.moves, at] } }
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

/**
 * Count a finished match exactly once. The match id is the dedupe key and it
 * survives undo, replay, folds and reloads, so a re-finished match can never
 * post a second win while a genuinely new match always can.
 */
export function countFinished(tally: Tally, id: string, winner: 'b' | 'w' | 'draw'): Tally {
  if (tally.lastGame === id) return tally
  return {
    black: tally.black + (winner === 'b' ? 1 : 0),
    white: tally.white + (winner === 'w' ? 1 : 0),
    draws: tally.draws + (winner === 'draw' ? 1 : 0),
    lastGame: id
  }
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

/**
 * Per-display layout math. The board owns nearly the full content width on
 * both displays; on cover the controls live in a scroll region below it, so
 * the reservation is a fixed chrome budget, not a second column.
 */
export function fitLayout(view: { width: number; height: number }, wide: boolean): { board: number } {
  const width = view.width || 740
  const height = view.height || 480
  const padX = wide ? 24 : 16
  const rail = wide ? 288 : 0
  const chrome = wide ? 150 : 164
  const board = Math.min(width - padX * 2 - rail, height - chrome)
  return { board: Math.max(160, Math.floor(board)) }
}
