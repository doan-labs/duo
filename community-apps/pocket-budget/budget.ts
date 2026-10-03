// Pocket Budget's data model. Amounts are integer minor units (cents) so the
// ledger never drifts on floating point; a transaction's day is a plain
// YYYY-MM-DD string, which is also how the month view filters.

import type { SymProps } from '@doan-labs/duo-uikit'

export type Tint = 'green' | 'orange' | 'cyan' | 'yellow' | 'purple' | 'pink' | 'grey'

export type Category = { id: string; name: string; tint: Tint; icon: SymProps['name'] }

export const CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', tint: 'green', icon: 'cart' },
  { id: 'dining', name: 'Dining', tint: 'orange', icon: 'fork' },
  { id: 'transport', name: 'Transport', tint: 'cyan', icon: 'bus' },
  { id: 'bills', name: 'Bills', tint: 'yellow', icon: 'bolt' },
  { id: 'fun', name: 'Fun', tint: 'purple', icon: 'film' },
  { id: 'health', name: 'Health', tint: 'pink', icon: 'heartFill' },
  { id: 'other', name: 'Other', tint: 'grey', icon: 'ellipsis' }
]

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]!
}

// A fresh install starts with modest monthly limits so the bars read as
// budgets, not just totals; every one is editable in the Limits card.
export const DEFAULT_LIMITS: Record<string, number> = {
  groceries: 42000,
  dining: 16000,
  transport: 14000,
  bills: 26000,
  fun: 9000,
  health: 12000
}

export type Tx = { id: string; date: string; category: string; minor: number; note: string }

export type Budget = { tx: Tx[]; limits: Record<string, number> }

export const EMPTY_BUDGET: Budget = { tx: [], limits: { ...DEFAULT_LIMITS } }

const TX_CAP = 2000
const NOTE_CAP = 64

function isTx(v: unknown): v is Tx {
  if (typeof v !== 'object' || v === null) return false
  const t = v as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.date === 'string' &&
    validDay(t.date) &&
    typeof t.category === 'string' &&
    typeof t.minor === 'number' &&
    Number.isSafeInteger(t.minor) &&
    t.minor > 0 &&
    typeof t.note === 'string'
  )
}

export function parseBudget(raw: string | null): Budget {
  if (!raw) return { tx: [], limits: { ...DEFAULT_LIMITS } }
  try {
    const parsed = JSON.parse(raw) as Partial<Budget>
    const tx = Array.isArray(parsed.tx) ? parsed.tx.filter(isTx).slice(-TX_CAP) : []
    const limits: Record<string, number> = {}
    if (parsed.limits && typeof parsed.limits === 'object') {
      for (const c of CATEGORIES) {
        const v = (parsed.limits as Record<string, unknown>)[c.id]
        if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) limits[c.id] = v
      }
    }
    return { tx, limits }
  } catch {
    return { tx: [], limits: { ...DEFAULT_LIMITS } }
  }
}

export function serializeBudget(budget: Budget): string {
  return JSON.stringify({ tx: budget.tx, limits: budget.limits })
}

// The session key carries a whole serialized budget plus the month being
// viewed: adopting a remote write lands as at most one storage write, so the
// two displays converge instead of fighting.
// A mirror row either carries the whole ledger (data hand-off) or just the
// viewed month (null state): navigation writes must never push a possibly
// stale ledger over a newer one that is still landing on the other display.
export type Mirror = { by: string; month: string; state: string | null }

export function serializeMirror(by: string, budget: Budget | null, month: string): string {
  return JSON.stringify({ by, month, state: budget ? serializeBudget(budget) : null } satisfies Mirror)
}

export function parseMirror(raw: string | null): Mirror | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Mirror
    if (
      typeof parsed?.by !== 'string' ||
      typeof parsed?.month !== 'string' ||
      (parsed.state !== null && typeof parsed?.state !== 'string')
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const pad = (n: number) => String(n).padStart(2, '0')

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function todayMonth(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export function todayDay(now = new Date()): number {
  return now.getDate()
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const name = MONTHS[Number(m) - 1]
  return name ? `${name} ${y}` : key
}

export function shortDay(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return `${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getDate()}`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const total = y! * 12 + (m! - 1) + delta
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}

export function monthOfDay(date: string): string {
  return date.slice(0, 7)
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y!, m!, 0).getDate()
}

export function validDay(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(`${date}T12:00:00`)
  return !Number.isNaN(d.getTime()) && date === `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function clampDayToMonth(date: string, month: string): string {
  if (monthOfDay(date) === month) return date
  const day = Math.min(Number(date.slice(8)), daysInMonth(month))
  return `${month}-${pad(day)}`
}

/** Parses "12" or "12.34" into integer minor units; anything else is null. */
export function parseAmount(text: string): number | null {
  const t = text.trim().replace(/^\$/, '')
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(t)) return null
  const [d = '0', c = ''] = t.split('.')
  const minor = Number(d) * 100 + Number(c.padEnd(2, '0'))
  return minor > 0 ? minor : null
}

/** A limit field: empty or 0 clears the limit, otherwise same parsing as amounts. */
export function parseLimit(text: string): number | null {
  const t = text.trim().replace(/^\$/, '')
  if (t === '') return 0
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(t)) return null
  const [d = '0', c = ''] = t.split('.')
  return Number(d) * 100 + Number(c.padEnd(2, '0'))
}

/** Minor units as an editable input string ("420" -> "420.00"). */
export function minorInput(minor: number): string {
  return `${Math.floor(minor / 100)}.${pad(minor % 100)}`
}

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** Minor units as a display string: 123456 -> "1,234.56". */
export function formatMinor(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  return `${sign}${group(Math.floor(abs / 100))}.${pad(abs % 100)}`
}

export function trimNote(note: string): string {
  return note.trim().replace(/\s+/g, ' ').slice(0, NOTE_CAP)
}

export function newTx(date: string, category: string, minor: number, note: string): Tx {
  return { id: crypto.randomUUID(), date, category, minor, note }
}

export function addTx(budget: Budget, tx: Tx): Budget {
  return { ...budget, tx: [...budget.tx, tx].slice(-TX_CAP) }
}

export function updateTx(budget: Budget, tx: Tx): Budget {
  return { ...budget, tx: budget.tx.map((t) => (t.id === tx.id ? tx : t)) }
}

export function removeTx(budget: Budget, id: string): Budget {
  return { ...budget, tx: budget.tx.filter((t) => t.id !== id) }
}

export function setLimit(budget: Budget, category: string, minor: number): Budget {
  const limits = { ...budget.limits }
  if (minor <= 0) delete limits[category]
  else limits[category] = minor
  return { ...budget, limits }
}

/** This month's transactions, newest date first and newest entry first on a tie. */
export function monthTx(tx: Tx[], month: string): Tx[] {
  return tx
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => monthOfDay(t.date) === month)
    .sort((a, b) => b.t.date.localeCompare(a.t.date) || b.i - a.i)
    .map(({ t }) => t)
}

export function spendByCategory(tx: Tx[], month: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of tx) {
    if (monthOfDay(t.date) !== month) continue
    out[t.category] = (out[t.category] ?? 0) + t.minor
  }
  return out
}

export function totalSpend(tx: Tx[], month: string): number {
  let sum = 0
  for (const t of tx) if (monthOfDay(t.date) === month) sum += t.minor
  return sum
}

/** Spend per day of the viewed month; index 0 is the 1st. */
export function dailySpend(tx: Tx[], month: string): number[] {
  const days: number[] = new Array(daysInMonth(month)).fill(0)
  for (const t of tx) {
    if (monthOfDay(t.date) !== month) continue
    const d = Number(t.date.slice(8)) - 1
    days[d] = (days[d] ?? 0) + t.minor
  }
  return days
}

export function totalLimits(limits: Record<string, number>): number {
  let sum = 0
  for (const c of CATEGORIES) sum += limits[c.id] ?? 0
  return sum
}
