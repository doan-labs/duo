// What a reminder is, where it can live, and the date/tag math every pane
// shares. The app is sandboxed: all of this runs inside its frame on both
// displays, so nothing here may reach for the shell.

import type { SymProps } from '@doan-labs/duo-uikit'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'

export type Sub = { id: string; t: string; done?: boolean }
export type Reminder = {
  id: string
  t: string
  n?: string
  url?: string
  /** Local calendar day, yyyy-mm-dd. */
  date?: string
  /** HH:mm, 24h. Only meaningful with a date. */
  time?: string
  flag?: boolean
  pri?: 1 | 2 | 3
  done?: boolean
  doneAt?: number
  list: string
  tags?: string[]
  subs?: Sub[]
}
export type RList = { id: string; name: string; color: ListColor; icon: SymProps['name'] }

/** Apple's pick-a-colour row, mapped onto the system palette. */
export const LIST_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'mint',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'pink',
  'brown',
  'grey'
] as const
export type ListColor = (typeof LIST_COLORS)[number]
export const LIST_TINT: Record<ListColor, string> = {
  red: colors.red,
  orange: colors.orange,
  yellow: colors.yellow,
  green: colors.green,
  mint: colors.mint,
  teal: colors.teal,
  cyan: colors.cyan,
  blue: colors.blue,
  indigo: colors.indigo,
  purple: colors.purple,
  pink: colors.pink,
  brown: colors.brown,
  grey: colors.grey
}

/** The icon grid the New List sheet offers. */
export const LIST_ICONS: SymProps['name'][] = [
  'list',
  'checklist',
  'cart',
  'fork',
  'cup',
  'leaf',
  'heart',
  'star',
  'book',
  'bolt',
  'film',
  'document',
  'people',
  'person',
  'pin',
  'globe',
  'sun',
  'calendarSym'
]

// ---------- destinations ----------

export type SmartId = 'today' | 'scheduled' | 'all' | 'flagged' | 'completed'
export type GlyphKind = 'today' | 'scheduled' | 'tray' | 'flag' | 'tick' | 'hash'
export const SMARTS: { id: SmartId; name: string; tint: string; glyph: GlyphKind }[] = [
  { id: 'today', name: 'Today', tint: colors.blue, glyph: 'today' },
  { id: 'scheduled', name: 'Scheduled', tint: colors.red, glyph: 'scheduled' },
  { id: 'all', name: 'All', tint: colors.grey4Dark, glyph: 'tray' },
  { id: 'flagged', name: 'Flagged', tint: colors.orange, glyph: 'flag' },
  { id: 'completed', name: 'Completed', tint: colors.grey4Dark, glyph: 'tick' }
]

export const destName = (dest: string, lists: RList[]) => {
  const smart = SMARTS.find((s) => s.id === dest)
  if (smart) return smart.name
  if (dest.startsWith('list:')) return lists.find((l) => l.id === dest.slice(5))?.name ?? 'Reminders'
  if (dest.startsWith('tag:')) return `#${dest.slice(4)}`
  return 'Reminders'
}
export const destTint = (dest: string, lists: RList[]) => {
  const smart = SMARTS.find((s) => s.id === dest)
  if (smart) return smart.tint
  if (dest.startsWith('list:')) {
    const l = lists.find((x) => x.id === dest.slice(5))
    return l ? LIST_TINT[l.color] : colors.blue
  }
  return app_link
}
// The link colour reads through `app` only in styles; here the token value is
// fine because a tag page is always the interaction blue.
const app_link = colors.blue

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, '0')
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const dateOf = (key: string) => new Date(`${key}T00:00:00`)
export const todayKey = () => keyOf(new Date())
export const addDays = (key: string, n: number) => keyOf(new Date(dateOf(key).getTime() + n * 86400_000))
/** The coming Saturday; on a Saturday itself, the one after. */
export const weekendKey = () => {
  const t = new Date()
  return addDays(keyOf(t), (6 - t.getDay() + 7) % 7 || 7)
}
export const fmtTime = (t: string) => {
  const h = Number(t.slice(0, 2))
  const m = t.slice(3)
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
const MONTH_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })

/**
 * How iOS writes a due date in a row: Today, Tomorrow, Yesterday, the weekday
 * inside the next week, the short date after it. The time rides along.
 */
export const relDay = (key: string, time?: string, now = todayKey()) => {
  const diff = Math.round((dateOf(key).getTime() - dateOf(now).getTime()) / 86400_000)
  const day =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tomorrow'
        : diff === -1
          ? 'Yesterday'
          : diff > 1 && diff < 7
            ? WEEKDAY.format(dateOf(key))
            : SHORT.format(dateOf(key))
  return time ? `${day}, ${fmtTime(time)}` : day
}
/** The header a Scheduled group gets: Tomorrow, then "Friday, September 26". */
export const secDay = (key: string, now = todayKey()) => {
  const diff = Math.round((dateOf(key).getTime() - dateOf(now).getTime()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return MONTH_DAY.format(dateOf(key))
}
export const overdue = (r: Reminder, now = todayKey()) => !r.done && !!r.date && r.date < now
export const dueToday = (r: Reminder, now = todayKey()) => !r.done && r.date === now

// ---------- tags ----------

const TAG_RE = /#([\p{L}\p{N}_-]+)/gu
/** Tags a reminder carries: the explicit field plus #words inside the title. */
export const tagsIn = (r: Reminder) => [
  ...new Set([...(r.tags ?? []), ...[...r.t.matchAll(TAG_RE)].map((m) => m[1]!.toLowerCase())])
]
export const allTags = (rs: Reminder[]) => [...new Set(rs.flatMap(tagsIn))].sort()

// ---------- counts and groups ----------

export function countFor(id: SmartId, rs: Reminder[], now = todayKey()) {
  const open = rs.filter((r) => !r.done)
  switch (id) {
    case 'today':
      return open.filter((r) => r.date && r.date <= now).length
    case 'scheduled':
      return open.filter((r) => r.date).length
    case 'all':
      return open.length
    case 'flagged':
      return open.filter((r) => r.flag).length
    case 'completed':
      return rs.filter((r) => r.done).length
  }
}

export type Group = { id: string; title?: string; items: Reminder[] }
const dt = (a: Reminder, b: Reminder) =>
  (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99:99').localeCompare(b.time ?? '99:99')

/** The sectioned body of a destination. `completed` ignores `showDone`: it is the section. */
export function groupsFor(dest: string, rs: Reminder[], lists: RList[], showDone: boolean, now = todayKey()): Group[] {
  const open = rs.filter((r) => !r.done)
  const done = rs.filter((r) => r.done)
  const doneTail = (items: Reminder[]): Group[] =>
    showDone && items.length ? [{ id: 'done', title: 'Completed', items: [...items].sort(dt) }] : []

  if (dest === 'today') {
    const od = open.filter((r) => r.date && r.date < now).sort(dt)
    const td = open.filter((r) => r.date === now).sort(dt)
    return [
      ...(od.length ? [{ id: 'od', title: 'Overdue', items: od }] : []),
      { id: 'td', title: 'Today', items: td },
      ...doneTail(done.filter((r) => r.date && r.date <= now))
    ]
  }
  if (dest === 'scheduled') {
    const dated = open.filter((r) => r.date).sort(dt)
    const earlier = dated.filter((r) => r.date! < now)
    const keys = [...new Set(dated.filter((r) => r.date! >= now).map((r) => r.date!))]
    return [
      ...(earlier.length ? [{ id: 'early', title: 'Earlier', items: earlier }] : []),
      ...keys.map((k) => ({ id: `d:${k}`, title: secDay(k, now), items: dated.filter((r) => r.date === k) })),
      ...doneTail(done.filter((r) => r.date))
    ]
  }
  if (dest === 'all') {
    const known = lists
      .map((l) => ({ id: `l:${l.id}`, title: l.name, items: open.filter((r) => r.list === l.id) }))
      .filter((g) => g.items.length)
    const stray = open.filter((r) => !lists.some((l) => l.id === r.list))
    return [...known, ...(stray.length ? [{ id: 'stray', title: 'Reminders', items: stray }] : []), ...doneTail(done)]
  }
  if (dest === 'flagged') {
    return [{ id: 'open', items: open.filter((r) => r.flag) }, ...doneTail(done.filter((r) => r.flag))]
  }
  if (dest === 'completed') {
    const day = (ms: number) => Math.floor(ms / 86400_000)
    const bucket = (r: Reminder) => day(Date.now()) - day(r.doneAt ?? 0)
    const sorted = [...done].sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    const at = (n: number | [number, number]) =>
      sorted.filter((r) => (Array.isArray(n) ? bucket(r) >= n[0] && bucket(r) <= n[1] : bucket(r) === n))
    return [
      { id: 'c0', title: 'Today', items: at(0) },
      { id: 'c1', title: 'Yesterday', items: at(1) },
      { id: 'c7', title: 'Previous 7 Days', items: at([2, 6]) },
      { id: 'cold', title: 'Earlier', items: at([7, 10 ** 9]) }
    ].filter((g) => g.items.length)
  }
  if (dest.startsWith('tag:')) {
    const tag = dest.slice(4)
    return [
      { id: 'open', items: open.filter((r) => tagsIn(r).includes(tag)) },
      ...doneTail(done.filter((r) => tagsIn(r).includes(tag)))
    ]
  }
  const list = dest.startsWith('list:') ? dest.slice(5) : ''
  return [{ id: 'open', items: open.filter((r) => r.list === list) }, ...doneTail(done.filter((r) => r.list === list))]
}

/** Rows a query finds, open first, matching the title, notes or a tag. */
export function search(rs: Reminder[], q: string): Group[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  const hit = (r: Reminder) =>
    r.t.toLowerCase().includes(needle) ||
    (r.n ?? '').toLowerCase().includes(needle) ||
    tagsIn(r).some((t) => t.includes(needle))
  const yes = rs.filter(hit)
  return [
    { id: 'open', items: yes.filter((r) => !r.done).sort(dt) },
    ...(yes.some((r) => r.done) ? [{ id: 'done', title: 'Completed', items: yes.filter((r) => r.done).sort(dt) }] : [])
  ]
}

/** The first screen the app offers on a fresh launch. */
export const DEFAULT_DEST = 'today'

// ---------- seed ----------

export function seed(): { lists: RList[]; items: Reminder[] } {
  const t = todayKey()
  const lists: RList[] = [
    { id: 'reminders', name: 'Reminders', color: 'blue', icon: 'checklist' },
    { id: 'groceries', name: 'Groceries', color: 'green', icon: 'cart' },
    { id: 'work', name: 'Work', color: 'indigo', icon: 'document' },
    { id: 'family', name: 'Family', color: 'orange', icon: 'people' }
  ]
  const items: Reminder[] = [
    {
      id: 's1',
      t: 'Pack for the demo',
      n: 'Cables, the dongle, the good tripod',
      date: addDays(t, -1),
      time: '18:00',
      flag: true,
      list: 'reminders'
    },
    { id: 's2', t: 'Morning sync notes', date: t, time: '09:30', list: 'work', tags: ['meetings'] },
    { id: 's3', t: 'Call the insurance #errands', date: t, list: 'reminders', pri: 2 },
    {
      id: 's4',
      t: 'Milk and eggs',
      list: 'groceries',
      subs: [
        { id: 's4a', t: 'Oat milk' },
        { id: 's4b', t: 'Free-range eggs' },
        { id: 's4c', t: 'Sourdough', done: true }
      ]
    },
    {
      id: 's5',
      t: 'Review the fold animation PR',
      date: addDays(t, 1),
      time: '14:00',
      flag: true,
      url: 'github.com/doan-labs/duo',
      list: 'work'
    },
    { id: 's6', t: 'Book flights for October', n: 'Window seat this time', date: addDays(t, 4), list: 'reminders' },
    { id: 's7', t: 'Water the monstera', date: addDays(t, 2), list: 'family' },
    { id: 's8', t: 'Return the library books', date: addDays(t, 7), time: '12:00', list: 'family' },
    { id: 's9', t: 'Polish the titanium', list: 'reminders' },
    {
      id: 's10',
      t: 'Backup the photo library #admin',
      date: addDays(t, 10),
      pri: 1,
      list: 'reminders'
    },
    { id: 's11', t: 'Read 20 pages', n: 'The foldable design book', flag: true, list: 'family' },
    { id: 's12', t: 'Ship the WebGL studio port', done: true, doneAt: Date.now() - 3600_000, list: 'work' },
    {
      id: 's13',
      t: 'Ask about the CSS3D panel tone mapping',
      done: true,
      doneAt: Date.now() - 86400_000 * 3,
      list: 'work'
    }
  ]
  return { lists, items }
}
