// Small pure helpers for the visibility and conditional-write rules the app
// enforces. Kept free of React and the SDK so the rules are unit-testable
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
export type PendingWrite = { raw?: string; issued?: string }

/**
 * What `entry()` returns atomically: the value plus the space revision and
 * generation it was true at. `set`/`del` write against the same `{rev, gen}`
 * token, so a write admitted after the read - on this key or any sibling -
 * rejects the stale token instead of being overwritten blind.
 */
export type CasEntry = { v: string | null; rev: number; gen: number }
export type CasToken = { rev: number; gen: number }
export type CasKV = {
  entry: (k: string) => Promise<CasEntry>
  set: (k: string, v: string, expect: CasToken) => Promise<unknown>
}

const codeOf = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string' ? err.code : undefined

/** A moved read token or a dead generation: re-read and re-decide. */
const moved = (code: string | undefined) => code === 'E_CONFLICT' || code === 'E_GONE'

export type CasResult = 'issued' | 'adopted' | 'stale' | 'fault'

/**
 * One parked intent against the conditional store. Every attempt reads the
 * authoritative entry first: a foreign record is adopted (never overwritten),
 * a superseded intent is dropped, and only then does the write issue
 * conditional on that read's own token - a peer write admitted between read
 * and set lands as E_CONFLICT and is re-read, not clobbered. E_GONE (a dead
 * generation) re-reads for the live token. E_TIMEOUT's unknown ack reads the
 * key back: our own bytes there prove the write landed, a foreign value
 * adopts, anything else re-issues under a fresh token - never a blind retry.
 * `rebase`, when given, rederives the value from each confirmed entry (a
 * merge), so a re-issued write keeps the peer facts the conflict revealed.
 */
export const flushCas = async (
  pending: PendingWrite,
  deps: {
    entry: () => Promise<CasEntry>
    set: (v: string, expect: CasToken) => Promise<unknown>
    /** `cur` is a foreign record: adopt it and consume the intent. */
    foreign: (cur: string) => boolean
    /** The intent's base moved on since admission; true means drop it. */
    stale: () => boolean
    /** The store confirmed the write (its own ack or a timeout readback). */
    landed: (raw: string) => void
    /** Read or write failed past retry: park, the caller paces the retry. */
    fault: () => void
    /** Recompute the value from the just-read entry; null drops the intent. */
    rebase?: (e: CasEntry) => string | null
  }
): Promise<CasResult> => {
  if (pending.issued !== undefined) return 'issued'
  for (let attempt = 0; attempt < 4; attempt++) {
    let e: CasEntry
    try {
      e = await deps.entry()
    } catch {
      deps.fault()
      return 'fault'
    }
    if (e.v !== null && deps.foreign(e.v)) return 'adopted'
    if (deps.stale()) return 'stale'
    const raw = deps.rebase ? deps.rebase(e) : (pending.raw ?? null)
    if (raw === null) return 'stale'
    pending.issued = raw
    try {
      await deps.set(raw, { rev: e.rev, gen: e.gen })
      deps.landed(raw)
      return 'issued'
    } catch (err) {
      const code = codeOf(err)
      if (moved(code)) {
        pending.issued = undefined
        continue
      }
      if (code === 'E_TIMEOUT') {
        pending.issued = undefined
        let back: CasEntry
        try {
          back = await deps.entry()
        } catch {
          deps.fault()
          return 'fault'
        }
        if (back.v === raw) {
          pending.issued = raw
          deps.landed(raw)
          return 'issued'
        }
        if (back.v !== null && deps.foreign(back.v)) return 'adopted'
        continue
      }
      // Any other failure leaves the intent parked, unissued: the paced
      // retry must read and write again, not trust a mark from a write that
      // never reached the store.
      pending.issued = undefined
      deps.fault()
      return 'fault'
    }
  }
  deps.fault()
  return 'fault'
}

/**
 * A lone conditional write without a parked intent: read the entry, write
 * against its token, re-read and re-issue on conflict or a dead generation,
 * and read a timed-out write back before deciding it failed. For keys where
 * losing the race is acceptable - the value is last-writer-wins by design.
 * Throws when the entry read rejects; returns false when the write could not
 * be placed within the bounded attempts.
 */
export const casSet = async (kv: CasKV, k: string, v: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const e = await kv.entry(k)
    try {
      await kv.set(k, v, { rev: e.rev, gen: e.gen })
      return true
    } catch (err) {
      const code = codeOf(err)
      if (moved(code)) continue
      if (code === 'E_TIMEOUT') {
        const back = await kv.entry(k)
        if (back.v === v) return true
        continue
      }
      throw err
    }
  }
  return false
}
