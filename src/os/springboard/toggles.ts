// The switches Control Center flips. Device-wide on purpose: each display runs
// its own <SpringBoard>, so anything kept in a panel's useState would let the
// cover sit in airplane mode while the inner display still had five bars. Both
// status stacks read this one object and `flip()` is the only way to write it.
//
// No React import beyond the subscription hook, and nothing here knows what a
// switch looks like — control-center.tsx draws them, status-bar.tsx reports them.

import { useSyncExternalStore } from 'react'

export type Toggles = {
  airplane: boolean
  cell: boolean
  wifi: boolean
  bt: boolean
  drop: boolean
  hotspot: boolean
  rotate: boolean
  mirror: boolean
  focus: boolean
  torch: boolean
}

/** The Wi-Fi network, named the same by the status stack and the connectivity page. */
export const NETWORK = 'pm1'
/** Charge, as the status stack reads it out while Control Center is open. */
export const BATTERY = 98

const state: Toggles = {
  airplane: false,
  cell: true,
  wifi: true,
  bt: true,
  drop: true,
  hotspot: false,
  rotate: false,
  mirror: false,
  focus: false,
  torch: false
}

/** The same object, for code with no render to hook: main.ts reads `torch` every frame to light the LED. */
export const toggles: Readonly<Toggles> = state

let rev = 0
const subs = new Set<() => void>()

/**
 * Flips one switch and tells every display. Airplane mode drags the three radios
 * down with it; turning one back on afterwards leaves airplane on, as iOS does.
 */
export function flip(k: keyof Toggles, v = !state[k]) {
  state[k] = v
  if (k === 'airplane' && v) {
    state.cell = false
    state.wifi = false
    state.bt = false
  }
  rev++
  for (const f of subs) f()
}

const sub = (f: () => void) => {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

/** Re-renders the caller on every flip. The object is stable, so `rev` is the snapshot. */
export function useToggles(): Readonly<Toggles> {
  useSyncExternalStore(sub, () => rev)
  return state
}
