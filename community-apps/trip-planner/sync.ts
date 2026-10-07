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

import { TOMB_VALUE } from './trips'

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
 * needs from useSpace. Resolves false when the port rejects; may throw.
 * There is deliberately no `del`: `trip.<id>` records are never deleted,
 * only overwritten or tombed, so no finite post-commit cleanup can race a
 * newer same-id incarnation (a verify-read + delete pair is not atomic on
 * this port and a late-arriving peer write would be erased by old work).
 */
export type LibStore = {
  put: (k: string, v: string) => Promise<boolean>
  /** Authoritative read of the stored value - a real storage read, not the
   * optimistic mirror. Repair verifies write ownership through it: an
   * unreadable key degrades the outcome to 'partial' instead of risking a
   * live record. The verify->put gap is inherent LWW on this port; it is
   * bounded to this commit's in-flight window, never post-commit. */
  get?: (k: string) => Promise<string | null>
}

/**
 * 'applied': every planned write durably landed.
 * 'failed': the commit aborted AND every write it already landed was
 * verifiably rolled back - the caller may honestly say nothing applied.
 * 'partial': the commit aborted but durable state could not be fully
 * restored (a repair write failed, or a foreign value now owns a key) -
 * the caller must not claim a clean failure; the resnapshot shows truth.
 */
export type CommitOutcome = 'applied' | 'failed' | 'partial'

const beat = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Try once, wait, try once more. Resolves false only when both attempts fail. */
async function attempt(op: () => Promise<boolean>): Promise<boolean> {
  try {
    if (await op()) return true
  } catch {
    // rejected by the port - fall through to the retry
  }
  await beat(120)
  try {
    return await op()
  } catch {
    return false
  }
}

/**
 * Persist one library mutation against a boolean storage adapter in
 * semantic order, from `planLibWrites`:
 *
 * - Changed records land BEFORE the index, so the index can never be made
 *   to reference a record that is not stored (a dangling reachable ref).
 * - The index lands BEFORE tomb writes, so a deletion is authoritative once
 *   the index commits; a rejected tomb then leaves an ordinary orphan that
 *   still recovers - the commit reports failure instead of half-applying.
 * - A rejected reachability write repairs the keys this diff already
 *   landed, in reverse and only while this commit still owns each slot
 *   (verified by an authoritative read): a foreign value that landed in
 *   between is peer data and is left alone, which downgrades the outcome
 *   to 'partial' rather than silently half-applying. A record the commit
 *   created and must roll back is TOMBED, not deleted - the marker leaves
 *   it permanently unreachable without ever issuing a delete.
 * - Nothing is written after the commit returns: there is no deferred
 *   cleanup to be poisoned by a stale read or a peer that lands between a
 *   snapshot and a delete. The tomb stays - bounded debris, never
 *   resurrected, never erased by old work.
 *
 * Resolves 'applied' only when every reachability write landed.
 */
export async function commitLibWrites(
  io: LibStore,
  plan: { kind: 'put' | 'tomb'; key: string; value?: string }[],
  prevValues: (key: string) => string | undefined
): Promise<CommitOutcome> {
  // Authoritative read for repair/reclamation guards. {ok:false} on a
  // missing or failing read keeps callers on the safe side: never delete
  // or overwrite a key whose current value is unknown.
  const read = async (k: string): Promise<{ ok: true; value: string | null } | { ok: false }> => {
    if (!io.get) return { ok: false }
    try {
      return { ok: true, value: await io.get(k) }
    } catch {
      return { ok: false }
    }
  }
  const applied: { key: string; value?: string }[] = []
  for (const w of plan) {
    if (await attempt(() => io.put(w.key, w.value ?? ''))) {
      applied.push(w)
      continue
    }
    // A required write failed: unwind everything this commit already
    // landed, in reverse. Three cases per key, verified by the read:
    // still our value -> restore the pre-write value (re-put, or delete a
    // record that did not exist before); already the old value -> nothing
    // to do; anything else or unreadable -> a foreign write owns the key
    // or the truth is unknown, so the outcome is honestly partial.
    let repaired = true
    for (const a of [...applied].reverse()) {
      const old = prevValues(a.key)
      const cur = await read(a.key)
      if (cur.ok && cur.value === (a.value ?? '')) {
        // Roll back to the pre-write value; a record this commit created is
        // tombed rather than deleted so the repair itself can never race a
        // same-id incarnation that lands later.
        const ok =
          old !== undefined ? await attempt(() => io.put(a.key, old)) : await attempt(() => io.put(a.key, TOMB_VALUE))
        if (!ok) repaired = false
      } else if (!cur.ok || cur.value !== (old ?? null)) {
        repaired = false
      }
    }
    return repaired ? 'failed' : 'partial'
  }
  return 'applied'
}
