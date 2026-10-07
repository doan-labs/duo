// Trip Planner domain model: trips hold a date range, ordered stops pinned to
// day indexes inside that range, transport legs, stays and a packing list.
// Dates are plain `YYYY-MM-DD` strings - local calendar days, not instants -
// so every rule in this file is a pure function and the tests can cover the
// local-date edges (leap days, month/year rollovers, DST-shaped gaps) without
// a clock.

export type LegKind = 'flight' | 'train' | 'drive' | 'bus' | 'ferry' | 'walk' | 'other'

export type Stop = {
  id: string
  /** Index into the trip's days; -1 means "Later" (unscheduled). */
  day: number
  title: string
  /** 'HH:MM' 24-hour or null when the stop has no set time. */
  time: string | null
  address: string
  notes: string
}

export type Leg = {
  id: string
  kind: LegKind
  from: string
  to: string
  /** Travel day, 'YYYY-MM-DD' or null when unset. */
  date: string | null
  /** 'HH:MM' 24-hour times, either may be null. */
  depart: string | null
  arrive: string | null
  ref: string
  notes: string
}

export type Stay = {
  id: string
  name: string
  address: string
  checkIn: string | null
  checkOut: string | null
  notes: string
}

export type PackItem = { id: string; label: string; done: boolean }

export type Trip = {
  id: string
  name: string
  start: string
  end: string
  notes: string
  createdAt: number
  stops: Stop[]
  legs: Leg[]
  stays: Stay[]
  packing: PackItem[]
}

/** order = the trip list's arrangement; trips keyed by id. */
export type Library = { order: string[]; trips: Trip[] }

export const newLibrary = (): Library => ({ order: [], trips: [] })

// --- dates -----------------------------------------------------------------

export const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/* `new Date(y, m, d)` and `Date.UTC(y, ...)` coerce years 0-99 onto
 * 1900-1999; setFullYear/setUTCFullYear take the literal year. The math stays
 * correct even for inputs like '0050-01-01' before validDate rejects them. */
const localDay = (y: number, m: number, d: number) => {
  const t = new Date(0)
  t.setFullYear(y, m, d)
  t.setHours(0, 0, 0, 0)
  return t
}
const utcMs = (y: number, m: number, d: number) => {
  const t = new Date(0)
  t.setUTCFullYear(y, m, d)
  t.setUTCHours(0, 0, 0, 0)
  return t.getTime()
}
const daysInMonth = (y: number, m: number) => localDay(y, m, 0).getDate()

/** Strict calendar validation: a real month/day combination, leap-aware.
 * Years below 100 are refused: the JS Date constructor maps them onto
 * 1900-1999 and the editor's native date field cannot express them anyway. */
export function validDate(s: string): boolean {
  const m = DATE_RE.exec(s)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  return y >= 100 && mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo)
}

/** 'YYYY-MM-DD' for a Date in its LOCAL calendar day - the user's "today". */
export function dateISO(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => dateISO(new Date())

/** Add `n` calendar days to an ISO date. Local-day math keeps DST edges out. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return dateISO(localDay(y!, m! - 1, d! + n))
}

/** Whole days between two ISO dates. UTC component math, immune to DST. */
export function diffDays(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((utcMs(yb!, mb! - 1, db!) - utcMs(ya!, ma! - 1, da!)) / 86_400_000)
}

/** Days covered by the range, inclusive. 0 when the range is invalid. */
export const dayCount = (t: Trip) => Math.max(0, diffDays(t.start, t.end) + 1)

/** ISO date of day index `i` (0-based) in the trip. */
export const dayDate = (t: Trip, i: number) => addDays(t.start, i)

/**
 * Longest span a trip may cover: one year including its leap day. Enforced at
 * save (visible validation) and again in readTrip so a torn or hostile record
 * can never force a day-strip allocation in the millions.
 */
export const MAX_TRIP_DAYS = 366

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'Tue, Oct 7' from an ISO date, locale-free and deterministic. */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const w = new Date(utcMs(y!, m! - 1, d!)).getUTCDay()
  return `${WEEKDAYS[w]}, ${MONTHS[m! - 1]} ${d}`
}

/** 'Oct 7' without the weekday, for compact rows. */
export function shortDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m! - 1]} ${d}`
}

/** 'Mar 4 - 9' / 'Dec 28 - Jan 3' style range text. */
export function rangeLabel(start: string, end: string): string {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  if (sy === ey && sm === em) return `${shortDay(start)} - ${Number(end.split('-')[2])}`
  return `${shortDay(start)} - ${shortDay(end)}`
}

export type TripStatus = 'ongoing' | 'upcoming' | 'past'

export function tripStatus(t: Trip, today: string): TripStatus {
  if (diffDays(today, t.start) > 0) return 'upcoming'
  if (diffDays(t.end, today) > 0) return 'past'
  return 'ongoing'
}

/** Day index containing `today`, or null when the trip is not running. */
export function todayIndex(t: Trip, today: string): number | null {
  const i = diffDays(t.start, today)
  return i >= 0 && i < dayCount(t) ? i : null
}

// --- times -----------------------------------------------------------------

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

/** Normalize 'H:MM'/'HH:MM' to 'HH:MM', or null when the text is not a time. */
export function parseTime(s: string): string | null {
  const m = TIME_RE.exec(s.trim())
  if (!m) return null
  return `${m[1]!.padStart(2, '0')}:${m[2]}`
}

/** '13:05' -> '1:05 PM'. Empty input stays empty. */
export function timeLabel(s: string | null): string {
  if (!s) return ''
  const [h, m] = s.split(':').map(Number)
  const am = h! < 12
  const hour = h! % 12 === 0 ? 12 : h! % 12
  return `${hour}:${m!.toString().padStart(2, '0')} ${am ? 'AM' : 'PM'}`
}

// --- ids -------------------------------------------------------------------

let serial = 0
/** Short unique id; callers may pass their own for deterministic tests. */
export const newId = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `id${serial++}`)

// --- field clamps ------------------------------------------------------------

export const LEG_KINDS: readonly LegKind[] = ['flight', 'train', 'drive', 'bus', 'ferry', 'walk', 'other'] as const
export const legKind = (v: unknown): LegKind =>
  typeof v === 'string' && (LEG_KINDS as readonly string[]).includes(v) ? (v as LegKind) : 'other'
export const legKindLabel = (k: LegKind) =>
  k === 'flight'
    ? 'Flight'
    : k === 'train'
      ? 'Train'
      : k === 'drive'
        ? 'Drive'
        : k === 'bus'
          ? 'Bus'
          : k === 'ferry'
            ? 'Ferry'
            : k === 'walk'
              ? 'Walk'
              : 'Other'

export const clampDay = (t: Trip, day: number) => {
  const n = dayCount(t)
  if (day < -1) return -1
  return Math.min(day, n - 1)
}

/** The stops of one day in their stored (manual) order. */
export const stopsForDay = (t: Trip, day: number) => t.stops.filter((s) => s.day === day)
export const unscheduled = (t: Trip) => stopsForDay(t, -1)

export const packProgress = (t: Trip) => {
  const done = t.packing.filter((p) => p.done).length
  return { done, total: t.packing.length }
}

// --- library ops -------------------------------------------------------------
// Every op returns a NEW Library (and the touched records where callers need
// them for undo). No mutation: the UI diffs old vs new for motion.

export const getTrip = (lib: Library, id: string | undefined) => lib.trips.find((t) => t.id === id)

const replaceTrip = (lib: Library, trip: Trip): Library => ({
  order: lib.order,
  trips: lib.trips.map((t) => (t.id === trip.id ? trip : t))
})

export function addTrip(
  lib: Library,
  fields: { name: string; start: string; end: string; notes?: string },
  at: number,
  id = newId()
): { lib: Library; trip: Trip } {
  const trip: Trip = {
    id,
    name: fields.name.trim(),
    start: fields.start,
    end: fields.end,
    notes: (fields.notes ?? '').trim(),
    createdAt: at,
    stops: [],
    legs: [],
    stays: [],
    packing: []
  }
  return { lib: { order: [...lib.order, id], trips: [...lib.trips, trip] }, trip }
}

/** Insert a trip object back (undo of a delete) at the same list position. */
export function restoreTrip(lib: Library, trip: Trip, index: number): Library {
  const at = Math.max(0, Math.min(index, lib.order.length))
  const order = [...lib.order]
  const trips = [...lib.trips]
  order.splice(at, 0, trip.id)
  trips.splice(at, 0, { ...trip, stops: [...trip.stops] })
  return { order, trips }
}

export function updateTrip(
  lib: Library,
  id: string,
  patch: { name?: string; start?: string; end?: string; notes?: string }
): Library {
  const trip = getTrip(lib, id)
  if (!trip) return lib
  const next: Trip = {
    ...trip,
    name: patch.name !== undefined ? patch.name.trim() : trip.name,
    start: patch.start ?? trip.start,
    end: patch.end ?? trip.end,
    notes: patch.notes !== undefined ? patch.notes.trim() : trip.notes
  }
  // Stops keep their calendar dates: rebase each stored day index by the
  // start delta. A stop pushed outside the new range parks in "Later" (-1),
  // which matches the fixed-date legs/stays and the documented shrink rule.
  const delta = diffDays(trip.start, next.start)
  const n = dayCount(next)
  next.stops = trip.stops.map((s) => {
    if (s.day < 0) return s
    const d = s.day - delta
    return d >= 0 && d < n ? (d === s.day ? s : { ...s, day: d }) : { ...s, day: -1 }
  })
  return replaceTrip(lib, next)
}

export function removeTrip(lib: Library, id: string): { lib: Library; trip: Trip | undefined; index: number } {
  const index = lib.order.indexOf(id)
  const trip = getTrip(lib, id)
  return {
    lib: { order: lib.order.filter((i) => i !== id), trips: lib.trips.filter((t) => t.id !== id) },
    trip,
    index
  }
}

// --- stops -------------------------------------------------------------------

export function addStop(
  lib: Library,
  tripId: string,
  fields: { day: number; title: string; time?: string | null; address?: string; notes?: string },
  id = newId()
): { lib: Library; stop: Stop } | null {
  const trip = getTrip(lib, tripId)
  const title = fields.title.trim()
  if (!trip || !title) return null
  const stop: Stop = {
    id,
    day: clampDay(trip, fields.day),
    title,
    time: fields.time ?? null,
    address: (fields.address ?? '').trim(),
    notes: (fields.notes ?? '').trim()
  }
  const dayStops = stopsForDay(trip, stop.day)
  // Untimed stops append to the day's list. A timed stop slots in before the
  // first same-day stop with a later time, so the timeline reads chronology
  // unless the user reorders it by hand in Arrange.
  const nextTimed = stop.time ? dayStops.find((s) => s.time !== null && s.time > stop.time!) : undefined
  const insertAt = nextTimed
    ? trip.stops.indexOf(nextTimed)
    : dayStops.length
      ? trip.stops.indexOf(dayStops.at(-1)!) + 1
      : trip.stops.length
  const stops = [...trip.stops]
  stops.splice(insertAt, 0, stop)
  return { lib: replaceTrip(lib, { ...trip, stops }), stop }
}

export function updateStop(lib: Library, tripId: string, stopId: string, patch: Partial<Omit<Stop, 'id'>>): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  const stops = trip.stops.map((s) =>
    s.id === stopId
      ? {
          ...s,
          title: patch.title !== undefined ? patch.title.trim() : s.title,
          time: patch.time !== undefined ? patch.time : s.time,
          address: patch.address !== undefined ? patch.address.trim() : s.address,
          notes: patch.notes !== undefined ? patch.notes.trim() : s.notes
        }
      : s
  )
  return replaceTrip(lib, { ...trip, stops })
}

export function removeStop(
  lib: Library,
  tripId: string,
  stopId: string
): { lib: Library; stop: Stop | undefined; index: number } {
  const trip = getTrip(lib, tripId)
  const index = trip ? trip.stops.findIndex((s) => s.id === stopId) : -1
  const stop = index >= 0 ? trip!.stops[index] : undefined
  if (!trip || !stop) return { lib, stop: undefined, index: -1 }
  return { lib: replaceTrip(lib, { ...trip, stops: trip.stops.filter((s) => s.id !== stopId) }), stop, index }
}

/** Re-insert a removed stop at an absolute position (undo of a delete). A
 * day that no longer exists (the trip shrank since) parks in Later, not on
 * the new last day. */
export function insertStop(lib: Library, tripId: string, stop: Stop, index: number): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  const day = stop.day < 0 || stop.day >= dayCount(trip) ? -1 : stop.day
  const stops = [...trip.stops]
  stops.splice(Math.max(0, Math.min(index, stops.length)), 0, { ...stop, day })
  return replaceTrip(lib, { ...trip, stops })
}

/**
 * Move a stop to `toDay`/`toIndex` inside that day's list. -1 is "Later".
 * The move is stable: the stop leaves its slot, the day's list is rebuilt with
 * it spliced at the clamped index, and day grouping order is preserved.
 */
export function moveStop(lib: Library, tripId: string, stopId: string, toDay: number, toIndex: number): Library {
  const trip = getTrip(lib, tripId)
  const stop = trip?.stops.find((s) => s.id === stopId)
  if (!trip || !stop) return lib
  const target = clampDay(trip, toDay)
  const rest = trip.stops.filter((s) => s.id !== stopId)
  const moved = { ...stop, day: target }
  // Gather the ids that make up the destination day (without the moved stop).
  const dayIds = rest.filter((s) => s.day === target).map((s) => s.id)
  const at = Math.max(0, Math.min(toIndex, dayIds.length))
  const out: Stop[] = []
  let inserted = false
  let seen = 0
  for (const s of rest) {
    if (!inserted && s.day === target && seen === at) {
      out.push(moved)
      inserted = true
    }
    if (s.day === target) seen++
    out.push(s)
  }
  if (!inserted) out.push(moved)
  return replaceTrip(lib, { ...trip, stops: out })
}

// --- legs --------------------------------------------------------------------

export function addLeg(
  lib: Library,
  tripId: string,
  fields: Omit<Leg, 'id'>,
  id = newId()
): { lib: Library; leg: Leg } | null {
  const trip = getTrip(lib, tripId)
  if (!trip || (!fields.from.trim() && !fields.to.trim())) return null
  const leg: Leg = {
    ...fields,
    id,
    from: fields.from.trim(),
    to: fields.to.trim(),
    ref: fields.ref.trim(),
    notes: fields.notes.trim()
  }
  return { lib: replaceTrip(lib, { ...trip, legs: [...trip.legs, leg] }), leg }
}

export function updateLeg(lib: Library, tripId: string, legId: string, patch: Partial<Omit<Leg, 'id'>>): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  return replaceTrip(lib, { ...trip, legs: trip.legs.map((l) => (l.id === legId ? { ...l, ...patch } : l)) })
}

export function removeLeg(
  lib: Library,
  tripId: string,
  legId: string
): { lib: Library; leg: Leg | undefined; index: number } {
  const trip = getTrip(lib, tripId)
  const index = trip ? trip.legs.findIndex((l) => l.id === legId) : -1
  const leg = index >= 0 ? trip!.legs[index] : undefined
  if (!trip || !leg) return { lib, leg: undefined, index: -1 }
  return { lib: replaceTrip(lib, { ...trip, legs: trip.legs.filter((l) => l.id !== legId) }), leg, index }
}

export function insertLeg(lib: Library, tripId: string, leg: Leg, index: number): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  const legs = [...trip.legs]
  legs.splice(Math.max(0, Math.min(index, legs.length)), 0, leg)
  return replaceTrip(lib, { ...trip, legs })
}

// --- stays -------------------------------------------------------------------

export function addStay(
  lib: Library,
  tripId: string,
  fields: Omit<Stay, 'id'>,
  id = newId()
): { lib: Library; stay: Stay } | null {
  const trip = getTrip(lib, tripId)
  const name = fields.name.trim()
  if (!trip || !name) return null
  const stay: Stay = { ...fields, id, name, address: fields.address.trim(), notes: fields.notes.trim() }
  return { lib: replaceTrip(lib, { ...trip, stays: [...trip.stays, stay] }), stay }
}

export function updateStay(lib: Library, tripId: string, stayId: string, patch: Partial<Omit<Stay, 'id'>>): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  return replaceTrip(lib, { ...trip, stays: trip.stays.map((s) => (s.id === stayId ? { ...s, ...patch } : s)) })
}

export function removeStay(
  lib: Library,
  tripId: string,
  stayId: string
): { lib: Library; stay: Stay | undefined; index: number } {
  const trip = getTrip(lib, tripId)
  const index = trip ? trip.stays.findIndex((s) => s.id === stayId) : -1
  const stay = index >= 0 ? trip!.stays[index] : undefined
  if (!trip || !stay) return { lib, stay: undefined, index: -1 }
  return { lib: replaceTrip(lib, { ...trip, stays: trip.stays.filter((s) => s.id !== stayId) }), stay, index }
}

export function insertStay(lib: Library, tripId: string, stay: Stay, index: number): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  const stays = [...trip.stays]
  stays.splice(Math.max(0, Math.min(index, stays.length)), 0, stay)
  return replaceTrip(lib, { ...trip, stays })
}

// --- packing -------------------------------------------------------------------

export function addPack(
  lib: Library,
  tripId: string,
  label: string,
  id = newId()
): { lib: Library; item: PackItem } | null {
  const trip = getTrip(lib, tripId)
  const text = label.trim()
  if (!trip || !text) return null
  const item: PackItem = { id, label: text, done: false }
  return { lib: replaceTrip(lib, { ...trip, packing: [...trip.packing, item] }), item }
}

export function togglePack(lib: Library, tripId: string, itemId: string): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  return replaceTrip(lib, {
    ...trip,
    packing: trip.packing.map((p) => (p.id === itemId ? { ...p, done: !p.done } : p))
  })
}

export function removePack(
  lib: Library,
  tripId: string,
  itemId: string
): { lib: Library; item: PackItem | undefined; index: number } {
  const trip = getTrip(lib, tripId)
  const index = trip ? trip.packing.findIndex((p) => p.id === itemId) : -1
  const item = index >= 0 ? trip!.packing[index] : undefined
  if (!trip || !item) return { lib, item: undefined, index: -1 }
  return { lib: replaceTrip(lib, { ...trip, packing: trip.packing.filter((p) => p.id !== itemId) }), item, index }
}

/** Remove every packed item; returns them with their list positions so a
 * single undo can put the set back exactly. */
export function clearPacked(lib: Library, tripId: string): { lib: Library; items: PackItem[]; indexes: number[] } {
  const trip = getTrip(lib, tripId)
  if (!trip) return { lib, items: [], indexes: [] }
  const items: PackItem[] = []
  const indexes: number[] = []
  trip.packing.forEach((p, i) => {
    if (p.done) {
      items.push(p)
      indexes.push(i)
    }
  })
  return { lib: replaceTrip(lib, { ...trip, packing: trip.packing.filter((p) => !p.done) }), items, indexes }
}

/** Undo-insert items at their recorded positions (earliest first), so both a
 * single delete and a batch clear land back exactly where the list was.
 * Items with no recorded position append, keeping order. */
export function insertPack(lib: Library, tripId: string, items: PackItem[], indexes?: number[]): Library {
  const trip = getTrip(lib, tripId)
  if (!trip) return lib
  const back = items
    .map((item, i) => ({ item, at: indexes?.[i] ?? Number.MAX_SAFE_INTEGER }))
    .filter((p) => !trip.packing.some((x) => x.id === p.item.id))
    .sort((a, b) => a.at - b.at)
  if (!back.length) return lib
  const packing = [...trip.packing]
  for (const p of back) packing.splice(Math.min(p.at, packing.length), 0, p.item)
  return replaceTrip(lib, { ...trip, packing })
}

// --- wire format ---------------------------------------------------------------

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')
const optStr = (v: unknown, max = 4000) => (typeof v === 'string' && v.length ? v.slice(0, max) : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null)

function readStop(v: unknown): Stop | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null
  const day = num(v.day)
  const time = typeof v.time === 'string' ? parseTime(v.time) : null
  return {
    id: v.id,
    day: day === null ? -1 : Math.max(-1, day),
    title: str(v.title, 200),
    time,
    address: str(v.address, 400),
    notes: str(v.notes)
  }
}

function readLeg(v: unknown): Leg | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null
  const date = optStr(v.date)
  const depart = typeof v.depart === 'string' ? parseTime(v.depart) : null
  const arrive = typeof v.arrive === 'string' ? parseTime(v.arrive) : null
  return {
    id: v.id,
    kind: legKind(v.kind),
    from: str(v.from, 200),
    to: str(v.to, 200),
    date: date && validDate(date) ? date : null,
    depart,
    arrive,
    ref: str(v.ref, 100),
    notes: str(v.notes)
  }
}

function readStay(v: unknown): Stay | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null
  const checkIn = optStr(v.checkIn)
  const checkOut = optStr(v.checkOut)
  return {
    id: v.id,
    name: str(v.name, 200),
    address: str(v.address, 400),
    checkIn: checkIn && validDate(checkIn) ? checkIn : null,
    checkOut: checkOut && validDate(checkOut) ? checkOut : null,
    notes: str(v.notes)
  }
}

function readPack(v: unknown): PackItem | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.label !== 'string' || !v.label) return null
  return { id: v.id, label: v.label.slice(0, 200), done: v.done === true }
}

export function readTrip(v: unknown): Trip | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null
  const start = str(v.start, 10)
  const end = str(v.end, 10)
  if (!validDate(start) || !validDate(end)) return null
  const span = diffDays(start, end)
  // Inverted or over-long ranges are rejected whole: the trip is simply never
  // loaded, so nothing allocates per-day structures and healthy trips and the
  // stored record itself are left untouched.
  if (span < 0 || span >= MAX_TRIP_DAYS) return null
  const trip: Trip = {
    id: v.id,
    name: str(v.name, 120) || 'Trip',
    start,
    end,
    notes: str(v.notes),
    createdAt: num(v.createdAt) ?? 0,
    stops: [],
    legs: [],
    stays: [],
    packing: []
  }
  if (Array.isArray(v.stops))
    trip.stops = v.stops
      .map(readStop)
      .filter((s): s is Stop => !!s)
      // Out-of-range days park in Later rather than clamping onto the last day.
      .map((s) => ({ ...s, day: s.day >= 0 && s.day < dayCount(trip) ? s.day : -1 }))
  if (Array.isArray(v.legs)) trip.legs = v.legs.map(readLeg).filter((l): l is Leg => !!l)
  if (Array.isArray(v.stays)) trip.stays = v.stays.map(readStay).filter((s): s is Stay => !!s)
  if (Array.isArray(v.packing)) trip.packing = v.packing.map(readPack).filter((p): p is PackItem => !!p)
  return trip
}

/** One trip's whole record under `trip.<id>`; the list order lives under `index`. */
export const serializeTrip = (t: Trip) => JSON.stringify(t)

export function readIndex(v: unknown): string[] {
  if (!isRec(v) || v.v !== 1 || !Array.isArray(v.order)) return []
  return v.order.filter((i): i is string => typeof i === 'string' && i.length > 0)
}

export const serializeIndex = (order: string[]) => JSON.stringify({ v: 1, order })

/** Stored under `trip.<id>` once its delete is acknowledged (the index has
 * already dropped the id). The marker is what separates an authorized
 * deletion - never recoverable - from a record a partial write orphaned. */
export const TOMB_VALUE = JSON.stringify({ v: 1, tomb: 1 })

/** True when a raw `trip.<id>` value is an acknowledged-deletion tomb. */
export const isTombValue = (raw: string | null | undefined): boolean => {
  if (!raw) return false
  try {
    const v: unknown = JSON.parse(raw)
    return isRec(v) && v.tomb === 1
  } catch {
    return false
  }
}

export type LibWrite = { kind: 'put' | 'tomb' | 'del'; key: string; value?: string }

/**
 * Ordered storage writes for a library diff. The index is the authoritative
 * reachability switch, so the sequence is deliberate rather than parallel:
 * 1. created or changed records first - an index written after them can
 *    never reference a missing record, and a rejected record write aborts
 *    the diff before the index moves;
 * 2. the index put - the single write that flips create, delete and reorder
 *    reachability atomically at the platform level;
 * 3. a tomb under each removed id - converts the now-unindexed record into
 *    an acknowledged deletion the assembler skips, so a failed cleanup can
 *    never resurrect an authorized delete;
 * 4. each tomb's guarded del - best-effort reclamation that re-verifies the
 *    record is still a tomb before deleting, so a stale retry can never
 *    erase a restored or recreated same-id incarnation.
 */
export function planLibWrites(prev: Library, next: Library): LibWrite[] {
  const prevById = new Map(prev.trips.map((t) => [t.id, t]))
  const out: LibWrite[] = []
  for (const t of next.trips)
    if (prevById.get(t.id) !== t) out.push({ kind: 'put', key: `trip.${t.id}`, value: serializeTrip(t) })
  if (next.order.join('|') !== prev.order.join('|'))
    out.push({ kind: 'put', key: 'index', value: serializeIndex(next.order) })
  for (const id of prev.order)
    if (!next.order.includes(id)) {
      out.push({ kind: 'tomb', key: `trip.${id}`, value: TOMB_VALUE })
      out.push({ kind: 'del', key: `trip.${id}` })
    }
  return out
}

/** Assemble a library from the raw key set (index + every `trip.` record). */
export function assembleLibrary(index: string | null, records: Map<string, string>): Library {
  const lib = newLibrary()
  let order: string[] = []
  if (index !== null) {
    try {
      order = readIndex(JSON.parse(index))
    } catch {
      order = []
    }
  }
  const byId = new Map<string, Trip>()
  for (const [k, raw] of records) {
    if (!k.startsWith('trip.')) continue
    try {
      const parsed: unknown = JSON.parse(raw)
      // An acknowledged deletion is never an orphan: the tomb stays
      // unreachable until its guarded cleanup (or a same-id recreate)
      // replaces it, while a partial write's unmarked orphan still recovers.
      if (isRec(parsed) && parsed.tomb === 1) continue
      const trip = readTrip(parsed)
      if (trip) byId.set(trip.id, trip)
    } catch {
      // A torn record is skipped; the rest of the library still decodes.
    }
  }
  for (const id of order) {
    const trip = byId.get(id)
    if (trip) {
      lib.trips.push(trip)
      byId.delete(id)
    }
  }
  // Trips the index never named (e.g. a peer's record that landed after its
  // index write) still surface, appended oldest-first.
  const rest = [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
  lib.trips.push(...rest)
  lib.order = lib.trips.map((t) => t.id)
  return lib
}
