import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextLayer, nextLock } from './layer.ts'

test('lock or close drops whatever layer was up', () => {
  assert.deepEqual(nextLayer({ kind: 'search' }, 'lock'), { kind: 'none' })
  assert.deepEqual(nextLayer({ kind: 'power' }, 'lock'), { kind: 'none' })
  const cc = { kind: 'control', closing: false, under: { kind: 'switcher' } } as const
  assert.deepEqual(nextLayer(cc, 'lock'), { kind: 'none' })
  assert.deepEqual(nextLayer({ kind: 'switcher' }, 'close'), { kind: 'none' })
})

test('overlays are exclusive: opening one replaces another', () => {
  assert.deepEqual(nextLayer({ kind: 'switcher' }, 'open-search'), { kind: 'search' })
  assert.deepEqual(nextLayer({ kind: 'search' }, 'open-power'), { kind: 'power' })
})

test('Control Center pulled over a layer gives it back when the panel goes', () => {
  const over = nextLayer({ kind: 'switcher' }, 'pull-control')
  assert.deepEqual(over, { kind: 'control', closing: false, under: { kind: 'switcher' } })
  assert.deepEqual(nextLayer(over, 'control-closed'), { kind: 'switcher' })
  // Home: the switcher goes now, the panel stays mounted to play out.
  const home = nextLayer(over, 'drop-under')
  assert.deepEqual(home, { kind: 'control', closing: false, under: { kind: 'none' } })
  assert.deepEqual(nextLayer(nextLayer(home, 'close-control'), 'control-closed'), { kind: 'none' })
})

test('control closing keeps it mounted, and a stale close cannot drop a newer layer', () => {
  const open = nextLayer({ kind: 'none' }, 'pull-control')
  assert.deepEqual(open, { kind: 'control', closing: false, under: { kind: 'none' } })
  const closing = nextLayer(open, 'close-control')
  assert.deepEqual(closing, { kind: 'control', closing: true, under: { kind: 'none' } })
  // The CC power button: the sheet goes under the panel while it plays out, and its settle hands over.
  const power = nextLayer(closing, 'open-power')
  assert.deepEqual(power, { kind: 'control', closing: true, under: { kind: 'power' } })
  assert.deepEqual(nextLayer(power, 'control-closed'), { kind: 'power' })
  // A settle that lands once the sheet is on its own is stale, ignored.
  assert.deepEqual(nextLayer({ kind: 'power' }, 'control-closed'), { kind: 'power' })
  // From the still-open Control Center it lands at none.
  assert.deepEqual(nextLayer(closing, 'control-closed'), { kind: 'none' })
})

test('the lock screen mounts on lock, lifts on unlock, unmounts when done', () => {
  assert.equal(nextLock('unlocked', 'lock'), 'locked')
  // Locking is idempotent: a second lock keeps it up.
  assert.equal(nextLock('locked', 'lock'), 'locked')
  assert.equal(nextLock('locked', 'unlock'), 'unlocking')
  assert.equal(nextLock('unlocking', 'unlocked'), 'unlocked')
  // A lock landing mid-lift wins over the settle.
  assert.equal(nextLock('unlocking', 'lock'), 'locked')
  // An unlock event while already out is stale and ignored.
  assert.equal(nextLock('unlocked', 'unlocked'), 'unlocked')
})
