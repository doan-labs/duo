// What a press on the frame means, as pure state machines: one per button.
// Each `next` takes a state and an event and returns the next state plus the
// effects for the driver in device-buttons.ts to run - timers come back in as
// `{ timer }` events, and device calls are plain data (`action`). Nothing in
// here waits, touches the DOM or imports the device, so every transition is
// testable on its own.
//
// iOS's rules, kept as they were:
//
//   side       click: sleep, or wake to the lock screen. Double-click: Wallet.
//              Hold: Siri (powered off: boot).
//   side+vol   click: screenshot. Held: slide to power off.
//   volume     volume, held: keeps going. In Camera: shutter on press; Volume
//              Up held is a burst, Volume Down held a QuickTake recording.
//   camera     click: Camera, or the shutter once it is open. Hold: record.
//              Slide along the cap: zoom.

// iOS's timings, kept as they were.
export const HOLD = 500
export const DOUBLE = 300
export const POWER = 1200
export const RECORD = 400
export const REPEAT = 130

/** A device call the driver makes; the machine decides which, the driver decides how. */
export type Action =
  | 'boot'
  | 'siri'
  /** The side button held down long enough: Siri, or boot while off. */
  | 'side-hold'
  | 'wallet'
  /** The side button clicked once: sleep or wake. */
  | 'side'
  | 'screenshot'
  /** The slide-to-power-off sheet. */
  | 'power-sheet'
  | 'camera'
  /** Camera Control tapped: the shutter if Camera is open, else launch it. */
  | 'cam-tap'
  | 'shoot'
  | 'record-on'
  | 'record-off'
  | 'burst-on'
  | 'burst-off'
  | { volume: 1 | -1 }
  | { zoom: number }

export type Effect<E> = { action: Action } | { after: number; event: E }
export type Step<S, E> = { state: S; effects: Effect<E>[] }
const same = <S, E>(state: S): Step<S, E> => ({ state, effects: [] })

// ---- side button ----

export type SideState =
  | { kind: 'idle' }
  /** Down, the hold timer running. `clicks` counts the clicks already banked inside this double window. */
  | { kind: 'pressed'; clicks: number }
  /** The hold fired: Siri up, or the boot under way. Dead until release. */
  | { kind: 'held' }
  /** Released once, inside the window where a second click means Wallet. */
  | { kind: 'waiting' }
  /** A volume key joined: the chord timer decides screenshot vs power off. */
  | { kind: 'chord'; spent: boolean }
  /** The chord ended but the side button is still down: dead until release. */
  | { kind: 'spent' }

export type SideEvent =
  | 'press'
  | 'release'
  /** A volume key went down while the side button is held, or vice versa. */
  | 'chord-press'
  /** The volume key came up while the side button is still held. */
  | 'chord-release'
  | { timer: 'hold' | 'double' | 'chord' }

export function nextSide(s: SideState, e: SideEvent): Step<SideState, SideEvent> {
  const hold = { after: HOLD, event: { timer: 'hold' as const } }
  if (e === 'press') {
    // A press while still waiting on a second click banks the first one.
    if (s.kind === 'idle') return { state: { kind: 'pressed', clicks: 0 }, effects: [hold] }
    if (s.kind === 'waiting') return { state: { kind: 'pressed', clicks: 1 }, effects: [hold] }
    return same(s)
  }
  if (e === 'release') {
    if (s.kind === 'pressed') {
      // The second click of a double-click acts at once; the first waits out the window.
      if (s.clicks > 0) return { state: { kind: 'idle' }, effects: [{ action: 'wallet' }] }
      return { state: { kind: 'waiting' }, effects: [{ after: DOUBLE, event: { timer: 'double' as const } }] }
    }
    if (s.kind === 'chord') return { state: { kind: 'idle' }, effects: s.spent ? [] : [{ action: 'screenshot' }] }
    return { state: { kind: 'idle' }, effects: [] }
  }
  if (e === 'chord-press') {
    // A spent chord already showed the power sheet: re-arming it would let
    // the second volume key's release fire a stray screenshot.
    if (s.kind === 'chord' && s.spent) return same(s)
    // Otherwise a fresh chord re-arms the power-off timer.
    return { state: { kind: 'chord', spent: false }, effects: [{ after: POWER, event: { timer: 'chord' as const } }] }
  }
  if (e === 'chord-release') {
    if (s.kind !== 'chord') return same(s)
    // The side button stays down, spent: its release does nothing on its own.
    return { state: { kind: 'spent' }, effects: s.spent ? [] : [{ action: 'screenshot' }] }
  }
  if (e.timer === 'hold' && s.kind === 'pressed') return { state: { kind: 'held' }, effects: [{ action: 'side-hold' }] }
  if (e.timer === 'double' && s.kind === 'waiting') return { state: { kind: 'idle' }, effects: [{ action: 'side' }] }
  if (e.timer === 'chord' && s.kind === 'chord' && !s.spent)
    return { state: { kind: 'chord', spent: true }, effects: [{ action: 'power-sheet' }] }
  return same(s)
}

// ---- each volume key ----

export type VolState =
  | { kind: 'idle' }
  /** No camera: the press stepped once and keeps stepping while held. */
  | { kind: 'repeating' }
  /** Camera is open: the press was a shutter, the hold timer decides burst or QuickTake. */
  | { kind: 'held' }
  | { kind: 'burst' }
  | { kind: 'recording' }
  /** Pressed into a side chord: dead until release. */
  | { kind: 'chord' }

export type VolEvent = { press: true; camera: boolean } | 'release' | 'chord-press' | { timer: 'vol-hold' | 'repeat' }

export function nextVol(b: 'up' | 'down', s: VolState, e: VolEvent): Step<VolState, VolEvent> {
  const step = { volume: b === 'up' ? (1 as const) : (-1 as const) }
  if (e === 'chord-press') return s.kind === 'idle' ? { state: { kind: 'chord' }, effects: [] } : same(s)
  if (e === 'release') {
    if (s.kind === 'burst') return { state: { kind: 'idle' }, effects: [{ action: 'burst-off' }] }
    if (s.kind === 'recording') return { state: { kind: 'idle' }, effects: [{ action: 'record-off' }] }
    return { state: { kind: 'idle' }, effects: [] }
  }
  if (typeof e === 'object' && 'press' in e) {
    if (s.kind !== 'idle') return same(s)
    const press = e as { press: true; camera: boolean }
    if (press.camera)
      return {
        state: { kind: 'held' },
        effects: [{ action: 'shoot' }, { after: HOLD, event: { timer: 'vol-hold' as const } }]
      }
    return {
      state: { kind: 'repeating' },
      effects: [{ action: step }, { after: 3 * REPEAT, event: { timer: 'repeat' as const } }]
    }
  }
  if (e.timer === 'vol-hold' && s.kind === 'held')
    return b === 'up'
      ? { state: { kind: 'burst' }, effects: [{ action: 'burst-on' }] }
      : { state: { kind: 'recording' }, effects: [{ action: 'record-on' }] }
  if (e.timer === 'repeat' && s.kind === 'repeating')
    return { state: s, effects: [{ action: step }, { after: REPEAT, event: { timer: 'repeat' as const } }] }
  return same(s)
}

// ---- Camera Control ----

export type CamState =
  | { kind: 'idle' }
  /** Down, the record timer running; `zoom0` is where the slide starts from. */
  | { kind: 'pressed'; zoom0: number }
  | { kind: 'sliding'; zoom0: number }
  | { kind: 'recording'; zoom0: number }

export type CamEvent =
  | { press: true; zoom0: number }
  | 'release'
  | { slide: number; camera: boolean }
  | { timer: 'record'; camera: boolean }

const zoomAt = (zoom0: number, cm: number) => Math.min(5, Math.max(0.5, zoom0 * 2 ** cm))

export function nextCam(s: CamState, e: CamEvent): Step<CamState, CamEvent> {
  if (typeof e === 'object' && 'press' in e)
    return s.kind === 'idle'
      ? {
          state: { kind: 'pressed', zoom0: e.zoom0 },
          effects: [{ after: RECORD, event: { timer: 'record' as const, camera: false } }]
        }
      : same(s)
  if (e === 'release') {
    if (s.kind === 'pressed') return { state: { kind: 'idle' }, effects: [{ action: 'cam-tap' }] }
    if (s.kind === 'recording') return { state: { kind: 'idle' }, effects: [{ action: 'record-off' }] }
    return { state: { kind: 'idle' }, effects: [] }
  }
  if (typeof e === 'object' && 'slide' in e) {
    if (!e.camera) return same(s)
    if (s.kind === 'pressed') {
      // A slide under a centimetre's fraction is finger noise, not a zoom.
      if (Math.abs(e.slide) < 0.04) return same(s)
      return { state: { kind: 'sliding', zoom0: s.zoom0 }, effects: [{ action: { zoom: zoomAt(s.zoom0, e.slide) } }] }
    }
    if (s.kind === 'sliding' || s.kind === 'recording')
      return { state: s, effects: [{ action: { zoom: zoomAt(s.zoom0, e.slide) } }] }
    return same(s)
  }
  if (e.timer === 'record' && s.kind === 'pressed')
    return e.camera
      ? { state: { kind: 'recording', zoom0: s.zoom0 }, effects: [{ action: 'record-on' }] }
      : { state: { kind: 'idle' }, effects: [] }
  return same(s)
}
