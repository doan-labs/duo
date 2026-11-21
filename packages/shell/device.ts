// The device as the frame buttons see it: one lock, one sleep state, and a
// registry of the displays attached to it. It knows nothing about React or the
// shell on purpose, so packages/shell/device-buttons.ts and packages/shell/main.ts can reach the hardware
// side of iOS without importing the UI.

import type { CameraHooks, DeviceEvents } from '@doan-labs/duo-sdk'
import { maskDisplays } from './runtime/display.ts'

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
  /** The device's power phase changed; the display re-derives what it shows. */
  power: (p: Power) => void
  launch: (name: string, arg?: string) => void
  cam: () => CameraHooks | null
  hud: () => void
  screenshot: () => void
  /** Opens the slide-to-power-off sheet. */
  powerSheet: () => void
  /** What is open here, in stage order. */
  stage: () => Stage
  /** Shows exactly `want`, with no zooms: this display is mirroring the other, not launching. */
  mirror: (want: Stage) => void
  /** Pokes a re-render so `os.mirror` - which reads `active.wide` live - reaches its scenes. */
  wake: () => void
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
  const crossed = active.wide !== wide
  active.wide = wide
  const lead = displays.find((d) => d.wide === wide)
  const other = displays.find((d) => d.wide !== wide)
  if (!lead || !other) return
  // The flag on the scenes flips with the pose; without a poke the apps keep
  // rendering - and gating - on the side of the fold they spawned on.
  if (crossed) {
    lead.wake()
    other.wake()
  }
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
 * How long the boot logo stays up at minimum. Only on localhost, where demos
 * are recorded: a visitor's boot takes exactly as long as the load.
 */
export const BOOT_MS = typeof location !== 'undefined' && location.hostname === 'localhost' ? 3000 : 0
/** The logo's fade into the booted screen; displays keep it mounted this long with `leaving`. */
export const BOOT_FADE_MS = 700

/**
 * The device's power phase: the one value that says whether the glass is dark,
 * booting, asleep or live. It used to be two booleans (`asleep`, `off`) plus a
 * boot flag the shell kept separately, which let a side click wake past the
 * boot screen and left the boot timers running on top of a new boot
 * (decisions.md 114).
 */
export type Power =
  | { kind: 'off' }
  /** The logo is up; `leaving` once the live screen is underneath and it is fading out. */
  | { kind: 'booting'; leaving: boolean }
  | { kind: 'asleep' }
  | { kind: 'awake' }

// The boot timers: one handle, owned by the phase that armed it.
let bootTimer = 0
const cancelBoot = () => {
  clearTimeout(bootTimer)
  bootTimer = 0
}
const powerSubs = new Set<(p: Power) => void>()
/** Runs `f` on every power phase change; the button driver clears dead work with it. */
export const onPower = (f: (p: Power) => void) => {
  powerSubs.add(f)
  return () => powerSubs.delete(f)
}
/** Pushes the power phase at every display and at the glass mask, in one place. */
function syncPower() {
  for (const d of displays) d.power(device.power)
  maskDisplays(device.power.kind === 'asleep' || device.power.kind === 'off')
  powerSubs.forEach((f) => f(device.power))
}

/**
 * What the buttons on the frame reach. Sleep, wake and power are device-wide; the
 * rest goes to the display in use, as iOS does with one screen at a time.
 */
export const device = {
  power: { kind: 'awake' } as Power,
  /** Dark to a reader that wants the screen off: asleep or powered down, but lit through a boot. */
  get asleep() {
    return device.power.kind === 'asleep' || device.power.kind === 'off'
  },
  get off() {
    return device.power.kind === 'off'
  },
  /** Ringer level, sixteenths like iOS. */
  level: savedLevel() ?? 10,
  sleep() {
    if (device.power.kind === 'off' || device.power.kind === 'asleep') return
    cancelBoot()
    lockAll()
    device.power = { kind: 'asleep' }
    syncPower()
  },
  wake() {
    // A boot plays through: waking early would skip the logo mid-boot.
    if (device.power.kind !== 'asleep') return
    device.power = { kind: 'awake' }
    syncPower()
  },
  /** The side button clicked: wake to the lock screen, or sleep. Dead while off or booting. */
  side() {
    if (device.power.kind === 'awake') device.sleep()
    else if (device.power.kind === 'asleep') device.wake()
  },
  /** An app by name on the display in use; `arg` reaches it as `os.arg`. The embed bridge in main.ts uses this. */
  open: (name: string, arg?: string) => inUse().launch(name, arg),
  siri() {
    if (device.power.kind === 'off' || device.power.kind === 'booting') return
    inUse().launch('Siri')
  },
  wallet() {
    if (device.power.kind === 'off' || device.power.kind === 'booting') return
    for (const claim of sideClaims) if (claim()) return
    inUse().launch('Wallet')
  },
  camera() {
    if (device.power.kind === 'off' || device.power.kind === 'booting') return
    inUse().launch('Camera')
  },
  cameraOpen: () => !!inUse().cam(),
  shoot: () => inUse().cam()?.shoot(),
  record: (on: boolean) => inUse().cam()?.record(on),
  burst: (on: boolean) => inUse().cam()?.burst?.(on),
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
    if (device.power.kind === 'awake') inUse().hud()
  },
  screenshot() {
    if (device.power.kind === 'awake') inUse().screenshot()
  },
  /** The slide-to-power-off chord held long enough: the sheet, on the display in use. */
  powerSheet() {
    if (device.power.kind === 'awake') inUse().powerSheet()
  },
  powerOff() {
    cancelBoot()
    lockAll()
    device.power = { kind: 'off' }
    syncPower()
  },
  /** Side-button hold while off: the logo goes up and the boot timers are this phase's to own. */
  boot() {
    if (device.power.kind !== 'off') return
    cancelBoot()
    device.power = { kind: 'booting', leaving: false }
    syncPower()
    bootTimer = setTimeout(() => {
      bootTimer = 0
      if (device.power.kind !== 'booting') return
      device.power = { kind: 'booting', leaving: true }
      syncPower()
      bootTimer = setTimeout(() => {
        bootTimer = 0
        if (device.power.kind !== 'booting') return
        device.power = { kind: 'awake' }
        syncPower()
      }, BOOT_FADE_MS)
    }, BOOT_MS)
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

// A foreground app with a confirmation sheet up can claim the side button's
// double-click; each claim returns whether it consumed the press.
const sideClaims = new Set<() => boolean>()
export const claimSide = (claim: () => boolean) => {
  sideClaims.add(claim)
  return () => {
    sideClaims.delete(claim)
  }
}

/** The frame buttons an app can listen to, in the words it hears them. */
export type Heard = Pick<DeviceEvents, 'volume' | 'camera-control' | 'side'>
/** Answers a press with whether it took it; a listener that did also hears that press's slide and release. */
export type Listener<K extends keyof Heard = keyof Heard> = (e: Heard[K]) => boolean
const listeners: { [K in keyof Heard]: Set<Listener<K>> } = {
  volume: new Set(),
  'camera-control': new Set(),
  side: new Set()
}
/** An app listening to a frame button, from packages/shell/runtime/device-events.ts. Returns the stop. */
export function listen<K extends keyof Heard>(button: K, listener: Listener<K>) {
  listeners[button].add(listener)
  return () => {
    listeners[button].delete(listener)
  }
}
/** The first listener, in listening order, that takes the press; none leaves it to the system. */
export function offer<K extends keyof Heard>(button: K, press: Heard[K]): Listener<K> | undefined {
  for (const listener of listeners[button]) if (listener(press)) return listener
}

/**
 * The phone's pose in degrees, as main.ts last drew it. Rounded to a tenth, so
 * an ease that has all but landed stops talking instead of trickling forever.
 */
const pose = { yaw: 0, hinge: 180 }
const poseWatchers = new Set<() => void>()
const tenth = (n: number) => Math.round(n * 10) / 10
export function setPose(yaw: number, hinge: number) {
  // Radians that pile up turn after turn, into [-180, 180) degrees.
  const deg = (((((yaw * 180) / Math.PI) % 360) + 540) % 360) - 180
  const next = { yaw: tenth(deg) === 180 ? -180 : tenth(deg), hinge: tenth(hinge) }
  if (next.yaw === pose.yaw && next.hinge === pose.hinge) return
  Object.assign(pose, next)
  for (const f of poseWatchers) f()
}
export const orientation = () => ({ ...pose })
export const watchOrientation = (f: () => void) => {
  poseWatchers.add(f)
  return () => {
    poseWatchers.delete(f)
  }
}
