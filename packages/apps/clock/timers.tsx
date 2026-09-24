// Timers: running timers are ring cards; the picker is three drums and a big
// Start button. Recents relaunch a duration with one tap, like iOS.

import { Sym, TextField } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { ClockSheet } from './sheet.tsx'
import { SOUNDS, type Timer, timerRemaining, uid, useNow, useRecents, useTimers } from './store.ts'
import { styles } from './styles.ts'
import { countdownText, durationName } from './time.ts'
import { Wheel } from './wheel.tsx'

export const Timers = ({ narrow }: { narrow: boolean }) => {
  const timers = useTimers()
  const recents = useRecents()
  const running = timers.value.length > 0
  const [picking, setPicking] = useState(false)
  const now = useNow(10, running)

  const startTimer = (seconds: number, label = 'Timer', sound = 'Radar') => {
    if (!seconds) return
    timers.set([
      ...timers.value,
      { id: uid(), seconds, label, sound, endsAt: Date.now() + seconds * 1000, remaining: seconds * 1000 }
    ])
    recents.set([seconds, ...recents.value.filter((s) => s !== seconds)].slice(0, 6))
    setPicking(false)
  }

  const pause = (t: Timer) =>
    timers.set(timers.value.map((x) => (x.id === t.id ? { ...x, endsAt: null, remaining: timerRemaining(x, now) } : x)))
  const resume = (t: Timer) =>
    timers.set(timers.value.map((x) => (x.id === t.id ? { ...x, endsAt: now + x.remaining } : x)))
  const cancel = (t: Timer) => timers.set(timers.value.filter((x) => x.id !== t.id))

  return (
    <>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.title)}>Timers</div>
        {running && (
          <div {...stylex.props(styles.actions)}>
            <button
              type="button"
              aria-label="New timer"
              onClick={() => setPicking(true)}
              {...stylex.props(styles.round, shared.press)}
            >
              <Sym name="plus" size={15} />
            </button>
          </div>
        )}
      </div>
      <div {...stylex.props(styles.body, narrow && styles.bodyNarrow)}>
        {running && (
          <div {...stylex.props(styles.timerGrid)}>
            {timers.value.map((t) => (
              <TimerCard key={t.id} timer={t} now={now} pause={pause} resume={resume} cancel={cancel} />
            ))}
          </div>
        )}
        {!running && <Picker onStart={startTimer} />}
        {running && recents.value.length > 0 && (
          <>
            <div {...stylex.props(styles.sectionHead)}>Recents</div>
            <div {...stylex.props(styles.list)}>
              {recents.value.map((s, i) => (
                <div key={s} {...stylex.props(styles.row, i === recents.value.length - 1 && styles.rowLast)}>
                  <div {...stylex.props(styles.city)}>{durationName(s)}</div>
                  <button
                    type="button"
                    aria-label={`Start ${durationName(s)} timer`}
                    onClick={() => startTimer(s)}
                    {...stylex.props(styles.recentPlay, shared.press)}
                  >
                    <PlayGlyph />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ClockSheet open={picking} title="New Timer" onClose={() => setPicking(false)} wide>
        <Picker onStart={startTimer} />
      </ClockSheet>
    </>
  )
}

/** A play triangle as a plain path: there is no play SF Symbol in the set. */
const PlayGlyph = () => (
  <svg aria-hidden="true" width={13} height={13} viewBox="0 0 13 13">
    <path d="M3 1.8v9.4a.6.6 0 0 0 .92.5l7.2-4.7a.6.6 0 0 0 0-1L3.92 1.3a.6.6 0 0 0-.92.5z" fill="currentColor" />
  </svg>
)

const Ring = ({ timer, now, size }: { timer: Timer; now: number; size: number }) => {
  const left = timerRemaining(timer, now)
  const total = timer.seconds * 1000
  const frac = total ? left / total : 0
  const r = size / 2 - 7
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} role="img" aria-label={`Timer ${countdownText(left)}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={appAppearance.clockRingTrack} strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.orange}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} fill={colors.white} fontSize={22} textAnchor="middle" dominantBaseline="central">
        {countdownText(left)}
      </text>
    </svg>
  )
}

const TimerCard = ({
  timer,
  now,
  pause,
  resume,
  cancel
}: {
  timer: Timer
  now: number
  pause: (t: Timer) => void
  resume: (t: Timer) => void
  cancel: (t: Timer) => void
}) => {
  const running = timer.endsAt !== null
  return (
    <div {...stylex.props(styles.timerCard, animations.pop)}>
      <div {...stylex.props(styles.timerLabel)}>{timer.label === 'Timer' ? 'Timer' : timer.label}</div>
      <Ring timer={timer} now={now} size={128} />
      <div {...stylex.props(styles.timerBtns)}>
        <button type="button" onClick={() => cancel(timer)} {...stylex.props(styles.timerBtn, shared.press)}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => (running ? pause(timer) : resume(timer))}
          {...stylex.props(styles.timerBtn, styles.timerPause, shared.press)}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  )
}

const Picker = ({ onStart }: { onStart: (s: number, label: string, sound: string) => void }) => {
  const [h, setH] = useState(0)
  const [m, setM] = useState(5)
  const [s, setS] = useState(0)
  const [label, setLabel] = useState('Timer')
  const [sound, setSound] = useState('Radar')
  const [pickingSound, setPickingSound] = useState(false)
  const seconds = h * 3600 + m * 60 + s
  const hours = Array.from({ length: 24 }, (_, i) => `${i} hours`)
  const minutes = Array.from({ length: 60 }, (_, i) => `${i} min`)
  const secs = Array.from({ length: 60 }, (_, i) => `${i} sec`)
  if (pickingSound)
    return (
      <div {...stylex.props(styles.pickerRows)}>
        {SOUNDS.map((snd) => (
          <button
            key={snd}
            type="button"
            onClick={() => {
              setSound(snd)
              setPickingSound(false)
            }}
            {...stylex.props(styles.formRow)}
          >
            <span>{snd}</span>
            {sound === snd && <Sym name="check" size={15} />}
          </button>
        ))}
      </div>
    )
  return (
    <div {...stylex.props(styles.pickerWrap)}>
      <div {...stylex.props(styles.wheels)}>
        <Wheel options={hours} value={h} onChange={setH} wide aria="Hours" />
        <Wheel options={minutes} value={m} onChange={setM} wide aria="Minutes" />
        <Wheel options={secs} value={s} onChange={setS} wide aria="Seconds" />
        <div {...stylex.props(styles.wheelHairline)} />
      </div>
      <div {...stylex.props(styles.pickerRows)}>
        <div {...stylex.props(styles.formRow, styles.formStatic)}>
          <span>Label</span>
          <TextField value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Timer label" />
        </div>
        <button type="button" onClick={() => setPickingSound(true)} {...stylex.props(styles.formRow)}>
          <span>When Timer Ends</span>
          <span {...stylex.props(styles.formValue)}>
            {sound} <Sym name="forward" size={13} />
          </span>
        </button>
      </div>
      <button
        type="button"
        disabled={!seconds}
        onClick={() => onStart(seconds, label, sound)}
        {...stylex.props(styles.startBig, shared.press)}
      >
        Start
      </button>
    </div>
  )
}
