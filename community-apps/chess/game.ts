import type { Level } from './bot.ts'
import { LEVELS } from './bot.ts'
import {
  apply,
  type Color,
  fromLAN,
  type GameStatus,
  type Position,
  positionKey,
  startPosition,
  statusOf,
  toSAN
} from './engine.ts'

// The session wire value: the move list is the truth, everything else on a
// display is derived by replaying it, so the two copies can never disagree
// about the board. `by` is the writer's id - a copy ignores its own writes.
export type SavedGame = { by: string; id: string; moves: string[]; you: Color; level: Level }
export type Tally = { you: number; bot: number; draws: number; lastGame: string | null }
export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

export const isLevel = (v: unknown): v is Level => typeof v === 'string' && (LEVELS as string[]).includes(v)

export function newGame(by: string, you: Color, level: Level): SavedGame {
  return { by, id: crypto.randomUUID(), moves: [], you, level }
}

// The wire value is untrusted: anything that isn't a list of legal LAN moves
// reads as the longest legal prefix, so a corrupted session degrades to a
// shorter game rather than a crash.
export function adoptGame(saved: unknown, by: string): SavedGame {
  const fallback = newGame(by, 'w', 'Club')
  if (!saved || typeof saved !== 'object') return fallback
  const g = saved as Partial<SavedGame>
  return {
    by: typeof g.by === 'string' ? g.by : '',
    id: typeof g.id === 'string' ? g.id : fallback.id,
    moves: Array.isArray(g.moves) ? g.moves.filter((m): m is string => typeof m === 'string') : [],
    you: g.you === 'b' ? 'b' : 'w',
    level: isLevel(g.level) ? g.level : 'Club'
  }
}

export type Derived = { pos: Position; sans: string[]; status: GameStatus }

/** Replay `lans` from the start position into board, scoresheet and status. */
export function derive(lans: string[]): Derived {
  let pos = startPosition()
  const sans: string[] = []
  // Counts cover every position the game has sat in except the current one;
  // `statusOf` adds the present occurrence itself for the threefold check.
  const seen: Record<string, number> = { [positionKey(pos)]: 1 }
  for (let i = 0; i < lans.length; i++) {
    const move = fromLAN(pos, lans[i]!)
    if (!move) break
    sans.push(toSAN(pos, move))
    pos = apply(pos, move)
    if (i < lans.length - 1) seen[positionKey(pos)] = (seen[positionKey(pos)] ?? 0) + 1
  }
  return { pos, sans, status: statusOf(pos, seen) }
}

export function parseRecord(value: string | null): Tally {
  if (!value) return { you: 0, bot: 0, draws: 0, lastGame: null }
  try {
    const p = JSON.parse(value) as Partial<Tally>
    return {
      you: Number(p.you) || 0,
      bot: Number(p.bot) || 0,
      draws: Number(p.draws) || 0,
      lastGame: typeof p.lastGame === 'string' ? p.lastGame : null
    }
  } catch {
    return { you: 0, bot: 0, draws: 0, lastGame: null }
  }
}

// Wide boxes carry the rail beside the board, so it costs width not height;
// the cover stacks controls and the scoresheet under it. Bottom padding clears
// the home bar.
export function fitLayout(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 20 : 12
  const top = wide ? 18 : 14
  const bottom = wide ? 34 : 28
  const header = wide ? 56 : 48
  const status = 20
  const railW = wide ? 216 : 0
  const railH = wide ? 0 : 138
  const gaps = wide ? 44 : 28
  const width = view.width || 740
  const height = view.height || 480
  const freeH = height - top - header - status - bottom - gaps
  const board = wide ? Math.min(freeH, width - padX * 2 - railW) : Math.min(freeH - railH, width - padX * 2)
  return { board: Math.max(120, Math.floor(board)) }
}
