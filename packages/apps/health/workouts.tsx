// Workouts, as Health lists them: the same log Fitness renders, so a session
// added here shows up there - and in the rings. Rows carry a delete button;
// the plus in the header opens the add sheet.

import { Section } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { PageHead, WorkoutRow } from './parts.tsx'
import { openSheet, useBook } from './store.ts'
import { styles } from './styles.ts'

export function WorkoutsPage({ wide }: { wide: boolean }) {
  const book = useBook()
  return (
    <>
      <PageHead wide={wide} title={<span {...stylex.props(typography.title3)}>Workouts</span>}>
        <button
          type="button"
          aria-label="Add workout"
          onClick={() => openSheet({ workout: true })}
          {...stylex.props(styles.iconBtn, shared.press)}
        >
          <Sym name="plus" size={15} />
        </button>
      </PageHead>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.pageHead)}>
            <div {...stylex.props(shared.sub)}>The log Fitness reads</div>
            <div {...stylex.props(styles.bigVal)}>
              {book.workouts.length}
              <span {...stylex.props(styles.unit)}>workouts</span>
            </div>
          </div>
          <Section>
            {book.workouts.map((w) => (
              <WorkoutRow key={w.id} {...w} />
            ))}
          </Section>
          <p {...stylex.props(shared.sub, styles.date)}>
            Logged here or in Fitness, a workout adds its minutes and calories to that day’s rings in both apps.
          </p>
        </div>
      </div>
    </>
  )
}
