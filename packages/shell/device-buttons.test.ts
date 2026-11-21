import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDisplay, device, type Heard, listen } from './device.ts'
import { press } from './device-buttons.ts'
import { nextSide, nextVol } from './device-buttons-machine.ts'

const noop = () => {}
/** A listener that takes every press and keeps what it heard. */
const taking =
  <T>(into: T[]) =>
  (e: T) =>
    into.push(e) > 0
addDisplay(
  {
    wide: true,
    power: noop,
    launch: noop,
    cam: () => null,
    hud: noop,
    screenshot: noop,
    powerSheet: noop,
    stage: () => [],
    mirror: noop,
    wake: noop,
    covered: () => false
  },
  { home: [], lock: noop, unlock: noop }
)

test('a listening app takes the volume press, and hears its release', () => {
  const heard: Heard['volume'][] = []
  const stop = listen('volume', taking(heard))
  const level = device.level
  press({ button: 'up', down: true })
  press({ button: 'up', down: false })
  assert.equal(device.level, level)
  assert.deepEqual(heard, [
    { action: 'press', button: 'up' },
    { action: 'release', button: 'up' }
  ])
  stop()
  press({ button: 'down', down: true })
  press({ button: 'down', down: false })
  assert.equal(device.level, level - 1)
})

test('a listener that declines leaves the press to the system', () => {
  const stop = listen('volume', () => false)
  const level = device.level
  press({ button: 'up', down: true })
  press({ button: 'up', down: false })
  assert.equal(device.level, level + 1)
  stop()
})

test('camera control slides and releases reach the listener that took the press', () => {
  const first: Heard['camera-control'][] = []
  const second: Heard['camera-control'][] = []
  const stopFirst = listen('camera-control', taking(first))
  const stopSecond = listen('camera-control', taking(second))
  press({ button: 'camera', down: true })
  press({ button: 'camera', slide: 0.5 })
  // Stopping mid-press still delivers the release, so the app never sees a stuck button.
  stopFirst()
  press({ button: 'camera', down: false })
  assert.deepEqual(first, [{ action: 'press' }, { action: 'slide', offset: 0.5 }, { action: 'release' }])
  assert.deepEqual(second, [])
  stopSecond()
})

// The pure machines, driven by hand with timer events: no real time passes.

test('each volume key keeps its own repeat, so releasing one leaves the other going', () => {
  // Hold Up, add Down, release Up: Down is still held and still stepping down.
  let s = nextVol('up', { kind: 'idle' }, { press: true, camera: false })
  assert.equal(s.state.kind, 'repeating')
  let d = nextVol('down', { kind: 'idle' }, { press: true, camera: false })
  assert.equal(d.state.kind, 'repeating')
  s = nextVol('up', s.state, 'release')
  assert.deepEqual(s, { state: { kind: 'idle' }, effects: [] })
  d = nextVol('down', d.state, { timer: 'repeat' })
  assert.equal(d.state.kind, 'repeating')
  assert.deepEqual(
    d.effects.map((e) => ('action' in e ? e.action : e)),
    [{ volume: -1 }, { after: 130, event: { timer: 'repeat' } }]
  )
})

test('a quick chord screenshots, a held one shows the power sheet', () => {
  const chord = nextSide({ kind: 'pressed', clicks: 0 }, 'chord-press')
  assert.deepEqual(chord.state, { kind: 'chord', spent: false })
  // Quick release of the volume key: a screenshot, and the held side is spent.
  const quick = nextSide(chord.state, 'chord-release')
  assert.deepEqual(quick.state, { kind: 'spent' })
  assert.deepEqual(quick.effects, [{ action: 'screenshot' }])
  // Held past the timer instead: the power sheet, and the release is dead.
  const held = nextSide(chord.state, { timer: 'chord' })
  assert.deepEqual(held.state, { kind: 'chord', spent: true })
  assert.deepEqual(held.effects, [{ action: 'power-sheet' }])
  assert.deepEqual(nextSide(held.state, 'chord-release'), { state: { kind: 'spent' }, effects: [] })
  assert.deepEqual(nextSide({ kind: 'spent' }, 'release'), { state: { kind: 'idle' }, effects: [] })
})

test('a double-click of the side button opens Wallet, a single click sleeps', () => {
  let s = nextSide({ kind: 'idle' }, 'press')
  s = nextSide(s.state, 'release')
  assert.equal(s.state.kind, 'waiting')
  s = nextSide(s.state, 'press')
  s = nextSide(s.state, 'release')
  assert.deepEqual(s.effects, [{ action: 'wallet' }])
  // One click alone waits out the window, then acts.
  let one = nextSide({ kind: 'idle' }, 'press')
  one = nextSide(one.state, 'release')
  one = nextSide(one.state, { timer: 'double' })
  assert.deepEqual(one.effects, [{ action: 'side' }])
})
