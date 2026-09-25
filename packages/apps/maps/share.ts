// What both copies of Maps agree on, kept in module storage the way music's
// deck is: the two displays run in one document, so a small store here is the
// shared storage DESIGN.md asks for. Either copy writes intent - a query, a
// pin, a destination - and the one allowed to fetch fills the rest in; the
// folded copy never starts anything, it only draws what lands.

import { useSyncExternalStore } from 'react'
import { ME, type Place, type Recent } from './data.ts'
import type { Route, TravelMode } from './live.ts'

export type Dir = { to: Place; mode: TravelMode; active: number }

/** The last route answer, keyed by the request that asked for it: `${mode}|${origin}|${to}`. */
export type RoutesRec = { key: string; list: Route[] | null; failed: boolean }

/** The last search answer, keyed by the query that asked for it. */
export type ResultsRec = { q: string; list: Place[]; failed: boolean }

/** The card's drive-time answer for one selection, keyed like a route request. */
export type EstRec = { key: string; duration: number; distance: number }

export type MapState = {
  query: string
  results: ResultsRec | null
  sel: Place | null
  dir: Dir | null
  routes: RoutesRec
  estimate: EstRec | null
  me: { lat: number; lon: number; label?: string }
  recents: Recent[] | null
}

let state: MapState = {
  query: '',
  results: null,
  sel: null,
  dir: null,
  routes: { key: '', list: null, failed: false },
  estimate: null,
  me: ME,
  recents: null
}
const subs = new Set<() => void>()

export const share = {
  get: () => state,
  set: (patch: Partial<MapState>) => {
    state = { ...state, ...patch }
    for (const f of subs) f()
  },
  sub: (f: () => void) => {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  }
}

/** Every write replaces the object, so a piece of state is a stable effect dep until it really changes. */
export const useShared = () => useSyncExternalStore(share.sub, share.get)
