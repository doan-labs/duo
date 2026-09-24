// The Summary page: the day's pinned cards in iPadOS's grid, each opening its
// metric's page. Edit mode unpins; the trailing tile sends you to Browse to
// pin another. Every card reads the book - the rings card is the same ring
// triple Fitness headlines.

import { day, rings, series, setPin, todayKey } from '@doan-labs/duo-fixtures/health.ts'
import { RING_TINTS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { delay, shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Hypnogram, Spark } from './charts.tsx'
import { metric, num, valOf } from './metrics.ts'
import { Avatar, todayLine } from './parts.tsx'
import { goTo, useBook } from './store.ts'
import { styles } from './styles.ts'

export function SummaryPage({ wide }: { wide: boolean }) {
  const book = useBook()
  const [editing, setEditing] = useState(false)
  const today = day(todayKey())
  const ringVals = rings()
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Summary</span>
        <span {...stylex.props(styles.headSide)}>
          <button type="button" onClick={() => setEditing((e) => !e)} {...stylex.props(shared.pill, shared.press)}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button
            type="button"
            aria-label="Profile and Health Details"
            onClick={() => goTo('profile')}
            {...stylex.props(shared.press)}
          >
            <Avatar name={book.profile.name} size={34} />
          </button>
        </span>
      </div>
      <div {...stylex.props(typography.footnote, styles.date)}>{todayLine()}</div>
      <div {...stylex.props(styles.grid, wide && styles.gridWide)}>
        {book.pins.map((id, i) => {
          const m = metric(id)
          if (!m) return null
          return <PinCard key={id} m={m} i={i} editing={editing} />
        })}
        {editing && (
          <button type="button" onClick={() => goTo('browse')} {...stylex.props(styles.addPin, shared.press)}>
            <Sym name="plus" size={22} />
            <span {...stylex.props(shared.sub)}>Pin a metric</span>
          </button>
        )}
      </div>
      {book.pins.length === 0 && !editing && (
        <p {...stylex.props(shared.sub, styles.empty)}>Nothing pinned yet - use Edit, then pick from Browse.</p>
      )}
      <div {...stylex.props(styles.secHead)}>
        <span {...stylex.props(typography.headline)}>Today</span>
      </div>
      <div {...stylex.props(styles.statGrid)}>
        <div {...stylex.props(styles.stat)}>
          <div {...stylex.props(styles.statCap)}>Move</div>
          <div {...stylex.props(styles.statVal)}>
            {num(ringVals[0].done)}
            <span {...stylex.props(styles.unit)}>/ {num(ringVals[0].goal)} kcal</span>
          </div>
        </div>
        <div {...stylex.props(styles.stat)}>
          <div {...stylex.props(styles.statCap)}>Exercise</div>
          <div {...stylex.props(styles.statVal)}>
            {num(ringVals[1].done)}
            <span {...stylex.props(styles.unit)}>/ {ringVals[1].goal} min</span>
          </div>
        </div>
        <div {...stylex.props(styles.stat)}>
          <div {...stylex.props(styles.statCap)}>Stand</div>
          <div {...stylex.props(styles.statVal)}>
            {num(ringVals[2].done)}
            <span {...stylex.props(styles.unit)}>/ {ringVals[2].goal} hrs</span>
          </div>
        </div>
        <div {...stylex.props(styles.stat)}>
          <div {...stylex.props(styles.statCap)}>Resting Heart Rate</div>
          <div {...stylex.props(styles.statVal)}>
            {today.restingHr}
            <span {...stylex.props(styles.unit)}>BPM</span>
          </div>
        </div>
      </div>
    </>
  )
}

/** A pinned metric: name and glyph on top, today's value, a small chart. */
function PinCard({ m, i, editing }: { m: NonNullable<ReturnType<typeof metric>>; i: number; editing: boolean }) {
  if (editing) {
    return (
      <div {...stylex.props(styles.gcard, delay.ms(i * 45))}>
        <button
          type="button"
          aria-label={`Unpin ${m.name}`}
          onClick={() => setPin(m.id, false)}
          {...stylex.props(styles.unpin)}
        >
          <Sym name="minus" size={12} />
        </button>
        <PinBody m={m} />
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => goTo(`m:${m.id}`)}
      {...stylex.props(styles.gcard, styles.gcardPress, delay.ms(i * 45))}
    >
      <PinBody m={m} />
    </button>
  )
}

function PinBody({ m }: { m: NonNullable<ReturnType<typeof metric>> }) {
  const today = day(todayKey())
  const v = m.pick?.(today)
  return (
    <>
      <span {...stylex.props(styles.cap, styles.capTint(m.tint))}>
        <Sym name={m.sym} size={13} />
        {m.name}
        <span {...stylex.props(styles.chev)}>
          <Sym name="forward" size={11} />
        </span>
      </span>
      <span {...stylex.props(styles.val)}>
        {m.kind === 'rings' ? `${num(rings()[0].done)}` : valOf(m, v)}
        <s {...stylex.props(styles.unit)}>{m.kind === 'rings' ? 'kcal' : m.unit}</s>
      </span>
      <span {...stylex.props(shared.sub)}>{m.period}</span>
      <span {...stylex.props(styles.cardChart)}>
        <CardChart m={m} />
      </span>
    </>
  )
}

/** The picture inside a pin card: mini rings, last night's hypnogram, or the week's shape. */
function CardChart({ m }: { m: NonNullable<ReturnType<typeof metric>> }) {
  if (m.kind === 'rings') {
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
    return <Rings size={76} stroke={9} values={vals} />
  }
  if (m.kind === 'sleep') {
    return <Hypnogram sleep={day(todayKey()).sleep} w={160} h={40} />
  }
  if (!m.pick) return null
  const pts = series(m.pick, 'W').map((p) => p.value)
  return <Spark pts={pts} tint={m.tint} h={40} />
}
