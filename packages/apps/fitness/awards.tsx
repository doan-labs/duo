// Awards: the medal shelf - earned medals fill gold, unearned stay glass with
// a progress bar under them. Every award is computed live from the book:
// log the missing workout and the medal lands.

import { awards } from '@doan-labs/duo-fixtures/health.ts'
import { RING_TINTS } from '@doan-labs/duo-uikit/rings.tsx'
import { delay, shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { dec1, num } from './parts.tsx'
import { useBook } from './store.ts'
import { styles } from './styles.ts'

export function AwardsPage({ wide }: { wide: boolean }) {
  useBook()
  const all = awards()
  const earned = all.filter((a) => a.earned).length
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Awards</span>
      </div>
      <div {...stylex.props(shared.sub, styles.date)}>
        {earned} of {all.length} earned
      </div>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.awardGrid)}>
          {all.map((a, i) => (
            <div key={a.id} {...stylex.props(styles.award, shared.rise, delay.ms(i * 60))}>
              <span {...stylex.props(styles.medal(a.earned))}>
                <Sym name={a.earned ? 'starFill' : 'star'} size={26} />
              </span>
              <div {...stylex.props(styles.awardName)}>{a.name}</div>
              <div {...stylex.props(styles.awardSub)}>{a.detail}</div>
              {!a.earned && (
                <>
                  <div {...stylex.props(styles.progress)}>
                    <div {...stylex.props(styles.progressFill(RING_TINTS.move, a.of ? a.progress / a.of : 0))} />
                  </div>
                  <div {...stylex.props(styles.awardSub)}>
                    {dec1(a.progress)} of {num(a.of)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
