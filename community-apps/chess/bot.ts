// The opponent: material + piece-square evaluation and iterative-deepening
// negamax with alpha-beta, quiescence on captures, and killer/history move
// ordering. Piece-square tables are indexed a1=0, matching engine.ts; a black
// piece reads the table mirrored vertically (`sq ^ 56`).
import {
  apply,
  type Color,
  colorOf,
  file,
  inCheck,
  insufficientMaterial,
  legalMoves,
  type Move,
  other,
  type Piece,
  type Position,
  rank
} from './engine.ts'

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

// a1 is index 0: the first row of each table is that piece's home rank.
const PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5,
  10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0
]
const KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15,
  20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50
]
const BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10,
  10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10,
  -10, -10, -10, -10, -20
]
const ROOK = [
  0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0,
  0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0
]
const QUEEN = [
  -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5,
  -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20
]
const KING = [
  20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40,
  -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40,
  -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30
]
const PST: Record<string, number[]> = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING }

const MATE = 1_000_000
const INF = 2_000_000

function evaluate(p: Position): number {
  let score = 0
  const { board } = p
  let bishopsW = 0
  let bishopsB = 0
  // Pawn files for the doubled-pawn penalty.
  const filesW = Array(8).fill(0)
  const filesB = Array(8).fill(0)
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq]
    if (!piece) continue
    const kind = piece.toLowerCase()
    const white = colorOf(piece) === 'w'
    const at = white ? sq : sq ^ 56
    const v = VALUE[kind]! + PST[kind]![at]!
    score += white ? v : -v
    if (kind === 'b') white ? bishopsW++ : bishopsB++
    if (kind === 'p') (white ? filesW : filesB)[file(sq)]++
  }
  if (bishopsW >= 2) score += 30
  if (bishopsB >= 2) score -= 30
  for (let f = 0; f < 8; f++) {
    if (filesW[f] > 1) score -= 12 * (filesW[f] - 1)
    if (filesB[f] > 1) score += 12 * (filesB[f] - 1)
  }
  return p.turn === 'w' ? score : -score
}

/** MVV-LVA first so the likeliest cutoffs land early in the move list. */
function orderMoves(p: Position, moves: Move[], killers: (Move | null)[], ply: number, history: Int32Array) {
  const scoreOf = (m: Move) => {
    let s = 0
    const victim = m.ep ? 'p' : p.board[m.to]?.toLowerCase()
    if (victim) s += 10 * VALUE[victim]! - VALUE[p.board[m.from]!.toLowerCase()]! / 10
    if (m.promo) s += 900 + VALUE[m.promo]!
    const killer = killers[ply]
    if (killer && killer.from === m.from && killer.to === m.to) s += 5000
    s += history[p.board[m.from]!.charCodeAt(0) * 64 + m.to] ?? 0
    return s
  }
  return moves.map((m) => ({ m, s: scoreOf(m) })).sort((a, b) => b.s - a.s)
}

export type Level = 'Casual' | 'Club' | 'Tournament'
export const LEVELS: Level[] = ['Casual', 'Club', 'Tournament']
const BUDGET: Record<Level, { ms: number; depth: number; slack: number }> = {
  // Casual blunders on purpose: a shallow search and a random pick among the
  // moves close enough to best, so the game feels human, not broken.
  Casual: { ms: 120, depth: 2, slack: 90 },
  Club: { ms: 500, depth: 6, slack: 12 },
  Tournament: { ms: 1400, depth: 12, slack: 0 }
}

export type SearchResult = { move: Move; score: number; depth: number; nodes: number }

class Search {
  nodes = 0
  deadline = 0
  stopped = false
  killers: (Move | null)[] = Array(64).fill(null)
  history = new Int32Array(128 * 64)

  private timeout() {
    return (this.nodes & 2047) === 0 && Date.now() > this.deadline
  }

  private terminal(p: Position, ply: number): number | null {
    if (p.halfmove >= 100 || insufficientMaterial(p.board)) return 0
    return null
  }

  private quiesce(p: Position, alpha: number, beta: number, ply: number): number {
    this.nodes++
    if (this.timeout()) this.stopped = true
    if (this.stopped) return alpha
    const end = this.terminal(p, ply)
    if (end !== null) return end
    // In check, standing pat is not an option: every legal reply is searched.
    const checked = inCheck(p)
    if (!checked) {
      const stand = evaluate(p)
      if (stand >= beta) return beta
      if (stand > alpha) alpha = stand
    }
    const all = legalMoves(p)
    if (all.length === 0) return checked ? -MATE + ply : 0
    const moves = checked ? all : all.filter((m) => m.ep || m.promo || p.board[m.to])
    for (const { m } of orderMoves(p, moves, [], 0, this.history)) {
      const score = -this.quiesce(apply(p, m), -beta, -alpha, ply + 1)
      if (this.stopped) return alpha
      if (score >= beta) return beta
      if (score > alpha) alpha = score
    }
    return alpha
  }

  private search(p: Position, depth: number, alpha: number, beta: number, ply: number): number {
    this.nodes++
    if (this.timeout()) this.stopped = true
    if (this.stopped) return alpha
    const end = this.terminal(p, ply)
    if (end !== null) return end
    const moves = orderMoves(p, legalMoves(p), this.killers, ply, this.history)
    if (moves.length === 0) return inCheck(p) ? -MATE + ply : 0
    if (depth <= 0) return this.quiesce(p, alpha, beta, ply)
    let best = -INF
    for (const { m } of moves) {
      const score = -this.search(apply(p, m), depth - 1, -beta, -alpha, ply + 1)
      if (this.stopped) return alpha
      if (score > best) best = score
      if (score > alpha) alpha = score
      if (alpha >= beta) {
        const piece = p.board[m.from]!
        if (!p.board[m.to] && !m.ep) {
          this.killers[ply] = m
          this.history[piece.charCodeAt(0) * 64 + m.to]! += depth * depth
        }
        break
      }
    }
    return alpha
  }

  /** Iterative deepening: the last completed depth owns the answer. */
  run(p: Position, level: Level): SearchResult | null {
    const { ms, depth: maxDepth, slack } = BUDGET[level]
    this.deadline = Date.now() + ms
    const root = legalMoves(p)
    if (!root.length) return null
    let picks: { m: Move; s: number }[] = orderMoves(p, root, this.killers, 0, this.history)
    let completed = 0
    for (let depth = 1; depth <= maxDepth; depth++) {
      const scored: { m: Move; s: number }[] = []
      let alpha = -INF
      // The previous depth's order is the best predictor of the next cutoff.
      for (const { m } of picks) {
        const s = -this.search(apply(p, m), depth - 1, -INF, -alpha, 1)
        if (this.stopped) break
        scored.push({ m, s })
        if (s > alpha) alpha = s
      }
      if (this.stopped) break
      scored.sort((a, b) => b.s - a.s)
      picks = scored
      completed = depth
      // A forced mate needs no more thought.
      if (Math.abs(scored[0]!.s) > MATE - 1000) break
    }
    if (!picks.length) picks = root.map((m) => ({ m, s: 0 }))
    // Non-improving root scores are bounds, not exact values: they can fake-tie
    // with the best, so slack 0 takes the first pick (the sort is stable and the
    // real best was searched first), while a wider pool randomizes deliberately.
    const best = picks[0]!.s
    const pool = slack > 0 ? picks.filter((x) => x.s >= best - slack) : [picks[0]!]
    const chosen = pool[Math.floor(Math.random() * pool.length)]!
    return { move: chosen.m, score: chosen.s, depth: completed, nodes: this.nodes }
  }
}

/** Pick the bot's move in `p` at `level`. Synchronous - callers wrap it in a
 * timeout so the 'thinking' frame paints first. */
export function chooseMove(p: Position, level: Level): SearchResult | null {
  return new Search().run(p, level)
}
