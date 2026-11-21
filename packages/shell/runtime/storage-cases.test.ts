// The storage contract every database backend must keep. It only exports the cases:
// storage.test.ts runs them on IndexedDB (an in-test fake), storage-mono.test.ts on @doan-labs/mono.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PlatformError } from '../../sdk/guards.ts'
import { LIMITS } from '../../sdk/protocol.ts'
import { activeBackend, put, read, type StorageEngine, transaction } from './database.ts'
import { MemoryKV, storage } from './storage.ts'

export function storageCases(engine: StorageEngine) {
  test(`the cases run on ${engine}`, async () => {
    assert.equal((await activeBackend()).name, engine)
  })
  let seq = 0
  const app = async (generation = 1) => {
    const id = `test.app.${++seq}`
    await transaction(['installed'], 'readwrite', (tx) =>
      put(tx, 'installed', id, {
        id,
        generation,
        state: 'ready',
        current: '0.0.0+seed',
        attempts: 0,
        installedAt: 0
      })
    )
    return { id, generation }
  }
  const rev = (id: string, generation: number) =>
    transaction(['meta'], 'readonly', async (tx) => (await read<{ rev: number }>(tx, 'meta', id))?.rev ?? 0)

  test('entry returns the value and the space revision from one read', async () => {
    const { id, generation } = await app()
    assert.deepEqual(await storage(id, generation, 'entry', { k: 'a' }), { k: 'a', v: null, rev: 0, gen: generation })
    await storage(id, generation, 'set', { k: 'a', v: 'one' })
    await storage(id, generation, 'set', { k: 'b', v: 'two' })
    assert.deepEqual(await storage(id, generation, 'entry', { k: 'a' }), { k: 'a', v: 'one', rev: 2, gen: generation })
  })

  test('a conditional set commits when the space has not moved', async () => {
    const { id, generation } = await app()
    const entry = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
    const change = (await storage(id, generation, 'set', { k: 'a', v: 'one', expect: entry })) as {
      rev: number
      k: string
      v: string | null
    }
    assert.equal(change.rev, entry.rev + 1)
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), 'one')
    assert.equal(await rev(id, generation), entry.rev + 1)
  })

  test('a stale conditional write is rejected at commit and mutates nothing', async () => {
    const { id, generation } = await app()
    // The reported clobber: copy A reads old, copy B's SET durably commits, then
    // A's stale write lands. With expect it loses instead of erasing B's fact.
    const a = (await storage(id, generation, 'entry', { k: 'doc' })) as { rev: number }
    await storage(id, generation, 'set', { k: 'doc', v: 'new' })
    const before = await rev(id, generation)
    await assert.rejects(storage(id, generation, 'set', { k: 'doc', v: 'old', expect: a }), (e: unknown) => {
      assert.equal((e as PlatformError).code, 'E_CONFLICT')
      return true
    })
    assert.equal(await storage(id, generation, 'get', { k: 'doc' }), 'new')
    assert.equal(await rev(id, generation), before)
  })

  test('a rebased retry lands after the conflict, keeping both facts', async () => {
    const { id, generation } = await app()
    await storage(id, generation, 'set', { k: 'doc', v: JSON.stringify({ a: 1, b: 1 }) })
    const a = (await storage(id, generation, 'entry', { k: 'doc' })) as { v: string; rev: number }
    // Another channel writes a different field under a fresh revision.
    await storage(id, generation, 'set', {
      k: 'doc',
      v: JSON.stringify({ ...JSON.parse(a.v), b: 2 })
    })
    const stale = storage(id, generation, 'set', { k: 'doc', v: JSON.stringify({ a: 2, b: 1 }), expect: a })
    await assert.rejects(stale, (e: unknown) => (e as PlatformError).code === 'E_CONFLICT')
    // Rebase on the observed value at the fresh revision: both intents survive.
    const now = (await storage(id, generation, 'entry', { k: 'doc' })) as { v: string; rev: number }
    const merged = { ...JSON.parse(now.v), a: 2 }
    await storage(id, generation, 'set', { k: 'doc', v: JSON.stringify(merged), expect: now })
    assert.deepEqual(JSON.parse((await storage(id, generation, 'get', { k: 'doc' })) as string), { a: 2, b: 2 })
  })

  test('concurrent conditional writers on a missing key admit exactly one', async () => {
    const { id, generation } = await app()
    const seeds = await Promise.allSettled([
      storage(id, generation, 'set', { k: 'seed', v: 'first', expect: { rev: 0, gen: generation } }),
      storage(id, generation, 'set', { k: 'seed', v: 'second', expect: { rev: 0, gen: generation } })
    ])
    const wins = seeds.filter((r) => r.status === 'fulfilled')
    assert.equal(wins.length, 1)
    const change = (wins[0] as PromiseFulfilledResult<{ rev: number; v: string | null }>).value
    assert.equal(await storage(id, generation, 'get', { k: 'seed' }), change.v)
  })

  test('delete/recreate between read and write still conflicts (ABA)', async () => {
    const { id, generation } = await app()
    await storage(id, generation, 'set', { k: 'a', v: 'one' })
    const a = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
    await storage(id, generation, 'del', { k: 'a' })
    await storage(id, generation, 'set', { k: 'a', v: 'one' })
    await assert.rejects(
      storage(id, generation, 'set', { k: 'a', v: 'two', expect: a }),
      (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
    )
  })

  test('a sibling write conflicts: the revision is the whole space', async () => {
    const { id, generation } = await app()
    const a = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
    await storage(id, generation, 'set', { k: 'unrelated', v: 'x' })
    await assert.rejects(
      storage(id, generation, 'set', { k: 'a', v: 'x', expect: a }),
      (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
    )
  })

  test('a conditional delete obeys the same revision check', async () => {
    const { id, generation } = await app()
    await storage(id, generation, 'set', { k: 'a', v: 'one' })
    const a = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
    await storage(id, generation, 'set', { k: 'b', v: 'two' })
    await assert.rejects(
      storage(id, generation, 'del', { k: 'a', expect: a }),
      (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
    )
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), 'one')
    const now = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
    await storage(id, generation, 'del', { k: 'a', expect: now })
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), null)
  })

  test('a precondition dies with its generation when a restore regresses rev', async () => {
    const { id, generation } = await app()
    await storage(id, generation, 'set', { k: 'a', v: 'one' })
    const before = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number; gen: number }
    // Checkpoint restore writes meta verbatim and bumps the mark's generation.
    // Regression to the SAME rev the token carries is the true ABA: the
    // generation half is what keeps it rejected on a post-restore view.
    await transaction(['installed', 'meta'], 'readwrite', async (tx) => {
      const installed = (await read<{ generation: number }>(tx, 'installed', id))!
      await put(tx, 'installed', id, { ...installed, generation: installed.generation + 1 })
      await put(tx, 'meta', id, { rev: before.rev, used: 0 })
    })
    // The old view's already-admitted token dies at authority, before the
    // revision is even read.
    await assert.rejects(
      storage(id, generation, 'set', { k: 'a', v: 'stale', expect: before }),
      (e: unknown) => (e as PlatformError).code === 'E_GONE'
    )
    // A newly connected view replaying the captured token: rev matches the
    // restored meta, but the generation half makes it E_GONE, not a commit.
    const after = (await storage(id, generation + 1, 'entry', { k: 'a' })) as {
      v: string | null
      rev: number
      gen: number
    }
    assert.equal(after.rev, before.rev)
    assert.equal(after.gen, generation + 1)
    assert.equal(after.v, 'one')
    await assert.rejects(
      storage(id, generation + 1, 'set', { k: 'a', v: 'x', expect: { rev: before.rev, gen: before.gen } }),
      (e: unknown) => (e as PlatformError).code === 'E_GONE'
    )
    // A fresh token minted under the new generation commits normally.
    await storage(id, generation + 1, 'set', { k: 'a', v: 'x', expect: { rev: after.rev, gen: after.gen } })
    assert.equal(await storage(id, generation + 1, 'get', { k: 'a' }), 'x')
  })

  test('conflict is distinct from stale generation and refusal', async () => {
    const { id, generation } = await app()
    await assert.rejects(storage(id, generation + 1, 'set', { k: 'a', v: 'x' }), (e: unknown) => {
      assert.equal((e as PlatformError).code, 'E_GONE')
      return true
    })
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), null)
  })

  test('over-quota and malformed expectations fail without mutating', async () => {
    const { id, generation } = await app()
    // A value past LIMITS.value never reaches the transaction: E_ARGS up front.
    await assert.rejects(
      storage(id, generation, 'set', { k: 'a', v: 'x'.repeat(LIMITS.value + 1) }),
      (e: unknown) => (e as PlatformError).code === 'E_ARGS'
    )
    // The remaining quota at commit: a used meta leaves no room for one more key.
    await transaction(['meta'], 'readwrite', (tx) => put(tx, 'meta', id, { rev: 0, used: LIMITS.storage }))
    await assert.rejects(storage(id, generation, 'set', { k: 'a', v: 'x' }), (e: unknown) => {
      assert.equal((e as PlatformError).code, 'E_QUOTA')
      return true
    })
    assert.equal(await rev(id, generation), 0)
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), null)
    await transaction(['meta'], 'readwrite', (tx) => put(tx, 'meta', id, { rev: 0, used: 0 }))
    for (const expect of [
      -1,
      1.5,
      Number.NaN,
      '1',
      { rev: -1, gen: 1 },
      { rev: 1.5, gen: 1 },
      { rev: 0, gen: 0 },
      { rev: Number.MAX_SAFE_INTEGER + 1, gen: 1 },
      { rev: 0 },
      { gen: 1 },
      {}
    ])
      await assert.rejects(
        storage(id, generation, 'set', { k: 'a', v: 'x', expect }),
        (e: unknown) => (e as PlatformError).code === 'E_ARGS'
      )
    for (const action of ['get', 'entry', 'keys', 'snapshot'])
      await assert.rejects(
        storage(id, generation, action, { k: 'a', expect: { rev: 0, gen: generation } }),
        (e: unknown) => (e as PlatformError).code === 'E_ARGS'
      )
  })

  test('an unknown action is refused instead of falling through to delete', async () => {
    const { id, generation } = await app()
    await storage(id, generation, 'set', { k: 'a', v: 'one' })
    await assert.rejects(storage(id, generation, 'purge', { k: 'a' }), (e: unknown) => {
      assert.equal((e as PlatformError).code, 'E_UNSUPPORTED')
      return true
    })
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), 'one')
  })

  test('legacy unconditional operations keep their shape', async () => {
    const { id, generation } = await app()
    assert.equal(await storage(id, generation, 'get', { k: 'a' }), null)
    assert.deepEqual(await storage(id, generation, 'set', { k: 'a', v: 'one' }), { rev: 1, k: 'a', v: 'one' })
    const page = (await storage(id, generation, 'snapshot', {})) as { rev: number; entries: [string, string][] }
    assert.equal(page.rev, 1)
    assert.deepEqual(page.entries, [['a', 'one']])
    assert.deepEqual(await storage(id, generation, 'keys', {}), { keys: ['a'], cursor: undefined })
    assert.deepEqual(await storage(id, generation, 'del', { k: 'a' }), { rev: 2, k: 'a', v: null })
  })

  test('the in-memory session space applies the same conditional contract', async () => {
    const kv = new MemoryKV()
    assert.deepEqual(kv.run('entry', { k: 'a' }), { k: 'a', v: null, rev: 0, gen: 1 })
    kv.run('set', { k: 'a', v: 'one' })
    const read = kv.run('entry', { k: 'a' }) as { rev: number; gen: number }
    // Session memory has no generation churn, but a foreign token still dies.
    assert.throws(
      () => kv.run('set', { k: 'a', v: 'old', expect: { rev: read.rev, gen: 99 } }),
      (e: unknown) => (e as PlatformError).code === 'E_GONE'
    )
    assert.throws(
      () => kv.run('set', { k: 'a', v: 'old', expect: { rev: read.rev + 1, gen: read.gen } }),
      (e: unknown) => {
        assert.equal((e as PlatformError).code, 'E_CONFLICT')
        return true
      }
    )
    assert.equal(kv.run('get', { k: 'a' }), 'one')
    assert.equal(kv.rev, 1)
    assert.equal(kv.history.length, 1)
    kv.run('set', { k: 'a', v: 'two', expect: read })
    assert.equal(kv.rev, 2)
    assert.equal(kv.history.length, 2)
    assert.throws(
      () => kv.run('purge', { k: 'a' }),
      (e: unknown) => (e as PlatformError).code === 'E_UNSUPPORTED'
    )
  })
}
