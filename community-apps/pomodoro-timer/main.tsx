import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { app, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Mode = 'focus' | 'break'
const motion = '@media (prefers-reduced-motion: reduce)'
const cardIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(.98)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const modeIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(-4px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
})

const DURATIONS: Record<Mode, number> = { focus: 25 * 60, break: 5 * 60 }

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0')
}

function Timer() {
  const view = useDisplay()
  const cover = view.display === 'cover'
  const [mode, setMode] = useState<Mode>('focus')
  const [seconds, setSeconds] = useState(DURATIONS.focus)
  const [running, setRunning] = useState(false)
  const total = DURATIONS[mode]

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current > 1) return current - 1
        setMode((currentMode) => (currentMode === 'focus' ? 'break' : 'focus'))
        return DURATIONS[mode === 'focus' ? 'break' : 'focus']
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode, running])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const reset = () => {
    setRunning(false)
    setSeconds(DURATIONS[mode])
  }

  const skip = () => {
    const nextMode = mode === 'focus' ? 'break' : 'focus'
    setMode(nextMode)
    setSeconds(DURATIONS[nextMode])
    setRunning(false)
  }

  const progress = ((total - seconds) / total) * 100

  return (
    <main data-display={view.display} {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO FOCUS</span>
          <h1 {...stylex.props(styles.title)}>Pomodoro</h1>
        </div>
        <span key={mode} {...stylex.props(styles.mode)}>
          {mode === 'focus' ? 'FOCUS' : 'BREAK'}
        </span>
      </header>
      <section {...stylex.props(styles.timerCard)}>
        <span {...stylex.props(styles.phase)}>{mode === 'focus' ? 'Deep work' : 'Reset break'}</span>
        <strong {...stylex.props(styles.time)}>{formatTime(seconds)}</strong>
        <div
          role="progressbar"
          aria-label="Timer progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={total - seconds}
          {...stylex.props(styles.timeline)}
        >
          <div {...stylex.props(styles.timelineFill(progress))} />
        </div>
        <span {...stylex.props(styles.caption)}>{running ? 'Stay with the task' : 'Ready when you are'}</span>
      </section>
      <div role="group" aria-label="Timer controls" {...stylex.props(styles.controls)}>
        <button type="button" onClick={() => setRunning((current) => !current)} {...stylex.props(styles.primary)}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={reset} {...stylex.props(styles.secondary)}>
          Reset
        </button>
        <button type="button" onClick={skip} {...stylex.props(styles.secondary)}>
          Skip
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
    gap: 12,
    paddingBlock: 18,
    paddingInline: 22,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    fontFamily: fonts.system
  },
  cover: { gap: 7, paddingBlock: 10, paddingInline: 12 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexShrink: 0 },
  kicker: { color: colors.orange, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 34, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1 },
  mode: {
    color: colors.grey3,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.2,
    animationName: { default: modeIn, [motion]: 'none' },
    animationDuration: '.18s',
    animationTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    animationFillMode: 'both'
  },
  timerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    padding: 18,
    backgroundColor: app.fill3,
    animationName: { default: cardIn, [motion]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    animationFillMode: 'both'
  },
  phase: { color: colors.orange, fontSize: 12, fontWeight: 700, letterSpacing: 1 },
  time: { fontSize: 88, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums', letterSpacing: -3 },
  timeline: { width: '100%', height: 18, overflow: 'hidden', borderRadius: 999, backgroundColor: app.fill },
  timelineFill: (progress: number) => ({
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.orange,
    transformOrigin: 'left center',
    transform: 'scaleX(' + String(progress / 100) + ')',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.35s, .2s',
    transitionTimingFunction: 'cubic-bezier(.23, 1, .32, 1)'
  }),
  caption: { color: colors.grey3, fontSize: 12 },
  controls: { display: 'flex', justifyContent: 'center', gap: 8, flexShrink: 0 },
  primary: {
    minWidth: 92,
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 10,
    paddingInline: 18,
    color: colors.grey6Dark,
    backgroundColor: colors.orange,
    fontWeight: 800,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
  },
  secondary: {
    minWidth: 72,
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 10,
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
createRoot(document.body).render(<Timer />)
