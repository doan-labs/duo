// Formatting shared by the four tabs: wall clock parts in a zone, the
// "Today, +9HRS" line under a city, and the stopwatch and timer readouts.

const pad = (n: number) => String(n).padStart(2, '0')

/** Hour, minute and period of a moment in a zone, split so the period can be set small. */
export const clockParts = (d: Date, tz?: string) => {
  const parts = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value
      return acc
    }, {})
  return { time: `${parts.hour}:${parts.minute}`, period: parts.dayPeriod ?? '' }
}

export const wall = (d: Date, tz?: string) => {
  const { time, period } = clockParts(d, tz)
  return `${time} ${period}`
}

/** Minutes a zone sits ahead of the local clock at this instant. */
export const zoneOffset = (d: Date, tz: string) => {
  const fmt = (zone?: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).formatToParts(d)
  const asUtc = (zone?: string) => {
    const p = fmt(zone).reduce<Record<string, number>>((acc, x) => {
      acc[x.type] = Number(x.value)
      return acc
    }, {})
    return Date.UTC(p.year!, p.month! - 1, p.day!, p.hour! % 24, p.minute!)
  }
  return Math.round((asUtc(tz) - asUtc()) / 60000)
}

/** "Today, +9HRS" / "Tomorrow, +15HRS" / "Yesterday, -8HRS", or "Today" for the local zone. */
export const relativeDay = (d: Date, tz: string) => {
  const day = (zone?: string) => new Intl.DateTimeFormat('en', { timeZone: zone, day: 'numeric' }).format(d)
  const here = day()
  const there = day(tz)
  const diff = zoneOffset(d, tz)
  const when = there === here ? 'Today' : diff > 0 ? 'Tomorrow' : 'Yesterday'
  if (diff === 0) return when
  const h = Math.abs(diff) / 60
  const hours = Number.isInteger(h) ? `${h}` : h.toFixed(1)
  return `${when}, ${diff > 0 ? '+' : '-'}${hours}${h === 1 ? 'HR' : 'HRS'}`
}

/** Stopwatch style: "04:12.87", growing to "1:04:12.87" past an hour. */
export const stopwatchText = (ms: number) => {
  const cs = Math.floor(ms / 10) % 100
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000)
  return `${h ? `${h}:` : ''}${pad(m)}:${pad(s)}.${pad(cs)}`
}

/** Timer style: "4:59" under an hour, "1:04:59" past it. Rounds up so the last second reads 0:01. */
export const countdownText = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** "5 min", "1 hr 30 min", "45 sec", the name of a timer without a label. */
export const durationName = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const out: string[] = []
  if (h) out.push(`${h} hr`)
  if (m) out.push(`${m} min`)
  if (s || !out.length) out.push(`${s} sec`)
  return out.join(' ')
}

export const alarmParts = (hour: number, minute: number) => {
  const h12 = hour % 12 || 12
  return { time: `${h12}:${pad(minute)}`, period: hour < 12 ? 'AM' : 'PM' }
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Every day", "Weekdays", "Weekends", "Mon Wed Fri", or "Never". */
export const repeatName = (days: number[]) => {
  if (days.length === 7) return 'Every day'
  if (days.length === 0) return 'Never'
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays'
  if (sorted.join() === '0,6') return 'Weekends'
  return sorted.map((d) => DAY_SHORT[d]).join(' ')
}
