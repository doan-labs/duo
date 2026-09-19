import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useDisplay } from '@doan-labs/duo-uikit'
import { app, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Mark = 'X' | 'O'
type Scores = { X: number; O: number }

const WIN_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]
const CELL_KEYS = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3']
const motion = '@media (prefers-reduced-motion: reduce)'
const markPop = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.78)' },
  '70%': { opacity: 1, transform: 'scale(1.06)' },
  to: { opacity: 1, transform: 'scale(1)' }
})

function winner(board: Array<Mark | null>) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

function parseScores(value: string | null): Scores {
  if (!value) return { X: 0, O: 0 }
  try {
    const parsed = JSON.parse(value) as Partial<Scores>
    return { X: Number(parsed.X) || 0, O: Number(parsed.O) || 0 }
  } catch {
    return { X: 0, O: 0 }
  }
}

function Game() {
  const view = useDisplay()
  const cover = view.display === 'cover'
  const stored = useKV(os.storage, 'match-scores')
  const [board, setBoard] = useState<Array<Mark | null>>(Array(9).fill(null))
  const [turn, setTurn] = useState<Mark>('X')
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0 })
  const [moveNumber, setMoveNumber] = useState(0)
  const result = winner(board)
  const draw = !result && board.every(Boolean)
  const finished = Boolean(result || draw)
  const boardSize = Math.max(
    0,
    Math.floor(Math.min((view.width || 740) - (cover ? 20 : 36), (view.height || 480) - (cover ? 158 : 178)))
  )

  useEffect(() => {
    if (stored.status === 'hydrating') return
    setScores(parseScores(stored.value))
  }, [stored.status, stored.value])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const play = (index: number) => {
    if (board[index] || finished) return
    const next = [...board]
    next[index] = turn
    const nextWinner = winner(next)
    setBoard(next)
    setMoveNumber((current) => current + 1)
    if (!nextWinner && next.some((cell) => cell === null)) setTurn(turn === 'X' ? 'O' : 'X')
    if (nextWinner) {
      const nextScores = { ...scores, [nextWinner]: scores[nextWinner] + 1 }
      setScores(nextScores)
      void stored.set(JSON.stringify(nextScores))
    }
  }

  const resetRound = () => {
    setBoard(Array(9).fill(null))
    setTurn('X')
    setMoveNumber((current) => current + 1)
  }

  const resetScores = () => {
    const nextScores = { X: 0, O: 0 }
    setScores(nextScores)
    void stored.set(JSON.stringify(nextScores))
    resetRound()
  }

  return (
    <main data-display={view.display} {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.title)}>Tic-Tac-Toe</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <span {...stylex.props(styles.scoreX)}>X {scores.X}</span>
          <span {...stylex.props(styles.scoreO)}>O {scores.O}</span>
        </div>
      </header>
      <p {...stylex.props(styles.status)}>{result ? `${result} wins` : draw ? 'Draw game' : `${turn} plays next`}</p>
      <div role="grid" aria-label="Tic-Tac-Toe board" {...stylex.props(styles.board, styles.fitBoard(boardSize))}>
        {board.map((mark, index) => (
          <button
            key={mark ? `${CELL_KEYS[index]}-${moveNumber}` : CELL_KEYS[index]}
            type="button"
            aria-label={mark ? mark : 'Empty cell'}
            onClick={() => play(index)}
            {...stylex.props(
              styles.cell,
              mark && styles.cellMark,
              mark === 'X' && styles.cellX,
              mark === 'O' && styles.cellO
            )}
          >
            {mark}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Game controls" {...stylex.props(styles.controls)}>
        <button type="button" onClick={resetRound} {...stylex.props(styles.primary)}>
          New round
        </button>
        <button type="button" onClick={resetScores} {...stylex.props(styles.secondary)}>
          Reset wins
        </button>
      </div>
    </main>
  )
}

const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    paddingBlock: 16,
    paddingInline: 18,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    fontFamily: fonts.system
  },
  cover: { gap: 6, paddingBlock: 10, paddingInline: 10 },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    flexShrink: 0
  },
  kicker: { color: colors.cyan, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 34, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1 },
  scores: { display: 'flex', gap: 6, fontSize: 11, fontWeight: 800 },
  scoreX: { color: colors.cyan },
  scoreO: { color: colors.orange },
  status: { marginBlock: 0, color: colors.grey3, fontSize: 13, flexShrink: 0 },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
    gap: 6,
    flexShrink: 0
  },
  fitBoard: (size: number) => ({ width: `${String(size)}px`, height: `${String(size)}px` }),
  cell: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    borderRadius: 12,
    color: colors.white,
    backgroundColor: app.fill,
    fontSize: 42,
    fontWeight: 800,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: '.16s, .2s, .2s',
    transitionTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
  },
  cellMark: {
    animationName: { default: markPop, [motion]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    animationFillMode: 'both'
  },
  cellX: { color: colors.cyan, backgroundColor: app.fill3 },
  cellO: { color: colors.orange, backgroundColor: app.fill3 },
  controls: { display: 'flex', justifyContent: 'center', gap: 8, flexShrink: 0 },
  primary: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 9,
    paddingInline: 16,
    color: colors.grey6Dark,
    backgroundColor: colors.cyan,
    fontWeight: 800,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
  },
  secondary: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 9,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: app.fill,
    fontWeight: 700,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
  }
})

await os.connect()
createRoot(document.body).render(<Game />)
