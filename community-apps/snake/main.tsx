import { os } from '@doan-labs/duo-sdk'
import { useDisplay, useWide } from '@doan-labs/duo-uikit'
import {
  app,
  colors,
  easing,
  fonts,
  leading,
  motion,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Direction, fitLayout, newGame, nextGame, type Status } from './game.ts'
import { GameBoard } from './game-board.tsx'

const reduced = '@media (prefers-reduced-motion: reduce)'
const scorePop = stylex.keyframes({
  from: { opacity: 0.4, transform: 'translateY(6px) scale(.9)' },
  '60%': { opacity: 1, transform: 'translateY(-2px) scale(1.12)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const messageIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(14px) scale(.96)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const readyPulse = stylex.keyframes({
  from: { opacity: 0.45 },
  '50%': { opacity: 1 },
  to: { opacity: 0.45 }
})

const ARROWS: { direction: Direction; glyph: string; label: string }[] = [
  { direction: 'up', glyph: '↑', label: 'Move up' },
  { direction: 'left', glyph: '←', label: 'Move left' },
  { direction: 'down', glyph: '↓', label: 'Move down' },
  { direction: 'right', glyph: '→', label: 'Move right' }
]

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>(560)
  const [game, setGame] = useState(newGame)
  const [best, setBest] = useState(0)
  const [flash, setFlash] = useState<Direction | null>(null)
  const direction = useRef<Direction>('right')
  const steering = useRef<Direction[]>([])
  const cover = view.display === 'cover'
  const fit = fitLayout(view, 52, wide)

  const reset = () => {
    direction.current = 'right'
    steering.current = []
    setGame((current) => newGame(current.round + 1))
  }

  const steer = useCallback((next: Direction) => {
    const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }
    const last = steering.current[steering.current.length - 1] ?? direction.current
    // Pending turns apply one per tick, so quick input can no longer queue a reversal into the body.
    if (next !== last && opposites[last] !== next) {
      if (steering.current.length === 2) steering.current.shift()
      steering.current.push(next)
    }
    setFlash(next)
    setGame((current) => (current.status === 'ready' ? { ...current, status: 'playing' } : current))
  }, [])

  useEffect(() => {
    if (flash === null) return
    const timer = window.setTimeout(() => setFlash(null), 160)
    return () => window.clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    if (game.status !== 'playing') return
    const timer = window.setInterval(() => {
      setGame((current) => {
        const turn = steering.current.shift()
        if (turn) direction.current = turn
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

  const hint = getHint(game.status, cover)

  return (
    <main ref={rootRef} {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <div {...stylex.props(styles.brandRow)}>
            <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
            <span {...stylex.props(styles.session)}>NIGHT RUN</span>
          </div>
          <h1 {...stylex.props(styles.title)}>Snake</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.score)}>
            <span {...stylex.props(styles.scoreLabel)}>SCORE</span>
            <strong
              key={game.score}
              {...stylex.props(styles.scoreValue, styles.scoreAccent, game.score > 0 && styles.scoreAnimated)}
            >
              {game.score}
            </strong>
          </div>
          <div {...stylex.props(styles.score)}>
            <span {...stylex.props(styles.scoreLabel)}>BEST</span>
            <strong key={best} {...stylex.props(styles.scoreValue, best > 0 && styles.scoreAnimated)}>
              {best}
            </strong>
          </div>
        </div>
      </header>
      <p {...stylex.props(styles.hint, game.status === 'over' && styles.hintOver)}>
        {game.status === 'ready' && <span {...stylex.props(styles.hintDot)} />}
        {hint}
      </p>
      <div {...stylex.props(styles.stage, wide && styles.stageWide)}>
        <GameBoard game={game} size={fit.board} onSteer={steer} />
        <aside
          {...stylex.props(
            styles.rail,
            cover && styles.railCover,
            wide && [styles.railPanel, styles.fitRail(fit.rail)]
          )}
        >
          <div
            role="group"
            {...stylex.props(
              styles.controls,
              styles.fitControls(fit.control),
              game.status === 'ready' && styles.controlsReady
            )}
            aria-label="Move controls"
          >
            {ARROWS.map((arrow) => (
              <button
                key={arrow.direction}
                type="button"
                aria-label={arrow.label}
                onClick={() => steer(arrow.direction)}
                {...stylex.props(
                  styles.arrow,
                  styles.fitArrow(fit.control),
                  arrow.direction === 'up' && styles.up,
                  flash === arrow.direction && styles.arrowFlash
                )}
              >
                {arrow.glyph}
              </button>
            ))}
          </div>
          <button type="button" onClick={reset} {...stylex.props(styles.newGame)}>
            New run
          </button>
        </aside>
      </div>
      {game.status === 'over' && (
        <section {...stylex.props(styles.message)}>
          <div {...stylex.props(styles.messageCopy)}>
            <span {...stylex.props(styles.messageKicker)}>RUN COMPLETE</span>
            <strong {...stylex.props(styles.messageScore)}>Score {game.score}</strong>
            {game.score > 0 && game.score >= best && <span {...stylex.props(styles.messageBest)}>NEW BEST</span>}
          </div>
          <button type="button" onClick={reset} {...stylex.props(styles.continue)}>
            Try again
          </button>
        </section>
      )}
    </main>
  )
}

function getHint(status: Status, cover: boolean) {
  if (status === 'ready') return cover ? 'Swipe or tap an arrow to begin' : 'Use the arrows, swipe, or your keyboard'
  if (status === 'over') return 'The path ended. Start a fresh run.'
  return 'Keep the line clean. Follow the glow.'
}

const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingBlock: 14,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  cover: { paddingBlock: 10, paddingInline: space.lg, gap: space.xs },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, flexShrink: 0 },
  brandRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: weight.bold, letterSpacing: 1.5 },
  session: { color: colors.grey, fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.2 },
  title: {
    marginBlock: 0,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.title1
  },
  scores: { display: 'flex', gap: space.xs },
  score: {
    minWidth: 56,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: radius.lg,
    color: colors.grey3,
    backgroundColor: app.fill3,
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 1.2
  },
  scoreLabel: { letterSpacing: 1.2 },
  scoreValue: {
    display: 'block',
    marginBlockStart: space.xxs,
    color: colors.white,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums'
  },
  scoreAccent: { color: colors.greenDark },
  scoreAnimated: {
    animationName: { default: scorePop, [reduced]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    marginBlock: 0,
    color: colors.grey3,
    fontSize: typeScale.caption1,
    flexShrink: 0
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: radius.circle,
    backgroundColor: colors.greenDark,
    animationName: { default: readyPulse, [reduced]: 'none' },
    animationDuration: '1.4s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  hintOver: { color: colors.orange },
  stage: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm
  },
  stageWide: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  rail: {
    display: 'flex',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    flexShrink: 0
  },
  // The cover screen's bottom-right corner mask eats into the corner; pull the pad clear of it.
  railCover: { paddingInlineEnd: space.lg, marginBlockEnd: space.xs },
  railPanel: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: space.md,
    paddingBlock: space.md,
    paddingInline: space.md,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: radius.xl,
    backgroundColor: app.fill3,
    boxShadow: shadow.float
  },
  fitRail: (width: number) => ({ width: `${width}px` }),
  controls: { display: 'grid', justifyContent: 'center', gap: space.xs, flexShrink: 0 },
  controlsReady: {
    animationName: { default: readyPulse, [reduced]: 'none' },
    animationDuration: '1.4s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  fitControls: (size: number) => ({
    gridTemplateColumns: `repeat(3, ${size}px)`,
    gridTemplateRows: `repeat(2, ${size}px)`
  }),
  arrow: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: radius.md,
    color: colors.white,
    backgroundColor: { default: app.fill, ':hover': app.fill3 },
    fontSize: 23,
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    gridRow: 2,
    transitionProperty: 'transform, background-color, border-color, color',
    transitionDuration: `.15s, .18s, .18s, .18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.greenDark}`, outlineOffset: 3 }
  },
  arrowFlash: {
    color: colors.grey6Dark,
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark
  },
  fitArrow: (size: number) => ({ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(16, size * 0.6)}px` }),
  up: { gridColumn: 2, gridRow: 1 },
  newGame: {
    alignSelf: 'center',
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.lg,
    color: colors.grey6Dark,
    backgroundColor: { default: colors.greenDark, ':hover': colors.green },
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .18s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  message: {
    position: 'absolute',
    insetInline: space.lg,
    // The home bar owns the bottom 22 px; the card floats clear of it.
    bottom: space.xxxl,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: space.md,
    paddingInline: space.lg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: radius.xl,
    color: colors.white,
    backgroundColor: colors.grey5Dark,
    boxShadow: shadow.float,
    animationName: { default: messageIn, [reduced]: 'none' },
    animationDuration: '.26s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  messageCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  messageKicker: { color: colors.orange, fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.2 },
  messageScore: { fontSize: typeScale.headline, fontWeight: weight.bold, letterSpacing: tracking.headline },
  messageBest: { color: colors.yellow, fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.2 },
  continue: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.md,
    color: colors.grey6Dark,
    backgroundColor: { default: colors.orange, ':hover': colors.yellow },
    fontWeight: weight.bold,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .18s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  }
})

await os.connect()
createRoot(document.body).render(<Game />)
