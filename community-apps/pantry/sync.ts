/**
 * Document sync engine - the persistence protocol behind the pantry stock.
 *
 * Why: `os.storage` is last-writer-wins on a whole document, and watch events
 * can arrive late, replayed, or out of order relative to our own writes. The
 * old code adopted any newer event wholesale, so a delayed echo of a document
 * written before the user's latest tap could silently drop accepted items.
 *
 * The protocol, stated once and enforced here:
 *
 * 1. Every accepted mutation becomes an `Intent`: a semantic op plus this
 *    copy's monotonically increasing `seq`, appended to the session `ops`
 *    journal. The op is applied optimistically to the view document at accept
 *    time and stays replayable for the life of the copy.
 * 2. Every document written to storage stamps `{by, s}` (author + its last
 *    applied seq) and carries `high`: per-writer high-watermarks propagated
 *    from the base the write was built on. `high[w] >= s` on a settled
 *    document proves the storage chain contained writer w's ops 1..s, because
 *    marks only ever travel forward on a write that built on them.
 * 3. A storage event or a clean get at a newer `rev` becomes the new base and
 *    folds the journal: ops the base covers are confirmed, every op it does
 *    NOT cover is replayed on top, in seq order. An accepted op leaves the
 *    unconfirmed set only through a covering document - never through our own
 *    ack alone - so a foreign write that raced ours and lost it is healed by
 *    the next pass.
 * 4. Adoption is a union, not a replacement. A whole-blob write commits the
 *    payload it was built on, so a set flight staged before a peer's commit
 *    landed can erase rows the store had already confirmed (and this copy had
 *    already adopted). `merge` unions the previous view into the new base:
 *    any row the base neither contains nor tombstones is retained, tombstones
 *    union so real deletes stay dead, and per-writer marks take the max. A
 *    late event at an older rev merges the same way - delivery order is not
 *    causal order - so a peer's confirmed op stays alive in every copy that
 *    ever observed it.
 * 5. Only attested documents adopt or merge. Every protocol write stamps its
 *    author (`by`/`s`) and coverage (`high`), so a blob carrying rows but no
 *    stamp and no marks never passed through the protocol - a forged replay
 *    or a corrupt payload. It folds as empty and contributes nothing to a
 *    merge, while a bare empty blob folds empty harmlessly either way.
 * 6. Writes are serialized through a single drain: read a stable base (a get
 *    no event interleaved with), replay uncovered ops onto it, stamp, commit.
 *    The storage ack binds the write to its real revision; ops accepted during
 *    the flight stay uncovered and ride the next pass on a fresh base. When
 *    the view carries content the settled base does not - an uncovered op or
 *    rows/tombstones a merge restored - the drain writes again, so stale
 *    flights get a repair write instead of a permanent erasure. Bare mark
 *    advances never write on their own, so copies cannot ping-pong.
 * 7. Deletes persist through doc tombstones (`gone`): a delete beats a racing
 *    edit on any base, and a tombstoned id can never be resurrected by a
 *    replayed op or a merge. Caps, merge and clamp rules live in pantry.ts and
 *    apply identically on replay.
 * 8. Nothing reports saved until storage confirms it. A failed get/set keeps
 *    ops uncovered, surfaces `retrying` to the UI and re-runs the drain until
 *    the document converges. Legacy pre-protocol documents (`v != 2`, no
 *    marks or tombstones) still adopt wholesale: last-writer-wins is the only
 *    honest reading of a blob that cannot say what it covered.
 */

import type { Doc, Op } from './pantry.ts'
import { EMPTY_DOC, GONE_CAP, ITEMS_CAP, LIST_CAP, parseDoc, serializeDoc } from './pantry.ts'

/** The storage surface the engine needs; main.tsx binds it to os.storage. */
export type DocStore = {
  /** Latest committed value for the key, or null when never written. */
  get(): Promise<string | null>
  /** Commit a value; resolves with the storage revision of the write. */
  set(v: string): Promise<number>
  /**
   * Subscribe to changes. `rev` is a storage revision; `rev` -1 is the
   * platform's resync sentinel meaning history was lost and the doc must be
   * re-read. Returns an unsubscribe.
   */
  watch(cb: (e: { rev: number; v?: string }) => void): () => void
}

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'retrying'

export type SyncOpts = {
  /** Stable id for this copy (both displays write; each is its own writer). */
  me: string
  store: DocStore
  /** New document to render, after submits and foreign adoptions. */
  onDoc(doc: Doc): void
  /** Status for the sync affordance; `retrying` means a write failed. */
  onStatus?(s: SyncStatus): void
  /** Called when the engine could not reach storage (get/set rejected). */
  onError?(): void
  /** Failure retry delay; tests shrink it. Default RETRY_MS. */
  retryMs?: number
}

type Intent = { seq: number; op: Op }

/**
 * True when `a` covers every writer at least as far as `b` - the doc with
 * marks `a` is provably the more complete document, so its rows win merges.
 */
function dominates(a: Record<string, number>, b: Record<string, number>): boolean {
  for (const w of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[w] ?? 0) < (b[w] ?? 0)) return false
  }
  return true
}

/** A get is retried this many times when an event lands while it reads. */
const GET_CLEAN_TRIES = 4
/** Delay before a failed drain runs again while ops are still uncovered. */
const RETRY_MS = 1_500

export class PantrySync {
  private me: string
  private store: DocStore
  private onDoc: (doc: Doc) => void
  private onStatus: (s: SyncStatus) => void
  private onError: () => void
  private retryMs: number

  /** Revision incorporated into `doc`'s settled base. -1 before first read. */
  private rev = -1
  /** View document: settled base + every uncovered op replayed on top. */
  private doc: Doc = { ...EMPTY_DOC }
  /** Highest revision ever observed; stale echoes and replays never pass it. */
  private seen = 0
  /**
   * Journal of every accepted op in seq order. Ops are never evicted: any
   * future adopted document whose marks do not cover one was built on a base
   * that lost it, and the op must be replayable again.
   */
  private ops: Intent[] = []
  private seq = 0
  /** The settled document `doc` is built on: the last adopted or read base,
   * before journal replay and merge retention. Its marks say exactly which
   * coverage storage currently proves.
   */
  private base: Doc = { ...EMPTY_DOC }
  private status: SyncStatus = 'loading'
  private draining = false
  private again = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private unwatch: (() => void) | null = null
  private stopped = false

  constructor(opts: SyncOpts) {
    this.me = opts.me
    this.store = opts.store
    this.onDoc = opts.onDoc
    this.onStatus = opts.onStatus ?? (() => {})
    this.onError = opts.onError ?? (() => {})
    this.retryMs = opts.retryMs ?? RETRY_MS
  }

  /** Snapshot + watch subscription. Returns a teardown. */
  start(): () => void {
    void this.refresh()
    this.unwatch = this.store.watch((e) => {
      if (e.rev === -1 || e.v === undefined) {
        // Resync sentinel or a bare invalidation: re-read the real bytes.
        void this.refresh()
        return
      }
      this.adopt(e.rev, e.v)
    })
    return () => this.dispose()
  }

  dispose(): void {
    this.stopped = true
    this.unwatch?.()
    this.unwatch = null
    this.again = false // a parked drain must not re-enter: kick() also guards on stopped
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  /** The view document right now (settled base + uncovered ops). */
  current(): Doc {
    return this.doc
  }

  /** Ops the settled document does not yet provably contain. Coverage reads
   * the BASE, never the merged view: the view's own marks can run ahead of
   * storage after a stale write superseded a committed one, and those ops
   * still have to be written again.
   */
  private uncovered(): Intent[] {
    const covered = this.base.high[this.me] ?? 0
    return this.ops.filter((i) => i.seq > covered)
  }

  pendingCount(): number {
    return this.uncovered().length
  }

  /**
   * Accept one user mutation. Applies it to the view document immediately and
   * journals it for persistence; returns the op's accept-time metadata. The
   * live/hidden gate sits in main.tsx's mutate wrapper, which must reject
   * hidden input before calling this - an admitted op is allowed to finish
   * draining even after the copy folds away.
   */
  submit(op: Op): { meta?: unknown } {
    if (this.stopped) return {}
    this.seq += 1
    const out = op.run(this.doc)
    if (out.commit) {
      this.ops.push({ seq: this.seq, op })
      this.doc = out.doc
      this.emitDoc()
      this.kick()
    } else if (out.doc !== this.doc) {
      this.doc = out.doc
      this.emitDoc()
    }
    return { meta: out.meta }
  }

  /** Re-read the settled document; used on start, resync and after writes. */
  private async refresh(): Promise<void> {
    for (let i = 0; i < GET_CLEAN_TRIES; i++) {
      const mark = this.seen
      let raw: string | null
      try {
        raw = await this.store.get()
      } catch {
        this.fail()
        return
      }
      if (this.stopped) return
      if (this.seen !== mark) continue // an event arrived mid-read; re-read
      this.takeBase(mark, raw)
      return
    }
    // Events kept interleaving; their adoptions already folded the journal.
    // Without a settled base this copy has never read successfully - retry
    // rather than sit in `loading` until some unrelated event rescues it.
    if (this.stopped) return
    if (this.rev < 0) this.fail()
    else this.kick()
  }

  /**
   * A freshly read document is the settled truth covering every commit up to
   * `mark`: adopt it and fold the journal on top. An unattested blob - one no
   * protocol write could have produced - reads as corrupt and folds empty.
   */
  private takeBase(rev: number, raw: string | null): void {
    if (rev < this.rev) return
    this.rev = rev
    this.seen = Math.max(this.seen, rev)
    const base = parseDoc(raw)
    this.fold(this.attested(base) || base.legacy ? base : { ...EMPTY_DOC })
  }

  /**
   * A document that carried rows only gets on the wire through a protocol
   * write, and every write stamps its author (`by`/`s`) and coverage (`high`).
   * A parsed blob carrying neither proves nothing about what committed, so its
   * rows can be a forged replay - adopted as empty instead of trusted.
   */
  private attested(doc: Doc): boolean {
    return doc.s > 0 || Object.keys(doc.high).length > 0
  }

  /** Adopt a storage event. A newer revision folds; an older one still merges
   * any committed content the view lacks, because a set flight can land its
   * stale payload at a higher revision and physically erase confirmed rows.
   */
  private adopt(rev: number, raw: string): void {
    if (this.stopped) return
    this.seen = Math.max(this.seen, rev)
    const inc = parseDoc(raw)
    if (rev <= this.rev) {
      this.mergeIntoView(inc)
      return
    }
    this.rev = rev
    this.fold(this.attested(inc) || inc.legacy ? inc : { ...EMPTY_DOC })
  }

  /**
   * Fold a newer settled document into the view: replay every op the base's
   * marks do not cover, in seq order, then union in whatever the previous
   * view already held - the base cannot claim coverage for rows a stale
   * whole-blob writer dropped, so they are retained rather than regressed
   * away. When the base regresses any writer's mark, the previous view is
   * the more complete document and wins row conflicts.
   */
  private fold(base: Doc): void {
    if (this.stopped) return
    this.base = base
    const covered = base.high[this.me] ?? 0
    let doc = base
    for (const intent of this.ops) {
      if (intent.seq > covered) doc = intent.op.run(doc).doc
    }
    this.doc = doc.legacy ? doc : this.merge(doc, this.doc)
    this.emitDoc()
    this.kick()
  }

  /**
   * Union a document delivered out of order into the view: its committed rows
   * survive on the merged document even though its revision lost the race.
   * Legacy blobs cannot say what they covered, so they add nothing here.
   */
  private mergeIntoView(inc: Doc): void {
    if (this.stopped || inc.legacy || this.doc.legacy) return
    // Only merge content a writer's chain attests: a blob with no marks and no
    // stamp never passed through the protocol, so its rows prove nothing and
    // replaying them could resurrect content that never committed.
    if (!this.attested(inc)) return
    this.doc = this.merge(this.doc, inc)
    this.emitDoc()
    this.kick()
  }

  /**
   * Union two protocol documents with tombstone precedence. `into` keeps the
   * rows it holds, gains the rows `from` carries that `into` neither contains
   * nor tombstones (a stale blob can only drop rows by omission, and a union
   * restores them), tombstones union so a delete beats a resurrecting merge,
   * and each writer's mark takes the max - the merged document honestly
   * contains that coverage. Conflicting rows prefer `from` only when `from`
   * covers everything `into` does; a partially stale `into` never wins.
   */
  private merge(into: Doc, from: Doc): Doc {
    const gone = into.gone.slice()
    for (const id of from.gone) if (!gone.includes(id)) gone.push(id)
    const trimmed = gone.length > GONE_CAP ? gone.slice(-GONE_CAP) : gone
    const dead = new Set(trimmed)
    const preferFrom = dominates(from.high, into.high)
    const pick = <T extends { id: string }>(first: T[], second: T[], cap: number): T[] => {
      const other = new Map(second.map((r) => [r.id, r]))
      const out: T[] = []
      const ids = new Set<string>()
      for (const row of first) {
        if (dead.has(row.id)) continue
        ids.add(row.id)
        out.push(preferFrom ? (other.get(row.id) ?? row) : row)
      }
      for (const row of second) {
        if (out.length >= cap) break
        if (!ids.has(row.id) && !dead.has(row.id)) {
          ids.add(row.id)
          out.push(row)
        }
      }
      return out
    }
    const high = { ...into.high }
    for (const [w, s] of Object.entries(from.high)) {
      if (s > (high[w] ?? 0)) high[w] = s
    }
    return {
      ...into,
      items: pick(into.items, from.items, ITEMS_CAP),
      list: pick(into.list, from.list, LIST_CAP),
      muted: preferFrom ? from.muted : into.muted,
      high,
      gone: trimmed
    }
  }

  /** Serialize the drain: only one get/replay/set pass runs at a time. */
  private kick(): void {
    if (this.stopped) return
    if (this.draining) {
      this.again = true
      return
    }
    if (!this.needsWrite()) {
      // Reached only after a settled base landed (takeBase/adopt) - an empty
      // journal or a fully covering document is genuinely done, so say so.
      // Before any base the status honestly stays `loading`/`retrying`.
      if (this.rev >= 0) this.setStatus('synced')
      return
    }
    this.draining = true
    void this.drain()
  }

  /**
   * A write is due while the settled base does not cover the whole journal -
   * fresh ops, or an adopted document that lost ops this copy had already
   * committed - or while the view carries committed foreign content the base
   * lacks: rows whose ids or contents differ, tombstones, or muted state.
   * That second clause is the repair write: a stale whole-blob commit erased
   * rows the view had observed, so they go back on the wire. Bare mark
   * advances never write on their own - they ride the next real write - so
   * two copies cannot ping-pong over provenance alone.
   */
  private needsWrite(): boolean {
    if (this.uncovered().length > 0) return true
    const base = this.base
    if (this.doc.muted !== base.muted) return true
    if (this.doc.gone.length !== base.gone.length || this.doc.gone.some((id) => !base.gone.includes(id))) return true
    const contentDiffers = <T extends { id: string }>(view: T[], settled: T[]): boolean => {
      const inBase = new Map(settled.map((row) => [row.id, row]))
      return view.some((row) => {
        const other = inBase.get(row.id)
        return other === undefined || JSON.stringify(other) !== JSON.stringify(row)
      })
    }
    return contentDiffers(this.doc.items, base.items) || contentDiffers(this.doc.list, base.list)
  }

  private async drain(): Promise<void> {
    this.setStatus('saving')
    let pass = 0
    try {
      for (;;) {
        if (this.stopped) return
        if (++pass > 12) {
          // A storm of foreign writes keeps superseding us; back off and let
          // the retry timer re-run the drain once things quiesce.
          this.fail()
          return
        }
        this.again = false
        // Stable base: a get that no storage event interleaved with.
        let raw: string | null | undefined
        for (let i = 0; i < GET_CLEAN_TRIES; i++) {
          const mark = this.seen
          try {
            raw = await this.store.get()
          } catch {
            this.fail()
            return
          }
          if (this.stopped) return
          if (this.seen === mark) break
          raw = undefined
        }
        if (raw === undefined) return // events kept arriving; their folds re-kick
        // Fold the freshest committed doc (a no-op when nothing newer landed).
        if (this.rev <= this.seen) {
          this.rev = this.seen
          this.fold(parseDoc(raw))
        }
        if (this.stopped) return
        if (!this.needsWrite()) {
          this.setStatus('synced')
          return
        }
        // Commit the view document: base + every uncovered op and retained
        // foreign progress, stamped so its marks prove coverage for anyone
        // adopting it later.
        const text = serializeDoc(this.stamp(this.doc))
        let rev: number
        try {
          rev = await this.store.set(text)
        } catch {
          this.fail()
          return
        }
        if (this.stopped) return
        this.seen = Math.max(this.seen, rev)
        // The ack binds our write to its real revision. If an event already
        // carried something newer, keep its document; ours is superseded and
        // its ops replay onto the newer base on the next pass.
        if (rev >= this.rev) {
          this.rev = rev
          this.fold(parseDoc(text))
        }
        if (!this.needsWrite()) {
          this.setStatus('synced')
          return
        }
      }
    } finally {
      this.draining = false
      if (this.again) this.kick()
    }
  }

  /**
   * Fill in the writer fields on the document about to be committed. A repair
   * write can run with no ops of its own (seq 0): it stamps authorship and the
   * coverage it carries without claiming a seq mark it never wrote.
   */
  private stamp(doc: Doc): Doc {
    const high = this.seq > 0 ? { ...doc.high, [this.me]: this.seq } : { ...doc.high }
    return { ...doc, by: this.me, s: this.seq, high }
  }

  private fail(): void {
    if (this.stopped) return
    // Do not let the drain's `again` flag re-enter immediately: a rejection
    // loop must wait for the retry timer, not spin on resolved promises.
    this.again = false
    this.onError()
    this.setStatus('retrying')
    if (this.retryTimer === null) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null
        if (this.rev < 0) void this.refresh() // initial snapshot never landed
        this.kick()
      }, this.retryMs)
    }
  }

  private emitDoc(): void {
    this.onDoc(this.doc)
  }

  private setStatus(s: SyncStatus): void {
    if (this.status === s) return
    this.status = s
    this.onStatus(s)
  }
}
