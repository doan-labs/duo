// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny async runner below: `bun library.test.ts` directly, and
// `bun test` too (a failing check throws while the file is evaluated, which
// the runner reports as a failure).
//
// The KV stub makes reads and writes fail and resolve in a controlled order so
// the persistence queue's failure paths are exercised end to end: a failed
// read must stay 'unknown' (never an implied-empty library), a failed write
// must reach a null terminal instead of an empty-success shape or a hang, and
// the queue must not wedge later writes after either.
import { admitSeed, LIB_KEY, type LibKV, readLib, seedDoc, writeLib } from './library.ts'
import {
  type Library,
  latestDoc,
  newPlan,
  type PlanDoc,
  parseLibrary,
  serializeLibrary,
  welcomePlan,
  withDoc
} from './plan.ts'

const fakeKV = (impl: {
  get?: (key: string) => Promise<string | null>
  set?: (key: string, value: string) => Promise<{ rev: number }>
}): LibKV => ({
  get: impl.get ?? (() => Promise.resolve(null)),
  set: impl.set ?? (() => Promise.resolve({ rev: 0 }))
})

const lib = (plans: Record<string, PlanDoc> = {}, gone: Record<string, number> = {}, rev = 1): Library => ({
  plans,
  gone,
  rev
})

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
  // Read 1 fails: 'retry', not a fabricated welcome doc to overwrite the real one.
  eq(admitSeed(await readLib(kv), false), 'retry')
  // Read 2 sees the real library: the stored edited doc is what opens.
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
  // Same storage, same sequence, fixed admission: the next read finds the
  // real edited doc and it is what opens.
  const open = admitSeed(await readLib(kv), false)
  if (open === 'retry' || !open) throw new Error('expected the stored doc')
  eq(open.updated, 1)
})

await check('regression: the pre-fix write resolved an empty library on failure', async () => {
  const kv = fakeKV({ get: () => Promise.reject(new Error('E_IO')) })
  // Old loop verbatim from main.tsx@68b5ef4: `out` starts as a fresh empty
  // library, so an all-fail write still resolves an empty-success shape a
  // caller (dropPlan) treats as the real library.
  const oldOut = await (async () => {
    let out = parseLibrary(null)
    for (let i = 0; i < 5; i++) {
      const cur = await readLib(kv)
      if (!cur) continue
      out = cur
    }
    return out
  })()
  eq(Object.keys(oldOut.plans), [])
  // New contract: the same failure reports null instead.
  eq(await writeLib(kv, () => null), null)
})

await check('a failed bootstrap read returns the edited welcome, not a fresher fake', async () => {
  // The pre-fix path built welcomePlan() with Date.now() on a failed read; its
  // newer `updated` then beat the real stored welcome at the merge guard. The
  // admission path must never reach seedDoc without a confirmed library.
  const edited = { ...welcomePlan(), updated: 1 }
  const kv = fakeKV({ get: () => Promise.resolve(serializeLibrary(lib({ [edited.id]: edited }, {}, 2))) })
  const open = admitSeed(await readLib(kv), false)
  if (open === 'retry' || !open) throw new Error('expected the stored doc')
  eq(open.updated, 1)
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
  const out = await writeLib(kv, (l) => withDoc(l, newPlan('X')))
  eq(out, null)
  eq(sets, 0)
})

await check('a failed set does not wedge the queue or hang the caller', async () => {
  let stored = serializeLibrary(lib())
  let sets = 0
  const kv = fakeKV({
    get: () => Promise.resolve(stored),
    set: (_k, v) => {
      if (++sets <= 5) return Promise.reject(new Error('E_IO'))
      stored = v
      return Promise.resolve({ rev: 2 })
    }
  })
  // First write exhausts its retries and reports failure.
  eq(await writeLib(kv, (l) => withDoc(l, newPlan('A'))), null)
  // The next queued write reads, applies and lands.
  const plan = newPlan('B')
  const out = await writeLib(kv, (l) => withDoc(l, plan))
  if (!out) throw new Error('the queue wedged behind the failed write')
  eq(out.plans[plan.id]?.id, plan.id)
  eq(Object.keys(parseLibrary(stored).plans), [plan.id])
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
      // A peer commits between our failed set and the re-read it triggers.
      if (reads === 2) stored = lib({ [peer.id]: peer }, {}, 2)
      return Promise.resolve(serializeLibrary(stored))
    },
    set: () => (++sets === 1 ? Promise.reject(new Error('E_IO')) : Promise.resolve({ rev: 3 }))
  })
  const out = await writeLib(kv, (l) => withDoc(l, mine))
  if (!out) throw new Error('the write should have landed on retry')
  eq(Object.keys(out.plans).sort(), [peer.id, mine.id].sort())
})

await check('two cold seeds over an empty library converge to one welcome doc', async () => {
  let stored = serializeLibrary(lib({}, {}, 0))
  let rev = 0
  const kv = fakeKV({
    get: () => Promise.resolve(stored),
    set: (_k, v) => {
      stored = v
      return Promise.resolve({ rev: ++rev })
    }
  })
  await Promise.all([writeLib(kv, (l) => withDoc(l, welcomePlan())), writeLib(kv, (l) => withDoc(l, welcomePlan()))])
  eq(Object.keys(parseLibrary(stored).plans), ['welcome'])
})

await check('a deleted welcome tombstone stops the shared id from resurrecting', () => {
  const open = seedDoc(lib({}, { welcome: 42 }))
  ok(open.id !== 'welcome', 'the seeded doc must not reuse the deleted welcome id')
  const admitted = admitSeed(lib({}, { welcome: 42 }), false)
  if (admitted === 'retry' || !admitted) throw new Error('expected a fresh plan')
  ok(admitted.id !== 'welcome', 'admission must honor the tombstone')
})

await check('a doc already on screen blocks the seed entirely', () => {
  eq(admitSeed(lib(), true), null)
  eq(admitSeed(lib({ welcome: welcomePlan() }), true), null)
})

await check('a no-op mutation resolves the confirmed library', async () => {
  const kv = fakeKV({ get: () => Promise.resolve(serializeLibrary(lib({}, {}, 7))) })
  const out = await writeLib(kv, () => null)
  eq(out?.rev, 7)
})

await check('a throwing mutation resolves null instead of hanging the caller', async () => {
  const kv = fakeKV({ get: () => Promise.resolve(serializeLibrary(lib())) })
  eq(
    await writeLib(kv, () => {
      throw new Error('boom')
    }),
    null
  )
  // And the queue still accepts work after the rejected job.
  const plan = newPlan('C')
  let stored = serializeLibrary(lib())
  const kv2 = fakeKV({
    get: () => Promise.resolve(stored),
    set: (_k, v) => {
      stored = v
      return Promise.resolve({ rev: 1 })
    }
  })
  const out = await writeLib(kv2, (l) => withDoc(l, plan))
  eq(out?.plans[plan.id]?.id, plan.id)
})

await check('readLib distinguishes a failed get from a missing key', async () => {
  eq(await readLib(fakeKV({ get: () => Promise.reject(new Error('E_IO')) })), null)
  const missing = await readLib(fakeKV({ get: () => Promise.resolve(null) }))
  if (!missing) throw new Error('a missing key must parse to an empty library, not a failure')
  eq(missing.rev, 0)
  eq(Object.keys(missing.plans), [])
  const open = admitSeed(missing, false)
  ok(
    open !== 'retry' && open !== null && open.id === 'welcome',
    'a confirmed-empty library seeds the deterministic welcome'
  )
})

await check(`writes address only ${LIB_KEY}`, async () => {
  const touched: string[] = []
  const kv = fakeKV({
    get: () => Promise.resolve(serializeLibrary(lib())),
    set: (k, _v) => {
      touched.push(k)
      return Promise.resolve({ rev: 1 })
    }
  })
  const plan = newPlan('D')
  await writeLib(kv, (l) => withDoc(l, plan))
  eq(touched, [LIB_KEY])
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`library.test.ts: ${passed} checks passed`)
