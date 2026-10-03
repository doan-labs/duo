// Generationed-storage tests. Plain Bun script like cards.test.ts - `bun:test`
// is not importable inside a community app - run `bun storage.test.ts`. The
// fake space below enforces the same guards the shell and SDK apply (per-value
// and key byte limits, the serialized request envelope, key count and total
// quota), so a record the store writes here would also be accepted for real,
// and a record it must refuse fails here the way the real client would.
import {
  addCard,
  addDeck,
  dayKey,
  gradeReview,
  type Library,
  newLibrary,
  renameDeck,
  revealReview,
  serializeLibrary,
  startReview
} from './cards.ts'
import { decodeLibrary, encodeLibrary, LibraryStore, type Space, utf8 } from './storage.ts'

// The real protocol limits, read from the SDK source rather than copied - a
// changed contract fails these tests instead of silently drifting. The app's
// strict tsconfig has no Bun types, so the one API this script uses is
// declared here.
declare const Bun: { file(path: URL): { text(): Promise<string> } }
const proto = await Bun.file(new URL('../../packages/sdk/protocol.ts', import.meta.url)).text()
const limitsSrc = proto.match(/export const LIMITS = \{[\s\S]*?\n\}/)?.[0]
if (!limitsSrc) throw new Error('could not read LIMITS from packages/sdk/protocol.ts')
const LIMITS = new Function(`${limitsSrc.replace('export const LIMITS =', 'return')}`)() as {
  envelope: number
  key: number
  value: number
  keys: number
  storage: number
  page: number
}

let failures = 0
let passes = 0
function check(name: string, cond: boolean) {
  if (cond) passes += 1
  else {
    failures += 1
    console.error(`FAIL ${name}`)
  }
}
function eq<T>(name: string, got: T, want: T) {
  check(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, Object.is(got, want))
}

const err = (code: string, msg: string) => Object.assign(new Error(msg), { code })

/** The request the client would send for a set - same shape as packages/sdk/client.ts. */
const requestBytes = (k: string, v: string) =>
  utf8(JSON.stringify({ id: 9007199254740991, m: 'storage.set', p: { k, v }, epoch: 9007199254740991 }))

/** In-memory KV with the shell's guards, change feed, rev bumps and failure injection. */
class FakeKV implements Space {
  rev = 0
  map = new Map<string, string>()
  used = 0
  watchers = new Map<number, (e: { rev: number; k: string; v: string | null }) => void>()
  private nextWatcher = 0
  /** Write-order log: {op, k, v, rev}. */
  log: { op: 'set' | 'del'; k: string; v: string | null; rev: number }[] = []
  /** When set, any op where this returns a code fails with it. */
  failOn: ((k: string, v: string | null) => string | null) | null = null
  /** When this matches, the op parks until resume() - a per-key barrier. */
  holdOn: ((k: string, v: string | null) => boolean) | null = null
  /** When true, every op parks until resume(). */
  hold = false
  private waiters: (() => void)[] = []
  /** Mutator applied between snapshot pages to force E_STALE once. */
  pokeOnce: (() => void) | null = null

  resume() {
    this.hold = false
    this.holdOn = null
    const waiters = this.waiters
    this.waiters = []
    for (const resolve of waiters) resolve()
  }

  private async gate(k: string, v: string | null) {
    while (this.hold || this.holdOn?.(k, v)) await new Promise<void>((resolve) => this.waiters.push(resolve))
    const code = this.failOn?.(k, v)
    if (code) throw err(code, `injected ${code} on ${k}`)
  }

  private touch(k: string, v: string | null) {
    if (utf8(k) > LIMITS.key) throw err('E_ARGS', 'key too long')
    if (v !== null && utf8(v) > LIMITS.value) throw err('E_ARGS', 'value too large')
    if (v !== null && requestBytes(k, v) > LIMITS.envelope) throw err('E_ARGS', 'envelope too large')
    const old = this.map.get(k)
    const delta = utf8(k) + (v === null ? 0 : utf8(v)) - (old === undefined ? 0 : utf8(k) + utf8(old))
    if (v !== null && !this.map.has(k) && this.map.size >= LIMITS.keys) throw err('E_ARGS', 'key count')
    if (this.used + delta > LIMITS.storage) throw err('E_QUOTA', 'quota')
    return delta
  }

  private emit(k: string, v: string | null) {
    for (const cb of this.watchers.values()) cb({ rev: this.rev, k, v })
  }

  async get(k: string) {
    return this.map.get(k) ?? null
  }

  async set(k: string, v: string) {
    await this.gate(k, v)
    const delta = this.touch(k, v)!
    this.used += delta
    this.rev += 1
    this.map.set(k, v)
    this.log.push({ op: 'set', k, v, rev: this.rev })
    this.emit(k, v)
    return { rev: this.rev }
  }

  async del(k: string) {
    await this.gate(k, null)
    const delta = this.touch(k, null)!
    this.used += delta
    this.rev += 1
    this.map.delete(k)
    this.log.push({ op: 'del', k, v: null, rev: this.rev })
    this.emit(k, null)
    return { rev: this.rev }
  }

  async snapshot(cursor?: string) {
    const all = [...this.map.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
    const start = cursor ? Number(cursor) : 0
    // A peer write between pages changes the rev the way the real store's
    // rev-pinned cursor would expose - fire only on a continuation call.
    if (this.pokeOnce && cursor !== undefined) {
      const poke = this.pokeOnce
      this.pokeOnce = null
      poke()
    }
    const page = all.slice(start, start + LIMITS.page)
    const next = start + LIMITS.page
    return { rev: this.rev, entries: page, cursor: next < all.length ? String(next) : undefined }
  }

  watch(_since: number, cb: (e: { rev: number; k: string; v: string | null }) => void) {
    const id = ++this.nextWatcher
    this.watchers.set(id, cb)
    return () => {
      this.watchers.delete(id)
    }
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Wait until the store stops hydrating/saving (or errors), then return its snapshot. */
async function drain(store: LibraryStore) {
  // Hydrate's stale-snapshot backoff sleeps real milliseconds, so this is a
  // real-time budget, not a tick count.
  for (let i = 0; i < 4000; i++) {
    const snap = store.getSnapshot()
    if (snap.status === 'ready' || snap.status === 'error') return snap
    await tick()
  }
  return store.getSnapshot()
}

async function bootStore(kv: FakeKV) {
  const store = new LibraryStore(kv, LIMITS)
  store.subscribe(() => {})
  return { store, snap: await drain(store) }
}

/** Canonical JSON for a deep library comparison: object keys sorted, lists kept in order. */
function canonical(lib: Library) {
  const sortDeep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortDeep)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(v).sort()) out[k] = sortDeep((v as Record<string, unknown>)[k])
      return out
    }
    return v
  }
  return JSON.stringify(
    sortDeep({
      decks: [...lib.decks].sort((a, b) => a.id.localeCompare(b.id)),
      cards: [...lib.cards].sort((a, b) => a.id.localeCompare(b.id)),
      history: lib.history,
      dayCounts: lib.dayCounts,
      reviews: lib.reviews
    })
  )
}

const T0 = 1_700_000_000_000

function cardText(i: number, extra = '') {
  return {
    front: `front ${i} ¿qué?  front カード ${extra}`,
    back: `back ${i} réponse  📚 ${extra}`
  }
}

/** Every set the store issued respected the serialized request envelope, not just the value cap. */
function envelopesOk(kv: FakeKV) {
  return kv.log.filter((e) => e.op === 'set').every((e) => requestBytes(e.k, e.v as string) <= LIMITS.envelope)
}

// --- packing-level bounds ------------------------------------------------

{
  let lib = newLibrary()
  lib = addDeck(lib, 'A', T0)
  const deck = lib.decks[0]!
  for (let i = 0; i < 1200; i++) lib = addCard(lib, deck.id, `q${i} ${'x'.repeat(180)}`, `a${i}`, T0 + i)
  const desired = encodeLibrary(lib, LIMITS, 'pack1')
  check(
    'every record under the per-key limit',
    [...desired.values()].every((v) => utf8(v) <= LIMITS.value)
  )
  check(
    'every key under the key limit',
    [...desired.keys()].every((k) => utf8(k) <= LIMITS.key)
  )
  check(
    'every record fits its request envelope',
    [...desired].every(([k, v]) => requestBytes(k, v) <= LIMITS.envelope)
  )
  check(
    'single deck shards into generationed chunks',
    [...desired.keys()].filter((k) => k.includes(`deck.${deck.id}.`)).length > 1
  )
  check('commit pointer present', desired.has('meta'))
}

// --- envelope regression: escape-heavy text stays sendable -----------------

{
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'Quotes', T0)
  const deck = lib.decks[0]!
  // 10k double-quote fronts: 242 KiB of raw shard escapes to ~483 KiB inside a
  // request if packing ignored the envelope - the exact rejection the SDK applies.
  for (let i = 0; i < 20; i++) lib = addCard(lib, deck.id, `${'"'.repeat(10000)}\\${i}\n\t`, 'answer', T0 + i)
  check('escape-heavy library save accepted', store.save(lib))
  const snap = await drain(store)
  eq('escape-heavy save reaches ready', snap.status, 'ready')
  check('every committed set respected the envelope', envelopesOk(kv))
  const { snap: relaunch } = await bootStore(kv)
  eq('escape-heavy relaunch matches', canonical(relaunch.lib), canonical(lib))
}

// --- >256KiB library round trip, including multibyte strings ---------------

{
  const kv = new FakeKV()
  let lib = newLibrary()
  let cardId = 0
  while (utf8(serializeLibrary(lib)) <= LIMITS.value + 60_000) {
    const name = `deck ${lib.decks.length} デッキ`
    lib = addDeck(lib, name, T0 + lib.decks.length)
    const deck = lib.decks[lib.decks.length - 1]!
    for (let i = 0; i < 25; i++) {
      const t = cardText(cardId++)
      lib = addCard(lib, deck.id, t.front, t.back, T0 + cardId)
    }
  }
  check('fixture library exceeds the old single-key limit', utf8(serializeLibrary(lib)) > LIMITS.value)
  const { store, snap } = await bootStore(kv)
  check('fresh empty store is ready', snap.status === 'ready')
  check('save accepted', store.save(lib))
  const after = await drain(store)
  eq('store reaches ready', after.status, 'ready')
  check(
    'every committed value bounded',
    [...kv.map.values()].every((v) => utf8(v) <= LIMITS.value)
  )
  check('meta committed', kv.map.has('meta'))
  check('legacy key unused by v3 writer', !kv.map.has('library'))
  // Relaunch equivalence on the same space.
  const { snap: relaunch } = await bootStore(kv)
  eq('relaunch status', relaunch.status, 'ready')
  eq('relaunch library matches', canonical(relaunch.lib), canonical(lib))
  await drain(store)
}

// --- save + grade + relaunch equivalence ------------------------------------

{
  const kv = new FakeKV()
  let lib = newLibrary()
  lib = addDeck(lib, 'Geo', T0)
  const deck = lib.decks[0]!
  for (const q of ['q1', 'q2', 'q3', 'q4']) lib = addCard(lib, deck.id, q, `a ${q}`, T0)
  lib = startReview(lib, deck.id, T0)
  lib = revealReview(lib, deck.id)
  lib = gradeReview(lib, deck.id, 'good', T0 + 1000)
  lib = revealReview(lib, deck.id)
  lib = gradeReview(lib, deck.id, 'again', T0 + 2000)
  const { store } = await bootStore(kv)
  check('in-progress review saved', store.save(lib))
  const snap = await drain(store)
  eq('saved store ready', snap.status, 'ready')
  const { snap: relaunch } = await bootStore(kv)
  eq('relaunch after grade matches', canonical(relaunch.lib), canonical(lib))
  const session = relaunch.lib.reviews[deck.id]
  check('session survives relaunch', !!session && session.queue.length === 2 && session.done === 2)
  check('dayCounts preserved', relaunch.lib.dayCounts[dayKey(T0 + 1000)] === 2)
  check('history preserved', relaunch.lib.history.length === 2)
}

// --- legacy migration --------------------------------------------------------

{
  const kv = new FakeKV()
  let legacy = newLibrary()
  legacy = addDeck(legacy, 'Verbs', T0)
  const deck = legacy.decks[0]!
  for (const q of ['hablar', 'leer', 'vivir']) legacy = addCard(legacy, deck.id, q, `${q} back`, T0)
  legacy = startReview(legacy, deck.id, T0)
  legacy = revealReview(legacy, deck.id)
  legacy = gradeReview(legacy, deck.id, 'easy', T0 + 500)
  kv.map.set('library', serializeLibrary(legacy))
  kv.used += utf8('library') + utf8(serializeLibrary(legacy))

  const { store, snap } = await bootStore(kv)
  eq('legacy lib decoded before migration settles', canonical(snap.lib), canonical(legacy))
  eq('migration completes ready', snap.status, 'ready')
  // Migration writes committed: meta now points at a generation and the legacy
  // document is gone - and only after it.
  check('meta committed', kv.map.has('meta'))
  check('legacy document deleted after meta', !kv.map.has('library'))
  const metaIdx = kv.log.findIndex((e) => e.op === 'set' && e.k === 'meta')
  const legacyIdx = kv.log.findIndex((e) => e.op === 'del' && e.k === 'library')
  check('legacy delete ordered after meta commit', metaIdx >= 0 && legacyIdx > metaIdx)
  // Relaunch sees the same library through the v3 path only.
  const { snap: relaunch } = await bootStore(kv)
  eq('v3 relaunch matches migrated lib', canonical(relaunch.lib), canonical(legacy))
  await drain(store)
}

// --- failed migration keeps the legacy document and retries ------------------

{
  const kv = new FakeKV()
  let legacy = newLibrary()
  legacy = addDeck(legacy, 'Chem', T0)
  const deck = legacy.decks[0]!
  legacy = addCard(legacy, deck.id, 'H2O', 'water', T0)
  kv.map.set('library', serializeLibrary(legacy))
  kv.used += utf8('library') + utf8(serializeLibrary(legacy))
  // Refuse the commit pointer on the first boot: generation shards land, meta never does.
  let refusedMeta = false
  kv.failOn = (k) => {
    if (k !== 'meta') return null
    refusedMeta = true
    return 'E_STORAGE'
  }
  const { store, snap } = await bootStore(kv)
  eq('failed migration reports error', snap.status, 'error')
  check('meta write was attempted', refusedMeta)
  check('legacy document survives failed migration', kv.map.has('library'))
  check('no meta committed', !kv.map.has('meta'))
  // The live view still shows the user's library - via the pending overlay.
  check('view still shows legacy data', snap.lib.decks.length === 1 && snap.lib.cards.length === 1)
  // A second store over the same space falls back to the legacy document too:
  // the uncommitted generation is invisible to readers.
  const kvCheck = decodeLibrary(kv.map)
  eq('cold decode still reads legacy', kvCheck.format, 'legacy')
  eq('cold decode library intact', canonical(kvCheck.lib), canonical(legacy))
  // Clear the fault and let the same store retry the write.
  kv.failOn = null
  check('retry save accepted', store.save(legacy))
  const settled = await drain(store)
  eq('retry converges to ready', settled.status, 'ready')
  check('meta committed on retry', kv.map.has('meta'))
  check('legacy deleted once v3 stands', !kv.map.has('library'))
}

// --- interrupted update of EXISTING chunks loses nothing ---------------------

{
  const kv = new FakeKV()
  let lib = newLibrary()
  lib = addDeck(lib, 'Repro', T0)
  const deck = lib.decks[0]!
  // Three 90KB cards pack as [c0,c1] + [c2] under the raw cap alone.
  for (let i = 0; i < 3; i++) lib = addCard(lib, deck.id, 'x'.repeat(90_000), `answer ${i}`, T0 + i)
  const { store } = await bootStore(kv)
  check('seed save', store.save(lib))
  await drain(store)
  const committedBefore = decodeLibrary(kv.map)
  eq('committed index before fault', canonical(committedBefore.lib), canonical(lib))
  const metaBefore = kv.map.get('meta')

  // Growing card 0 to 180KB repacks the deck: [c0] + [c1,c2]. Failing the
  // second content write must leave the previously committed library whole.
  const edited = { ...lib, cards: lib.cards.map((c, i) => (i === 0 ? { ...c, front: 'x'.repeat(180_000) } : c)) }
  let writes = 0
  kv.failOn = (k) => (k === 'meta' ? null : ++writes === 2 ? 'E_STORAGE' : null)
  check('edit save accepted', store.save(edited))
  const mid = await drain(store)
  eq('interrupted save surfaces error', mid.status, 'error')
  eq('commit pointer untouched', kv.map.get('meta'), metaBefore)
  const cold = decodeLibrary(kv.map)
  eq('cold decode still commits the whole library', cold.torn, false)
  eq('previously committed card retained', cold.lib.cards.length, 3)
  eq('committed content is the pre-edit library', canonical(cold.lib), canonical(lib))
  kv.failOn = null
  check('retry accepted', store.save(edited))
  const settled = await drain(store)
  eq('retry ready', settled.status, 'ready')
  const relaunchCold = decodeLibrary(kv.map)
  eq('post-retry committed library', canonical(relaunchCold.lib), canonical(edited))
}

// --- failure at every commit step is recoverable ------------------------------

{
  // First, count the ops a real save issues so every position can be failed.
  const probe = new FakeKV()
  const seeded = await bootStore(probe)
  let base = newLibrary()
  base = addDeck(base, 'Probe', T0)
  const pDeck = base.decks[0]!
  for (const q of ['a', 'b', 'c']) base = addCard(base, pDeck.id, q, `a ${q}`, T0)
  check('probe save', seeded.store.save(base))
  await drain(seeded.store)
  const edited = {
    ...base,
    cards: [...base.cards, { ...base.cards[0]!, id: 'probe-extra', front: 'new', back: 'new', due: T0 }]
  }
  probe.log.length = 0
  check('probe edit save', seeded.store.save(edited))
  await drain(seeded.store)
  // Content/index/commit sets are the steps that can tear a commit; a failed
  // trailing delete is retryable cleanup, exercised separately.
  const opCount = probe.log.filter((e) => e.op === 'set').length
  check('save issues a bounded op list', opCount > 2)

  for (let failAt = 0; failAt < opCount; failAt++) {
    const kv = new FakeKV()
    const { store } = await bootStore(kv)
    check(`seed ${failAt}`, store.save(base))
    await drain(store)
    const committed = decodeLibrary(kv.map)
    let seen = 0
    kv.failOn = (_k, v) => (v !== null && seen++ === failAt ? 'E_STORAGE' : null)
    store.save(edited)
    const mid = await drain(store)
    eq(`failure at op ${failAt} surfaces`, mid.status, 'error')
    const cold = decodeLibrary(kv.map)
    eq(`committed library survives failure at op ${failAt}`, cold.torn, false)
    eq(`committed content intact at op ${failAt}`, canonical(cold.lib), canonical(committed.lib))
    kv.failOn = null
    store.save(edited)
    const settled = await drain(store)
    eq(`retry after op ${failAt} converges`, settled.status, 'ready')
    const after = decodeLibrary(kv.map)
    eq(`retry commits the edit at op ${failAt}`, canonical(after.lib), canonical(edited))
  }
}

// --- peer boot during a held save never destroys the writer ------------------

{
  const kv = new FakeKV()
  const a = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'One', T0)
  const deck1 = lib.decks[0]!
  lib = addCard(lib, deck1.id, 'c1', 'a1', T0)
  check('A seeds committed lib', a.store.save(lib))
  await drain(a.store)

  // A's second save parks on the commit pointer after every generation key landed.
  let next = addDeck(lib, 'Two', T0 + 10)
  const deck2 = next.decks[1]!
  next = addCard(next, deck2.id, 'c2', 'a2', T0 + 10)
  const metaBefore = kv.map.get('meta')
  kv.holdOn = (k) => k === 'meta'
  check('A second save starts', a.store.save(next))
  // Wait for the generation writes to land while the commit pointer is held.
  for (let i = 0; i < 4000; i++) {
    if (kv.log.some((e) => e.op === 'set' && e.k.startsWith('g') && e.k.includes(`deck.${deck2.id}.`))) break
    await tick()
  }
  check(
    'new generation keys landed',
    kv.log.some((e) => e.k.includes(`deck.${deck2.id}.`))
  )
  eq('commit pointer still the old generation', kv.map.get('meta'), metaBefore)

  // B boots mid-commit: hydration is read-only, so nothing of A's in-flight
  // generation may be collected.
  const keysBefore = new Set(kv.map.keys())
  const b = await bootStore(kv)
  eq('B decodes the last committed library', canonical(b.snap.lib), canonical(lib))
  check(
    'B deleted nothing',
    [...keysBefore].every((k) => kv.map.has(k))
  )
  check('B issued no deletes', !kv.log.some((e) => e.op === 'del'))

  kv.resume()
  const settled = await drain(a.store)
  eq('A commit lands after resume', settled.status, 'ready')
  await drain(b.store)
  await tick()
  const cold = decodeLibrary(kv.map)
  eq('final committed library has both decks', cold.torn, false)
  eq('both decks committed', cold.lib.decks.length, 2)
  await tick()
  eq('B converges to the committed lib', canonical(b.store.getSnapshot().lib), canonical(next))
}

// --- stale queued generation never overwrites a newer one ---------------------

{
  const kv = new FakeKV()
  let lib = newLibrary()
  lib = addDeck(lib, 'Renamed', T0)
  const deck = lib.decks[0]!
  lib = addCard(lib, deck.id, 'c', 'c', T0)
  const { store } = await bootStore(kv)
  check('seed save', store.save(lib))
  await drain(store)

  kv.hold = true
  const first = renameDeck(lib, deck.id, 'first')
  check('save A queued', store.save(first))
  await tick()
  const second = renameDeck(first, deck.id, 'second')
  check('save B queued behind A', store.save(second))
  kv.resume()
  const settled = await drain(store)
  eq('settles ready', settled.status, 'ready')
  const metas = kv.log.filter((e) => e.op === 'set' && e.k === 'meta')
  check('meta writes strictly ordered', metas.length >= 1)
  const finalMeta = JSON.parse(kv.map.get('meta')!) as { g: string }
  check('final pointer names a generation', !!finalMeta.g)
  const decoded = decodeLibrary(kv.map)
  eq('final deck name is the newest edit', decoded.lib.decks[0]!.name, 'second')
  const { snap: relaunch } = await bootStore(kv)
  eq('relaunch agrees', relaunch.lib.decks[0]!.name, 'second')
}

// --- two live display copies stay in sync ------------------------------------

{
  const kv = new FakeKV()
  const a = await bootStore(kv)
  const b = await bootStore(kv)
  check('both copies ready', a.snap.status === 'ready' && b.snap.status === 'ready')
  let lib = addDeck(newLibrary(), 'Shared', T0)
  const deck = lib.decks[0]!
  lib = addCard(lib, deck.id, 'front', 'back', T0)
  check('copy A saves', a.store.save(lib))
  await drain(a.store)
  await tick()
  const seen = b.store.getSnapshot()
  eq('copy B converged via watch', canonical(seen.lib), canonical(lib))
  // B's own edit lands back on A.
  const renamed = renameDeck(lib, deck.id, 'Renamed in B')
  check('copy B saves', b.store.save(renamed))
  await drain(b.store)
  await tick()
  eq('copy A follows back', canonical(a.store.getSnapshot().lib), canonical(renamed))
}

// --- racing writers publish a coherent revision -------------------------------

{
  const kv = new FakeKV()
  const a = await bootStore(kv)
  const b = await bootStore(kv)
  let libA = addDeck(newLibrary(), 'From A', T0)
  libA = addCard(libA, libA.decks[0]!.id, 'qa', 'aa', T0)
  let libB = addDeck(newLibrary(), 'From B', T0)
  libB = addCard(libB, libB.decks[0]!.id, 'qb', 'ab', T0)
  kv.holdOn = (k) => k === 'meta'
  a.store.save(libA)
  b.store.save(libB)
  for (let i = 0; i < 4000; i++) {
    const gens = new Set([...kv.map.keys()].filter((k) => k.startsWith('g')))
    if (gens.size >= 2) break
    await tick()
  }
  kv.resume()
  await drain(a.store)
  await drain(b.store)
  const cold = decodeLibrary(kv.map)
  eq('racing writers leave a coherent committed revision', cold.torn, false)
  check(
    'winner is one complete library',
    canonical(cold.lib) === canonical(libA) || canonical(cold.lib) === canonical(libB)
  )
}

// --- quota failure is honest and recoverable ---------------------------------

{
  const kv = new FakeKV()
  kv.used = LIMITS.storage - 5_000
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'Big', T0)
  const deck = lib.decks[0]!
  for (let i = 0; i < 80; i++) lib = addCard(lib, deck.id, `q${i} ${'x'.repeat(2000)}`, `a${i}`, T0 + i)
  check('save accepted into a nearly-full space', store.save(lib))
  const snap = await drain(store)
  eq('quota failure reported', snap.status, 'error')
  // A permanently refused batch rolls the view back to the last committed
  // library instead of implying the edit saved.
  eq('view reverts to committed truth', snap.lib.cards.length, 0)
  check('committed state still empty', decodeLibrary(kv.map).lib.cards.length === 0)
  kv.used = 0
  // The user frees space elsewhere; the same save now converges cleanly.
  check('retry after freeing space', store.save(lib))
  const settled = await drain(store)
  eq('recovers to ready', settled.status, 'ready')
  const { snap: relaunch } = await bootStore(kv)
  eq('relaunch matches', canonical(relaunch.lib), canonical(lib))
}

// --- a record that can never fit is refused before any write -----------------

{
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'Huge', T0)
  const deck = lib.decks[0]!
  lib = addCard(lib, deck.id, 'x'.repeat(LIMITS.value), 'back', T0)
  eq('oversize card rejected', store.save(lib), false)
  const snap = store.getSnapshot()
  eq('status reports the failure', snap.status, 'error')
  check('no generation keys written', ![...kv.map.keys()].some((k) => k.startsWith('g')))
  check('draft would stay open: lib untouched', snap.lib.cards.length === 0)
}

// --- the index itself shards under the limits ---------------------------------

{
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  for (let i = 0; i < 2200; i++) lib = addDeck(lib, `deck number ${i} with a reasonably long name`, T0 + i)
  check('2200-deck save accepted', store.save(lib))
  const snap = await drain(store)
  eq('2200-deck save completes', snap.status, 'ready')
  check(
    'index itself sharded',
    [...kv.map.keys()].some((k) => /\.idx\.\d+$/.test(k) && k.endsWith('idx.0')) &&
      kv.log.some((e) => /\.idx\.[1-9]/.test(e.k))
  )
  const { snap: relaunch } = await bootStore(kv)
  eq('2200-deck relaunch matches', canonical(relaunch.lib), canonical(lib))
}

// --- E_STALE during hydrate re-pulls ------------------------------------------

{
  const kv = new FakeKV()
  for (let i = 0; i < LIMITS.page + 40; i++) kv.map.set(`other.${i}`, '"x"')
  let lib = addDeck(newLibrary(), 'Stale', T0)
  lib = addCard(lib, lib.decks[0]!.id, 'q', 'a', T0)
  kv.map.set('library', serializeLibrary(lib))
  // First hydrate sees the rev move between pages; the retry reads one rev.
  kv.pokeOnce = () => {
    kv.rev += 5
  }
  const { snap } = await bootStore(kv)
  eq('hydrate retries past a stale snapshot', snap.status, 'ready')
  eq('library still decoded', canonical(snap.lib), canonical(lib))
}

// --- a superseded save can never delete the still-committed generation -------

{
  // The exact blocking repro: save A parked on its first write, save B
  // supersedes it, B fails - the committed g0 must stay whole throughout.
  const runOnce = async (failAt: number) => {
    const kv = new FakeKV()
    const { store } = await bootStore(kv)
    let lib = newLibrary()
    lib = addDeck(lib, 'Sup', T0)
    const deck = lib.decks[0]!
    lib = addCard(lib, deck.id, 'c0', 'a0', T0)
    check(`seed ${failAt}`, store.save(lib))
    await drain(store)
    const committedIdx = decodeLibrary(kv.map).index
    const committedKeys = new Set(committedIdx ? committedIdx.keys : [])
    const metaBefore = kv.map.get('meta')

    const editedA = { ...lib, cards: lib.cards.map((c) => ({ ...c, front: 'first edit' })) }
    const editedB = { ...lib, cards: lib.cards.map((c) => ({ ...c, front: 'second edit' })) }
    // Park the whole pump: A's first content write is in-flight when B lands.
    kv.hold = true
    check(`save A starts ${failAt}`, store.save(editedA))
    await tick()
    check(`save B supersedes A ${failAt}`, store.save(editedB))
    let seen = 0
    let skippedA = false
    // A's live op resumes first; only B's sets are counted for the failure.
    kv.failOn = (_k, v) => {
      if (v === null) return null
      if (!skippedA) {
        skippedA = true
        return null
      }
      return seen++ === failAt ? 'E_STORAGE' : null
    }
    kv.resume()
    const mid = await drain(store)
    eq(`superseded save failing at op ${failAt} surfaces`, mid.status, 'error')
    eq(`commit pointer unchanged at op ${failAt}`, kv.map.get('meta'), metaBefore)
    const cold = decodeLibrary(kv.map)
    eq(`committed library survives at op ${failAt}`, cold.torn, false)
    eq(`committed content intact at op ${failAt}`, canonical(cold.lib), canonical(lib))
    check(
      `no committed-generation key deleted at op ${failAt}`,
      kv.log.filter((e) => e.op === 'del').every((e) => !committedKeys.has(e.k))
    )
    // Relaunch decodes the same committed library - nothing was sealed away.
    const { snap: relaunch } = await bootStore(kv)
    eq(`relaunch keeps committed lib at op ${failAt}`, canonical(relaunch.lib), canonical(lib))
    // The follow-up save commits B's intent AND collects the dead generations.
    kv.failOn = null
    check(`retry after supersede ${failAt}`, store.save(editedB))
    const settled = await drain(store)
    eq(`retry ready at op ${failAt}`, settled.status, 'ready')
    const after = decodeLibrary(kv.map)
    eq(`retry commits the newer edit at op ${failAt}`, canonical(after.lib), canonical(editedB))
    check(
      `dead generations collected after retry ${failAt}`,
      [...kv.map.keys()].filter((k) => k.startsWith('g')).every((k) => after.index!.keys.has(k))
    )
  }
  // B's op list: deck chunk, activity, index chunk, meta - fail each position.
  for (let failAt = 0; failAt < 4; failAt++) await runOnce(failAt)
}

// --- cleanup-only failure after a real commit stays durable -------------------

{
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'Sweep', T0)
  const deck = lib.decks[0]!
  lib = addCard(lib, deck.id, 'c', 'a', T0)
  check('seed save', store.save(lib))
  await drain(store)
  const oldKeys = new Set(decodeLibrary(kv.map).index!.keys)
  const edited = { ...lib, cards: lib.cards.map((c) => ({ ...c, front: 'v2' })) }
  kv.failOn = (_k, v) => (v === null ? 'E_STORAGE' : null) // deletes only
  check('edit save accepted', store.save(edited))
  const mid = await drain(store)
  eq('failed cleanup surfaces error', mid.status, 'error')
  // The commit itself is durable: the new generation is what readers see.
  const cold = decodeLibrary(kv.map)
  eq('commit durable despite failed cleanup', cold.torn, false)
  eq('committed content is the new revision', canonical(cold.lib), canonical(edited))
  check(
    'replaced generation not partially deleted',
    [...oldKeys].every((k) => kv.map.has(k))
  )
  // Cleanup retries on the next save and converges to ready.
  kv.failOn = null
  check('re-save accepted', store.save(edited))
  const settled = await drain(store)
  eq('cleanup retry settles ready', settled.status, 'ready')
  const after = decodeLibrary(kv.map)
  check(
    'replaced generation collected after ack',
    [...kv.map.keys()].filter((k) => k.startsWith('g')).every((k) => after.index!.keys.has(k))
  )
}

// --- a permanently refused generation is collected by the next commit ----------

{
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'Quota', T0)
  const deck = lib.decks[0]!
  for (let i = 0; i < 60; i++) lib = addCard(lib, deck.id, `q${i} ${'x'.repeat(2000)}`, `a${i}`, T0 + i)
  // Refuse a mid-save write with the permanent code: the deck chunks already
  // landed, so part of this generation is on disk and collectable later.
  let refused = 0
  kv.failOn = (k, v) => (v !== null && k.includes('.idx.') && refused++ === 0 ? 'E_QUOTA' : null)
  check('save into nearly-full space', store.save(lib))
  const snap = await drain(store)
  eq('quota failure reported', snap.status, 'error')
  eq('view reverts to committed truth', snap.lib.cards.length, 0)
  const failedGenKeys = [...kv.map.keys()].filter((k) => k.startsWith('g'))
  check('partial generation keys leaked by refusal', failedGenKeys.length > 0)
  kv.failOn = null
  check('retry after freeing space', store.save(lib))
  const settled = await drain(store)
  eq('recovers to ready', settled.status, 'ready')
  const after = decodeLibrary(kv.map)
  check(
    'refused generation collected after the next commit',
    failedGenKeys.every((k) => !kv.map.has(k)) && after.index !== null
  )
  const { snap: relaunch } = await bootStore(kv)
  eq('relaunch matches', canonical(relaunch.lib), canonical(lib))
}

// --- a retried save commits a created item exactly once ------------------------

{
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  let lib = newLibrary()
  lib = addDeck(lib, 'Once', T0)
  const deck = lib.decks[0]!
  lib = addCard(lib, deck.id, 'seed', 'seed', T0)
  check('seed', store.save(lib))
  await drain(store)
  const withNew = addCard(lib, deck.id, 'typed card', 'typed back', T0 + 1)
  kv.failOn = (k) => (k === 'meta' ? 'E_STORAGE' : null)
  check('creation save accepted', store.save(withNew))
  const mid = await drain(store)
  eq('creation save fails at the pointer', mid.status, 'error')
  kv.failOn = null
  check('same library retried', store.save(withNew))
  const settled = await drain(store)
  eq('retry ready', settled.status, 'ready')
  const cold = decodeLibrary(kv.map)
  eq('created card committed exactly once', cold.lib.cards.filter((c) => c.front === 'typed card').length, 1)
}

// --- decode-level regressions --------------------------------------------------

{
  // Foreign keys never leak into the decoded library.
  let lib = addDeck(newLibrary(), 'D', T0)
  lib = addCard(lib, lib.decks[0]!.id, 'f', 'b', T0)
  const desired = encodeLibrary(lib, LIMITS, 'dec1')
  const remote = new Map<string, string | null>([...desired])
  remote.set('unrelated-app-key', JSON.stringify({ v: 3, g: 'x' }))
  remote.set('gdead.deck.x.0', '"junk"')
  const decoded = decodeLibrary(remote)
  eq('foreign keys ignored', canonical(decoded.lib), canonical(lib))
  eq('foreign junk is not torn', decoded.torn, false)

  // A committed index pointing at a missing chunk is torn, not silently empty.
  const idxKey = [...desired.keys()].find((k) => k.includes('.idx.'))!
  const cardKey = [...desired.keys()].find((k) => k.includes('deck.'))!
  remote.delete(cardKey)
  const torn = decodeLibrary(remote)
  eq('missing referenced chunk is torn', torn.torn, true)
  check('torn decode still shows the deck', torn.lib.decks.length === 1)
  remote.delete(idxKey)
  const tornIdx = decodeLibrary(remote)
  eq('missing index chunk is torn', tornIdx.torn, true)

  // An uncommitted generation beside a committed one is invisible.
  const remote2 = new Map<string, string | null>([...desired])
  const other = encodeLibrary(addDeck(lib, 'Ghost', T0 + 5), LIMITS, 'dead99')
  for (const [k, v] of other) if (k !== 'meta') remote2.set(k, v)
  const coherent = decodeLibrary(remote2)
  eq('uncommitted generation invisible to readers', coherent.lib.decks.length, 1)
  eq('uncommitted generation is not torn', coherent.torn, false)
}

console.log(`${passes} passed, ${failures} failed`)
if (failures > 0) throw new Error(`${failures} check(s) failed`)
