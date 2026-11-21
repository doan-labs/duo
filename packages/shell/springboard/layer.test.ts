import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextLayer, nextLock } from './layer.ts'

test('lock or close drops whatever layer was up', () => {
  assert.deepEqual(nextLayer({ kind: 'search' }, 'lock'), { kind: 'none' })
  assert.deepEqual(nextLayer({ kind: 'power' }, 'lock'), { kind: 'none' })
  assert.deepEqual(nextLayer({ kind: 'control', closing: false }, 'lock'), { kind: 'none' })
  assert.deepEqual(nextLayer({ kind: 'switcher' }, 'close'), { kind: 'none' })
})

test('overlays are exclusive: opening one replaces another', () => {
  assert.deepEqual(nextLayer({ kind: 'switcher' }, 'open-search'), { kind: 'search' })
  assert.deepEqual(nextLayer({ kind: 'control', closing: false }, 'open-power'), { kind: 'power' })
})

test('control closing keeps it mounted, and a stale close cannot drop a newer layer', () => {
  const open = nextLayer({ kind: 'none' }, 'pull-control')
  assert.deepEqual(open, { kind: 'control', closing: false })
  const closing = nextLayer(open, 'close-control')
  assert.deepEqual(closing, { kind: 'control', closing: true })
  // The power sheet can open over a closing Control Center (the CC power button).
  const power = nextLayer(closing, 'open-power')
  assert.deepEqual(power, { kind: 'power' })
  // The settle callback of the Control Center animation now fires: stale, ignored.
  assert.deepEqual(nextLayer(power, 'control-closed'), { kind: 'power' })
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
