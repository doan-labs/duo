// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny async runner below: `bun library.test.ts` directly, and
// `bun test` too (a failing check throws while the file is evaluated, which
// the runner reports as a failure).
//
// Two failure families are covered end to end:
//  - adapter failures: a failed read stays 'unknown' (never an implied-empty
//    library), a failed write reaches a null terminal instead of an
//    empty-success shape or a hang, and one bad drain cannot wedge the next.
//  - copy races: two LibStore instances with independent queues share one
//    backing cell. Every write is conditioned on the space revision it was
//    computed from, so a peer commit that lands between a copy's entry and
//    its set conflicts the write in-place instead of being clobbered: the
//    losing drain re-reads, rebases its intents over the peer's commit and
//    lands the union. repair() remains the belt: every stored change fires
//    it on both copies and each copy re-offers its committed union.
import { PlatformError } from '@doan-labs/duo-sdk/guards.ts'
import { admitSeed, LIB_KEY, type LibKV, LibStore, readLib, seedDoc } from './library.ts'
import {
  isDeadIncarnation,
  type Library,
  latestDoc,
  newPlan,
  type PlanDoc,
  parseLibrary,
  renameDoc,
  serializeLibrary,
  type Tomb,
  welcomePlan,
  withDoc,
  withoutDoc
} from './plan.ts'

const fakeKV = (impl: {
  get?: (key: string) => Promise<string | null>
  entry?: (key: string) => Promise<{ k: string; v: string | null; rev: number; gen: number }>
  set?: (key: string, value: string, expect?: { rev: number; gen: number }) => Promise<{ rev: number }>
  del?: (key: string, expect?: { rev: number; gen: number }) => Promise<{ rev: number }>
}): LibKV => ({
  get: impl.get ?? (() => Promise.resolve(null)),
  // entry defaults to the same read path as get with a fixed token, so
  // get-focused stubs exercise the real drain without extra plumbing.
  entry: impl.entry ?? (async (k) => ({ k, v: await (impl.get ?? (() => Promise.resolve(null)))(k), rev: 0, gen: 1 })),
  set: impl.set ?? (() => Promise.resolve({ rev: 0 })),
  del: impl.del ?? (() => Promise.resolve({ rev: 0 }))
})

const lib = (plans: Record<string, PlanDoc> = {}, gone: Record<string, Tomb> = {}, rev = 1): Library => ({
  plans,
  gone,
  rev
})

// One backing cell with CAS semantics and a change feed: rev counts every
// landed write in the space (not just this key), and a set carrying an
// expect token rejects E_CONFLICT when the space moved since that read -
// the same check the host runs inside its transaction. Every landed set
// fires the watchers, which stand in for the useKV mirror that drives
// LibStore.repair() in the app.
const cell = (initial: Library | null) => {
  let stored: string | null = initial === null ? null : serializeLibrary(initial)
  let rev = 0
  const gen = 1
  const listeners: (() => void)[] = []
  const kv = (gate?: () => Promise<void>): LibKV => ({
    get: () => Promise.resolve(stored),
    entry: (k) => Promise.resolve({ k, v: stored, rev, gen }),
    del: async (_k, expect) => {
      if (expect) {
        if (expect.gen !== gen) throw new PlatformError('E_GONE')
        if (expect.rev !== rev) throw new PlatformError('E_CONFLICT')
      }
      stored = null
      rev++
      for (const f of listeners) f()
      return { rev }
    },
    set: async (_k, v, expect) => {
      // The gate models transit: a peer commit lands while this write is in
      // flight, so by the time the mutation runs the token is already stale.
      await gate?.()
      if (expect) {
        if (expect.gen !== gen) throw new PlatformError('E_GONE')
        if (expect.rev !== rev) throw new PlatformError('E_CONFLICT')
      }
      stored = v
      rev++
      // The mirror fires on every landed change, not just once.
      for (const f of listeners) f()
      return { rev }
    }
  })
  return {
    kv,
    onChange: (fn: () => void) => listeners.push(fn),
    now: () => parseLibrary(stored)
  }
}

const docAt = (name: string, id: string, updated: number): PlanDoc => ({ ...newPlan(name), id, updated })

// A latch that blocks exactly one set call so a peer commit can be scheduled
// between a copy's entry read and its delayed conditional write.
const once = () => {
  let armed = true
  let release!: () => void
  const gate = new Promise<void>((r) => (release = r))
  return {
    gate: async () => {
      if (!armed) return
      armed = false
      await gate
    },
    release: () => release(),
    // True once the gated copy has reached its set call - its entry read
    // already ran, so its expect token is fixed while the gate holds.
    entered: () => !armed
  }
}

// Run the queue until every scheduled drain resolves: the equivalent of the
// app's change feed going quiet after all copies' repairs have settled.
const settle = async (stores: LibStore[], rounds = 8) => {
  for (let i = 0; i < rounds; i++) {
    await Promise.all(stores.map((s) => s.repair()))
    await new Promise((r) => setTimeout(r, 0))
  }
}

let passed = 0
const failures: string[] = []
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
function eq(actual: unknown, want: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}
function ok(cond: boolean, what: string) {
  if (!cond) throw new Error(what)
}

// Parent probe peer-equal-version-probe.ts, replayed on the real exports:
// two edits derived from the same base in the same millisecond both stamp
// updated=1001 (Date.now pinned), so the writes are an equal-version fork.
// 'peer-equal' loses A's ACK while B's equal-version commit lands; 'repair'
// needs no timeout at all - A's cached union used to re-impose over B's
// acknowledged write on the next change event. Version binding must make
// the acknowledged commit strictly outrank every re-offered snapshot.
const equalVersionRace = async (race: 'none' | 'peer-newer' | 'peer-equal' | 'repair-peer-equal') => {
  const realNow = Date.now
  Date.now = () => 1000
  const base = newPlan('Base', 'base')
  const mine = renameDoc(base, 'A version')
  const peer = renameDoc(race === 'peer-newer' ? mine : base, 'B acknowledged version')
  Date.now = realNow
  let wire = serializeLibrary({ rev: 1, plans: { base }, gone: {} })
  let rev = 1
  let peerAck = false
  let inject = race === 'peer-newer' || race === 'peer-equal'
  let writesA = 0
  const makeKV = (writer: 'A' | 'B'): LibKV => ({
    get: async () => wire,
    entry: async (k) => ({ k, v: wire, rev, gen: 1 }),
    del: async () => {
      throw new Error('unused')
    },
    set: async (_k, next, expect) => {
      if (expect?.rev !== rev || expect.gen !== 1) throw new PlatformError('E_CONFLICT')
      wire = next
      rev++
      if (writer === 'A') writesA++
      if (writer === 'A' && inject) {
        inject = false
        const resultB = await storeB.write(intent(peer))
        peerAck = resultB?.confirmed === true
        throw new PlatformError('E_TIMEOUT')
      }
      return { rev }
    }
  })
  const storeA = new LibStore(makeKV('A'))
  const storeB = new LibStore(makeKV('B'))
  // Exact main.tsx saveDoc callback; renameDoc is the production edit helper.
  const intent = (next: PlanDoc) => (lib: Library) => {
    const existing = lib.plans[next.id]
    return !existing || existing.updated <= next.updated ? withDoc(lib, next) : null
  }
  const result = await storeA.write(intent(mine))
  if (race === 'repair-peer-equal') {
    const resultB = await storeB.write(intent(peer))
    peerAck = resultB?.confirmed === true
    await storeA.repair()
  }
  const final = parseLibrary(wire).plans.base!
  return {
    peerAck,
    ownConfirmed: result?.confirmed === true,
    writesA,
    finalName: final.name,
    finalUpdated: final.updated,
    mine,
    peer
  }
}

await check('equal-version fork: controls land the only or strictly-newer write', async () => {
  const none = await equalVersionRace('none')
  eq(none.finalName, none.mine.name)
  eq(none.writesA, 1)
  const newer = await equalVersionRace('peer-newer')
  eq(newer.finalName, newer.peer.name)
  ok(newer.peerAck, 'the strictly-newer peer commit was acknowledged')
})

await check('equal-version fork: lost ACK covered by a peer commit preserves the peer', async () => {
  // Previously A's re-entry folded its captured doc over B's equal-version
  // commit via mergeLib's b-wins-tie, writing 'A version' back on top.
  const r = await equalVersionRace('peer-equal')
  eq(r.finalName, r.peer.name)
  eq(r.finalUpdated, r.mine.updated + 1)
  ok(r.peerAck, 'the peer commit was acknowledged')
  eq(r.writesA, 1)
})

await check('equal-version fork: repair re-offer cannot erase an acknowledged peer', async () => {
  // Both commits fully ACK in order; the losing copy's repair() fold sees
  // the peer's bound version in storage and must decline, not promote its
  // cached union snapshot merely because it re-read a current revision.
  const r = await equalVersionRace('repair-peer-equal')
  eq(r.finalName, r.peer.name)
  ok(r.peerAck && r.ownConfirmed, 'both writes were acknowledged')
  eq(r.writesA, 1)
})

await check('a failed bootstrap read is unknown, never an empty seed', async () => {
  const edited = { ...welcomePlan(), updated: 1000 }
  const stored = serializeLibrary(lib({ [edited.id]: edited }, {}, 3))
  let reads = 0
  const kv = fakeKV({
    get: () => (++reads === 1 ? Promise.reject(new Error('E_IO')) : Promise.resolve(stored))
  })
  eq(admitSeed(await readLib(kv), false), 'retry')
  const open = admitSeed(await readLib(kv), false)
  if (open === 'retry' || !open) throw new Error('expected the stored doc')
  eq(open.id, edited.id)
  eq(open.updated, 1000)
})

await check('regression: the pre-fix seed path would have clobbered the edited welcome', async () => {
  const edited = { ...welcomePlan(), updated: 1 }
  const stored = serializeLibrary(lib({ [edited.id]: edited }, {}, 3))
  let reads = 0
  const kv = fakeKV({
    get: () => (++reads === 1 ? Promise.reject(new Error('E_IO')) : Promise.resolve(stored))
  })
  // Old seed path verbatim from main.tsx@68b5ef4: a failed read folded back
  // into an empty library, then a fresh welcomePlan() whose Date.now() always
  // beats the stored `updated` at the write guard.
  const oldOpen = latestDoc((await readLib(kv)) ?? parseLibrary(null)) ?? welcomePlan()
  ok(oldOpen.updated > 1, 'the pre-fix fallback seed is always newer than the stored doc')
  const open = admitSeed(await readLib(kv), false)
  if (open === 'retry' || !open) throw new Error('expected the stored doc')
  eq(open.updated, 1)
})

await check('a confirmed-empty library admits the deterministic welcome once', async () => {
  const c = cell(lib({}, {}, 0))
  const store = new LibStore(c.kv())
  const open = admitSeed(await readLib(c.kv()), false)
  if (open === 'retry' || !open) throw new Error('expected the welcome doc')
  eq(open.id, 'welcome')
  const wrote = await store.write((l) => withDoc(l, open))
  if (!wrote?.confirmed) throw new Error('the seed write must be confirmed')
  ok(wrote.lib.plans.welcome !== undefined, 'the welcome doc is stored')
})

await check('all reads rejected resolves null, not an empty library', async () => {
  let sets = 0
  const kv = fakeKV({
    get: () => Promise.reject(new Error('E_IO')),
    set: () => {
      sets++
      return Promise.resolve({ rev: 1 })
    }
  })
  const out = await new LibStore(kv).write((l) => withDoc(l, newPlan('X')))
  eq(out, null)
  eq(sets, 0)
})

await check('a failed set does not wedge the queue or hang the caller', async () => {
  let stored = serializeLibrary(lib())
  let sets = 0
  const kv = fakeKV({
    get: () => Promise.resolve(stored),
    set: (_k, v) => {
      if (++sets <= 6) return Promise.reject(new Error('E_IO'))
      stored = v
      return Promise.resolve({ rev: 2 })
    }
  })
  const store = new LibStore(kv)
  const planA = newPlan('A')
  const first = await store.write((l) => withDoc(l, planA))
  ok(first !== null && !first.confirmed, 'exhausted retries report unconfirmed, not null or applied')
  const plan = newPlan('B')
  const out = await store.write((l) => withDoc(l, plan))
  if (!out) throw new Error('the queue wedged behind the failed write')
  // The unconfirmed 'A' intent was still pending: it rides this drain in too.
  eq(Object.keys(parseLibrary(stored).plans).sort(), [planA.id, plan.id].sort())
})

await check('a mutation replayed after a failed set merges over the peer write it reveals', async () => {
  const peer = newPlan('Peer')
  const mine = newPlan('Mine')
  let stored = lib()
  let reads = 0
  let sets = 0
  const kv = fakeKV({
    get: () => {
      reads++
      if (reads === 2) stored = lib({ [peer.id]: peer }, {}, 2)
      return Promise.resolve(serializeLibrary(stored))
    },
    set: () => (++sets === 1 ? Promise.reject(new Error('E_IO')) : Promise.resolve({ rev: 3 }))
  })
  const out = await new LibStore(kv).write((l) => withDoc(l, mine))
  if (!out) throw new Error('the write should have landed on retry')
  eq(Object.keys(out.lib.plans).sort(), [peer.id, mine.id].sort())
})

// Parent probe duo-room46-success-race-probe.ts, replayed on the real
// adapter under CAS: a foreign commit lands after this copy's entry and
// before its delayed set reaches the transaction. The conditional token is
// stale by then, so the write conflicts - the drain re-reads, rebases the
// intent over the peer's commit and lands the union: the peer is never
// destroyed at all. repair() still runs as the change feed fires.
await check('a delayed set conflicting on a foreign add rebases to the union', async () => {
  const original = docAt('Original', 'original', 1)
  const mine = docAt('Mine', 'mine', 2)
  const peer = docAt('Peer', 'peer', 3)
  const c = cell(lib({ original }, {}, 1))
  const gate = once()
  const storeA = new LibStore(c.kv(gate.gate))
  const storeB = new LibStore(c.kv())
  // Each copy's stored-value change fires its repair, as the useKV mirror does.
  c.onChange(() => void storeA.repair())
  c.onChange(() => void storeB.repair())

  const pA = storeA.write((l) => withDoc(l, mine))
  while (!gate.entered()) await new Promise((r) => setTimeout(r, 0))
  // B commits between A's get and A's set; the write is acknowledged.
  const bRes = await storeB.write((l) => withDoc(l, peer))
  ok(bRes?.confirmed === true, 'peer commit acknowledged')
  gate.release()
  const aRes = await pA
  ok(aRes !== null, 'own write landed and reports a terminal value')
  await settle([storeA, storeB])
  const final = c.now()
  ok(final.plans.peer !== undefined, 'peerPlanSurvived: peer never clobbered')
  ok(final.plans.mine !== undefined, 'own plan survived')
  ok(final.plans.original !== undefined, 'untouched plan survived')
})

await check('a delayed set conflicting on a foreign delete keeps the tombstone', async () => {
  const original = docAt('Original', 'original', 1)
  const edited = { ...original, name: 'Edited', updated: 2 }
  const c = cell(lib({ original }, {}, 1))
  const gate = once()
  const storeA = new LibStore(c.kv(gate.gate))
  const storeB = new LibStore(c.kv())
  c.onChange(() => void storeA.repair())
  c.onChange(() => void storeB.repair())

  const pA = storeA.write((l) => withDoc(l, edited))
  while (!gate.entered()) await new Promise((r) => setTimeout(r, 0))
  const bRes = await storeB.write((l) => withoutDoc(l, 'original'))
  ok(bRes?.confirmed === true, 'peer delete acknowledged')
  gate.release()
  await pA
  await settle([storeA, storeB])
  const final = c.now()
  ok(final.gone.original !== undefined, 'peerTombstoneSurvived: delete never lost')
  ok(final.plans.original === undefined, 'deletedOriginalResurrected must stay false')
})

await check('the same races converge when the peer set lands last', async () => {
  const original = docAt('Original', 'original', 1)
  const mine = docAt('Mine', 'mine', 2)
  const peer = docAt('Peer', 'peer', 3)
  const c = cell(lib({ original }, {}, 1))
  const gate = once()
  const storeA = new LibStore(c.kv())
  const storeB = new LibStore(c.kv(gate.gate))
  c.onChange(() => void storeA.repair())
  c.onChange(() => void storeB.repair())

  const pB = storeB.write((l) => withDoc(l, peer))
  while (!gate.entered()) await new Promise((r) => setTimeout(r, 0))
  const aRes = await storeA.write((l) => withDoc(l, mine))
  ok(aRes?.confirmed === true, 'A commit acknowledged')
  gate.release()
  await pB
  await settle([storeA, storeB])
  const final = c.now()
  ok(final.plans.peer !== undefined && final.plans.mine !== undefined, 'both plans survive B-last order')
})

await check('two cold copies racing a seed converge, welcome tombstone respected', async () => {
  // Both copies cold-open a library whose welcome plan was deleted: each
  // seeds a fresh non-welcome doc, their writes race, and union convergence
  // must keep both and keep the tombstone.
  const c = cell(lib({}, { welcome: { ts: 5, born: 5 } }, 2))
  const storeA = new LibStore(c.kv())
  const storeB = new LibStore(c.kv())
  c.onChange(() => void storeA.repair())
  c.onChange(() => void storeB.repair())
  const seedA = seedDoc(lib({}, { welcome: { ts: 5, born: 5 } }))
  const seedB = seedDoc(lib({}, { welcome: { ts: 5, born: 5 } }))
  ok(seedA.id !== 'welcome' && seedB.id !== 'welcome', 'post-tombstone seeds avoid the welcome id')
  await Promise.all([storeA.write((l) => withDoc(l, seedA)), storeB.write((l) => withDoc(l, seedB))])
  await settle([storeA, storeB])
  const final = c.now()
  ok(final.plans[seedA.id] !== undefined && final.plans[seedB.id] !== undefined, 'both cold seeds survive')
  eq(final.gone.welcome, { ts: 5, born: 5 })
})

await check('an unconfirmed seed write is retried until confirmed, never admitted blind', async () => {
  // Bootstrap path: the UI only shows a doc the store confirmed. Reject every
  // set; the loop must come back unconfirmed, not with a screen a reader
  // could mistake for saved.
  const c = cell(lib({}, {}, 0))
  let sets = 0
  const kv: LibKV = {
    ...c.kv(),
    set: (_k, _v) => {
      sets++
      return Promise.reject(new Error('E_IO'))
    }
  }
  const store = new LibStore(kv)
  const wrote = await store.write((l) => withDoc(l, welcomePlan()))
  ok(wrote === null || !wrote.confirmed, 'all-fail sets stay unconfirmed')
  ok(sets > 0, 'the write actually attempted sets')
  eq(Object.keys(c.now().plans), [])
})

await check('a delayed conditional set conflicts instead of clobbering a landed peer', async () => {
  // The pre-CAS failure the parent probe reported at 46e374a: a peer commit
  // landing inside the delayed-set window used to be destroyed by the stale
  // blob landing last. The conditional token makes the same schedule a
  // conflict: A's write is refused by the space, the drain re-reads, rebases
  // and lands the union in the same pass - no repair needed to save B.
  const peer = docAt('Peer', 'peer', 3)
  const mine = docAt('Mine', 'mine', 2)
  const c = cell(lib({}, {}, 1))
  const gate = once()
  const store = new LibStore(c.kv(gate.gate))
  const p = store.write((l) => withDoc(l, mine))
  while (!gate.entered()) await new Promise((r) => setTimeout(r, 0))
  // Peer lands (unconditional: a foreign writer that does not expect) while
  // A's conditional write is still in flight.
  await c.kv().set(LIB_KEY, serializeLibrary(withDoc(lib({}, {}, 1), peer)))
  gate.release()
  const res = await p
  if (!res) throw new Error('terminal reached')
  const final = c.now()
  ok(final.plans.peer !== undefined, 'the conflict kept the peer commit alive at write time')
  ok(final.plans.mine !== undefined, 'the rebased union landed own write')
  ok(res.lib.plans.peer !== undefined && res.lib.plans.mine !== undefined, 'reported union')
})

await check('a timed-out library write covered by a peer same-plan commit keeps the peer union', async () => {
  // The prefs-shaped clobber the parent probe caught, at library level: A's
  // set lands, its ACK is lost (E_TIMEOUT), then B commits a NEWER version
  // of the same plan. A's next pass re-entries, sees B's commit and unions
  // over it - mergeLib keeps B's newer doc, so the union can never replay
  // A's older version back over it. This is why the drain's continue-on-
  // timeout is safe where a fixed-payload retry is not.
  const base = docAt('Base', 'base', 1)
  const mine = { ...base, name: 'A version', updated: 2 }
  const peer = { ...base, name: 'B version', updated: 3 }
  const c = cell(lib({ base }, {}, 1))
  let dropped = false
  const kv = c.kv()
  const kvA: LibKV = {
    ...kv,
    set: async (k, v, expect) => {
      if (!dropped) {
        dropped = true
        // The write lands and ACKs lost; B's newer commit lands after.
        await kv.set(k, v, expect)
        await kv.set(k, serializeLibrary(withDoc(lib({ base }, {}, 1), peer)))
        throw new PlatformError('E_TIMEOUT')
      }
      return kv.set(k, v, expect)
    }
  }
  const storeA = new LibStore(kvA)
  const res = await storeA.write((l) => withDoc(l, mine))
  ok(res !== null, 'drain reached a terminal')
  const final = c.now()
  eq(final.plans.base?.updated, 3)
  eq(final.plans.base?.name, 'B version')
  ok(res === null || res.lib.plans.base?.updated === 3, 'reported library carries the peer version')
})

await check('a timed-out library write that never landed still lands its union on the next pass', async () => {
  // Timeout with no peer: the intent is still pending, the next pass's entry
  // is the readback, and the union re-offers under a fresh token - honest
  // 'unconfirmed' only if the space can never settle.
  const a = docAt('A', 'a', 2)
  const c = cell(lib({}, {}, 1))
  let once = true
  const kv = c.kv()
  const kvA: LibKV = {
    ...kv,
    set: async (k, v, expect) => {
      if (once) {
        once = false
        throw new PlatformError('E_TIMEOUT')
      }
      return kv.set(k, v, expect)
    }
  }
  const storeA = new LibStore(kvA)
  const res = await storeA.write((l) => withDoc(l, a))
  ok(res?.confirmed === true, 'the union re-offer confirmed on the next pass')
  ok(c.now().plans.a !== undefined, 'the intent landed')
})

await check('two writers over a never-created key converge to the union', async () => {
  // Both copies entry() a missing key (v:null) and compute from the same
  // empty base: the first conditional set wins, the second conflicts,
  // re-entries, sees the peer doc and lands the union - the two-null-writer
  // schedule that used to be a coin toss.
  const c = cell(null)
  const a = docAt('A', 'a', 1)
  const b = docAt('B', 'b', 1)
  const storeA = new LibStore(c.kv())
  const storeB = new LibStore(c.kv())
  c.onChange(() => void storeA.repair())
  c.onChange(() => void storeB.repair())
  await Promise.all([storeA.write((l) => withDoc(l, a)), storeB.write((l) => withDoc(l, b))])
  await settle([storeA, storeB])
  const final = c.now()
  ok(final.plans.a !== undefined && final.plans.b !== undefined, 'both initial writes survive')
})

await check('a cold-closed copy leaves committed state readable for the survivor', async () => {
  // Close both copies mid-queue: the intents that never committed are gone
  // with memory (callers saw unconfirmed, honest), but every committed write
  // stays. A fresh LibStore over the same space reads exactly what landed -
  // nothing invents or loses it.
  const open = docAt('Open', 'open', 1)
  const c = cell(lib({ open }, {}, 1))
  const storeA = new LibStore(c.kv())
  const a = docAt('A', 'a', 2)
  const landed = await storeA.write((l) => withDoc(l, a))
  ok(landed?.confirmed === true, 'committed before close')
  // A and B both die here; only the cell survives. A new store sees the
  // committed union and its own intents build on it.
  const storeC = new LibStore(c.kv())
  const b = docAt('B', 'b', 3)
  const out = await storeC.write((l) => withDoc(l, b))
  ok(out?.confirmed === true, 'survivor confirmed')
  const final = c.now()
  ok(
    final.plans.open !== undefined && final.plans.a !== undefined && final.plans.b !== undefined,
    'all committed plans survive cold close'
  )
})

await check('a throwing mutation resolves null and drops nothing else', async () => {
  const c = cell(lib())
  const store = new LibStore(c.kv())
  eq(
    await store.write(() => {
      throw new Error('boom')
    }),
    null
  )
  const plan = newPlan('C')
  const out = await store.write((l) => withDoc(l, plan))
  ok(out?.confirmed === true && out.lib.plans[plan.id] !== undefined, 'queue healthy after a thrown intent')
})

await check('a no-op mutation resolves confirmed with the observed library', async () => {
  const kv = fakeKV({ get: () => Promise.resolve(serializeLibrary(lib({}, {}, 7))) })
  const out = await new LibStore(kv).write(() => null)
  ok(out?.confirmed === true, 'noop is confirmed')
  eq(out?.lib.rev, 7)
})

await check('a doc already on screen blocks the seed entirely', () => {
  eq(admitSeed(lib(), true), null)
  eq(admitSeed(lib({ welcome: welcomePlan() }), true), null)
})

await check('readLib distinguishes a failed get from a missing key', async () => {
  eq(await readLib(fakeKV({ get: () => Promise.reject(new Error('E_IO')) })), null)
  const missing = await readLib(fakeKV({ get: () => Promise.resolve(null) }))
  if (!missing) throw new Error('a missing key must parse to an empty library, not a failure')
  eq(missing.rev, 0)
  eq(Object.keys(missing.plans), [])
  const open = admitSeed(missing, false)
  ok(open !== 'retry' && open !== null && open.id === 'welcome', 'a confirmed-empty library seeds the welcome')
})

await check(`writes address only ${LIB_KEY}`, async () => {
  const touched: string[] = []
  let stored = serializeLibrary(lib())
  const kv = fakeKV({
    get: () => Promise.resolve(stored),
    set: (k, v) => {
      touched.push(k)
      stored = v
      return Promise.resolve({ rev: 1 })
    }
  })
  const plan = newPlan('D')
  await new LibStore(kv).write((l) => withDoc(l, plan))
  eq(touched, [LIB_KEY])
})

await check('a peer still holding the deleted plan converges off the ghost', async () => {
  // Reviewer repro: copy A deletes the plan copy B is editing. B's next
  // publish re-stamps the ghost `updated` higher than any tomb could order
  // against, which used to resurrect the plan. The incarnation bound makes
  // the tomb causal: the ghost is dead no matter its version.
  const open = { ...newPlan('Shared'), id: 'shared', born: 10, updated: 10 }
  const c = cell(lib({ shared: open }, {}, 1))
  const storeA = new LibStore(c.kv())
  const storeB = new LibStore(c.kv())
  c.onChange(() => void storeA.repair())
  c.onChange(() => void storeB.repair())
  const deleted = await storeA.write((l) => withoutDoc(l, 'shared'))
  ok(deleted !== null && deleted.lib.gone.shared !== undefined, 'delete landed')
  // B publishes an edit grown from the pre-delete base: same incarnation,
  // newer stamp. The merge must keep it dead.
  const ghost = { ...open, updated: (deleted!.lib.gone.shared!.ts ?? 0) + 500 }
  await storeB.write((l) => withDoc(l, ghost))
  await settle([storeA, storeB])
  const final = c.now()
  eq(final.plans.shared, undefined)
  ok(isDeadIncarnation(ghost, final.gone), 'B is shown the kill so it can move off the ghost')
  // Only a genuinely new incarnation (a recreation, born after the tomb)
  // may carry this id again.
  const recreation = { ...open, born: final.gone.shared!.born + 1, updated: final.gone.shared!.ts + 1000 }
  await storeB.write((l) => withDoc(l, recreation))
  await settle([storeA, storeB])
  eq(c.now().plans.shared?.born, recreation.born)
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`library.test.ts: ${passed} checks passed`)
