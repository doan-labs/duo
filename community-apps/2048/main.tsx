import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Direction = 'left' | 'right' | 'up' | 'down'
type GameStatus = 'playing' | 'won' | 'over'
type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

const SIZE = 4
const CELL_COUNT = SIZE * SIZE

const emptyBoard = () => Array.from({ length: CELL_COUNT }, () => 0)

function addRandomTile(board: number[]) {
  const empty = board.flatMap((value, index) => (value === 0 ? [index] : []))
  if (!empty.length) return board
  const next = [...board]
  const index = empty[Math.floor(Math.random() * empty.length)]!
  next[index] = Math.random() < 0.9 ? 2 : 4
  return next
}

function newGame() {
  return addRandomTile(addRandomTile(emptyBoard()))
}

function slide(line: number[]) {
  const compact = line.filter(Boolean)
  const result: number[] = []
  let score = 0
  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const merged = compact[index]! * 2
      result.push(merged)
      score += merged
      index += 1
    } else {
      result.push(compact[index]!)
    }
  }
  while (result.length < SIZE) result.push(0)
  return { line: result, score }
}

function move(board: number[], direction: Direction) {
  const next = emptyBoard()
  let score = 0
  let moved = false

  for (let lineIndex = 0; lineIndex < SIZE; lineIndex += 1) {
    const indexes =
      direction === 'left'
        ? Array.from({ length: SIZE }, (_, offset) => lineIndex * SIZE + offset)
        : direction === 'right'
          ? Array.from({ length: SIZE }, (_, offset) => lineIndex * SIZE + SIZE - 1 - offset)
          : direction === 'up'
            ? Array.from({ length: SIZE }, (_, offset) => offset * SIZE + lineIndex)
            : Array.from({ length: SIZE }, (_, offset) => (SIZE - 1 - offset) * SIZE + lineIndex)
    const source = indexes.map((index) => board[index]!)
    const result = slide(source)
    score += result.score
    result.line.forEach((value, offset) => {
      next[indexes[offset]!] = value
    })
    if (source.some((value, index) => value !== result.line[index])) moved = true
  }

  if (!moved) return { board, score: 0, moved: false }
  return { board: addRandomTile(next), score, moved: true }
}

function hasMoves(board: number[]) {
  if (board.some((value) => value === 0)) return true
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const index = row * SIZE + column
      if (column < SIZE - 1 && board[index] === board[index + 1]) return true
      if (row < SIZE - 1 && board[index] === board[index + SIZE]) return true
    }
  }
  return false
}

function fitLayout(view: ViewDimensions, headerHeight: number) {
  const cover = view.display === 'cover'
  const padding = cover ? 10 : 14
  const gap = cover ? 6 : 8
  const control = 32
  const fixedHeight = padding * 2 + headerHeight + 22 + control * 2 + 6 + 36 + gap * 4
  const width = view.width || 740
  const height = view.height || 480
  return {
    board: Math.max(0, Math.floor(Math.min(width - padding * 2, height - fixedHeight))),
    control
  }
}

function Board({ board, size, onMove }: { board: number[]; size: number; onMove: (direction: Direction) => void }) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  return (
    <div
      aria-label="2048 board"
      role="grid"
      {...stylex.props(styles.board, styles.fitBoard(size))}
      onTouchStart={(event) => {
        const touch = event.touches[0]
        if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0]
        const start = touchStart.current
        touchStart.current = null
        if (!touch || !start) return
        const x = touch.clientX - start.x
        const y = touch.clientY - start.y
        if (Math.max(Math.abs(x), Math.abs(y)) < 24) return
        onMove(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up')
      }}
    >
      {board.map((value, index) => {
        const row = Math.floor(index / SIZE)
        const column = index % SIZE
        return (
          <div
            key={`${row}-${column}`}
            aria-label={value ? `${value} tile` : 'Empty tile'}
            role="gridcell"
            tabIndex={-1}
            {...stylex.props(styles.tile, tileStyle(value), value >= 1000 && styles.compact)}
          >
            {value || ''}
          </div>
        )
      })}
    </div>
  )
}

function Game() {
  const view = useDisplay()
  const [board, setBoard] = useState(newGame)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [status, setStatus] = useState<GameStatus>('playing')
  const cover = view.display === 'cover'
  const fit = fitLayout(view, 48)

  const handleMove = useCallback(
    (direction: Direction) => {
      if (status === 'over') return
      const result = move(board, direction)
      if (!result.moved) {
        if (!hasMoves(board)) setStatus('over')
        return
      }
      const nextScore = score + result.score
      setBoard(result.board)
      setScore(nextScore)
      setBest((current) => Math.max(current, nextScore))
      if (result.board.includes(2048)) setStatus('won')
      else if (!hasMoves(result.board)) setStatus('over')
    },
    [board, score, status]
  )

  const reset = () => {
    setBoard(newGame())
    setScore(0)
    setStatus('playing')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const directions: Record<string, Direction> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down'
      }
      const direction = directions[event.key]
      if (!direction) return
      event.preventDefault()
      handleMove(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleMove])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  return (
    <main {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.title)}>2048</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.score)}>
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>
          <div {...stylex.props(styles.score)}>
            <span>BEST</span>
            <strong>{best}</strong>
          </div>
        </div>
      </header>
      <p {...stylex.props(styles.hint)}>{cover ? 'Swipe or tap the arrows' : 'Swipe, tap, or use your keyboard'}</p>
      <Board board={board} size={fit.board} onMove={handleMove} />
      <div role="group" {...stylex.props(styles.controls, styles.fitControls(fit.control))} aria-label="Move controls">
        <button
          type="button"
          aria-label="Move up"
          onClick={() => handleMove('up')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control), styles.up)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move left"
          onClick={() => handleMove('left')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Move down"
          onClick={() => handleMove('down')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Move right"
          onClick={() => handleMove('right')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          →
        </button>
      </div>
      <button type="button" onClick={reset} {...stylex.props(styles.newGame)}>
        New game
      </button>
      {status !== 'playing' && (
        <section {...stylex.props(styles.message)}>
          <strong>{status === 'won' ? 'You made 2048!' : 'No more moves'}</strong>
          <button
            type="button"
            onClick={status === 'won' ? () => setStatus('playing') : reset}
            {...stylex.props(styles.continue)}
          >
            {status === 'won' ? 'Keep going' : 'Try again'}
          </button>
        </section>
      )}
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
    gap: 8,
    paddingBlock: 14,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: colors.darkElevated,
    fontFamily: fonts.system,
    fontSize: 14
  },
  cover: { paddingBlock: 10, paddingInline: 10, gap: 6 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexShrink: 0 },
  kicker: { color: colors.orange, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 42, lineHeight: 0.95, fontWeight: 800, letterSpacing: -2 },
  scores: { display: 'flex', gap: 6 },
  score: {
    minWidth: 52,
    paddingBlock: 6,
    paddingInline: 8,
    borderRadius: 8,
    color: colors.grey3,
    backgroundColor: colors.fillDark,
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 1
  },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: 12, flexShrink: 0 },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
    gap: 6,
    paddingBlock: 7,
    paddingInline: 7,
    borderRadius: 14,
    backgroundColor: colors.fillDark,
    touchAction: 'none',
    overflow: 'hidden',
    flexShrink: 0
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px`, alignSelf: 'center' }),
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    borderRadius: 8,
    color: colors.white,
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1,
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0
  },
  compact: { fontSize: 18 },
  tileEmpty: { backgroundColor: colors.fillThin },
  tile2: { backgroundColor: colors.grey3, color: colors.darkElevated },
  tile4: { backgroundColor: colors.weatherSun, color: colors.darkElevated },
  tile8: { backgroundColor: colors.orange },
  tile16: { backgroundColor: colors.red },
  tile32: { backgroundColor: colors.pink },
  tile64: { backgroundColor: colors.purple },
  tile128: { backgroundColor: colors.indigo },
  tile256: { backgroundColor: colors.blue },
  tile512: { backgroundColor: colors.teal },
  tile1024: { backgroundColor: colors.green },
  tile2048: { backgroundColor: colors.yellow, color: colors.darkElevated },
  controls: { display: 'grid', justifyContent: 'center', gap: 6, flexShrink: 0 },
  fitControls: (size: number) => ({
    gridTemplateColumns: `repeat(3, ${size}px)`,
    gridTemplateRows: `repeat(2, ${size}px)`
  }),
  arrow: {
    borderWidth: 0,
    borderRadius: 12,
    color: colors.white,
    backgroundColor: colors.fillDark,
    fontSize: 23,
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    gridRow: 2
  },
  fitArrow: (size: number) => ({ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(16, size * 0.6)}px` }),
  up: { gridColumn: 2, gridRow: 1 },
  newGame: {
    alignSelf: 'center',
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 8,
    paddingInline: 16,
    color: colors.white,
    backgroundColor: colors.orange,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0
  },
  message: {
    position: 'absolute',
    insetInline: 12,
    bottom: 12,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBlock: 10,
    paddingInline: 14,
    borderRadius: 12,
    color: colors.white,
    backgroundColor: colors.fillDark
  },
  continue: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 6,
    paddingInline: 10,
    color: colors.darkElevated,
    backgroundColor: colors.yellow,
    fontWeight: 700,
    cursor: 'pointer'
  }
})

const TILE_STYLES = {
  0: styles.tileEmpty,
  2: styles.tile2,
  4: styles.tile4,
  8: styles.tile8,
  16: styles.tile16,
  32: styles.tile32,
  64: styles.tile64,
  128: styles.tile128,
  256: styles.tile256,
  512: styles.tile512,
  1024: styles.tile1024,
  2048: styles.tile2048
} as Record<number, typeof styles.tileEmpty>

function tileStyle(value: number) {
  return TILE_STYLES[value] ?? styles.tile2048
}

await os.connect()
createRoot(document.body).render(<Game />)
