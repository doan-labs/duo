import type { Event } from './data.ts'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** Pixels per hour in the time grid; styles.ts repeats the number because StyleX cannot import it. */
export const HOUR = 44

const pad = (n: number) => String(n).padStart(2, '0')
/** `YYYY-MM-DD` in local time; the key a day is stored and compared by. */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** `YYYY-MM-DDTHH:mm`, what a `datetime-local` field reads and writes. */
export const local = (d: Date) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
export const sameDay = (a: Date, b: Date) => ymd(a) === ymd(b)
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))
export const time = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export const monthYear = (d: Date) => `${d.toLocaleDateString('en', { month: 'long' })} ${d.getFullYear()}`

/**
 * The Monday-first weeks a month actually spans, five or six, so the sheet gives
 * its rows the height it has rather than ruling an empty week at the bottom.
 * `rows` pads back up: a thumbnail that changes height every month makes the
 * sidebar and the year grid jump.
 */
export const weeks = (month: Date, rows = 0) => {
  const first = startOfMonth(month)
  const span = ((first.getDay() + 6) % 7) + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const n = Math.max(Math.ceil(span / 7), rows)
  const start = startOfWeek(first)
  return Array.from({ length: n * 7 }, (_, i) => addDays(start, i))
}
export const week = (d: Date) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d), i))

/** Events touching `day`, all-day and multi-day ones included, in start order. */
export const eventsOn = (events: Event[], day: Date) => {
  const from = ymd(day)
  return events
    .filter((e) => e.start.slice(0, 10) <= from && e.end.slice(0, 10) >= from)
    .sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || a.start.localeCompare(b.start))
}

/** Minutes into the day of `s`, clamped to the day it is drawn in. */
export const minutes = (s: string, day: Date, edge: 0 | 1440) => {
  if (s.slice(0, 10) !== ymd(day)) return edge
  const d = new Date(s)
  return d.getHours() * 60 + d.getMinutes()
}
