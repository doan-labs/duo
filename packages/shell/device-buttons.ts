// The driver for the button machines in device-buttons-machine.ts: it keeps
// each machine's state, runs the effects they return (the timers, the device
// calls) and routes the presses apps take. One timer set per machine, cleared
// whenever its state moves - leaving a phase cancels what it armed.
//
// An app listening to volume or Camera Control takes the press instead, and one
// listening to the side button hears it while it still does all of the above
// (docs/platform/contract.md 3.8). The side+volume chord is always the system's.
//
// The hardware that produces the presses is packages/shell/buttons.ts.

import type { Button, Press } from './buttons.ts'
import { device, type Heard, type Listener, offer, onPower } from './device.ts'
import {
  type Action,
  type CamEvent,
  type CamState,
  nextCam,
  nextSide,
  nextVol,
  type SideEvent,
  type SideState,
  type Step,
  type VolEvent,
  type VolState
} from './device-buttons-machine.ts'

/** One machine's live state and the timers it armed but has not fired. */
type Machine<S, E> = { state: S; timers: Map<string, number> }

/** Who took each button's press, so its slide and release reach the same listener. */
const taken = new Map<Button, Listener>()
/** Offers a press to the apps; true when one took it. */
function give<K extends keyof Heard>(button: Button, kind: K, press: Heard[K]) {
  const listener = offer(kind, press)
  if (listener) taken.set(button, listener as Listener)
  return !!listener
}
/** Hands a taken press its next event; true when there was one to hand it to. */
function tell(button: Button, e: Heard[keyof Heard], last = false) {
  const listener = taken.get(button)
  if (last) taken.delete(button)
  listener?.(e)
  return !!listener
}

/** The device calls the machines' `action` effects stand for. */
function act(action: Action) {
  if (typeof action === 'object') {
    if ('volume' in action) return device.volume(action.volume)
    if ('zoom' in action) return void device.zoom(action.zoom)
  }
  switch (action) {
    case 'boot':
      return device.boot()
    case 'siri':
      return device.siri()
    case 'side-hold':
      return device.off ? device.boot() : device.siri()
    case 'wallet':
      return device.wallet()
    case 'side':
      return device.side()
    case 'screenshot':
      return device.screenshot()
    case 'power-sheet':
      return device.powerSheet()
    case 'camera':
      return device.camera()
    case 'cam-tap':
      return device.cameraOpen() ? device.shoot() : device.camera()
    case 'shoot':
      return device.shoot()
    case 'record-on':
      return device.record(true)
    case 'record-off':
      return device.record(false)
    case 'burst-on':
      return device.burst(true)
    case 'burst-off':
      return device.burst(false)
  }
}

/**
 * Applies a machine's step: the new state, its timers replaced wholesale (the
 * old phase's timers die with it), then each effect. A timer firing sends its
 * event back into the same machine through `fire`.
 */
function run<S, E>(m: Machine<S, E>, step: Step<S, E>, fire: (e: E) => void) {
  const same = step.state === m.state && step.effects.length === 0
  m.state = step.state
  if (same) return
  for (const t of m.timers.values()) clearTimeout(t)
  m.timers.clear()
  for (const ef of step.effects) {
    if ('action' in ef) act(ef.action)
    else if (ef.event && typeof ef.event === 'object' && 'timer' in ef.event) {
      const name = String(ef.event.timer)
      m.timers.set(
        name,
        setTimeout(() => {
          m.timers.delete(name)
          fire(ef.event)
        }, ef.after) as unknown as number
      )
    }
  }
}

const side: Machine<SideState, SideEvent> = { state: { kind: 'idle' }, timers: new Map() }
const vol: Record<'up' | 'down', Machine<VolState, VolEvent>> = {
  up: { state: { kind: 'idle' }, timers: new Map() },
  down: { state: { kind: 'idle' }, timers: new Map() }
}
const cam: Machine<CamState, CamEvent> = { state: { kind: 'idle' }, timers: new Map() }

const fireSide = (e: SideEvent) => run(side, nextSide(side.state, e), fireSide)
const fireVol = (b: 'up' | 'down') => (e: VolEvent) => run(vol[b], nextVol(b, vol[b].state, e), fireVol(b))
// The machine does not see the device; the driver fills in what Camera is doing at fire time.
const fireCam = (e: CamEvent) =>
  run(
    cam,
    nextCam(cam.state, typeof e === 'object' && 'timer' in e ? { ...e, camera: device.cameraOpen() } : e),
    fireCam
  )

const held = new Set<Button>()

// A press sequence and its pending timers belong to the phase that started
// them: leaving 'awake' clears all of it, so a click queued before a sleep or
// a boot cannot fire into the new phase.
onPower((p) => {
  if (p.kind === 'awake') return
  for (const m of [side, vol.up, vol.down, cam]) {
    for (const t of m.timers.values()) clearTimeout(t)
    m.timers.clear()
    m.state = { kind: 'idle' }
  }
})

function sideButton(down: boolean) {
  if (down) {
    give('side', 'side', { action: 'press' })
    // A volume key already held turns this press into the chord, never a click.
    if (held.has('up') || held.has('down')) return fireSide('chord-press')
    return fireSide('press')
  }
  tell('side', { action: 'release' }, true)
  fireSide('release')
}

function volumeButton(b: 'up' | 'down', down: boolean) {
  if (!down) {
    if (tell(b, { action: 'release', button: b }, true)) return
    fireVol(b)('release')
    // Either chord button coming up ends the chord on the side machine too.
    fireSide('chord-release')
    return
  }
  // The side button held turns this press into the chord, dead until release.
  if (held.has('side')) {
    fireVol(b)('chord-press')
    return fireSide('chord-press')
  }
  if (give(b, 'volume', { action: 'press', button: b })) return
  fireVol(b)({ press: true, camera: device.cameraOpen() })
}

function cameraButton(down: boolean) {
  if (down) {
    if (give('camera', 'camera-control', { action: 'press' })) return
    return fireCam({ press: true, zoom0: device.zoom() })
  }
  if (tell('camera', { action: 'release' }, true)) return
  fireCam('release')
}

/** One centimetre along the cap doubles the zoom, like sliding Camera Control. */
function slide(cm: number) {
  if (!held.has('camera')) return
  if (tell('camera', { action: 'slide', offset: cm })) return
  fireCam({ slide: cm, camera: device.cameraOpen() })
}

export function press(p: Press) {
  if ('slide' in p) return slide(p.slide)
  const { button, down } = p
  if (down === held.has(button)) return
  held[down ? 'add' : 'delete'](button)
  // While the device boots every button is dead; while off, only the side
  // button's hold matters - it is what powers the phone back on.
  const kind = device.power.kind
  if (kind === 'booting' || (kind === 'off' && button !== 'side')) return
  if (button === 'side') sideButton(down)
  else if (button === 'camera') cameraButton(down)
  else volumeButton(button, down)
}
