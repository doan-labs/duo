// Which layer is on top of the glass, and whether the lock screen is up, each
// as one discriminated value with one transition (decisions.md 114). React
// drives these through `useReducer`; the imperative gestures keep a mirrored
// ref so a callback can read the phase synchronously.
//
// The overlay union replaces what used to be four booleans (`switcher`,
// `searching`, `cc`/`ccOn`, `poff`): locking or sleeping used to clear only
// some of them, which left Spotlight or the power-off sheet drawn over the
// lock screen after wake.

/** A layer Control Center can be pulled over: it comes back when the panel goes. */
type Under = { kind: 'none' } | { kind: 'switcher' } | { kind: 'search' } | { kind: 'power' }

export type Layer = Under | { kind: 'control'; closing: boolean; under: Under }

export type LayerEvent =
  | 'open-switcher'
  | 'open-search'
  | 'pull-control'
  | 'open-power'
  /** Home with Control Center up: what is under it goes now, the panel plays out first. */
  | 'drop-under'
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
      return { kind: 'control', closing: false, under: s.kind === 'control' ? s.under : s }
    case 'open-power':
      // From Control Center's power button: the sheet goes under the panel,
      // which keeps playing out and hands over when it settles.
      return s.kind === 'control' ? { kind: 'control', closing: true, under: { kind: 'power' } } : { kind: 'power' }
    case 'drop-under':
      return s.kind === 'control' ? { ...s, under: { kind: 'none' } } : { kind: 'none' }
    case 'close-control':
      return s.kind === 'control' ? { ...s, closing: true } : s
    case 'control-closed':
      // Only ever closes Control Center: a settle callback that fires after
      // another layer took over (the power sheet from a CC button) is stale.
      return s.kind === 'control' ? s.under : s
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
