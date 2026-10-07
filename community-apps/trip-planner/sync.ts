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
 * permission, stale-epoch, gone, unsupported) plus client-side pre-send
 * rejects (E_ARGS on an invalid request). E_TIMEOUT/E_CLOSED/E_PROTOCOL/
 * E_STORAGE and non-platform errors are ambiguous: the host may already
 * have applied the write before the failure was observed.
 */
const REFUSAL_CODES = new Set(['E_ARGS', 'E_QUOTA', 'E_RATE', 'E_DENIED', 'E_STALE', 'E_GONE', 'E_UNSUPPORTED'])

export function isRefusal(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && REFUSAL_CODES.has(String((e as { code: unknown }).code))
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
        return isRefusal(e) ? 'missed' : 'unknown'
      }
    })
    this.tail = p.then(() => {})
    this.live.add(p)
    void p.finally(() => this.live.delete(p))
    return p
  }

  /** Resolves once every write enqueued so far has finished; true iff all landed. */
  settled(): Promise<boolean> {
    return Promise.all([...this.live]).then((rs) => rs.every((r) => r === 'landed'))
  }
}

/**
 * A minimal outcome storage adapter - the exact surface `commitLibWrites`
 * needs from useSpace. `put` resolves 'landed' when the port accepted the
 * write, 'missed' on a definitive refusal, 'unknown' (or throws) when the
 * outcome is ambiguous - e.g. a transport timeout where the write may still
 * have landed. Plain boolean true/false results from a simpler adapter are
 * accepted and read as 'landed'/'missed'.
 *
 * There is deliberately no `del` and no `get`:
 * - `trip.<id>` records are never deleted, only overwritten or tombed, so
 *   no post-commit cleanup can race a newer same-id incarnation.
 * - A commit performs NO reads. A verify-read's value is authoritative only
 *   at its captured revision; on this no-CAS port a read->write pair is not
 *   atomic, so a snapshot that drives a later write (a repair re-put or a
 *   conditional delete) can always erase a peer's acknowledged write that
 *   landed between the capture and the reply. Every commit step is a
 *   fixed-intent write computed at plan time - LWW on the same key - never
 *   a write derived from a stale stored value.
 */
export type LibStore = {
  put: (k: string, v: string) => Promise<WriteOutcome | boolean>
}

/**
 * 'applied': every planned write durably landed.
 * 'failed': the commit aborted and provably nothing landed - the first
 *   write was definitively refused, so the caller may honestly say
 *   nothing applied.
 * 'partial': the commit aborted with a landed prefix (some writes durable,
 *   at least one failed), or an ambiguous write outcome where landing
 *   cannot be disproved. Landed data is PRESERVED: no rollback is issued
 *   because rollback would have to write values derived from a read that
 *   could be stale - the classic verify-read -> mutate race. The caller
 *   reports 'partial' honestly and re-snapshots; the durable truth is what
 *   the storage shows.
 */
export type CommitOutcome = 'applied' | 'failed' | 'partial'

type Attempt = 'landed' | 'missed' | 'unknown'

/**
 * Issue the planned write exactly once. There is deliberately NO app-level
 * retry: the SDK already retries a timed-out mutation once with the SAME
 * request ID, and its contract is 'read back before retrying with a new
 * request'. A second request carrying this commit's pre-planned payload is
 * a NEW mutation that lands LWW over any peer write which landed during the
 * backoff - the stale-retry clobber. An ambiguous outcome therefore stops
 * the commit as 'unknown' and leaves reconciliation to the resnapshot,
 * which settles the view on the durable truth without re-sending anything.
 * 'missed' means the single request was definitively refused and provably
 * never applied.
 */
async function attempt(op: () => Promise<WriteOutcome | boolean>): Promise<Attempt> {
  try {
    const r = await op()
    return r === true || r === 'landed' ? 'landed' : r === false || r === 'missed' ? 'missed' : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Persist one library mutation against a boolean storage adapter in the
 * semantic order `planLibWrites` emits (changed records, then tomb markers,
 * then the index):
 *
 * - Changed records land BEFORE the index, so the index can never be made
 *   to reference a record that is not stored (a dangling reachable ref).
 * - Tomb markers land BEFORE the index removal, so a peer restore that
 *   lands inside this commit's window ends up an unindexed live record -
 *   recovered by the assembler - instead of being erased by a late step.
 * - The index lands LAST: reachability flips only after every record and
 *   tomb write it references has landed.
 * - The first non-landed step ABORTS the rest of the plan: remaining
 *   writes were computed assuming the earlier ones landed.
 * - No repair/rollback writes exist and nothing is retried app-side. A
 *   repair would have to write a value derived from a read, and a
 *   read->write pair is not atomic on this port: a peer's acknowledged
 *   edit landing between the read's capture and the repair's put would be
 *   erased. A retried planned write is the same hazard in the other
 *   direction: the SDK already owns same-request-ID retry for timeouts,
 *   so re-sending this commit's payload as a new request could land LWW
 *   over a peer's confirmed write. Instead the commit reports the
 *   truthful terminal - 'partial' when anything landed or might have -
 *   and the caller re-snapshots to the durable state.
 * - Nothing is written after the commit returns.
 *
 * Resolves 'applied' only when every planned write landed.
 */
export async function commitLibWrites(
  io: LibStore,
  plan: { kind: 'put' | 'tomb'; key: string; value?: string }[]
): Promise<CommitOutcome> {
  let landed = 0
  let uncertain = false
  for (const w of plan) {
    const r = await attempt(() => io.put(w.key, w.value ?? ''))
    if (r === 'landed') {
      landed++
      continue
    }
    if (r === 'unknown') uncertain = true
    return landed > 0 || uncertain ? 'partial' : 'failed'
  }
  return 'applied'
}
