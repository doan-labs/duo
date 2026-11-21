import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDisplay, BOOT_FADE_MS, device, type Power } from './device.ts'

const noop = () => {}
const seen: Power[] = []
addDisplay(
  {
    wide: true,
    power: (p) => seen.push(p),
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

test('the power phase moves off -> booting -> awake, and sleep kills a pending boot', async () => {
  device.power = { kind: 'awake' }
  device.powerOff()
  assert.equal(device.power.kind, 'off')
  assert.equal(device.asleep, true)
  // The side button is dead while off.
  device.side()
  assert.equal(device.power.kind, 'off')

  device.boot()
  assert.deepEqual(device.power, { kind: 'booting', leaving: false })
  // A click during the boot screen does not wake past it or re-sleep.
  device.side()
  assert.equal(device.power.kind, 'booting')

  await new Promise((r) => setTimeout(r, BOOT_FADE_MS + 100))
  assert.equal(device.power.kind, 'awake')

  // Sleep mid-boot cancels the boot timers: it stays asleep, never flips awake.
  device.powerOff()
  device.boot()
  device.sleep()
  assert.equal(device.power.kind, 'asleep')
  await new Promise((r) => setTimeout(r, BOOT_FADE_MS + 100))
  assert.equal(device.power.kind, 'asleep')
  assert.deepEqual(seen.at(-1), { kind: 'asleep' })
  // Leave the device awake for the other suites sharing this module.
  device.wake()
  assert.equal(device.power.kind, 'awake')
})
