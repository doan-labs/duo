import type { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { useSyncExternalStore } from 'react'

export type Pic = { id: string; src: string; takenAt: number; ratio: number }

const FIRST = new Date(2026, 1, 28, 9).getTime()
const LAST = new Date(2026, 8, 8, 18).getTime()
const SHAPES = [
  [400, 300],
  [300, 400],
  [400, 400],
  [520, 300],
  [300, 520],
  [400, 260]
]

/** Camera shots first (portrait, like the viewfinder), then placeholders spread across the library's dates. */
export const library = (shots: string[]): Pic[] => [
  ...shots.map((src, i) => ({ id: `shot:${src}`, src, takenAt: Date.now() - i * 60_000, ratio: 3 / 4 })),
  ...Array.from({ length: 44 }, (_, i) => {
    const [w, h] = SHAPES[(i * 7) % SHAPES.length]!
    return {
      id: `duo${i}`,
      src: `https://picsum.photos/seed/duo${i}/${w}/${h}`,
      takenAt: LAST - i * ((LAST - FIRST) / 43),
      ratio: w! / h!
    }
  })
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = [
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
const day = (t: number) => `${new Date(t).getDate()} ${MONTHS[new Date(t).getMonth()]}`
/** "28 Feb – 8 Sep 2026", the way the toolbar subtitle reads. */
export const range = (pics: Pic[]) => {
  if (!pics.length) return ''
  const a = Math.min(...pics.map((p) => p.takenAt))
  const b = Math.max(...pics.map((p) => p.takenAt))
  const ya = new Date(a).getFullYear()
  const yb = new Date(b).getFullYear()
  return `${day(a)}${ya === yb ? '' : ` ${ya}`} – ${day(b)} ${yb}`
}
export const month = (t: number) => `${LONG[new Date(t).getMonth()]} ${new Date(t).getFullYear()}`
export const year = (t: number) => String(new Date(t).getFullYear())

export type View = 'years' | 'months' | 'all'
export const VIEWS: [View, string][] = [
  ['years', 'Years'],
  ['months', 'Months'],
  ['all', 'All Photos']
]

export type Item = { id: string; name: string; sym: keyof typeof SYM; lock?: boolean }
/** Only the sidebar rows that show something real. */
export const SIDEBAR: { name?: string; items: Item[] }[] = [
  { items: [{ id: 'library', name: 'Library', sym: 'library' }] },
  {
    name: 'Pinned',
    items: [
      { id: 'favorites', name: 'Favorites', sym: 'heart' },
      { id: 'saved', name: 'Recently Saved', sym: 'saved' },
      { id: 'deleted', name: 'Recently Deleted', sym: 'trashOutline', lock: true }
    ]
  }
]
export const itemName = (id: string) => SIDEBAR.flatMap((s) => s.items).find((i) => i.id === id)?.name ?? 'Library'

/** What a sidebar item shows. Albums without a real source stay empty, like a fresh library. */
export function filter(id: string, pics: Pic[], fav: Set<string>, del: Set<string>, q: string) {
  const live = pics.filter((p) => !del.has(p.id))
  const shown =
    id === 'deleted'
      ? pics.filter((p) => del.has(p.id))
      : id === 'favorites'
        ? live.filter((p) => fav.has(p.id))
        : id === 'saved'
          ? live.filter((p) => p.takenAt > Date.now() - 30 * 864e5)
          : live
  const needle = q.trim().toLowerCase()
  return needle ? shown.filter((p) => `${month(p.takenAt)} ${day(p.takenAt)}`.toLowerCase().includes(needle)) : shown
}

/**
 * Selection, favourites and the bin live at module level so the copy the other
 * display holds during a fold (docs/decisions.md 24) shows the same library.
 */
const state = {
  place: 'library',
  view: 'all' as View,
  sel: '',
  open: '',
  fav: new Set<string>(),
  del: new Set<string>()
}
const listeners = new Set<() => void>()
let rev = 0
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
export function useStore() {
  useSyncExternalStore(subscribe, () => rev)
  return state
}
export function update(patch: Partial<typeof state>) {
  Object.assign(state, patch)
  rev++
  for (const cb of listeners) cb()
}
export function toggle(set: Set<string>, id: string) {
  set.has(id) ? set.delete(id) : set.add(id)
  update({})
}
