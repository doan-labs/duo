import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { app, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Direction, fitLayout, newGame, nextGame, type Status } from './game.ts'
import { GameBoard } from './game-board.tsx'

const motion = '@media (prefers-reduced-motion: reduce)'
const easeOut = 'cubic-bezier(.23, 1, .32, 1)'
const scorePop = stylex.keyframes({
  from: { opacity: 0.55, transform: 'translateY(3px) scale(.92)' },
  '70%': { opacity: 1, transform: 'translateY(-1px) scale(1.06)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const messageIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(.98)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})

function Game() {
  const view = useDisplay()
  const [game, setGame] = useState(newGame)
  const [best, setBest] = useState(0)
  const direction = useRef<Direction>('right')
  const cover = view.display === 'cover'
  const fit = fitLayout(view, 50)

  const reset = () => {
    direction.current = 'right'
    setGame((current) => newGame(current.round + 1))
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

  const hint = getHint(game.status, cover)

  return (
    <main {...stylex.props(styles.root, cover && styles.cover)}>
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
            <span>SCORE</span>
            <strong key={game.score} {...stylex.props(styles.scoreValue, game.score > 0 && styles.scoreAnimated)}>
              {game.score}
            </strong>
          </div>
          <div {...stylex.props(styles.score)}>
            <span>BEST</span>
            <strong key={best} {...stylex.props(styles.scoreValue, best > 0 && styles.scoreAnimated)}>
              {best}
            </strong>
          </div>
        </div>
      </header>
      <p {...stylex.props(styles.hint, game.status === 'over' && styles.hintOver)}>{hint}</p>
      <GameBoard game={game} size={fit.board} onSteer={steer} />
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
        New run
      </button>
      {game.status === 'over' && (
        <section {...stylex.props(styles.message)}>
          <div {...stylex.props(styles.messageCopy)}>
            <span {...stylex.props(styles.messageKicker)}>RUN COMPLETE</span>
            <strong>Score {game.score}</strong>
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
    gap: 8,
    paddingBlock: 14,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    fontFamily: fonts.system,
    fontSize: 14
  },
  cover: { paddingBlock: 10, paddingInline: 10, gap: 6 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexShrink: 0 },
  brandRow: { display: 'flex', alignItems: 'center', gap: 8 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  session: { color: colors.grey, fontSize: 8, fontWeight: 700, letterSpacing: 1.2 },
  title: { marginBlock: 0, fontSize: 38, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1.2 },
  scores: { display: 'flex', gap: 6 },
  score: {
    minWidth: 54,
    paddingBlock: 6,
    paddingInline: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: 10,
    color: colors.grey3,
    backgroundColor: app.fill3,
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 1
  },
  scoreValue: {
    display: 'block',
    marginBlockStart: 2,
    color: colors.white,
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums'
  },
  scoreAnimated: {
    animationName: { default: scorePop, [motion]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easeOut,
    animationFillMode: 'both'
  },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: 12, flexShrink: 0 },
  hintOver: { color: colors.orange },
  controls: { display: 'grid', justifyContent: 'center', gap: 6, flexShrink: 0 },
  fitControls: (size: number) => ({
    gridTemplateColumns: `repeat(3, ${size}px)`,
    gridTemplateRows: `repeat(2, ${size}px)`
  }),
  arrow: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: 13,
    color: colors.white,
    backgroundColor: { default: app.fill, ':hover': app.fill3 },
    fontSize: 23,
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    gridRow: 2,
    transitionProperty: 'transform, background-color, border-color',
    transitionDuration: '.14s, .18s, .18s',
    transitionTimingFunction: easeOut,
    transform: { default: 'scale(1)', ':active': 'scale(.94)' },
    ':focus-visible': { outline: `2px solid ${colors.greenDark}`, outlineOffset: 3 }
  },
  fitArrow: (size: number) => ({ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(16, size * 0.6)}px` }),
  up: { gridColumn: 2, gridRow: 1 },
  newGame: {
    alignSelf: 'center',
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 9,
    paddingInline: 18,
    color: colors.grey6Dark,
    backgroundColor: { default: colors.greenDark, ':hover': colors.green },
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transitionTimingFunction: easeOut,
    transform: { default: 'scale(1)', ':active': 'scale(.96)' },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
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
    paddingBlock: 11,
    paddingInline: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: 14,
    color: colors.white,
    backgroundColor: colors.grey5Dark,
    animationName: { default: messageIn, [motion]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easeOut,
    animationFillMode: 'both'
  },
  messageCopy: { display: 'flex', flexDirection: 'column', gap: 2 },
  messageKicker: { color: colors.orange, fontSize: 8, fontWeight: 700, letterSpacing: 1.2 },
  continue: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 7,
    paddingInline: 11,
    color: colors.grey6Dark,
    backgroundColor: { default: colors.orange, ':hover': colors.yellow },
    fontWeight: 800,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transitionTimingFunction: easeOut,
    transform: { default: 'scale(1)', ':active': 'scale(.96)' },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  }
})

await os.connect()
createRoot(document.body).render(<Game />)
