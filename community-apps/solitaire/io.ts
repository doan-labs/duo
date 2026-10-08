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

/** Only a moved rev may re-derive: re-read the entry and re-decide. */
const conflict = (code: string | undefined) => code === 'E_CONFLICT'

/**
 * Failures that definitely never applied - bad args, a dead store, a rate
 * limit - so the intent may stay parked for the paced retry. Anything else
 * (a lost ack, an unmapped transport error) is ambiguous: the write may have
 * committed, which only a same-key readback can resolve.
 */
const cleanFail = (code: string | undefined) => code === 'E_STORAGE' || code === 'E_RATE' || code === 'E_ARGS'

export type CasResult = 'issued' | 'adopted' | 'stale' | 'gone' | 'unknown' | 'fault'

/**
 * One parked intent against the conditional store. Every attempt reads the
 * authoritative entry first: a foreign record is adopted (never overwritten),
 * a superseded intent is dropped, and only then does the write issue
 * conditional on that read's own token - a peer write admitted between read
 * and set lands as E_CONFLICT and is re-read, not clobbered. E_GONE is
 * terminal: the generation died, the intent's base is gone with it, and no
 * fresh-generation token may replay it. An ambiguous outcome (lost ack or
 * unmapped transport error) reads the key back exactly once - our own bytes
 * prove the write landed, a foreign record adopts, anything else reports
 * 'unknown' and is never re-issued under a fresh token. `rebase`, when given,
 * rederives the value from each confirmed entry (a merge), so a re-issued
 * write keeps the peer facts the conflict revealed.
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
    } catch (err) {
      // A dead generation ends the intent outright: re-reading into the new
      // generation would revive a record its base can no longer justify.
      if (codeOf(err) === 'E_GONE') return 'gone'
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
      pending.issued = undefined
      const code = codeOf(err)
      if (conflict(code)) continue
      if (code === 'E_GONE') return 'gone'
      if (cleanFail(code)) {
        // A clear failure never reached the store: park for the paced retry.
        deps.fault()
        return 'fault'
      }
      // Ambiguous: read the key back once, then decide. Own bytes prove the
      // write landed; a foreign record adopts; a null, stale, or unreadable
      // value stays unknown - re-issuing could erase a peer write that raced
      // in between the lost ack and now.
      let back: CasEntry
      try {
        back = await deps.entry()
      } catch (err2) {
        return codeOf(err2) === 'E_GONE' ? 'gone' : 'unknown'
      }
      if (back.v === raw) {
        pending.issued = raw
        deps.landed(raw)
        return 'issued'
      }
      if (back.v !== null && deps.foreign(back.v)) return 'adopted'
      return 'unknown'
    }
  }
  deps.fault()
  return 'fault'
}

export type LoneCasResult = 'placed' | 'gone' | 'unknown'

/**
 * A lone conditional write without a parked intent: read the entry, write
 * against its token, and re-derive only on E_CONFLICT. E_GONE is terminal
 * and an ambiguous ack reads the key back once - matching bytes prove the
 * write landed, anything else reports 'unknown' rather than replaying.
 * Throws on a clear read/write failure the caller must handle.
 */
export const casSet = async (kv: CasKV, k: string, v: string): Promise<LoneCasResult> => {
  for (let attempt = 0; attempt < 4; attempt++) {
    let e: CasEntry
    try {
      e = await kv.entry(k)
    } catch (err) {
      if (codeOf(err) === 'E_GONE') return 'gone'
      throw err
    }
    try {
      await kv.set(k, v, { rev: e.rev, gen: e.gen })
      return 'placed'
    } catch (err) {
      const code = codeOf(err)
      if (conflict(code)) continue
      if (code === 'E_GONE') return 'gone'
      if (cleanFail(code)) throw err
      let back: CasEntry
      try {
        back = await kv.entry(k)
      } catch (err2) {
        return codeOf(err2) === 'E_GONE' ? 'gone' : 'unknown'
      }
      return back.v === v ? 'placed' : 'unknown'
    }
  }
  return 'unknown'
}
