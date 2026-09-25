export type Phase = 'focus' | 'break'

// Why an end timestamp: while running, the remaining time is derived from a
// fixed point on the clock, not from a counter an interval decrements. A phase
// flip is then a comparison (`now >= endAt`), never a side effect inside
// another state update, and the other display can reconstruct the same
// countdown from the same timestamp.
export type TimerState = {
  mode: Phase
  running: boolean
  /** Wall-clock end of the running phase; meaningless while paused. */
  endAt: number | null
  /** Whole seconds left; authoritative while paused. */
  remaining: number
}

export const DURATIONS: Record<Phase, number> = { focus: 25 * 60, break: 5 * 60 }

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function nextPhase(mode: Phase): Phase {
  return mode === 'focus' ? 'break' : 'focus'
}

export function freshTimer(mode: Phase = 'focus'): TimerState {
  return { mode, running: false, endAt: null, remaining: DURATIONS[mode] }
}

export function secondsLeft(timer: TimerState, now: number) {
  if (!timer.running || timer.endAt === null) return timer.remaining
  return Math.max(0, Math.ceil((timer.endAt - now) / 1000))
}

export function startTimer(timer: TimerState, now: number): TimerState {
  const remaining = Math.max(1, secondsLeft(timer, now))
  return { mode: timer.mode, running: true, endAt: now + remaining * 1000, remaining }
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  return { mode: timer.mode, running: false, endAt: null, remaining: secondsLeft(timer, now) }
}

export function resetTimer(timer: TimerState): TimerState {
  return { mode: timer.mode, running: false, endAt: null, remaining: DURATIONS[timer.mode] }
}

export function skipTimer(timer: TimerState): TimerState {
  const mode = nextPhase(timer.mode)
  return { mode, running: false, endAt: null, remaining: DURATIONS[mode] }
}

// Rollover keeps the block running into the next phase, the way the original
// interval did. The new phase starts from the flip moment rather than chasing
// the expired timestamp, so a display suspended past its end lands in one
// fresh phase instead of cascading through every missed rollover.
export function rolloverTimer(timer: TimerState, now: number): TimerState {
  const mode = nextPhase(timer.mode)
  return { mode, running: true, endAt: now + DURATIONS[mode] * 1000, remaining: DURATIONS[mode] }
}

// The session wire format: a running phase publishes its end timestamp so the
// other display rebuilds the same countdown; a paused phase publishes plain
// remaining seconds because it has no end to count toward.
export type SavedTimer = { by: string; mode: Phase; running: boolean; endAt?: number; remaining?: number }

export function serializeTimer(by: string, timer: TimerState): SavedTimer {
  return timer.running && timer.endAt !== null
    ? { by, mode: timer.mode, running: true, endAt: timer.endAt }
    : { by, mode: timer.mode, running: false, remaining: timer.remaining }
}

export function adoptTimer(saved: SavedTimer, now: number): TimerState {
  const mode: Phase = saved.mode === 'break' ? 'break' : 'focus'
  if (saved.running && typeof saved.endAt === 'number') {
    return { mode, running: true, endAt: saved.endAt, remaining: Math.max(0, Math.ceil((saved.endAt - now) / 1000)) }
  }
  const remaining = typeof saved.remaining === 'number' ? saved.remaining : DURATIONS[mode]
  return { mode, running: false, endAt: null, remaining: Math.min(Math.max(0, Math.round(remaining)), DURATIONS[mode]) }
}
