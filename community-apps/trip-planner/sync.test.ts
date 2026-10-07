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
  check('E_GONE refuses -> missed', (await refused('E_GONE')) === 'missed')
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

import { commitLibWrites, type LibStore } from './sync'
import {
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

class Store implements LibStore {
  map = new Map<string, string>()
  // Clean rejections resolve false, like a refused port write. Counts are
  // keyed per op (`put trip.x`), so a record's forward put can be poisoned
  // separately from its tomb write.
  rejects = new Map<string, number>()
  // Ambiguous failures throw, like a transport timeout where the write may
  // still have landed.
  throws = new Map<string, number>()
  delays = new Map<string, number>()
  log: string[] = []
  foreign: ((store: Store, op: string) => Promise<void>) | null = null
  private async op(kind: string, key: string, v?: string) {
    const id = `${kind} ${key}`
    this.log.push(id)
    const d = this.delays.get(key)
    if (d) await new Promise((r) => setTimeout(r, d))
    const left = this.rejects.get(id) ?? 0
    if (left > 0) {
      this.rejects.set(id, left - 1)
      return false
    }
    const t = this.throws.get(id) ?? 0
    if (t > 0) {
      this.throws.set(id, t - 1)
      throw new Error(`ambiguous ${id}`)
    }
    if (kind === 'put') this.map.set(key, v ?? '')
    else this.map.delete(key)
    return true
  }
  async put(k: string, v: string) {
    await this.foreign?.(this, `put ${k}`)
    return this.op('put', k, v)
  }
  async del(k: string) {
    await this.foreign?.(this, `del ${k}`)
    return this.op('del', k)
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
    plan.map((w) => `${w.kind} ${w.key}`).join('|') === 'tomb trip.ta|put index'
  )
  const c = addTrip(lib, { name: 'C', start: '2026-05-01', end: '2026-05-02' }, 3, 'tc')
  const plan2 = planLibWrites(lib, c.lib)
  check(
    'create plan orders record before index',
    plan2.map((w) => `${w.kind} ${w.key}`).join('|') === 'put trip.tc|put index'
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
  check('zero post-commit writes', s.log.filter((l) => l !== 'put index' && l !== 'put trip.ta').length === 0)
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
  const adapter = (delayTombRead: boolean) => {
    const writes = new WriteQueue()
    const log: string[] = []
    return {
      log,
      put: (k: string, v: string) =>
        writes.send(
          async () => {
            data.set(k, v)
            log.push(`put ${k}`)
          },
          () => {}
        ),
      get: async (k: string) => {
        const v = data.get(k) ?? null
        if (delayTombRead && k === `trip.${ta.id}` && isTombValue(v)) {
          capturedTomb = true
          await snapshotReply.promise
        }
        return v
      }
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
    if (op === 'put index') store.map.set('trip.tc', serializeTrip({ ...c.trip, name: 'PEER' }))
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
      store.map.set('trip.ta', serializeTrip({ ...ta, name: 'RESTORED' }))
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
      store.map.set('trip.ta', serializeTrip({ ...ta, name: 'PEER' }))
    }
  }
  const ok = await commitLibWrites(s, planLibWrites(lib, next))
  check('abort after landed prefix reports partial', ok === 'partial')
  check('peer edit on landed key preserved', JSON.parse(s.map.get('trip.ta')!).name === 'PEER')
  check('landed key written exactly once - no stale re-put', s.log.filter((l) => l === 'put trip.ta').length === 1)
  check('commit issued no reads', !s.log.some((l) => l.startsWith('get ')))
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
    if (op === 'put trip.tb') store.map.set('trip.ta', serializeTrip({ ...ta, name: 'PEER' }))
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
  let aPuts = 0
  const failedA = Promise.withResolvers<void>()
  const a = {
    put: (k: string, v: string) =>
      qa.send(
        async () => {
          aPuts++
          data.set(k, v)
          if (aPuts === 1) throw new Error('ACK lost after durable set')
        },
        () => failedA.resolve()
      )
  }
  const b = {
    put: (k: string, v: string) =>
      qb.send(
        async () => void data.set(k, v),
        () => {}
      )
  }
  const nextA = updateTrip(lib, 'ta', { name: 'A accepted edit' })
  const receiptA = commitLibWrites(a, planLibWrites(lib, nextA))
  await failedA.promise
  // B reads durable state and commits a confirmed edit while A's outcome
  // is still resolving.
  const beforeB = assembleLibrary(data.get('index') ?? null, records())
  const nextB = updateTrip(beforeB, 'ta', { name: 'B confirmed edit' })
  const receiptB = await commitLibWrites(b, planLibWrites(beforeB, nextB))
  const resultA = await receiptA
  const final = assembleLibrary(data.get('index') ?? null, records())
  check('peer durable before A resolves', tripName(data, ta.id) === 'B confirmed edit')
  check('A never re-sent the stale payload', aPuts === 1)
  check('ambiguous write reports partial not applied', resultA === 'partial')
  check('peer edit confirmed applied', receiptB === 'applied')
  check('peer edit preserved after A settles', tripName(data, ta.id) === 'B confirmed edit')
  check('assembler agrees', final.trips.find((t) => t.id === 'ta')?.name === 'B confirmed edit')
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
  let puts = 0
  const u = {
    put: (k: string, v: string) =>
      qu.send(
        async () => {
          puts++
          data.set(k, v)
          throw Object.assign(new Error('ACK lost after durable set'), { code: 'E_TIMEOUT' })
        },
        () => {}
      )
  }
  const next = updateTrip(lib, 'ta', { name: 'Unknown-but-durable edit' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  check('one put despite repeated-attempt hazard', puts === 1)
  check('landing-with-lost-ack reports partial', outcome === 'partial')
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
  let puts = 0
  const u = {
    put: (k: string, v: string) =>
      qu.send(
        async () => {
          puts++
          throw Object.assign(new Error('request dropped before write'), { code: 'E_TIMEOUT' })
        },
        () => {}
      )
  }
  const next = updateTrip(lib, 'ta', { name: 'Dropped edit' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  check('pre-write drop also reports partial', outcome === 'partial')
  check('no second request after ambiguous drop', puts === 1)
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
  let n = 0
  const u = {
    put: (k: string, v: string) =>
      qu.send(
        async () => {
          n++
          if (n === 2) throw new Error('ACK lost mid-plan')
          data.set(k, v)
        },
        () => {}
      )
  }
  const next = updateTrip(updateTrip(lib, 'ta', { name: 'A2' }), 'tb', { name: 'B2' })
  const outcome = await commitLibWrites(u, planLibWrites(lib, next))
  check('mid-plan ambiguous step stops the commit', outcome === 'partial' && n === 2)
  check('landed prefix durable', tripName(data, ta.id) === 'A2')
  check('index never written after ambiguous step', JSON.parse(data.get('index')!).order.join(',') === 'ta,tb')
}

console.log(`\nsync: ${passed} passed, ${failed} failed`)
if (failed) throw new Error(`${failed} checks failed`)
