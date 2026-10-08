import type { KV } from '@doan-labs/duo-sdk'
import { PlatformError } from '@doan-labs/duo-sdk/guards.ts'

export type CasKV = Pick<KV, 'entry' | 'set' | 'del'>
export type CasOutcome = 'applied' | 'noop' | 'refused' | 'unknown'

// Buckets a conditional-write failure into the only outcomes a caller may act
// on. 'conflict': the space moved since the entry was read - re-read and
// rebase; the write provably did not apply. 'timeout': the outcome is
// genuinely unknown - read back before retrying with a new request.
// 'refused': deterministic rejection that retrying the same payload cannot
// fix (dead generation, args, quota, denied, unsupported, stale token) - the
// write provably did not apply. 'unknown': anything else (closed port,
// storage fault, non-platform errors) - unverifiable, so callers report
// unconfirmed and let the watch/repair pass converge.
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
// landed - the stored value is never rewritten from a stale base. A timeout
// reads back first: a stored value equal to ours means the write (or an
// identical-intent peer write) landed; anything else retries with a fresh
// request id. Bounded by `attempts`: a write that keeps losing returns
// 'unknown' so callers surface unconfirmed, and the watch/repair path still
// converges on the next change.
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
        const back = await kv.entry(k).catch(() => null)
        if (back && back.v === v) return 'applied'
        continue
      }
      if (kind === 'conflict') continue
      return 'unknown'
    }
  }
  return 'unknown'
}
