import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDisplay, device, type Heard, listen } from './device.ts'
import { press } from './device-buttons.ts'

const noop = () => {}
/** A listener that takes every press and keeps what it heard. */
const taking =
  <T>(into: T[]) =>
  (e: T) =>
    into.push(e) > 0
addDisplay(
  {
    wide: true,
    dark: noop,
    launch: noop,
    cam: () => null,
    hud: noop,
    screenshot: noop,
    power: noop,
    boot: noop,
    stage: () => [],
    mirror: noop,
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
