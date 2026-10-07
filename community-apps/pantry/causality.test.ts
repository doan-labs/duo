// Causality regressions from the reviewer's dispose-and-tomb probe, plus the
// receipt-channel variants that fix dead-writer teardown loss. Same
// throw-based style as sync.test.ts: `bun causality.test.ts`. The bus below
// gives each engine its own DocStore adapter over one shared doc value plus
// per-display receipt slots - the same shape main.tsx binds to os.storage.
import { type Doc, opAdd, opAddShop, opRemove, opStep, parseDoc, type Unit } from './pantry.ts'
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

type Event = { rev: number; v?: string; slot?: string }
type Sink = { doc: Doc | null; statuses: SyncStatus[]; errors: number }
const mkSink = (): Sink => ({ doc: null, statuses: [], errors: 0 })

/**
 * One shared storage bus: the doc key (whole-blob, last-writer-wins) plus one
 * receipt slot per display. `holdDoc` parks a named writer's next doc set so
 * an already-composed stale payload can land after the peer committed - and
 * after every engine died - exactly like the reviewer's held-flight cases.
 */
class Bus {
  wire: string | null = null
  rev = 0
  slots = new Map<string, string>()
  watchers = new Map<string, (e: Event) => void>()
  private held: { writer: string; v: string; res: (r: number) => void }[] = []
  holding: string | null = null

  storeFor(writer: string): DocStore {
    return {
      get: async () => this.wire,
      set: async (v) => {
        if (this.holding === writer) {
          await new Promise<number>((res) => this.held.push({ writer, v, res }))
        }
        return this.commitDoc(v)
      },
      watch: (cb) => {
        this.watchers.set(writer + Math.random(), cb)
        return () => {}
      },
      ops: {
        get: async (slot) => this.slots.get(slot) ?? null,
        set: async (slot, v) => {
          this.slots.set(slot, v)
          this.emit({ rev: ++this.rev, v, slot })
          return this.rev
        }
      }
    }
  }

  private emit(e: Event): void {
    for (const cb of [...this.watchers.values()]) cb(e)
  }

  private commitDoc(v: string): number {
    this.wire = v
    this.emit({ rev: ++this.rev, v })
    return this.rev
  }

  /** Park the named writer's next doc set (its receipt write still lands). */
  holdDoc(writer: string): void {
    this.holding = writer
  }

  /** Release every parked doc write, oldest first; returns commits applied. */
  releaseHeld(): number {
    let done = 0
    for (const h of this.held.splice(0)) {
      h.res(this.commitDoc(h.v))
      done++
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
  a.submit(opAdd(batchDraft('Rice', 1000)))
  await sleep(10)
  eq(bus.heldCount(), 1, `${heldW} add parked in flight`)

  b.submit(opAdd(batchDraft('Rice', 1000)))
  await settle(b, sb, `${peerW} settled`)
  ok(sa.doc?.items.some((i) => i.name === 'Rice') === true, `${heldW} observed the peer's row before its ack`)

  bus.releaseHeld()
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
  a.submit(opStep(milk.id, 'restock'))
  await sleep(5)
  b.submit(opStep(milk.id, 'restock'))
  b.submit(opAdd(draft('Milk'))) // same-batch add on the peer merges, not dupes
  await settle(b, sb, 'B settles')
  bus.releaseHeld()
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
  a.submit(opAdd(draft('HeldItem')))
  await sleep(10)
  eq(bus.heldCount(), 1, `${heldW} write parked`)

  b.submit(opAdd(draft('PeerItem')))
  await settle(b, sb, `${peerW} ACKs synced pending0`)
  ok(bus.slots.get(peerW)?.includes('PeerItem') === true, `${peerW} receipt is durable in its slot`)
  ok(sa.doc?.items.some((i) => i.name === 'PeerItem') === true, `${heldW} observed the confirmed peer op`)

  // Both engines die before the stale payload lands - full teardown.
  a.dispose()
  b.dispose()
  bus.releaseHeld()
  await sleep(10)
  eq(parseDoc(bus.wire).items.length, 1, `${heldW}-held teardown: stale blob landed, doc shows one row`)

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
  // slot null -> DocStore.ops unused -> no receipt durability
  const mkBare = (writer: string): DocStore => ({
    get: bus.storeFor(writer).get,
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
  a.submit(opAdd(draft('HeldBare')))
  await sleep(10)
  b.submit(opAdd(draft('PeerBare')))
  await settle(b, sb, 'bare peer settles')
  a.dispose()
  b.dispose()
  bus.releaseHeld()
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
  // The stale blob won: under a bare single-key adapter the peer op is gone.
  // This is the documented limit the receipt channel exists to close.
  eq(
    durable.items.some((i) => i.name === 'PeerBare'),
    false,
    'single-key adapter honestly cannot recover a dead writer teardown'
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
  a.submit(opAdd(draft('HeldShopDoc')))
  await sleep(10)
  b.submit(opAddShop('PeerBread', 'rye'))
  await settle(b, sb, 'peer shop settles')
  a.dispose()
  b.dispose()
  bus.releaseHeld()
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

for (const stop of stops) stop()
console.log(`causality: ${n} checks passed`)
