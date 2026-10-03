// Generationed bounded persistence for the library. The legacy 'library' key
// held one JSON document, so a large collection could grow past the platform's
// per-value limit and stall every save; the first shard layout still rewrote
// chunk keys in place, so an interrupted save could lose already-committed
// cards. The v3 layout writes every record to a key namespaced by a unique
// generation token and makes 'meta' the only mutable key - a commit pointer:
//
//   meta                 { v: 3, g: <gen>, n: <index chunk count> }
//   g<gen>.idx.<i>       index chunks: JSON arrays of {t, ...} entries naming
//                        every content key of the generation, in order
//   g<gen>.deck.<id>.<i> JSON arrays of Card objects
//   g<gen>.queue.<id>.<i> JSON arrays of queued card ids
//   g<gen>.review.<id>   session head { v: 1, deckId, done, revealed, startedAt, finished, q }
//   g<gen>.activity      { v: 1, history, dayCounts }
//   library              legacy v1 document; v2 flat records use the old
//                        deck./queue./review./activity prefixes (decode only)
//
// Commit protocol: all generation content and index keys land first, 'meta'
// lands last, and collects (deletes) run after the commit is acknowledged.
// An interrupted save leaves unreferenced generation keys behind but never
// touches the committed generation, so the last committed library is always
// decodable in full. Readers decode exactly the keys the committed index
// names - a peer's in-flight generation is invisible until its meta commits -
// and hydration never deletes: only a committing writer collects, and only
// keys of the generation its commit replaced plus generations it authored and
// never committed.
//
// Sizes are measured in UTF-8 bytes of the exact string written (the platform
// guard's measure) AND of the serialized request envelope - the request JSON
// escapes the value a second time, so a value can satisfy the per-key cap and
// still be rejected on the wire. Both bounds are enforced per record.

import {
  dayKey,
  type Library,
  newLibrary,
  parseLibrary,
  type ReviewSession,
  readCard,
  readDayCounts,
  readDeck,
  readEvent,
  readSessionBase,
  serializeLibrary
} from './cards.ts'

const META_KEY = 'meta'
const LEGACY_KEY = 'library'
const ACTIVITY_KEY = 'activity'
const DECK_PREFIX = 'deck.'
const REVIEW_PREFIX = 'review.'
const QUEUE_PREFIX = 'queue.'
const GEN_RE = /^g([0-9a-z]+)\./
const genKey = (gen: string, logical: string) => `g${gen}.${logical}`
const genOf = (k: string) => GEN_RE.exec(k)?.[1] ?? null
// Keys a committing writer may safely delete: nothing outside these patterns
// can ever be collected, so foreign keys and in-flight peer generations are
// untouchable.
const flatOurs = (k: string) =>
  k === LEGACY_KEY ||
  k === ACTIVITY_KEY ||
  k.startsWith(DECK_PREFIX) ||
  k.startsWith(REVIEW_PREFIX) ||
  k.startsWith(QUEUE_PREFIX)

/** UTF-8 byte length - the same measure the platform guards apply. */
export const utf8 = (s: string) => new TextEncoder().encode(s).length

/** A record that cannot be encoded under the per-key/envelope limits, e.g. a single oversized card. */
export class OversizeError extends Error {
  constructor(what: string) {
    super(what)
    this.name = 'OversizeError'
  }
}

export type Space = {
  get(k: string): Promise<string | null>
  set(k: string, v: string): Promise<{ rev: number }>
  del(k: string): Promise<{ rev: number }>
  snapshot(cursor?: string): Promise<{ rev: number; entries: [string, string][]; cursor?: string }>
  watch(since: number, cb: (e: { rev: number; k: string; v: string | null }) => void): () => void
}
export type StorageLimits = { value: number; envelope?: number; key?: number }
type Op = { k: string; v: string | null; serial: number; b: number; live?: boolean; del?: boolean }
type Pending = { v: string | null; serial: number; failed?: string }
export type StoreStatus = 'hydrating' | 'ready' | 'saving' | 'error'
export type StoreSnapshot = { lib: Library; status: StoreStatus }

/** The escaped length a value contributes inside a request's JSON - JSON escaping is additive per character. */
export const escapedLen = (s: string) => utf8(JSON.stringify(s)) - 2

/** Bytes a `storage.set` request occupies when `v` is empty; worst-case id/epoch field widths included. */
export function requestBase(k: string): number {
  return utf8(
    JSON.stringify({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      m: 'storage.set',
      p: { k, v: '' },
      epoch: 9007199254740991
    })
  )
}

/** A record fits only if the raw value, the key and the serialized request all fit their limits. */
export function recordFits(k: string, v: string, limits: StorageLimits): boolean {
  if (limits.key !== undefined && utf8(k) > limits.key) return false
  if (utf8(v) > limits.value) return false
  if (limits.envelope !== undefined && requestBase(k) + escapedLen(v) > limits.envelope) return false
  return true
}

/**
 * Greedy-pack already-serialized items into JSON array strings for `keyFor(i)`.
 * Each emitted chunk stays under the raw value limit and the escaped request
 * envelope of the exact key it will be written under.
 */
export function chunkJson(
  items: string[],
  limits: StorageLimits,
  keyFor: (i: number) => string,
  label: string
): string[] {
  const chunks: string[] = []
  let parts: string[] = []
  let raw = 2
  let esc = 2
  for (const item of items) {
    const itemRaw = utf8(item)
    const itemEsc = escapedLen(item)
    if (itemRaw + 2 > limits.value) throw new OversizeError(`${label}: one item alone exceeds the per-key limit`)
    const comma = parts.length ? 1 : 0
    if (parts.length) {
      const key = keyFor(chunks.length)
      const env = limits.envelope === undefined ? Number.POSITIVE_INFINITY : limits.envelope - requestBase(key)
      if (raw + comma + itemRaw > limits.value || esc + comma + itemEsc > env) {
        chunks.push(`[${parts.join(',')}]`)
        parts = [item]
        raw = 2 + itemRaw
        esc = 2 + itemEsc
        continue
      }
    }
    parts.push(item)
    raw += comma + itemRaw
    esc += comma + itemEsc
  }
  if (parts.length) chunks.push(`[${parts.join(',')}]`)
  return chunks
}

/** The session record as stored: the queue lives in queue chunks, the head keeps the count in `q`. */
function sessionHead(session: ReviewSession, q: number) {
  return {
    v: 1,
    deckId: session.deckId,
    done: session.done,
    revealed: session.revealed,
    startedAt: session.startedAt,
    finished: session.finished,
    q
  }
}

// Index entry tags inside `g<gen>.idx.<i>` arrays. Every content key the
// generation commits is named by exactly one entry; readers touch nothing else.
type IdxEntry =
  | { t: 'd'; id: string; name: string; createdAt: number }
  | { t: 'c'; id: string; k: string }
  | { t: 'h'; id: string; k: string }
  | { t: 'q'; id: string; k: string }
  | { t: 'a'; k: string }

/**
 * Encode a whole library into the desired record set for generation `gen`.
 * Includes the `meta` commit pointer; the caller orders its write last.
 * Throws OversizeError when nothing can hold the data.
 */
export function encodeLibrary(lib: Library, limits: StorageLimits, gen: string): Map<string, string> {
  const out = new Map<string, string>()
  const entries: IdxEntry[] = []
  const put = (k: string, v: string, label: string) => {
    if (!recordFits(k, v, limits)) throw new OversizeError(label)
    out.set(k, v)
  }
  for (const deck of lib.decks) {
    entries.push({ t: 'd', id: deck.id, name: deck.name, createdAt: deck.createdAt })
    const cards = lib.cards
      .filter((c) => c.deckId === deck.id)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    const chunks = chunkJson(
      cards.map((c) => JSON.stringify(c)),
      limits,
      (i) => genKey(gen, `${DECK_PREFIX}${deck.id}.${i}`),
      `deck "${deck.name}"`
    )
    chunks.forEach((s, i) => {
      const k = genKey(gen, `${DECK_PREFIX}${deck.id}.${i}`)
      put(k, s, `deck "${deck.name}"`)
      entries.push({ t: 'c', id: deck.id, k })
    })
  }
  for (const session of Object.values(lib.reviews)) {
    const chunks = chunkJson(
      session.queue.map((id) => JSON.stringify(id)),
      limits,
      (i) => genKey(gen, `${QUEUE_PREFIX}${session.deckId}.${i}`),
      `review queue of ${session.deckId}`
    )
    chunks.forEach((s, i) => {
      const k = genKey(gen, `${QUEUE_PREFIX}${session.deckId}.${i}`)
      put(k, s, `review queue of ${session.deckId}`)
      entries.push({ t: 'q', id: session.deckId, k })
    })
    const head = genKey(gen, `${REVIEW_PREFIX}${session.deckId}`)
    put(head, JSON.stringify(sessionHead(session, chunks.length)), `review session of ${session.deckId}`)
    entries.push({ t: 'h', id: session.deckId, k: head })
  }
  const activityKey = genKey(gen, ACTIVITY_KEY)
  put(activityKey, JSON.stringify({ v: 1, history: lib.history, dayCounts: lib.dayCounts }), 'activity')
  entries.push({ t: 'a', k: activityKey })
  const idxChunks = chunkJson(
    entries.map((e) => JSON.stringify(e)),
    limits,
    (i) => genKey(gen, `idx.${i}`),
    'index'
  )
  idxChunks.forEach((s, i) => put(genKey(gen, `idx.${i}`), s, 'index'))
  put(META_KEY, JSON.stringify({ v: 3, g: gen, n: idxChunks.length }), 'index')
  return out
}

const parseArray = (raw: string | null | undefined): unknown[] | null => {
  if (raw === null || raw === undefined) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}
const recNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)
const recStr = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** The committed index a decode resolved: its generation and every key it names (the set a later commit may collect). */
export type DecodedIndex = { gen: string; keys: Set<string> }
export type Decoded = { lib: Library; format: 'v3' | 'v2' | 'legacy'; index: DecodedIndex | null; torn: boolean }

function decodeV3(
  remote: Map<string, string | null>,
  meta: { g: string; n: number }
): { lib: Library; index: DecodedIndex | null; torn: boolean } {
  const lib = newLibrary()
  let torn = false
  const idxKeys: string[] = []
  for (let i = 0; i < meta.n; i++) idxKeys.push(genKey(meta.g, `idx.${i}`))
  const entries: IdxEntry[] = []
  const keys = new Set<string>(idxKeys)
  for (const k of idxKeys) {
    const rows = parseArray(remote.get(k))
    if (!rows) return { lib, index: null, torn: true }
    for (const row of rows) if (isRec(row)) entries.push(row as IdxEntry)
  }
  const deckMetas: { id: string; name: string; createdAt: number }[] = []
  const cardKeys = new Map<string, string[]>()
  const headKeys = new Map<string, string>()
  const queueKeys = new Map<string, string[]>()
  let activityKey: string | null = null
  for (const e of entries) {
    const id = recStr((e as { id?: unknown }).id)
    const k = recStr((e as { k?: unknown }).k)
    switch (e.t) {
      case 'd': {
        const deck = readDeck(e)
        if (deck) deckMetas.push(deck)
        break
      }
      case 'c':
        if (id && k) {
          keys.add(k)
          const list = cardKeys.get(id) ?? []
          list.push(k)
          cardKeys.set(id, list)
        }
        break
      case 'h':
        if (id && k) {
          keys.add(k)
          headKeys.set(id, k)
        }
        break
      case 'q':
        if (id && k) {
          keys.add(k)
          const list = queueKeys.get(id) ?? []
          list.push(k)
          queueKeys.set(id, list)
        }
        break
      case 'a':
        if (k) {
          keys.add(k)
          activityKey = k
        }
        break
    }
  }
  lib.decks = deckMetas.map(({ id, name, createdAt }) => ({ id, name, createdAt }))
  const deckIds = new Set(lib.decks.map((d) => d.id))
  for (const deck of deckMetas) {
    for (const k of cardKeys.get(deck.id) ?? []) {
      const rows = parseArray(remote.get(k))
      if (!rows) {
        torn = true
        continue
      }
      for (const row of rows) {
        const card = readCard(row, deckIds)
        if (card) lib.cards.push(card)
      }
    }
  }
  const cardIds = new Set(lib.cards.map((c) => c.id))
  if (activityKey !== null) {
    const raw = remote.get(activityKey)
    try {
      const activity = raw == null ? null : (JSON.parse(raw) as unknown)
      if (isRec(activity)) {
        if (Array.isArray(activity.history))
          for (const e of activity.history) {
            const event = readEvent(e)
            if (event) lib.history.push(event)
          }
        lib.dayCounts = readDayCounts(activity.dayCounts)
      } else if (raw != null) {
        torn = true
      }
      if (Object.keys(lib.dayCounts).length === 0)
        for (const e of lib.history) {
          const key = dayKey(e.at)
          lib.dayCounts[key] = (lib.dayCounts[key] ?? 0) + 1
        }
    } catch {
      torn = true
    }
  }
  for (const [deckId, headKey] of headKeys) {
    const raw = remote.get(headKey)
    try {
      const head = raw == null ? null : (JSON.parse(raw) as unknown)
      const base = readSessionBase(head)
      const q = isRec(head) ? recNum(head.q) : null
      if (!base || base.deckId !== deckId || q === null || q < 0 || !deckIds.has(deckId)) {
        if (raw != null) torn = true
        continue
      }
      const queue: string[] = []
      let missing = false
      for (const k of queueKeys.get(deckId) ?? []) {
        const rows = parseArray(remote.get(k))
        if (!rows) {
          missing = true
          break
        }
        for (const row of rows) if (typeof row === 'string' && cardIds.has(row)) queue.push(row)
      }
      if (missing) {
        torn = true
        continue
      }
      if (!queue.length && !base.finished) continue
      lib.reviews[deckId] = { ...base, queue }
    } catch {
      torn = true
    }
  }
  return { lib, index: torn ? null : { gen: meta.g, keys }, torn }
}

/** The v2 flat layout, retained so committed v2 stores still decode and migrate. */
function decodeV2(
  remote: Map<string, string | null>,
  metaDecks: { id: string; name: string; createdAt: number; c: number }[]
) {
  const lib = newLibrary()
  let torn = false
  lib.decks = metaDecks.map(({ id, name, createdAt }) => ({ id, name, createdAt }))
  const deckIds = new Set(lib.decks.map((d) => d.id))
  for (const entry of metaDecks) {
    for (let i = 0; i < entry.c; i++) {
      const rows = parseArray(remote.get(`${DECK_PREFIX}${entry.id}.${i}`))
      if (!rows) {
        torn = true
        continue
      }
      for (const row of rows) {
        const card = readCard(row, deckIds)
        if (card) lib.cards.push(card)
      }
    }
  }
  const cardIds = new Set(lib.cards.map((c) => c.id))
  try {
    const raw = remote.get(ACTIVITY_KEY)
    const activity = raw == null ? null : (JSON.parse(raw) as unknown)
    if (isRec(activity)) {
      if (Array.isArray(activity.history))
        for (const e of activity.history) {
          const event = readEvent(e)
          if (event) lib.history.push(event)
        }
      lib.dayCounts = readDayCounts(activity.dayCounts)
      if (Object.keys(lib.dayCounts).length === 0)
        for (const e of lib.history) {
          const key = dayKey(e.at)
          lib.dayCounts[key] = (lib.dayCounts[key] ?? 0) + 1
        }
    }
  } catch {
    torn = true
  }
  for (const [key, raw] of remote) {
    if (!key.startsWith(REVIEW_PREFIX) || raw == null) continue
    const deckId = key.slice(REVIEW_PREFIX.length)
    try {
      const head = JSON.parse(raw) as unknown
      const base = readSessionBase(head)
      const q = isRec(head) ? recNum(head.q) : null
      if (!base || base.deckId !== deckId || q === null || q < 0 || !deckIds.has(deckId)) continue
      const queue: string[] = []
      let missing = false
      for (let i = 0; i < q; i++) {
        const rows = parseArray(remote.get(`${QUEUE_PREFIX}${deckId}.${i}`))
        if (!rows) {
          missing = true
          break
        }
        for (const row of rows) if (typeof row === 'string' && cardIds.has(row)) queue.push(row)
      }
      if (missing) {
        torn = true
        continue
      }
      if (!queue.length && !base.finished) continue
      lib.reviews[deckId] = { ...base, queue }
    } catch {
      torn = true
    }
  }
  return { lib, torn }
}

/**
 * Reassemble the library from stored records. `index` names the committed
 * generation and the exact keys it references; `torn` marks a committed
 * index whose named records are absent or unreadable - torn stores are
 * decoded best-effort but never written over, so committed data is never
 * sealed away. With no committed index the legacy document is the source.
 */
export function decodeLibrary(remote: Map<string, string | null>): Decoded {
  const metaRaw = remote.get(META_KEY)
  let parsedMeta: Record<string, unknown> | null = null
  try {
    const parsed = metaRaw == null ? null : (JSON.parse(metaRaw) as unknown)
    if (isRec(parsed)) parsedMeta = parsed
  } catch {
    parsedMeta = null
  }
  if (parsedMeta && parsedMeta.v === 3) {
    const g = recStr(parsedMeta.g)
    const n = recNum(parsedMeta.n)
    if (g !== null && n !== null && n >= 0) {
      const { lib, index, torn } = decodeV3(remote, { g, n })
      return { lib, format: 'v3', index, torn }
    }
  }
  if (parsedMeta && parsedMeta.v === 2 && Array.isArray(parsedMeta.decks)) {
    const decks: { id: string; name: string; createdAt: number; c: number }[] = []
    for (const d of parsedMeta.decks) {
      const deck = readDeck(d)
      const c = isRec(d) ? recNum(d.c) : null
      if (deck && c !== null && c >= 0) decks.push({ ...deck, c })
    }
    const { lib, torn } = decodeV2(remote, decks)
    return { lib, format: 'v2', index: null, torn }
  }
  // No committed v3/v2 index: fall back to the legacy document if it exists.
  return { lib: parseLibrary(remote.get(LEGACY_KEY) ?? null), format: 'legacy', index: null, torn: false }
}

/**
 * Order one save's ops: generation content first, the `meta` commit pointer
 * last, collects at the very end. An interrupted batch can leave orphan
 * generation keys but never an index pointing at uncommitted content.
 */
export function diffOps(
  desired: Map<string, string>,
  remote: Map<string, string | null>,
  pending: Map<string, Pending>,
  collectable: (k: string) => boolean
): { k: string; v: string | null }[] {
  const ops: { k: string; v: string | null }[] = []
  const meta = desired.get(META_KEY)
  for (const [k, v] of desired) {
    if (k === META_KEY) continue
    const p = pending.get(k)
    if (p && !p.failed) {
      if (p.v === v) continue // identical write already issued
    } else if (remote.get(k) === v) continue
    ops.push({ k, v })
  }
  if (meta !== undefined && remote.get(META_KEY) !== meta) {
    const p = pending.get(META_KEY)
    if (!p || p.failed || p.v !== meta) ops.push({ k: META_KEY, v: meta })
  }
  for (const k of new Set([...remote.keys(), ...pending.keys()])) {
    if (k === META_KEY || !collectable(k) || desired.has(k)) continue
    const p = pending.get(k)
    if (p && p.v === null && !p.failed) continue // delete already issued
    ops.push({ k, v: null })
  }
  return ops
}

export class LibraryStore {
  private remote = new Map<string, string | null>()
  private pending = new Map<string, Pending>()
  private deferred = new Map<string, { rev: number; k: string; v: string | null }>()
  private ops: Op[] = []
  private running = false
  private serial = 0
  private batch = 0
  private rev = 0
  private snap: StoreSnapshot = { lib: newLibrary(), status: 'hydrating' }
  private listeners = new Set<() => void>()
  private hydrated = false
  private hydrateFailed = false
  private inflight = false
  private attempts = 0
  private started = false
  private unwatch?: () => void
  private encodeFailed = false
  private saveFailed = false
  private torn = false
  // The generation this copy authored most recently and the set of its own
  // generations that never committed - the only g-prefixed keys it may delete
  // beyond the previous committed index's.
  private myGens = new Set<string>()
  private deadGens = new Set<string>()

  constructor(
    private space: Space,
    private limits: StorageLimits
  ) {}

  subscribe = (cb: () => void) => {
    this.listeners.add(cb)
    if (!this.started) {
      this.started = true
      void this.hydrate()
    } else if (this.hydrateFailed) {
      // A failed hydrate leaves no watch behind, so a remount retries it.
      void this.hydrate()
    }
    return () => {
      this.listeners.delete(cb)
    }
  }

  getSnapshot = () => this.snap

  /** Enqueue the records needed to reach `next`. False when nothing can hold the library (oversize single record). */
  save(next: Library): boolean {
    if (!this.hydrated || this.torn || this.hydrateFailed) return false
    this.encodeFailed = false
    this.saveFailed = false
    // Failed pending entries belong to generations that can never commit -
    // drop them so the optimistic view stops implying they saved. Their keys
    // become collectable; failed deletes are retried as cleanup ahead.
    for (const [k, p] of this.pending) {
      if (!p.failed) continue
      this.pending.delete(k)
      const g = genOf(k)
      if (g && this.myGens.has(g)) this.deadGens.add(g)
      if (p.v === null) this.enqueue([{ k, v: null }])
    }
    // Nothing to write when the committed view already equals the target.
    if (serializeLibrary(this.libView().lib) === serializeLibrary(next)) {
      this.emit()
      return true
    }
    const gen = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    let desired: Map<string, string>
    try {
      desired = encodeLibrary(next, this.limits, gen)
    } catch {
      this.encodeFailed = true
      this.emit()
      return false
    }
    this.myGens.add(gen)
    // Failed or superseded pending ops belong to generations that can never
    // commit now - drop them so the optimistic view stops implying they saved,
    // and remember them for the post-commit collect.
    const decoded = this.libView()
    const replacedIndex = decoded.index
    const collectable = (k: string) => {
      const g = genOf(k)
      if (g !== null) return this.deadGens.has(g) || replacedIndex?.keys.has(k) === true
      // Flat legacy/v2 keys are collectable only while we are replacing a
      // non-v3 index - never mid-flight for a peer's own write.
      return decoded.index === null && flatOurs(k)
    }
    // A superseded queued save's generation is dead before it ever lands.
    for (const o of this.ops) {
      if (o.live || o.del) continue
      const g = genOf(o.k)
      if (g && g !== gen && this.myGens.has(g)) this.deadGens.add(g)
    }
    this.enqueue(diffOps(desired, this.remote, this.pending, collectable))
    return true
  }

  private enqueue(ops: { k: string; v: string | null }[]) {
    if (!ops.length) {
      this.emit()
      return
    }
    const b = ++this.batch
    // Queued (not yet in-flight) ops from earlier saves are superseded whole:
    // their generation can never commit now that a newer save exists. Deletes
    // only target collectable keys and stay - they are idempotent cleanup.
    const dropped = this.ops.filter((o) => !o.live && !o.del)
    this.ops = this.ops.filter((o) => o.live || o.del)
    for (const o of dropped) {
      const p = this.pending.get(o.k)
      if (p && p.serial === o.serial) this.pending.delete(o.k)
    }
    for (const op of ops) {
      const serial = ++this.serial
      this.pending.set(op.k, { v: op.v, serial })
      this.ops.push({ ...op, serial, b, del: op.v === null })
    }
    void this.pump()
    this.emit()
  }

  private async pump() {
    if (this.running) return
    this.running = true
    try {
      while (this.ops.length) {
        const op = this.ops[0]!
        op.live = true
        try {
          const ack = op.v === null ? await this.space.del(op.k) : await this.space.set(op.k, op.v)
          this.ops = this.ops.filter((o) => o !== op)
          this.settleOk(op, ack.rev)
        } catch (e) {
          this.settleFail(op, e)
        }
      }
    } finally {
      // Re-emit after the flag clears: the last settle emitted 'saving' while
      // the pump was still marked running.
      this.running = false
      this.emit()
    }
  }

  private settleOk(op: Op, ackRev: number) {
    this.rev = Math.max(this.rev, ackRev)
    const p = this.pending.get(op.k)
    if (!p || p.serial !== op.serial) return // a newer op already replaced this key
    const deferred = this.deferred.get(op.k)
    // A peer write that arrived while ours was in flight wins only if newer.
    this.remote.set(op.k, deferred && deferred.rev > ackRev ? deferred.v : op.v)
    this.pending.delete(op.k)
    this.deferred.delete(op.k)
    this.emit()
  }

  private settleFail(op: Op, e: unknown) {
    const code = e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : 'E_STORAGE'
    const permanent = code === 'E_ARGS' || code === 'E_QUOTA'
    if (permanent) this.saveFailed = true
    const p = this.pending.get(op.k)
    if (p && p.serial === op.serial) {
      if (permanent) this.pending.delete(op.k)
      else p.failed = code
    }
    this.ops = this.ops.filter((o) => {
      // The rest of this batch must not commit the pointer or collect after a
      // failed write - their generation stays uncommitted, which is exactly the
      // state a relaunch decodes around. Earlier batches' queued ops keep going.
      if (o === op || o.b === op.b) {
        const q = this.pending.get(o.k)
        if (q && q.serial === o.serial) {
          if (permanent) this.pending.delete(o.k)
          else q.failed = code
        }
        return false
      }
      return true
    })
    this.emit()
  }

  private change(e: { rev: number; k: string; v: string | null }) {
    if (e.rev < 0 || e.rev > this.rev + 1) {
      void this.hydrate()
      return
    }
    if (e.rev <= this.rev) return
    this.rev = e.rev
    if (this.pending.has(e.k)) {
      this.deferred.set(e.k, e)
      return
    }
    this.remote.set(e.k, e.v)
    this.emit()
  }

  private async hydrate() {
    if (this.inflight) return
    this.inflight = true
    try {
      await this.pull()
    } finally {
      this.inflight = false
    }
  }

  private async pull() {
    this.unwatch?.()
    try {
      const values = new Map<string, string | null>()
      let cursor: string | undefined
      let revision: number | undefined
      do {
        const page = await this.space.snapshot(cursor)
        if (revision !== undefined && page.rev !== revision)
          throw Object.assign(new Error('E_STALE'), { code: 'E_STALE' })
        revision = page.rev
        for (const [k, v] of page.entries) values.set(k, v)
        cursor = page.cursor
      } while (cursor)
      this.remote = values
      this.rev = revision ?? 0
      this.attempts = 0
      this.hydrateFailed = false
      this.hydrated = true
      this.encodeFailed = false
      this.unwatch = this.space.watch(this.rev, (e) => this.change(e))
      // Hydration is read-only: it never deletes or rewrites records, so a boot
      // racing a peer's in-flight save cannot destroy the peer's commit. The
      // only write it performs is a migration save when no v3 index exists.
      const decoded = this.libView()
      this.torn = decoded.torn
      if (!this.torn && decoded.index === null && [...values.keys()].some((k) => flatOurs(k) || genOf(k))) {
        try {
          const gen = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
          this.myGens.add(gen)
          const collectable = (k: string) => flatOurs(k)
          this.enqueue(diffOps(encodeLibrary(decoded.lib, this.limits, gen), this.remote, this.pending, collectable))
        } catch {
          this.encodeFailed = true
        }
      }
      this.emit()
    } catch (e) {
      const code = e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : 'E_STORAGE'
      if (
        (code === 'E_STALE' || code === 'E_TIMEOUT' || code === 'E_RATE' || code === 'E_STORAGE') &&
        this.attempts < 8
      ) {
        this.attempts++
        await new Promise((resolve) => setTimeout(resolve, Math.min(500 * this.attempts, 4000)))
        await this.pull()
        return
      }
      this.attempts = 0
      this.hydrated = true
      this.hydrateFailed = true
      this.emit()
    }
  }

  /** The assembled view: remote records overlaid by pending writes, decoded per layout. */
  private libView(): Decoded {
    const overlay = new Map<string, string | null>(this.remote)
    for (const [k, p] of this.pending) {
      if (p.v === null) overlay.delete(k)
      else overlay.set(k, p.v)
    }
    return decodeLibrary(overlay)
  }

  private status(): StoreStatus {
    if (!this.hydrated) return 'hydrating'
    if (this.hydrateFailed || this.torn || this.encodeFailed || this.saveFailed) return 'error'
    for (const p of this.pending.values()) if (p.failed) return 'error'
    if (this.ops.length || this.running) return 'saving'
    return 'ready'
  }

  private emit() {
    const decoded = this.libView()
    this.torn = decoded.torn
    this.snap = { lib: decoded.lib, status: this.status() }
    for (const cb of this.listeners) cb()
  }
}
