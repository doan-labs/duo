// A metric's page: the D/W/M/6M/Y segment, its chart, the stat row, the
// add-data and pin buttons, and its about line. `activity` is its own page -
// the rings - and `sleep` lives in sleep.tsx.

import {
  day,
  heartRateDay,
  type Range,
  rings,
  series,
  setPin,
  statOf,
  todayKey,
  trend
} from '@doan-labs/duo-fixtures/health.ts'
import { Button, Segmented } from '@doan-labs/duo-uikit'
import { RING_TINTS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Bars, Line } from './charts.tsx'
import { dec1, type Metric, num } from './metrics.ts'
import { PageHead, StatGrid } from './parts.tsx'
import { openSheet, useBook } from './store.ts'
import { styles } from './styles.ts'

const ranges: Range[] = ['D', 'W', 'M', '6M', 'Y']

export function MetricPage({ m, wide }: { m: Metric; wide: boolean }) {
  const book = useBook()
  const [range, setRange] = useState<Range>(m.kind === 'line' && m.id !== 'heartRate' ? 'W' : 'D')
  const pinned = book.pins.includes(m.id)
  const pts = pointsFor(m, range)
  const stats = m.pick ? statOf(m.pick, range) : null
  const goal =
    m.id === 'energy'
      ? book.goals.move
      : m.id === 'exercise'
        ? book.goals.exercise
        : m.id === 'stand'
          ? book.goals.stand
          : undefined
  const tr = m.pick ? trend(m.pick) : null
  const today = m.pick?.(day(todayKey()))
  return (
    <>
      <PageHead
        title={
          <span {...stylex.props(styles.cap, styles.capTint(m.tint))}>
            <Sym name={m.sym} size={18} />
            {m.name}
          </span>
        }
        wide={wide}
      >
        {pinned && <Sym name="starFill" size={15} />}
      </PageHead>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.pageHead)}>
            <div {...stylex.props(shared.sub)}>{range === 'D' ? 'Today' : `Daily average, ${range}`}</div>
            <div {...stylex.props(styles.bigVal)}>
              {m.id === 'distance' ? dec1(today ?? 0) : num(today ?? 0)}
              <span {...stylex.props(styles.unit)}>{m.unit}</span>
            </div>
          </div>
          <div {...stylex.props(styles.segRow)}>
            <Segmented
              options={m.kind === 'line' && m.id !== 'heartRate' ? ranges.slice(1) : ranges}
              value={range}
              onChange={setRange}
            />
          </div>
          <div {...stylex.props(styles.chartBox)}>
            {m.kind === 'line' ? (
              <Line pts={pts} tint={m.tint} />
            ) : (
              <Bars
                pts={pts}
                tint={m.tint}
                goal={range !== 'D' && m.pick ? goal : undefined}
                labels={axisLabels(range)}
              />
            )}
          </div>
          {stats && range !== 'D' && (
            <>
              <StatGrid
                avg={fmt(m, stats.avg)}
                min={fmt(m, stats.min)}
                max={fmt(m, stats.max)}
                total={m.kind === 'bar' ? fmt(m, stats.total) : undefined}
                unit={m.unit}
              />
              <div {...stylex.props(styles.secHead)}>
                <span {...stylex.props(shared.sub, styles.sheetRow)}>
                  <Sym name={tr && tr.dir < 0 ? 'down' : 'up'} size={13} />
                  {tr?.pct
                    ? `${tr.pct}% ${tr.dir < 0 ? 'below' : 'above'} last month’s daily average`
                    : 'Level with last month'}
                </span>
              </div>
            </>
          )}
          <div {...stylex.props(styles.btnRow)}>
            {m.write && (
              <Button variant="filled" onClick={() => openSheet({ metric: m.id })}>
                Add Data
              </Button>
            )}
            <Button onClick={() => setPin(m.id, !pinned)}>{pinned ? 'Unpin from Summary' : 'Pin to Summary'}</Button>
          </div>
          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>About</span>
          </div>
          <p {...stylex.props(shared.sub, styles.date)}>{m.about}</p>
        </div>
      </div>
    </>
  )
}

const fmt = (m: Metric, v: number) => (m.id === 'distance' ? dec1(v) : m.id === 'weight' ? dec1(v) : num(v))

/** Points for the chart: D is the day's own shape, the rest come off `series`. */
function pointsFor(m: Metric, range: Range) {
  if (!m.pick) return []
  if (range === 'D') {
    if (m.id === 'heartRate') {
      const now = new Date().getHours()
      return heartRateDay()
        .slice(0, now + 1)
        .map((v, h) => ({ key: `${h}`, label: `${h}`, value: v }))
    }
    return series(m.pick, 'D')
  }
  return series(m.pick, range)
}

function axisLabels(range: Range) {
  return (p: { key: string; label: string }): string | undefined => {
    if (range === 'W') return p.key === todayKey() ? 'Now' : p.label.slice(0, 3)
    if (range === 'M') return Number(p.key.slice(8)) % 5 === 0 ? p.key.slice(8) : undefined
    if (range === 'D')
      return Number(p.key) % 6 === 0 ? `${Number(p.key) % 12 || 12}${Number(p.key) < 12 ? 'am' : 'pm'}` : undefined
    return p.label
  }
}

/** The Activity page: all three rings and the week they add up to. */
export function ActivityPage({ os, wide }: { os: { open: (name: string) => void }; wide: boolean }) {
  const book = useBook()
  const vals = rings().map(
    (r) =>
      [r.label, RING_TINTS[r.id as keyof typeof RING_TINTS], r.done, r.goal, r.unit] as [
        string,
        string,
        number,
        number,
        string
      ]
  )
  const wk = (pick: 'kcal' | 'exercise' | 'stand') => series((d) => d[pick], 'W')
  return (
    <>
      <PageHead
        title={
          <span {...stylex.props(styles.cap, styles.capTint(RING_TINTS.move))}>
            <Sym name="activity" size={18} />
            Activity
          </span>
        }
        wide={wide}
      >
        <Sym name="starFill" size={15} />
      </PageHead>
      <div {...stylex.props(styles.body, wide && styles.bodyWide)}>
        <div {...stylex.props(styles.col)}>
          <div {...stylex.props(styles.ringsRow)}>
            <Rings size={wide ? 176 : 148} stroke={wide ? 17 : 15} values={vals} />
            <div {...stylex.props(styles.ringStats)}>
              {rings().map((r) => (
                <div
                  key={r.id}
                  {...stylex.props(styles.ringStat, styles.capTint(RING_TINTS[r.id as keyof typeof RING_TINTS]))}
                >
                  {r.label}
                  <div {...stylex.props(styles.ringStatVal)}>
                    {num(r.done)}
                    <span {...stylex.props(styles.unit)}>
                      / {num(r.goal)} {r.unit.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div {...stylex.props(styles.secHead)}>
            <span {...stylex.props(typography.headline)}>This Week</span>
          </div>
          <div {...stylex.props(styles.chartBox)}>
            <Bars pts={wk('kcal')} tint={RING_TINTS.move} goal={book.goals.move} labels={axisLabels('W')} />
            <div {...stylex.props(styles.legendRow)}>
              {rings().map((r) => (
                <span key={r.id} {...stylex.props(styles.chip)}>
                  <span {...stylex.props(styles.dot(RING_TINTS[r.id as keyof typeof RING_TINTS]))} />
                  {r.label} · {num(r.done)}/{num(r.goal)} {r.unit.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          <div {...stylex.props(styles.btnRow)}>
            <Button variant="filled" onClick={() => os.open('Fitness')}>
              Open Fitness
            </Button>
          </div>
          <p {...stylex.props(shared.sub, styles.date)}>
            The rings Fitness draws are these same numbers: log a workout there and they move here. Goals are set in
            Fitness.
          </p>
        </div>
      </div>
    </>
  )
}
