// Bounded shard persistence for the library. The legacy 'library' key held one
// JSON document, so a large collection could grow past the platform's per-value
// limit and stall every save. The v2 layout keeps every record under the limit:
//
//   meta              { v: 2, decks: [{ id, name, createdAt, c }] }
//   activity          { v: 1, history, dayCounts }
//   deck.<id>.<i>     JSON array of Card objects, i < c from meta
//   review.<id>       session head { v: 1, deckId, done, revealed, startedAt, finished, q }
//   queue.<id>.<i>    JSON array of queued card ids, i < q from the head
//   library           legacy v1 document, deleted only after a v2 meta commits
//
// Sizes are measured in UTF-8 bytes of the exact string written - the same
// measure the platform's guards apply - so a value that fits here always fits
// the store. Write order is content -> index -> deletes inside one serialized
// batch: an interrupted batch can leave an orphaned chunk or a stale index, but
// never an index pointing at a chunk that was not committed. The next hydrate
// or save reconciles desired state against remote state and finishes the job.
// The legacy document is kept until every shard is acknowledged and meta has
// committed, so a failed migration retries cleanly on the next launch instead
// of dropping data.

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
  readSessionBase
} from './cards.ts'

const META_KEY = 'meta'
const ACTIVITY_KEY = 'activity'
const LEGACY_KEY = 'library'
const DECK_PREFIX = 'deck.'
const REVIEW_PREFIX = 'review.'
const QUEUE_PREFIX = 'queue.'
const ours = (k: string) =>
  k === META_KEY ||
  k === ACTIVITY_KEY ||
  k === LEGACY_KEY ||
  k.startsWith(DECK_PREFIX) ||
  k.startsWith(REVIEW_PREFIX) ||
  k.startsWith(QUEUE_PREFIX)

/** UTF-8 byte length - the same measure the platform guards apply. */
export const utf8 = (s: string) => new TextEncoder().encode(s).length

/** A record that cannot be encoded under the per-key limit, e.g. a single oversized card or a deck index past its ceiling. */
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
export type StorageLimits = { value: number }
type Op = { k: string; v: string | null; serial: number; b: number; live?: boolean }
type Pending = { v: string | null; serial: number; failed?: string }
export type StoreStatus = 'hydrating' | 'ready' | 'saving' | 'error'
export type StoreSnapshot = { lib: Library; status: StoreStatus }

/** Greedy-pack already-serialized items into JSON array strings, each at most `budget` UTF-8 bytes. */
export function chunkJson(items: string[], budget: number, label: string): string[] {
  const chunks: string[] = []
  let parts: string[] = []
  let size = 2
  for (const item of items) {
    const len = utf8(item)
    if (len + 2 > budget) throw new OversizeError(`${label}: one item alone exceeds the per-key limit`)
    const add = len + (parts.length ? 1 : 0)
    if (parts.length && size + add > budget) {
      chunks.push(`[${parts.join(',')}]`)
      parts = [item]
      size = 2 + len
    } else {
      parts.push(item)
      size += add
    }
  }
  if (parts.length) chunks.push(`[${parts.join(',')}]`)
  return chunks
}

/** The session record as stored: the queue lives in `queue.<id>.<i>` chunks, the head keeps the count in `q`. */
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

/** Encode a whole library into the desired record set, index keys last. Throws OversizeError when nothing can hold the data. */
export function encodeLibrary(lib: Library, limit: number): Map<string, string> {
  const out = new Map<string, string>()
  const index: { id: string; name: string; createdAt: number; c: number }[] = []
  for (const deck of lib.decks) {
    const cards = lib.cards
      .filter((c) => c.deckId === deck.id)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    const chunks = chunkJson(
      cards.map((c) => JSON.stringify(c)),
      limit,
      `deck "${deck.name}"`
    )
    chunks.forEach((s, i) => out.set(`${DECK_PREFIX}${deck.id}.${i}`, s))
    index.push({ id: deck.id, name: deck.name, createdAt: deck.createdAt, c: chunks.length })
  }
  for (const session of Object.values(lib.reviews)) {
    const chunks = chunkJson(
      session.queue.map((id) => JSON.stringify(id)),
      limit,
      `review queue of ${session.deckId}`
    )
    chunks.forEach((s, i) => out.set(`${QUEUE_PREFIX}${session.deckId}.${i}`, s))
    const head = JSON.stringify(sessionHead(session, chunks.length))
    if (utf8(head) > limit) throw new OversizeError(`review session of ${session.deckId}`)
    out.set(`${REVIEW_PREFIX}${session.deckId}`, head)
  }
  const activity = JSON.stringify({ v: 1, history: lib.history, dayCounts: lib.dayCounts })
  if (utf8(activity) > limit) throw new OversizeError('activity')
  out.set(ACTIVITY_KEY, activity)
  const meta = JSON.stringify({ v: 2, decks: index })
  if (utf8(meta) > limit) throw new OversizeError('index')
  out.set(META_KEY, meta)
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

/**
 * Reassemble the library from stored records. `hasMeta` distinguishes a v2
 * store from a legacy document; `torn` marks a committed index that references
 * a chunk which is absent or unreadable - a torn store is decoded best-effort
 * but never auto-reconciled, so the missing content is not sealed away.
 */
export function decodeLibrary(remote: Map<string, string | null>): { lib: Library; hasMeta: boolean; torn: boolean } {
  const lib = newLibrary()
  let torn = false
  const metaRaw = remote.get(META_KEY)
  let metaDecks: { id: string; name: string; createdAt: number; c: number }[] | null = null
  try {
    const parsed = metaRaw == null ? null : (JSON.parse(metaRaw) as unknown)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed as { v?: unknown }).v === 2) {
      const decks = (parsed as { decks?: unknown }).decks
      if (Array.isArray(decks)) {
        metaDecks = []
        for (const d of decks) {
          const deck = readDeck(d)
          const c = recNum((d as { c?: unknown })?.c)
          if (deck && c !== null && c >= 0) metaDecks.push({ ...deck, c })
        }
      }
    }
  } catch {
    metaDecks = null
  }
  if (metaDecks === null) {
    // No committed v2 index: fall back to the legacy document if it exists.
    return { lib: parseLibrary(remote.get(LEGACY_KEY) ?? null), hasMeta: false, torn: false }
  }
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
    if (activity && typeof activity === 'object' && !Array.isArray(activity)) {
      const a = activity as { history?: unknown; dayCounts?: unknown }
      if (Array.isArray(a.history))
        for (const e of a.history) {
          const event = readEvent(e)
          if (event) lib.history.push(event)
        }
      lib.dayCounts = readDayCounts(a.dayCounts)
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
      const q = recNum((head as { q?: unknown })?.q)
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
  return { lib, hasMeta: true, torn }
}

const recNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)

/** Content sets first, index keys last, deletes at the very end - the batch order decodeLibrary relies on. */
export function diffOps(
  desired: Map<string, string>,
  remote: Map<string, string | null>,
  pending: Map<string, Pending>
): { k: string; v: string | null }[] {
  const ops: { k: string; v: string | null }[] = []
  for (const [k, v] of desired) {
    const p = pending.get(k)
    if (p && !p.failed) {
      if (p.v === v) continue // identical write already issued
    } else if (remote.get(k) === v) continue
    ops.push({ k, v })
  }
  for (const k of new Set([...remote.keys(), ...pending.keys()])) {
    if (!ours(k) || desired.has(k)) continue
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
  private torn = false

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
    let desired: Map<string, string>
    try {
      desired = encodeLibrary(next, this.limits.value)
    } catch {
      this.encodeFailed = true
      this.emit()
      return false
    }
    this.enqueue(diffOps(desired, this.remote, this.pending))
    return true
  }

  private enqueue(ops: { k: string; v: string | null }[]) {
    if (!ops.length) {
      this.emit()
      return
    }
    const b = ++this.batch
    // A newer op for the same key supersedes one still waiting, so a stale
    // value queued earlier never reaches storage after a newer edit.
    const keys = new Set(ops.map((o) => o.k))
    // Only queued ops are superseded; an op already in flight settles normally
    // and the serial check keeps its ack from overwriting the newer intent.
    this.ops = this.ops.filter((o) => o.live || !keys.has(o.k))
    for (const op of ops) {
      const serial = ++this.serial
      this.pending.set(op.k, { v: op.v, serial })
      this.ops.push({ ...op, serial, b })
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
    const p = this.pending.get(op.k)
    if (p && p.serial === op.serial) p.failed = code
    this.ops = this.ops.filter((o) => {
      // The rest of this batch must not commit an index or delete after a
      // failed content write - their desired values stay pending and retry on
      // the next save or hydrate. Earlier batches' queued ops keep going.
      if (o === op || o.b === op.b) {
        const q = this.pending.get(o.k)
        if (q && q.serial === o.serial) q.failed = code
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
      // Reconcile: rewrite whatever the decoded view still needs (a torn
      // index or a failed earlier batch), which also sweeps orphaned chunks
      // and removes the legacy document once v2 stands on its own.
      const decoded = this.libView()
      this.torn = decoded.torn
      if (!this.torn) {
        try {
          this.enqueue(diffOps(encodeLibrary(decoded.lib, this.limits.value), this.remote, this.pending))
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
  private libView(): { lib: Library; torn: boolean } {
    const overlay = new Map<string, string | null>(this.remote)
    for (const [k, p] of this.pending) {
      if (p.v === null) overlay.delete(k)
      else overlay.set(k, p.v)
    }
    return decodeLibrary(overlay)
  }

  private status(): StoreStatus {
    if (!this.hydrated) return 'hydrating'
    if (this.hydrateFailed || this.torn || this.encodeFailed) return 'error'
    for (const p of this.pending.values()) if (p.failed) return 'error'
    if (this.ops.length || this.running) return 'saving'
    return 'ready'
  }

  private emit() {
    const { lib, torn } = this.libView()
    this.torn = torn
    this.snap = { lib, status: this.status() }
    for (const cb of this.listeners) cb()
  }
}
