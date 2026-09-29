// Which pane is up, which book is open, whether the reader is up and what its
// chrome is doing. Shared across both displays, so it lives in os.session:
// the app's two copies are separate documents, and the fold hands the whole
// session over in one state.

import { cell } from '@doan-labs/duo-uikit/kv.ts'
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

const uiCell = cell<Ui>('session', 'books.ui', { tab: 'home', chrome: true, q: '' })

const set = (p: Partial<Ui>) => uiCell.set({ ...uiCell.get(), ...p })

export const useUi = () => useSyncExternalStore(uiCell.subscribe, uiCell.get)

export const go = (tab: Section) => set({ tab, detail: undefined })
export const openBook = (id: string) => set({ detail: id })
export const closeBook = () => set({ detail: undefined })
export const openReader = (id: string, seek?: number) => set({ reading: id, chrome: true, card: undefined, seek })
export const clearSeek = () => set({ seek: undefined })
export const closeReader = () => set({ reading: undefined, card: undefined })
// The aA card hangs off the chrome, so it never outlives it.
export const showChrome = (chrome: boolean) => set(chrome ? { chrome } : { chrome, card: undefined })
export const openCard = (card: Ui['card']) => set({ card, chrome: true })
export const setQuery = (q: string) => set({ q })
