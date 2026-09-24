// Every piece of Clock state lives in SDK storage so both display copies agree:
// the tab, the city list, alarms, the running stopwatch and the timers. Time
// itself is never stored, only the instants things started, so a copy that wakes
// late reads the same clock as the one that has been ticking all along.

import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { useEffect, useState } from 'react'

export type Tab = 'world' | 'alarm' | 'stopwatch' | 'timer'
export const TABS: { id: Tab; name: string; sym: 'globe' | 'clockFill' | 'gauge' | 'clockSym' }[] = [
  { id: 'world', name: 'World Clock', sym: 'globe' },
  { id: 'alarm', name: 'Alarms', sym: 'clockFill' },
  { id: 'stopwatch', name: 'Stopwatch', sym: 'gauge' },
  { id: 'timer', name: 'Timers', sym: 'clockSym' }
]

export type City = { name: string; tz: string }
export type Alarm = {
  id: string
  hour: number
  minute: number
  label: string
  repeat: number[]
  sound: string
  snooze: boolean
  on: boolean
  /** Set while a snoozed alarm waits to ring again. */
  snoozedUntil?: number
}
export type Stopwatch = {
  /** Epoch ms of the current run, null while paused. */
  startedAt: number | null
  /** Time banked by earlier runs. */
  elapsed: number
  /** Where the last lap was taken, as total elapsed. */
  lapAt: number
  /** Finished lap lengths, newest first. */
  laps: number[]
}
export type Timer = {
  id: string
  seconds: number
  label: string
  sound: string
  /** Epoch ms the timer rings, null while paused. */
  endsAt: number | null
  /** Milliseconds left while paused. */
  remaining: number
}
export type Ringing = { kind: 'alarm' | 'timer'; id: string; at: number }

export const SOUNDS = ['Radar', 'Beacon', 'Chimes', 'Circuit', 'Reflection', 'Signal', 'Waves']

export const CITIES: City[] = [
  ['Cupertino', 'America/Los_Angeles'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Paris', 'Europe/Paris'],
  ['Berlin', 'Europe/Berlin'],
  ['Moscow', 'Europe/Moscow'],
  ['Dubai', 'Asia/Dubai'],
  ['Mumbai', 'Asia/Kolkata'],
  ['Bangkok', 'Asia/Bangkok'],
  ['Ho Chi Minh City', 'Asia/Ho_Chi_Minh'],
  ['Singapore', 'Asia/Singapore'],
  ['Hong Kong', 'Asia/Hong_Kong'],
  ['Shanghai', 'Asia/Shanghai'],
  ['Seoul', 'Asia/Seoul'],
  ['Tokyo', 'Asia/Tokyo'],
  ['Sydney', 'Australia/Sydney'],
  ['Auckland', 'Pacific/Auckland'],
  ['Honolulu', 'Pacific/Honolulu'],
  ['Denver', 'America/Denver'],
  ['Chicago', 'America/Chicago'],
  ['Mexico City', 'America/Mexico_City'],
  ['Sao Paulo', 'America/Sao_Paulo'],
  ['Buenos Aires', 'America/Argentina/Buenos_Aires'],
  ['Cairo', 'Africa/Cairo'],
  ['Johannesburg', 'Africa/Johannesburg'],
  ['Nairobi', 'Africa/Nairobi']
].map(([name, tz]) => ({ name: name!, tz: tz! }))

const DEFAULT_CITIES = ['Cupertino', 'New York', 'London', 'Ho Chi Minh City', 'Tokyo', 'Sydney'].map(
  (n) => CITIES.find((c) => c.name === n)!
)
const DEFAULT_ALARMS: Alarm[] = [
  { id: 'a1', hour: 6, minute: 30, label: 'Wake up', repeat: [1, 2, 3, 4, 5], sound: 'Radar', snooze: true, on: true },
  { id: 'a2', hour: 9, minute: 0, label: 'Alarm', repeat: [0, 6], sound: 'Beacon', snooze: true, on: false }
]
const IDLE: Stopwatch = { startedAt: null, elapsed: 0, lapAt: 0, laps: [] }

export const uid = () => Math.random().toString(36).slice(2, 10)

export const useTab = () => {
  const kv = useKV(os.session, 'tab')
  const value = (kv.value as Tab | null) ?? 'world'
  return [TABS.some((t) => t.id === value) ? value : 'world', (t: Tab) => kv.set(t)] as const
}
export const useCities = () => useJSON<City[]>(os.storage, 'cities', DEFAULT_CITIES)
export const useAlarms = () => useJSON<Alarm[]>(os.storage, 'alarms', DEFAULT_ALARMS)
export const useStopwatch = () => useJSON<Stopwatch>(os.storage, 'stopwatch', IDLE)
export const useTimers = () => useJSON<Timer[]>(os.storage, 'timers', [])
export const useRecents = () => useJSON<number[]>(os.storage, 'recents', [60, 300, 600])
export const useRinging = () => useJSON<Ringing | null>(os.session, 'ringing', null)

export const stopwatchElapsed = (s: Stopwatch, now: number) => s.elapsed + (s.startedAt ? now - s.startedAt : 0)
export const timerRemaining = (t: Timer, now: number) => (t.endsAt ? Math.max(0, t.endsAt - now) : t.remaining)

/** True in the copy that may start timers and sounds; flips when the other display takes over. */
export const useOwner = () => {
  const [own, setOwn] = useState(!!os.owner)
  useEffect(() => os.onOwner((o) => setOwn(!!o)), [])
  return own
}

/**
 * A clock that re-renders at `hz`. Both copies tick their own paint clock, it
 * is display-only: nothing here writes storage or makes noise.
 */
export const useNow = (hz: number, live = true) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live) return
    setNow(Date.now())
    if (hz >= 30) {
      let frame = 0
      const loop = () => {
        setNow(Date.now())
        frame = requestAnimationFrame(loop)
      }
      frame = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(frame)
    }
    const t = setInterval(() => setNow(Date.now()), 1000 / hz)
    return () => clearInterval(t)
  }, [hz, live])
  return now
}
