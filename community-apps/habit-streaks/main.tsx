import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

type Habit = { id: string; name: string; detail: string; dates: string[] }

const DEFAULT_HABITS: Habit[] = [
  { id: 'move', name: 'Move 10 minutes', detail: 'A short walk or stretch', dates: [] },
  { id: 'read', name: 'Read a page', detail: 'Keep the story going', dates: [] },
  { id: 'water', name: 'Drink water', detail: 'Refill your glass', dates: [] }
]

function dateKey(date = new Date()) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

function shiftDate(value: string, amount: number) {
  const date = new Date(value + 'T12:00:00')
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

function parseHabits(value: string | null) {
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

function streak(habit: Habit, today: string) {
  if (!habit.dates.includes(today)) return 0
  let count = 0
  let cursor = today
  while (habit.dates.includes(cursor)) {
    count += 1
    cursor = shiftDate(cursor, -1)
  }
  return count
}

function Habits() {
  const view = useDisplay()
  const cover = view.display === 'cover'
  const stored = useKV(os.storage, 'habits')
  const today = dateKey()
  const habits = parseHabits(stored.value)

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const toggle = (id: string) => {
    const next = habits.map((habit) => {
      if (habit.id !== id) return habit
      const dates = habit.dates.includes(today) ? habit.dates.filter((date) => date !== today) : [...habit.dates, today]
      return { ...habit, dates }
    })
    void stored.set(JSON.stringify(next))
  }

  const completed = habits.filter((habit) => habit.dates.includes(today)).length

  return (
    <main data-display={view.display} {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO DAILY</span>
          <h1 {...stylex.props(styles.title)}>Habit Streaks</h1>
        </div>
        <strong {...stylex.props(styles.counter)}>{completed}/3</strong>
      </header>
      <p {...stylex.props(styles.hint)}>{completed === 3 ? 'All done for today' : 'Small actions, steady momentum'}</p>
      <section role="list" aria-label="Today's habits" {...stylex.props(styles.list)}>
        {habits.map((habit) => {
          const done = habit.dates.includes(today)
          const currentStreak = streak(habit, today)
          return (
            <button
              type="button"
              aria-pressed={done}
              key={habit.id}
              onClick={() => toggle(habit.id)}
              {...stylex.props(styles.habit, done && styles.habitDone)}
            >
              <span {...stylex.props(styles.check, done && styles.checkDone)}>{done ? '✓' : ''}</span>
              <span {...stylex.props(styles.habitCopy)}>
                <strong>{habit.name}</strong>
                <small>{habit.detail}</small>
              </span>
              <span {...stylex.props(styles.streak)}>{currentStreak}d</span>
            </button>
          )
        })}
      </section>
      <small role="status" {...stylex.props(styles.saved)}>
        {stored.status === 'saving' ? 'Saving...' : 'Saved in this app only'}
      </small>
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
    gap: 10,
    paddingBlock: 16,
    paddingInline: 18,
    color: colors.white,
    backgroundColor: colors.darkElevated,
    fontFamily: fonts.system
  },
  cover: { gap: 6, paddingBlock: 10, paddingInline: 10 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexShrink: 0 },
  kicker: { color: colors.greenBright, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 32, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1 },
  counter: { color: colors.greenBright, fontSize: 16 },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: 12, flexShrink: 0 },
  list: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, justifyContent: 'center' },
  habit: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    borderWidth: 0,
    borderRadius: 14,
    paddingBlock: 13,
    paddingInline: 12,
    color: colors.white,
    backgroundColor: colors.fillThin,
    textAlign: 'start',
    cursor: 'pointer'
  },
  habitDone: { backgroundColor: colors.darkElevated2 },
  check: {
    display: 'grid',
    placeItems: 'center',
    width: 28,
    height: 28,
    flexShrink: 0,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.grey2,
    borderRadius: 999,
    color: colors.black,
    fontWeight: 900
  },
  checkDone: { borderColor: colors.greenBright, backgroundColor: colors.greenBright },
  habitCopy: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
  streak: { color: colors.greenBright, fontSize: 13, fontWeight: 800 },
  saved: { alignSelf: 'center', color: colors.grey3, fontSize: 10, flexShrink: 0 }
})

await os.connect()
createRoot(document.body).render(<Habits />)
