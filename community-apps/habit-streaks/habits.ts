export type Habit = { id: string; name: string; detail: string; dates: string[] }

export const DEFAULT_HABITS: Habit[] = [
  { id: 'move', name: 'Move 10 minutes', detail: 'A short walk or stretch', dates: [] },
  { id: 'read', name: 'Read a page', detail: 'Keep the story going', dates: [] },
  { id: 'water', name: 'Drink water', detail: 'Refill your glass', dates: [] }
]

export function dateKey(date = new Date()) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

export function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

export function parseHabits(value: string | null): Habit[] {
  if (!value) return DEFAULT_HABITS
  try {
    const parsed = JSON.parse(value) as Habit[]
    if (!Array.isArray(parsed)) return DEFAULT_HABITS
    return DEFAULT_HABITS.map((habit) => {
      const saved = parsed.find((item) => item.id === habit.id)
      return saved
        ? { ...habit, dates: Array.isArray(saved.dates) ? saved.dates.filter((date) => typeof date === 'string') : [] }
        : habit
    })
  } catch {
    return DEFAULT_HABITS
  }
}

export function serializeHabits(habits: Habit[]) {
  return JSON.stringify(habits)
}

export function streak(habit: Habit, today: string) {
  if (!habit.dates.includes(today)) return 0
  let count = 0
  let cursor = today
  while (habit.dates.includes(cursor)) {
    count += 1
    cursor = shiftDate(cursor, -1)
  }
  return count
}

export function toggleHabit(habits: Habit[], id: string, today: string): Habit[] {
  return habits.map((habit) => {
    if (habit.id !== id) return habit
    const dates = habit.dates.includes(today) ? habit.dates.filter((date) => date !== today) : [...habit.dates, today]
    return { ...habit, dates }
  })
}

// The session key carries the day the mirror was written for: a stale mirror
// from yesterday must never overwrite fresh history after midnight.
export type Mirror = { by: string; today: string; habits: string }

export function serializeMirror(by: string, habits: Habit[], today: string) {
  return JSON.stringify({ by, today, habits: serializeHabits(habits) } satisfies Mirror)
}

export function parseMirror(raw: string | null): Mirror | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Mirror
    if (typeof parsed?.by !== 'string' || typeof parsed?.today !== 'string' || typeof parsed?.habits !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
