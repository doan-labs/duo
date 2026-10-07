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
 * 3. A storage event or a clean get becomes the new base only when its `rev`
 *    is newer than every revision this copy has incorporated (`rev`), so a
 *    stale echo, replay or out-of-order event can never move the document
 *    backwards. Each adoption then folds the journal: ops the new base covers
 *    are confirmed, and every op it does NOT cover is replayed on top, in seq
 *    order. An accepted op leaves the unconfirmed set only through a covering
 *    document - never through our own ack alone - so a foreign write that
 *    raced ours and lost it is healed by the next pass.
 * 4. Writes are serialized through a single drain: read a stable base (a get
 *    no event interleaved with), replay uncovered ops onto it, stamp, commit.
 *    The storage ack binds the write to its real revision; ops accepted during
 *    the flight stay uncovered and ride the next pass on a fresh base.
 * 5. Deletes persist through doc tombstones (`gone`): a delete beats a racing
 *    edit on any base, and a tombstoned id can never be resurrected by a
 *    replayed op. Caps, merge and clamp rules live in pantry.ts and apply
 *    identically on replay.
 * 6. Nothing reports saved until storage confirms it. A failed get/set keeps
 *    ops uncovered, surfaces `retrying` to the UI and re-runs the drain until
 *    the document converges.
 */

import type { Doc, Op } from './pantry.ts'
import { EMPTY_DOC, parseDoc, serializeDoc } from './pantry.ts'

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
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  /** The view document right now (settled base + uncovered ops). */
  current(): Doc {
    return this.doc
  }

  /** Ops the settled document does not yet provably contain. */
  private uncovered(): Intent[] {
    const covered = this.doc.high[this.me] ?? 0
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
    // Events kept interleaving; the next event or submit will drive adoption.
  }

  /**
   * A freshly read document is the settled truth covering every commit up to
   * `mark`: adopt it and fold the journal on top.
   */
  private takeBase(rev: number, raw: string | null): void {
    if (rev < this.rev) return
    this.rev = rev
    this.seen = Math.max(this.seen, rev)
    this.fold(parseDoc(raw))
  }

  /** Adopt a storage event. Replays and own echoes never move backwards. */
  private adopt(rev: number, raw: string): void {
    if (rev <= this.rev || this.stopped) return
    this.seen = Math.max(this.seen, rev)
    this.rev = rev
    this.fold(parseDoc(raw))
  }

  /**
   * Fold a newer settled document into the view: replay every op the base's
   * marks do not cover, in seq order, so no accepted op is ever regressed out
   * of the document - whether the hole came from a stale echo, a racing
   * foreign write or a folded-away commit that lost.
   */
  private fold(base: Doc): void {
    const covered = base.high[this.me] ?? 0
    let doc = base
    for (const intent of this.ops) {
      if (intent.seq > covered) doc = intent.op.run(doc).doc
    }
    this.doc = doc
    this.emitDoc()
    this.kick()
  }

  /** Serialize the drain: only one get/replay/set pass runs at a time. */
  private kick(): void {
    if (this.draining) {
      this.again = true
      return
    }
    if (!this.needsWrite()) return
    this.draining = true
    void this.drain()
  }

  /**
   * A write is due exactly while the settled base does not cover the whole
   * journal - fresh ops, or an adopted document that lost ops this copy had
   * already committed. A fully covering foreign document never triggers an
   * echo write, so two copies cannot ping-pong.
   */
  private needsWrite(): boolean {
    return this.uncovered().length > 0
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
        const uncovered = this.uncovered()
        if (uncovered.length === 0) {
          this.setStatus('synced')
          return
        }
        // Commit the view document: base + every uncovered op, stamped so its
        // marks prove coverage for anyone adopting it later.
        const text = serializeDoc(this.stamp(this.doc, uncovered))
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

  /** Stamp the write: this copy authored it, through its last applied seq. */
  private stamp(doc: Doc, uncovered: Intent[]): Doc {
    const s = uncovered[uncovered.length - 1]!.seq
    return { ...doc, by: this.me, s, high: { ...doc.high, [this.me]: s } }
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
