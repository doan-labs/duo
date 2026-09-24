// Clock: four tabs behind an iPadOS-style shell - a sidebar on the wide
// display, a floating glass tab bar on the cover. All state lives in SDK
// storage so the two display copies stay in lockstep; only the owning copy
// ticks the alarm/timer watcher and makes sound.

import { beep } from '@doan-labs/duo-fixtures'
import { type Os, os } from '@doan-labs/duo-sdk'
import { Sym, usePresence, useWide } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { Alarms } from './alarm.tsx'
import { Sidebar, TabBar } from './chrome.tsx'
import { Stopwatch } from './stopwatch.tsx'
import { type Ringing, useAlarms, useNow, useOwner, useRinging, useTab, useTimers } from './store.ts'
import { styles } from './styles.ts'
import { alarmParts, countdownText } from './time.ts'
import { Timers } from './timers.tsx'
import { WorldClock } from './world.tsx'

export const Clock = (_: { os: Os }) => {
  const [root, wide] = useWide()
  const [tab, setTab] = useTab()
  return (
    <div ref={root} {...stylex.props(styles.shell)}>
      {wide && <Sidebar tab={tab} setTab={setTab} />}
      <div {...stylex.props(styles.pane)}>
        {tab === 'world' && <WorldClock narrow={!wide} />}
        {tab === 'alarm' && <Alarms narrow={!wide} />}
        {tab === 'stopwatch' && <Stopwatch narrow={!wide} wide={wide} />}
        {tab === 'timer' && <Timers narrow={!wide} />}
        {!wide && <TabBar tab={tab} setTab={setTab} />}
        <RingingOverlay />
      </div>
      <Watcher />
    </div>
  )
}

/** The owning copy's sweep: fires an alarm or a timer the moment it comes due. */
const Watcher = () => {
  const owner = useOwner()
  const alarms = useAlarms()
  const timers = useTimers()
  const ringing = useRinging()
  // The interval reads the latest state through a ref; hook values are closure-stale.
  const ref = useRef({ alarms: alarms.value, timers: timers.value, ringing: ringing.value })
  ref.current = { alarms: alarms.value, timers: timers.value, ringing: ringing.value }
  const lastFire = useRef('')

  useEffect(() => {
    if (!owner) return
    const t = setInterval(() => {
      const { alarms: al, timers: tm, ringing: rg } = ref.current
      if (rg) return
      const now = Date.now()
      const d = new Date(now)
      const alarm = al.find((a) => {
        if (!a.on) return false
        if (a.snoozedUntil) return now >= a.snoozedUntil
        const stamp = `${a.id}:${d.getDate()}:${a.hour}:${a.minute}`
        return (
          a.hour === d.getHours() &&
          a.minute === d.getMinutes() &&
          (a.repeat.length === 0 || a.repeat.includes(d.getDay())) &&
          lastFire.current !== stamp
        )
      })
      if (alarm) {
        lastFire.current = `${alarm.id}:${d.getDate()}:${alarm.hour}:${alarm.minute}`
        ring({ kind: 'alarm', id: alarm.id, at: now })
        return
      }
      const timer = tm.find((x) => x.endsAt && x.endsAt <= now)
      if (timer) ring({ kind: 'timer', id: timer.id, at: now })
    }, 250)
    return () => clearInterval(t)
  }, [owner])

  // Ring tone: only the owner makes noise, once a second while the banner is up.
  useEffect(() => {
    if (!owner || !ringing.value) return
    beep([880, 660, 880], 0.16)
    const t = setInterval(() => beep([880, 660, 880], 0.16), 1100)
    return () => clearInterval(t)
  }, [owner, ringing.value])
  return null
}

const ring = (r: Ringing) => void os.session.set('ringing', JSON.stringify(r))

const RingingOverlay = () => {
  const ringing = useRinging()
  const alarms = useAlarms()
  const timers = useTimers()
  const { mounted, closing } = usePresence(!!ringing.value, 200)
  const now = useNow(1)
  if (!mounted || !ringing.value) return null
  const r = ringing.value
  const alarm = r.kind === 'alarm' ? alarms.value.find((a) => a.id === r.id) : undefined
  const timer = r.kind === 'timer' ? timers.value.find((t) => t.id === r.id) : undefined
  const { time, period } = alarm
    ? alarmParts(alarm.hour, alarm.minute)
    : { time: countdownText(r.at - now > 0 ? r.at - now : 0), period: '' }
  const name = alarm ? alarm.label : (timer?.label ?? 'Timer')

  const stop = () => {
    ringing.del()
    if (r.kind === 'timer') timers.set(timers.value.filter((t) => t.id !== r.id))
    else
      alarms.set(
        // A snoozed alarm goes back to its schedule; a one-shot alarm is spent.
        alarms.value.map((a) =>
          a.id === r.id ? { ...a, snoozedUntil: undefined, on: a.repeat.length ? a.on : false } : a
        )
      )
  }
  const snooze = () => {
    ringing.del()
    alarms.set(alarms.value.map((a) => (a.id === r.id ? { ...a, snoozedUntil: Date.now() + 9 * 60 * 1000 } : a)))
  }

  return (
    <div {...stylex.props(styles.ringing, animations.fade, closing && styles.dim)} role="alertdialog" aria-label={name}>
      <span {...stylex.props(styles.ringingGlyph)}>
        <Sym name={r.kind === 'alarm' ? 'clockFill' : 'clockSym'} size={34} />
      </span>
      <div {...stylex.props(styles.ringingTime)}>
        {time}
        {period && <span {...stylex.props(styles.period)}>{period}</span>}
      </div>
      <div {...stylex.props(styles.ringingName)}>{name}</div>
      <div {...stylex.props(styles.ringingBtns)}>
        {alarm?.snooze && (
          <button
            type="button"
            onClick={snooze}
            {...stylex.props(styles.ringingBtn, styles.ringingSnooze, shared.press)}
          >
            Snooze
          </button>
        )}
        <button type="button" onClick={stop} {...stylex.props(styles.ringingBtn, styles.ringingStop, shared.press)}>
          Stop
        </button>
      </div>
    </div>
  )
}
