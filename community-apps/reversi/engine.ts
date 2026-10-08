/**
 * Pure Reversi rules: the board, legal move generation, captures and the
 * turn resolver. No state lives here - every function takes a board and
 * returns a new one or facts about it.
 */
export type Color = 'b' | 'w'
export type Board = (Color | null)[]

export const SIZE = 8
export const CELLS = SIZE * SIZE

export const other = (color: Color): Color => (color === 'b' ? 'w' : 'b')

/** 'D3'-style coordinate for a cell index; column letters first like chess files. */
export const cellName = (index: number): string => `${'ABCDEFGH'[index % SIZE]}${Math.floor(index / SIZE) + 1}`

/** Index for 'D3'-style coordinates, or -1 when the name is not a cell. */
export function cellIndex(name: string): number {
  const m = /^([a-hA-H])([1-8])$/.exec(name)
  if (!m) return -1
  return (Number(m[2]) - 1) * SIZE + m[1]!.toUpperCase().charCodeAt(0) - 65
}

const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9]

/** True when stepping from `from` by `dir` stays on the board without wrapping a file. */
function inBoard(from: number, dir: number): boolean {
  const file = from % SIZE
  if (file === 0 && (dir === -9 || dir === -1 || dir === 7)) return false
  if (file === SIZE - 1 && (dir === -7 || dir === 1 || dir === 9)) return false
  const to = from + dir
  return to >= 0 && to < CELLS
}

/** The standard Reversi opening: white on D4/E5, black on E4/D5, black to move. */
export function startBoard(): Board {
  const board = Array<Color | null>(CELLS).fill(null)
  board[cellIndex('D4')] = 'w'
  board[cellIndex('E5')] = 'w'
  board[cellIndex('E4')] = 'b'
  board[cellIndex('D5')] = 'b'
  return board
}

/**
 * Every direction run of opponent discs a disc placed at `at` would turn over,
 * each run ordered outward from `at` so callers can stagger flip animation.
 * An empty cell with no runs, or an occupied cell, yields [].
 */
export function flipsFor(board: Board, at: number, color: Color): number[][] {
  if (at < 0 || at >= CELLS || board[at] !== null) return []
  const runs: number[][] = []
  for (const dir of DIRS) {
    const run: number[] = []
    let cur = at
    while (inBoard(cur, dir)) {
      cur += dir
      const piece = board[cur]
      if (piece === null) {
        run.length = 0
        break
      }
      if (piece === color) break
      run.push(cur)
    }
    if (run.length > 0 && board[cur] === color) runs.push(run)
  }
  return runs
}

/** Every legal move for `color` as cell -> flat list of discs it flips. */
export function legalMoves(board: Board, color: Color): Map<number, number[]> {
  const moves = new Map<number, number[]>()
  for (let i = 0; i < CELLS; i++) {
    const runs = flipsFor(board, i, color)
    if (runs.length > 0) moves.set(i, runs.flat())
  }
  return moves
}

/** A new board with `color` placed at `at` and every bracketed disc flipped. */
export function applyMove(board: Board, at: number, color: Color): Board {
  const next = board.slice()
  next[at] = color
  for (const run of flipsFor(board, at, color)) for (const cell of run) next[cell] = color
  return next
}

/** Live disc counts. */
export function count(board: Board): { b: number; w: number } {
  let b = 0
  let w = 0
  for (const piece of board) {
    if (piece === 'b') b++
    else if (piece === 'w') w++
  }
  return { b, w }
}

/**
 * Whose move it is: the side with a legal move, or the opponent after a forced
 * pass, or over when nobody can play. At most one side can need a pass - two
 * consecutive passes are the game-over condition itself.
 */
export type Turn = { over: false; toMove: Color; pass: Color | null } | { over: true }

export function resolveTurn(board: Board, toMove: Color): Turn {
  if (legalMoves(board, toMove).size > 0) return { over: false, toMove, pass: null }
  const opp = other(toMove)
  if (legalMoves(board, opp).size > 0) return { over: false, toMove: opp, pass: toMove }
  return { over: true }
}
