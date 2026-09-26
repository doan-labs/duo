// The app's own state: subscriptions, downloads and listening history persist
// under `duo.podcasts.` so they survive app swaps; the pane, open pages and the
// toast are session cells shared by both displays and never written out.
// (Module-cell pattern: apps/memos/store.ts.)

import { useSyncExternalStore } from 'react'
import type { Ep } from './data.ts'
import { podcastsDeck } from './deck.ts'

function cell<T>(key: string | null, initial: T) {
  let value = initial
  if (key) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) value = JSON.parse(raw) as T
    } catch {}
  }
  const subs = new Set<() => void>()
  return {
    subscribe: (fn: () => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    get: () => value,
    set: (v: T) => {
      value = v
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {}
      }
      for (const fn of subs) fn()
    }
  }
}

export const subsCell = cell<Record<string, true>>('duo.podcasts.subs.v1', {})
export const dlCell = cell<Record<string, number>>('duo.podcasts.dl.v1', {})
export const histCell = cell<{ id: string; at: number }[]>('duo.podcasts.hist.v1', [])

export type Tab = 'listen' | 'library' | 'search'

export type Ui = {
  tab: Tab
  /** The pushed show page. */
  show?: string
  /** The pushed episode page, over the show page. */
  ep?: string
  /** The Now Playing sheet. */
  player: boolean
  /** The Up Next page. */
  queue: boolean
  q: string
}

let ui: Ui = { tab: 'listen', player: false, queue: false, q: '' }
const uiSubs = new Set<() => void>()
const setUi = (p: Partial<Ui>) => {
  ui = { ...ui, ...p }
  for (const f of uiSubs) f()
}
export const useUi = () =>
  useSyncExternalStore(
    (f) => {
      uiSubs.add(f)
      return () => uiSubs.delete(f)
    },
    () => ui
  )
/** Same pane state, minus the hook, for tests and plain callers. */
export const uiNow = () => ui

export const go = (tab: Tab) => setUi({ tab })
export const openShow = (title: string) => setUi({ show: title, ep: undefined })
export const closeShow = () => setUi({ show: undefined, ep: undefined })
export const openEp = (id: string) => setUi({ ep: id })
export const closeEp = () => setUi({ ep: undefined })
export const setPlayer = (player: boolean) => setUi({ player })
export const setQueueOpen = (queue: boolean) => setUi({ queue })
export const setQ = (q: string) => setUi({ q })

export const useSubs = () => useSyncExternalStore(subsCell.subscribe, subsCell.get)
export const useDls = () => useSyncExternalStore(dlCell.subscribe, dlCell.get)
export const useHist = () => useSyncExternalStore(histCell.subscribe, histCell.get)

// ---------- feedback ----------

const toastCell = cell<string | null>(null, '')
export const useToastMsg = () => useSyncExternalStore(toastCell.subscribe, toastCell.get)
let toastTimer: ReturnType<typeof setTimeout> | undefined
export const say = (msg: string) => {
  toastCell.set(msg)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastCell.set(''), 1600)
}

// ---------- actions ----------

export const toggleSub = (show: string) => {
  const subs = { ...subsCell.get() }
  const on = !subs[show]
  if (on) subs[show] = true
  else delete subs[show]
  subsCell.set(subs)
  say(on ? `Subscribed to ${show}` : `Unsubscribed from ${show}`)
}

export const toggleDownload = (ep: Ep) => {
  const dls = { ...dlCell.get() }
  const on = !dls[ep.id]
  if (on) dls[ep.id] = Date.now()
  else delete dls[ep.id]
  dlCell.set(dls)
  // Downloads are simulated: no network fetch, just the marked episode.
  say(on ? 'Downloaded' : 'Download removed')
}

export const pushHist = (ep: Ep) => {
  const hist = histCell.get().filter((h) => h.id !== ep.id)
  histCell.set([{ id: ep.id, at: Date.now() }, ...hist].slice(0, 50))
}

export const share = async (ep: Ep) => {
  try {
    await navigator.clipboard?.writeText(`duo://podcasts/${ep.id}`)
  } catch {}
  say('Link copied')
}

export const addToQueue = (ep: Ep, next: boolean) => {
  podcastsDeck.enqueue(ep, next)
  say(next ? 'Playing next' : 'Added to queue')
}

// Every episode the deck starts lands in history.
podcastsDeck.onStart = pushHist
