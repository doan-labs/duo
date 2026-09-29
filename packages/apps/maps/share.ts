// What both copies of Maps agree on. UI state - the query, the pin, the
// destination, the camera, the folded pane - lives in os.session, so a fold
// hands the same map over whole and closing the app clears it (DESIGN.md §2).
// The fetch caches are the bulky part: a long route's decoded geometry would
// not fit the session budget, so they sit in os.storage under 256KiB-per-key
// headroom. Their keys pin them to the request that asked; a stale record is
// only ever a cached answer, never a wrong one. Either copy writes intent and
// the one allowed to fetch fills the rest in; the folded copy never starts
// anything, it only draws what lands.

import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'
import { HOME, type MapKind, ME, type Place, type Recent, type View } from './data.ts'
import type { Route, TravelMode } from './live.ts'

export type Dir = { to: Place; mode: TravelMode; active: number }

/** The last route answer, keyed by the request that asked for it: `${mode}|${origin}|${to}`.
 * `tries` bounds retries: a transient failure asks again once, then stops. */
export type RoutesRec = { key: string; list: Route[] | null; failed: boolean; tries: number }

/** The last search answer, keyed by the query plus a coarse camera bucket -
 * Photon's bias follows the map at city scale, and so does the refresh. */
export type ResultsRec = { key: string; q: string; list: Place[]; failed: boolean; tries: number }

/** The card's drive-time answer for one selection, keyed like a route request. */
export type EstRec = { key: string; duration: number; distance: number; failed?: boolean; tries?: number }

export type MapState = {
  query: string
  results: ResultsRec | null
  sel: Place | null
  dir: Dir | null
  routes: RoutesRec
  estimate: EstRec | null
  me: { lat: number; lon: number; label?: string }
  recents: Recent[] | null
  // The camera and the layer go through too, so a fold hands over the same map,
  // not a reset one. Whoever is interacted with writes; the copy that may not
  // animate applies the writes flat.
  view: View
  kind: MapKind
  // The directions scroll offset, so the folded copy opens on the same turn.
  scroll: number
}

type UiState = Omit<MapState, 'results' | 'routes' | 'estimate'>
type NetState = Pick<MapState, 'results' | 'routes' | 'estimate'>
const NET_KEYS: ReadonlySet<keyof NetState> = new Set(['results', 'routes', 'estimate'])

const uiCell = cell<UiState>('session', 'maps.state', {
  query: '',
  sel: null,
  dir: null,
  me: ME,
  recents: null,
  view: HOME,
  kind: 'explore',
  scroll: 0
})
const netCell = cell<NetState>('storage', 'maps.net', {
  results: null,
  routes: { key: '', list: null, failed: false, tries: 0 },
  estimate: null
})

let merged: MapState = { ...uiCell.get(), ...netCell.get() }
const merge = () => {
  merged = { ...uiCell.get(), ...netCell.get() }
}
const subscribe = (listener: () => void) => {
  const notify = () => {
    merge()
    listener()
  }
  const ui = uiCell.subscribe(notify)
  const net = netCell.subscribe(notify)
  return () => {
    ui()
    net()
  }
}

export const share = {
  get: () => merged,
  set: (patch: Partial<MapState>) => {
    // Key routing is the only difference between the two cells, so callers
    // can mix both in one patch.
    const ui: Record<string, unknown> = {}
    const net: Record<string, unknown> = {}
    for (const key of Object.keys(patch) as (keyof MapState)[]) {
      ;(NET_KEYS.has(key as keyof NetState) ? net : ui)[key] = patch[key]
    }
    if (Object.keys(ui).length) uiCell.set({ ...uiCell.get(), ...(ui as Partial<UiState>) })
    if (Object.keys(net).length) netCell.set({ ...netCell.get(), ...(net as Partial<NetState>) })
  }
}

/** Every write replaces the merged object, so a piece of state is a stable effect dep until it really changes. */
export const useShared = () => useSyncExternalStore(subscribe, share.get)
