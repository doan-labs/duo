// Which pane is up, which book is open, whether the reader is up and what its
// chrome is doing. Shared across both displays, so it lives in a module like
// the library - the app's two copies are separate React trees.

import { useSyncExternalStore } from 'react'

export type Section = 'home' | 'library' | 'store' | 'audio' | 'search' | `shelf:${string}`

export type Ui = {
  tab: Section
  /** The pushed book page, over the pane but under the reader. */
  detail?: string
  /** The full-screen reader. */
  reading?: string
  /** Reader chrome: shown on entry, hidden by a centre tap or a page turn. */
  chrome: boolean
  /** App-level cards: reader contents, find in book, new collection. */
  card?: 'toc' | 'find' | 'style' | 'shelf'
  /** The shared search string, so the sidebar field and Search agree. */
  q: string
  /** A block the reader should open at (a Contents row's chapter), consumed once. */
  seek?: number
}

let ui: Ui = { tab: 'home', chrome: true, q: '' }
const subs = new Set<() => void>()

const set = (p: Partial<Ui>) => {
  ui = { ...ui, ...p }
  for (const f of subs) f()
}

export const useUi = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => ui
  )

export const go = (tab: Section) => set({ tab, detail: undefined })
export const openBook = (id: string) => set({ detail: id })
export const closeBook = () => set({ detail: undefined })
export const openReader = (id: string, seek?: number) =>
  set({ reading: id, chrome: true, card: undefined, detail: undefined, seek })
export const clearSeek = () => set({ seek: undefined })
export const closeReader = () => set({ reading: undefined, card: undefined })
export const showChrome = (chrome: boolean) => set({ chrome })
export const openCard = (card: Ui['card']) => set({ card, chrome: true })
export const setQuery = (q: string) => set({ q })
