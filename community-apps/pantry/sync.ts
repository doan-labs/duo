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
 * 4. Adoption is a union, not a replacement - gated by causality. A
 *    whole-blob write commits the payload it was built on, so a set flight
 *    staged before a peer's commit landed can erase rows the store had
 *    already confirmed (and this copy had already adopted). `merge` unions
 *    the previous view into the new base, but only rows that carry
 *    information the base does not: a document whose `high` marks are wholly
 *    covered by the current one contributes nothing (every op it attests is
 *    already applied, so rows it has that we lack were dropped on purpose -
 *    tombstoned or cap-evicted, never resurrected), and a row whose `src`
 *    provenance marks are all covered was deliberately absent. Rows without
 *    provenance are adopted conservatively. Tombstones union so real deletes
 *    stay dead, and per-writer marks take the max.
 * 5. Only attested documents adopt or merge. Every protocol write stamps its
 *    author (`by`/`s`) and coverage (`high`), so a blob carrying rows but no
 *    stamp and no marks never passed through the protocol - a forged replay
 *    or a corrupt payload. It folds as empty and contributes nothing to a
 *    merge, while a bare empty blob folds empty harmlessly either way.
 * 6. Writes are serialized through a single drain, and every commit is a
 *    conditional write (SDK `entry`/`set` with an `expect` token). The pass
 *    reads the base and its token in one transaction, replays uncovered ops
 *    onto it, stamps, and commits conditioned on that exact `{rev, gen}`. A
 *    write that loses the race rejects E_CONFLICT with zero effects - the
 *    store itself refuses to land a stale payload - so the next pass re-reads
 *    and rebases the same intents onto the moved base instead of resubmitting
 *    a frozen document. E_GONE means the token's generation died (a restore
 *    regressed the space): the rev floor resets and the pass re-reads under
 *    the live generation. An ambiguous failure (E_TIMEOUT, a dropped or
 *    unlabeled rejection) never assumes failure: the engine reads the key
 *    back, and retries only when the same operation's coverage is genuinely
 *    absent - a doc that already covers `high[me]` proves the write landed or
 *    was superseded by a fuller peer write. Ops keep their assigned ids, so a
 *    retry that turns out to be a second landing merges, never duplicates.
 *    The storage ack binds the write to its real revision; ops accepted
 *    during the flight stay uncovered and ride the next pass on a fresh base.
 *    When the view carries content the settled base does not - an uncovered
 *    op or rows/tombstones a merge restored - the drain writes again, so a
 *    base that lost confirmed rows gets a repair write. Bare mark advances
 *    never write on their own, so copies cannot ping-pong.
 * 7. Operation receipts are the teardown path. A stale in-flight write that
 *    lands after every engine disposed would erase a peer's confirmed op even
 *    though this copy had observed it - memory journals die with their copy.
 *    So each display slot keeps a durable op log (`os.storage` key
 *    `pantry-ops-<slot>`, one bounded whole-value log per slot, written
 *    before its document commit, under the same conditional contract): a
 *    relaunching copy replays receipt entries the settled document does not
 *    cover, then covers them and lets the log trim them away. Entries covered
 *    by a committed document are dropped, so the log stays small; entries are
 *    never evicted while uncovered unless the bounded cap forces it. Under
 *    conditional writes the dead copy's stale doc commit rejects outright,
 *    and the receipt is what carries ops accepted but never committed.
 * 8. `src` provenance makes same-batch convergence exact. Replaying an add
 *    that semantically merges into a peer's row used to leave the replaying
 *    copy's own-id row behind too - unioning by random id double-counted one
 *    op. Every op run now stamps its `{writer: seq}` on the row it touched,
 *    and merge folds rows in the same batch: a row whose `src` is a subset of
 *    a sibling's is a replayed duplicate and drops; rows with disjoint
 *    provenance are genuinely concurrent adds and sum onto the canonical
 *    (lowest-id) row - the same result journal replay produces.
 * 9. Deletes persist through doc tombstones (`gone`): a delete beats a racing
 *    edit on any base, and bounded tomb trimming cannot resurrect a row
 *    because rule 4's coverage gate - not the tombstone - is what stops a
 *    covered document re-adding it. Caps, merge and clamp rules live in
 *    pantry.ts and apply identically on replay.
 * 10. Nothing reports saved until storage confirms it. A failed get/set keeps
 *    ops uncovered, surfaces `retrying` to the UI and re-runs the drain until
 *    the document converges. Legacy pre-protocol documents (`v != 2`, no
 *    marks or tombstones) still adopt wholesale: last-writer-wins is the only
 *    honest reading of a blob that cannot say what it covered. A storage
 *    adapter without the ops channel keeps full merge protection but cannot
 *    recover an op that no surviving copy observed through a dead writer's
 *    in-flight commit - that is a stated limit of a single-key store.
 */

import type { Doc, Item, Op, WireOp } from './pantry.ts'
import { EMPTY_DOC, GONE_CAP, ITEMS_CAP, LIST_CAP, MAX_MILLI, parseDoc, serializeDoc, unpackOp } from './pantry.ts'

/**
 * One committed value plus the token to condition a write on it. `rev` counts
 * every write in the space (sibling keys included), so an `expect` token is
 * conservative: any foreign commit since the read conflicts. `gen` binds the
 * token to the app generation it was read in - a restore that regresses rev
 * answers E_GONE instead of letting an old precondition match again.
 */
export type StoreEntry = { v: string | null; rev: number; gen: number }
export type StoreExpect = { rev: number; gen: number }

/** The storage surface the engine needs; main.tsx binds it to os.storage. */
export type DocStore = {
  /**
   * Latest committed value AND the precondition token it was read at, from
   * one atomic transaction. A rejection is a failed read, never an empty
   * document - callers must not seed on failure.
   */
  entry(): Promise<StoreEntry>
  /**
   * Conditional commit: resolves with the new storage revision. Rejects with
   * E_CONFLICT when the space moved since `expect` (zero effects - rebase and
   * retry), E_GONE when the token's generation is dead (re-read before
   * retrying), E_TIMEOUT or another ambiguous failure when the outcome is
   * unknown (read back before retrying), or a hard error like E_QUOTA.
   */
  set(v: string, expect: StoreExpect): Promise<number>
  /**
   * Subscribe to changes. `rev` is a storage revision; `rev` -1 is the
   * platform's resync sentinel meaning history was lost and the doc must be
   * re-read. An event carrying `slot` is a receipt-log update for that
   * display slot, not a document payload. Returns an unsubscribe.
   */
  watch(cb: (e: { rev: number; v?: string; slot?: string }) => void): () => void
  /**
   * Optional per-slot receipt channel: one bounded op log per display,
   * written before its document commit so a confirmed op survives even when
   * every engine that saw it is gone. Same conditional-write contract as the
   * document key. Without it, dead-writer teardown loss stays a documented
   * single-key limit.
   */
  ops?: {
    entry(slot: string): Promise<StoreEntry>
    set(slot: string, v: string, expect: StoreExpect): Promise<number>
  }
}

/**
 * Storage error classification. The SDK throws PlatformError carrying a
 * `.code`; fakes in tests throw plain objects with the same field. Anything
 * unlabeled is treated as an ambiguous failure - the outcome is unknown, so
 * the engine reads back instead of assuming the write failed.
 */
export function storeCode(e: unknown): string {
  const code = (e as { code?: unknown } | null | undefined)?.code
  return typeof code === 'string' ? code : ''
}

/** Errors where the write provably did not commit and a rebase may proceed. */
const REBASE_CODES = new Set(['E_CONFLICT', 'E_GONE'])
/** Errors where the outcome is unknown: the write may have landed. */
const UNKNOWN_CODES = new Set(['', 'E_TIMEOUT', 'E_STORAGE', 'E_CLOSED'])

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'retrying'

export type SyncOpts = {
  /** Stable id for this copy (both displays write; each is its own writer). */
  me: string
  store: DocStore
  /**
   * This copy's receipt slot (os.view.display: 'inner' | 'cover'). Required
   * with `store.ops` for the durable receipt log.
   */
  slot?: string
  /** All receipt slots to read, including this copy's own. */
  peerSlots?: string[]
  /** New document to render, after submits and foreign adoptions. */
  onDoc(doc: Doc): void
  /** Status for the sync affordance; `retrying` means a write failed. */
  onStatus?(s: SyncStatus): void
  /** Called when the engine could not reach storage (get/set rejected). */
  onError?(): void
  /** Failure retry delay; tests shrink it. Default RETRY_MS. */
  retryMs?: number
}

type Intent = { w: string; seq: number; op: Op }

/** One entry in a slot's durable op log. */
type Receipt = { w: string; s: number; o: WireOp }

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

/** Delay before a failed drain runs again while ops are still uncovered. */
const RETRY_MS = 1_500
/** Bound on one slot's receipt log; covered entries are dropped first. */
const RECEIPT_CAP = 512

/** Parse a slot receipt log tolerantly: malformed entries drop, never crash. */
function parseReceipts(raw: string | null | undefined): Receipt[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw) as { v?: unknown; ops?: unknown }
    if (p.v !== 1 || !Array.isArray(p.ops)) return []
    const out: Receipt[] = []
    for (const e of p.ops) {
      if (typeof e !== 'object' || e === null) continue
      const r = e as Record<string, unknown>
      if (typeof r.w !== 'string' || !r.w) continue
      if (!Number.isSafeInteger(r.s) || (r.s as number) <= 0) continue
      if (typeof r.o !== 'object' || r.o === null) continue
      out.push({ w: r.w, s: r.s as number, o: r.o as WireOp })
      if (out.length >= RECEIPT_CAP) break
    }
    return out
  } catch {
    return []
  }
}

function serializeReceipts(entries: Receipt[]): string {
  return JSON.stringify({ v: 1, ops: entries })
}

/** Batch key for provenance dedupe: same name/unit/shelf/date merge target. */
function batchKey(i: Item): string {
  return [i.name.toLowerCase(), i.unit, i.location, i.bestBefore ?? ''].join('\u0001')
}

const srcSubset = (a?: Record<string, number>, b?: Record<string, number>): boolean =>
  a !== undefined && b !== undefined && Object.entries(a).every(([w, s]) => (b[w] ?? 0) >= s)

/**
 * Fold same-batch rows down to the canonical result op replay produces: one
 * row per batch whose quantity is the sum of every contributing op. A row
 * whose `src` is a subset of a sibling's is a replayed duplicate and drops.
 * Rows with disjoint provenance are genuinely concurrent adds - they sum
 * onto the lowest-id row so every copy converges to the same survivor.
 * Rows sharing a writer without a subset relation, or lacking `src`, cannot
 * be proven duplicates and stay.
 */
function dedupeBatches(rows: Item[]): Item[] {
  const out: Item[] = []
  const batchIx = new Map<string, number[]>()
  for (const row of rows) {
    const key = batchKey(row)
    let group = batchIx.get(key)
    if (!group) {
      group = []
      batchIx.set(key, group)
    }
    let absorbed = false
    for (const ix of group) {
      const cur = out[ix]!
      if (srcSubset(row.src, cur.src)) {
        absorbed = true
        break
      }
      if (srcSubset(cur.src, row.src)) {
        out[ix] = row
        absorbed = true
        break
      }
      if (row.src && cur.src && !Object.keys(row.src).some((w) => cur.src?.[w] !== undefined)) {
        const canon = cur.id <= row.id ? cur : row
        const other = canon === cur ? row : cur
        const src = { ...(other.src ?? {}) }
        for (const [w, s] of Object.entries(canon.src ?? {})) src[w] = Math.max(src[w] ?? 0, s)
        out[ix] = { ...canon, milli: Math.min(MAX_MILLI, canon.milli + other.milli), src }
        absorbed = true
        break
      }
    }
    if (!absorbed) {
      group.push(out.length)
      out.push(row)
    }
  }
  return out
}

export class PantrySync {
  private me: string
  private store: DocStore
  private slot: string | null
  private peerSlots: string[]
  private onDoc: (doc: Doc) => void
  private onStatus: (s: SyncStatus) => void
  private onError: () => void
  private retryMs: number

  /** Revision incorporated into `doc`'s settled base. -1 before first read. */
  private rev = -1
  /**
   * Generation the rev floor belongs to. A restore bumps it and regresses
   * rev, so tokens and adoption floors from the old generation must be
   * dropped - a stale floor would pin a dead space's state forever.
   */
  private gen = -1
  /** View document: settled base + every uncovered op replayed on top. */
  private doc: Doc = { ...EMPTY_DOC }
  /**
   * Journal of every accepted op in seq order. Ops are never evicted: any
   * future adopted document whose marks do not cover one was built on a base
   * that lost it, and the op must be replayable again.
   */
  private ops: Intent[] = []
  private seq = 0
  /**
   * Foreign ops read back from the durable per-slot receipt logs, per writer
   * in seq order. They replay exactly like own ops: anything the settled
   * base does not cover is pending work this copy must carry forward.
   */
  private receipts = new Map<string, Intent[]>()
  /**
   * Highest seq per writer the view has actually applied (own + receipt
   * replays). Stamped into `high` on commit so the written document only
   * claims coverage it really contains.
   */
  private appliedHigh: Record<string, number> = {}
  /** Highest own seq already landed in the durable receipt log. */
  private receiptWatermark = 0
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
    this.slot = opts.slot ?? null
    this.peerSlots = opts.peerSlots ?? (this.slot ? [this.slot] : [])
    this.onDoc = opts.onDoc
    this.onStatus = opts.onStatus ?? (() => {})
    this.onError = opts.onError ?? (() => {})
    this.retryMs = opts.retryMs ?? RETRY_MS
  }

  /** Snapshot + watch subscription. Returns a teardown. */
  start(): () => void {
    void this.refresh()
    this.unwatch = this.store.watch((e) => {
      if (e.slot !== undefined) {
        // A receipt log changed: ingest its ops, refold onto the same base.
        if (e.v !== undefined) this.adoptReceipt(e.v)
        else void this.loadReceipts().then(() => this.fold(this.base))
        return
      }
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
    const out = op.run(this.doc, { w: this.me, s: this.seq })
    if (out.commit) {
      this.ops.push({ w: this.me, seq: this.seq, op })
      this.appliedHigh[this.me] = this.seq
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
    // Receipt logs first: they carry confirmed ops the settled document may
    // not cover yet, and the fold below needs them in place before it runs.
    if (!(await this.loadReceipts())) return
    let entry: StoreEntry
    try {
      entry = await this.store.entry()
    } catch {
      this.fail()
      return
    }
    if (this.stopped) return
    // One atomic read: the value and its revision always describe the same
    // committed moment, and a failed read is never treated as an empty doc.
    this.noteEntry(entry)
    this.takeBase(entry.rev, entry.v)
  }

  /**
   * Reconcile an entry read's generation with the rev floor. Within one
   * generation revs are monotonic across the whole space; a bumped gen means
   * the space was restored, so the old floor and any same-looking rev numbers
   * from it no longer apply.
   */
  private noteEntry(e: StoreEntry): void {
    if (this.gen !== -1 && e.gen !== this.gen) this.rev = -1
    this.gen = e.gen
  }

  /**
   * A freshly read document is the settled truth covering every commit up to
   * `rev`: adopt it and fold the journal on top. An unattested blob - one no
   * protocol write could have produced - reads as corrupt and folds empty.
   */
  private takeBase(rev: number, raw: string | null): void {
    if (rev < this.rev) return
    this.rev = rev
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

  /** Read every peer slot's receipt log into `receipts`. */
  private async loadReceipts(): Promise<boolean> {
    const ops = this.store.ops
    if (!ops) return true
    for (const slot of this.peerSlots) {
      let raw: string | null
      try {
        raw = (await ops.entry(slot)).v
      } catch {
        this.fail()
        return false
      }
      if (this.stopped) return false
      this.ingestReceipts(raw)
    }
    return true
  }

  /**
   * Merge one slot's receipt log into the pending set. Own-writer entries
   * are skipped - the session journal is authoritative for them. Returns
   * true when the log added something new.
   */
  private ingestReceipts(raw: string | null | undefined): boolean {
    let grew = false
    for (const e of parseReceipts(raw)) {
      if (e.w === this.me) continue
      const op = unpackOp(e.o)
      if (!op) continue
      const list = this.receipts.get(e.w) ?? []
      if (list.some((i) => i.seq === e.s)) continue
      list.push({ w: e.w, seq: e.s, op })
      list.sort((a, b) => a.seq - b.seq)
      this.receipts.set(e.w, list)
      grew = true
    }
    return grew
  }

  /** A peer slot's log landed on the watch channel. */
  private adoptReceipt(v: string): void {
    if (this.stopped) return
    if (this.ingestReceipts(v)) this.fold(this.base)
  }

  /**
   * Foreign ops in receipt logs that the settled base does not cover -
   * confirmed work a writer committed before it went away, which this copy
   * must now carry into the document so coverage can move past it.
   */
  private uncoveredForeign(): Intent[] {
    const out: Intent[] = []
    for (const [w, list] of this.receipts) {
      const covered = this.base.high[w] ?? 0
      for (const i of list) if (i.seq > covered) out.push(i)
    }
    return out
  }

  /**
   * Every op the view must contain beyond the settled base, in the one
   * order every copy converges to: writer id, then seq. Deterministic
   * ordering is what makes same-batch merges fold to the same row on both
   * displays no matter who applied first.
   */
  private pendingIntents(): Intent[] {
    return [...this.uncovered(), ...this.uncoveredForeign()].sort((a, b) =>
      a.w < b.w ? -1 : a.w > b.w ? 1 : a.seq - b.seq
    )
  }

  /** Adopt a storage event. A newer revision folds; an older one still merges
   * any committed content the view lacks, because a set flight can land its
   * stale payload at a higher revision and physically erase confirmed rows.
   */
  private adopt(rev: number, raw: string): void {
    if (this.stopped) return
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
    let doc = base
    for (const intent of this.pendingIntents()) {
      doc = intent.op.run(doc, { w: intent.w, s: intent.seq }).doc
      this.appliedHigh[intent.w] = Math.max(this.appliedHigh[intent.w] ?? 0, intent.seq)
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
    // A document wholly covered by `into` attests nothing `into` lacks, so
    // none of its rows may enter: any row only it carries was dropped from
    // the covering chain on purpose (deleted or evicted). This is what stops
    // a replayed stale snapshot from resurrecting a tombstoned row whose
    // tombstone was trimmed.
    const fromCovered = this.attested(from) && dominates(into.high, from.high)
    // A row whose provenance is already covered by `into`'s marks was
    // deliberately absent from it - dropping it is what delete/merge ops did.
    const rowCovered = (row: { src?: Record<string, number> }): boolean =>
      row.src !== undefined && Object.entries(row.src).every(([w, s]) => (into.high[w] ?? 0) >= s)
    const pick = <T extends { id: string; src?: Record<string, number> }>(
      first: T[],
      second: T[],
      cap: number
    ): T[] => {
      const other = new Map(second.map((r) => [r.id, r]))
      const out: T[] = []
      const ids = new Set<string>()
      // For rows both sides carry, keep the one whose provenance covers the
      // other's: a row rebuilt by a fresh replay must not be replaced by the
      // stale view's copy, and a stale base must not regress an observed
      // newer row. Only when neither src contains the other does whole-doc
      // dominance (preferFrom) decide - the old blanket rule.
      const pickRow = (a: T, b: T): T => {
        if (srcSubset(a.src, b.src)) return b
        if (srcSubset(b.src, a.src)) return a
        return preferFrom ? b : a
      }
      for (const row of first) {
        if (dead.has(row.id)) continue
        ids.add(row.id)
        const alt = other.get(row.id)
        out.push(alt === undefined ? row : pickRow(row, alt))
      }
      for (const row of second) {
        if (out.length >= cap) break
        if (ids.has(row.id) || dead.has(row.id)) continue
        if (fromCovered || rowCovered(row)) continue
        ids.add(row.id)
        out.push(row)
      }
      return out
    }
    const high = { ...into.high }
    for (const [w, s] of Object.entries(from.high)) {
      if (s > (high[w] ?? 0)) high[w] = s
    }
    return {
      ...into,
      items: dedupeBatches(pick(into.items, from.items, ITEMS_CAP)),
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
    if (this.uncovered().length > 0 || this.uncoveredForeign().length > 0) return true
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
    let unknowns = 0
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
        // The receipt log lands before the document: ops must be durable in
        // the slot first so a crash or teardown between the two writes still
        // leaves the confirmed ops recoverable by a relaunching copy.
        const receipt = await this.writeReceipt()
        if (receipt === 'fail') return
        if (receipt === 'gone') continue // generation moved; re-read everything
        if (this.stopped) return
        // Base and commit token from one atomic read. The receipt write above
        // moved the space rev, so the token must come from an entry read AFTER
        // it - a captured-early token would conflict on our own receipt.
        let entry: StoreEntry
        try {
          entry = await this.store.entry()
        } catch {
          this.fail()
          return
        }
        if (this.stopped) return
        this.noteEntry(entry)
        this.takeBase(entry.rev, entry.v)
        if (this.stopped) return
        if (!this.needsWrite()) {
          this.setStatus('synced')
          return
        }
        // Commit the view document conditioned on the base it was built on:
        // a foreign write since the read rejects E_CONFLICT (zero effects -
        // the next pass rebases onto the moved base), a dead generation
        // rejects E_GONE (re-read under the live one), and only a clean pass
        // through the store's own transaction actually lands.
        const text = serializeDoc(this.stamp(this.doc))
        let rev: number
        try {
          rev = await this.store.set(text, { rev: entry.rev, gen: entry.gen })
          unknowns = 0
        } catch (e) {
          const code = storeCode(e)
          if (REBASE_CODES.has(code)) continue
          if (UNKNOWN_CODES.has(code)) {
            // Ambiguous outcome: the write may have landed. Read the key back
            // and check the same operation's identity - a committed document
            // covering our journal proves it did (or a fuller peer write did).
            const back = await this.readback(text)
            if (back === 'fail') return
            if (back === 'covered') {
              unknowns = 0
              continue
            }
            if (++unknowns >= 3) {
              this.fail()
              return
            }
            continue // rebase the same intents onto the read-back base
          }
          this.fail() // E_QUOTA, E_ARGS, E_DENIED... honest retry path
          return
        }
        if (this.stopped) return
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
   * Resolve an ambiguous commit: re-read the document key and compare what
   * committed against the operation identity we tried to write. Our exact
   * payload, or any attested document whose marks cover this writer's full
   * journal, means the write's facts are durable - covered. Anything else
   * means the write did not land; the returned entry becomes the next pass's
   * base so the same intents (same ids, same seqs) rebase onto it.
   */
  private async readback(committedText: string): Promise<'covered' | 'uncovered' | 'fail'> {
    let entry: StoreEntry
    try {
      entry = await this.store.entry()
    } catch {
      this.fail()
      return 'fail'
    }
    if (this.stopped) return 'fail'
    this.noteEntry(entry)
    const doc = parseDoc(entry.v)
    const landed = entry.v === committedText || (this.attested(doc) && (doc.high[this.me] ?? 0) >= this.seq)
    this.takeBase(entry.rev, entry.v)
    return landed ? 'covered' : 'uncovered'
  }

  /**
   * Write this slot's receipt log under the same conditional contract as the
   * document: the union of what's already there and this copy's whole
   * journal, minus anything the settled base already covers (those ops are
   * durable inside the document). Bounded to RECEIPT_CAP with newest kept.
   * A relaunched copy on the same slot can race a dying writer's late write;
   * the precondition rejects that stale commit instead of clobbering the
   * live log, and the next attempt unions onto the reread log. Returns
   * 'gone' when the token's generation died (the caller restarts the whole
   * pass under the live one).
   */
  private async writeReceipt(): Promise<'ok' | 'gone' | 'fail'> {
    const ops = this.store.ops
    if (!ops || this.slot === null || this.seq <= this.receiptWatermark) return 'ok'
    for (let attempt = 0; attempt < 4; attempt++) {
      let entry: StoreEntry
      try {
        entry = await ops.entry(this.slot)
      } catch {
        this.fail()
        return 'fail'
      }
      if (this.stopped) return 'fail'
      this.noteEntry(entry)
      const entries = parseReceipts(entry.v)
      const have = new Set(entries.map((e) => `${e.w}:${e.s}`))
      for (const it of this.ops) {
        if (have.has(`${it.w}:${it.seq}`)) continue
        entries.push({ w: it.w, s: it.seq, o: it.op.pack() })
      }
      // Entries the settled base covers are durable in the document itself -
      // drop them so the log stays bounded, then cap at RECEIPT_CAP newest.
      const kept = entries.filter((e) => (this.base.high[e.w] ?? 0) < e.s).slice(-RECEIPT_CAP)
      const text = kept.length === 0 ? JSON.stringify({ v: 1, ops: [] }) : serializeReceipts(kept)
      if (text === entry.v) {
        this.receiptWatermark = this.seq
        return 'ok'
      }
      try {
        await ops.set(this.slot, text, { rev: entry.rev, gen: entry.gen })
        this.receiptWatermark = this.seq
        return 'ok'
      } catch (e) {
        const code = storeCode(e)
        if (code === 'E_CONFLICT') continue // union again on the fresh log
        if (code === 'E_GONE') return 'gone'
        if (UNKNOWN_CODES.has(code)) {
          // Ambiguous: read the log back - this writer's newest seq durable
          // in the slot means the write landed. Retry unions, never replaces.
          let back: StoreEntry
          try {
            back = await ops.entry(this.slot)
          } catch {
            this.fail()
            return 'fail'
          }
          if (this.stopped) return 'fail'
          this.noteEntry(back)
          if (parseReceipts(back.v).some((x) => x.w === this.me && x.s === this.seq)) {
            this.receiptWatermark = this.seq
            return 'ok'
          }
          continue
        }
        this.fail()
        return 'fail'
      }
    }
    this.fail()
    return 'fail'
  }

  /**
   * Fill in the writer fields on the document about to be committed. A repair
   * write can run with no ops of its own (seq 0): it stamps authorship and the
   * coverage it carries without claiming a seq mark it never wrote. `high`
   * gains every writer mark the view provably contains - own ops plus every
   * receipt op replayed into it - so the marks claim only real coverage.
   */
  private stamp(doc: Doc): Doc {
    const high = { ...doc.high }
    for (const [w, s] of Object.entries(this.appliedHigh)) {
      if (s > (high[w] ?? 0)) high[w] = s
    }
    if (this.seq > 0) high[this.me] = this.seq
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
