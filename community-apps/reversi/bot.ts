/**
 * Three honestly differentiated opponents. Easy plays a uniformly random legal
 * move. Medium greedily evaluates the position one ply deep with the weighted
 * square table, adding a little noise among near-best picks. Hard runs a real
 * negamax search with alpha-beta pruning and iterative deepening on a clock,
 * so it sees traps, forced passes and endgames coming - the label on the dial
 * is the engine underneath it, not a cosmetic rename.
 */
import { applyMove, type Board, CELLS, type Color, count, legalMoves, other } from './engine.ts'

export const LEVELS = ['Easy', 'Medium', 'Hard'] as const
export type Level = (typeof LEVELS)[number]

/** How long each level takes before its answer, so the think beat reads. */
export const THINK_MS: Record<Level, number> = { Easy: 420, Medium: 560, Hard: 720 }

/** Classic positional weights: corners gold, X/C squares beside them poison. */
const WEIGHTS = [
  120, -28, 20, 6, 6, 20, -28, 120, -28, -48, -4, -4, -4, -4, -48, -28, 20, -4, 14, 2, 2, 14, -4, 20, 6, -4, 2, 0, 0, 2,
  -4, 6, 6, -4, 2, 0, 0, 2, -4, 6, 20, -4, 14, 2, 2, 14, -4, 20, -28, -48, -4, -4, -4, -4, -48, -28, 120, -28, 20, 6, 6,
  20, -28, 120
]

/** Discs adjacent to an empty square: few of your own is quiet, many is exposed. */
function frontier(board: Board, color: Color): number {
  let n = 0
  for (let i = 0; i < CELLS; i++) {
    if (board[i] !== color) continue
    const file = i % 8
    const rank = (i / 8) | 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue
        const r = rank + dr
        const c = file + dc
        if (r < 0 || r > 7 || c < 0 || c > 7) continue
        if (board[r * 8 + c] === null) {
          n++
          dr = 2
          break
        }
      }
    }
  }
  return n
}

/** Static score for `color`: position, mobility and phase-aware disc count. */
export function evaluate(board: Board, color: Color): number {
  const opp = other(color)
  let positional = 0
  let mine = 0
  let theirs = 0
  for (let i = 0; i < CELLS; i++) {
    const piece = board[i]
    if (piece === color) {
      mine++
      positional += WEIGHTS[i]!
    } else if (piece === opp) {
      theirs++
      positional -= WEIGHTS[i]!
    }
  }
  const empties = CELLS - mine - theirs
  const mobility = legalMoves(board, color).size - legalMoves(board, opp).size
  const exposure = frontier(board, color) - frontier(board, opp)
  // Disc count is a liability early (more discs = more fronts to defend) and
  // the whole point late, so its sign flips as the board fills.
  const disc = empties > 16 ? -6 * (mine - theirs) : 30 * (mine - theirs)
  return positional * 3 + mobility * 30 - exposure * 8 + disc
}

const WIN = 1_000_000

/** Score when no side can move: a huge win/loss plus the disc margin. */
function terminalScore(board: Board, color: Color): number {
  const { b, w } = count(board)
  const diff = color === 'b' ? b - w : w - b
  if (diff > 0) return WIN + diff
  if (diff < 0) return -WIN + diff
  return 0
}

function moveOrder(at: number): number {
  // Positional weight orders the most forcing moves first, pruning the rest.
  return WEIGHTS[at]!
}

function negamax(
  board: Board,
  color: Color,
  depth: number,
  alpha: number,
  beta: number,
  budget: { nodes: number; deadline: number }
): number {
  budget.nodes++
  if ((budget.nodes & 1023) === 0 && Date.now() > budget.deadline) return evaluate(board, color)
  const moves = legalMoves(board, color)
  if (moves.size === 0) {
    if (legalMoves(board, other(color)).size === 0) return terminalScore(board, color)
    // A pass costs a turn but not a ply of search - depth stays put.
    return -negamax(board, other(color), depth, -beta, -alpha, budget)
  }
  if (depth <= 0) return evaluate(board, color)
  const ordered = [...moves.keys()].sort((a, z) => moveOrder(z) - moveOrder(a))
  let best = -Infinity
  for (const at of ordered) {
    const score = -negamax(applyMove(board, at, color), other(color), depth - 1, -beta, -alpha, budget)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
    if (Date.now() > budget.deadline) break
  }
  return best
}

class SearchHalt extends Error {}

type LiveBudget = { nodes: number; deadline: number; nextYield: number; cancelled: () => boolean }

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * The same search as `negamax` but cooperative: every slice of work hands the
 * thread back to the event loop, so input, paint and timers stay live while
 * Hard thinks. A cancelled or expired budget unwinds by throwing SearchHalt.
 */
async function negamaxAsync(
  board: Board,
  color: Color,
  depth: number,
  alpha: number,
  beta: number,
  budget: LiveBudget
): Promise<number> {
  if (++budget.nodes % 512 === 0) {
    const now = Date.now()
    if (now > budget.deadline || budget.cancelled()) throw new SearchHalt()
    if (now > budget.nextYield) {
      budget.nextYield = now + 9
      await pause()
    }
  }
  const moves = legalMoves(board, color)
  if (moves.size === 0) {
    if (legalMoves(board, other(color)).size === 0) return terminalScore(board, color)
    return -1 * (await negamaxAsync(board, other(color), depth, -beta, -alpha, budget))
  }
  if (depth <= 0) return evaluate(board, color)
  const ordered = [...moves.keys()].sort((a, z) => moveOrder(z) - moveOrder(a))
  let best = -Infinity
  for (const at of ordered) {
    const score = -1 * (await negamaxAsync(applyMove(board, at, color), other(color), depth - 1, -beta, -alpha, budget))
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

/**
 * The UI path for a bot move. Easy and Medium are instant; Hard runs the
 * sliced negamax so the thread is never held longer than one work slice. The
 * deadline is wall clock, so quality is capped exactly like the sync pick;
 * `cancelled` lets a fold, undo or foreign write abort the search outright.
 */
export async function chooseMoveAsync(
  board: Board,
  color: Color,
  level: Level,
  cancelled: () => boolean,
  rand: () => number = Math.random
): Promise<Pick | null> {
  if (level !== 'Hard') {
    await pause()
    return cancelled() ? null : chooseMove(board, color, level, rand)
  }
  const options = [...legalMoves(board, color).keys()]
  if (options.length === 0) return null
  if (options.length === 1) return { at: options[0]!, depth: 0 }
  const empties = board.filter((p) => p === null).length
  const budget: LiveBudget = {
    nodes: 0,
    deadline: Date.now() + budgetFor(empties, 620),
    nextYield: Date.now(),
    cancelled
  }
  let best = options[0]!
  let reached = 0
  try {
    for (let depth = 1; depth <= depthFor(empties); depth++) {
      let alpha = -Infinity
      let roundBest = options[0]!
      let roundScore = -Infinity
      const ordered = [best, ...options.filter((o) => o !== best)]
      for (const at of ordered) {
        const score =
          -1 * (await negamaxAsync(applyMove(board, at, color), other(color), depth - 1, -Infinity, -alpha, budget))
        if (score > roundScore) {
          roundScore = score
          roundBest = at
        }
        if (score > alpha) alpha = score
      }
      best = roundBest
      reached = depth
    }
  } catch (error) {
    if (!(error instanceof SearchHalt)) throw error
  }
  if (cancelled()) return null
  return { at: best, depth: reached }
}

/** Deepest search to attempt: solve outright once the endgame is small enough. */
function depthFor(empties: number): number {
  if (empties <= 14) return empties + 2
  if (empties <= 20) return 8
  return 6
}

/** Wall-clock budget in ms: endgames get a deeper allowance so the exact
 * solve almost always completes instead of returning a shallower read. */
function budgetFor(empties: number, mid: number): number {
  return empties <= 12 ? 2400 : mid
}

export type Pick = { at: number; depth: number }

/**
 * The move a level chooses for `color`, or null when there is none. Hard's
 * returned depth is how many plies the completed iteration reached.
 */
export function chooseMove(board: Board, color: Color, level: Level, rand: () => number = Math.random): Pick | null {
  const options = [...legalMoves(board, color).keys()]
  if (options.length === 0) return null
  if (options.length === 1) return { at: options[0]!, depth: 0 }

  if (level === 'Easy') {
    return { at: options[Math.floor(rand() * options.length)]!, depth: 0 }
  }

  if (level === 'Medium') {
    // One-ply greedy on the static table, choosing among picks near the top so
    // consecutive games do not play out identically.
    let best = -Infinity
    const scored: { at: number; score: number }[] = []
    for (const at of options) {
      const score = evaluate(applyMove(board, at, color), color)
      scored.push({ at, score })
      if (score > best) best = score
    }
    const near = scored.filter((s) => s.score >= best - 12)
    return { at: near[Math.floor(rand() * near.length)]!.at, depth: 1 }
  }

  // Hard: iterative deepening negamax with alpha-beta inside a soft clock.
  const empties = board.filter((p) => p === null).length
  const budget = { nodes: 0, deadline: Date.now() + budgetFor(empties, 550) }
  let best = options[0]!
  let reached = 0
  for (let depth = 1; depth <= depthFor(empties); depth++) {
    let alpha = -Infinity
    let roundBest = options[0]!
    let roundScore = -Infinity
    const ordered = [best, ...options.filter((o) => o !== best)]
    for (const at of ordered) {
      const score = -negamax(applyMove(board, at, color), other(color), depth - 1, -Infinity, -alpha, budget)
      if (score > roundScore) {
        roundScore = score
        roundBest = at
      }
      if (score > alpha) alpha = score
      if (Date.now() > budget.deadline) break
    }
    best = roundBest
    reached = depth
    if (Date.now() > budget.deadline) break
  }
  return { at: best, depth: reached }
}
