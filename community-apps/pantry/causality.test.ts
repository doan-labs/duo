// Causality regressions from the reviewer's dispose-and-tomb probe, plus the
// receipt-channel variants that fix dead-writer teardown loss. Same
// throw-based style as sync.test.ts: `bun causality.test.ts`. The bus below
// gives each engine its own DocStore adapter over one shared doc value plus
// per-display receipt slots - the same shape main.tsx binds to os.storage.
import { type Doc, opAdd, opAddShop, opRemove, opStep, parseDoc, type Unit } from './pantry.ts'
import { type DocStore, PantrySync, type StoreExpect, type SyncStatus } from './sync.ts'

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
const waitFor = async (cond: () => boolean, label: string, tries = 400) => {
  for (let i = 0; i < tries && !cond(); i++) await sleep(2)
  if (!cond()) throw new Error(`FAIL ${label}`)
}

type Event = { rev: number; v?: string; slot?: string }
type Sink = { doc: Doc | null; statuses: SyncStatus[]; errors: number }
const mkSink = (): Sink => ({ doc: null, statuses: [], errors: 0 })

/**
 * One shared storage bus: the doc key plus one receipt slot per display, all
 * inside one storage space. `rev` counts every write in the space - a receipt
 * write also moves the doc token - matching the real adapter. `holdDoc` parks
 * a named writer's next doc set so an already-composed stale payload lands
 * after the peer committed; the conditional token check happens at commit,
 * so the stale write rejects E_CONFLICT instead of erasing it.
 */
class Bus {
  wire: string | null = null
  rev = 0
  gen = 1
  slots = new Map<string, string>()
  watchers = new Map<string, (e: Event) => void>()
  dropWrites = false
  private held: {
    writer: string
    v: string
    expect: StoreExpect
    res: (r: number) => void
    rej: (e: unknown) => void
  }[] = []
  private heldReads: (() => void)[] = []
  private queued = new Map<string, Event[]>()
  private quiet = new Set<string>()
  private readHeld = new Set<string>()
  failEntries = 0
  holding: string | null = null

  storeFor(writer: string): DocStore {
    return {
      entry: async () => {
        if (this.failEntries > 0) {
          this.failEntries--
          throw new Error('entry rejected')
        }
        // Snapshot at issue time: a read parked across a peer commit returns
        // the state it read, not the state at release - the held READ
        // RESPONSE shape the SDK regression list calls for.
        const snap = { v: this.wire, rev: this.rev, gen: this.gen }
        if (this.readHeld.has(writer)) await new Promise<void>((res) => this.heldReads.push(res))
        return snap
      },
      set: async (v, expect) => {
        if (this.holding === writer) {
          return new Promise<number>((res, rej) => this.held.push({ writer, v, expect, res, rej }))
        }
        return this.commitDoc(v, expect)
      },
      watch: (cb) => {
        this.watchers.set(writer, cb)
        return () => {
          this.watchers.delete(writer)
        }
      },
      ops: {
        entry: async (slot) => ({ v: this.slots.get(slot) ?? null, rev: this.rev, gen: this.gen }),
        set: async (slot, v, expect) => this.commitSlot(slot, v, expect)
      }
    }
  }

  /** Park the named writer's entry reads until releaseReads(). */
  holdReads(writer: string): void {
    this.readHeld.add(writer)
  }
  releaseReads(): void {
    this.readHeld.clear()
    for (const r of this.heldReads.splice(0)) r()
  }

  /** Stop delivering watch events to the named writer until flushed. */
  quietWatch(writer: string): void {
    this.quiet.add(writer)
  }
  /** Deliver every queued event to the named writer, oldest first. */
  flushWatch(writer: string): void {
    const pending = this.queued.get(writer)?.splice(0) ?? []
    this.quiet.delete(writer)
    const cb = this.watchers.get(writer)
    for (const e of pending) cb?.(e)
  }

  private emit(e: Event): void {
    for (const [w, cb] of [...this.watchers.entries()]) {
      if (this.quiet.has(w)) {
        const q = this.queued.get(w) ?? []
        q.push(e)
        this.queued.set(w, q)
      } else cb(e)
    }
  }

  private check(expect: StoreExpect): void {
    if (expect.gen !== this.gen) throw { code: 'E_GONE' }
    if (expect.rev !== this.rev) throw { code: 'E_CONFLICT' }
  }

  private commitDoc(v: string, expect: StoreExpect): number {
    this.check(expect)
    this.wire = v
    this.emit({ rev: ++this.rev, v })
    if (this.dropWrites) throw { code: 'E_TIMEOUT' } // committed, ack lost
    return this.rev
  }

  private commitSlot(slot: string, v: string, expect: StoreExpect): number {
    this.check(expect)
    this.slots.set(slot, v)
    this.emit({ rev: ++this.rev, v, slot })
    if (this.dropWrites) throw { code: 'E_TIMEOUT' }
    return this.rev
  }

  /** Park the named writer's next doc set (its receipt write still lands). */
  holdDoc(writer: string): void {
    this.holding = writer
  }

  /**
   * Release every parked doc write, oldest first; returns commits applied.
   * The token check runs now: a parked payload composed on an older rev
   * rejects E_CONFLICT, so `done` counts only writes that truly landed.
   */
  releaseHeld(): number {
    let done = 0
    for (const h of this.held.splice(0)) {
      try {
        h.res(this.commitDoc(h.v, h.expect))
        done++
      } catch (e) {
        h.rej(e)
      }
    }
    this.holding = null
    return done
  }

  heldCount(): number {
    return this.held.length
  }
}

const stops: (() => void)[] = []
function engine(bus: Bus, me: string, slot: string | null, sink: Sink): PantrySync {
  const sync = new PantrySync({
    me,
    store: bus.storeFor(me),
    slot: slot ?? undefined,
    peerSlots: slot === null ? [] : ['cover', 'inner'],
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

async function settle(sync: PantrySync, sink: Sink, label: string, tries = 400): Promise<void> {
  for (let i = 0; i < tries; i++) {
    if (sync.pendingCount() === 0 && sink.statuses[sink.statuses.length - 1] === 'synced') return
    await sleep(2)
  }
  throw new Error(`FAIL ${label}: engine never settled (pending ${sync.pendingCount()})`)
}

const draft = (name: string) => ({
  name,
  milli: 1000,
  unit: 'pcs' as Unit,
  location: 'pantry' as const,
  bestBefore: null
})

const batchDraft = (name: string, milli: number) => ({
  name,
  milli,
  unit: 'pcs' as Unit,
  location: 'pantry' as const,
  bestBefore: '2026-10-20'
})

// --- same-batch replay dedupe (reviewer case 1), both writer orders -----------------
//
// Held writer's accepted add flies stale; the peer accepts a SAME-batch add,
// ACKs synced, is observed by the held copy. The replayed add merges into the
// peer's row while union kept the replaying copy's own-id row too - durable
// read two rows summing past the accepted quantity. `src` provenance now
// dedupes the replayed duplicate.

async function sameBatchCase(heldW: 'cover' | 'inner', peerW: 'cover' | 'inner'): Promise<void> {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, heldW, heldW, sa)
  const b = engine(bus, peerW, peerW, sb)
  await sleep(15)

  bus.holdDoc(heldW)
  bus.quietWatch(peerW) // peer sees the receipt late, so the held write reaches the wire first
  a.submit(opAdd(batchDraft('Rice', 1000)))
  await waitFor(() => bus.heldCount() === 1, `${heldW} add parked in flight`)

  b.submit(opAdd(batchDraft('Rice', 1000)))
  await settle(b, sb, `${peerW} settled`)
  ok(sa.doc?.items.some((i) => i.name === 'Rice') === true, `${heldW} observed the peer's row before its ack`)

  bus.releaseHeld() // stale payload's token moved under the peer commit: E_CONFLICT, zero effects
  bus.flushWatch(peerW)
  await settle(a, sa, `${heldW} settles after stale ack`)
  await settle(b, sb, `${peerW} settles`)
  await sleep(10)

  const durable = parseDoc(bus.wire)
  eq(durable.items.filter((i) => i.name === 'Rice').length, 1, `${heldW}-held: exactly one Rice row durable`)
  eq(durable.items[0]?.milli, 2000, `${heldW}-held: merged quantity is exactly the two accepted adds`)
  eq(sa.doc?.items.filter((i) => i.name === 'Rice').length, 1, `${heldW} view has one row`)
  eq(sb.doc?.items.filter((i) => i.name === 'Rice').length, 1, `${peerW} view has one row`)
}

await sameBatchCase('cover', 'inner')
await sameBatchCase('inner', 'cover')

// --- repeated equivalent batches converge, not accumulate -----------------------------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  const b = engine(bus, 'inner', 'inner', sb)
  await sleep(15)

  // Six alternating same-batch adds, each fully settled before the next.
  for (let i = 0; i < 6; i++) {
    const e = i % 2 === 0 ? a : b
    e.submit(opAdd(batchDraft('Beans', 1000)))
    await settle(i % 2 === 0 ? a : b, i % 2 === 0 ? sa : sb, `batch ${i} settles`)
  }
  await settle(a, sa, 'A settles')
  await settle(b, sb, 'B settles')
  const durable = parseDoc(bus.wire)
  eq(durable.items.filter((i) => i.name === 'Beans').length, 1, 'six same-batch adds: one canonical row')
  eq(durable.items[0]?.milli, 6000, 'six same-batch adds: quantity is exactly 6x')
})()

// --- shared-row stepper race + same-batch add, both survive exactly ---------------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  const b = engine(bus, 'inner', 'inner', sb)
  await sleep(15)

  a.submit(opAdd(draft('Milk')))
  await settle(a, sa, 'seed add settles')
  const milk = parseDoc(bus.wire!).items[0]!
  const step = 1000 // pcs step

  // Both writers step the shared row while a same-batch add also races.
  bus.holdDoc('cover')
  bus.quietWatch('inner') // deterministic parking: cover's write composes first
  a.submit(opStep(milk.id, 'restock'))
  await waitFor(() => bus.heldCount() === 1, 'stepper write parked')
  b.submit(opStep(milk.id, 'restock'))
  b.submit(opAdd(draft('Milk'))) // same-batch add on the peer merges, not dupes
  await settle(b, sb, 'B settles')
  bus.releaseHeld()
  bus.flushWatch('inner')
  await settle(a, sa, 'A settles')
  await settle(b, sb, 'B re-settles')

  const durable = parseDoc(bus.wire!)
  const rows = durable.items.filter((i) => i.name === 'Milk')
  eq(rows.length, 1, 'shared-row race: one Milk row')
  eq(rows[0]?.milli, 1000 + step + step + 1000, 'shared-row race: two steps + one add all counted')
})()

// --- known-op teardown loss (reviewer case 2) with the receipt channel ---------------
//
// The held writer observed the peer's confirmed op, then EVERY engine died
// before the stale payload landed. Under one mutable doc key nothing survives
// to repair it - but the peer's receipt log is durable in its slot, so a cold
// relaunch replays what the settled doc does not cover.

async function teardownCase(heldW: 'cover' | 'inner', peerW: 'cover' | 'inner'): Promise<void> {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, heldW, heldW, sa)
  const b = engine(bus, peerW, peerW, sb)
  await sleep(15)

  bus.holdDoc(heldW)
  bus.quietWatch(peerW) // keep the peer blind so the held write reaches the wire first
  a.submit(opAdd(draft('HeldItem')))
  await waitFor(() => bus.heldCount() === 1, `${heldW} write parked`)

  b.submit(opAdd(draft('PeerItem')))
  await settle(b, sb, `${peerW} ACKs synced pending0`)
  ok(bus.slots.get(peerW)?.includes('PeerItem') === true, `${peerW} receipt is durable in its slot`)
  ok(bus.slots.get(heldW)?.includes('HeldItem') === true, `${heldW} receipt is durable in its slot`)
  ok(sa.doc?.items.some((i) => i.name === 'PeerItem') === true, `${heldW} observed the confirmed peer op`)

  // Both engines die before the stale payload lands - full teardown.
  a.dispose()
  b.dispose()
  bus.releaseHeld() // stale token rejects E_CONFLICT: zero effects, nothing lands
  await sleep(10)
  eq(parseDoc(bus.wire).items.length, 1, `${heldW}-held teardown: stale blob rejected, doc keeps the peer row`)

  // Cold relaunch: a brand-new engine reads the stale doc + both slots.
  const sc = mkSink()
  const c = engine(bus, 'cover2', 'cover', sc)
  await settle(c, sc, 'cold relaunch settles')
  const durable = parseDoc(bus.wire)
  ok(
    durable.items.some((i) => i.name === 'PeerItem'),
    `${heldW}-held teardown: cold relaunch recovered the confirmed peer op`
  )
  ok(
    durable.items.some((i) => i.name === 'HeldItem'),
    `${heldW}-held teardown: held writer's own op also durable`
  )
}

await teardownCase('cover', 'inner')
await teardownCase('inner', 'cover')

// --- teardown with a receipt-channel-less adapter keeps the documented limit ---------
// With a single mutable whole-blob key, nothing survives a dead writer's
// stale commit: the honest residual limit, asserted here so it stays stated.

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  // DocStore without the ops channel -> no receipt durability
  const mkBare = (writer: string): DocStore => ({
    entry: bus.storeFor(writer).entry,
    set: bus.storeFor(writer).set,
    watch: (cb) => bus.storeFor(writer).watch!(cb)
  })
  const a = new PantrySync({
    me: 'cover',
    store: mkBare('cover'),
    retryMs: 5,
    onDoc: (d) => (sa.doc = d),
    onStatus: (s) => sa.statuses.push(s)
  })
  const b = new PantrySync({
    me: 'inner',
    store: mkBare('inner'),
    retryMs: 5,
    onDoc: (d) => (sb.doc = d),
    onStatus: (s) => sb.statuses.push(s)
  })
  a.start()
  b.start()
  await sleep(15)

  bus.holdDoc('cover')
  bus.quietWatch('inner')
  a.submit(opAdd(draft('HeldBare')))
  await waitFor(() => bus.heldCount() === 1, 'bare held write parked')
  b.submit(opAdd(draft('PeerBare')))
  await settle(b, sb, 'bare peer settles')
  a.dispose()
  b.dispose()
  bus.releaseHeld() // stale token rejects: the peer row survives even without receipts
  await sleep(10)
  const sc = mkSink()
  const c = new PantrySync({
    me: 'c',
    store: mkBare('c'),
    retryMs: 5,
    onDoc: (d) => (sc.doc = d),
    onStatus: (s) => sc.statuses.push(s)
  })
  c.start()
  await sleep(15)
  const durable = parseDoc(bus.wire)
  // Conditional writes changed the residual: the peer op survives because the
  // stale commit rejects; the held op is still lost - no receipt channel and
  // no live copy ever observed it. The honest remaining limit.
  eq(
    durable.items.some((i) => i.name === 'PeerBare'),
    true,
    'CAS rejection preserves the peer row even on a bare single-key adapter'
  )
  eq(
    durable.items.some((i) => i.name === 'HeldBare'),
    false,
    'op no copy ever observed and no receipt carried is still lost'
  )
})()

// --- tombstone cap replay (reviewer case 3): a covered snapshot never resurrects -----

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  await sleep(15)

  // Snapshot the first synced add, then churn past GONE_CAP tombstones.
  a.submit(opAdd(draft('Ghost')))
  await settle(a, sa, 'ghost settles')
  const staleSnap = { wire: bus.wire!, rev: bus.rev }
  const ghostId = parseDoc(staleSnap.wire).items[0]!.id
  a.submit(opRemove(ghostId))
  await settle(a, sa, 'ghost removed')

  for (let i = 0; i < 513; i++) {
    a.submit(opAdd(draft(`cycle-${i}`)))
    await settle(a, sa, `cycle ${i} add`)
    const id = parseDoc(bus.wire!).items.find((x) => x.name === `cycle-${i}`)!.id
    a.submit(opRemove(id))
    await settle(a, sa, `cycle ${i} remove`)
  }
  const before = parseDoc(bus.wire)
  eq(before.items.length, 0, 'churn leaves zero rows')
  eq(before.gone.length, 512, 'tombstones capped at GONE_CAP')

  // Replay the attested older snapshot as a watch event at a stale rev, then
  // as a newer rev: neither delivery can resurrect the deleted row, because
  // the snapshot's marks are wholly covered by current coverage.
  const staleDoc = parseDoc(staleSnap.wire)
  for (const cb of (bus as unknown as { watchers: Map<string, (e: Event) => void> }).watchers.values()) {
    cb({ rev: staleSnap.rev, v: staleSnap.wire })
    cb({ rev: bus.rev + 1, v: staleSnap.wire })
  }
  await sleep(15)
  eq(
    parseDoc(bus.wire).items.some((i) => i.id === ghostId),
    false,
    'stale rev replay cannot resurrect'
  )
  eq(staleDoc.items.length, 1, 'fixture sanity: snapshot carried the ghost row')

  // Cold relaunch after the replay: still dead.
  const sc = mkSink()
  engine(bus, 'cold', 'cover', sc)
  await sleep(15)
  eq(
    parseDoc(bus.wire).items.some((i) => i.id === ghostId),
    false,
    'cold relaunch cannot resurrect either'
  )
})()

// --- receipt trims once covered; malformed entries drop ---------------------------------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  await sleep(15)

  a.submit(opAdd(draft('Tea')))
  await settle(a, sa, 'tea settles')
  await sleep(10)
  // The receipt wrote the op before the doc commit; it trims lazily on the
  // next slot write, so the covered entry may still sit in the log.
  const first = (JSON.parse(bus.slots.get('cover') ?? '{"ops":[]}') as { ops: { w: string; s: number }[] }).ops
  eq(first.length, 1, 'receipt logged the op before its doc commit')

  a.submit(opAdd(draft('Rice')))
  await settle(a, sa, 'rice settles')
  await sleep(10)
  const entries = (JSON.parse(bus.slots.get('cover') ?? '{"ops":[]}') as { ops: { w: string; s: number }[] }).ops
  eq(
    entries.every((e) => e.s === 2),
    true,
    'receipt trims entries the settled doc covered on the next write'
  )

  // A malformed slot blob must never crash ingestion or block the doc.
  bus.slots.set('inner', '{ not json ]')
  const sm = mkSink()
  const b = engine(bus, 'inner', 'inner', sm)
  b.submit(opAdd(draft('Rice')))
  await settle(b, sm, 'malformed-slot writer settles')
  ok(
    parseDoc(bus.wire).items.some((i) => i.name === 'Rice'),
    'malformed receipt slot never blocks a write'
  )
})()

// --- shopping rows ride receipts too -----------------------------------------------------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  const b = engine(bus, 'inner', 'inner', sb)
  await sleep(15)

  bus.holdDoc('cover')
  bus.quietWatch('inner')
  a.submit(opAdd(draft('HeldShopDoc')))
  await waitFor(() => bus.heldCount() === 1, 'shop write parked')
  b.submit(opAddShop('PeerBread', 'rye'))
  await settle(b, sb, 'peer shop settles')
  a.dispose()
  b.dispose()
  bus.releaseHeld() // stale doc write rejects; durable state is the peer doc + both receipts
  await sleep(10)

  const sc = mkSink()
  const c = engine(bus, 'cover2', 'cover', sc)
  await settle(c, sc, 'cold relaunch')
  const durable = parseDoc(bus.wire)
  ok(
    durable.list.some((s) => s.name === 'PeerBread'),
    'peer shopping row recovered through its receipt'
  )
})()

// --- held READ RESPONSE: a snapshot composed before the peer commit lands after -----
// The read issued early resolves with the pre-commit state. The writer then
// builds on that stale base - and its token must reject, never clobber.

async function heldReadCase(heldW: 'cover' | 'inner', peerW: 'cover' | 'inner'): Promise<void> {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, heldW, heldW, sa)
  const b = engine(bus, peerW, peerW, sb)
  await sleep(15)

  bus.holdReads(heldW)
  bus.quietWatch(heldW) // A never observes the peer before its own commit attempt
  a.submit(opAdd(draft('HeldRead'))) // receipt lands; the doc entry read parks
  await sleep(15)
  b.submit(opAdd(draft('PeerSeen')))
  await settle(b, sb, `${peerW} settles while ${heldW} read parks`)
  bus.releaseReads() // A's snapshot still says rev-before-peer: its token must lose
  bus.flushWatch(heldW)
  await settle(a, sa, `${heldW} settles`)
  const durable = parseDoc(bus.wire!)
  ok(
    durable.items.some((i) => i.name === 'PeerSeen'),
    `${heldW}-held-read: peer row preserved through the stale read`
  )
  ok(
    durable.items.some((i) => i.name === 'HeldRead'),
    `${heldW}-held-read: own op landed via rebase`
  )
}

await heldReadCase('cover', 'inner')
await heldReadCase('inner', 'cover')

// --- two initial-null seeds: both copies open an empty space together -----------------

await (async () => {
  const bus = new Bus() // wire and both slots stay null until the first commits
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  const b = engine(bus, 'inner', 'inner', sb)
  await sleep(15)
  a.submit(opAdd(draft('SeedA')))
  b.submit(opAdd(draft('SeedB')))
  await settle(a, sa, 'seed A settles')
  await settle(b, sb, 'seed B settles')
  const durable = parseDoc(bus.wire!)
  eq(
    durable.items.filter((i) => i.name === 'SeedA' || i.name === 'SeedB').length,
    2,
    'two null-seed writers both land: loser rebased, winner kept'
  )
})()

// --- delete / recreate / ABA ----------------------------------------------------------
// Add then remove tombstones the row; a same-name add creates a fresh row.
// A stale whole-blob carrying the ORIGINAL row must never resurrect it, and
// the recreated row must survive the churn.

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const sb = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  const b = engine(bus, 'inner', 'inner', sb)
  await sleep(15)

  a.submit(opAdd(draft('ABA')))
  await settle(a, sa, 'ABA add settles')
  const first = parseDoc(bus.wire!).items.find((i) => i.name === 'ABA')!
  const snapWithRow = bus.wire!
  a.submit(opRemove(first.id))
  await settle(a, sa, 'ABA remove settles')
  a.submit(opAdd(draft('ABA')))
  await settle(a, sa, 'ABA recreate settles')
  const recreated = parseDoc(bus.wire!).items.find((i) => i.name === 'ABA')!
  ok(recreated.id !== first.id, 'recreated row is a new incarnation')

  // A stale blob replay (the pre-delete commit) must not resurrect id A.
  for (const cb of [...bus.watchers.values()]) cb({ rev: bus.rev + 1, v: snapWithRow })
  await sleep(15)
  const durable = parseDoc(bus.wire!)
  eq(
    durable.items.some((i) => i.id === first.id),
    false,
    'ABA: stale attested blob cannot resurrect the deleted incarnation'
  )
  eq(durable.items.filter((i) => i.name === 'ABA').length, 1, 'ABA: exactly the recreated row survives')
  b.submit(opAdd(draft('ConfirmB')))
  await settle(b, sb, 'peer settles')
  eq(parseDoc(bus.wire!).items.filter((i) => i.name === 'ABA').length, 1, 'ABA: still one row after a peer write')
})()

// --- unknown ACK: committed, response lost -> readback covers, no duplicate -----------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  await sleep(15)

  bus.dropWrites = true // every set commits then throws E_TIMEOUT
  a.submit(opAdd(draft('Ambiguous')))
  await settle(a, sa, 'ambiguous write settles via readback')
  bus.dropWrites = false
  const durable = parseDoc(bus.wire!)
  eq(
    durable.items.filter((i) => i.name === 'Ambiguous').length,
    1,
    'unknown ACK resolved by readback: op landed exactly once'
  )
  // The receipt write also took the E_TIMEOUT path - same operation identity,
  // so retry unions never duplicate it.
  const entries = (JSON.parse(bus.slots.get('cover')!) as { ops: { w: string; s: number }[] }).ops
  eq(
    entries.filter((e) => e.w === 'cover' && e.s === 1).length <= 1,
    true,
    'receipt log keeps one entry per op after ambiguous retries'
  )
})()

// --- E_GONE: a generation bump kills the in-flight token ------------------------------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  await sleep(15)

  bus.holdDoc('cover')
  a.submit(opAdd(draft('Restored')))
  await waitFor(() => bus.heldCount() === 1, 'E_GONE write parked')
  bus.gen++ // a restore replaces the space under the live generation
  bus.releaseHeld() // the old-generation token is dead: E_GONE, zero effects
  await settle(a, sa, 'engine re-reads under the live generation')
  const durable = parseDoc(bus.wire!)
  ok(
    durable.items.some((i) => i.name === 'Restored'),
    'post-restore rebase commits the same intent under the live gen'
  )
})()

// --- failed read is never blank --------------------------------------------------------

await (async () => {
  const bus = new Bus()
  const sa = mkSink()
  const a = engine(bus, 'cover', 'cover', sa)
  await sleep(15)
  a.submit(opAdd(draft('Known')))
  await settle(a, sa, 'known add settles')

  bus.failEntries = 2 // both the receipt pass's and the doc's reads reject
  a.submit(opAdd(draft('Later')))
  await sleep(15)
  // The view must keep rendering what it already had - never regress to empty.
  ok(sa.doc?.items.some((i) => i.name === 'Known') === true, 'failed read keeps the known rows in view')
  ok(
    sa.doc?.items.some((i) => i.name === 'Later') === true,
    'failed read still shows the accepted op (view is optimistic)'
  )
  await settle(a, sa, 'drain recovers once reads succeed')
  ok(
    parseDoc(bus.wire!).items.some((i) => i.name === 'Later'),
    'recovered read commits the queued op'
  )
})()

for (const stop of stops) stop()
console.log(`causality: ${n} checks passed`)
