// Sleep: tonight's hypnogram under the bedtime-to-wake window, the week's
// nights stacked by stage, and the schedule the seed keeps. Everything on it
// is the book's - a stage that never happened simply does not draw.

import { day, dayAt, todayKey } from '@doan-labs/duo-fixtures/health.ts'
import { Segmented } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Hypnogram, SleepBars, STAGE_TINT } from './charts.tsx'
import { hm, num } from './metrics.ts'
import { PageHead, StatGrid } from './parts.tsx'
import { styles } from './styles.ts'

type SleepRange = 'W' | 'M'

export function SleepPage({ wide }: { wide: boolean }) {
  const [range, setRange] = useState<SleepRange>('W')
  const span = range === 'W' ? 7 : 30
  const nights = Array.from({ length: span }, (_, i) => dayAt(span - 1 - i)).map((key) => ({ key, s: day(key).sleep }))
  const last = day(todayKey()).sleep
  const stageTotals = (['deep', 'core', 'rem', 'awake'] as const).map((stage) => ({
    stage,
    mins: last.segs.filter((s) => s.stage === stage).reduce((a, s) => a + s.mins, 0)
  }))
  const asleepAvg = Math.round(nights.reduce((a, n) => a + n.s.asleep, 0) / nights.length)
  return (
    <>
      <PageHead
        wide={wide}
        title={
          <span {...stylex.props(styles.cap, styles.capTint(STAGE_TINT.deep))}>
            <Sym name="moonStars" size={18} />
            Sleep
          </span>
        }
      />
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.pageHead)}>
            <div {...stylex.props(shared.sub)}>
              Last night · {last.bedtime} - {last.wake}
            </div>
            <div {...stylex.props(styles.bigVal)}>
              {hm(last.asleep)}
              <span {...stylex.props(styles.unit)}>asleep</span>
            </div>
          </div>
          <div {...stylex.props(styles.chartBox)}>
            <Hypnogram sleep={last} />
            <div {...stylex.props(styles.legendRow)}>
              {stageTotals.map(({ stage, mins }) => (
                <span key={stage} {...stylex.props(styles.chip)}>
                  <span {...stylex.props(styles.dot(STAGE_TINT[stage]))} />
                  {stage === 'rem' ? 'REM' : stage[0]!.toUpperCase() + stage.slice(1)} · {hm(mins)}
                </span>
              ))}
            </div>
          </div>
          <div {...stylex.props(styles.segRow)}>
            <Segmented options={['W', 'M'] as const} value={range} onChange={setRange} />
          </div>
          <div {...stylex.props(styles.chartBox)}>
            <SleepBars sleeps={nights} />
            <div {...stylex.props(styles.legendRow)}>
              <span {...stylex.props(styles.chip)}>{hm(asleepAvg)} asleep avg</span>
            </div>
          </div>
          <StatGrid
            avg={hm(asleepAvg)}
            min={hm(Math.min(...nights.map((n) => n.s.asleep)))}
            max={hm(Math.max(...nights.map((n) => n.s.asleep)))}
            total={`${num(Math.round(nights.reduce((a, n) => a + n.s.asleep, 0) / 60))}`}
            unit={range === 'W' ? 'hrs/wk' : 'hrs/mo'}
          />
          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>About</span>
          </div>
          <p {...stylex.props(shared.sub, styles.date)}>
            Time asleep by stage - deep, core and REM - plus the window you kept. Apple reads the same four bands.
          </p>
        </div>
      </div>
    </>
  )
}
