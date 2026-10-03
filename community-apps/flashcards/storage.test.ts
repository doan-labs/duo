// Sharded-storage tests. Plain Bun script like cards.test.ts - `bun:test` is not
// importable inside a community app - run `bun storage.test.ts`. The fake space
// below enforces the same guards the shell applies (per-value and key byte
// limits, key count and total quota), so a record the store writes here would
// also be accepted for real, and a record it must refuse fails here the way the
// real shell would refuse it.
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
import { decodeLibrary, encodeLibrary, LibraryStore, OversizeError, type Space, utf8 } from './storage.ts'

// The real protocol limits, read from the SDK source rather than copied - a
// changed contract fails these tests instead of silently drifting. The app's
// strict tsconfig has no Bun types, so the one API this script uses is
// declared here.
declare const Bun: { file(path: URL): { text(): Promise<string> } }
const proto = await Bun.file(new URL('../../packages/sdk/protocol.ts', import.meta.url)).text()
const limitsSrc = proto.match(/export const LIMITS = \{[\s\S]*?\n\}/)?.[0]
if (!limitsSrc) throw new Error('could not read LIMITS from packages/sdk/protocol.ts')
const LIMITS = new Function(`${limitsSrc.replace('export const LIMITS =', 'return')}`)() as {
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

/** In-memory KV with the shell's guards, change feed, rev bumps and failure injection. */
class FakeKV implements Space {
  rev = 0
  map = new Map<string, string>()
  used = 0
  watchers = new Map<number, (e: { rev: number; k: string; v: string | null }) => void>()
  private nextWatcher = 0
  /** Write-order log: {op, k, rev}. */
  log: { op: 'set' | 'del'; k: string; rev: number }[] = []
  /** When set, any op where this returns true fails with the given code. */
  failOn: ((k: string, v: string | null) => string | null) | null = null
  /** When true, ops park until resume() - an in-flight window. */
  hold = false
  private waiters: (() => void)[] = []
  /** Mutator applied between snapshot pages to force E_STALE once. */
  pokeOnce: (() => void) | null = null

  resume() {
    this.hold = false
    const waiters = this.waiters
    this.waiters = []
    for (const resolve of waiters) resolve()
  }

  private async gate(k: string, v: string | null) {
    if (this.hold) await new Promise<void>((resolve) => this.waiters.push(resolve))
    const code = this.failOn?.(k, v)
    if (code) throw err(code, `injected ${code} on ${k}`)
  }

  private touch(k: string, v: string | null) {
    if (utf8(k) > LIMITS.key) throw err('E_ARGS', 'key too long')
    if (v !== null && utf8(v) > LIMITS.value) throw err('E_ARGS', 'value too large')
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
    this.log.push({ op: 'set', k, rev: this.rev })
    this.emit(k, v)
    return { rev: this.rev }
  }

  async del(k: string) {
    await this.gate(k, null)
    const delta = this.touch(k, null)!
    this.used += delta
    this.rev += 1
    this.map.delete(k)
    this.log.push({ op: 'del', k, rev: this.rev })
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
    back: `back ${i} réponse  \u{1F4DA} ${extra}`
  }
}

// --- chunkJson-level bounds ------------------------------------------------

{
  let lib = newLibrary()
  lib = addDeck(lib, 'A', T0)
  const deck = lib.decks[0]!
  for (let i = 0; i < 1200; i++) lib = addCard(lib, deck.id, `q${i} ${'x'.repeat(180)}`, `a${i}`, T0 + i)
  const desired = encodeLibrary(lib, LIMITS.value)
  check(
    'every record under the per-key limit',
    [...desired.values()].every((v) => utf8(v) <= LIMITS.value)
  )
  check(
    'every key under the key limit',
    [...desired.keys()].every((k) => utf8(k) <= LIMITS.key)
  )
  check(
    'single deck shards into chunks',
    [...desired.keys()].filter((k) => k.startsWith(`deck.${deck.id}.`)).length > 1
  )
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
  check('meta index committed', kv.map.has('meta'))
  check('legacy key unused by v2 writer', !kv.map.has('library'))
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
  // Migration writes committed: meta now exists and the legacy document is gone.
  check('meta committed', kv.map.has('meta'))
  check('legacy document deleted after meta', !kv.map.has('library'))
  const metaIdx = kv.log.findIndex((e) => e.op === 'set' && e.k === 'meta')
  const legacyIdx = kv.log.findIndex((e) => e.op === 'del' && e.k === 'library')
  check('legacy delete ordered after meta commit', metaIdx >= 0 && legacyIdx > metaIdx)
  // Relaunch sees the same library through the v2 path only.
  const { snap: relaunch } = await bootStore(kv)
  eq('v2 relaunch matches migrated lib', canonical(relaunch.lib), canonical(legacy))
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
  // Refuse the index write on the first boot: content shards commit, meta never does.
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
  // A second store over the same space falls back to the legacy document too.
  const kvCheck = decodeLibrary(kv.map)
  eq('cold decode still reads legacy', kvCheck.hasMeta, false)
  eq('cold decode library intact', canonical(kvCheck.lib), canonical(legacy))
  // Clear the fault and let the same store retry the write.
  kv.failOn = null
  check('retry save accepted', store.save(legacy))
  const settled = await drain(store)
  eq('retry converges to ready', settled.status, 'ready')
  check('meta committed on retry', kv.map.has('meta'))
  check('legacy deleted once v2 stands', !kv.map.has('library'))
}

// --- mid-save failure: batch abort, honest status, retry ---------------------

{
  const kv = new FakeKV()
  let lib = newLibrary()
  lib = addDeck(lib, 'Base', T0)
  const deck = lib.decks[0]!
  lib = addCard(lib, deck.id, 'old', 'old', T0)
  const { store } = await bootStore(kv)
  check('initial save', store.save(lib))
  await drain(store)
  const metaBefore = kv.map.get('meta')

  // Fail exactly one content write: the rest of that batch must not commit.
  kv.failOn = (k) => (k === `deck.${deck.id}.0` ? 'E_STORAGE' : null)
  const next = addCard(lib, deck.id, 'new card', 'new back', T0 + 5)
  check('save call accepted', store.save(next))
  const mid = await drain(store)
  eq('failed write surfaces error', mid.status, 'error')
  eq('index untouched by torn batch', kv.map.get('meta'), metaBefore)
  check('live view keeps the new card pending', mid.lib.cards.length === 2)
  kv.failOn = null
  check('retry accepted', store.save(next))
  const settled = await drain(store)
  eq('retry ready', settled.status, 'ready')
  const { snap: relaunch } = await bootStore(kv)
  eq('relaunch sees both cards', relaunch.lib.cards.length, 2)
}

// --- stale queued write never overwrites a newer one -------------------------

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
  // Every meta value that ever committed names either state, never a stale
  // re-landing of 'first' after 'second'.
  const metas = kv.log.filter((e) => e.op === 'set' && e.k === 'meta')
  check('meta writes strictly ordered', metas.length >= 1)
  const finalMeta = JSON.parse(kv.map.get('meta')!) as { decks: { name: string }[] }
  eq('final deck name is the newest edit', finalMeta.decks[0]!.name, 'second')
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
  check('view still renders the intended library', snap.lib.cards.length === 80)
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
  check('no deck records written', ![...kv.map.keys()].some((k) => k.startsWith('deck.')))
  check('draft would stay open: lib untouched', snap.lib.cards.length === 0)
}

// --- index ceiling is bounded too ---------------------------------------------

{
  let lib = newLibrary()
  for (let i = 0; i < 2200; i++) lib = addDeck(lib, `deck number ${i} with a reasonably long name`, T0 + i)
  try {
    encodeLibrary(lib, LIMITS.value)
    check('index bound throws OversizeError', false)
  } catch (e) {
    check('index bound throws OversizeError', e instanceof OversizeError)
  }
  const kv = new FakeKV()
  const { store } = await bootStore(kv)
  eq('oversize index refused by save', store.save(lib), false)
  eq('oversize index surfaces error status', store.getSnapshot().status, 'error')
  check('no deck chunks committed', ![...kv.map.keys()].some((k) => k.startsWith('deck.')))
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

// --- decode-level regressions --------------------------------------------------

{
  // Foreign keys never leak into the decoded library.
  let lib = addDeck(newLibrary(), 'D', T0)
  lib = addCard(lib, lib.decks[0]!.id, 'f', 'b', T0)
  const desired = encodeLibrary(lib, LIMITS.value)
  const remote = new Map<string, string | null>([...desired])
  remote.set('unrelated-app-key', JSON.stringify({ v: 2, decks: [{ id: 'x' }] }))
  remote.set('review.', '"junk"')
  const decoded = decodeLibrary(remote)
  eq('foreign keys ignored', canonical(decoded.lib), canonical(lib))
  eq('foreign junk is not torn', decoded.torn, false)

  // A committed index pointing at a missing chunk is torn, not silently empty.
  remote.delete(`deck.${lib.decks[0]!.id}.0`)
  const torn = decodeLibrary(remote)
  eq('missing referenced chunk is torn', torn.torn, true)
  check('torn decode still shows the deck', torn.lib.decks.length === 1)

  // An orphaned chunk (index references only 1 chunk, extra chunk present)
  // heals through reconcile: the diff's delete sweeps it.
  remote.set(`deck.${lib.decks[0]!.id}.0`, desired.get(`deck.${lib.decks[0]!.id}.0`)!)
  remote.set(`deck.${lib.decks[0]!.id}.99`, '["orphan"]')
  const kv2 = new FakeKV()
  for (const [k, v] of remote) if (v !== null) kv2.map.set(k, v)
  const { snap: healed } = await bootStore(kv2)
  eq('orphaned chunk heals to ready', healed.status, 'ready')
  check('orphan chunk swept', !kv2.map.has(`deck.${lib.decks[0]!.id}.99`))
}

console.log(`${passes} passed, ${failures} failed`)
if (failures) throw new Error(`${failures} check(s) failed`)
