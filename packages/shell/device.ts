// The device as the frame buttons see it: one lock, one sleep state, and a
// registry of the displays attached to it. It knows nothing about React or the
// shell on purpose, so packages/shell/device-buttons.ts and packages/shell/main.ts can reach the hardware
// side of iOS without importing the UI.

import type { CameraHooks } from '@doan-labs/duo-sdk'

// The home bar is a 5 px pill on a panel you may be looking at edge-on, and
// there is no swipe-up gesture here, so the page keeps a Home button.
const homes: (() => void)[] = []
/** Closes whatever app is open, on every display. */
export const goHome = () => homes.forEach((f) => f())

// One lock for the whole device: unlocking on the cover keeps it unlocked when
// it opens. main.ts reads `locked` to pick which baked texture the fold shows.
export const lockState = { locked: true }
const locks: (() => void)[] = []
const unlocks: (() => void)[] = []
/** Back to the lock screen, on every display. */
export const lockAll = () => {
  lockState.locked = true
  homes.forEach((f) => f())
  locks.forEach((f) => f())
}
export const unlockAll = () => {
  lockState.locked = false
  unlocks.forEach((f) => f())
}

/** The display in use: inner while open, cover while closed. main.ts sets it each frame. */
export const active = { wide: true }
export type Display = {
  wide: boolean
  dark: (on: boolean) => void
  launch: (name: string, arg?: string) => void
  cam: () => CameraHooks | null
  hud: () => void
  screenshot: () => void
  power: () => void
  boot: () => void
  /** What is open here, in stage order. */
  stage: () => Stage
  /** Shows exactly `want`, with no zooms: this display is mirroring the other, not launching. */
  mirror: (want: Stage) => void
  /** Nothing of the home screen shows: an app has this display, or two halves do. */
  covered: () => boolean
}
/** The apps on a display: the whole of it when `side` is unset, one half each otherwise. */
export type Stage = { name: string; side?: 'left' | 'right' }[]
const displays: Display[] = []
const inUse = () => displays.find((d) => d.wide === active.wide) ?? displays[0]!
// An open that beats the displays booting (a builder preview apply arrives with
// the module, os.tsx mounts them once the registry is in) replays when the active
// one attaches, the same way `late` poses do in main.ts.
const pending: { name: string; arg?: string }[] = []
function flushPending() {
  const d = displays.find((display) => display.wide === active.wide)
  if (!d) return
  for (const request of pending.splice(0)) d.launch(request.name, request.arg)
}
/** The displays have booted (os.tsx renders them once the registry is in); before that there is nothing to launch on. */
export const booted = () => displays.length > 0
/** An app is up somewhere, so the baked home screen is not what the device is doing. */
export const busy = () => displays.some((d) => d.covered())

/**
 * From main.ts every frame: the display in use leads, the other mirrors it. So
 * the cover already shows the app before the fold turns it to you and the inner
 * display already has it back before it opens — nothing launches at the
 * crossover, and a fold and return touch nothing. The cover cannot split
 * (decisions.md 21), so it mirrors the first app, whole.
 */
export function follow(wide: boolean) {
  active.wide = wide
  flushPending()
  const lead = displays.find((d) => d.wide === wide)
  const other = displays.find((d) => d.wide !== wide)
  if (!lead || !other) return
  const stage = lead.stage()
  other.mirror(other.wide ? stage : stage.slice(0, 1).map((s) => ({ name: s.name })))
}

// The ringer level, `os.level` in localStorage so a reload does not reset it.
const LEVEL_KEY = 'os.level'
const savedLevel = () => {
  try {
    const raw = localStorage.getItem(LEVEL_KEY)
    // `getItem` is null, never the string "null", on a miss: Number(null) is 0.
    if (raw === null) return null
    const v = Number(raw)
    return Number.isFinite(v) ? Math.min(16, Math.max(0, v)) : null
  } catch {
    return null
  }
}

/**
 * What the buttons on the frame reach. Sleep, wake and power are device-wide; the
 * rest goes to the display in use, as iOS does with one screen at a time.
 */
export const device = {
  asleep: false,
  off: false,
  /** Ringer level, sixteenths like iOS. */
  level: savedLevel() ?? 10,
  sleep() {
    lockAll()
    device.asleep = true
    for (const d of displays) d.dark(true)
  },
  wake() {
    if (device.off) return
    device.asleep = false
    for (const d of displays) d.dark(false)
  },
  /** The side button clicked: wake to the lock screen, or sleep. Only the swipe unlocks. */
  side() {
    if (device.off) return
    if (device.asleep) device.wake()
    else device.sleep()
  },
  /** An app by name on the display in use; `arg` reaches it as `os.arg`. The embed bridge in main.ts uses this. */
  open: (name: string, arg?: string) => {
    const d = displays.find((display) => display.wide === active.wide)
    if (!d) {
      pending.push({ name, arg })
      return
    }
    d.launch(name, arg)
  },
  siri: () => inUse().launch('Siri'),
  wallet: () => {
    for (const claim of sideClaims) if (claim()) return
    inUse().launch('Wallet')
  },
  camera: () => inUse().launch('Camera'),
  cameraOpen: () => !!inUse().cam(),
  shoot: () => inUse().cam()?.shoot(),
  record: (on: boolean) => inUse().cam()?.record(on),
  zoom: (z?: number) => inUse().cam()?.zoom(z) ?? 1,
  /** Sets the ringer level and keeps it. Control Center's slider and the volume buttons share this. */
  setLevel(n: number) {
    device.level = Math.min(16, Math.max(0, n))
    try {
      localStorage.setItem(LEVEL_KEY, String(device.level))
    } catch {
      // Private mode or quota: the level holds until the page reloads.
    }
  },
  volume(d: number) {
    device.setLevel(device.level + d)
    if (!device.asleep) inUse().hud()
  },
  screenshot() {
    if (!device.asleep) inUse().screenshot()
  },
  power() {
    if (!device.asleep) inUse().power()
  },
  powerOff() {
    device.sleep()
    device.off = true
  },
  boot() {
    device.off = false
    inUse().boot()
  }
}

const pull = <T>(list: T[], x: T) => {
  const i = list.indexOf(x)
  if (i >= 0) list.splice(i, 1)
}

/** Attaches a display and its device-wide hooks. Returns the detach. */
export function addDisplay(
  d: Display,
  hooks: { home: (() => void)[]; lock: () => void; unlock: () => void }
): () => void {
  displays.push(d)
  for (const f of hooks.home) homes.push(f)
  locks.push(hooks.lock)
  unlocks.push(hooks.unlock)
  flushPending()
  return () => {
    pull(displays, d)
    for (const f of hooks.home) pull(homes, f)
    pull(locks, hooks.lock)
    pull(unlocks, hooks.unlock)
  }
}

// A foreground app with a confirmation sheet up can claim the side button's
// double-click; each claim returns whether it consumed the press.
const sideClaims = new Set<() => boolean>()
export const claimSide = (claim: () => boolean) => {
  sideClaims.add(claim)
  return () => {
    sideClaims.delete(claim)
  }
}
