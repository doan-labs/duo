import type { KV } from '@doan-labs/duo-sdk'
import { PlatformError } from '@doan-labs/duo-sdk/guards.ts'

export type CasKV = Pick<KV, 'entry' | 'set' | 'del'>
export type CasOutcome = 'applied' | 'noop' | 'refused' | 'unknown'

// Buckets a conditional-write failure into the only outcomes a caller may act
// on. 'conflict': the space moved since the entry was read - the write
// provably did not apply, so re-reading and rebasing is safe. 'timeout': the
// request may or may not have committed - genuinely unresolved. 'refused':
// deterministic rejection that retrying the same payload cannot fix (dead
// generation, args, quota, denied, unsupported, stale token) - the write
// provably did not apply. 'unknown': anything else (closed port, storage
// fault, non-platform errors) - unverifiable, so callers report unconfirmed
// and let the watch/repair pass converge.
export const casClass = (err: unknown): 'conflict' | 'timeout' | 'refused' | 'unknown' => {
  if (err instanceof PlatformError) {
    if (err.code === 'E_CONFLICT') return 'conflict'
    if (err.code === 'E_TIMEOUT') return 'timeout'
    if (
      err.code === 'E_GONE' ||
      err.code === 'E_ARGS' ||
      err.code === 'E_QUOTA' ||
      err.code === 'E_DENIED' ||
      err.code === 'E_UNSUPPORTED' ||
      err.code === 'E_STALE'
    )
      return 'refused'
  }
  return 'unknown'
}

// One versioned conditional write: read {v, rev, gen} atomically, compute the
// new value from the CURRENT string via `make` (null = the intent no longer
// applies - an honest no-op, not an error), then commit only while the space
// has not moved. A conflict re-reads and recomputes over whatever actually
// landed - the stored value is never rewritten from a stale base, and
// conflict is the ONLY outcome that authorizes a new request: it proves the
// previous one never applied. A timeout reads back exactly once: a stored
// value byte-equal to ours is operation evidence the intent landed (ours or
// an identical peer write); ANY other value means the outcome stays
// unresolved and the call reports 'unknown' - never a replayed request,
// because the original may have committed (a peer's confirmed write that
// arrived after it must not be overwritten by a replay of the older intent).
// Bounded by `attempts`: a write that keeps losing returns 'unknown' so
// callers surface unconfirmed, and the watch/repair path still converges.
export const casSet = async (
  kv: CasKV,
  k: string,
  make: (cur: string | null) => string | null,
  attempts = 4
): Promise<CasOutcome> => {
  for (let i = 0; i < attempts; i++) {
    const e = await kv.entry(k).catch(() => null)
    if (!e) return 'unknown'
    const v = make(e.v)
    if (v === null) return 'noop'
    try {
      await kv.set(k, v, { rev: e.rev, gen: e.gen })
      return 'applied'
    } catch (err) {
      const kind = casClass(err)
      if (kind === 'refused') return 'refused'
      if (kind === 'timeout') {
        // Read back once. Byte-equal is the only provable 'applied'; a
        // mismatch is unresolved - the original may have landed (then been
        // covered by a peer's confirmed write, which a replay would wrongly
        // overwrite) or may not have. Honest 'unknown' in both cases; the
        // caller's next semantic operation re-expresses intent if still
        // wanted, which is a fresh operation, not a replay of this one.
        const back = await kv.entry(k).catch(() => null)
        return back !== null && back.v === v ? 'applied' : 'unknown'
      }
      if (kind === 'conflict') continue
      return 'unknown'
    }
  }
  return 'unknown'
}
