import { os, type Photo } from '@doan-labs/duo-sdk'
import type { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { useEffect, useState, useSyncExternalStore } from 'react'

export type Pic = { id: string; src: string; takenAt: number; ratio: number }

/** Read a stored photo as a data URL: the sandbox document policy allows no other image source. */
const dataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

let cached: Pic[] | undefined
/** The device's photo library through the SDK photos service, newest first; nothing invented. */
export function useLibrary() {
  const [pics, setPics] = useState<Pic[] | undefined>(cached)
  useEffect(() => {
    if (cached) return
    let live = true
    os.photos
      .list()
      .then((list: Photo[]) =>
        Promise.all(
          list.map(async (photo) => ({
            id: photo.id,
            src: await dataUrl(await os.photos.get(photo.id)),
            takenAt: photo.takenAt,
            ratio: photo.width / photo.height
          }))
        )
      )
      .then((all) => {
        cached = all.sort((a, b) => b.takenAt - a.takenAt)
        if (live) setPics(cached)
      })
      .catch(() => {
        if (live) setPics([])
      })
    return () => {
      live = false
    }
  }, [])
  return { pics: pics ?? [], loading: pics === undefined }
}

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
