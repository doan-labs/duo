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
  blockGet = false
  commits = 0
  private listeners = new Set<(e: Event) => void>()
  private queued: Event[] = []
  private held: { v: string; res: (r: number) => void; rej: (e: Error) => void }[] = []
  private getWaiters: { res: (v: string | null) => void }[] = []

  get(): Promise<string | null> {
    if (this.failGet > 0) {
      this.failGet--
      return Promise.reject(new Error('get rejected'))
    }
    if (this.blockGet) return new Promise((res) => this.getWaiters.push({ res }))
    return Promise.resolve(this.value)
  }

  /** Resolve every parked get with the current value. */
  unblockGets(): void {
    for (const w of this.getWaiters.splice(0)) w.res(this.value)
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
    this.commits++
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

// --- honest terminals: successful initial read with no journal reports synced -------------

await (async () => {
  const store = new FakeStore()
  store.foreign(
    serializeDoc({
      ...EMPTY_DOC,
      items: [newItem('figs', 1000, 'pcs', 'pantry', null)],
      by: 'other',
      s: 3,
      high: { other: 3 }
    })
  )
  const sink = mkSink()
  engine(store, 'cover', sink)
  await sleep(15)
  eq(sink.statuses[sink.statuses.length - 1], 'synced', 'initial read with empty journal reaches synced')
  eq(sink.doc?.items.length, 1, 'initial read adopted the stored document')

  const empty = mkSink()
  const store2 = new FakeStore()
  engine(store2, 'inner', empty)
  await sleep(15)
  eq(empty.statuses[empty.statuses.length - 1], 'synced', 'empty store initial read reaches synced too')
})()

// --- honest terminals: failed initial get retries, then reports synced without any op ------

await (async () => {
  const store = new FakeStore()
  store.failGet = 2 // boot read + one retry both reject
  const sink = mkSink()
  engine(store, 'cover', sink)
  await sleep(30)
  ok(sink.statuses.includes('retrying'), 'failed initial read surfaces retrying')
  for (let i = 0; i < 60 && sink.statuses[sink.statuses.length - 1] !== 'synced'; i++) await sleep(5)
  eq(sink.statuses[sink.statuses.length - 1], 'synced', 'recovered initial read reaches synced with no new op')
})()

// --- honest terminals: refresh that keeps racing events still lands a truthful synced -------

await (async () => {
  const store = new FakeStore()
  store.blockGet = true
  const sink = mkSink()
  engine(store, 'cover', sink)
  await sleep(10)
  // Each parked get is superseded by an adopting event before it resolves.
  let pushed = 0
  for (let i = 0; i < 6; i++) {
    store.push({ rev: ++pushed, v: serializeDoc({ ...EMPTY_DOC, by: 'other', s: i, high: { other: i } }) })
    store.unblockGets()
    await sleep(5)
  }
  store.unblockGets()
  store.blockGet = false
  for (let i = 0; i < 40 && sink.statuses[sink.statuses.length - 1] !== 'synced'; i++) await sleep(5)
  eq(sink.statuses[sink.statuses.length - 1], 'synced', 'raced-out refresh still lands synced')
})()

// --- admitted op whose copy folds away mid-write commits exactly once -----------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)
  const before = store.commits

  store.holdSets = true
  sync.submit(opAdd(draft('rice'))) // admitted live; copy 'hides' here - no further submits
  await sleep(10)
  eq(store.heldCount, 1, 'admitted op has one write in flight')
  store.holdSets = false
  store.releaseSets()
  await settle(sync, sink, 'hidden-completion settle')
  eq(store.commits - before, 1, 'admitted-before-hide write commits exactly once')
  eq(parseDoc(store.value).items.length, 1, 'committed doc carries the admitted item')
})()

// --- stale set flight cannot erase a confirmed peer op (the reviewer's probe) -------
//
// Per-writer adapters over one shared wire, mirroring the reviewer's probe:
// the held writer's first set parks until released; the peer's write commits
// and its event reaches the held copy before its own ack (watchBeforeAck) or
// only after (delayedPeerEvent). Either way the stale payload must not erase
// the confirmed row: the echo merges it back and a repair write re-commits it.

async function heldFlightCase(heldWriter: string, peerWriter: string, watchBeforeAck: boolean): Promise<void> {
  let wireNow: string | null = null
  let revNow = 0
  let heldText: string | null = null
  let held = false
  const release = Promise.withResolvers<void>()
  const inFlight = Promise.withResolvers<void>()
  const watchers = new Map<string, (e: Event) => void>()
  let delayedPeerEvent: Event | null = null
  const mkStore = (writer: string): DocStore => ({
    get: async () => wireNow,
    set: async (v) => {
      if (writer === heldWriter && !held) {
        held = true
        heldText = v
        inFlight.resolve()
        await release.promise
      }
      wireNow = v
      const n = ++revNow
      for (const [who, cb] of watchers) {
        if (writer === peerWriter && who === heldWriter && !watchBeforeAck) delayedPeerEvent = { rev: n, v }
        else cb({ rev: n, v })
      }
      return n
    },
    watch: (cb) => {
      watchers.set(writer, cb)
      return () => {
        watchers.delete(writer)
      }
    }
  })
  const sa = mkSink()
  const sb = mkSink()
  const a = new PantrySync({
    me: heldWriter,
    store: mkStore(heldWriter),
    retryMs: 5,
    onDoc: (d) => {
      sa.doc = d
    },
    onStatus: (s) => sa.statuses.push(s)
  })
  const b = new PantrySync({
    me: peerWriter,
    store: mkStore(peerWriter),
    retryMs: 5,
    onDoc: (d) => {
      sb.doc = d
    },
    onStatus: (s) => sb.statuses.push(s)
  })
  stops.push(a.start(), b.start())
  for (let i = 0; i < 200 && (sa.statuses.at(-1) !== 'synced' || sb.statuses.at(-1) !== 'synced'); i++) await sleep(2)

  a.submit(opAdd(draft('Admitted before fold')))
  await inFlight.promise // A's whole-doc payload is parked in flight
  b.submit(opAdd(draft('Confirmed after fold')))
  for (let i = 0; i < 200 && sb.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  eq(parseDoc(heldText!).items.length, 1, 'held payload is provably stale: it predates the peer op')
  ok(
    parseDoc(wireNow!).items.some((i) => i.name === 'Confirmed after fold'),
    'peer op durable before held ack'
  )
  eq(b.pendingCount(), 0, 'peer reports zero pending at synced')
  if (watchBeforeAck) {
    ok(
      sa.doc!.items.some((i) => i.name === 'Confirmed after fold'),
      'held copy observed the peer before its own ack'
    )
    eq(sa.doc!.items.length, 2, 'held copy renders both rows pre-ack')
  }
  b.dispose()
  release.resolve() // A's stale payload lands at a newer revision over B's
  for (let i = 0; i < 400 && sa.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  if (delayedPeerEvent) watchers.get(heldWriter)?.(delayedPeerEvent)
  for (let i = 0; i < 400 && sa.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  eq(sa.statuses.at(-1), 'synced', 'held copy settles after its stale write')

  // A fresh engine reads only the committed wire - the row must be durable.
  const sc = mkSink()
  const c = new PantrySync({
    me: 'relaunch',
    store: mkStore('relaunch'),
    retryMs: 5,
    onDoc: (d) => (sc.doc = d),
    onStatus: (s) => sc.statuses.push(s)
  })
  stops.push(c.start())
  for (let i = 0; i < 200 && sc.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  const durable = parseDoc(wireNow!).items.map((i) => i.name)
  const reloaded = (sc.doc?.items ?? []).map((i) => i.name)
  ok(durable.includes('Admitted before fold'), 'held op still durable')
  ok(durable.includes('Confirmed after fold'), 'confirmed peer op survived the stale flight')
  ok(reloaded.includes('Confirmed after fold'), 'fresh relaunch recovers the peer op')
  eq(reloaded.length, durable.length, 'reloaded view matches durable rows')
}

for (const [held, peer] of [
  ['cover', 'inner'],
  ['inner', 'cover']
] as const) {
  for (const watch of [true, false]) {
    await heldFlightCase(held, peer, watch)
  }
}

// --- same-item race: delete beats the stale write that still carried the row ---------

await (async () => {
  let wireNow: string | null = null
  let revNow = 0
  const watchers = new Map<string, (e: Event) => void>()
  let watcherSeq = 0
  const release = Promise.withResolvers<void>()
  const inFlight = Promise.withResolvers<void>()
  let held = false
  const mkStore = (writer: string): DocStore => ({
    get: async () => wireNow,
    set: async (v) => {
      if (writer === 'cover' && !held) {
        held = true
        inFlight.resolve()
        await release.promise
      }
      wireNow = v
      const n = ++revNow
      for (const cb of watchers.values()) cb({ rev: n, v })
      return n
    },
    watch: (cb) => {
      const w = `w${watcherSeq++}`
      watchers.set(w, cb)
      return () => watchers.delete(w)
    }
  })
  const sa = mkSink()
  const sb = mkSink()
  const a = new PantrySync({
    me: 'cover',
    store: mkStore('cover'),
    retryMs: 5,
    onDoc: (d) => (sa.doc = d),
    onStatus: (s) => sa.statuses.push(s)
  })
  const b = new PantrySync({
    me: 'inner',
    store: mkStore('inner'),
    retryMs: 5,
    onDoc: (d) => (sb.doc = d),
    onStatus: (s) => sb.statuses.push(s)
  })
  stops.push(a.start(), b.start())
  for (let i = 0; i < 200 && (sa.statuses.at(-1) !== 'synced' || sb.statuses.at(-1) !== 'synced'); i++) await sleep(2)

  // The contested row must be durably committed for a peer delete to be a real
  // op; seed it through a foreign writer first.
  const contested = newItem('contested', 1000, 'pcs', 'pantry', null, 8)
  const seed: Doc = { ...EMPTY_DOC, items: [contested], by: 'seed', s: 1, high: { seed: 1 } }
  revNow++
  const seedV = serializeDoc(seed)
  wireNow = seedV
  for (const cb of [...watchers.values()]) cb({ rev: revNow, v: seedV })
  await sleep(15)
  ok(
    sa.doc!.items.some((i) => i.id === contested.id),
    'both copies hold the contested row'
  )
  ok(
    sb.doc!.items.some((i) => i.id === contested.id),
    'peer holds the contested row'
  )

  a.submit(opAdd(draft('holder')))
  await inFlight.promise // held write still carries the contested row
  b.submit(opRemove(contested.id)) // peer deletes while A's write is parked
  for (let i = 0; i < 200 && sb.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  release.resolve() // stale payload with the row lands at a newer rev
  for (let i = 0; i < 400 && sa.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  for (let i = 0; i < 400 && sb.statuses.at(-1) !== 'synced'; i++) await sleep(2)
  const durable = parseDoc(wireNow!)
  eq(
    durable.items.some((i) => i.id === contested.id),
    false,
    'delete wins over the stale row payload'
  )
  ok(durable.gone.includes(contested.id), 'peer tombstone persisted through the merge')
  eq(
    sa.doc!.items.some((i) => i.id === contested.id),
    false,
    'held copy converged to the delete'
  )
  eq(
    sb.doc!.items.some((i) => i.id === contested.id),
    false,
    'deleting copy converged'
  )
})()

// --- a delayed stale event recovers a confirmed op nobody had seen yet --------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)
  sync.submit(opAdd(draft('mine')))
  await settle(sync, sink, 'own write settles')
  // An older-revision event arrives carrying committed content this copy never
  // saw: delivery order is not causal order, so its rows merge into the view
  // and the repair write makes them durable again.
  const peerDoc: Doc = {
    ...EMPTY_DOC,
    items: [newItem('recovered', 2000, 'pcs', 'pantry', null, 7)],
    by: 'inner',
    s: 1,
    high: { inner: 1 }
  }
  store.push({ rev: 1, v: serializeDoc(peerDoc) })
  await settle(sync, sink, 'stale event merge settles')
  const durable = parseDoc(store.value!)
  ok(
    durable.items.some((i) => i.name === 'recovered'),
    'unseen committed row merged into storage'
  )
  ok(
    durable.items.some((i) => i.name === 'mine'),
    'own row preserved alongside'
  )
  eq(durable.high.inner, 1, 'merged doc claims the peer mark it now carries')
  ok(durable.gone.length === 0, 'merge invented no tombstones')
})()

// --- a stale event carrying a tombstone still kills the row it covers ----------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  engine(store, 'cover', sink)
  await sleep(10)
  const dead = newItem('doomed', 1000, 'pcs', 'pantry', null, 3)
  const live = newItem('safe', 1000, 'pcs', 'pantry', null, 4)
  store.foreign(serializeDoc({ ...EMPTY_DOC, items: [dead, live], by: 'seed', s: 1, high: { seed: 1 } }))
  await sleep(15)
  eq(sink.doc?.items.length, 2, 'both seeded rows visible')

  // A stale event whose doc tombstones `dead` - even though this copy already
  // renders it - applies the delete, and no later merge resurrects the row.
  const killer: Doc = {
    ...EMPTY_DOC,
    items: [live],
    gone: [dead.id],
    by: 'inner',
    s: 2,
    high: { inner: 2 }
  }
  store.push({ rev: 99, v: serializeDoc(killer) })
  await sleep(15)
  eq(
    sink.doc?.items.some((i) => i.id === dead.id),
    false,
    'tombstoned row removed by merge'
  )
  eq(
    sink.doc?.items.some((i) => i.id === live.id),
    true,
    'untouched row survives'
  )
  store.push({ rev: 3, v: serializeDoc({ ...EMPTY_DOC, items: [dead, live], by: 'seed', s: 1, high: { seed: 1 } }) })
  await sleep(15)
  eq(
    sink.doc?.items.some((i) => i.id === dead.id),
    false,
    'replay of the pre-delete doc cannot resurrect the row'
  )
})()

// --- dispose with a write in flight and a re-kick parked: no recursive re-entry ------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)

  store.holdSets = true
  sync.submit(opAdd(draft('inflight')))
  await sleep(10)
  eq(store.heldCount, 1, 'write parked in flight')
  // A foreign event while the drain is parked sets `again`; disposing then
  // releasing must not recurse kick->drain->finally->kick into a RangeError.
  store.foreign(
    serializeDoc({ ...EMPTY_DOC, items: [newItem('x', 1, 'pcs', 'pantry', null, 1)], by: 'o', s: 1, high: { o: 1 } })
  )
  sync.dispose()
  const commits = store.commits
  store.releaseSets()
  await sleep(20)
  eq(store.commits - commits, 1, 'the released write commits once, no post-dispose drain')
  eq(sink.statuses.at(-1), 'saving', 'disposed mid-save never flips to a false terminal')
})()

// --- replayed stale echoes cause no churn: merged unions are idempotent --------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)
  sync.submit(opAdd(draft('steady')))
  await settle(sync, sink, 'initial write settles')
  const committed = store.commits
  const old = serializeDoc({ ...EMPTY_DOC, by: 'seed', s: 1, high: { seed: 1 } })
  for (let i = 0; i < 10; i++) store.push({ rev: 1, v: old }) // stale replays
  await sleep(20)
  eq(store.commits, committed, 'stale replay storm writes nothing new')
  eq(sink.doc?.items.length, 1, 'view unchanged by replays')
})()

// --- pre-protocol legacy document still adopts wholesale ------------------------------

await (async () => {
  const store = new FakeStore()
  const sink = mkSink()
  const sync = engine(store, 'cover', sink)
  await sleep(10)
  // A v1 blob has no marks or tombstones: opaque last-writer-wins bytes.
  const v1 = JSON.stringify({
    v: 1,
    items: [newItem('legacy-tin', 1000, 'pcs', 'pantry', null, 5)],
    list: [],
    muted: false
  })
  store.foreign(v1)
  await sleep(15)
  eq(sink.doc?.items.length, 1, 'legacy doc adopts whole')
  eq(sink.doc?.items[0]?.name, 'legacy-tin', 'legacy row renders')

  sync.submit(opAdd(draft('new-crop')))
  await settle(sync, sink, 'op on legacy base settles')
  const durable = parseDoc(store.value!)
  eq(durable.items.length, 2, 'write upgrades the doc with both rows')
  eq(durable.v, 2, 'wire now carries the protocol shape')
  eq(durable.high.cover !== undefined, true, 'write stamps this copy on upgrade')
})()

for (const stop of stops) stop()
console.log(`sync: ${n} checks passed`)
