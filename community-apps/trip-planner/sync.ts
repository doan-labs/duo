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
  if (tail?.length) return tail[tail.length - 1]
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
