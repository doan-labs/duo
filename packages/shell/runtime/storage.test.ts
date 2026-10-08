import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PlatformError } from '../../sdk/guards.ts'
import { LIMITS } from '../../sdk/protocol.ts'
import { put, read, transaction } from './database.ts'
import { MemoryKV, storage } from './storage.ts'

// Bun has no IndexedDB. This is the smallest in-test implementation that keeps
// the real database.ts/storage.ts code path meaningful: one active readwrite
// transaction at a time per database (the serializability IndexedDB itself
// gives same-store transactions), writes visible to their own transaction,
// and a snapshot rollback on abort.

type Key = string | number | Key[]
type KeyRange = { lower: Key; upper: Key }
const rank = (k: Key): number => (typeof k === 'number' ? 0 : typeof k === 'string' ? 2 : 4)
const compareKeys = (a: Key, b: Key): number => {
  const [ra, rb] = [rank(a), rank(b)]
  if (ra !== rb) return ra - rb
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const d = compareKeys(a[i]!, b[i]!)
      if (d) return d
    }
    return a.length - b.length
  }
  return a < b ? -1 : a > b ? 1 : 0
}
const canon = (k: Key) => JSON.stringify(k)
const covers = (range: KeyRange | undefined, k: Key) =>
  !range || (compareKeys(k, range.lower) >= 0 && compareKeys(k, range.upper) <= 0)

type Request = {
  onsuccess: (() => void) | null
  onerror: (() => void) | null
  result: unknown
  error: Error | null
}

class FakeStore {
  constructor(
    private tx: FakeTx,
    private map: Map<string, [Key, unknown]>
  ) {}
  private req(compute: () => unknown): IDBRequest<never> {
    const request: Request = { onsuccess: null, onerror: null, result: undefined, error: null }
    this.tx.issue(request, compute)
    return request as IDBRequest<never>
  }
  private touch(k: Key) {
    const ck = canon(k)
    if (!this.tx.logged.has(ck))
      this.tx.logged.set(ck, { map: this.map, existed: this.map.has(ck), prev: this.map.get(ck) })
  }
  get(k: Key) {
    return this.req(() => this.map.get(canon(k))?.[1])
  }
  put(v: unknown, k: Key) {
    return this.req(() => {
      this.touch(k)
      this.map.set(canon(k), [k, v])
    })
  }
  delete(k: Key) {
    return this.req(() => {
      this.touch(k)
      this.map.delete(canon(k))
    })
  }
  getAll(range?: KeyRange) {
    return this.req(() => this.rows(range).map(([, v]) => v))
  }
  getAllKeys(range?: KeyRange) {
    return this.req(() => this.rows(range).map(([k]) => k))
  }
  count(range?: KeyRange) {
    return this.req(() => this.rows(range).length)
  }
  private rows(range?: KeyRange) {
    return [...this.map.values()].filter(([k]) => covers(range, k)).sort(([a], [b]) => compareKeys(a, b))
  }
}

class FakeTx {
  pending = 0
  ended = false
  private completed = false
  // Original value per written key across stores; abort restores only what
  // this transaction touched so it cannot erase a committed sibling's write.
  logged = new Map<string, { map: Map<string, [Key, unknown]>; existed: boolean; prev: [Key, unknown] | undefined }>()
  oncomplete: (() => void) | null = null
  onabort: (() => void) | null = null
  onerror: (() => void) | null = null
  error: Error | null = null
  constructor(
    private db: FakeDB,
    names: string[],
    public mode: string
  ) {
    db.queue.push(this)
    db.pump()
  }
  objectStore(name: string) {
    const map = this.db.stores.get(name)
    if (!map || this.ended) throw new Error('InvalidStateError')
    return new FakeStore(this, map)
  }
  issue(request: Request, compute: () => unknown) {
    this.pending++
    this.db.ops.push({ tx: this, request, compute })
    this.db.stepSoon()
  }
  resolve(request: Request, compute: () => unknown) {
    try {
      request.result = compute()
      request.onsuccess?.()
    } catch (error) {
      request.error = error instanceof Error ? error : new Error(String(error))
      request.onerror?.()
      this.abort()
    }
    this.pending--
    // run() awaits every request, so once the queue drains and a full
    // macrotask passes with nothing new issued, the transaction is done.
    setTimeout(() => this.maybeComplete(), 0)
  }
  maybeComplete() {
    if (this.pending || this.ended || this.completed) return
    this.completed = true
    this.db.finish(this)
    this.oncomplete?.()
  }
  abort() {
    if (this.ended) return
    this.ended = true
    for (const [key, { map, existed, prev }] of [...this.logged].reverse()) {
      if (existed) map.set(key, prev!)
      else map.delete(key)
    }
    this.db.finish(this)
    this.onabort?.()
  }
}

class FakeDB {
  stores = new Map<string, Map<string, [Key, unknown]>>()
  queue: FakeTx[] = []
  ops: { tx: FakeTx; request: Request; compute: () => unknown }[] = []
  active: FakeTx | null = null
  closed = false
  objectStoreNames = { contains: (n: string) => this.stores.has(n) }
  createObjectStore(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new Map())
  }
  transaction(names: string[], mode: string) {
    if (this.closed) throw new Error('InvalidStateError')
    for (const n of names) if (!this.stores.has(n)) throw new Error(`NotFoundError: ${n}`)
    return new FakeTx(this, names, mode) as unknown as IDBTransaction
  }
  stepSoon() {
    setTimeout(() => {
      const index = this.ops.findIndex((o) => o.tx === this.active && !o.tx.ended)
      if (index < 0) return
      const [op] = this.ops.splice(index, 1)
      op!.tx.resolve(op!.request, op!.compute)
    }, 0)
  }
  pump() {
    if (!this.active && this.queue.length) {
      this.active = this.queue.shift()!
      // Requests already issued while this transaction waited now run.
      for (const o of this.ops.filter((o) => o.tx === this.active)) this.stepSoon()
      setTimeout(() => this.active?.maybeComplete(), 0)
    }
  }
  finish(tx: FakeTx) {
    this.ops = this.ops.filter((o) => o.tx !== tx)
    if (this.active === tx) {
      this.active = null
      this.pump()
    }
  }
  close() {
    this.closed = true
  }
  onversionchange: (() => void) | null = null
}

// One database per process; tests isolate by unique app id.
const fake = new FakeDB()
const installed = globalThis.indexedDB
const keyRange = globalThis.IDBKeyRange
;(globalThis as { indexedDB?: unknown }).indexedDB = {
  open(_name: string, _version: number) {
    const request: Request = { onsuccess: null, onerror: null, result: undefined, error: null }
    Object.assign(request, { result: fake })
    queueMicrotask(() => {
      ;(request as { onupgradeneeded?: () => void }).onupgradeneeded?.()
      request.onsuccess?.()
    })
    return request
  }
}
;(globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = {
  bound: (lower: Key, upper: Key): KeyRange => ({ lower, upper })
}
process.on('exit', () => {
  ;(globalThis as { indexedDB?: unknown }).indexedDB = installed
  ;(globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = keyRange
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
  assert.deepEqual(await storage(id, generation, 'entry', { k: 'a' }), { k: 'a', v: null, rev: 0 })
  await storage(id, generation, 'set', { k: 'a', v: 'one' })
  await storage(id, generation, 'set', { k: 'b', v: 'two' })
  assert.deepEqual(await storage(id, generation, 'entry', { k: 'a' }), { k: 'a', v: 'one', rev: 2 })
})

test('a conditional set commits when the space has not moved', async () => {
  const { id, generation } = await app()
  const entry = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
  const change = (await storage(id, generation, 'set', { k: 'a', v: 'one', expect: entry.rev })) as {
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
  await assert.rejects(storage(id, generation, 'set', { k: 'doc', v: 'old', expect: a.rev }), (e: unknown) => {
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
  const stale = storage(id, generation, 'set', { k: 'doc', v: JSON.stringify({ a: 2, b: 1 }), expect: a.rev })
  await assert.rejects(stale, (e: unknown) => (e as PlatformError).code === 'E_CONFLICT')
  // Rebase on the observed value at the fresh revision: both intents survive.
  const now = (await storage(id, generation, 'entry', { k: 'doc' })) as { v: string; rev: number }
  const merged = { ...JSON.parse(now.v), a: 2 }
  await storage(id, generation, 'set', { k: 'doc', v: JSON.stringify(merged), expect: now.rev })
  assert.deepEqual(JSON.parse((await storage(id, generation, 'get', { k: 'doc' })) as string), { a: 2, b: 2 })
})

test('concurrent conditional writers on a missing key admit exactly one', async () => {
  const { id, generation } = await app()
  const seeds = await Promise.allSettled([
    storage(id, generation, 'set', { k: 'seed', v: 'first', expect: 0 }),
    storage(id, generation, 'set', { k: 'seed', v: 'second', expect: 0 })
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
    storage(id, generation, 'set', { k: 'a', v: 'two', expect: a.rev }),
    (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
  )
})

test('a sibling write conflicts: the revision is the whole space', async () => {
  const { id, generation } = await app()
  const a = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
  await storage(id, generation, 'set', { k: 'unrelated', v: 'x' })
  await assert.rejects(
    storage(id, generation, 'set', { k: 'a', v: 'x', expect: a.rev }),
    (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
  )
})

test('a conditional delete obeys the same revision check', async () => {
  const { id, generation } = await app()
  await storage(id, generation, 'set', { k: 'a', v: 'one' })
  const a = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
  await storage(id, generation, 'set', { k: 'b', v: 'two' })
  await assert.rejects(
    storage(id, generation, 'del', { k: 'a', expect: a.rev }),
    (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
  )
  assert.equal(await storage(id, generation, 'get', { k: 'a' }), 'one')
  const now = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
  await storage(id, generation, 'del', { k: 'a', expect: now.rev })
  assert.equal(await storage(id, generation, 'get', { k: 'a' }), null)
})

test('a precondition dies with its generation when a restore regresses rev', async () => {
  const { id, generation } = await app()
  await storage(id, generation, 'set', { k: 'a', v: 'one' })
  const before = (await storage(id, generation, 'entry', { k: 'a' })) as { rev: number }
  // Checkpoint restore writes meta verbatim and bumps the mark's generation:
  // the durable rev regresses but every precondition minted before it was
  // bound to a generation authority() now refuses.
  await transaction(['installed', 'meta'], 'readwrite', async (tx) => {
    const installed = (await read<{ generation: number }>(tx, 'installed', id))!
    await put(tx, 'installed', id, { ...installed, generation: installed.generation + 1 })
    await put(tx, 'meta', id, { rev: 0, used: 0 })
  })
  await assert.rejects(
    storage(id, generation, 'set', { k: 'a', v: 'stale', expect: before.rev }),
    (e: unknown) => (e as PlatformError).code === 'E_GONE'
  )
  const after = (await storage(id, generation + 1, 'entry', { k: 'a' })) as { v: string | null; rev: number }
  assert.equal(after.rev, 0)
  assert.equal(after.v, 'one')
  await assert.rejects(
    storage(id, generation + 1, 'set', { k: 'a', v: 'x', expect: before.rev }),
    (e: unknown) => (e as PlatformError).code === 'E_CONFLICT'
  )
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
  for (const expect of [-1, 1.5, Number.NaN, '1', Number.MAX_SAFE_INTEGER + 1])
    await assert.rejects(
      storage(id, generation, 'set', { k: 'a', v: 'x', expect }),
      (e: unknown) => (e as PlatformError).code === 'E_ARGS'
    )
  for (const action of ['get', 'entry', 'keys', 'snapshot'])
    await assert.rejects(
      storage(id, generation, action, { k: 'a', expect: 0 }),
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
  assert.deepEqual(kv.run('entry', { k: 'a' }), { k: 'a', v: null, rev: 0 })
  kv.run('set', { k: 'a', v: 'one' })
  const read = kv.run('entry', { k: 'a' }) as { rev: number }
  assert.throws(
    () => kv.run('set', { k: 'a', v: 'old', expect: read.rev + 1 }),
    (e: unknown) => {
      assert.equal((e as PlatformError).code, 'E_CONFLICT')
      return true
    }
  )
  assert.equal(kv.run('get', { k: 'a' }), 'one')
  assert.equal(kv.rev, 1)
  assert.equal(kv.history.length, 1)
  kv.run('set', { k: 'a', v: 'two', expect: read.rev })
  assert.equal(kv.rev, 2)
  assert.equal(kv.history.length, 2)
  assert.throws(
    () => kv.run('purge', { k: 'a' }),
    (e: unknown) => (e as PlatformError).code === 'E_UNSUPPORTED'
  )
})
