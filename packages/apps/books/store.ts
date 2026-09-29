// The library: what you own, what you want, where you stopped, your marks and
// shelves, and the reader's look. Persisted under `duo.books.v1` in os.storage
// so it survives app swaps and reaches both displays' copies.

import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'
import { byId } from './data.ts'

export type ThemeId = 'original' | 'quiet' | 'paper' | 'bold' | 'calm' | 'focus'
export type FontId = 'original' | 'athelas' | 'charter' | 'georgia' | 'iowan' | 'palatino' | 'seravek' | 'times'

export type Prefs = { theme: ThemeId; font: FontId; size: number; vertical: boolean }
export type Mark = { b: number; t: number }
export type Shelf = { id: string; name: string; ids: string[] }

export type Lib = {
  owned: string[]
  want: string[]
  finished: string[]
  progress: Record<string, { frac: number; t: number }>
  marks: Record<string, Mark[]>
  shelves: Shelf[]
  prefs: Prefs
  last?: string
}

const seed = (): Lib => ({
  owned: ['alice', 'moby', 'frankenstein', 'pride', 'dracula', 'time', 'sherlock', 'jane', 'treasure', 'peter'],
  want: ['gatsby', 'dorian'],
  finished: ['frankenstein', 'treasure'],
  progress: {
    alice: { frac: 0.34, t: 2 },
    moby: { frac: 0.07, t: 1 },
    sherlock: { frac: 0.62, t: 0 }
  },
  marks: { alice: [{ b: 3, t: 1 }] },
  shelves: [
    { id: 'bedtime', name: 'Bedtime', ids: ['peter', 'alice', 'time'] },
    { id: 'october', name: 'October', ids: ['dracula', 'frankenstein'] }
  ],
  prefs: { theme: 'original', font: 'original', size: 4, vertical: false },
  last: 'alice'
})

const libCell = cell<Lib>('storage', 'duo.books.v1', seed())

export const useLib = () => useSyncExternalStore(libCell.subscribe, libCell.get)

const patch = (fn: (s: Lib) => Partial<Lib>) => {
  const lib = libCell.get()
  libCell.set({ ...lib, ...fn(lib) })
}

/** Store it under the same rules a real purchase would follow. */
export const own = (id: string) =>
  patch((s) => ({
    owned: s.owned.includes(id) ? s.owned : [...s.owned, id],
    want: s.want.filter((w) => w !== id)
  }))

export const toggleWant = (id: string) =>
  patch((s) => ({
    want: s.want.includes(id) ? s.want.filter((w) => w !== id) : s.owned.includes(id) ? s.want : [...s.want, id]
  }))

export const toggleFinished = (id: string) =>
  patch((s) => ({
    finished: s.finished.includes(id) ? s.finished.filter((f) => f !== id) : [...s.finished, id]
  }))

/** frac is reading position 0..1; `last` feeds Home's hero card. */
export const setProgress = (id: string, frac: number) =>
  patch((s) => ({
    progress: { ...s.progress, [id]: { frac: Math.max(0, Math.min(1, frac)), t: Date.now() } },
    last: id
  }))

export const toggleMark = (id: string, b: number) =>
  patch((s) => {
    const ms = s.marks[id] ?? []
    return {
      marks: {
        ...s.marks,
        [id]: ms.some((m) => m.b === b) ? ms.filter((m) => m.b !== b) : [...ms, { b, t: Date.now() }]
      }
    }
  })

export const addShelf = (name: string) =>
  patch((s) => ({
    shelves: [...s.shelves, { id: `c${Date.now().toString(36)}`, name, ids: [] }]
  }))

export const toggleOnShelf = (shelf: string, id: string) =>
  patch((s) => ({
    shelves: s.shelves.map((sh) =>
      sh.id === shelf ? { ...sh, ids: sh.ids.includes(id) ? sh.ids.filter((i) => i !== id) : [...sh.ids, id] } : sh
    )
  }))

export const setPrefs = (p: Partial<Prefs>) => patch((s) => ({ prefs: { ...s.prefs, ...p } }))

/** In-progress books, most recently opened first. */
export const readingNow = (s: Lib) =>
  Object.entries(s.progress)
    .filter(([id, p]) => p.frac > 0 && p.frac < 1 && s.owned.includes(id) && !s.finished.includes(id))
    .sort((a, b) => b[1].t - a[1].t)
    .map(([id]) => byId(id))
