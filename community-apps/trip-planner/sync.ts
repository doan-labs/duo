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
 * needs from useSpace. Resolves false when the port rejects; may throw.
 */
export type LibStore = {
  put: (k: string, v: string) => Promise<boolean>
  del: (k: string) => Promise<boolean>
}

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
 * - The index lands BEFORE record deletes, so a deletion is authoritative
 *   once the index commits; surviving records are cleanup, not truth.
 * - A rejected reachability write repairs the keys this diff already
 *   landed - re-putting each record's previous value, or deleting a record
 *   that did not exist before (nothing can reference it yet) - then
 *   resolves false. 'failed' therefore never means half-applied.
 * - Record deletes run afterwards as retried best-effort cleanup (three
 *   bounded attempts). A permanent failure leaves an orphan record, which
 *   resurfaces through `assembleLibrary` on next load - recoverable data,
 *   never a wrong index.
 *
 * Resolves true only when every reachability write landed.
 */
export async function commitLibWrites(
  io: LibStore,
  plan: { kind: 'put' | 'del'; key: string; value?: string }[],
  prevValues: (key: string) => string | undefined
): Promise<boolean> {
  const cleanup: string[] = []
  const applied: { key: string; value?: string }[] = []
  for (const w of plan) {
    if (w.kind === 'del') {
      cleanup.push(w.key)
      continue
    }
    if (!(await attempt(() => io.put(w.key, w.value ?? '')))) {
      for (const a of applied) {
        const old = prevValues(a.key)
        if (old !== undefined) await attempt(() => io.put(a.key, old))
        else await attempt(() => io.del(a.key))
      }
      return false
    }
    applied.push(w)
  }
  for (const key of cleanup) {
    void (async () => {
      for (const delay of [0, 250, 2000]) {
        if (delay) await beat(delay)
        try {
          if (await io.del(key)) return
        } catch {
          // rejected by the port - next attempt
        }
      }
    })()
  }
  return true
}
