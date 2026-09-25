// The metric catalog: every card, sidebar row, chart and add-data sheet reads
// the same definitions. `pick` reads a day; `log`/`measure` name the field a
// sheet writes, so a type exists exactly where data can back it.

import type { Accrued, DaySample, Measured } from '@doan-labs/duo-fixtures/health.ts'
import type { SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'

/** How a metric's detail page draws: chart kind, or one of the three own pages. */
export type Kind = 'bar' | 'line' | 'rings' | 'sleep' | 'workouts'

export type Metric = {
  id: string
  name: string
  unit: string
  sym: SymProps['name']
  tint: string
  kind: Kind
  /** The seed field behind `series`; ring and sleep pages pull their own shape. */
  pick?: (d: DaySample) => number | undefined
  /** Field a logged amount adds to (`log`) or the reading a measure sets. */
  write?: { mode: 'add'; field: Accrued; step: number } | { mode: 'set'; field: Measured; step: number }
  /** A one-line period label under the card value. */
  period?: string
  about: string
}

export const METRICS: Metric[] = [
  {
    id: 'activity',
    name: 'Activity',
    unit: '',
    sym: 'activity',
    tint: colors.pink,
    kind: 'rings',
    about: 'Move, Exercise and Stand, the rings Fitness draws too — one set of totals, one store.'
  },
  {
    id: 'steps',
    name: 'Steps',
    unit: 'steps',
    sym: 'walk',
    tint: colors.orange,
    kind: 'bar',
    pick: (d) => d.steps,
    write: { field: 'steps', mode: 'add', step: 500 },
    period: 'today',
    about: 'Every step the day counted, and the ones you log yourself.'
  },
  {
    id: 'distance',
    name: 'Walking + Running Distance',
    unit: 'km',
    sym: 'map',
    tint: colors.orange,
    kind: 'bar',
    pick: (d) => d.km,
    write: { field: 'km', mode: 'add', step: 0.5 },
    period: 'today',
    about: 'Steps on foot, wheeled or not — workouts land here too.'
  },
  {
    id: 'flights',
    name: 'Flights Climbed',
    unit: 'flights',
    sym: 'up',
    tint: colors.orange,
    kind: 'bar',
    pick: (d) => d.flights,
    write: { field: 'flights', mode: 'add', step: 1 },
    period: 'today',
    about: 'One flight is about three metres of elevation climbed.'
  },
  {
    id: 'energy',
    name: 'Active Energy',
    unit: 'kcal',
    sym: 'bolt',
    tint: colors.pink,
    kind: 'bar',
    pick: (d) => d.kcal,
    write: { field: 'kcal', mode: 'add', step: 50 },
    period: 'today',
    about: 'The Move ring’s calories: activity above resting, logged workouts included.'
  },
  {
    id: 'exercise',
    name: 'Exercise Minutes',
    unit: 'min',
    sym: 'walk',
    tint: colors.green,
    kind: 'bar',
    pick: (d) => d.exercise,
    write: { field: 'exercise', mode: 'add', step: 10 },
    period: 'today',
    about: 'Minutes at a brisk pace — the green ring counts them.'
  },
  {
    id: 'stand',
    name: 'Stand Hours',
    unit: 'hrs',
    sym: 'person',
    tint: colors.cyan,
    kind: 'bar',
    pick: (d) => d.stand,
    period: 'today',
    about: 'Hours that held at least a minute of standing, the blue ring’s measure.'
  },
  {
    id: 'heartRate',
    name: 'Heart Rate',
    unit: 'BPM',
    sym: 'heartFill',
    tint: colors.red,
    kind: 'line',
    pick: (d) => d.restingHr,
    period: 'today',
    about: 'Beats per minute across the day; the D view draws it hour by hour.'
  },
  {
    id: 'restingHr',
    name: 'Resting Heart Rate',
    unit: 'BPM',
    sym: 'heart',
    tint: colors.red,
    kind: 'line',
    pick: (d) => d.restingHr,
    write: { field: 'restingHr', mode: 'set', step: 1 },
    period: 'today',
    about: 'Your lowest rate at rest — a falling trend is the usual good news.'
  },
  {
    id: 'hrv',
    name: 'Heart Rate Variability',
    unit: 'ms',
    sym: 'gauge',
    tint: colors.purple,
    kind: 'line',
    pick: (d) => d.hrv,
    write: { field: 'hrv', mode: 'set', step: 1 },
    period: 'today',
    about: 'The wobble between beats, in milliseconds of deviation.'
  },
  {
    id: 'respiratory',
    name: 'Respiratory Rate',
    unit: 'br/min',
    sym: 'gauge',
    tint: colors.teal,
    kind: 'line',
    pick: (d) => d.respiratory,
    write: { field: 'respiratory', mode: 'set', step: 1 },
    period: 'today',
    about: 'Breaths per minute, read overnight while you sleep.'
  },
  {
    id: 'oxygen',
    name: 'Blood Oxygen',
    unit: '%',
    sym: 'aqi',
    tint: colors.blue,
    kind: 'line',
    pick: (d) => d.oxygen,
    write: { field: 'oxygen', mode: 'set', step: 1 },
    period: 'today',
    about: 'Oxygen saturation as a percentage of full.'
  },
  {
    id: 'sleep',
    name: 'Sleep',
    unit: 'hrs',
    sym: 'moonStars',
    tint: colors.indigo,
    kind: 'sleep',
    pick: (d) => d.sleep.asleep / 60,
    period: 'last night',
    about: 'Time asleep by stage — deep, core and REM — plus the window you kept.'
  },
  {
    id: 'weight',
    name: 'Weight',
    unit: 'kg',
    sym: 'person',
    tint: colors.blue,
    kind: 'line',
    pick: (d) => d.weightKg,
    write: { field: 'weightKg', mode: 'set', step: 0.1 },
    period: 'latest',
    about: 'Each weigh-in; the latest reading is the one the summary quotes.'
  },
  {
    id: 'water',
    name: 'Water',
    unit: 'ml',
    sym: 'drop',
    tint: colors.cyan,
    kind: 'bar',
    pick: (d) => d.waterMl,
    write: { field: 'waterMl', mode: 'add', step: 250 },
    period: 'today',
    about: 'What you drank, in millilitres. A glass is about 250.'
  },
  {
    id: 'mindful',
    name: 'Mindful Minutes',
    unit: 'min',
    sym: 'leaf',
    tint: colors.purple,
    kind: 'bar',
    pick: (d) => d.mindful,
    write: { field: 'mindful', mode: 'add', step: 5 },
    period: 'today',
    about: 'Minutes spent in a meditation or breathe session.'
  }
]

export const metric = (id: string) => METRICS.find((m) => m.id === id)

export type Cat = { id: string; name: string; sym: SymProps['name']; tint: string; metrics: Metric[] }
const of = (...ids: string[]) => ids.map((id) => metric(id)!)

/** iPadOS's Browse groups. `workouts` holds no metric — its page is the log itself. */
export const CATS: Cat[] = [
  {
    id: 'activity',
    name: 'Activity',
    sym: 'activity',
    tint: colors.pink,
    metrics: of('activity', 'steps', 'distance', 'flights', 'energy', 'exercise', 'stand')
  },
  { id: 'heart', name: 'Heart', sym: 'heartFill', tint: colors.red, metrics: of('heartRate', 'restingHr', 'hrv') },
  { id: 'respiratory', name: 'Respiratory', sym: 'gauge', tint: colors.teal, metrics: of('respiratory', 'oxygen') },
  { id: 'sleep', name: 'Sleep', sym: 'moonStars', tint: colors.indigo, metrics: of('sleep') },
  { id: 'body', name: 'Body Measurements', sym: 'person', tint: colors.blue, metrics: of('weight') },
  { id: 'nutrition', name: 'Nutrition', sym: 'fork', tint: colors.green, metrics: of('water') },
  { id: 'mind', name: 'Mental Wellbeing', sym: 'leaf', tint: colors.purple, metrics: of('mindful') },
  { id: 'workouts', name: 'Workouts', sym: 'walk', tint: colors.orange, metrics: [] }
]

/** Display helpers the pages share. */
export const num = (n: number) => Math.round(n).toLocaleString('en')
export const dec1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en', { minimumFractionDigits: 1 })
export const dec2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en', { minimumFractionDigits: 2 })
/** 452 minutes → "7h 32m". */
export const hm = (mins: number) => `${(mins / 60) | 0}h ${String(Math.round(mins % 60)).padStart(2, '0')}m`
/** "2026-09-24" → "24 Sep". */
export const shortDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' })
/** "2026-09-24" → "Wed, 24 Sep". */
export const midDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
/** A value formatted the way its metric's card shows it. */
export function valOf(m: Metric, v: number | undefined): string {
  if (v == null) return '—'
  if (m.id === 'distance') return dec2(v)
  if (m.id === 'weight') return dec1(v)
  if (m.id === 'sleep') return hm(v * 60)
  return num(v)
}
