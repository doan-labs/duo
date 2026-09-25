export type Mark = 'X' | 'O'
export type Board = Array<Mark | null>
export type Scores = { X: number; O: number }
export type WinLine = readonly [number, number, number]
export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

export const SIZE = 3
export const CELL_COUNT = SIZE * SIZE

export const WIN_LINES: WinLine[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]

// Cell names keep React keys stable and give every button a real label.
export const CELL_KEYS = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3'] as const

export function emptyBoard(): Board {
  return Array<Mark | null>(CELL_COUNT).fill(null)
}

export function winLine(board: Board): WinLine | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
  }
  return null
}

export function winner(board: Board): Mark | null {
  const line = winLine(board)
  return line ? board[line[0]]! : null
}

export function isDraw(board: Board): boolean {
  return !winLine(board) && board.every(Boolean)
}

export type SavedBoard = Array<Mark | null>

// Session storage holds the settled board both displays share; the wire shape
// is plain marks, never the animation flags a single display plays with.
export function serializeBoard(board: Board): SavedBoard {
  return board.map((mark) => (mark === 'X' || mark === 'O' ? mark : null))
}

// The wire value is untrusted: anything but nine real marks reads as empty.
export function adoptBoard(saved: unknown): Board {
  if (!Array.isArray(saved) || saved.length !== CELL_COUNT) return emptyBoard()
  return saved.map((mark) => (mark === 'X' || mark === 'O' ? mark : null))
}

export function parseScores(value: string | null): Scores {
  if (!value) return { X: 0, O: 0 }
  try {
    const parsed = JSON.parse(value) as Partial<Scores>
    return { X: Number(parsed.X) || 0, O: Number(parsed.O) || 0 }
  } catch {
    return { X: 0, O: 0 }
  }
}

// Wide boxes put the rail beside the board, so it costs width not height; the
// cover stacks it under the board instead. Bottom padding clears the home bar.
export function fitLayout(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 20 : 12
  const top = wide ? 18 : 12
  const bottom = wide ? 32 : 28
  const header = wide ? 58 : 50
  const status = 20
  const rail = wide ? 190 : 68
  const gaps = wide ? 40 : 26
  const width = view.width || 740
  const height = view.height || 480
  const freeH = height - top - header - status - bottom - gaps
  const board = wide ? Math.min(freeH, width - padX * 2 - rail) : Math.min(freeH - rail, width - padX * 2)
  return { board: Math.max(0, Math.floor(board)) }
}
