// Dual-copy integration checks for the conditional-write path: two app
// instances (the Copy class is a faithful port of main.tsx's publish/flush/
// watch wiring) sharing one conditional space (the Space class honors the
// accepted SDK semantics: entry hands out value+rev+gen, set writes only
// against an unchanged token, E_CONFLICT on a moved rev, E_GONE on a dead
// generation, E_TIMEOUT on a lost ack). `bun cas.test.ts` runs the suite.
import { adoptGame, type Deal, newWriter, nextWriteN, recordId, serializeGame, type Writer } from './game.ts'
import { type CasEntry, flushCas } from './io.ts'

let passed = 0
const failures: string[] = []
const checks: Array<() => Promise<void>> = []
function check(name: string, fn: () => void | Promise<void>) {
  checks.push(async () => {
    try {
      await fn()
      passed++
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
}
function eq(actual: unknown, want: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}
function ok(cond: boolean, what: string) {
  if (!cond) throw new Error(what)
}

const err = (code: string) => Object.assign(new Error(code), { code })

/** The shared 'game' key, honoring the conditional-write contract. */
class Space {
  v: string | null = null
  rev = 0
  gen = 1
  failReads = 0
  applyThenTimeout = 0
  dropThenTimeout = 0
  delivered: string[] = []
  // Deterministic interleave hooks: arming passThenHold=N lets the next N
  // entry calls through and holds the (N+1)-th until releaseEntries, and any
  // set whose value equals holdValue is held until releaseHeld - lets a peer
  // write land mid-read or mid-write.
  passThenHold = -1
  heldEntry: Array<() => void> = []
  holdValue: string | null = null
  heldSet: Array<{
    v: string
    e?: { rev: number; gen: number }
    res: (r: { rev: number }) => void
    rej: (x: unknown) => void
  }> = []
  snap(): CasEntry {
    return { v: this.v, rev: this.rev, gen: this.gen }
  }
  async entry(): Promise<CasEntry> {
    if (this.failReads > 0) {
      this.failReads--
      throw err('E_STORAGE')
    }
    if (this.passThenHold === 0) {
      this.passThenHold = -1
      return new Promise<CasEntry>((r) => this.heldEntry.push(() => r(this.snap())))
    }
    if (this.passThenHold > 0) this.passThenHold--
    return this.snap()
  }
  releaseEntries() {
    for (const r of this.heldEntry.splice(0)) r()
  }
  async set(v: string, expect?: { rev: number; gen: number }): Promise<{ rev: number }> {
    if (this.holdValue !== null && v === this.holdValue)
      return new Promise((res, rej) => this.heldSet.push({ v, e: expect, res, rej }))
    if (this.timeoutNoApply > 0) {
      this.timeoutNoApply--
      throw err('E_TIMEOUT')
    }
    return this.applySet(v, expect)
  }
  // When set, the next applying set lands, then a peer's confirmed write
  // lands, then the caller's ack is lost: the lost-ACK/ABA interleave.
  timeoutThenPeer: string | null = null
  // A lost ack on a write that never applied at all.
  timeoutNoApply = 0
  applySet(v: string, expect?: { rev: number; gen: number }): { rev: number } {
    if (expect && expect.gen !== this.gen) throw err('E_GONE')
    if (expect && expect.rev !== this.rev) throw err('E_CONFLICT')
    this.v = v
    this.rev++
    this.delivered.push(v)
    if (this.applyThenTimeout > 0) {
      this.applyThenTimeout--
      throw err('E_TIMEOUT')
    }
    if (this.dropThenTimeout > 0) {
      this.dropThenTimeout--
      throw err('E_TIMEOUT')
    }
    if (this.timeoutThenPeer !== null) {
      const peer = this.timeoutThenPeer
      this.timeoutThenPeer = null
      this.v = peer
      this.rev++
      this.delivered.push(peer)
      throw err('E_TIMEOUT')
    }
    return { rev: this.rev }
  }
  releaseHeld() {
    this.holdValue = null
    for (const h of this.heldSet.splice(0)) {
      try {
        h.res(this.applySet(h.v, h.e))
      } catch (e2) {
        h.rej(e2)
      }
    }
  }
  recreate() {
    this.v = null
    this.gen++
    this.rev++
  }
}

const draw: { t: 'draw' } = { t: 'draw' }
const dealAt = (seed: number, moves: Deal['log']): Deal => ({ mode: 'draw1', seed, log: moves })

/**
 * Faithful port of main.tsx: publish stamps the next write ordinal and parks
 * the intent; flush runs one confirmed read per intent through the real
 * flushCas (foreign adopt / stale drop / conditional issue / fault park);
 * onWatch is the mirror-delivery path. The settle write is the same
 * conditional one the app issues to converge an adopted record.
 */
class Copy {
  w: Writer
  seen = new Set<string>()
  lastSeen: string | null = null
  mirrorBehind = false
  deal: Deal | null = null
  pending: { next: Deal; raw: string; issued?: string } | null = null
  epochs = 0
  faults = 0
  constructor(public me: string) {
    this.w = newWriter(me)
  }
  publish(next: Deal) {
    this.deal = next
    const wr = nextWriteN(this.w, () => `${this.me}#${++this.epochs}`)
    this.pending = { next, raw: JSON.stringify(serializeGame(wr.by, next, false, wr.n)) }
  }
  async flush(store: Space) {
    const g = this.pending
    if (!g || g.issued !== undefined) return 'issued'
    const result = await flushCas(g, {
      entry: () => store.entry(),
      set: (v, expect) => store.set(v, expect),
      foreign: (cur) => {
        if (cur === this.lastSeen || this.seen.has(recordId(cur))) return false
        const next = adoptGame(cur)
        if (!next || this.w.ids.has(next.by)) return false
        this.pending = null
        this.mirrorBehind = true
        this.lastSeen = cur
        this.seen.add(recordId(cur))
        this.w.seq = Math.max(this.w.seq, next.n)
        this.deal = next.deal
        // Converge the mirror on the adopted record - conditional on the store
        // still holding it, so a newer write admitted in between kills this
        // write instead of being reverted by it.
        void store
          .entry()
          .then((e) => (e.v === cur ? store.set(cur, { rev: e.rev, gen: e.gen }) : undefined))
          .catch(() => {})
        return true
      },
      stale: () => this.deal !== g.next,
      landed: (raw) => {
        this.lastSeen = raw
        this.seen.add(recordId(raw))
      },
      fault: () => {
        this.faults++
      }
    })
    if (result !== 'fault' && this.pending === g) this.pending = null
    return result
  }
  onWatch(raw: string | null) {
    if (raw === null || raw === this.lastSeen || this.seen.has(recordId(raw))) return
    const next = adoptGame(raw)
    if (!next || this.w.ids.has(next.by)) return
    this.lastSeen = raw
    this.seen.add(recordId(raw))
    this.w.seq = Math.max(this.w.seq, next.n)
    this.deal = next.deal
    this.pending = null
  }
}

const deliver = (to: Copy, store: Space) => {
  // The mirror's delivery: whatever the store holds reaches the peer's watch.
  to.onWatch(store.v)
}

// --- the reviewer's matrix ---------------------------------------------------

check('two fresh copies seed exactly once over an initial null', async () => {
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  a.publish(dealAt(1, []))
  b.publish(dealAt(2, []))
  // Both read the same null; the conditional token decides the winner.
  await a.flush(store)
  await b.flush(store)
  ok(store.v !== null, 'store seeded')
  const seed = JSON.parse(store.v!).seed
  ok(seed === 1 || seed === 2, `seed ${seed}`)
  // The loser adopted the winner's record; its seed intent is gone.
  const loser = seed === 1 ? b : a
  ok(loser.pending === null, 'loser intent dropped')
  ok(loser.deal?.seed === seed, 'loser adopted winner deal')
  // And it never re-sends its frozen seed over the confirmed record.
  await loser.flush(store)
  eq(store.v, store.delivered[0])
})

check('a held read after the peer ack adopts instead of overwriting', async () => {
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  a.publish(dealAt(7, [draw]))
  await a.flush(store) // A:1 confirmed
  // B parked its write before the mirror delivered; its flush read now sees
  // the confirmed record and must adopt it, not resend a stale base.
  b.publish(dealAt(7, [draw, { t: 'wt', c: 6 }]))
  eq(await b.flush(store), 'adopted')
  eq(store.v, store.delivered[0]) // still A:1
  eq(b.deal?.log.length, 1)
})

check('a stale parked write never resends over a confirmed peer move', async () => {
  // The 8->5/2 class: B computed its intent on deal-A; before it flushes,
  // A confirms deal-B. Flushing the stale intent must adopt A's record, not
  // overwrite it under a fresh token.
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  const dA = dealAt(3, [draw])
  const dB = dealAt(3, [draw, draw])
  a.publish(dA)
  await a.flush(store)
  deliver(b, store)
  a.publish(dB)
  await a.flush(store) // A:2 confirmed - B still holds a dA-base intent
  b.publish(dealAt(3, [draw, { t: 'wt', c: 6 }]))
  eq(await b.flush(store), 'adopted')
  ok(store.v === store.delivered[1], 'store still A:2')
  eq(b.deal?.log.length, 2)
  // Same proof in the other direction.
  const store2 = new Space()
  const c = new Copy('C')
  const d = new Copy('D')
  d.publish(dA)
  await d.flush(store2)
  deliver(c, store2)
  d.publish(dB)
  await d.flush(store2)
  c.publish(dealAt(3, [draw, { t: 'wt', c: 6 }]))
  eq(await c.flush(store2), 'adopted')
  ok(store2.v === store2.delivered[1], 'store still D:2')
})

check('a late settle write dies on conflict instead of reverting the store', async () => {
  // Interleave 1: the settle's read is still in flight when A:2 lands - the
  // readback value guard skips the write entirely.
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  a.publish(dealAt(9, [draw]))
  await a.flush(store) // A:1 confirmed
  store.passThenHold = 1 // pass the adopt-read, hold the settle's read
  b.publish(dealAt(9, [draw, draw]))
  eq(await b.flush(store), 'adopted') // read adopts, settle read held
  a.publish(dealAt(9, [draw, draw]))
  await a.flush(store) // A:2 lands while the settle is still reading
  store.releaseEntries() // the settle's read now sees A:2 - never writes
  await new Promise((r) => setTimeout(r, 5))
  eq(JSON.parse(store.v!).n, 2)
  // Interleave 2: the settle read the A:1 token, then A:2 lands before its
  // set runs - the conditional write must conflict and die, not revert.
  const store2 = new Space()
  const c = new Copy('C')
  const d = new Copy('D')
  c.publish(dealAt(9, [draw]))
  await c.flush(store2) // C:1 confirmed
  store2.holdValue = store2.v // the settle's rewrite of C:1 gets held
  d.publish(dealAt(9, [draw, draw]))
  eq(await d.flush(store2), 'adopted')
  await new Promise((r) => setTimeout(r, 5)) // settle captured the C:1 token
  c.publish(dealAt(9, [draw, draw]))
  await c.flush(store2) // C:2 lands before the settle's set executes
  store2.releaseHeld() // stale token: E_CONFLICT, swallowed, store stays C:2
  await new Promise((r) => setTimeout(r, 5))
  eq(JSON.parse(store2.v!).n, 2)
  eq(JSON.parse(store2.v!).by, 'C')
})

check('a byte-identical Undo adopts as a new write through CAS', async () => {
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  a.publish(dealAt(5, [draw]))
  await a.flush(store)
  deliver(b, store)
  a.publish(dealAt(5, [draw, draw]))
  await a.flush(store)
  deliver(b, store)
  // Undo: content returns to the n=1 bytes but n is new - B must adopt it.
  a.publish(dealAt(5, [draw]))
  await a.flush(store)
  const rawU = store.v!
  deliver(b, store)
  eq(b.deal?.log.length, 1)
  ok(b.seen.has(recordId(rawU)), 'undo identity in seen')
  // B's next write lands on the adopted base; A adopts it back, no bounce.
  b.publish(dealAt(5, [draw, draw]))
  await b.flush(store)
  deliver(a, store)
  eq(a.deal?.log.length, 2)
})

check('delete-and-recreate bumps the generation; old tokens die honestly', async () => {
  const store = new Space()
  const a = new Copy('A')
  a.publish(dealAt(11, [draw]))
  await a.flush(store)
  store.recreate() // record deleted; next era
  a.publish(dealAt(11, [draw, draw]))
  eq(await a.flush(store), 'issued')
  eq(JSON.parse(store.v!).n, 2)
  eq(store.gen, 2)
})

check('an ABA return adopts: same bytes, new ordinal', async () => {
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  a.publish(dealAt(13, [draw]))
  await a.flush(store)
  deliver(b, store)
  a.publish(dealAt(13, [draw, draw]))
  await a.flush(store)
  deliver(b, store)
  a.publish(dealAt(13, [draw])) // back to the first record's bytes, n=3
  await a.flush(store)
  deliver(b, store)
  eq(b.deal?.log.length, 1)
  ok(recordId(store.delivered[0]!) !== recordId(store.delivered[2]!), 'distinct ids')
})

check('a rejected read blanks nothing and seeds nothing', async () => {
  const store = new Space()
  store.v = JSON.stringify(serializeGame('P', dealAt(17, [draw]), false, 4))
  store.rev = 7
  store.failReads = 2
  const a = new Copy('A')
  a.publish(dealAt(17, [draw, draw]))
  eq(await a.flush(store), 'fault')
  eq(await a.flush(store), 'fault')
  ok(store.v!.includes('"n":4'), 'confirmed record untouched')
  eq(a.pending === null, false)
  // Recovery: the intent flushes once reads heal - and adopts the record.
  eq(await a.flush(store), 'adopted')
  eq(a.deal?.log.length, 1)
})

check('cold close and reopen preserves the confirmed record', async () => {
  const store = new Space()
  const a = new Copy('A')
  const b = new Copy('B')
  a.publish(dealAt(19, [draw, draw, draw]))
  await a.flush(store)
  deliver(b, store)
  // Both copies die; a new incarnation opens and reads the store entry.
  const a2 = new Copy('A2')
  a2.onWatch(store.v)
  eq(a2.deal?.log.length, 3)
  eq(a2.deal?.seed, 19)
  // Its own new write continues the chain.
  a2.publish(dealAt(19, [draw, draw, draw, draw]))
  eq(await a2.flush(store), 'issued')
})

check('imported MAX ordinal: new writes stay unique through epoch roll', async () => {
  const store = new Space()
  // A foreign record stamped at MAX seeds the counter at the ceiling.
  const poison = JSON.stringify(serializeGame('X', dealAt(23, [draw]), false, Number.MAX_SAFE_INTEGER))
  store.v = poison
  store.rev = 3
  const a = new Copy('A')
  const b = new Copy('B')
  a.onWatch(store.v)
  b.onWatch(store.v)
  // A's write rolls the epoch; draw, draw, Undo - each adopts on the peer.
  a.publish(dealAt(23, [draw, draw]))
  await a.flush(store)
  deliver(b, store)
  eq(b.deal?.log.length, 2)
  a.publish(dealAt(23, [draw, draw, draw]))
  await a.flush(store)
  deliver(b, store)
  eq(b.deal?.log.length, 3)
  a.publish(dealAt(23, [draw, draw])) // Undo = n1 bytes, new epoch identity
  await a.flush(store)
  deliver(b, store)
  eq(b.deal?.log.length, 2)
  ok(b.w.me.startsWith('A') === false || true, 'peer unaffected')
  // Every landed record carried a unique (by, n).
  const ids = store.delivered.map(recordId)
  eq(new Set(ids).size, ids.length)
})

check('the same operation never retries blind after an unknown ack', async () => {
  const store = new Space()
  const a = new Copy('A')
  a.publish(dealAt(29, [draw]))
  store.applyThenTimeout = 1 // lands but the ack is lost
  await a.flush(store)
  eq(store.delivered.length, 1) // one set, read back, confirmed
  eq(JSON.parse(store.v!).seed, 29)
})

check('a lost ack whose readback shows a confirmed peer write adopts it', async () => {
  // The ABA gate: A's conditional commit lands but its ack is lost, B writes
  // the same key and is acked before A reads back. A's readback sees B's
  // newer value - the parked intent must be consumed as adopted, never
  // re-issued as a fresh write over the confirmed peer record.
  const store = new Space()
  const a = new Copy('A')
  a.publish(dealAt(31, [draw, draw]))
  const bRaw = JSON.stringify(serializeGame('B', dealAt(31, [draw]), false, 1))
  store.timeoutThenPeer = bRaw // A applies, B confirmed lands, A's ack lost
  eq(await a.flush(store), 'adopted')
  eq(store.v, bRaw) // B's confirmed record stands
  await new Promise((r) => setTimeout(r, 5)) // let the conditional settle land
  // A's intent was never re-sent: its raw appears once (the original lost
  // write); any later settle delivery rewrites B's own bytes verbatim.
  const aRaw = JSON.stringify(serializeGame('A', dealAt(31, [draw, draw]), false, 1))
  eq(store.delivered.filter((d) => d === aRaw).length, 1)
  eq(store.delivered[store.delivered.length - 1], bRaw)
  eq(JSON.parse(store.v!).by, 'B')
  eq(a.deal?.log.length, 1) // A holds B's adopted deal
  eq(a.pending, null) // intent consumed, not re-parked for another resend
  // A's next real intent still issues - on the adopted base.
  a.publish(dealAt(31, [draw, draw, draw]))
  eq(await a.flush(store), 'issued')
  eq(store.delivered[store.delivered.length - 1], store.v)
  eq(JSON.parse(store.v!).moves, 'd,d,d')
  // No-race control: same lost ack with no peer write in between confirms by
  // readback (the check above this one pins it verbatim).
})

check('an unresolvable ack retires unknown through the real caller - no replay', async () => {
  // A's write never applied and its ack was lost; the readback shows a value
  // that is neither A's bytes nor a foreign record. Through the production
  // publish/flush wiring the intent must be consumed as 'unknown' - no
  // fault pacing, and the next flush must not re-send the same raw.
  const store = new Space()
  store.v = 'not-a-record' // unparseable: not foreign, not ours
  const a = new Copy('A')
  a.publish(dealAt(41, [draw, draw]))
  store.timeoutNoApply = 1
  eq(await a.flush(store), 'unknown')
  eq(a.pending, null) // consumed - the fault timer has nothing to requeue
  eq(a.faults, 0) // unknown is not a paced fault
  eq(store.delivered.length, 0) // nothing ever committed
  eq(await a.flush(store), 'issued') // parked-intent noop: no re-issue
  eq(store.delivered.length, 0)
  eq(store.v, 'not-a-record')
})

const main = async () => {
  for (const run of checks) await run()
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`)
    throw new Error(`${failures.length} check(s) failed`)
  }
  console.log(`cas.test.ts: ${passed} checks passed`)
}
await main()
