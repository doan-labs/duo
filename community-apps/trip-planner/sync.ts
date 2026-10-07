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
 *   write. `send` resolves true only after the port accepted the write;
 *   `settled` resolves false if any write enqueued so far failed, so a
 *   caller can distinguish 'applied' from 'failed' instead of treating an
 *   enqueued write as committed.
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
 * Serialized port-write queue with durable outcomes.
 * `send` runs one write after every earlier write finished; the returned
 * promise resolves true only when the port accepted it. A rejected write
 * calls `onFail` (the caller re-snapshots) and resolves false without
 * breaking the queue for later writes.
 */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve()
  private live = new Set<Promise<boolean>>()

  send(run: () => Promise<void>, onFail: () => void): Promise<boolean> {
    const p = this.tail.then(async () => {
      try {
        await run()
        return true
      } catch {
        onFail()
        return false
      }
    })
    this.tail = p.then(() => {})
    this.live.add(p)
    void p.finally(() => this.live.delete(p))
    return p
  }

  /** Resolves once every write enqueued so far has finished; true iff all succeeded. */
  settled(): Promise<boolean> {
    return Promise.all([...this.live]).then((rs) => rs.every(Boolean))
  }
}

/**
 * A minimal boolean storage adapter - the exact surface `commitLibWrites`
 * needs from useSpace. `put` resolves false when the port rejects the write
 * and throws when the outcome is ambiguous (e.g. a transport timeout where
 * the write may still have landed).
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
  put: (k: string, v: string) => Promise<boolean>
}

/**
 * 'applied': every planned write durably landed.
 * 'failed': the commit aborted and provably nothing landed - every write
 *   attempt was cleanly rejected (the port refused it), so the caller may
 *   honestly say nothing applied.
 * 'partial': the commit aborted with a landed prefix (some writes durable,
 *   at least one failed), or an ambiguous write outcome where landing
 *   cannot be disproved. Landed data is PRESERVED: no rollback is issued
 *   because rollback would have to write values derived from a read that
 *   could be stale - the classic verify-read -> mutate race. The caller
 *   reports 'partial' honestly and re-snapshots; the durable truth is what
 *   the storage shows.
 */
export type CommitOutcome = 'applied' | 'failed' | 'partial'

const beat = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

type Attempt = 'landed' | 'missed' | 'unknown'

/**
 * Try once, wait, try once more.
 * 'landed': the port accepted a write.
 * 'missed': BOTH attempts were cleanly rejected - the value was never
 *   accepted, so nothing landed.
 * 'unknown': at least one attempt threw ambiguously (timeout/transport) and
 *   no later clean rejection proved it never landed - the durable value is
 *   uncertain, so the commit must not claim a clean failure.
 */
async function attempt(op: () => Promise<boolean>): Promise<Attempt> {
  let ambiguous = false
  for (let i = 0; i < 2; i++) {
    if (i > 0) await beat(120)
    try {
      if (await op()) return 'landed'
      // A clean false means the port refused this attempt. If an earlier
      // attempt threw ambiguously, landing cannot be ruled out.
    } catch {
      ambiguous = true
    }
  }
  return ambiguous ? 'unknown' : 'missed'
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
 * - The first failed step ABORTS the rest of the plan: remaining writes
 *   were computed assuming the earlier ones landed.
 * - No repair/rollback writes exist. A repair would have to write a value
 *   derived from a read, and a read->write pair is not atomic on this port:
 *   a peer's acknowledged edit landing between the read's capture and the
 *   repair's put would be erased. Instead the commit reports the truthful
 *   terminal - 'partial' when anything landed or might have - and the
 *   caller re-snapshots to the durable state.
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
