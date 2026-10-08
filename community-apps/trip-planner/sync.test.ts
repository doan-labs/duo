/**
 * Throw-runner tests for the sync primitives in `sync.ts` — the ordering
 * and failure semantics the review called out: stale echoes must never roll
 * back newer pending writes, foreign state is adopted only when nothing is
 * pending, and a failed port write reports failure instead of false success.
 * Run: bun community-apps/trip-planner/sync.test.ts
 */
import { applyWatch, clearPending, queuePending, WriteQueue } from './sync'

let passed = 0
let failed = 0
function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1
    console.log(`ok ${name}`)
  } else {
    failed += 1
    console.log(`FAIL ${name}`)
  }
}
const mkPending = () => new Map<string, (string | null)[]>()

// --- applyWatch ---------------------------------------------------------------

// In-order own echoes: effective value stays the newest write.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'B')
  check('older echo keeps pending tail', applyWatch(p, 'k', 'A') === 'B')
  check('latest echo leaves its own value', applyWatch(p, 'k', 'B') === 'B')
  check('pending drained after echoes', p.size === 0)
}

// The reported loss sequence: C rebases between echoA and echoB must see B.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'AB')
  const afterEchoA = applyWatch(p, 'k', 'A')
  check('echo of A does not roll back AB', afterEchoA === 'AB')
  queuePending(p, 'k', 'ABC')
  check('echo of AB keeps queued ABC', applyWatch(p, 'k', 'AB') === 'ABC')
  check('final echo converges', applyWatch(p, 'k', 'ABC') === 'ABC')
}

// Foreign write with nothing pending is adopted verbatim.
{
  const p = mkPending()
  check('foreign write adopted', applyWatch(p, 'k', 'F') === 'F')
  check('foreign delete adopted', applyWatch(p, 'k', null) === null)
}

// Foreign write while own writes are pending: the queued tail stays
// effective because the own writes land after it on the port (LWW).
{
  const p = mkPending()
  queuePending(p, 'k', 'B')
  check('foreign during pending is overridden by tail', applyWatch(p, 'k', 'F') === 'B')
  check('own echo then applies', applyWatch(p, 'k', 'B') === 'B')
}

// A pending delete (null tail) also survives an older echo.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', null)
  check('echo of A keeps pending delete', applyWatch(p, 'k', 'A') === null)
  check('delete echo converges', applyWatch(p, 'k', null) === null)
}

// Out-of-order echo that does not match the head is foreign data; the
// pending tail still wins and the head stays for its own echo.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'B')
  check('unmatched echo leaves head queued', applyWatch(p, 'k', 'X') === 'B' && p.get('k')?.length === 2)
}

// clearPending drops the mask (post-failure path): next foreign echo applies.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  clearPending(p, 'k')
  check('after clearPending foreign wins', applyWatch(p, 'k', 'F') === 'F')
}

// Per-key isolation: pending on k1 must not affect k2 events.
{
  const p = mkPending()
  queuePending(p, 'k1', 'A')
  check('other key adopts foreign', applyWatch(p, 'k2', 'F') === 'F')
  check('k1 echo still acks', applyWatch(p, 'k1', 'A') === 'A')
}

// --- WriteQueue ---------------------------------------------------------------

// Ordering: writes land serially in enqueue order.
{
  const q = new WriteQueue()
  const order: number[] = []
  let gate = 0
  const done = [
    q.send(
      async () => {
        await new Promise((r) => setTimeout(r, 5))
        order.push(1)
      },
      () => {}
    ),
    q.send(
      async () => {
        order.push(2)
      },
      () => {}
    ),
    q.send(
      async () => {
        order.push(3)
      },
      () => {}
    )
  ]
  const ok = await Promise.all(done)
  gate = 1
  check('writes execute in order', order.join(',') === '1,2,3' && gate === 1)
  check(
    'all landed',
    ok.every((r) => r === 'landed')
  )
}

// Failure injection: a write that throws ambiguously resolves 'unknown',
// calls onFail once, and does not block or poison later writes. Only a
// definitive refusal code resolves 'missed'.
{
  const q = new WriteQueue()
  let fails = 0
  const results = await Promise.all([
    q.send(
      async () => {},
      () => fails++
    ),
    q.send(
      async () => {
        throw new Error('port rejected')
      },
      () => fails++
    ),
    q.send(
      async () => {},
      () => fails++
    )
  ])
  check('ambiguous write reports unknown', results[1] === 'unknown')
  check('neighbors still land', results[0] === 'landed' && results[2] === 'landed')
  check('onFail fired once', fails === 1)
}

// Outcome classification: definitive refusal codes (host NACK / client-side
// pre-send reject) resolve 'missed'; timeouts, closes, protocol breaks,
// host-internal errors and non-platform throws all resolve 'unknown' -
// the write may still have landed and nothing may be re-sent blindly.
{
  const q = new WriteQueue()
  const refused = (code: string) =>
    q.send(
      async () => {
        throw Object.assign(new Error(code), { code })
      },
      () => {}
    )
  check('E_ARGS refuses -> missed', (await refused('E_ARGS')) === 'missed')
  check('E_QUOTA refuses -> missed', (await refused('E_QUOTA')) === 'missed')
  check('E_RATE refuses -> missed', (await refused('E_RATE')) === 'missed')
  check('E_DENIED refuses -> missed', (await refused('E_DENIED')) === 'missed')
  check('E_STALE refuses -> missed', (await refused('E_STALE')) === 'missed')
  check(
    'E_GONE classifies as a refreshable conflict',
    classifyError(Object.assign(new Error('E_GONE'), { code: 'E_GONE' })) === 'conflict'
  )
  check(
    'E_CONFLICT classifies as a refreshable conflict',
    classifyError(Object.assign(new Error('E_CONFLICT'), { code: 'E_CONFLICT' })) === 'conflict'
  )
  check('E_UNSUPPORTED refuses -> missed', (await refused('E_UNSUPPORTED')) === 'missed')
  check('E_TIMEOUT ambiguous -> unknown', (await refused('E_TIMEOUT')) === 'unknown')
  check('E_CLOSED ambiguous -> unknown', (await refused('E_CLOSED')) === 'unknown')
  check('E_PROTOCOL ambiguous -> unknown', (await refused('E_PROTOCOL')) === 'unknown')
  check('E_STORAGE ambiguous -> unknown', (await refused('E_STORAGE')) === 'unknown')
  check(
    'bare throw ambiguous -> unknown',
    (await q.send(
      async () => {
        throw new Error('x')
      },
      () => {}
    )) === 'unknown'
  )
  check(
    'clean write lands',
    (await q.send(
      async () => {},
      () => {}
    )) === 'landed'
  )
}

// settled(): false when any enqueued write failed, true when all landed.
{
  const q = new WriteQueue()
  q.send(
    async () => {},
    () => {}
  )
  check('settled true after success', (await q.settled()) === true)

  const q2 = new WriteQueue()
  q2.send(
    async () => {
      throw new Error('x')
    },
    () => {}
  )
  check('settled false after failure', (await q2.settled()) === false)

  // A definitive refusal also settles false.
  const q4 = new WriteQueue()
  q4.send(
    async () => {
      throw Object.assign(new Error('refused'), { code: 'E_QUOTA' })
    },
    () => {}
  )
  check('settled false after refusal', (await q4.settled()) === false)

  // A failure snapshot taken at call time does not wait on writes enqueued later.
  const q3 = new WriteQueue()
  q3.send(
    async () => {},
    () => {}
  )
  const early = q3.settled()
  q3.send(
    async () => {},
    () => {}
  )
  check('settled snapshots inflight set', (await early) === true)
}

// send() itself never rejects on port failure (callers get outcomes).
{
  const q = new WriteQueue()
  const r = await q.send(
    async () => {
      throw new Error('boom')
    },
    () => {}
  )
  check('send resolves not rejects on failure', r === 'unknown')
}

// --- commitLibWrites -----------------------------------------------------------
// Real boolean-adapter fault harness: every op resolves a durable boolean
// (or throws, like a rejected port write). Failures are injected per key,
// foreign writes interleave between steps, and the backing Map is inspected
// afterwards exactly like a resnapshot would.

import {
  type CasOutcome,
  classifyError,
  commitLibWrites,
  commitWithReplan,
  conditionalSet,
  mergeIndexOrder
} from './sync'
import {
  addPack,
  addTrip,
  assembleLibrary,
  isTombValue,
  planLibWrites,
  removeTrip,
  restoreTrip,
  serializeIndex,
  serializeTrip,
  togglePack,
  updateTrip
} from './trips'

// Durable CAS store: a space-global `rev` counts every landed write and a
// fixed `gen` identifies this generation. `set` is conditioned on the
// {rev, gen} token the caller's `entry` read minted - a stale token or a
// dead generation returns 'conflict' with zero effects, matching the
// platform's kv.set/E_CONFLICT/E_GONE contract.
class Store {
  map = new Map<string, string>()
  rev = 0
  gen = 1
  // Clean refusals resolve 'missed' - a refused write provably never
  // applied. Counts are keyed per op (`put trip.x`, `entry index`).
  rejects = new Map<string, number>()
  // Ambiguous failures return 'unknown' WITHOUT writing (request lost
  // before the host saw it).
  throws = new Map<string, number>()
  // ACK loss AFTER the durable write: the value lands, the caller sees
  // 'unknown'.
  lostAcks = new Map<string, number>()
  delays = new Map<string, number>()
  // Reads that never answer (a held reply).
  heldReads = new Map<string, Promise<void>>()
  log: string[] = []
  // Peer injection: runs inside `set` BEFORE the token check, so a foreign
  // write models exactly 'landed between this copy's entry read and its
  // conditional write'.
  foreign: ((store: Store, op: string) => Promise<void>) | null = null
  private async op(kind: string, key: string) {
    const id = `${kind} ${key}`
    this.log.push(id)
    const d = this.delays.get(key)
    if (d) await new Promise((r) => setTimeout(r, d))
  }
  async entry(k: string) {
    await this.op('entry', k)
    const gate = this.heldReads.get(k)
    if (gate) {
      this.heldReads.delete(k)
      await gate
    }
    const r = this.rejects.get(`entry ${k}`) ?? 0
    if (r > 0) {
      this.rejects.set(`entry ${k}`, r - 1)
      throw new Error('refused read')
    }
    return { v: this.map.get(k) ?? null, rev: this.rev, gen: this.gen }
  }
  async set(k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> {
    await this.foreign?.(this, `put ${k}`)
    await this.op('put', k)
    const r = this.rejects.get(`put ${k}`) ?? 0
    if (r > 0) {
      this.rejects.set(`put ${k}`, r - 1)
      return 'missed'
    }
    const t = this.throws.get(`put ${k}`) ?? 0
    if (t > 0) {
      this.throws.set(`put ${k}`, t - 1)
      return 'unknown'
    }
    if (expect.rev !== this.rev || expect.gen !== this.gen) return 'conflict'
    this.map.set(k, v)
    this.rev++
    const la = this.lostAcks.get(`put ${k}`) ?? 0
    if (la > 0) {
      this.lostAcks.set(`put ${k}`, la - 1)
      return 'unknown'
    }
    return 'landed'
  }
  // A direct peer write (bumps rev like the host would).
  peerSet(k: string, v: string) {
    this.map.set(k, v)
    this.rev++
  }
  // The authoritative read a snapshot would return.
  async get(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  // What a resnapshot would see: no index ref without a stored live record.
  dangling() {
    const order = JSON.parse(this.map.get('index') ?? '{"order":[]}').order as string[]
    return order.filter((id) => {
      const v = this.map.get(`trip.${id}`)
      return v === undefined || isTombValue(v)
    })
  }
  lib() {
    const records = new Map<string, string>()
    for (const [k, v] of this.map) if (k.startsWith('trip.')) records.set(k, v)
    return assembleLibrary(this.map.get('index') ?? null, records)
  }
}

const lib0 = { order: [] as string[], trips: [] as import('./trips').Trip[] }
// trip.* records of a durable map, shaped like a snapshot read.
const recordsOf = (m: Map<string, string>) => new Map([...m].filter(([k]) => k.startsWith('trip.')))
const readIndexList = (v: string): string[] => {
  try {
    const p = JSON.parse(v)
    return Array.isArray(p?.order) ? p.order : []
  } catch {
    return []
  }
}
const mk = () => {
  const a = addTrip(lib0, { name: 'A', start: '2026-03-01', end: '2026-03-05' }, 1, 'ta')
  const b = addTrip(a.lib, { name: 'B', start: '2026-04-01', end: '2026-04-03' }, 2, 'tb')
  return { lib: b.lib, ta: a.trip, tb: b.trip }
}
const seed = (s: Store, lib: { order: string[]; trips: import('./trips').Trip[] }) => {
  s.map.set('index', serializeIndex(lib.order))
  for (const t of lib.trips) s.map.set(`trip.${t.id}`, serializeTrip(t))
}

// Plan shape: a delete commits the tomb BEFORE the index removal, so a
// peer restore landing inside the commit window ends up an unindexed live
// record (recovered by the assembler) instead of being erased mid-window.
// No del and no repair reads exist anywhere.
{
  const { lib } = mk()
  const next = removeTrip(lib, 'ta').lib
  const plan = planLibWrites(lib, next)
  check(
    'delete plan orders retained tomb before index - never a del',
    plan.map((w) => `${w.kind} ${w.key}`).join('|') === 'tomb trip.ta|index index'
  )
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const plan2 = planLibWrites(lib, c.lib)
  check(
    'create plan orders record before index',
    plan2.map((w) => `${w.kind} ${w.key}`).join('|') === 'put trip.tc|index index'
  )
}

// Happy delete: index commits, tomb lands and stays, result applied.
// Tomb retention is the fix for the read->cleanup race: nothing is written
// after the commit, so no late snapshot can feed a stale delete.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  await new Promise((r) => setTimeout(r, 30))
  check('delete applied', ok === 'applied')
  check('record tombed, never deleted', isTombValue(s.map.get('trip.ta')))
  check('no del issued anywhere', !s.log.some((l) => l.startsWith('del ')))
  check('index dropped id', !JSON.parse(s.map.get('index')!).order.includes('ta'))
  check('no dangling', s.dangling().length === 0)
}

// Index put permanently rejected on delete: the tomb already landed and is
// preserved (no rollback), so the receipt is an honest 'partial' - the trip
// is tombed and hidden while a dead-id index entry remains until the next
// index write heals it.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('delete with rejected index reports partial', ok === 'partial')
  check('landed tomb preserved - never rolled back', isTombValue(s.map.get('trip.ta')))
  check('removed trip hidden from the library', !s.lib().trips.some((t) => t.id === 'ta'))
  check('stale index entry is dead-id debris only', s.dangling().join(',') === 'ta')
}

// Create, record put rejected: index is never reached, nothing dangles.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.tc', 9)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('create reports failed', ok === 'failed')
  check('new record not stored', !s.map.has('trip.tc'))
  check('index unchanged', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
  check('no dangling after failed create', s.dangling().length === 0)
}

// Create, index rejected after the record landed: the un-referenced record
// is PRESERVED - a repair write would have to use a snapshot that could be
// stale. The receipt is an honest 'partial' and the orphan is recovered by
// the assembler on resnapshot, so the user's create is not lost.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('create partial terminal', ok === 'partial')
  check('landed record preserved - never a rollback tomb', s.map.has('trip.tc') && !isTombValue(s.map.get('trip.tc')))
  check(
    'resnapshot recovers the landed record',
    s.lib().trips.some((t) => t.id === 'tc')
  )
  check('index still original', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Mixed diff (rename A + add C + delete B), the add is rejected: the commit
// aborts after the landed prefix - 'partial', the landed edit preserved,
// the planned delete never tombed, the index untouched.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  let next = updateTrip(lib, 'ta', { name: 'A2' })
  const c = addTrip(next, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  next = removeTrip(c.lib, 'tb').lib
  s.rejects.set('put trip.tc', 9)
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('mixed diff reports partial', ok === 'partial')
  check('landed edit preserved, not repaired', JSON.parse(s.map.get('trip.ta')!).name === 'A2')
  check('unreached delete left the record live', s.map.has('trip.tb') && !isTombValue(s.map.get('trip.tb')))
  check('index unchanged on abort', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// A definitive refusal is terminal for that request - the commit never
// re-sends a pre-planned payload (the SDK owns same-ID retry; a new
// request is a new mutation that could land LWW over a peer). One clean
// reject -> 'failed', exactly one put issued, nothing stored.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.tc', 1)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('refused create reports failed', ok === 'failed')
  check('no retry of a planned payload', s.log.filter((l) => l === 'put trip.tc').length === 1)
  check('record absent after refusal', !s.map.has('trip.tc'))
}

// Delayed step: a slow put does not reorder later writes.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.delays.set('trip.tc', 150)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('delayed step applied', ok === 'applied')
  check('index written after slow record', s.log.indexOf('put index') > s.log.indexOf('put trip.tc'))
}

// A foreign write landing between the record put and the index put neither
// corrupts the diff nor is lost itself.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  s.foreign = async (store, op) => {
    if (op === 'put index' && !store.map.has('foreign.k')) store.map.set('foreign.k', 'other-copy')
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('foreign write between steps lands', s.map.get('foreign.k') === 'other-copy')
  check('diff still applied', ok === 'applied' && s.map.has('trip.tc'))
}

// Tomb retention: the commit issues no post-commit writes at all, so the
// acknowledged deletion can neither resurface nor be erased by old work.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('delete applied', ok === 'applied')
  check('index authoritative', !JSON.parse(s.map.get('index')!).order.includes('ta'))
  await new Promise((r) => setTimeout(r, 30))
  check('tomb retained - the only debris', isTombValue(s.map.get('trip.ta')))
  check(
    'zero post-commit writes - entry reads precede each conditional set',
    s.log.filter((l) => l.startsWith('put ')).join('|') === 'put trip.ta|put index'
  )
  check('acknowledged delete never resurfaces', !s.lib().trips.some((t) => t.id === 'ta'))
  check('no dangling index ref', s.dangling().length === 0)
}

// Edit-only diff: a rejected record write leaves the previous record intact.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.ta', 9)
  const next = togglePack(togglePack(lib, 'ta', 'x'), 'ta', 'x')
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('edit reports failed', ok === 'failed')
  check('previous record intact', JSON.parse(s.map.get('trip.ta')!).name === 'A')
}
// The exact probe race (cycle-10): CopyA's delete commits index+tomb and
// returns 'applied'; its detached cleanup had taken an authoritative tomb
// snapshot whose REPLY is delayed. CopyB's accepted Undo commits its
// restore durably before the stale reply is delivered. Under the old
// protocol the late snapshot fed an unconditional del and the newer
// incarnation was erased (rows 1->0 while both receipts said applied).
// Now there is no post-commit write at all: the poisoned path is gone.
{
  const { lib, ta } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const gate = () => {
    let release!: () => void
    const promise = new Promise<void>((r) => {
      release = r
    })
    return { promise, release }
  }
  const snapshotReply = gate()
  let capturedTomb = false
  // One shared space: the rev/generation both copies condition on.
  const space = { rev: 0, gen: 1 }
  const adapter = (delayTombRead: boolean) => {
    const writes = new WriteQueue()
    const log: string[] = []
    return {
      log,
      entry: (k: string) =>
        writes.run(async () => {
          const v = data.get(k) ?? null
          if (delayTombRead && k === `trip.${ta.id}` && isTombValue(v)) {
            capturedTomb = true
            await snapshotReply.promise
          }
          return { v, rev: space.rev, gen: space.gen }
        }),
      set: (k: string, v: string, expect: { rev: number; gen: number }) =>
        writes.run(async (): Promise<CasOutcome> => {
          log.push(`put ${k}`)
          if (expect.rev !== space.rev || expect.gen !== space.gen) return 'conflict'
          data.set(k, v)
          space.rev++
          return 'landed'
        })
    }
  }
  const copyA = adapter(true)
  const copyB = adapter(false)
  const deletedLib = removeTrip(lib, 'ta').lib
  const deleteReceipt = await commitLibWrites(copyA, planLibWrites(lib, deletedLib))
  // The delete returned with nothing left in flight: the delayed-snapshot
  // gate never even triggers because no post-commit read exists.
  check('delete applied', deleteReceipt === 'applied')
  const cur = assembleLibrary(data.get('index') ?? null, new Map([...data].filter(([k]) => k.startsWith('trip.'))))
  check('assembler sees deleted library', !cur.trips.some((t) => t.id === 'ta'))
  const restored = restoreTrip(cur, ta, 0)
  const undoReceipt = await commitLibWrites(copyB, planLibWrites(cur, restored))
  check('undo applied on peer copy', undoReceipt === 'applied')
  snapshotReply.release()
  await new Promise((r) => setTimeout(r, 30))
  const rows = assembleLibrary(data.get('index') ?? null, new Map([...data].filter(([k]) => k.startsWith('trip.'))))
  check(
    'restored trip durable after late snapshot',
    rows.trips.some((t) => t.id === 'ta')
  )
  check('index reaches the restore', JSON.parse(data.get('index')!).order.includes('ta'))
  check('restored record live, not tomb', data.has(`trip.${ta.id}`) && !isTombValue(data.get(`trip.${ta.id}`)))
  check('no tomb-snapshot read was ever taken', !capturedTomb)
  check('no del issued by either copy', ![...copyA.log, ...copyB.log].some((l) => l.startsWith('del ')))
}

// Same race, Undo on the SAME copy that deleted: still restores durably
// and nothing is deleted afterwards.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  const deletedLib = removeTrip(lib, 'ta').lib
  const ok1 = await commitLibWrites(s, planLibWrites(lib, deletedLib))
  const cur = assembleLibrary(s.map.get('index') ?? null, new Map([...s.map].filter(([k]) => k.startsWith('trip.'))))
  const ok2 = await commitLibWrites(s, planLibWrites(cur, restoreTrip(cur, ta, 0)))
  check('same-copy undo applied', ok1 === 'applied' && ok2 === 'applied')
  check(
    'restore durable',
    s.lib().trips.some((t) => t.id === 'ta')
  )
  check('no del on same-copy path', !s.log.some((l) => l.startsWith('del ')))
  // And a second same-id delete after the restore leaves a fresh tomb,
  // restorable again - generations interleave freely without reclamation.
  const libNow = s.lib()
  const deleted2 = removeTrip(libNow, 'ta').lib
  const ok3 = await commitLibWrites(s, planLibWrites(libNow, deleted2))
  check('second delete applied', ok3 === 'applied' && isTombValue(s.map.get('trip.ta')))
  const restored2 = restoreTrip(s.lib(), ta, 0)
  const ok4 = await commitLibWrites(s, planLibWrites(s.lib(), restored2))
  check('second restore durable', ok4 === 'applied' && s.lib().trips.some((t) => t.id === 'ta'))
}

// Ambiguous write outcome: the op throws (timeout, transport) and no clean
// rejection ever proves it did not land - the commit reports 'partial',
// never a clean 'failed' over an uncertain write.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.throws.set('put trip.tc', 9)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('ambiguous write reports partial', ok === 'partial')
}

// Honest partial: the second record write is rejected so the commit aborts
// with the first landed - 'partial', never a clean 'failed' over half
// -applied state; the durable store shows exactly the half that landed.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const next = updateTrip(updateTrip(lib, 'ta', { name: 'A2' }), 'tb', { name: 'B2' })
  s.rejects.set('put trip.tb', 9)
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('aborted commit reports partial', ok === 'partial')
  check('landed half remains durable', JSON.parse(s.map.get('trip.ta')!).name === 'A2')
  check('rejected half unchanged', JSON.parse(s.map.get('trip.tb')!).name === 'B')
  check('index untouched', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Foreign write owns a slot mid-commit: nothing re-writes the key, so the
// peer value survives untouched; the abort still reports 'partial'.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  s.rejects.set('put index', 9)
  s.foreign = async (store, op) => {
    if (op === 'put index') store.peerSet('trip.tc', serializeTrip({ ...c.trip, name: 'PEER' }))
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, c.lib))
  check('foreign-owned slot reports partial', ok === 'partial')
  check('peer value preserved, not clobbered', JSON.parse(s.map.get('trip.tc')!).name === 'PEER')
}

// Tomb-first ordering protects a peer restore landing inside the commit
// window: our index removal lands after the peer's record write, leaving
// an unindexed live record the assembler recovers - never erased.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  const next = removeTrip(lib, 'ta').lib
  let restored = false
  s.foreign = async (store, op) => {
    // CopyB's restore commit lands between our tomb and our index write.
    if (op === 'put index' && !restored) {
      restored = true
      store.peerSet('trip.ta', serializeTrip({ ...ta, name: 'RESTORED' }))
    }
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('our delete still applies', ok === 'applied')
  check(
    'peer restore preserved as recovered orphan',
    s.lib().trips.some((t) => t.id === 'ta' && t.name === 'RESTORED')
  )
}

// Tomb-put rejected: the tomb is the FIRST write of a delete plan, so the
// abort happens before the index moves - clean 'failed', trip intact.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put trip.ta', 9) // the tomb write is a put to trip.ta
  const next = removeTrip(lib, 'ta').lib
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('tomb failure reports failed', ok === 'failed')
  check('trip survives', s.map.has('trip.ta') && !isTombValue(s.map.get('trip.ta')))
  check('index untouched', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Index-only reorder failure: nothing was applied, clean failed.
{
  const { lib, ta, tb } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('put index', 9)
  const reordered = { order: ['tb', 'ta'], trips: [tb, ta] }
  const ok = await commitLibWrites(s, planLibWrites(lib, reordered))
  check('reorder reports failed', ok === 'failed')
  check('index unchanged on reorder failure', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// The cycle-11 probe race (exact parent's interleaving): A edits two trip
// records, t1's put lands, t2's put rejects. While the abort resolves, B's
// acknowledged edit of t1 lands. Under the repair scheme a delayed
// verify-read reply let A re-put its old t1 value and erase B. With no
// reads and no rollback, t1 is never written again - B's edit survives and
// A's receipt is an honest 'partial' (t1 DID land), never 'failed'.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  const next = updateTrip(updateTrip(lib, 'ta', { name: 'A2' }), 'tb', { name: 'B2' })
  s.rejects.set('put trip.tb', 9)
  let peerLanded = false
  s.foreign = async (store, op) => {
    if (op === 'put trip.tb' && !peerLanded) {
      peerLanded = true
      store.peerSet('trip.ta', serializeTrip({ ...ta, name: 'PEER' }))
    }
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('abort after landed prefix reports partial', ok === 'partial')
  check('peer edit on landed key preserved', JSON.parse(s.map.get('trip.ta')!).name === 'PEER')
  check('landed key written exactly once - no stale re-put', s.log.filter((l) => l === 'put trip.ta').length === 1)
  check('commit issued no dels', !s.log.some((l) => l.startsWith('del ')))
  check('index untouched on abort', JSON.parse(s.map.get('index')!).order.join(',') === 'ta,tb')
}

// Same race with a DELAYED first-step reply (the repair scheme's exact
// window): t1's put lands slowly, t2 rejects, B's t1 edit commits in
// between - B still wins because t1 is never re-written.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  const next = updateTrip(updateTrip(lib, 'ta', { name: 'A2' }), 'tb', { name: 'B2' })
  s.delays.set('trip.ta', 60)
  s.rejects.set('put trip.tb', 9)
  s.foreign = async (store, op) => {
    if (op === 'put trip.tb') store.peerSet('trip.ta', serializeTrip({ ...ta, name: 'PEER' }))
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('delayed-step abort reports partial', ok === 'partial')
  check('peer survives delayed window', JSON.parse(s.map.get('trip.ta')!).name === 'PEER')
}

// Tomb-history honesty: tombs are retained per acknowledged delete, so the
// count grows with delete history - NOT bounded by the live trip cap. 64
// create/delete cycles leave 64 tomb keys and zero rows; the platform's
// 4096-key/byte quota is the real bound, and this test pins the semantics.
{
  const s = new Store()
  let lib = { order: [] as string[], trips: [] as import('./trips').Trip[] }
  for (let i = 0; i < 64; i++) {
    const created = addTrip(lib, { name: `T${i}`, start: '2026-03-01', end: '2026-03-02' }, i, `k${i}`)
    const ok1 = await commitLibWrites(s, planLibWrites(lib, created.lib))
    const deleted = removeTrip(created.lib, `k${i}`).lib
    const ok2 = await commitLibWrites(s, planLibWrites(created.lib, deleted))
    if (ok1 !== 'applied' || ok2 !== 'applied') throw new Error('cycle failed')
    lib = deleted
  }
  const tombs = [...s.map.keys()].filter((k) => k.startsWith('trip.')).length
  check('64 delete cycles retain 64 tomb keys', tombs === 64)
  check('assembler hides every tomb', s.lib().trips.length === 0)
  check('index stays empty', JSON.parse(s.map.get('index')!).order.length === 0)
}

const tripName = (data: Map<string, string>, id: string) => JSON.parse(data.get(`trip.${id}`) ?? '{}').name

// --- cycle-12 regression: ACK loss after a durable write -----------------
// The parent's exact interleaving: A's put lands durably but its ACK is
// lost (ambiguous). Under the old app-level retry A re-sent the SAME
// planned payload as a NEW request 120ms later, and it landed LWW over B's
// confirmed edit - both receipts 'applied', peer data erased. Now the
// write resolves 'unknown', the commit aborts honestly as 'partial', and
// exactly ONE put is ever issued - B's edit is preserved.
{
  const { lib, ta } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const records = () => new Map([...data].filter(([k]) => k.startsWith('trip.')))
  const qa = new WriteQueue()
  const qb = new WriteQueue()
  const space = { rev: 0, gen: 1 }
  let aPuts = 0
  let heldOnce = false
  const readbackA = Promise.withResolvers<void>()
  const releasedA = Promise.withResolvers<void>()
  const a = {
    entry: (k: string) =>
      qa.run(async () => {
        if (aPuts === 1 && !heldOnce) {
          heldOnce = true
          readbackA.resolve()
          await releasedA.promise
        }
        return { v: data.get(k) ?? null, rev: space.rev, gen: space.gen }
      }),
    set: (k: string, v: string, expect: { rev: number; gen: number }) =>
      qa.run(async (): Promise<CasOutcome> => {
        aPuts++
        if (expect.rev !== space.rev || expect.gen !== space.gen) return 'conflict'
        data.set(k, v)
        space.rev++
        // The write landed; the ACK is lost. The next op is the readback
        // entry above - hold it so B can commit in the ambiguity window.
        return 'unknown'
      })
  }
  const b = {
    entry: (k: string) => qb.run(async () => ({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen })),
    set: (k: string, v: string, expect: { rev: number; gen: number }) =>
      qb.run(async (): Promise<CasOutcome> => {
        if (expect.rev !== space.rev || expect.gen !== space.gen) return 'conflict'
        data.set(k, v)
        space.rev++
        return 'landed'
      })
  }
  const nextA = updateTrip(lib, 'ta', { name: 'A accepted edit' })
  const receiptA = commitLibWrites(a, planLibWrites(lib, nextA))
  await readbackA.promise
  // B reads durable state and commits a confirmed edit while A's readback
  // is still held.
  const beforeB = assembleLibrary(data.get('index') ?? null, records())
  const nextB = updateTrip(beforeB, 'ta', { name: 'B confirmed edit' })
  const receiptB = await commitLibWrites(b, planLibWrites(beforeB, nextB))
  releasedA.resolve()
  const resultA = await receiptA
  const final = assembleLibrary(data.get('index') ?? null, records())
  check('peer durable before A resolves', tripName(data, ta.id) === 'B confirmed edit')
  check('A never re-sent the stale payload', aPuts === 1)
  check('readback sees the peer - honest partial, NO replan of unproven intent', resultA === 'partial')
  check('peer edit confirmed applied', receiptB === 'applied')
  check('peer edit preserved after A settles', tripName(data, ta.id) === 'B confirmed edit')
  check('assembler agrees', final.trips.find((t) => t.id === 'ta')?.name === 'B confirmed edit')
}

// Same interleaving but A's readback arrives BEFORE B writes: the durable
// value equals A's intended value, so the ambiguous write settles as
// landed and A reports 'applied' - the readback is reconciliation, not
// permission to write again.
{
  const { lib, ta } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  let puts = 0
  const u = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      puts++
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      data.set(k, v)
      space.rev++
      return Promise.resolve('unknown')
    }
  }
  const next = updateTrip(lib, 'ta', { name: 'Landed-then-lost edit' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  check('readback confirms landed write -> applied', outcome === 'applied')
  check('exactly one conditional put', puts === 1)
  check('durable value is the landed one', tripName(data, ta.id) === 'Landed-then-lost edit')
}

// Repeated ACK loss on every put: each write lands durably then drops the
// response. Nothing may be retried; the terminal is 'partial' (never a
// false 'failed' over data that landed) and the durable value survives.
{
  const { lib, ta } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const qu = new WriteQueue()
  const space = { rev: 0, gen: 1 }
  let puts = 0
  const u = {
    entry: (k: string) => qu.run(async () => ({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen })),
    set: (k: string, v: string, expect: { rev: number; gen: number }) =>
      qu.run(async (): Promise<CasOutcome> => {
        puts++
        if (expect.rev !== space.rev || expect.gen !== space.gen) return 'conflict'
        data.set(k, v)
        space.rev++
        return 'unknown'
      })
  }
  const next = updateTrip(lib, 'ta', { name: 'Unknown-but-durable edit' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  check('one put despite repeated-attempt hazard', puts === 1)
  check('lost-ack settled by readback -> applied', outcome === 'applied')
  check('durable value is the landed one', tripName(data, ta.id) === 'Unknown-but-durable edit')
}

// Request dropped BEFORE the host write: the host never saw it, but the
// app cannot tell a pre-write drop from a post-write drop - 'unknown' is
// still the honest outcome and no stale payload is re-sent.
{
  const { lib, ta } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const qu = new WriteQueue()
  const space = { rev: 0, gen: 1 }
  let puts = 0
  const u = {
    entry: (k: string) => qu.run(async () => ({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen })),
    set: (k: string, v: string, expect: { rev: number; gen: number }) =>
      qu.run(async (): Promise<CasOutcome> => {
        void k
        void v
        puts++
        if (expect.rev !== space.rev) return 'conflict'
        return 'unknown' // request never reached the host: nothing stored
      })
  }
  const next = updateTrip(lib, 'ta', { name: 'Dropped edit' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  // Prior-value readback does NOT prove the request missed - it may still
  // commit late - so one unproven attempt is all that runs.
  check('pre-write drop reports honest partial', outcome === 'partial')
  check('no resend on unproven readback', puts === 1)
  check('prior value untouched', tripName(data, ta.id) === 'A')
}

// Multi-key plan where a middle write loses its ACK: landed prefix plus
// 'unknown' resolves 'partial' and the remainder is aborted - the durable
// state matches exactly the landed prefix.
{
  const { lib, ta, tb } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const qu = new WriteQueue()
  const space = { rev: 0, gen: 1 }
  let n = 0
  const u = {
    entry: (k: string) => qu.run(async () => ({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen })),
    set: (k: string, v: string, expect: { rev: number; gen: number }) =>
      qu.run(async (): Promise<CasOutcome> => {
        n++
        if (expect.rev !== space.rev || expect.gen !== space.gen) return 'conflict'
        if (n === 2) return 'unknown' // dropped before the host wrote
        data.set(k, v)
        space.rev++
        return 'landed'
      })
  }
  const next = updateTrip(updateTrip(lib, 'ta', { name: 'A2' }), 'tb', { name: 'B2' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  // The readback sees the prior value but that does NOT prove the lost
  // write missed (it may commit late) -> honest 'partial', zero resends,
  // the landed prefix preserved and the rest unwritten.
  check('mid-plan unknown reports partial, no resend', outcome === 'partial' && n === 2)
  check('landed prefix durable', tripName(data, ta.id) === 'A2')
  check('unwritten step untouched', tripName(data, tb.id) === 'B')
}

// --- cycle-13 CAS regressions ---------------------------------------------

// Two copies seed the SAME absent key: both read entry -> v:null, both
// issue a conditional create. The second write's stale token conflicts
// (zero effects), its commit returns 'conflict', and only the winner's
// value is durable - no silent double-create.
{
  const { lib } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  const mkCopy = () => ({
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      data.set(k, v)
      space.rev++
      return Promise.resolve('landed')
    }
  })
  const a = mkCopy()
  const b = mkCopy()
  // Both plan an identical 'new record' put with base null (absent key).
  const cA = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const cB = addTrip(lib, { name: 'C-peer', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const okA = await commitLibWrites(a, planLibWrites(lib, cA.lib))
  // B's plan was computed while the key was absent: its token minted AFTER
  // A's write sees A's value, which differs from B's null base on a live
  // record -> honest conflict, the caller replans.
  const okB = await commitLibWrites(b, planLibWrites(lib, cB.lib))
  check('first seed lands', okA === 'applied')
  check('second seed on superseded base conflicts', okB === 'conflict')
  check('winner value durable', JSON.parse(data.get('trip.tc')!).name === 'C')
  check('no frozen-doc overwrite', space.rev >= 2)
}

// ABA: stored value changes A -> B -> A between entry and set. A pure
// rev-token still detects the space moved even though the value matches
// the read - the write conflicts and the step re-reads (bounded).
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  let bounced = false
  s.foreign = async (store, op) => {
    if (op === 'put trip.ta' && !bounced) {
      bounced = true
      store.peerSet('trip.ta', serializeTrip({ ...ta, name: 'ABA-B' }))
      store.peerSet('trip.ta', serializeTrip(ta))
    }
  }
  const next = updateTrip(lib, 'ta', { name: 'A2' })
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('ABA token moved -> conflict resolved by retry', ok === 'applied')
  check('ABA final value is ours', JSON.parse(s.map.get('trip.ta')!).name === 'A2')
  check('ABA needed a second try', s.log.filter((l) => l === 'put trip.ta').length === 2)
}

// Failed READ is never a blank seed: entry() throwing is ambiguous - the
// commit reports 'partial' and writes nothing, so a peer's confirmed value
// is never erased by a read that could not observe it.
{
  const { lib } = mk()
  const s = new Store()
  seed(s, lib)
  s.rejects.set('entry trip.ta', 9)
  const next = updateTrip(lib, 'ta', { name: 'EDIT' })
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('failed read reports partial, never seeds', ok === 'partial')
  check('peer value untouched after failed read', JSON.parse(s.map.get('trip.ta')!).name === 'A')
}

// Admitted write arriving after a peer ACK (reverse direction): B commits
// first, then A's conditional put on the stale token conflicts and the
// step's re-read surfaces B's value -> 'conflict' for replan instead of
// overwriting B.
{
  const { lib, ta } = mk()
  const s = new Store()
  seed(s, lib)
  let peerLanded = false
  s.foreign = async (store, op) => {
    if (op === 'put trip.ta' && !peerLanded) {
      peerLanded = true
      store.peerSet('trip.ta', serializeTrip({ ...ta, name: 'PEER-CONFIRMED' }))
    }
  }
  const next = updateTrip(lib, 'ta', { name: 'OURS' })
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  // The retry's re-read sees PEER-CONFIRMED on a live record whose base
  // was 'A' -> the plan cannot re-derive locally -> honest conflict.
  check('post-ack peer write surfaces conflict', ok === 'conflict')
  check('peer write preserved', JSON.parse(s.map.get('trip.ta')!).name === 'PEER-CONFIRMED')
}

// mergeIndexOrder: peer ids survive the merge at their stored positions,
// confirmed tombs drop, our creates enter, our order applies to our ids.
check(
  'merge keeps peer id at its position',
  mergeIndexOrder(['p1', 'a', 'p2'], ['a', 'b'], new Set()).join(',') === 'p1,a,p2,b'
)
check(
  'merge drops confirmed tombs and keeps peer ids',
  mergeIndexOrder(['a', 'dead', 'p1'], ['b', 'a'], new Set(['dead'])).join(',') === 'b,a,p1'
)
check(
  'merge is a no-op when fresh already equals intent',
  mergeIndexOrder(['a', 'b'], ['a', 'b'], new Set()).join(',') === 'a,b'
)

// --- cycle-14: unproven unknown never re-executes intent -----------------

// The parent's exact interleaving through the REAL replan loop: A's toggle
// resolves 'unknown', B's confirmed notes edit lands before A's readback.
// The readback sees a non-matching value (peer's) -> commit is 'partial',
// and commitWithReplan does NOT re-run the intent: a re-executed toggle
// would reverse it (false instead of true). mutate runs exactly once.
{
  const { lib } = mk()
  const lib2 = addPack(lib, 'ta', 'Passport', 'p1')!.lib
  const data = new Map<string, string>([
    ['index', serializeIndex(lib2.order)],
    ...lib2.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  let mutateCalls = 0
  let dropSet = true
  const io = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      if (dropSet && k === 'trip.ta') {
        dropSet = false
        // Our request lands, then a peer's notes edit ACK lands over it,
        // then our ACK is lost - the readback can only see the peer value.
        data.set(k, v)
        space.rev++
        data.set(k, serializeTrip({ ...lib2.trips.find((t) => t.id === 'ta')!, notes: 'peer notes' }))
        space.rev++
        return Promise.resolve('unknown')
      }
      data.set(k, v)
      space.rev++
      return Promise.resolve('landed')
    }
  }
  const commit = (cur: typeof lib2, next: typeof lib2) => commitLibWrites(io, planLibWrites(cur, next))
  const mutate = (l: typeof lib2) => {
    mutateCalls++
    return togglePack(l, 'ta', 'p1')
  }
  const libNow = () => assembleLibrary(data.get('index') ?? null, recordsOf(data))
  const outcome = await commitWithReplan(() => Promise.resolve(), libNow, mutate, commit)
  check('unknown+peer -> honest partial', outcome === 'partial')
  check('intent executed exactly once', mutateCalls === 1)
  check('peer notes durable', JSON.parse(data.get('trip.ta')!).notes === 'peer notes')
}

// Same interleaving on addPack: re-executing would duplicate the item - a
// single packing add stays single (or honestly unapplied), never two.
{
  const { lib } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  let mutateCalls = 0
  let dropped = true
  const io = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      if (dropped && k === 'trip.ta') {
        dropped = false
        // Our request lands, a peer edit ACKs over it, our ACK is lost -
        // the readback can only observe the peer value.
        data.set(k, v)
        space.rev++
        data.set(k, serializeTrip({ ...lib.trips.find((t) => t.id === 'ta')!, notes: 'peer' }))
        space.rev++
        return Promise.resolve('unknown')
      }
      data.set(k, v)
      space.rev++
      return Promise.resolve('landed')
    }
  }
  const libNow = () => assembleLibrary(data.get('index') ?? null, recordsOf(data))
  const outcome = await commitWithReplan(
    () => Promise.resolve(),
    libNow,
    (l) => {
      mutateCalls++
      return addPack(l, 'ta', 'Charger', 'p9')?.lib
    },
    (cur, next) => commitLibWrites(io, planLibWrites(cur, next))
  )
  const stored = JSON.parse(data.get('trip.ta')!)
  check('add unknown+peer -> partial', outcome === 'partial')
  check('add intent never re-executed', mutateCalls === 1)
  check('stored packing never duplicated', (stored.packing ?? []).length <= 1)
}

// Record+index prefix: record put lands, the index step loses its ACK,
// a peer write lands before the index readback -> 'partial', the landed
// record is durable, the index untouched, and nothing resends.
{
  const { lib } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  let dropped = true
  const io = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      if (dropped && k === 'index') {
        dropped = false
        // The index write lands, then a peer add ACKs over it (its own
        // record + a merged index that keeps our new id), then our ACK is
        // lost - the index readback can only see the peer's index value.
        data.set(k, v)
        space.rev++
        const peerOrder = [...readIndexList(v), 'pd']
        data.set(
          'trip.pd',
          serializeTrip(addTrip(lib, { name: 'P', start: '2026-06-01', end: '2026-06-02' }, 4, 'pd')!.trip)
        )
        space.rev++
        data.set('index', serializeIndex(peerOrder))
        space.rev++
        return Promise.resolve('unknown')
      }
      data.set(k, v)
      space.rev++
      return Promise.resolve('landed')
    }
  }
  const created = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')!
  const libNow = () => assembleLibrary(data.get('index') ?? null, recordsOf(data))
  const outcome = await commitWithReplan(
    () => Promise.resolve(),
    libNow,
    () => created.lib,
    (cur, next) => commitLibWrites(io, planLibWrites(cur, next))
  )
  const storedOrder = readIndexList(data.get('index')!)
  check('index-prefix unknown -> partial', outcome === 'partial')
  check('landed record durable', JSON.parse(data.get('trip.tc')!).name === 'C')
  check('peer index preserved - no clobber', storedOrder.includes('pd') && storedOrder.includes('tc'))
}

// Control 1: unknown whose readback sees the DESIRED value proves the
// write landed -> 'applied', mutate once.
{
  const { lib, ta } = mk()
  const data = new Map<string, string>([
    ['index', serializeIndex(lib.order)],
    ...lib.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  let mutateCalls = 0
  let dropped = true
  const io = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      if (dropped && k === 'trip.ta') {
        dropped = false
        data.set(k, v) // landed, ACK lost
        space.rev++
        return Promise.resolve('unknown')
      }
      data.set(k, v)
      space.rev++
      return Promise.resolve('landed')
    }
  }
  const libNow = () => assembleLibrary(data.get('index') ?? null, recordsOf(data))
  const outcome = await commitWithReplan(
    () => Promise.resolve(),
    libNow,
    (l) => {
      mutateCalls++
      return updateTrip(l, 'ta', { name: 'A2' })
    },
    (cur, next) => commitLibWrites(io, planLibWrites(cur, next))
  )
  check('control: desired readback -> applied', outcome === 'applied')
  check('control: mutate once', mutateCalls === 1)
  check('control: edit durable', tripName(data, ta.id) === 'A2')
}

// Control 2: a provable E_CONFLICT (peer edit between entry read and set)
// DOES replan - the re-derived toggle lands merged onto the peer state.
{
  const { lib } = mk()
  const lib2 = addPack(lib, 'ta', 'Passport', 'p1')!.lib
  const data = new Map<string, string>([
    ['index', serializeIndex(lib2.order)],
    ...lib2.trips.map((t) => [`trip.${t.id}`, serializeTrip(t)] as [string, string])
  ])
  const space = { rev: 0, gen: 1 }
  let mutateCalls = 0
  let bounced = false
  const io = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<CasOutcome> => {
      if (expect.rev !== space.rev || expect.gen !== space.gen) return Promise.resolve('conflict')
      if (!bounced && k === 'trip.ta') {
        bounced = true
        // Peer edit lands first, so OUR token is now stale - but simulate
        // the peer having already landed before our read: write peer value
        // and bump rev, then report conflict on our attempt.
        data.set(k, serializeTrip({ ...lib2.trips.find((t) => t.id === 'ta')!, notes: 'peer notes' }))
        space.rev++
        return Promise.resolve('conflict')
      }
      data.set(k, v)
      space.rev++
      return Promise.resolve('landed')
    }
  }
  const libNow = () => assembleLibrary(data.get('index') ?? null, recordsOf(data))
  const outcome = await commitWithReplan(
    () => Promise.resolve(),
    libNow,
    (l) => {
      mutateCalls++
      return togglePack(l, 'ta', 'p1')
    },
    (cur, next) => commitLibWrites(io, planLibWrites(cur, next))
  )
  const stored = JSON.parse(data.get('trip.ta')!)
  check('control: real conflict replans -> applied', outcome === 'applied')
  check('control: mutate re-derived once', mutateCalls === 2)
  check('control: both intents merged', stored.notes === 'peer notes' && stored.packing[0].done === true)
}

// Single-key conditionalSet: unknown then a non-matching readback throws
// honestly with exactly ONE issued write - peer's value never overwritten
// by a fresh-token resend.
{
  const data = new Map<string, string>([['prefs', '{"v":1,"muted":false}']])
  const space = { rev: 0, gen: 1 }
  let sets = 0
  const fake = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<{ rev: number }> => {
      void v
      sets++
      if (expect.rev !== space.rev || expect.gen !== space.gen)
        throw Object.assign(new Error('stale'), { code: 'E_CONFLICT' })
      // Unknown outcome: never stored - and a peer write lands before the
      // readback, so no read shows our value.
      data.set(k, '{"v":1,"muted":"peer"}' as unknown as string)
      space.rev++
      throw Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })
    },
    del: () => Promise.reject(new Error('unused'))
  }
  let threw = false
  await conditionalSet(fake, 'prefs', '{"v":1,"muted":true}').catch(() => {
    threw = true
  })
  check('single-key unknown non-match -> honest throw', threw)
  check('single-key issued exactly one write', sets === 1)
  check('single-key peer value preserved', data.get('prefs') === '{"v":1,"muted":"peer"}')
}

// Single-key control: unknown whose readback sees our value resolves.
{
  const data = new Map<string, string>([['prefs', 'old']])
  const space = { rev: 0, gen: 1 }
  let sets = 0
  const fake = {
    entry: (k: string) => Promise.resolve({ v: data.get(k) ?? null, rev: space.rev, gen: space.gen }),
    set: (k: string, v: string, expect: { rev: number; gen: number }): Promise<{ rev: number }> => {
      sets++
      if (expect.rev !== space.rev || expect.gen !== space.gen)
        throw Object.assign(new Error('stale'), { code: 'E_CONFLICT' })
      data.set(k, v)
      space.rev++
      throw Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })
    },
    del: () => Promise.reject(new Error('unused'))
  }
  await conditionalSet(fake, 'prefs', 'new')
  check('single-key control: landed-through-unknown', data.get('prefs') === 'new' && sets === 1)
}

console.log(`\nsync: ${passed} passed, ${failed} failed`)
if (failed) throw new Error(`${failed} checks failed`)
