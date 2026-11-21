import { setBackend } from './database.ts'
import { indexedDbBackend } from './database-idb.ts'
import { storageCases } from './storage-cases.test.ts'

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

setBackend(indexedDbBackend())
storageCases('indexeddb')
