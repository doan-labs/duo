// Workouts: the whole log, newest first, with the add sheet behind the plus
// button. A row pushes the workout's own page - a shared `w:<id>` destination
// the cover opens like iPadOS's detail pane.

import { WORKOUTS, type Workout } from '@doan-labs/duo-fixtures/health.ts'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { dec1, KINDSYM, midDate, num, RemoveWorkout, WoRow } from './parts.tsx'
import { goBack, goTo, openSheet, useBook } from './store.ts'
import { styles } from './styles.ts'

export function WorkoutsPage({ wide }: { wide: boolean }) {
  const book = useBook()
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Workouts</span>
        <span {...stylex.props(styles.headSide)}>
          <button
            type="button"
            aria-label="Add workout"
            title="Add workout"
            onClick={() => openSheet('workout')}
            {...stylex.props(styles.iconBtn, shared.press)}
          >
            <Sym name="plus" size={14} />
          </button>
        </span>
      </div>
      <div {...stylex.props(shared.sub, styles.date)}>{book.workouts.length} logged · shared with Health</div>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.grid)}>
            {book.workouts.map((w) => (
              <WoRow key={w.id} w={w} open={() => goTo(`w:${w.id}`)} />
            ))}
          </div>
          {!book.workouts.length && (
            <p {...stylex.props(shared.sub, styles.date)}>No workouts yet - the plus above logs the first.</p>
          )}
        </div>
      </div>
    </>
  )
}

/** `w:<id>`: one workout's page - glyph hero, the stat grid, a delete. */
export function WorkoutPage({ id, wide }: { id: string; wide: boolean }) {
  const book = useBook()
  const w: Workout | undefined = book.workouts.find((v) => v.id === id)
  if (!w) return null
  const meta = WORKOUTS[w.kind]
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(typography.largeTitle)}>{meta.name}</span>
        <span {...stylex.props(styles.headSide)}>
          <RemoveWorkout id={w.id} />
        </span>
      </div>
      <div {...stylex.props(shared.sub, styles.date)}>
        {midDate(w.at.slice(0, 10))} · {w.at.slice(11, 16)}
      </div>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.ringsRow)}>
            <span {...stylex.props(styles.woGlyph(colors.orange, wide ? 96 : 72))}>
              <Sym name={KINDSYM[w.kind]} size={wide ? 44 : 32} />
            </span>
            <div {...stylex.props(styles.ringStats)}>
              <div {...stylex.props(styles.ringStatVal)}>{num(w.kcal)} kcal</div>
              <div {...stylex.props(styles.woSub)}>active energy</div>
            </div>
          </div>
          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>Details</span>
          </div>
          <div {...stylex.props(styles.statGrid)}>
            <Stat label="Duration" v={`${w.mins} min`} />
            <Stat label="Energy" v={`${num(w.kcal)} kcal`} />
            {meta.paced && w.km ? <Stat label="Distance" v={`${dec1(w.km)} km`} /> : null}
            {meta.paced && w.km ? <Stat label="Pace" v={`${dec1(w.mins / w.km)} min/km`} /> : null}
            <Stat label="Avg Heart Rate" v={`${w.avgHr} bpm`} />
            <Stat label="Logged by" v={w.logged ? 'You' : 'Duo'} />
          </div>
          <p {...stylex.props(shared.sub, styles.date)}>
            Workouts feed Move and Exercise in this book, so Health's rings and charts already count this one.
          </p>
        </div>
      </div>
    </>
  )
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div {...stylex.props(styles.stat)}>
      <div {...stylex.props(styles.statCap)}>{label}</div>
      <div {...stylex.props(styles.statVal)}>{v}</div>
    </div>
  )
}

function BackBtn() {
  return (
    <button type="button" aria-label="Back" onClick={goBack} {...stylex.props(shared.bk, shared.press)}>
      <Sym name="back" size={20} />
    </button>
  )
}
