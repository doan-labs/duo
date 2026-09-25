import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { styles } from './styles.ts'
import {
  adoptTimer,
  DURATIONS,
  formatTime,
  freshTimer,
  pauseTimer,
  resetTimer,
  rolloverTimer,
  type SavedTimer,
  secondsLeft,
  serializeTimer,
  skipTimer,
  startTimer,
  type TimerState
} from './timer.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled timer - adopting it unconditionally is what converges the two
// displays when the fold hands the countdown over.
const ME = crypto.randomUUID()

function Timer() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const [timer, setTimer] = useState<TimerState>(freshTimer)
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef(timer)
  stateRef.current = timer
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)

  const saved = useKV(os.session, 'timer')

  const publish = useCallback((next: TimerState) => saved.set(JSON.stringify(serializeTimer(ME, next))), [saved])

  const apply = useCallback(
    (next: TimerState) => {
      setTimer(next)
      publish(next)
    },
    [publish]
  )

  // Why adopt on the session key: the fold carries the running timer to the
  // other display. A write this copy did not make is the new settled state;
  // own writes are already on screen and are ignored. The raw string is the
  // guard: the effect body must not re-fire on every render of a remote value
  // already adopted, or the setTimer below loops forever.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current) {
        seeded.current = true
        publish(stateRef.current)
      }
      return
    }
    const next = JSON.parse(raw) as SavedTimer
    if (next.by === ME) return
    const at = Date.now()
    setNow(at)
    setTimer(adoptTimer(next, at))
  }, [saved.value, saved.status, publish])

  const seconds = secondsLeft(timer, now)

  // Why a derived rollover: `endAt` is the single source of truth, so the
  // phase flip is one deterministic state transition computed in an effect
  // instead of a `setMode` hidden inside a `setSeconds` updater, which read a
  // stale mode and ran twice under StrictMode.
  useEffect(() => {
    if (!timer.running || seconds > 0) return
    apply(rolloverTimer(timer, Date.now()))
  }, [seconds, timer, apply])

  // The interval only re-renders; it never owns the countdown. Both displays
  // compute the same remaining seconds from the same `endAt`.
  useEffect(() => {
    if (!timer.running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timer.running])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const startPause = () => {
    const at = Date.now()
    setNow(at)
    apply(timer.running ? pauseTimer(timer, at) : startTimer(timer, at))
  }
  const reset = () => apply(resetTimer(timer))
  const skip = () => apply(skipTimer(timer))

  const total = DURATIONS[timer.mode]
  const progress = ((total - seconds) / total) * 100
  const focus = timer.mode === 'focus'
  const paused = !timer.running && seconds < total

  return (
    <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO FOCUS</span>
          <h1 {...stylex.props(styles.title)}>Pomodoro</h1>
        </div>
        <span key={timer.mode} {...stylex.props(styles.mode)}>
          {focus ? 'FOCUS' : 'BREAK'}
        </span>
      </header>
      <section {...stylex.props(styles.stage, wide && styles.stageWide)}>
        <div {...stylex.props(styles.timerCard)}>
          <span {...stylex.props(styles.phase)}>{focus ? 'Deep work' : 'Reset break'}</span>
          <strong {...stylex.props(styles.time, wide && styles.timeWide)}>{formatTime(seconds)}</strong>
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
          <span {...stylex.props(styles.caption)}>
            {timer.running ? 'Stay with the task' : paused ? 'Paused' : 'Ready when you are'}
          </span>
        </div>
        <aside {...stylex.props(styles.rail)}>
          <div role="group" aria-label="Timer controls" {...stylex.props(styles.controls, wide && styles.controlsWide)}>
            <button type="button" onClick={startPause} {...stylex.props(styles.primary)}>
              {timer.running ? 'Pause' : 'Start'}
            </button>
            <div {...stylex.props(styles.actions)}>
              <button type="button" onClick={reset} {...stylex.props(styles.secondary, wide && styles.actionWide)}>
                Reset
              </button>
              <button type="button" onClick={skip} {...stylex.props(styles.secondary, wide && styles.actionWide)}>
                Skip
              </button>
            </div>
          </div>
          <p {...stylex.props(styles.hint, !timer.running && !paused && styles.hintPulse)}>
            {wide ? 'Fold mid-block, the countdown follows' : 'Fold to keep counting'}
          </p>
        </aside>
      </section>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Timer />)
