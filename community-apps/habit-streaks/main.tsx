import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import {
  dateKey,
  type Habit,
  parseHabits,
  parseMirror,
  serializeHabits,
  serializeMirror,
  streak,
  toggleHabit
} from './habits.ts'
import { styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled list - adopting it unconditionally is what converges the two
// displays, including the race where both seed an empty session at once.
const ME = crypto.randomUUID()

function Habits() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const stored = useKV(os.storage, 'habits')
  const mirror = useKV(os.session, 'habits')
  const today = dateKey()
  const habits = parseHabits(stored.value)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)

  const publish = useCallback(
    (next: Habit[]) => {
      void stored.set(serializeHabits(next))
      mirror.set(serializeMirror(ME, next, today))
    },
    [stored, mirror, today]
  )

  // Why adopt on the session key: the fold carries the day's checkmarks to the
  // other display. A write this copy did not make is the new settled list; own
  // writes are already on screen and are ignored. Storage stays the source of
  // truth - an adopted mirror lands as one storage write, so the two stores
  // never fight. The raw string is the guard: the effect body must not re-fire
  // on every render of a remote value already on screen.
  useEffect(() => {
    if (mirror.status === 'hydrating' || mirror.status === 'saving') return
    const raw = mirror.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current && stored.status === 'ready' && stored.value !== null) {
        seeded.current = true
        mirror.set(serializeMirror(ME, habits, today))
      }
      return
    }
    const next = parseMirror(raw)
    if (!next || next.by === ME || next.today !== today) return
    if (next.habits !== stored.value) void stored.set(next.habits)
  }, [mirror.value, mirror.status, stored.value, stored.status, mirror, stored.set, habits, today])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const completed = habits.filter((habit) => habit.dates.includes(today)).length
  const allDone = completed === habits.length

  const counter = (
    <div {...stylex.props(styles.counterChip, !wide && styles.counterChipCover, allDone && styles.counterDone)}>
      <span {...stylex.props(styles.counterLabel)}>TODAY</span>
      <strong {...stylex.props(styles.counterValue)}>
        {completed}/{habits.length}
      </strong>
    </div>
  )

  const list = (
    <section role="list" aria-label="Today's habits" {...stylex.props(styles.list, !wide && styles.listCover)}>
      {habits.map((habit, index) => {
        const done = habit.dates.includes(today)
        const currentStreak = streak(habit, today)
        const delay = [styles.rowDelay1, styles.rowDelay2, styles.rowDelay3][index] ?? styles.rowDelay3
        return (
          <button
            type="button"
            aria-pressed={done}
            key={habit.id}
            onClick={() => publish(toggleHabit(habits, habit.id, today))}
            {...stylex.props(styles.habit, done && styles.habitDone, delay)}
          >
            <span {...stylex.props(styles.check, done && styles.checkDone)}>{done ? '✓' : ''}</span>
            <span {...stylex.props(styles.habitCopy)}>
              <strong {...stylex.props(styles.habitName, !wide && styles.habitNameCover)}>{habit.name}</strong>
              <small {...stylex.props(styles.habitDetail, !wide && styles.habitDetailCover)}>{habit.detail}</small>
            </span>
            <span {...stylex.props(styles.streak)}>
              <span key={currentStreak} {...stylex.props(styles.streakBump)}>
                {currentStreak}d
              </span>
            </span>
          </button>
        )
      })}
    </section>
  )

  const status = (
    <small role="status" {...stylex.props(styles.saved)}>
      {stored.status === 'saving' ? 'Saving...' : 'Synced across both displays'}
    </small>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root, !wide && styles.rootCover)}>
      {wide ? (
        <section {...stylex.props(styles.stage)}>
          <div {...stylex.props(styles.rail)}>
            <header {...stylex.props(styles.brand)}>
              <span {...stylex.props(styles.kicker)}>Duo Daily</span>
              <h1 {...stylex.props(styles.title)}>Habit Streaks</h1>
            </header>
            {counter}
            {allDone ? (
              <strong {...stylex.props(styles.doneBanner)}>All done for today</strong>
            ) : (
              <p {...stylex.props(styles.hint)}>Small actions, steady momentum</p>
            )}
          </div>
          {list}
        </section>
      ) : (
        <>
          <header {...stylex.props(styles.railCover)}>
            <div {...stylex.props(styles.brand)}>
              <span {...stylex.props(styles.kicker)}>Duo Daily</span>
              <h1 {...stylex.props(styles.title, styles.titleCover)}>Habit Streaks</h1>
            </div>
            {counter}
          </header>
          {allDone ? (
            <strong {...stylex.props(styles.doneBanner)}>All done for today</strong>
          ) : (
            <p {...stylex.props(styles.hint, styles.hintCover)}>Small actions, steady momentum</p>
          )}
          {list}
        </>
      )}
      {status}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Habits />)
