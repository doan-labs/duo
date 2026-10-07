// Deterministic checks for the sync engine over the same DocStore surface the
// app binds to os.storage. Throw-based like pantry.test.ts so `bun sync.test.ts`
// runs without any test-framework import. The fake store is fully scripted:
// commits, event delivery order, held and rejected get/set calls are all
// driven by the test, so every fault the reviewer can inject through the UI -
// delayed echoes, out-of-order watch events, interleaved foreign writes,
// rejected storage calls - is reproducible here byte for byte.
import {
  type Doc,
  EMPTY_DOC,
  type Location,
  newItem,
  opAdd,
  opAddShop,
  opClearBought,
  opRemove,
  opStep,
  opToggleShop,
  opUpdate,
  parseDoc,
  serializeDoc,
  type Unit
} from './pantry.ts'
import { type DocStore, PantrySync, type SyncStatus } from './sync.ts'

let n = 0
const ok = (cond: boolean, label: string) => {
  n++
  if (!cond) throw new Error(`FAIL ${label}`)
}
const eq = <T>(a: T, b: T, label: string) => {
  n++
  if (a !== b) throw new Error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Event = { rev: number; v?: string }

/**
 * In-memory storage with full test control: `quiet` parks watch events until
 * flushed (delayed/out-of-order delivery), `holdSets` parks write acks,
 * `failGet`/`failSet` count down rejections, `foreign` commits another copy's
 * write straight onto the document.
 */
class FakeStore implements DocStore {
  rev = 0
  value: string | null = null
  failGet = 0
  failSet = 0
  quiet = false
  holdSets = false
  private listeners = new Set<(e: Event) => void>()
  private queued: Event[] = []
  private held: { v: string; res: (r: number) => void; rej: (e: Error) => void }[] = []

  get(): Promise<string | null> {
    if (this.failGet > 0) {
      this.failGet--
      return Promise.reject(new Error('get rejected'))
    }
    return Promise.resolve(this.value)
  }

  set(v: string): Promise<number> {
    if (this.failSet > 0) {
      this.failSet--
      return Promise.reject(new Error('set rejected'))
    }
    if (this.holdSets) return new Promise<number>((res, rej) => this.held.push({ v, res, rej }))
    return Promise.resolve(this.commit(v))
  }

  watch(cb: (e: Event) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private commit(v: string | null): number {
    this.rev++
    this.value = v
    this.emit({ rev: this.rev, v: v ?? undefined })
    return this.rev
  }

  private emit(e: Event): void {
    if (this.quiet) {
      this.queued.push(e)
      return
    }
    for (const cb of [...this.listeners]) cb(e)
  }

  /** Another copy's write lands on the document (and its watchers). */
  foreign(v: string | null): number {
    return this.commit(v)
  }

  /** Deliver parked events oldest-first. */
  flush(): void {
    for (const e of this.queued.splice(0)) for (const cb of [...this.listeners]) cb(e)
  }

  /** Deliver parked events newest-first: the resync-after-gap shape. */
  flushReversed(): void {
    for (const e of this.queued.splice(0).reverse()) for (const cb of [...this.listeners]) cb(e)
  }

  /** Inject an arbitrary event: stale echoes, replays, forged revisions. */
  push(e: Event): void {
    for (const cb of [...this.listeners]) cb(e)
  }

  /** The platform's gap sentinel: history lost, re-read the doc. */
  resync(): void {
    for (const cb of [...this.listeners]) cb({ rev: -1 })
  }

  /** Commit every parked write ack, oldest first. */
  releaseSets(): void {
    for (const h of this.held.splice(0)) h.res(this.commit(h.v))
  }

  /** Reject every parked write ack. */
  rejectSets(): void {
    for (const h of this.held.splice(0)) h.rej(new Error('set dropped'))
  }

  get heldCount(): number {
    return this.held.length
  }
}

type Sink = { doc: Doc | null; statuses: SyncStatus[]; errors: number }
const stops: (() => void)[] = []

function engine(store: DocStore, me: string, sink: Sink): PantrySync {
  const sync = new PantrySync({
    me,
    store,
    retryMs: 5,
    onDoc: (d) => {
      sink.doc = d
    },
    onStatus: (s) => sink.statuses.push(s),
    onError: () => {
      sink.errors++
    }
  })
  stops.push(sync.start())
  return sync
}

const mkSink = (): Sink => ({ doc: null, statuses: [], errors: 0 })

/** Wait until the engine has drained every intent and reports synced. */
async function settle(sync: PantrySync, sink: Sink, label: string, tries = 400): Promise<void> {
  for (let i = 0; i < tries; i++) {
    if (sync.pendingCount() === 0 && sink.statuses[sink.statuses.length - 1] === 'synced') return
    await sleep(2)
  }
  throw new Error(`FAIL ${label}: engine never settled (pending ${sync.pendingCount()})`)
}

function names(doc: Doc | null): string[] {
  return (doc?.items ?? []).map((i) => i.name).sort()
}

const draft = (
  name: string
): { name: string; milli: number; unit: Unit; location: Location; bestBefore: string | null } => ({
  name,
  milli: 1000,
  unit: 'pcs',
  location: 'pantry',
  bestBefore: null
})

// --- the reported fault: 12 rapid accepted adds, delayed events -------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10) // initial snapshot landed

  store.quiet = true // the whole burst commits while its echoes are delayed
  for (let i = 0; i < 12; i++) {
    const res = sync.submit(opAdd(draft(`item-${i}`)))
    ok(res.meta !== undefined, `burst add ${i} accepted`)
  }
  ok((sink.doc?.items.length ?? 0) === 12, 'burst: view shows all 12 immediately')
  store.quiet = false
  store.flushReversed() // echoes arrive newest-first: worst-case ordering
  await settle(sync, sink, 'burst settle')
  eq(store.value !== null ? parseDoc(store.value).items.length : 0, 12, 'burst: storage kept all 12')
  eq(sink.doc?.items.length, 12, 'burst: view kept all 12, no flap back')
})()

// --- delayed own echo between accepted writes ------------------------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)

  store.quiet = true
  sync.submit(opAdd(draft('milk')))
  sync.submit(opAdd(draft('eggs')))
  store.quiet = false
  await settle(sync, sink, 'echo settle')
  // A stale echo of the pre-write document arrives long after settling.
  store.push({ rev: 1, v: serializeDoc({ ...EMPTY_DOC }) })
  store.push({ rev: 2, v: serializeDoc({ ...EMPTY_DOC, items: [newItem('ghost', 1, 'pcs', 'pantry', null, 1)] }) })
  await sleep(10)
  eq(names(sink.doc).join(','), 'eggs,milk', 'delayed echo cannot regress the view')
  eq(store.value !== null ? parseDoc(store.value).items.length : 0, 2, 'delayed echo cannot regress storage')
})()

// --- foreign event between two own accepted writes --------------------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const foreignDoc = {
    ...EMPTY_DOC,
    items: [newItem('foreign-tin', 500, 'g', 'pantry', null, 9)],
    by: 'inner',
    s: 1,
    high: { inner: 1 }
  }
  store.foreign(serializeDoc(foreignDoc))
  const sync = engine(store, 'cover', sink)
  await sleep(10)
  eq(sink.doc?.items.length, 1, 'sees the foreign row at start')

  store.quiet = true
  sync.submit(opAdd(draft('mine-a')))
  const between = {
    ...EMPTY_DOC,
    items: [...foreignDoc.items, newItem('foreign-b', 1, 'l', 'fridge', null, 10)],
    by: 'inner',
    s: 2,
    high: { inner: 2 }
  }
  store.quiet = false
  store.foreign(serializeDoc(between)) // lands while our write is queued
  sync.submit(opAdd(draft('mine-b')))
  await settle(sync, sink, 'foreign between writes')
  eq(names(sink.doc).join(','), 'foreign-b,foreign-tin,mine-a,mine-b', 'both writes plus both foreign rows')
  eq(names(parseDoc(store.value)).join(','), 'foreign-b,foreign-tin,mine-a,mine-b', 'storage converged to all four')
})()

// --- two writers editing different rows and list entries ---------------------------

await (async () => {
  const store = new FakeStore()
  const milk = newItem('Milk', 2000, 'l', 'fridge', null, 1)
  const rice = newItem('Rice', 500, 'g', 'pantry', null, 2)
  const shop = { id: 'shop-1', name: 'Oil', note: '', done: false, addedAt: 1 }
  const base: Doc = { ...EMPTY_DOC, items: [milk, rice], list: [shop], by: 'seed', s: 1, high: { seed: 1 } }
  store.foreign(serializeDoc(base))

  const sa = mkSink()
  const sb = mkSink()
  const a = engine(store, 'cover', sa)
  const b = engine(store, 'inner', sb)
  await sleep(10)

  // Both copies write at the same time; whichever set lands second wins the
  // commit race, and the loser must re-apply its intent on top.
  store.holdSets = true
  a.submit(opStep(milk.id, 'use')) // steps milk down 1l
  b.submit(opToggleShop(shop.id)) // marks the shopping row bought
  b.submit(opAddShop('Bread', '')) // and adds one
  store.holdSets = false
  store.releaseSets()
  await settle(a, sa, 'writer A settles')
  await settle(b, sb, 'writer B settles')

  const final = parseDoc(store.value)
  eq(final.items.find((i) => i.id === milk.id)?.milli, 1900, 'A step survived the race')
  eq(final.items.find((i) => i.id === rice.id)?.milli, 500, 'untouched row preserved')
  eq(final.list.find((s) => s.id === shop.id)?.done, true, 'B toggle survived the race')
  eq(
    final.list.some((s) => s.name === 'Bread'),
    true,
    'B list add survived the race'
  )
  eq(sa.doc && names(sa.doc).join(','), sb.doc && names(sb.doc).join(','), 'both copies render the same doc')
  eq(sa.doc?.list.length, sb.doc?.list.length ?? -1, 'both copies render the same list')

  // A bought sweep on one copy must not eat the other copy's fresh add: the
  // sweep tombstones only the ids it actually saw done, and the add replays on.
  store.holdSets = true
  b.submit(opClearBought()) // sweeps bought rows - Oil's tombstone rides the write
  a.submit(opAddShop('Eggs', '')) // an unrelated new entry racing the sweep
  store.holdSets = false
  store.releaseSets()
  await settle(a, sa, 'writer A settles after sweep race')
  await settle(b, sb, 'writer B settles after sweep race')

  const swept = parseDoc(store.value)
  eq(
    swept.list.some((s) => s.name === 'Eggs'),
    true,
    'racing list add survived a bought sweep'
  )
  eq(
    swept.list.some((s) => s.id === shop.id),
    false,
    'swept row stays gone'
  )
  eq(
    swept.list.some((s) => s.name === 'Bread'),
    true,
    'other list entries untouched'
  )
})()

// --- delete vs edit across copies ---------------------------------------------------

await (async () => {
  const store = new FakeStore()
  const milk = newItem('Milk', 2000, 'l', 'fridge', null, 1)
  const base: Doc = { ...EMPTY_DOC, items: [milk], by: 'seed', s: 1, high: { seed: 1 } }
  store.foreign(serializeDoc(base))

  const sa = mkSink()
  const sb = mkSink()
  const a = engine(store, 'cover', sa)
  const b = engine(store, 'inner', sb)
  await sleep(10)

  // A deletes while B's edit is still in flight; the tombstone must win and
  // B's accepted edit must never resurrect the row.
  store.quiet = true
  a.submit(opRemove(milk.id))
  b.submit(opUpdate({ ...milk, milli: 9000, name: 'Milk deluxe' }))
  store.quiet = false
  store.flush()
  await settle(a, sa, 'delete writer settles')
  await settle(b, sb, 'edit writer settles')

  const final = parseDoc(store.value)
  eq(
    final.items.some((i) => i.id === milk.id),
    false,
    'deleted row stays deleted'
  )
  eq(final.gone.includes(milk.id), true, 'tombstone persisted on the wire')
  eq(
    sb.doc?.items.some((i) => i.id === milk.id),
    false,
    'edit copy converged to the delete'
  )
})()

// --- rejected storage calls, then a later successful op -------------------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)

  store.failSet = Number.POSITIVE_INFINITY // writes reject until storage recovers
  sync.submit(opAdd(draft('sugar')))
  ok(sync.pendingCount() > 0, 'the op stays pending, not silently dropped')
  eq(sink.doc?.items.length, 1, 'the accepted item still renders while unsaved')
  await sleep(40)
  ok(sink.errors > 0, 'rejected set reports an error')
  ok(sink.statuses.includes('retrying'), 'status honestly says retrying')
  ok(sink.statuses[sink.statuses.length - 1] !== 'synced', 'still not synced while storage is down')
  eq(store.value, null, 'nothing was persisted during the outage')

  store.failSet = 0 // storage recovers; the next retry must write it
  await settle(sync, sink, 'recovery settles')
  eq(parseDoc(store.value).items.length, 1, 'item persisted after recovery')
  eq(sink.statuses[sink.statuses.length - 1], 'synced', 'status returns to synced')

  store.failGet = 2 // reads flap on the next op
  sync.submit(opAdd(draft('flour')))
  await settle(sync, sink, 'read-flap settles')
  eq(parseDoc(store.value).items.length, 2, 'second item persisted after get retries')
})()

// --- resync sentinel and corrupt data -------------------------------------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)
  sync.submit(opAdd(draft('pasta')))
  await settle(sync, sink, 'pasta settles')

  store.resync() // history gap: engine must re-read the doc
  await sleep(20)
  eq(sink.doc?.items.length, 1, 'resync keeps the committed row')

  store.foreign('this is not json') // corrupt payload from anywhere
  await settle(sync, sink, 'corrupt base settles')
  eq(sink.doc?.items.length, 1, 'corrupt base parses empty, journal heals the accepted row')
  eq(parseDoc(store.value).items.length, 1, 'the healed row is written back to storage')
})()

// --- held write ack, folded mid-flight ------------------------------------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)

  store.holdSets = true
  sync.submit(opAdd(draft('jam')))
  await sleep(10)
  eq(store.heldCount, 1, 'write parked in flight')
  eq(sink.doc?.items.length, 1, 'accepted item renders before its ack')

  store.releaseSets()
  await settle(sync, sink, 'held write settles')
  eq(parseDoc(store.value).items.length, 1, 'held write committed once released')
})()

// --- full reload converges on the committed document -----------------------------------

await (async () => {
  const store = new FakeStore()
  const first = mkSink()
  const a = engine(store, 'cover', first)
  await sleep(10)
  a.submit(opAdd(draft('oats')))
  a.submit(opAddShop('Tea', 'green'))
  await settle(a, first, 'first copy settles')

  const second = mkSink()
  engine(store, 'cover', second) // a fresh copy, like an unfolded mount
  await sleep(15)
  eq(names(second.doc).join(','), 'oats', 'reload restores committed items')
  eq(second.doc?.list.length, 1, 'reload restores the shopping list')
  await sleep(20) // let any echo drain through
  eq(names(second.doc).join(','), 'oats', 'no flap after reload')
})()

for (const stop of stops) stop()
console.log(`sync: ${n} checks passed`)
