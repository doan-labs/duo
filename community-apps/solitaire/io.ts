// Small pure helpers for the visibility and storage-acknowledgement rules the
// app enforces. Kept free of React and the SDK so the rules are unit-testable
// with any view/storage fakes.

/** The two fields the shell reports on every view event. */
export type ViewTruth = { visible: boolean; active: boolean }

/**
 * Whether this copy may admit new work right now. Both flags matter: a slept
 * or fully clipped display reports active without visible, a folded display
 * reports neither. Read synchronously from os.view at admission time - the
 * SDK swaps it the moment a view event lands, a frame before React hears it.
 */
export const viewLive = (v: ViewTruth): boolean => v.visible === true && v.active === true

/** Backoff between parked-write retries, capped so a dead store is not hammered. */
export const faultDelay = (fails: number): number => Math.min(300 * 2 ** fails, 4000)

/** A write this copy intends but has not yet confirmed against the store. */
export type PendingWrite = { raw: string; issued?: string }

export type FlushResult = 'written' | 'adopted' | 'stale' | 'fault' | 'issued'

/**
 * One read-confirmed attempt at a parked write. A rejected read leaves the
 * authoritative record unknown - it is not an empty slot and not permission
 * to write, so the intent stays parked for retry. When the read resolves, a
 * foreign record is adopted instead of overwritten and superseded intent is
 * dropped; only then does the confirmed write issue.
 */
export const flushWrite = async <T extends PendingWrite>(
  pending: T,
  deps: {
    get: () => Promise<string | null>
    /** Adopt `cur` when it is a foreign record; true means the intent is consumed. */
    foreign: (cur: string) => boolean
    /** The write's base moved on since admission; true means drop it. */
    stale: () => boolean
    /** Hand the confirmed value to the mirror for its optimistic write. */
    issue: (raw: string) => void
    /** The read rejected: park and let the caller schedule the retry. */
    fault: () => void
  }
): Promise<FlushResult> => {
  if (pending.issued !== undefined) return 'issued'
  try {
    const cur = await deps.get()
    if (cur !== null && deps.foreign(cur)) return 'adopted'
    if (deps.stale()) return 'stale'
    pending.issued = pending.raw
    deps.issue(pending.raw)
    return 'written'
  } catch {
    deps.fault()
    return 'fault'
  }
}

export type AckResult = 'confirmed' | 'requeue' | 'waiting'

/**
 * Resolve a parked write's outcome from the mirror's own key state: an issued
 * value that lands 'ready' is confirmed, a store 'error' requeues the intent
 * for another read, anything else is still in flight. An unissued write is
 * always waiting on its read.
 */
export const ackWrite = (pending: { issued?: string }, status: string, value: string | null): AckResult => {
  if (pending.issued === undefined) return 'waiting'
  if (status === 'ready' && value === pending.issued) return 'confirmed'
  if (status === 'error') return 'requeue'
  return 'waiting'
}
