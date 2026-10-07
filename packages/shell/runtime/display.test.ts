import assert from 'node:assert/strict'
import { test } from 'node:test'
import { device } from '../device.ts'
import { observeDisplay, updateDisplays, viewInfo } from './display.ts'

// viewInfo reads document.activeElement for `focused`; there is no DOM here.
Object.assign(globalThis, { document: { activeElement: null } })
const element = { clientWidth: 320, clientHeight: 640, contains: () => false } as unknown as HTMLElement
const live = { visible: true, active: true, angle: 180, clip: 0 }
const parked = { visible: true, active: false, angle: 180, clip: 0 }

test('a live display reports visible, and sleeping masks it before the next frame', () => {
  updateDisplays({ ...live }, { ...parked })
  assert.equal(viewInfo(element, 'inner', 'full').visible, true)
  assert.equal(viewInfo(element, 'cover', 'full').visible, true)
  const seen: boolean[] = []
  const unwatch = observeDisplay(() => seen.push(viewInfo(element, 'inner', 'full').visible))
  device.sleep()
  unwatch()
  // The observer ran once, synchronously, with the display already hidden.
  assert.deepEqual(seen, [false])
  assert.equal(viewInfo(element, 'inner', 'full').visible, false)
  assert.equal(viewInfo(element, 'cover', 'full').visible, false)
  device.wake()
})

test('waking lifts the mask at once, and frames keep the mask honest while asleep', () => {
  updateDisplays({ ...live }, { ...parked })
  device.sleep()
  // The render loop keeps reporting the physical glass; the mask holds.
  updateDisplays({ ...live }, { ...parked })
  assert.equal(viewInfo(element, 'inner', 'full').visible, false)
  const seen: boolean[] = []
  const unwatch = observeDisplay(() => seen.push(viewInfo(element, 'inner', 'full').visible))
  device.wake()
  unwatch()
  assert.deepEqual(seen, [true])
  assert.equal(viewInfo(element, 'inner', 'full').visible, true)
})

test('the mask emits only on a real transition', () => {
  device.wake()
  let emits = 0
  const unwatch = observeDisplay(() => emits++)
  device.sleep()
  device.sleep()
  assert.equal(emits, 1)
  device.wake()
  device.wake()
  assert.equal(emits, 2)
  unwatch()
})
