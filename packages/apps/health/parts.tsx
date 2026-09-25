// Shared chrome pieces: the search capsule, the avatar, the trailing page
// header, stat cards, the workout row, and the two sheets - Add Data and Add
// Workout - that write straight into the book Fitness reads.

import {
  log,
  logWorkout,
  measure,
  removeWorkout,
  todayKey,
  WORKOUTS,
  type WorkoutKind
} from '@doan-labs/duo-fixtures/health.ts'
import { Button, Row, Sheet, TextField } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useState } from 'react'
import { dec1, metric, midDate, num } from './metrics.ts'
import { closeSheet, goBack, useSheet } from './store.ts'
import { styles } from './styles.ts'

/** The capsule search field the sidebar carries at its top. */
export function Find({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <div {...stylex.props(styles.sideFind)}>
      <Sym name="search" size={14} />
      <input
        type="search"
        value={query}
        placeholder="Search"
        aria-label="Search Health"
        onChange={(e) => onQuery(e.target.value)}
        {...stylex.props(styles.sideField)}
      />
    </div>
  )
}

/** The user's initial in a blue circle, the way iPadOS draws the account. */
export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return <span {...stylex.props(styles.avatar(size))}>{(name.trim()[0] ?? '?').toUpperCase()}</span>
}

/** Today's line under the big titles, the way iOS dates Summary. */
export const todayLine = () => new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })

/** The tinted square a metric carries through sidebar, lists and sheets. */
export const Mark = ({ sym, tint, size = 30 }: { sym: SymProps['name']; tint: string; size?: number }) => (
  <span {...stylex.props(styles.woGlyph(tint, size))}>
    <Sym name={sym} size={size * 0.55} />
  </span>
)

/** Average / Min / Max / Total row under a chart. */
export function StatGrid({
  avg,
  min,
  max,
  total,
  unit
}: {
  avg?: string
  min?: string
  max?: string
  total?: string
  unit: string
}) {
  const stats: [string, string | undefined][] = [
    ['Average', avg],
    ['Minimum', min],
    ['Maximum', max],
    ['Total', total]
  ]
  return (
    <div {...stylex.props(styles.statGrid)}>
      {stats.map(([cap, v]) => (
        <div key={cap} {...stylex.props(styles.stat)}>
          <div {...stylex.props(styles.statCap)}>{cap}</div>
          <div {...stylex.props(styles.statVal)}>
            {v ?? '—'}
            <span {...stylex.props(styles.unit)}>{unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** A workout in the log: kind circle, name and energy, duration and date. */
export function WorkoutRow({
  id,
  kind,
  at,
  mins,
  kcal,
  km
}: {
  id: string
  kind: WorkoutKind
  at: string
  mins: number
  kcal: number
  km?: number
}) {
  const meta = WORKOUTS[kind]
  return (
    <Row
      icon={<Mark sym="walk" tint={colors.orange} size={34} />}
      label={meta.name}
      subtitle={`${meta.paced && km ? `${dec1(km)} km · ` : ''}${mins} min`}
      detail={
        <span {...stylex.props(styles.sheetRow)}>
          {`${num(kcal)} kcal · ${midDate(at.slice(0, 10))}`}
          <Remove id={id} />
        </span>
      }
    />
  )
}

function Remove({ id }: { id: string }) {
  return (
    <button
      type="button"
      aria-label="Delete workout"
      title="Delete workout"
      onClick={(e) => {
        e.stopPropagation()
        removeWorkout(id)
      }}
      {...stylex.props(styles.iconBtn, shared.press)}
    >
      <Sym name="trash" size={13} />
    </button>
  )
}

/**
 * The Add Data sheet: a value, a day, and the metric it belongs to. `mode`
 * decides whether the amount stacks onto the day (water, steps) or replaces
 * it (a weigh-in, a reading).
 */
export function AddDataSheet() {
  const sheet = useSheet()
  const m = sheet?.metric ? metric(sheet.metric) : undefined
  return (
    <Sheet open={!!(sheet?.metric && m?.write)} onClose={closeSheet} aria-label={m ? `Add ${m.name}` : 'Add Data'}>
      {/* Keyed on the metric: a fresh form each time the sheet opens for another type. */}
      {m?.write ? <DataForm key={m.id} m={m} /> : null}
    </Sheet>
  )
}

function DataForm({ m }: { m: NonNullable<ReturnType<typeof metric>> }) {
  const [value, setValue] = useState('')
  const [day, setDay] = useState(todayKey())
  const { field, mode, step } = m.write!
  const save = () => {
    const v = Number(value)
    if (!Number.isFinite(v) || v <= 0 || day > todayKey()) return
    if (mode === 'add') log(field, v, day)
    else measure(field, v, day)
    closeSheet()
  }
  return (
    <div {...stylex.props(styles.sheetPad)}>
      <div {...stylex.props(styles.sheetRow)}>
        <Mark sym={m.sym} tint={m.tint} />
        <div>
          <div {...stylex.props(typography.headline)}>Add {m.name}</div>
          <div {...stylex.props(shared.sub)}>
            {mode === 'add' ? 'Adds onto the day’s total.' : 'Replaces the day’s reading.'}
          </div>
        </div>
      </div>
      <div {...stylex.props(styles.sheetRow)}>
        <span {...stylex.props(styles.fieldLabel)}>Amount</span>
        <TextField
          type="number"
          min="0"
          step={step}
          value={value}
          autoFocus
          placeholder={mode === 'add' ? `+${step}` : `${step}`}
          onChange={(e) => setValue((e.target as HTMLInputElement).value)}
          xstyle={styles.grow}
        />
        <span {...stylex.props(shared.sub)}>{m.unit}</span>
      </div>
      <div {...stylex.props(styles.sheetRow)}>
        <span {...stylex.props(styles.fieldLabel)}>Date</span>
        <TextField
          type="date"
          value={day}
          max={todayKey()}
          onChange={(e) => setDay((e.target as HTMLInputElement).value)}
          xstyle={styles.grow}
        />
      </div>
      <div {...stylex.props(styles.sheetBtns)}>
        <Button onClick={closeSheet}>Cancel</Button>
        <Button variant="filled" onClick={save} disabled={!(Number(value) > 0)}>
          Add
        </Button>
      </div>
    </div>
  )
}

/** Log a workout: pick a kind, give it minutes, and the store prices the rest. */
export function AddWorkoutSheet() {
  const sheet = useSheet()
  return (
    <Sheet open={!!sheet?.workout} onClose={closeSheet} aria-label="Add Workout">
      {sheet?.workout ? <WorkoutForm /> : null}
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
      <div {...stylex.props(typography.headline, styles.sheetTitle)}>Add Workout</div>
      <div {...stylex.props(styles.kindGrid)}>
        {(Object.keys(WORKOUTS) as WorkoutKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            {...stylex.props(styles.kindBtn, k === kind && styles.kindOn(colors.orange), shared.select)}
          >
            <Sym name="walk" size={18} />
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

/** The chevron button a pushed page carries at its top-left. */
export function Back() {
  return (
    <button type="button" aria-label="Back" onClick={goBack} {...stylex.props(shared.bk, shared.press)}>
      <Sym name="back" size={20} />
    </button>
  )
}

/** Header block shared by pushed pages: back chevron (cover only), title, trailing action. */
export function PageHead({ title, wide, children }: { title: ReactNode; wide?: boolean; children?: ReactNode }) {
  return (
    <div {...stylex.props(shared.hdr)}>
      {!wide && <Back />}
      {title}
      <span {...stylex.props(shared.hdrSm)}>{children}</span>
    </div>
  )
}
