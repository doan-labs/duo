import { app, colors, easing, radius, shadow, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'
import { DuoLogo } from './duo-logo.tsx'
import { BOARD_SIZE, type Direction, type Game, getBoardMetrics, pointKey } from './game.ts'

const reduced = '@media (prefers-reduced-motion: reduce)'
const boardIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(10px) scale(.97)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const deathShake = stylex.keyframes({
  from: { transform: 'translateX(0)' },
  '20%': { transform: 'translateX(-7px)' },
  '40%': { transform: 'translateX(6px)' },
  '60%': { transform: 'translateX(-4px)' },
  '80%': { transform: 'translateX(2px)' },
  to: { transform: 'translateX(0)' }
})
const deathFlash = stylex.keyframes({
  from: { opacity: 0 },
  '30%': { opacity: 0.3 },
  to: { opacity: 0 }
})
const foodPulse = stylex.keyframes({
  from: { transform: 'scale(.84)' },
  '50%': { transform: 'scale(1.12)' },
  to: { transform: 'scale(.84)' }
})
const foodRipple = stylex.keyframes({
  from: { opacity: 0.55, transform: 'scale(.55)' },
  to: { opacity: 0, transform: 'scale(2.1)' }
})
const foodEnter = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.55)' },
  '70%': { opacity: 1, transform: 'scale(1.08)' },
  to: { opacity: 1, transform: 'scale(1)' }
})
const eatRing = stylex.keyframes({
  from: { opacity: 0.9, transform: 'scale(.45)' },
  to: { opacity: 0, transform: 'scale(2)' }
})
const eatFloat = stylex.keyframes({
  from: { opacity: 0, transform: 'translateX(-50%) translateY(2px) scale(.8)' },
  '30%': { opacity: 1, transform: 'translateX(-50%) translateY(-7px) scale(1.08)' },
  to: { opacity: 0, transform: 'translateX(-50%) translateY(-20px) scale(1)' }
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
  const food = pointKey(game.food)
  const metrics = getBoardMetrics(size)
  const over = game.status === 'over'

  return (
    <div
      aria-label="Snake board"
      role="grid"
      {...stylex.props(
        styles.board,
        styles.fitBoard(size),
        game.status === 'ready' && styles.boardReady,
        over && styles.boardOver
      )}
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
            {...stylex.props(styles.cell, key === food && styles.cellFood)}
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
                styles.segmentMove(metrics, point, index),
                styles.segmentSkin(metrics),
                styles.segmentFade(index)
              )}
            />
          )
        )}
        <div
          key={`${game.round}-${game.food.x}-${game.food.y}-${game.eatTick}`}
          {...stylex.props(styles.food, styles.segmentSize(metrics), styles.foodPosition(metrics, game.food))}
        >
          <span {...stylex.props(styles.foodRip)} />
          <span {...stylex.props(styles.foodOrb)} />
          <span {...stylex.props(styles.foodCore)} />
        </div>
        {game.eatTick > 0 && (
          <div
            key={`${game.round}-meal-${game.eatTick}`}
            {...stylex.props(styles.burst, styles.segmentSize(metrics), styles.foodPosition(metrics, game.lastMeal))}
          >
            <span {...stylex.props(styles.burstRing)} />
            <span {...stylex.props(styles.burstScore)}>+1</span>
          </div>
        )}
      </div>
      {over && <div aria-hidden="true" {...stylex.props(styles.flash)} />}
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
    borderRadius: radius.xl,
    backgroundColor: colors.grey5Dark,
    boxShadow: shadow.float,
    overflow: 'hidden',
    flexShrink: 0,
    animationName: { default: boardIn, [reduced]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both',
    touchAction: 'none'
  },
  boardReady: { borderColor: colors.greenDark },
  boardOver: {
    animationName: { default: deathShake, [reduced]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.out,
    animationIterationCount: 1
  },
  fitBoard: (size: number) => ({
    width: `${size}px`,
    height: `${size}px`,
    alignSelf: 'center',
    padding: `${getBoardMetrics(size).padding}px`,
    gap: `${getBoardMetrics(size).gap}px`
  }),
  cell: {
    borderRadius: radius.xs,
    backgroundColor: app.fill3,
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    opacity: 0.5
  },
  cellFood: { opacity: 0.95 },
  playfield: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  segment: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    transitionProperty: 'transform, opacity',
    transitionDuration: { default: '.14s, .18s', [reduced]: '0s, .18s' },
    transitionTimingFunction: easing.pop,
    willChange: 'transform'
  },
  segmentSize: (metrics) => ({ width: `${metrics.cell + metrics.gap}px`, height: `${metrics.cell + metrics.gap}px` }),
  // The tail tapers, so the translate and the scale have to share one transform.
  segmentMove: (metrics, point, index: number) => ({
    transform: `translate(${metrics.padding - metrics.gap * 0.5 + point.x * (metrics.cell + metrics.gap)}px, ${metrics.padding - metrics.gap * 0.5 + point.y * (metrics.cell + metrics.gap)}px) scale(${Math.max(0.7, 1 - index * 0.025)})`
  }),
  segmentSkin: (metrics) => ({
    borderRadius: `${Math.round((metrics.cell + metrics.gap) * 0.34)}px`,
    backgroundColor: colors.green
  }),
  segmentFade: (index: number) => ({ opacity: Math.max(0.55, 1 - index * 0.04) }),
  food: {
    position: 'absolute',
    zIndex: 3,
    overflow: 'visible'
  },
  // The pulse keyframes animate transform, so the dot positions with left/top rather than translate.
  foodPosition: (metrics, point) => ({
    left: `${metrics.padding - metrics.gap * 0.5 + point.x * (metrics.cell + metrics.gap)}px`,
    top: `${metrics.padding - metrics.gap * 0.5 + point.y * (metrics.cell + metrics.gap)}px`
  }),
  foodRip: {
    position: 'absolute',
    inset: 0,
    borderRadius: radius.circle,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.orange,
    animationName: { default: foodRipple, [reduced]: 'none' },
    animationDuration: '1.5s',
    animationTimingFunction: easing.out,
    animationIterationCount: 'infinite'
  },
  foodOrb: {
    position: 'absolute',
    inset: 0,
    borderRadius: radius.circle,
    backgroundColor: colors.orange,
    animationName: { default: foodPulse, [reduced]: 'none' },
    animationDuration: '1.5s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  foodCore: {
    position: 'absolute',
    left: '34%',
    top: '34%',
    width: '32%',
    height: '32%',
    borderRadius: radius.circle,
    backgroundColor: colors.yellow,
    animationName: { default: foodEnter, [reduced]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  burst: {
    position: 'absolute',
    zIndex: 4,
    overflow: 'visible'
  },
  burstRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.yellow,
    // Hidden at rest; the eat animation reveals then re-hides it. Without a base
    // opacity, reduced-motion (which skips the animation) leaves it painted forever.
    opacity: 0,
    animationName: { default: eatRing, [reduced]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  burstScore: {
    position: 'absolute',
    left: '50%',
    top: 0,
    color: colors.yellow,
    opacity: 0,
    fontSize: typeScale.caption1,
    fontWeight: weight.bold,
    textShadow: shadow.text,
    animationName: { default: eatFloat, [reduced]: 'none' },
    animationDuration: '.55s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  flash: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundColor: colors.redDark,
    // Hidden at rest for the same reason as the burst: reduced-motion never runs
    // deathFlash, so this element would otherwise sit as a solid red block.
    opacity: 0,
    animationName: { default: deathFlash, [reduced]: 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  }
})
