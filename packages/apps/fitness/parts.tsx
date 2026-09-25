// Shared pieces: the workout row with its kind glyph, the week's bars, the
// mini rings a history row carries, and the two sheets - Add Workout and
// Change Goals, which write into the shared book Health reads.

import {
  logWorkout,
  type Point,
  removeWorkout,
  rings,
  setGoals,
  todayKey,
  WORKOUTS,
  type Workout,
  type WorkoutKind
} from '@doan-labs/duo-fixtures/health.ts'
import { Button, Sheet, TextField } from '@doan-labs/duo-uikit'
import { RING_TINTS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { delay, shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { closeSheet, goBack, pathNow, useBook, useSheet } from './store.ts'
import { styles } from './styles.ts'

/** A glyph per kind - the nearest SYMs, since the kit has no sport set. */
export const KINDSYM: Record<WorkoutKind, SymProps['name']> = {
  run: 'bolt',
  cycle: 'map',
  swim: 'drop',
  walk: 'walk',
  hike: 'map',
  yoga: 'leaf',
  strength: 'gauge',
  dance: 'star',
  other: 'activity'
}

export const num = (n: number) => Math.round(n).toLocaleString('en')
export const dec1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en', { minimumFractionDigits: 1 })
export const midDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
/** "18:42" from the workout's ISO `at`. */
export const hmAt = (at: string) => at.slice(11, 16)

/** One workout in the log, dark-card row: glyph, name and stats, kcal right. */
export function WoRow({ w, open }: { w: Workout; open: (w: Workout) => void }) {
  const meta = WORKOUTS[w.kind]
  return (
    <button type="button" onClick={() => open(w)} {...stylex.props(styles.dcard, styles.dcardBtn, styles.woRow)}>
      <span {...stylex.props(styles.woGlyph(colors.orange, 36))}>
        <Sym name={KINDSYM[w.kind]} size={18} />
      </span>
      <span>
        <div {...stylex.props(styles.woName)}>{meta.name}</div>
        <div {...stylex.props(styles.woSub)}>
          {midDate(w.at.slice(0, 10))} · {hmAt(w.at)}
        </div>
      </span>
      <span {...stylex.props(styles.woRight)}>
        <span>
          <div {...stylex.props(styles.woName)}>{num(w.kcal)} kcal</div>
          <div {...stylex.props(styles.woSub)}>
            {w.mins} min{meta.paced && w.km ? ` · ${dec1(w.km)} km` : ''}
          </div>
        </span>
        <span {...stylex.props(shared.sub)}>
          <Sym name="forward" size={12} />
        </span>
      </span>
    </button>
  )
}

/** The weekly bars Move/Exercise/Stand get under their own tint. */
export function WeekBars({ pts, tint, goal }: { pts: Point[]; tint: string; goal?: number }) {
  const max = Math.max(goal ?? 0, ...pts.map((p) => p.value)) * 1.08 || 1
  const W = 340
  const H = 120
  const bw = W / pts.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      {pts.map((p, i) => {
        const h = Math.max(1.5, (p.value / max) * H)
        return (
          <rect
            key={p.key}
            x={i * bw + bw * 0.2}
            y={H - h}
            width={Math.max(1.5, bw * 0.6)}
            height={h}
            rx={Math.min(4, bw * 0.2)}
            {...stylex.props(styles.barGrow(tint), delay.ms(i * 30))}
          />
        )
      })}
      {goal != null && (
        <line x1={0} x2={W} y1={H - (goal / max) * H} y2={H - (goal / max) * H} {...stylex.props(styles.goalLine)} />
      )}
      {pts.map((p, i) => (
        <text key={`l${p.key}`} x={i * bw + bw / 2} y={H + 14} textAnchor="middle" {...stylex.props(styles.axis)}>
          {p.key === todayKey() ? 'Now' : p.label.slice(0, 3)}
        </text>
      ))}
    </svg>
  )
}

/** Small rings for a history row: the day's totals drawn at 46 px. */
export function MiniRings({ forKey }: { forKey: string }) {
  const rs = rings(forKey)
  return (
    <Rings
      size={46}
      stroke={6}
      values={[
        ['Move', RING_TINTS.move, rs[0].done, rs[0].goal, ''],
        ['Exercise', RING_TINTS.exercise, rs[1].done, rs[1].goal, ''],
        ['Stand', RING_TINTS.stand, rs[2].done, rs[2].goal, '']
      ]}
    />
  )
}

/** Add Workout: kind grid, minutes, distance for paced kinds, energy. */
export function AddWorkoutSheet() {
  const sheet = useSheet()
  return (
    <Sheet open={sheet === 'workout'} onClose={closeSheet} aria-label="Add Workout">
      {sheet === 'workout' ? <WorkoutForm /> : null}
    </Sheet>
  )
}

function WorkoutForm() {
  const [kind, setKind] = useState<WorkoutKind>('run')
  const [mins, setMins] = useState('30')
  const [km, setKm] = useState('')
  const [kcal, setKcal] = useState('')
  const meta = WORKOUTS[kind]
  const minutes = Math.max(0, Number(mins) || 0)
  const energy = kcal ? Number(kcal) : Math.round(minutes * meta.kcalPerMin)
  const save = () => {
    if (!minutes || !energy) return
    const dist = meta.paced ? Number(km) || 0 : undefined
    logWorkout({
      kind,
      at: `${todayKey()}T${new Date().toTimeString().slice(0, 5)}:00`,
      mins: minutes,
      kcal: energy,
      km: dist
    })
    closeSheet()
  }
  return (
    <div {...stylex.props(styles.sheetPad)}>
      <div {...stylex.props(typography.headline)}>Add Workout</div>
      <div {...stylex.props(styles.kindGrid)}>
        {(Object.keys(WORKOUTS) as WorkoutKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            {...stylex.props(styles.kindBtn, k === kind && styles.kindOn(colors.orange), shared.select)}
          >
            <Sym name={KINDSYM[k]} size={18} />
            {WORKOUTS[k].name}
          </button>
        ))}
      </div>
      <div {...stylex.props(styles.sheetRow)}>
        <span {...stylex.props(styles.fieldLabel)}>Minutes</span>
        <TextField
          type="number"
          min="1"
          value={mins}
          onChange={(e) => setMins((e.target as HTMLInputElement).value)}
          xstyle={styles.grow}
        />
      </div>
      {meta.paced && (
        <div {...stylex.props(styles.sheetRow)}>
          <span {...stylex.props(styles.fieldLabel)}>Distance</span>
          <TextField
            type="number"
            min="0"
            step={0.1}
            value={km}
            placeholder="km"
            onChange={(e) => setKm((e.target as HTMLInputElement).value)}
            xstyle={styles.grow}
          />
        </div>
      )}
      <div {...stylex.props(styles.sheetRow)}>
        <span {...stylex.props(styles.fieldLabel)}>Energy</span>
        <TextField
          type="number"
          min="0"
          value={kcal}
          placeholder={`${energy} kcal`}
          onChange={(e) => setKcal((e.target as HTMLInputElement).value)}
          xstyle={styles.grow}
        />
      </div>
      <div {...stylex.props(styles.sheetBtns)}>
        <Button onClick={closeSheet}>Cancel</Button>
        <Button variant="filled" onClick={save} disabled={!minutes}>
          Save
        </Button>
      </div>
    </div>
  )
}

/** Change Goals: steppers for the three rings; Health's pages follow immediately. */
export function GoalsSheet() {
  const sheet = useSheet()
  const book = useBook()
  return (
    <Sheet open={sheet === 'goals'} onClose={closeSheet} aria-label="Change goals">
      {sheet === 'goals' ? <GoalsForm book={book} /> : null}
    </Sheet>
  )
}

function GoalsForm({ book }: { book: ReturnType<typeof useBook> }) {
  const [draft, setDraft] = useState(book.goals)
  const bump = (k: keyof typeof draft, d: number) => setDraft((g) => ({ ...g, [k]: Math.max(1, g[k] + d) }))
  const rows: { id: keyof typeof draft; label: string; tint: string; unit: string; step: number }[] = [
    { id: 'move', label: 'Move', tint: RING_TINTS.move, unit: 'kcal', step: 10 },
    { id: 'exercise', label: 'Exercise', tint: RING_TINTS.exercise, unit: 'min', step: 5 },
    { id: 'stand', label: 'Stand', tint: RING_TINTS.stand, unit: 'hrs', step: 1 }
  ]
  return (
    <div {...stylex.props(styles.sheetPad)}>
      <div {...stylex.props(typography.headline)}>Daily Goals</div>
      {rows.map((r) => (
        <div key={r.id} {...stylex.props(styles.sheetRow)}>
          <span {...stylex.props(styles.dot(r.tint))} />
          <span {...stylex.props(styles.fieldLabel)}>{r.label}</span>
          <button
            type="button"
            aria-label={`Less ${r.label}`}
            onClick={() => bump(r.id, -r.step)}
            {...stylex.props(styles.stepper, shared.press)}
          >
            −
          </button>
          <span {...stylex.props(styles.val)}>{draft[r.id]}</span>
          <span {...stylex.props(shared.sub)}>{r.unit}</span>
          <button
            type="button"
            aria-label={`More ${r.label}`}
            onClick={() => bump(r.id, r.step)}
            {...stylex.props(styles.stepper, shared.press)}
          >
            +
          </button>
        </div>
      ))}
      <div {...stylex.props(styles.sheetBtns)}>
        <Button onClick={closeSheet}>Cancel</Button>
        <Button
          variant="filled"
          onClick={() => {
            setGoals(draft)
            closeSheet()
          }}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

/** Trash glyph ending a workout row or a workout's page. */
export function RemoveWorkout({ id }: { id: string }) {
  return (
    <button
      type="button"
      aria-label="Delete workout"
      title="Delete workout"
      onClick={(e) => {
        e.stopPropagation()
        removeWorkout(id)
        // If the deleted workout's page is open, pop it.
        if (pathNow().at(-1) === `w:${id}`) goBack()
      }}
      {...stylex.props(styles.iconBtn, shared.press)}
    >
      <Sym name="trash" size={13} />
    </button>
  )
}
