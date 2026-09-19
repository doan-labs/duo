import { app, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'
import { DuoLogo } from './duo-logo.tsx'
import { BOARD_SIZE, type Direction, type Game, getBoardMetrics, pointKey } from './game.ts'

const motion = '@media (prefers-reduced-motion: reduce)'
const easeOut = 'cubic-bezier(.23, 1, .32, 1)'
const boardIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(.985)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const foodPulse = stylex.keyframes({
  from: { opacity: 0.72, transform: 'scale(.86)' },
  '50%': { opacity: 1, transform: 'scale(1.08)' },
  to: { opacity: 0.72, transform: 'scale(.86)' }
})
const foodEnter = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.55)' },
  '70%': { opacity: 1, transform: 'scale(1.08)' },
  to: { opacity: 1, transform: 'scale(1)' }
})

export function GameBoard({
  game,
  size,
  onSteer
}: {
  game: Game
  size: number
  onSteer: (direction: Direction) => void
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const snake = new Set(game.snake.map(pointKey))
  const head = pointKey(game.snake[0]!)
  const food = pointKey(game.food)
  const metrics = getBoardMetrics(size)

  return (
    <div
      aria-label="Snake board"
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
        onSteer(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up')
      }}
    >
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
              isSnake && styles.cellOccupied,
              key === head && styles.cellHead,
              key === food && styles.cellFood
            )}
          />
        )
      })}
      <div aria-hidden="true" {...stylex.props(styles.playfield)}>
        {game.snake.map((point, index) =>
          index === 0 ? (
            <DuoLogo key={`${game.round}-duo-head`} metrics={metrics} point={point} />
          ) : (
            <div
              key={`${game.round}-${pointKey(point)}`}
              {...stylex.props(
                styles.segment,
                styles.segmentSize(metrics),
                styles.segmentPosition(metrics, point),
                styles.segmentBody,
                styles.segmentFade(index)
              )}
            />
          )
        )}
        <div
          key={`${game.round}-${game.food.x}-${game.food.y}-${game.eatTick}`}
          {...stylex.props(styles.food, styles.segmentSize(metrics), styles.segmentPosition(metrics, game.food))}
        >
          <span {...stylex.props(styles.foodCore)} />
        </div>
      </div>
    </div>
  )
}

const styles = stylex.create({
  board: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(14, minmax(0, 1fr))',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: 18,
    backgroundColor: colors.grey5Dark,
    overflow: 'hidden',
    flexShrink: 0,
    animationName: { default: boardIn, [motion]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easeOut,
    animationFillMode: 'both',
    touchAction: 'none'
  },
  fitBoard: (size: number) => ({
    width: `${size}px`,
    height: `${size}px`,
    alignSelf: 'center',
    padding: `${getBoardMetrics(size).padding}px`,
    gap: `${getBoardMetrics(size).gap}px`
  }),
  cell: {
    borderRadius: 4,
    backgroundColor: app.fill3,
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    opacity: 0.58
  },
  cellOccupied: { opacity: 0.78 },
  cellHead: { backgroundColor: app.fill, opacity: 0.9 },
  cellFood: { backgroundColor: app.fill, opacity: 0.9 },
  playfield: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  segment: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: 9,
    transitionProperty: 'transform, opacity',
    transitionDuration: { default: '.14s, .18s', [motion]: '0s, .18s' },
    transitionTimingFunction: easeOut,
    willChange: 'transform'
  },
  segmentSize: (metrics) => ({ width: `${metrics.cell + metrics.gap}px`, height: `${metrics.cell + metrics.gap}px` }),
  segmentPosition: (metrics, point) => ({
    transform: `translate(${metrics.padding - metrics.gap * 0.5 + point.x * (metrics.cell + metrics.gap)}px, ${metrics.padding - metrics.gap * 0.5 + point.y * (metrics.cell + metrics.gap)}px)`
  }),
  segmentBody: { backgroundColor: colors.green },
  segmentFade: (index: number) => ({ opacity: Math.max(0.56, 1 - index * 0.035) }),
  food: {
    position: 'absolute',
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.orange,
    animationName: { default: foodPulse, [motion]: 'none' },
    animationDuration: '1.7s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite'
  },
  foodCore: {
    width: '32%',
    height: '32%',
    borderRadius: 999,
    backgroundColor: colors.yellow,
    animationName: { default: foodEnter, [motion]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easeOut,
    animationFillMode: 'both'
  }
})
