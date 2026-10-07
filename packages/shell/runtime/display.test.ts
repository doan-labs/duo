import assert from 'node:assert/strict'
import { test } from 'node:test'
import { device } from '../device.ts'
import { observeDisplay, releaseHiddenFocus, updateDisplays, viewInfo } from './display.ts'

// viewInfo reads document.activeElement for `focused`; there is no DOM here.
Object.assign(globalThis, { document: { activeElement: null } })
const element = {
  clientWidth: 320,
  clientHeight: 640,
  contains: () => false,
  checkVisibility: () => true
} as unknown as HTMLElement
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

test('a mounted but display:none scene reads hidden like a person sees it', () => {
  updateDisplays({ ...live }, { ...parked })
  const parkedEl = {
    clientWidth: 0,
    clientHeight: 0,
    contains: () => false,
    checkVisibility: () => false
  } as unknown as HTMLElement
  // The glass faces you and the device is awake, but the view's own box is hidden.
  assert.equal(viewInfo(parkedEl, 'inner', 'full').visible, false)
  assert.equal(viewInfo(element, 'inner', 'full').visible, true)
})

test('a hidden view loses the DOM focus it would route keys through', () => {
  updateDisplays({ ...live }, { ...parked })
  let blurs = 0
  const focused = { blur: () => blurs++ } as unknown as HTMLElement
  const hiddenEl = {
    clientWidth: 0,
    clientHeight: 0,
    contains: (x: unknown) => x === focused,
    checkVisibility: () => false
  } as unknown as HTMLElement
  const shownEl = {
    clientWidth: 320,
    clientHeight: 640,
    contains: (x: unknown) => x === focused,
    checkVisibility: () => true
  } as unknown as HTMLElement
  Object.assign(globalThis, { document: { activeElement: focused, body: {} } })
  releaseHiddenFocus(hiddenEl)
  assert.equal(blurs, 1)
  // A visible view keeps its focus.
  releaseHiddenFocus(shownEl)
  assert.equal(blurs, 1)
  // Sleep hides every view, displayed or not.
  device.sleep()
  releaseHiddenFocus(shownEl)
  assert.equal(blurs, 2)
  device.wake()
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
