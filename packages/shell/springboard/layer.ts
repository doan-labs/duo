// Which layer is on top of the glass, and whether the lock screen is up, each
// as one discriminated value with one transition (decisions.md 114). React
// drives these through `useReducer`; the imperative gestures keep a mirrored
// ref so a callback can read the phase synchronously.
//
// The overlay union replaces what used to be four booleans (`switcher`,
// `searching`, `cc`/`ccOn`, `poff`): locking or sleeping used to clear only
// some of them, which left Spotlight or the power-off sheet drawn over the
// lock screen after wake.

export type Layer =
  | { kind: 'none' }
  | { kind: 'switcher' }
  | { kind: 'search' }
  | { kind: 'control'; closing: boolean }
  | { kind: 'power' }

export type LayerEvent =
  | 'open-switcher'
  | 'open-search'
  | 'pull-control'
  | 'open-power'
  /** The Control Center is animating out; a later 'control-closed' unmounts it. */
  | 'close-control'
  /** The Control Center finished leaving, or its pull was cancelled. */
  | 'control-closed'
  /** A layer's own close (Spotlight pick or close, switcher tap, power cancel). */
  | 'close'
  /** Lock or sleep: every layer drops at once, in the one place that decides it. */
  | 'lock'

export function nextLayer(s: Layer, e: LayerEvent): Layer {
  switch (e) {
    case 'lock':
    case 'close':
      return { kind: 'none' }
    case 'open-switcher':
      return { kind: 'switcher' }
    case 'open-search':
      return { kind: 'search' }
    case 'pull-control':
      return { kind: 'control', closing: false }
    case 'open-power':
      return { kind: 'power' }
    case 'close-control':
      return s.kind === 'control' ? { kind: 'control', closing: true } : s
    case 'control-closed':
      // Only ever closes Control Center: a settle callback that fires after
      // another layer took over (the power sheet from a CC button) is stale.
      return s.kind === 'control' ? { kind: 'none' } : s
  }
}

/** The lock screen's phase: `locked` is shown, `unlocking` still mounted while it lifts out. */
export type Lock = 'unlocked' | 'locked' | 'unlocking'

export type LockEvent = 'lock' | 'unlock' | 'unlocked'

export function nextLock(s: Lock, e: LockEvent): Lock {
  switch (e) {
    case 'lock':
      // Also wins over a mid-lift 'unlocking': a fresh lock is not stale.
      return 'locked'
    case 'unlock':
      return s === 'locked' ? 'unlocking' : s
    case 'unlocked':
      return s === 'unlocking' ? 'unlocked' : s
  }
}
