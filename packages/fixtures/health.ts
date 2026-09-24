// The Health book: one module-level store Health and Fitness both read and
// write, persisted under a single localStorage key. Days the owner never
// touched are generated deterministically from their date, so the seed reads
// the same on every visit, both displays and a reinstall of neither app loses
// it; only edits land in storage. Rendering nothing, it belongs in fixtures
// rather than the UI kit.

const KEY = 'duo.health.v1'

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayKey = () => iso(new Date())
export const dayAt = (back: number) => {
  const d = new Date()
  d.setDate(d.getDate() - back)
  return iso(d)
}
export const dateOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
export const dayName = (key: string, today = todayKey()) =>
  key === today ? 'Today' : dateOf(key).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

// ---------- the record ----------

export type SleepStage = 'awake' | 'rem' | 'core' | 'deep'
export type SleepSeg = { at: number; mins: number; stage: SleepStage }
export type Sleep = {
  /** Minutes in bed and minutes actually asleep. */
  bed: number
  asleep: number
  /** "22:47" and "06:41", the book's own times. */
  bedtime: string
  wake: string
  segs: SleepSeg[]
}

export type DaySample = {
  steps: number
  km: number
  /** Active energy: the Move ring's kilocalories. */
  kcal: number
  exercise: number
  stand: number
  flights: number
  restingHr: number
  hrv: number
  respiratory: number
  oxygen: number
  waterMl: number
  mindful: number
  weightKg?: number
  sleep: Sleep
}

export type Goals = { move: number; exercise: number; stand: number }

export type Profile = {
  name: string
  born: number
  sex: 'Female' | 'Male' | 'Other' | 'Not Set'
  heightCm: number
  weightKg: number
  blood: string
  conditions: string
  meds: string
}

export type WorkoutKind = 'run' | 'cycle' | 'swim' | 'walk' | 'hike' | 'yoga' | 'strength' | 'dance' | 'other'
export type Workout = {
  id: string
  kind: WorkoutKind
  /** ISO start, local time. */
  at: string
  mins: number
  kcal: number
  km?: number
  avgHr: number
  /** Entries the owner logged by hand rather than the day's seed. */
  logged?: boolean
}

export const WORKOUTS: Record<WorkoutKind, { name: string; kcalPerMin: number; paced: boolean }> = {
  run: { name: 'Outdoor Run', kcalPerMin: 11, paced: true },
  cycle: { name: 'Outdoor Cycle', kcalPerMin: 9, paced: true },
  swim: { name: 'Pool Swim', kcalPerMin: 8, paced: true },
  walk: { name: 'Outdoor Walk', kcalPerMin: 4.5, paced: true },
  hike: { name: 'Hike', kcalPerMin: 6, paced: true },
  yoga: { name: 'Yoga', kcalPerMin: 3, paced: false },
  strength: { name: 'Functional Strength', kcalPerMin: 7, paced: false },
  dance: { name: 'Dance', kcalPerMin: 7, paced: false },
  other: { name: 'Other', kcalPerMin: 6, paced: false }
}

/** Fields that grow through the day and that `log` adds to. */
export type Accrued = 'steps' | 'km' | 'kcal' | 'exercise' | 'stand' | 'flights' | 'waterMl' | 'mindful'
/** Fields written absolutely: a morning weigh-in, a midday HR note. */
export type Measured = 'weightKg' | 'restingHr' | 'hrv' | 'oxygen' | 'respiratory'

export type Book = {
  schema: 1
  profile: Profile
  goals: Goals
  /** Metric ids pinned onto Health's Summary, in order. */
  pins: string[]
  /** Absolute overrides over the seed: a weigh-in, a corrected bedtime. */
  days: Record<string, Partial<DaySample>>
  /** What the owner logged on a date, per accrued field; always shown whole. */
  logged: Record<string, Partial<Record<Accrued, number>>>
  workouts: Workout[]
}

// ---------- deterministic history ----------

/** Per-key LCG, the same walk packages/fixtures/index.ts uses. */
function rnd(seed: string) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7) * 7919 + 13
  // biome-ignore lint/suspicious/noAssignInExpressions: an LCG advances its seed as it reads it
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}
const n = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)
const round = (v: number, p = 0) => Math.round(v * 10 ** p) / 10 ** p

/** How much of a day has happened by hour h: quiet overnight, brisk morning, evening walk. */
export function dayFrac(hour: number) {
  const h = Math.max(0, Math.min(24, hour))
  const f = (lo: number, hi: number) => Math.max(0, Math.min(1, (h - lo) / (hi - lo)))
  return 0.06 + 0.3 * f(6.5, 9.5) + 0.16 * f(11.5, 14) + 0.22 * f(16.5, 20) + 0.26 * f(20, 23.5)
}

function seedDay(key: string): DaySample {
  const r = rnd(`health.${key}`)
  const d = dateOf(key)
  const wd = d.getDay()
  const weekend = wd === 0 || wd === 6
  // The last months trend gently fitter; a rest day lands about once a week.
  const age = (Date.parse(todayKey()) - Date.parse(key)) / 86400000
  const base = 8200 - Math.min(1800, Math.max(0, age) * 14)
  const rest = r() < 0.14 ? 0.36 : 1
  const steps = Math.round(base * rest * (weekend ? n(r, 0.72, 1.28) : n(r, 0.8, 1.18)))
  const exercise = Math.max(4, Math.round(steps / 320 + (rest < 1 ? 0 : n(r, -6, 18))))
  const kcal = Math.round(steps * n(r, 0.042, 0.05) + exercise * n(r, 5.5, 7))
  const stand = Math.min(14, Math.max(5, Math.round(n(r, 7, 13) * (rest < 1 ? 0.7 : 1))))
  const flights = Math.max(2, Math.round(steps / 700 + n(r, 0, 6)))
  const restingHr = Math.round(n(r, 54, 63) + Math.min(6, Math.max(0, age) / 24))
  const hrv = Math.round(n(r, 30, 58) - (rest < 1 ? 4 : 0))
  const respiratory = round(n(r, 12.2, 15.8), 1)
  const oxygen = Math.round(n(r, 96.2, 99.6))
  const waterMl = Math.round(n(r, 900, 2300) / 50) * 50
  const mindful = r() < 0.42 ? Math.round(n(r, 5, 20)) : 0
  const weightKg = round(72.4 - Math.min(1.8, Math.max(0, age) * 0.014) + n(r, -0.4, 0.4), 1)

  // Sleep: the night that ends on this date, in cycles with a deep stretch
  // early and REM late, a short waking or two between.
  const bedM = weekend ? n(r, 1410, 1455) : n(r, 1350, 1430)
  const asleep = Math.round(n(r, 330, 520) * (weekend ? 1.06 : 1))
  const sleepMin = (m: number) => {
    const v = Math.round(m)
    return `${String(Math.floor((v / 60) % 24)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
  }
  const segs: SleepSeg[] = []
  let at = Math.round(n(r, 6, 22))
  const parts: [SleepStage, number][] = [
    ['core', n(r, 55, 85)],
    ['deep', n(r, 34, 58)],
    ['core', n(r, 45, 70)],
    ['rem', n(r, 26, 44)],
    ['awake', n(r, 3, 9)],
    ['core', n(r, 40, 60)],
    ['deep', n(r, 12, 26)],
    ['rem', n(r, 22, 40)],
    ['awake', n(r, 4, 12)],
    ['core', n(r, 30, 55)]
  ]
  const scale = asleep / parts.reduce((a, [, m]) => a + m, 0)
  for (const [stage, m] of parts) {
    segs.push({ at, mins: Math.max(4, Math.round(m * scale)), stage })
    at += segs.at(-1)!.mins
  }
  const bed = at + Math.round(n(r, 5, 16))
  return {
    steps,
    km: round(steps * n(r, 0.00072, 0.00082), 2),
    kcal,
    exercise,
    stand,
    flights,
    restingHr,
    hrv,
    respiratory,
    oxygen,
    waterMl,
    mindful,
    weightKg,
    sleep: {
      bed,
      asleep,
      bedtime: sleepMin(bedM),
      wake: sleepMin(bedM + bed),
      segs
    }
  }
}

const DEFAULT_PROFILE: Profile = {
  name: 'Minh',
  born: 1998,
  sex: 'Not Set',
  heightCm: 172,
  weightKg: 72.4,
  blood: 'O+',
  conditions: 'None',
  meds: 'None'
}
const DEFAULT_PINS = ['activity', 'steps', 'heartRate', 'sleep', 'energy', 'weight']

const seedWorkouts = (): Workout[] => {
  const kinds: WorkoutKind[] = ['run', 'walk', 'cycle', 'yoga', 'swim', 'strength', 'hike']
  const out: Workout[] = []
  let back = 1
  while (out.length < 16 && back < 60) {
    const key = dayAt(back)
    const r = rnd(`workout.${key}`)
    if (r() < 0.42) {
      const kind = kinds[Math.floor(r() * kinds.length)]!
      const mins = Math.round(n(r, 22, 64))
      const w = WORKOUTS[kind]
      out.push({
        id: `w-${key}`,
        kind,
        at: `${key}T${String(Math.round(n(r, 6.5, 19))).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00`,
        mins,
        kcal: Math.round(mins * w.kcalPerMin * n(r, 0.9, 1.15)),
        km: w.paced ? round((mins / 60) * n(r, 6, 16), 2) : undefined,
        avgHr: Math.round(n(r, 118, 152))
      })
    }
    back++
  }
  return out
}

const seed = (): Book => ({
  schema: 1,
  profile: DEFAULT_PROFILE,
  goals: { move: 620, exercise: 30, stand: 12 },
  pins: DEFAULT_PINS,
  days: {},
  logged: {},
  workouts: seedWorkouts()
})

// ---------- the store ----------

let book: Book = (() => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Book
      if (v.schema === 1) return v
    }
  } catch {}
  const fresh = seed()
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh))
  } catch {}
  return fresh
})()

const subs = new Set<() => void>()
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(book))
  } catch {}
}
const set = (next: Book) => {
  book = next
  persist()
  for (const fn of subs) fn()
}

export const healthStore = {
  subscribe: (fn: () => void) => {
    subs.add(fn)
    return () => subs.delete(fn)
  },
  get: () => book,
  /** A no-op notification so views re-read values the clock itself advanced. */
  poke: () => {
    for (const fn of subs) fn()
  }
}

/** The fraction of a seeded day that has happened when `key` is today; whole days otherwise. */
const accrue = (key: string, s: DaySample): DaySample => {
  if (key !== todayKey()) return s
  const f = dayFrac(new Date().getHours() + new Date().getMinutes() / 60)
  const lg = book.logged[key] ?? {}
  const grown = (seeded: number, field: Accrued, rate = 1) =>
    Math.round(seeded * Math.min(1, f * rate) + (lg[field] ?? 0))
  return {
    ...s,
    steps: grown(s.steps, 'steps'),
    km: round(s.km * f + (lg.km ?? 0), 2),
    kcal: grown(s.kcal, 'kcal'),
    exercise: grown(s.exercise, 'exercise'),
    stand: grown(s.stand, 'stand', 1.12),
    flights: grown(s.flights, 'flights'),
    waterMl: grown(s.waterMl, 'waterMl', 1.2),
    mindful: grown(s.mindful, 'mindful')
  }
}

/** The sample for a date: overrides over the seed, accrued while it is still today. */
export const day = (key: string): DaySample => accrue(key, { ...seedDay(key), ...book.days[key] } as DaySample)

/** What the owner logged on a date that accrual has not reached: shown whole. */
const logged = (key: string) => book.logged[key] ?? {}

const writeOverride = (key: string, patch: Partial<DaySample>) =>
  set({ ...book, days: { ...book.days, [key]: { ...book.days[key], ...patch } } })

const writeLogged = (key: string, field: Accrued, amount: number) =>
  set({
    ...book,
    logged: { ...book.logged, [key]: { ...logged(key), [field]: Math.max(0, (logged(key)[field] ?? 0) + amount) } }
  })

/** `log('waterMl', 250)` records another 250 ml today, on top of whatever the day seeded. */
export const log = (field: Accrued, amount: number, key = todayKey()) => writeLogged(key, field, Math.round(amount))

export const measure = (field: Measured, value: number, key = todayKey()) => writeOverride(key, { [field]: value })

export function logWorkout(w: Omit<Workout, 'id' | 'logged' | 'avgHr'> & { avgHr?: number }) {
  const id = `w-${Date.now().toString(36)}`
  const avgHr = w.avgHr ?? Math.round(110 + WORKOUTS[w.kind].kcalPerMin * 4.5)
  const key = w.at.slice(0, 10)
  const lg = logged(key)
  set({
    ...book,
    logged: {
      ...book.logged,
      [key]: {
        ...lg,
        kcal: (lg.kcal ?? 0) + w.kcal,
        exercise: (lg.exercise ?? 0) + w.mins,
        km: round((lg.km ?? 0) + (w.km ?? 0), 2)
      }
    },
    workouts: [{ ...w, avgHr, id, logged: true }, ...book.workouts].sort((a, b) => b.at.localeCompare(a.at))
  })
  return id
}

export function removeWorkout(id: string) {
  const w = book.workouts.find((v) => v.id === id)
  if (!w) return
  const key = w.at.slice(0, 10)
  const lg = logged(key)
  set({
    ...book,
    logged: {
      ...book.logged,
      [key]: {
        ...lg,
        kcal: Math.max(0, (lg.kcal ?? 0) - w.kcal),
        exercise: Math.max(0, (lg.exercise ?? 0) - w.mins),
        km: Math.max(0, round((lg.km ?? 0) - (w.km ?? 0), 2))
      }
    },
    workouts: book.workouts.filter((v) => v.id !== id)
  })
}

export const setGoals = (goals: Goals) => set({ ...book, goals })
export const setPin = (id: string, on: boolean) =>
  set({ ...book, pins: on ? [...book.pins, id] : book.pins.filter((p) => p !== id) })
export const movePin = (id: string, dir: -1 | 1) => {
  const pins = [...book.pins]
  const i = pins.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= pins.length) return
  ;[pins[i], pins[j]] = [pins[j]!, pins[i]!]
  set({ ...book, pins })
}
export const setProfile = (patch: Partial<Profile>) => set({ ...book, profile: { ...book.profile, ...patch } })

// ---------- rings, series, trends ----------

/** The three rings for a date, as Fitness draws them and Health lists them. */
export const rings = (key = todayKey()) => {
  const d = day(key)
  const g = book.goals
  return [
    { id: 'move', label: 'Move', done: d.kcal, goal: g.move, unit: 'KCAL' },
    { id: 'exercise', label: 'Exercise', done: d.exercise, goal: g.exercise, unit: 'MIN' },
    { id: 'stand', label: 'Stand', done: d.stand, goal: g.stand, unit: 'HRS' }
  ] as const
}

export type Range = 'D' | 'W' | 'M' | '6M' | 'Y'
export type Point = { key: string; label: string; value: number }

const monthName = (key: string) => dateOf(key).toLocaleDateString('en', { month: 'short' })

/**
 * A chart's points over a range: daily totals for W and M, weekly averages for
 * 6M, monthly averages for Y. D is today's own shape, hour by hour, for the
 * metrics that accrue one.
 */
export function series(pick: (d: DaySample) => number | undefined, range: Range): Point[] {
  if (range === 'D') {
    const key = todayKey()
    const s = day(key)
    const v = pick(s)
    if (v == null) return []
    const out: Point[] = []
    for (let h = 0; h < 24; h += 2) {
      const a = dayFrac(h)
      const b = dayFrac(h + 2)
      out.push({ key: `${h}`, label: `${h}`, value: Math.max(0, Math.round(v * (b - a))) })
    }
    return out
  }
  const days = range === 'W' ? 7 : range === 'M' ? 30 : range === '6M' ? 182 : 366
  if (range === 'W' || range === 'M') {
    const out: Point[] = []
    for (let i = days - 1; i >= 0; i--) {
      const key = dayAt(i)
      const v = pick(day(key))
      if (v != null) out.push({ key, label: dayName(key), value: v })
    }
    return out
  }
  if (range === '6M') {
    const out: Point[] = []
    for (let end = days - 1; end >= 0; end -= 7) {
      const span = Math.min(7, end + 1)
      let sum = 0
      let c = 0
      for (let i = 0; i < span; i++) {
        const v = pick(day(dayAt(end - i)))
        if (v != null) {
          sum += v
          c++
        }
      }
      out.push({
        key: dayAt(end - span + 1),
        label: dayName(dayAt(end - span + 1)),
        value: c ? Math.round(sum / c) : 0
      })
    }
    return out.reverse()
  }
  // The year as twelve calendar months, oldest first.
  const months = new Map<string, { sum: number; c: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const key = dayAt(i)
    const mk = key.slice(0, 7)
    const v = pick(day(key))
    if (v == null) continue
    const m = months.get(mk) ?? { sum: 0, c: 0 }
    m.sum += v
    m.c++
    months.set(mk, m)
  }
  return [...months]
    .slice(-12)
    .map(([mk, m]) => ({ key: `${mk}-01`, label: monthName(`${mk}-01`), value: Math.round(m.sum / m.c) }))
}

export function statOf(pick: (d: DaySample) => number | undefined, range: Range) {
  const pts = series(pick, range === 'D' ? 'W' : range)
  const vals = pts.map((p) => p.value).filter((v) => v > 0)
  if (!vals.length) return { avg: 0, min: 0, max: 0, total: 0, latest: 0 }
  return {
    avg: vals.reduce((a, v) => a + v, 0) / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    total: vals.reduce((a, v) => a + v, 0),
    latest: pts.at(-1)?.value ?? 0
  }
}

/** This month's daily average against the one before: what Apple's Trends arrow reports. */
export function trend(pick: (d: DaySample) => number | undefined) {
  const a = statOf(pick, 'M').avg
  let sum = 0
  let c = 0
  for (let i = 30; i < 60; i++) {
    const v = pick(day(dayAt(i)))
    if (v != null && v > 0) {
      sum += v
      c++
    }
  }
  const prev = c ? sum / c : 0
  if (!a || !prev) return { dir: 0 as const, pct: 0 }
  const pct = Math.round(((a - prev) / prev) * 100)
  return { dir: Math.sign(pct) as -1 | 0 | 1, pct: Math.abs(pct) }
}

const ringsClosed = (key: string) => {
  const [m, e, s] = rings(key)
  return m.done >= m.goal && e.done >= e.goal && s.done >= s.goal
}

export { ringsClosed }

/** Days in a row, counting back from today, that closed all three rings. */
export function streak() {
  let s = 0
  for (let i = 0; i < 400; i++) {
    if (ringsClosed(dayAt(i))) s++
    else break
  }
  return s
}

export type Award = { id: string; name: string; detail: string; earned: boolean; progress: number; of: number }
export function awards(): Award[] {
  const w = book.workouts.length
  const s = streak()
  const maxMove = Math.max(0, ...Array.from({ length: 60 }, (_, i) => day(dayAt(i)).kcal))
  const longest = book.workouts.reduce((a, v) => Math.max(a, v.km ?? 0), 0)
  const weekW = book.workouts.filter((v) => Date.parse(v.at) > Date.now() - 7 * 86400000).length
  return [
    {
      id: 'first',
      name: 'First Workout',
      detail: 'Record your first workout.',
      earned: w > 0,
      progress: Math.min(1, w),
      of: 1
    },
    {
      id: 'streak7',
      name: '7-Day Streak',
      detail: 'Close all three rings seven days in a row.',
      earned: s >= 7,
      progress: s,
      of: 7
    },
    {
      id: 'double',
      name: 'Double Move',
      detail: `Burn twice your Move goal in a day (${book.goals.move * 2} kcal).`,
      earned: maxMove >= book.goals.move * 2,
      progress: maxMove,
      of: book.goals.move * 2
    },
    {
      id: 'week3',
      name: 'Three-a-Week',
      detail: 'Log three workouts inside one week.',
      earned: weekW >= 3,
      progress: weekW,
      of: 3
    },
    {
      id: 'long10',
      name: 'Long Haul',
      detail: 'One workout covering 10 km or more.',
      earned: longest >= 10,
      progress: Math.round(longest * 10) / 10,
      of: 10
    }
  ]
}

/** Hourly heart-rate shape for a date: resting baseline, commute bumps, evening exercise. */
export function heartRateDay(key = todayKey()): number[] {
  const s = day(key)
  const out: number[] = []
  for (let h = 0; h < 24; h++) {
    const r = rnd(`hr.${key}.${h}`)
    const exert = h >= 7 && h <= 9 ? 18 : h >= 12 && h <= 13 ? 12 : h >= 17 && h <= 20 ? 22 : h >= 22 || h <= 5 ? -8 : 0
    out.push(Math.round(Math.max(48, s.restingHr + exert + r() * 9 - 4)))
  }
  return out
}
