import type { Event } from './data.ts'
import { ymd } from './dates.ts'

/** An event as a bar: the column it starts in, the days it covers, the lane it sits in. */
export type Placed = { e: Event; col: number; span: number; lane: number }

/**
 * A run of days packed into lanes, the way Apple stacks bars in a month week and
 * in the all-day row: one bar per event across every day it covers, in the first
 * lane free for its whole run. Events past `lanes` are counted per day instead,
 * so a day that runs out of room says so rather than dropping them.
 */
export function pack(days: Date[], events: Event[], lanes = Number.POSITIVE_INFINITY) {
  const first = ymd(days[0]!)
  const last = ymd(days[days.length - 1]!)
  const here = events
    .filter((e) => e.start.slice(0, 10) <= last && e.end.slice(0, 10) >= first)
    .sort(
      (a, b) =>
        a.start.slice(0, 10).localeCompare(b.start.slice(0, 10)) ||
        Number(!!b.allDay) - Number(!!a.allDay) ||
        b.end.localeCompare(a.end) ||
        a.start.localeCompare(b.start)
    )
  const taken: boolean[][] = []
  const placed: Placed[] = []
  const over = days.map(() => 0)
  for (const e of here) {
    const from = Math.max(
      0,
      days.findIndex((d) => ymd(d) === e.start.slice(0, 10))
    )
    const ends = days.findIndex((d) => ymd(d) === e.end.slice(0, 10))
    const to = ends < 0 ? days.length - 1 : ends
    let lane = taken.findIndex((l) => l.slice(from, to + 1).every((x) => !x))
    if (lane < 0) lane = taken.push(days.map(() => false)) - 1
    for (let i = from; i <= to; i++) taken[lane]![i] = true
    if (lane < lanes) placed.push({ e, col: from, span: to - from + 1, lane })
    else for (let i = from; i <= to; i++) over[i]!++
  }
  // The count draws over the last lane it can have, so a day never drops an event silently.
  const more = over.map((n, i) =>
    n === 0 ? 0 : n + (placed.some((p) => p.lane === lanes - 1 && i >= p.col && i < p.col + p.span) ? 1 : 0)
  )
  return { placed, more }
}
