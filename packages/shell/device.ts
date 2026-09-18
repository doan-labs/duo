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
  launch: (name: string) => void
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
  const lead = displays.find((d) => d.wide === wide)
  const other = displays.find((d) => d.wide !== wide)
  if (!lead || !other) return
  const stage = lead.stage()
  other.mirror(other.wide ? stage : stage.slice(0, 1).map((s) => ({ name: s.name })))
}

/**
 * What the buttons on the frame reach. Sleep, wake and power are device-wide; the
 * rest goes to the display in use, as iOS does with one screen at a time.
 */
export const device = {
  asleep: false,
  off: false,
  /** Ringer level, sixteenths like iOS. */
  level: 10,
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
  /** An app by name on the display in use; the embed bridge in main.ts uses this. */
  open: (name: string) => inUse().launch(name),
  siri: () => inUse().launch('Siri'),
  wallet: () => inUse().launch('Wallet'),
  camera: () => inUse().launch('Camera'),
  cameraOpen: () => !!inUse().cam(),
  shoot: () => inUse().cam()?.shoot(),
  record: (on: boolean) => inUse().cam()?.record(on),
  zoom: (z?: number) => inUse().cam()?.zoom(z) ?? 1,
  volume(d: number) {
    device.level = Math.min(16, Math.max(0, device.level + d))
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
  return () => {
    pull(displays, d)
    for (const f of hooks.home) pull(homes, f)
    pull(locks, hooks.lock)
    pull(unlocks, hooks.unlock)
  }
}
