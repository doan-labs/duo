import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mutating, requestSame, requestValid } from './guards.ts'

test('requestValid admits the conditional-write wire shape only', () => {
  for (const m of ['storage.entry', 'session.entry', 'storage.set', 'session.del'])
    assert.equal(requestValid({ id: 1, m, p: { k: 'a', v: 'x', expect: 3 } }), true, m)
  // Anything outside the allowlist still fails closed at the bridge boundary.
  for (const m of ['storage.cas', 'storage.update', 'session.purge', 'storage.put', 'storage.transaction'])
    assert.equal(requestValid({ id: 1, m, p: {} }), false, m)
})

test('conditional writes carry the mutating retry class, reads do not', () => {
  for (const m of ['storage.set', 'storage.del', 'session.set', 'session.del']) assert.equal(mutating(m), true, m)
  for (const m of ['storage.entry', 'session.entry', 'storage.get', 'session.snapshot'])
    assert.equal(mutating(m), false, m)
})

test('requestSame replays only a byte-identical request', () => {
  const a = { m: 'storage.set', p: { k: 'a', v: 'x', expect: 3 }, epoch: 7 }
  assert.equal(requestSame(a, { m: 'storage.set', p: { k: 'a', v: 'x', expect: 3 }, epoch: 7 }), true)
  assert.equal(requestSame(a, { m: 'storage.set', p: { k: 'a', v: 'y', expect: 3 }, epoch: 7 }), false)
  assert.equal(requestSame(a, { m: 'storage.set', p: { k: 'a', v: 'x', expect: 4 }, epoch: 7 }), false)
  assert.equal(requestSame(a, { m: 'storage.del', p: { k: 'a', v: 'x', expect: 3 }, epoch: 7 }), false)
  assert.equal(requestSame(a, { m: 'storage.set', p: { k: 'a', v: 'x', expect: 3 }, epoch: 8 }), false)
  assert.equal(requestSame(a, { m: 'storage.set', p: { k: 'a', v: 'x', expect: 3 } }), false)
})
