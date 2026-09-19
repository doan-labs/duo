import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type Status = 'ready' | 'playing' | 'over'
type Game = { snake: Point[]; food: Point; score: number; status: Status }
type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

const BOARD_SIZE = 14
const STARTING_SNAKE: Point[] = [
  { x: 6, y: 7 },
  { x: 5, y: 7 },
  { x: 4, y: 7 }
]

const pointKey = (point: Point) => `${point.x}:${point.y}`
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

function openFood(snake: Point[]) {
  const occupied = new Set(snake.map(pointKey))
  const free: Point[] = []
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) free.push({ x, y })
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 10, y: 7 }
}

function newGame(): Game {
  return { snake: STARTING_SNAKE, food: { x: 10, y: 7 }, score: 0, status: 'ready' }
}

function nextGame(game: Game, direction: Direction): Game {
  const head = game.snake[0]!
  const nextHead = {
    x: head.x + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0),
    y: head.y + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0)
  }
  const outside = nextHead.x < 0 || nextHead.x >= BOARD_SIZE || nextHead.y < 0 || nextHead.y >= BOARD_SIZE
  const hitsBody = game.snake.slice(0, -1).some((point) => samePoint(point, nextHead))
  if (outside || hitsBody) return { ...game, status: 'over' }

  const ate = samePoint(nextHead, game.food)
  const snake = ate ? [nextHead, ...game.snake] : [nextHead, ...game.snake.slice(0, -1)]
  return {
    snake,
    food: ate ? openFood(snake) : game.food,
    score: game.score + (ate ? 1 : 0),
    status: 'playing'
  }
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

function GameBoard({ game, size }: { game: Game; size: number }) {
  const snake = new Set(game.snake.map(pointKey))
  const head = pointKey(game.snake[0]!)
  const food = pointKey(game.food)
  return (
    <div aria-label="Snake board" role="grid" {...stylex.props(styles.board, styles.fitBoard(size))}>
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
        const point = { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) }
        const key = pointKey(point)
        const isSnake = snake.has(key)
        return (
          <div
            key={key}
            aria-label={key === food ? 'Food' : isSnake ? 'Snake' : 'Empty'}
            role="gridcell"
            tabIndex={-1}
            {...stylex.props(
              styles.cell,
              isSnake && styles.snake,
              key === head && styles.head,
              key === food && styles.food
            )}
          />
        )
      })}
    </div>
  )
}

function Game() {
  const view = useDisplay()
  const [game, setGame] = useState(newGame)
  const [best, setBest] = useState(0)
  const direction = useRef<Direction>('right')
  const cover = view.display === 'cover'
  const fit = fitLayout(view, 42)

  const reset = () => {
    direction.current = 'right'
    setGame(newGame())
  }

  const steer = useCallback((next: Direction) => {
    const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }
    if (opposites[direction.current] === next) return
    direction.current = next
    setGame((current) => (current.status === 'ready' ? { ...current, status: 'playing' } : current))
  }, [])

  useEffect(() => {
    if (game.status !== 'playing') return
    const timer = window.setInterval(() => {
      setGame((current) => {
        const next = nextGame(current, direction.current)
        setBest((currentBest) => Math.max(currentBest, next.score))
        return next
      })
    }, 170)
    return () => window.clearInterval(timer)
  }, [game.status])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const directions: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right'
      }
      const next = directions[event.key]
      if (!next) return
      event.preventDefault()
      steer(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [steer])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  return (
    <main {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.title)}>Snake</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.score)}>
            <span>SCORE</span>
            <strong>{game.score}</strong>
          </div>
          <div {...stylex.props(styles.score)}>
            <span>BEST</span>
            <strong>{best}</strong>
          </div>
        </div>
      </header>
      <p {...stylex.props(styles.hint)}>
        {game.status === 'ready'
          ? cover
            ? 'Tap an arrow to start'
            : 'Press an arrow key or tap to start'
          : 'Eat the fruit. Avoid the walls.'}
      </p>
      <GameBoard game={game} size={fit.board} />
      <div role="group" {...stylex.props(styles.controls, styles.fitControls(fit.control))} aria-label="Move controls">
        <button
          type="button"
          aria-label="Move up"
          onClick={() => steer('up')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control), styles.up)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move left"
          onClick={() => steer('left')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Move down"
          onClick={() => steer('down')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Move right"
          onClick={() => steer('right')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          →
        </button>
      </div>
      <button type="button" onClick={reset} {...stylex.props(styles.newGame)}>
        New game
      </button>
      {game.status === 'over' && (
        <section {...stylex.props(styles.message)}>
          <strong>Game over</strong>
          <button type="button" onClick={reset} {...stylex.props(styles.continue)}>
            Try again
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
    backgroundColor: colors.black,
    fontFamily: fonts.system,
    fontSize: 14
  },
  cover: { paddingBlock: 10, paddingInline: 10, gap: 6 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexShrink: 0 },
  kicker: { color: colors.greenBright, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 36, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1 },
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
    gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(14, minmax(0, 1fr))',
    gap: 2,
    paddingBlock: 7,
    paddingInline: 7,
    borderRadius: 14,
    backgroundColor: colors.darkElevated2,
    aspectRatio: 1,
    overflow: 'hidden',
    flexShrink: 0
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px`, alignSelf: 'center' }),
  cell: {
    borderRadius: 3,
    backgroundColor: colors.fillThin,
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0
  },
  snake: { backgroundColor: colors.green },
  head: { borderRadius: 5, backgroundColor: colors.greenBright },
  food: { borderRadius: 999, backgroundColor: colors.orange },
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
    color: colors.black,
    backgroundColor: colors.greenBright,
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
    color: colors.black,
    backgroundColor: colors.greenBright,
    fontWeight: 700,
    cursor: 'pointer'
  }
})

await os.connect()
createRoot(document.body).render(<Game />)
