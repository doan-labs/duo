/**
 * Sync primitives for the app's raw snapshot+watch key space.
 *
 * Two pieces, both deliberately pure/testable:
 *
 * - `applyWatch` merges one watch event into the per-copy truth. Own writes
 *   are applied optimistically and acknowledged when their echo arrives in
 *   order. The failure mode this guards against: an older echo for an
 *   already-acknowledged value must never roll the effective value back
 *   while NEWER own writes are still queued, or a mutation rebasing on the
 *   mirror would silently drop them.
 *
 * - `WriteQueue` serializes port writes and reports a durable outcome per
 *   write: 'landed' only after the port accepted the write, 'missed' only
 *   after a definitive refusal, 'unknown' when the outcome is ambiguous.
 *   `settled` resolves false unless every write enqueued so far landed, so
 *   a caller can distinguish 'applied' from anything else instead of
 *   treating an enqueued write as committed.
 */

export type PendingMap = Map<string, (string | null)[]>

/**
 * Merge one watch event into the effective value for key `k`.
 *
 * Returns the value the copy should treat as current after this event:
 * - An in-order echo of the pending head acknowledges that write; when more
 *   own writes are still queued the newest pending tail remains effective
 *   (it will echo later), NOT the just-acknowledged older value.
 * - A foreign value while own writes are pending is overridden by the
 *   pending tail: the queued own writes land after it on the port (LWW).
 * - With nothing pending, the event is foreign state and is adopted.
 */
export function applyWatch(pending: PendingMap, k: string, v: string | null): string | null {
  const q = pending.get(k)
  if (q?.length && q[0] === v) {
    q.shift()
    if (!q.length) pending.delete(k)
  }
  const tail = pending.get(k)
  if (tail?.length) return tail[tail.length - 1] ?? null
  return v
}

/** Enqueue one own write's optimistic value before its echo can arrive. */
export function queuePending(pending: PendingMap, k: string, v: string | null): void {
  const q = pending.get(k) ?? []
  q.push(v)
  pending.set(k, q)
}

/** Drop all pending masks (used after a failed write before re-snapshot). */
export function clearPending(pending: PendingMap, k?: string): void {
  if (k === undefined) pending.clear()
  else pending.delete(k)
}

/**
 * Durable outcome of one port write:
 * - 'landed': the port accepted the write.
 * - 'missed': the request was definitively REFUSED - a host NACK or a
 *   client-side reject before the request was sent - so it provably never
 *   applied.
 * - 'unknown': the outcome is ambiguous (timeout, closed port, protocol
 *   break, host-internal error, non-platform failure). The write may still
 *   have landed; nothing further may be assumed.
 */
export type WriteOutcome = 'landed' | 'missed' | 'unknown'

/**
 * Error codes that mean the request was refused and provably never applied:
 * host NACKs sent before any write (argument validation, quota, rate,
 * permission, stale-epoch, unsupported) plus client-side pre-send rejects
 * (E_ARGS on an invalid request). E_TIMEOUT/E_CLOSED/E_PROTOCOL/E_STORAGE
 * and non-platform errors are ambiguous: the host may already have applied
 * the write before the failure was observed.
 *
 * E_CONFLICT and E_GONE are handled separately by the CAS path, not by this
 * classifier: both are zero-effect rejections of a conditional write, but
 * they are REFRESHABLE - the precondition a moved space rejected can simply
 * be re-read through `entry` - so the CAS loop treats them as 'conflict'
 * and re-derives intent rather than reporting a terminal refusal.
 */
const REFUSAL_CODES = new Set(['E_ARGS', 'E_QUOTA', 'E_RATE', 'E_DENIED', 'E_STALE', 'E_UNSUPPORTED'])

export function isRefusal(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && REFUSAL_CODES.has(String((e as { code: unknown }).code))
}

/** Zero-effect conditional-write rejections whose token can be refreshed
 * by reading `entry` again: the space moved (E_CONFLICT) or the generation
 * the token was minted in died (E_GONE). Neither mutation took place. */
const CONFLICT_CODES = new Set(['E_CONFLICT', 'E_GONE'])

export function isConflict(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && CONFLICT_CODES.has(String((e as { code: unknown }).code))
}

/** The full error classification a write can take. */
export function classifyError(e: unknown): 'conflict' | 'missed' | 'unknown' {
  return isConflict(e) ? 'conflict' : isRefusal(e) ? 'missed' : 'unknown'
}

/**
 * Serialized port-write queue with durable outcomes.
 * `send` runs one write after every earlier write finished; the returned
 * promise resolves 'landed' only when the port accepted it, 'missed' only
 * on a definitive refusal, and 'unknown' when the outcome is ambiguous.
 * A non-landed write calls `onFail` (the caller re-snapshots) without
 * breaking the queue for later writes.
 */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve()
  private live = new Set<Promise<WriteOutcome>>()

  send(run: () => Promise<void>, onFail: (e: unknown) => void): Promise<WriteOutcome> {
    const p = this.tail.then(async (): Promise<WriteOutcome> => {
      try {
        await run()
        return 'landed'
      } catch (e) {
        onFail(e)
        // On the serialized single-key path a conflict token is refreshed
        // inside the run loop, so a throw reaching here is never 'conflict';
        // classify anyway so a leaked E_CONFLICT/E_GONE reads 'unknown'
        // (ambiguous), never a false 'missed'.
        return isRefusal(e) ? 'missed' : 'unknown'
      }
    })
    this.tail = p.then(() => {})
    this.live.add(p)
    void p.finally(() => this.live.delete(p))
    return p
  }

  /**
   * Run one task after every earlier queued write, resolving the task's own
   * value. Commits use this to occupy the same serialization slot as `send`
   * while reporting a richer outcome (a thrown error propagates to the
   * caller after onFail runs).
   */
  run<T>(op: () => Promise<T>, onFail?: (e: unknown) => void, ok?: (v: T) => boolean): Promise<T> {
    const p = this.tail.then(op)
    this.tail = p.then(
      () => {},
      () => {}
    )
    const probe: Promise<WriteOutcome> = p.then<WriteOutcome, WriteOutcome>(
      (v) => (ok && !ok(v) ? 'unknown' : 'landed'),
      () => 'unknown'
    )
    this.live.add(probe)
    void probe.finally(() => this.live.delete(probe))
    return p.catch((e: unknown) => {
      onFail?.(e)
      throw e
    })
  }

  /** Resolves once every write enqueued so far has finished; true iff all landed. */
  settled(): Promise<boolean> {
    return Promise.all([...this.live]).then((rs) => rs.every((r) => r === 'landed'))
  }
}

/**
 * The conditional-write surface `commitLibWrites` needs from useSpace -
 * the platform's `kv.entry`/`kv.set` CAS primitives adapted to outcomes:
 *
 * - `entry(k)` performs the atomic read `{v, rev, gen}` the conditional
 *   write is computed from. A THROW is a failed/ambiguous read - it is
 *   never treated as an absent key (a failed read must not seed a write).
 * - `set(k, v, {rev, gen})` is the checked write: 'landed' once the host
 *   applied it inside the token's transaction, 'conflict' when the space
 *   moved or the token's generation died (E_CONFLICT/E_GONE - zero
 *   effects, the token is simply stale), 'missed' on a definitive
 *   refusal, 'unknown' when the outcome is ambiguous.
 */
export type CasStore = {
  entry: (k: string) => Promise<{ v: string | null; rev: number; gen: number }>
  set: (k: string, v: string, expect: { rev: number; gen: number }) => Promise<CasOutcome>
}
export type CasOutcome = 'landed' | 'conflict' | 'missed' | 'unknown'

/**
 * 'applied': every planned write durably landed.
 * 'failed': the commit aborted and provably nothing landed - the first
 *   write was definitively refused, so the caller may honestly say
 *   nothing applied.
 * 'partial': the commit stopped on an ambiguous outcome (a timeout whose
 *   landing could not be settled by readback, an exhausted conflict loop,
 *   or a refused write after a landed prefix). Landed data is PRESERVED;
 *   the caller reports 'partial' honestly and re-snapshots.
 * 'conflict': the plan's base was superseded by peer state on a key whose
 *   intent cannot be re-derived locally (a changed record). Nothing more
 *   is written; the caller re-reads durable state, re-runs its semantic
 *   mutation on it (the field-intent rebase) and plans again.
 */
export type CommitOutcome = 'applied' | 'failed' | 'partial' | 'conflict'

/**
 * What one commit step wants the stored value to become, re-derived
 * against the value `entry` just read - never the value frozen at plan
 * time:
 * - `put` (a record): valid only while the stored value still equals the
 *   `base` the mutation was computed on. Any other value means a peer
 *   acknowledged an edit we must not overwrite: return 'rebase' and let
 *   the caller re-run its mutation on fresh state.
 * - `tomb`: write the marker while the stored value still equals `base`.
 *   A different value is either an existing tomb (delete already
 *   satisfied) or a NEWER live incarnation (a confirmed peer restore) -
 *   both mean skip: never tomb over confirmed peer work. The index merge
 *   below keeps the id when a tomb was skipped.
 * - `index`: the only step whose value is a pure function of fresh state:
 *   apply the order ops (drop confirmed-tombed ids, keep peer ids in
 *   place, insert our created ids, apply our order) to whatever order is
 *   currently stored. Already-equal merges write nothing.
 */
export type LibWriteStep = {
  kind: 'put' | 'tomb' | 'index'
  key: string
  /** Value the stored key held when the plan was computed (null = absent). */
  base?: string | null
  /** Planned value for `put`/`index` steps; the tomb marker for `tomb`. */
  value?: string
}

/**
 * Merge the plan's order intent into a freshly-read index order. Pure.
 * `next` is our planned order (our creates may not exist in `fresh` yet);
 * ids only in `fresh` are peer work and are spliced back at their stored
 * positions; `remove` carries ids this commit confirmed tombed.
 */
export function mergeIndexOrder(fresh: string[], next: string[], remove: ReadonlySet<string>): string[] {
  const result = next.filter((id) => !remove.has(id))
  for (let i = 0; i < fresh.length; i++) {
    const id = fresh[i]!
    if (!result.includes(id) && !remove.has(id)) result.splice(Math.min(i, result.length), 0, id)
  }
  return result
}

/** A stored `{v:1,tomb:1}` marker - the acknowledged-deletion wire shape. */
function isTombWire(v: string | null): boolean {
  if (!v) return false
  try {
    const p: unknown = JSON.parse(v)
    return typeof p === 'object' && p !== null && 'tomb' in p && (p as { tomb: unknown }).tomb === 1
  } catch {
    return false
  }
}

/** Parse an index wire value into its order (corrupt/missing -> []). */
function readIndexOrder(v: string | null | undefined): string[] {
  if (!v) return []
  try {
    const p: unknown = JSON.parse(v)
    if (typeof p === 'object' && p !== null && 'order' in p && Array.isArray((p as { order: unknown }).order))
      return (p as { order: unknown[] }).order.filter((x): x is string => typeof x === 'string')
  } catch {}
  return []
}

const MAX_TRIES = 4

/**
 * Persist one library mutation via conditional writes in the semantic
 * order `planLibWrites` emits (changed records, then tombs, then index):
 *
 * - Every step re-reads `entry` inside its own transaction window and
 *   writes with the `{rev, gen}` token just minted - `rev` counts every
 *   write in the space, so a token read before an earlier step is already
 *   stale. The bounded loop refreshes the token on E_CONFLICT/E_GONE.
 * - `put` on a value that no longer equals `base` stops with 'conflict':
 *   a peer edit owns the new base; resubmitting the frozen doc would
 *   clobber it. The caller re-runs the mutation on fresh state.
 * - `tomb` on a value that no longer equals `base` SKIPS: the delete
 *   intent is already satisfied (existing tomb) or superseded (a
 *   confirmed peer restore owns a newer incarnation). Only ids this
 *   commit actually tombed (or found already tombed) are removed from
 *   the merged index - a peer restore keeps its reachability.
 * - `index` merges intent into the stored order instead of overwriting
 *   it, so a peer insert/remove landing inside the window survives.
 * - 'unknown' is settled by reading the SAME key's entry: stored value
 *   equals the intended value -> the write landed before the ack was
 *   lost. Anything else reports 'partial': a non-match proves neither a
 *   miss nor a safe rebase (the lost request can still commit late), so
 *   no retry or replan is allowed to resend an already-ambiguous intent.
 *   The readback reconciles authority; it is never permission to resend
 *   a frozen payload.
 * - The first 'missed' refusal aborts the rest; nothing is written after
 *   the commit returns.
 */
export async function commitLibWrites(io: CasStore, plan: LibWriteStep[]): Promise<CommitOutcome> {
  let landed = 0
  const tombs = new Set<string>()
  const tombId = (key: string) => key.slice('trip.'.length)
  for (const w of plan) {
    const remove = new Set([...tombs].map(tombId))
    let stepDone = false
    for (let tries = 0; tries < MAX_TRIES && !stepDone; tries++) {
      let e: { v: string | null; rev: number; gen: number }
      try {
        e = await io.entry(w.key)
      } catch {
        return 'partial'
      }
      const base = w.base ?? null
      let desired: string | null = null
      if (w.kind === 'tomb') {
        if (e.v === base) {
          desired = w.value ?? ''
        } else {
          // An existing tomb means the delete is already satisfied and
          // the id stays out of the index merge. A NEWER live value is a
          // confirmed peer incarnation: it keeps its reachability.
          if (e.v === w.value) tombs.add(w.key)
          stepDone = true
          landed++
          continue
        }
      } else if (w.kind === 'index') {
        const fresh = readIndexOrder(e.v)
        const nextOrder = readIndexOrder(w.value)
        const merged = mergeIndexOrder(fresh, nextOrder, remove)
        const mergedJson = JSON.stringify({ v: 1, order: merged })
        if (merged.join('|') === fresh.join('|')) {
          stepDone = true
          landed++
          continue
        }
        desired = mergedJson
      } else {
        // A `put` whose base is null means 'no live value here': both an
        // absent key and a retained tomb satisfy it, so a restore (Undo)
        // writes over the tomb like a create writes over nothing. Any
        // other live value is a confirmed peer base - rebase, never
        // overwrite.
        if (e.v !== base && !(base === null && (e.v === null || isTombWire(e.v)))) return 'conflict'
        desired = w.value ?? ''
      }
      const r = await io.set(w.key, desired, { rev: e.rev, gen: e.gen })
      if (r === 'landed') {
        if (w.kind === 'tomb') tombs.add(w.key)
        stepDone = true
        landed++
        continue
      }
      if (r === 'conflict') continue
      if (r === 'missed') return landed > 0 ? 'partial' : 'failed'
      // 'unknown': settle the SAME key by readback - never blind-resend.
      // Only the exact desired value proves the write landed; anything
      // else (prior value OR a peer's newer write) leaves the original
      // request's fate unproven - it could still commit late - so the
      // commit reports 'partial' and the caller replans nothing. Resending
      // would risk a double-apply (toggle reversed twice, add duplicated)
      // or clobbering the peer's landed value.
      try {
        const after = await io.entry(w.key)
        if (after.v === desired) {
          if (w.kind === 'tomb') tombs.add(w.key)
          stepDone = true
          landed++
          continue
        }
        return 'partial'
      } catch {
        return 'partial'
      }
    }
    if (!stepDone) return 'partial'
  }
  return 'applied'
}

/** Minimal SDK surface a conditional single-key write needs. */
export type ConditionalSpace = {
  entry(k: string): Promise<{ v: string | null; rev: number; gen: number }>
  set(k: string, v: string, expect: { rev: number; gen: number }): Promise<unknown>
  del(k: string, expect: { rev: number; gen: number }): Promise<unknown>
}

/**
 * One durable conditional write for a single key. `v === null` deletes; a
 * function `v` derives the desired wire from the fresh entry (used when the
 * intent is a delta on stored state, e.g. a merged ui patch) and may return
 * undefined to abort.
 *
 * `match` binds the write to the identity/incarnation the caller's intent
 * was derived from: when the fresh entry does not satisfy it, the write is
 * 'skipped' - a peer's newer value (a confirmed undo, draft or confirm) is
 * NEVER deleted or overwritten just because this copy read an older mirror.
 * On E_CONFLICT/E_GONE the loop re-reads and re-checks `match`, so only the
 * true semantic intent is rebased onto the exact fresh entry; a mismatch
 * skips rather than executing a stale frozen delete/put.
 *
 * An ambiguous (timeout/closed/transport) outcome is settled by same-key
 * readback: seeing the desired value proves it landed; ANY other read
 * throws - the lost request may still commit late, so a fresh-token resend
 * could clobber a peer write or double-apply intent. No retries on unknown.
 */
export async function conditionalSet(
  space: ConditionalSpace,
  k: string,
  v: string | null | ((fresh: string | null) => string | null | undefined),
  match?: (v: string | null) => boolean
): Promise<'landed' | 'skipped'> {
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    const e = await space.entry(k)
    if (match && !match(e.v)) return 'skipped'
    const desired = typeof v === 'function' ? v(e.v) : v
    if (desired === undefined || desired === e.v) return 'skipped'
    const expect = { rev: e.rev, gen: e.gen }
    try {
      if (desired === null) await space.del(k, expect)
      else await space.set(k, desired, expect)
      return 'landed'
    } catch (err) {
      if (isConflict(err)) continue
      if (isRefusal(err)) throw err
      const after = await space.entry(k)
      if (after.v === desired) return 'landed'
      throw Object.assign(new Error('write outcome unproven; refusing resend'), { code: 'E_CAS' })
    }
  }
  throw Object.assign(new Error('conditional write loop exhausted'), { code: 'E_CAS' })
}

/**
 * The shared replan loop for library mutations: run the semantic mutate
 * on the current library, commit its diff, and on 'conflict' re-snapshot
 * and re-derive the SAME intent on fresh durable state (never resubmit a
 * frozen plan). 'partial'/'failed'/'applied'/'noop' pass straight through -
 * only a provable zero-effects conflict may re-execute; an ambiguous
 * outcome already reported 'partial' stops the loop.
 */
export async function commitWithReplan<Lib>(
  resync: () => Promise<void>,
  libNow: () => Lib,
  mutate: (l: Lib) => Lib | null | undefined,
  commit: (cur: Lib, next: Lib) => Promise<CommitOutcome>,
  maxRounds = 3
): Promise<'applied' | 'failed' | 'partial' | 'noop'> {
  let cur = libNow()
  let next = mutate(cur)
  if (!next || next === cur) return 'noop'
  let outcome: CommitOutcome | 'noop' = 'applied'
  for (let round = 0; round < maxRounds; round++) {
    if (round > 0) {
      await resync()
      cur = libNow()
      next = mutate(cur)
      // The intent is no longer expressible on the fresh state (e.g. the
      // trip it edited is gone): refuse honestly rather than claim a
      // landed write.
      if (!next) {
        outcome = 'noop'
        break
      }
      // Fresh state already satisfies the intent: nothing more to write,
      // and the durable truth matches - honestly 'applied'.
      if (next === cur) {
        outcome = 'applied'
        break
      }
    }
    outcome = await commit(cur, next)
    if (outcome !== 'conflict') break
  }
  return outcome === 'conflict' ? 'partial' : outcome
}
