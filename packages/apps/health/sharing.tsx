// Sharing: what leaves this app. On this Duo the answer is Fitness - it reads
// this same book, so its rings, workouts and streaks are these numbers. The
// page states that plainly rather than faking an iCloud flow.

import type { Os } from '@doan-labs/duo-sdk'
import { Button, Row, Section } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { PageHead } from './parts.tsx'
import { useBook } from './store.ts'
import { styles } from './styles.ts'

export function SharingPage({ os, wide }: { os: Os; wide: boolean }) {
  const book = useBook()
  const rows: { sym: SymProps['name']; tint: string; label: string; detail: string }[] = [
    { sym: 'activity', tint: colors.pink, label: 'Activity Rings', detail: 'Live - same goals, same totals' },
    { sym: 'walk', tint: colors.orange, label: 'Workouts', detail: `${book.workouts.length} sessions` },
    { sym: 'heartFill', tint: colors.red, label: 'Heart & Vitals', detail: 'Resting HR, variability, oxygen' },
    { sym: 'moonStars', tint: colors.indigo, label: 'Sleep', detail: 'Nightly stages and schedule' },
    { sym: 'person', tint: colors.blue, label: 'Body', detail: 'Weight log and profile' }
  ]
  return (
    <>
      <PageHead wide={wide} title={<span {...stylex.props(typography.title3)}>Sharing</span>} />
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.pageHead, styles.sheetRow)}>
            <span {...stylex.props(styles.woGlyph(colors.pink, 46))}>
              <Sym name="people" size={22} />
            </span>
            <div>
              <div {...stylex.props(typography.title3)}>{book.profile.name}</div>
              <div {...stylex.props(shared.sub)}>Sharing with 1 app on this Duo</div>
            </div>
          </div>
          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>Fitness</span>
            <span {...stylex.props(shared.sub)}>&nbsp;reads every category live</span>
          </div>
          <Section>
            {rows.map((r) => (
              <Row
                key={r.label}
                icon={
                  <span {...stylex.props(styles.woGlyph(r.tint, 30))}>
                    <Sym name={r.sym} size={15} />
                  </span>
                }
                label={r.label}
                detail={r.detail}
              />
            ))}
          </Section>
          <div {...stylex.props(styles.btnRow)}>
            <Button variant="filled" onClick={() => os.open('Fitness')}>
              Open Fitness
            </Button>
          </div>
          <p {...stylex.props(shared.sub, styles.date)}>
            There is no sync to configure: both apps read and write one on-device book. A workout logged in Fitness is a
            workout here, and a glass of water logged here is already counted there.
          </p>
        </div>
      </div>
    </>
  )
}
