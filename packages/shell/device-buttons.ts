// What a press on the frame means. iOS's rules for an iPhone with a side button
// and a Camera Control, and iOS's timings:
//
//   side       click: sleep, or wake to the lock screen. Double-click: Wallet.
//              Hold: Siri (powered off: boot).
//   side+vol   click: screenshot. Held: slide to power off.
//   volume     volume, held: keeps going. In Camera: shutter.
//   camera     click: Camera, or the shutter once it is open. Hold: record.
//              Slide along the cap: zoom.
//
// An app listening to volume or Camera Control takes the press instead, and one
// listening to the side button hears it while it still does all of the above
// (docs/platform/contract.md 3.8). The side+volume chord is always the system's.
//
// The hardware that produces the presses is packages/shell/buttons.ts.

import type { Button, Press } from './buttons.ts'
import { device, type Heard, type Listener, offer } from './device.ts'

const HOLD = 500
const DOUBLE = 300
const POWER = 1200
const RECORD = 400
const REPEAT = 130

const held = new Set<Button>()
let sideHold = 0
let sideClick = 0
let clicks = 0
let sideSpent = false
let chord = 0
let chordSpent = false
let repeat = 0
let camHold = 0
let camSlid = false
let recording = false
let zoom0 = 1

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

const chordStart = () => {
  clearTimeout(sideHold)
  sideHold = 0
  sideSpent = true
  chordSpent = false
  chord = setTimeout(() => {
    chord = 0
    chordSpent = true
    device.power()
  }, POWER)
}
/** Either button of the chord coming up ends it: a screenshot if it was quick. */
const chordEnd = () => {
  if (chord) {
    clearTimeout(chord)
    chord = 0
    device.screenshot()
  }
  if (!held.has('side') || !(held.has('up') || held.has('down'))) chordSpent = false
}

function side(down: boolean) {
  if (down) {
    give('side', 'side', { action: 'press' })
    sideSpent = false
    if (held.has('up') || held.has('down')) return chordStart()
    sideHold = setTimeout(() => {
      sideHold = 0
      sideSpent = true
      if (device.off) device.boot()
      else device.siri()
    }, HOLD)
    return
  }
  tell('side', { action: 'release' }, true)
  clearTimeout(sideHold)
  sideHold = 0
  if (chord || chordSpent) return chordEnd()
  if (sideSpent) return
  if (++clicks === 2) {
    clearTimeout(sideClick)
    clicks = 0
    device.wallet()
    return
  }
  sideClick = setTimeout(() => {
    clicks = 0
    device.side()
  }, DOUBLE)
}

function volume(b: 'up' | 'down', down: boolean) {
  if (!down) {
    clearTimeout(repeat)
    repeat = 0
    if (chord || chordSpent) chordEnd()
    tell(b, { action: 'release', button: b }, true)
    return
  }
  if (held.has('side')) return chordStart()
  if (give(b, 'volume', { action: 'press', button: b })) return
  if (device.cameraOpen()) return device.shoot()
  const step = () => {
    device.volume(b === 'up' ? 1 : -1)
    repeat = setTimeout(step, repeat ? REPEAT : 3 * REPEAT)
  }
  step()
}

function cameraControl(down: boolean) {
  if (down) {
    if (give('camera', 'camera-control', { action: 'press' })) return
    camSlid = false
    zoom0 = device.zoom()
    camHold = setTimeout(() => {
      camHold = 0
      if (!device.cameraOpen()) return
      recording = true
      device.record(true)
    }, RECORD)
    return
  }
  if (tell('camera', { action: 'release' }, true)) return
  if (camHold) {
    clearTimeout(camHold)
    camHold = 0
    if (camSlid) return
    if (device.cameraOpen()) device.shoot()
    else device.camera()
  } else if (recording) {
    recording = false
    device.record(false)
  }
}

/** One centimetre along the cap doubles the zoom, like sliding Camera Control. */
function slide(cm: number) {
  if (held.has('camera') && tell('camera', { action: 'slide', offset: cm })) return
  if (!held.has('camera') || !device.cameraOpen()) return
  if (!camSlid && Math.abs(cm) < 0.04) return
  camSlid = true
  clearTimeout(camHold)
  camHold = 0
  device.zoom(Math.min(5, Math.max(0.5, zoom0 * 2 ** cm)))
}

export function press(p: Press) {
  if ('slide' in p) return slide(p.slide)
  const { button, down } = p
  if (down === held.has(button)) return
  held[down ? 'add' : 'delete'](button)
  if (button === 'side') side(down)
  else if (button === 'camera') cameraControl(down)
  else volume(button, down)
}
