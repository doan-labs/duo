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
//    backing cell. A delayed successful set lands LAST over a peer commit and
//    destroys it, and no re-read can reveal the loss - the peer data is
//    already gone. Convergence is what repair() provides: every stored change
//    fires it on both copies, and each copy re-offers its own committed union
//    until the stored value carries it.
import { admitSeed, LIB_KEY, type LibKV, LibStore, readLib, seedDoc } from './library.ts'
import {
  isDeadIncarnation,
  type Library,
  latestDoc,
  newPlan,
  type PlanDoc,
  parseLibrary,
  serializeLibrary,
  type Tomb,
  welcomePlan,
  withDoc,
  withoutDoc
} from './plan.ts'

const fakeKV = (impl: {
  get?: (key: string) => Promise<string | null>
  set?: (key: string, value: string) => Promise<{ rev: number }>
}): LibKV => ({
  get: impl.get ?? (() => Promise.resolve(null)),
  set: impl.set ?? (() => Promise.resolve({ rev: 0 }))
})

const lib = (plans: Record<string, PlanDoc> = {}, gone: Record<string, Tomb> = {}, rev = 1): Library => ({
  plans,
  gone,
  rev
})

// One backing cell with a change feed: every landed set fires the watchers,
// which stand in for the useKV mirror that drives LibStore.repair() in the app.
const cell = (initial: Library) => {
  let stored = serializeLibrary(initial)
  const listeners: (() => void)[] = []
  const kv = (gate?: () => Promise<void>): LibKV => ({
    get: () => Promise.resolve(stored),
    set: async (_k, v) => {
      await gate?.()
      stored = v
      // The mirror fires on every landed change, not just once.
      for (const f of listeners) f()
      return { rev: 0 }
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
// between a copy's get and its delayed successful set.
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
    // True once the gated copy has reached its set call - its get already ran.
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

// Parent probe duo-room46-success-race-probe.ts, replayed on the real adapter:
// a foreign commit lands after this copy's get and before its delayed
// successful set. The delayed blob still lands last, so the peer write is
// destroyed in storage; the convergence contract is that the change feed
// fires repair() and the clobbered copy re-offers its union until storage
// carries it.
await check('a delayed successful set that lands over a foreign add is repaired to the union', async () => {
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
  // A's stale blob destroyed B's commit; without repair the loss is invisible
  // to every reader. Drive quiescence and demand the union.
  await settle([storeA, storeB])
  const final = c.now()
  ok(final.plans.peer !== undefined, 'peerPlanSurvived: peer plan restored after clobber')
  ok(final.plans.mine !== undefined, 'own plan survived')
  ok(final.plans.original !== undefined, 'untouched plan survived')
})

await check('a delayed successful set that lands over a foreign delete restores the tombstone', async () => {
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
  ok(final.gone.original !== undefined, 'peerTombstoneSurvived: delete restored after clobber')
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
    get: () => c.kv().get(LIB_KEY),
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

await check('a single copy cannot self-restore a clobbered peer write', async () => {
  // Negative control for the probe schedule: the peer commit inside the
  // delayed set is invisible to every later read, so convergence CANNOT come
  // from this copy alone - it needs the peer's own union re-offer. This is
  // the failure the probe reported at 46e374a.
  const peer = docAt('Peer', 'peer', 3)
  const mine = docAt('Mine', 'mine', 2)
  const c = cell(lib({}, {}, 1))
  const gate = once()
  const store = new LibStore(c.kv(gate.gate))
  const p = store.write((l) => withDoc(l, mine))
  while (!gate.entered()) await new Promise((r) => setTimeout(r, 0))
  // Peer lands while A waits on its set; then A's stale blob lands last.
  await c.kv().set(LIB_KEY, serializeLibrary(withDoc(lib({}, {}, 1), peer)))
  gate.release()
  const res = await p
  if (!res) throw new Error('terminal reached')
  ok(c.now().plans.peer === undefined, 'single-copy storage cannot self-restore a clobbered peer')
  ok(res.lib.plans.mine !== undefined, 'own write survived')
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
