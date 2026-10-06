// Pantry's data model and rules, pure functions only. Quantities are integer
// milli-units (1000 = one named unit) so +/- steps and merges never drift on
// floating point. Dates are local-day YYYY-MM-DD strings: expiry is counted in
// calendar days, never 24-hour spans, so the badge is right at DST edges.
import type { SymProps } from '@doan-labs/duo-uikit'

export type Location = 'pantry' | 'fridge' | 'freezer'
export type Unit = 'pcs' | 'pack' | 'g' | 'kg' | 'ml' | 'l'
export type Filter = 'all' | Location | 'soon'
export type Sort = 'soon' | 'name'

export type Tone = 'red' | 'orange' | 'gold' | 'cyan' | 'indigo' | 'green' | 'grey'

export type Item = {
  id: string
  name: string
  /** Quantity in milli-units: 1000 is one unit, so 1.5 kg is 1500. */
  milli: number
  unit: Unit
  location: Location
  /** Local day YYYY-MM-DD, or null when the item has no date. */
  bestBefore: string | null
  addedAt: number
}

export type ShopItem = {
  id: string
  name: string
  note: string
  done: boolean
  addedAt: number
}

export type Doc = {
  v: number
  items: Item[]
  list: ShopItem[]
  muted: boolean
}

export const EMPTY_DOC: Doc = { v: 1, items: [], list: [], muted: false }

export const ITEMS_CAP = 400
export const LIST_CAP = 200
export const NAME_CAP = 48
export const NOTE_CAP = 40
/** Upper bound for one item's quantity, in milli-units (999,999 units). */
export const MAX_MILLI = 999_999_000
/** A dated item is "use soon" from this many days out. */
export const USE_SOON_DAYS = 7

export const LOCATIONS: { id: Location; name: string; icon: SymProps['name']; tint: Tone }[] = [
  { id: 'pantry', name: 'Pantry', icon: 'stack', tint: 'orange' },
  { id: 'fridge', name: 'Fridge', icon: 'thermometer', tint: 'cyan' },
  { id: 'freezer', name: 'Freezer', icon: 'snow', tint: 'indigo' }
]

export const FILTERS: { id: Filter; name: string; icon?: SymProps['name'] }[] = [
  { id: 'all', name: 'All' },
  { id: 'pantry', name: 'Pantry' },
  { id: 'fridge', name: 'Fridge' },
  { id: 'freezer', name: 'Freezer' },
  { id: 'soon', name: 'Soon', icon: 'clockSym' }
]

export const UNITS: { id: Unit; name: string; step: number }[] = [
  { id: 'pcs', name: 'pcs', step: 1000 },
  { id: 'pack', name: 'packs', step: 1000 },
  { id: 'g', name: 'g', step: 100_000 },
  { id: 'kg', name: 'kg', step: 100 },
  { id: 'ml', name: 'ml', step: 100_000 },
  { id: 'l', name: 'l', step: 100 }
]

export function unitOf(id: string): { id: Unit; name: string; step: number } {
  return UNITS.find((u) => u.id === id) ?? UNITS[0]!
}

export function locationOf(id: string): { id: Location; name: string; icon: SymProps['name']; tint: Tone } {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]!
}

// --- parsing ---------------------------------------------------------------

export function cleanName(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, NAME_CAP)
}

export function cleanNote(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, NOTE_CAP)
}

/**
 * Parses a typed quantity into milli-units. Accepts "2", "1.5", ".5" and up to
 * three decimals; anything else is null. Zero needs `allowZero`: the add form
 * rejects it while the editor keeps it, because 0 is a real "out of stock".
 */
export function parseQty(text: string, allowZero = false): number | null {
  const t = text.trim()
  if (!/^\d{1,6}(?:\.\d{1,3})?$/.test(t) && !/^\.\d{1,3}$/.test(t)) return null
  const milli = Math.round(Number.parseFloat(t) * 1000)
  if (!Number.isSafeInteger(milli) || milli < 0 || milli > MAX_MILLI) return null
  if (milli === 0 && !allowZero) return null
  return milli
}

/** Milli-units as a display number: 1500 -> "1.5", 2000 -> "2", 100 -> "0.1". */
export function formatQty(milli: number): string {
  const n = milli / 1000
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

/** "2 packs" / "150 ml" - the quantity with its unit label. */
export function qtyText(item: Pick<Item, 'milli' | 'unit'>): string {
  const unit = unitOf(item.unit)
  const n = formatQty(item.milli)
  return item.milli === 1000 && (unit.id === 'pcs' || unit.id === 'pack')
    ? `${n} ${unit.id === 'pack' ? 'pack' : 'pc'}`
    : `${n} ${unit.name}`
}

export function stepFor(unit: Unit): number {
  return unitOf(unit).step
}

// --- dates ------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day, not UTC: the fridge clock is the wall clock. */
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function validDay(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const check = new Date(y!, m! - 1, d!)
  return check.getFullYear() === y && check.getMonth() === m! - 1 && check.getDate() === d
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). UTC math on the date parts dodges DST edges. */
export function daysUntil(to: string, from: string): number | null {
  if (!validDay(to) || !validDay(from)) return null
  const [ty, tm, td] = to.split('-').map(Number)
  const [fy, fm, fd] = from.split('-').map(Number)
  return Math.round((Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / 86_400_000)
}

export type Badge = { tone: Tone; text: string; aria: string }

/**
 * What the row's badge says, in words: "Expired" for a date already past,
 * "Today" when it ends today, "N days" inside the use-soon window, "Out" when
 * the quantity hit zero (that outranks expiry: nothing left can spoil).
 */
export function badgeFor(item: Pick<Item, 'milli' | 'bestBefore'>, today: string): Badge | null {
  if (item.milli === 0) return { tone: 'grey', text: 'Out', aria: 'out of stock' }
  if (!item.bestBefore) return null
  const days = daysUntil(item.bestBefore, today)
  if (days === null) return null
  if (days < 0) return { tone: 'red', text: 'Expired', aria: `expired ${-days} days ago` }
  if (days === 0) return { tone: 'red', text: 'Today', aria: 'expires today' }
  if (days <= USE_SOON_DAYS)
    return { tone: 'orange', text: `${days} ${days === 1 ? 'day' : 'days'}`, aria: `expires in ${days} days` }
  return null
}

/** The quiet line under a name: where it is, and when it ends if that is not urgent. */
export function metaLine(item: Item, today: string): string {
  const loc = locationOf(item.location).name
  if (!item.bestBefore) return loc
  const days = daysUntil(item.bestBefore, today)
  if (days === null) return loc
  if (days <= USE_SOON_DAYS) return loc
  return `${loc} · ${shortDay(item.bestBefore)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDay(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${MONTHS[m! - 1] ?? '?'} ${d}`
}

// --- item operations ---------------------------------------------------------

const byId = crypto.randomUUID.bind(crypto)

export function newItem(
  name: string,
  milli: number,
  unit: Unit,
  location: Location,
  bestBefore: string | null,
  at = Date.now()
): Item {
  return { id: byId(), name, milli, unit, location, bestBefore, addedAt: at }
}

/** Two rows are the same stock when name (case-folded), unit, shelf and date all match. */
export function sameBatch(a: Item, b: Pick<Item, 'name' | 'unit' | 'location' | 'bestBefore'>): boolean {
  return (
    a.name.toLowerCase() === b.name.toLowerCase() &&
    a.unit === b.unit &&
    a.location === b.location &&
    a.bestBefore === b.bestBefore
  )
}

/**
 * Adds stock: an identical batch (same name, unit, shelf and date) merges its
 * quantity in, a different date is genuinely a second batch and stays its own
 * row. Over the cap the doc is returned unchanged and `full` reports it.
 */
export function addItem(
  doc: Doc,
  draft: { name: string; milli: number; unit: Unit; location: Location; bestBefore: string | null },
  at = Date.now()
): { doc: Doc; id: string | null; merged: boolean; full: boolean } {
  const name = cleanName(draft.name)
  const batch = { name, milli: draft.milli, unit: draft.unit, location: draft.location, bestBefore: draft.bestBefore }
  const hit = doc.items.find((i) => sameBatch(i, batch))
  if (hit) {
    const milli = Math.min(MAX_MILLI, hit.milli + draft.milli)
    const items = doc.items.map((i) => (i.id === hit.id ? { ...i, milli } : i))
    return { doc: { ...doc, items }, id: hit.id, merged: true, full: false }
  }
  if (doc.items.length >= ITEMS_CAP) return { doc, id: null, merged: false, full: true }
  const item = newItem(name, draft.milli, draft.unit, draft.location, draft.bestBefore, at)
  return { doc: { ...doc, items: [...doc.items, item] }, id: item.id, merged: false, full: false }
}

/**
 * Saves an edited item. If the edit makes it identical to another row, the two
 * merge: the edited row folds its quantity into the survivor and disappears.
 * An id that is already gone (deleted on the other display) is appended back.
 */
export function updateItem(doc: Doc, edited: Item): { doc: Doc; id: string; merged: boolean } {
  const clean = { ...edited, name: cleanName(edited.name), milli: Math.max(0, Math.min(MAX_MILLI, edited.milli)) }
  const clash = doc.items.find((i) => i.id !== clean.id && sameBatch(i, clean))
  if (clash) {
    const milli = Math.min(MAX_MILLI, clash.milli + clean.milli)
    const items = doc.items.filter((i) => i.id !== clean.id).map((i) => (i.id === clash.id ? { ...i, milli } : i))
    return { doc: { ...doc, items }, id: clash.id, merged: true }
  }
  const found = doc.items.some((i) => i.id === clean.id)
  const items = found
    ? doc.items.map((i) => (i.id === clean.id ? clean : i))
    : [...doc.items.slice(-(ITEMS_CAP - 1)), clean]
  return { doc: { ...doc, items }, id: clean.id, merged: false }
}

export function removeItem(doc: Doc, id: string): Doc {
  return { ...doc, items: doc.items.filter((i) => i.id !== id) }
}

/**
 * One consume or restock tap: a unit-step down or up, clamped at 0 and
 * MAX_MILLI, so quantity can never go negative or overflow.
 */
export function stepItem(doc: Doc, id: string, dir: 'use' | 'restock'): { doc: Doc; milli: number | null } {
  const item = doc.items.find((i) => i.id === id)
  if (!item) return { doc, milli: null }
  const step = stepFor(item.unit)
  const milli = Math.max(0, Math.min(MAX_MILLI, item.milli + (dir === 'use' ? -step : step)))
  if (milli === item.milli) return { doc, milli }
  const items = doc.items.map((i) => (i.id === id ? { ...i, milli } : i))
  return { doc: { ...doc, items }, milli }
}

// --- view: filter, sort, use-soon --------------------------------------------

export function filterItems(items: Item[], loc: Filter, q: string, today: string): Item[] {
  const query = q.trim().toLowerCase()
  return items.filter((item) => {
    if (loc === 'soon') {
      const days = item.bestBefore ? daysUntil(item.bestBefore, today) : null
      if (days === null || days > USE_SOON_DAYS) return false
    } else if (loc !== 'all' && item.location !== loc) return false
    return !query || item.name.toLowerCase().includes(query)
  })
}

/**
 * The canonical order: what needs eating first is on top - dated items by
 * expiry ascending (expired first, today next), undated stock after them
 * alphabetically. `name` is a plain A-Z with newest last.
 */
export function sortItems(items: Item[], sort: Sort, today: string): Item[] {
  const byName = (a: Item, b: Item) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.addedAt - b.addedAt
  if (sort === 'name') return [...items].sort(byName)
  return [...items].sort((a, b) => {
    const da = a.bestBefore ? daysUntil(a.bestBefore, today) : null
    const db = b.bestBefore ? daysUntil(b.bestBefore, today) : null
    if (da === null && db === null) return byName(a, b)
    if (da === null) return 1
    if (db === null) return -1
    return da - db || byName(a, b)
  })
}

/** Items inside the use-soon window, expiry ascending. */
export function soonItems(items: Item[], today: string): Item[] {
  return sortItems(items, 'soon', today).filter((i) => {
    const days = i.bestBefore ? daysUntil(i.bestBefore, today) : null
    return days !== null && days <= USE_SOON_DAYS
  })
}

export function countOut(items: Item[]): number {
  return items.reduce((n, i) => n + (i.milli === 0 ? 1 : 0), 0)
}

// --- shopping list -------------------------------------------------------------

export function addShop(
  doc: Doc,
  name: string,
  note: string,
  at = Date.now()
): { doc: Doc; id: string | null; full: boolean } {
  const clean = cleanName(name)
  if (!clean) return { doc, id: null, full: false }
  if (doc.list.length >= LIST_CAP) return { doc, id: null, full: true }
  const item: ShopItem = { id: byId(), name: clean, note: cleanNote(note), done: false, addedAt: at }
  return { doc: { ...doc, list: [...doc.list, item] }, id: item.id, full: false }
}

export function toggleShop(doc: Doc, id: string): Doc {
  return { ...doc, list: doc.list.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) }
}

export function removeShop(doc: Doc, id: string): Doc {
  return { ...doc, list: doc.list.filter((s) => s.id !== id) }
}

/** Bought rows drop off the list; still-open rows keep their order. */
export function clearBought(doc: Doc): Doc {
  return { ...doc, list: doc.list.filter((s) => !s.done) }
}

// --- wire formats ----------------------------------------------------------------

const isLocation = (v: unknown): v is Location => typeof v === 'string' && LOCATIONS.some((l) => l.id === v)
const isUnit = (v: unknown): v is Unit => typeof v === 'string' && UNITS.some((u) => u.id === v)

function isItem(v: unknown): v is Item {
  if (typeof v !== 'object' || v === null) return false
  const i = v as Record<string, unknown>
  return (
    typeof i.id === 'string' &&
    typeof i.name === 'string' &&
    i.name.length > 0 &&
    typeof i.milli === 'number' &&
    Number.isSafeInteger(i.milli) &&
    i.milli >= 0 &&
    i.milli <= MAX_MILLI &&
    isUnit(i.unit) &&
    isLocation(i.location) &&
    (i.bestBefore === null || (typeof i.bestBefore === 'string' && validDay(i.bestBefore))) &&
    typeof i.addedAt === 'number'
  )
}

function isShopItem(v: unknown): v is ShopItem {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    s.name.length > 0 &&
    typeof s.note === 'string' &&
    typeof s.done === 'boolean' &&
    typeof s.addedAt === 'number'
  )
}

/**
 * Reads the stored document. Anything unrecognised parses to a clean doc or
 * the nearest valid rows - corrupt fields drop, never crash a relaunch.
 */
export function parseDoc(raw: string | null): Doc {
  if (!raw) return { ...EMPTY_DOC }
  try {
    const parsed = JSON.parse(raw) as Partial<Doc>
    const seen = new Set<string>()
    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter(isItem)
      .filter((i) => !seen.has(i.id) && seen.add(i.id))
      .slice(0, ITEMS_CAP)
    const list = (Array.isArray(parsed.list) ? parsed.list : [])
      .filter(isShopItem)
      .filter((s) => !seen.has(s.id) && seen.add(s.id))
      .slice(0, LIST_CAP)
    return { v: 1, items, list, muted: parsed.muted === true }
  } catch {
    return { ...EMPTY_DOC }
  }
}

export function serializeDoc(doc: Doc): string {
  return JSON.stringify({ v: 1, items: doc.items, list: doc.list, muted: doc.muted })
}

// --- session mirror ----------------------------------------------------------

/**
 * What the other display sees of this view's filters - the stock in storage
 * converges on its own; this key is only "where you were looking" so a fold
 * lands on the same shelf, search and sort.
 */
export type Mirror = { by: string; loc: Filter; q: string; sort: Sort }

export function serializeMirror(by: string, loc: Filter, q: string, sort: Sort): string {
  return JSON.stringify({ by, loc, q, sort } satisfies Mirror)
}

export function parseMirror(raw: string | null): Mirror | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Mirror
    if (typeof parsed?.by !== 'string') return null
    const loc: Filter = FILTERS.some((f) => f.id === parsed.loc) ? parsed.loc : 'all'
    const sort: Sort = parsed.sort === 'name' ? 'name' : 'soon'
    return { by: parsed.by, loc, q: typeof parsed.q === 'string' ? parsed.q.slice(0, 64) : '', sort }
  } catch {
    return null
  }
}
