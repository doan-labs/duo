import type { KV } from '@doan-labs/duo-sdk'
import {
  type Library,
  latestDoc,
  mergeLib,
  newPlan,
  type PlanDoc,
  parseLibrary,
  sameCore,
  serializeLibrary,
  welcomePlan
} from './plan.ts'

export const LIB_KEY = 'roomplanner-library'

// Only get/set are exercised; typing the parameter as a Pick keeps the queue
// testable against a stub while os.storage satisfies it structurally.
export type LibKV = Pick<KV, 'get' | 'set'>

// os.storage.get resolves null for a missing key; a rejection means the read
// itself failed. Keeping them apart matters: treated as empty, a failed read
// becomes a rev-0 seed whose delayed set can land after a peer's newer write
// and clobber it. null marks 'could not read' - a drain retries the read and
// never writes on top of a library it has not seen.
export const readLib = (storage: LibKV): Promise<Library | null> => storage.get(LIB_KEY).then(parseLibrary, () => null)

// What a confirmed library means for a cold open: the newest stored plan when
// one exists; a fresh layout when the welcome plan was deliberately deleted
// (its tombstone in `gone` bars reviving the shared 'welcome' id); else the
// deterministic first-run welcome both displays can agree on. Reachable only
// after a successful read - a failed read is 'unknown', not 'empty'.
export const seedDoc = (lib: Library): PlanDoc =>
  latestDoc(lib) ?? (lib.gone.welcome !== undefined ? newPlan('Layout 1', 'layout-1') : welcomePlan())

// Cold-open admission: 'retry' when the library state is unknown (a failed
// read must not masquerade as an empty library to seed over), null when a doc
// is already on screen (a peer's adopted plan or a user action makes the
// bootstrap stale - stamping ours now would overwrite the fold's settled
// plan), else the doc this copy should open.
export const admitSeed = (lib: Library | null, taken: boolean): PlanDoc | 'retry' | null =>
  lib === null ? 'retry' : taken ? null : seedDoc(lib)

// A mutation is a pure function of the library it is applied to: no captures
// of side-channel state, no clocks sampled more than once per call. Drains
// apply intents repeatedly while deciding whether they are still needed, so
// impurity would corrupt the satisfaction check.
export type Intent = (lib: Library) => Library | null

// null: reads never succeeded (nothing was applied or even seen). Otherwise
// the library the drain last reached, with `confirmed` telling whether every
// pending intent was observed inside the stored value. Unconfirmed intents
// stay pending and are replayed by the next write or repair().
export type WriteResult = { lib: Library; confirmed: boolean } | null

// os.storage has no cross-copy compare-and-set: a whole-blob set is
// last-writer-wins, so a copy's delayed set can land AFTER a peer commit and
// destroy it, and re-reading can never show the loss (the peer's data is
// already gone). Convergence therefore needs two things per copy: (1) pending
// intents that are only dropped once OBSERVED inside the stored value, and
// (2) `mine` - the union of everything this copy has committed - re-offered
// on every pass so a clobbered write is restored by the next drain instead of
// silently lost. repair() is the peer-facing half: callers run it on every
// library-key change event (the useKV mirror), so a foreign commit that
// landed on top of this copy's earlier write gets folded back in. Tombstone
// merges keep deleted plans deleted; mergeLib's per-plan newest-wins keeps
// both displays' edits order-independent.
export class LibStore {
  private queue: Promise<void> = Promise.resolve()
  private pending: Intent[] = []
  private mine: Library | null = null

  constructor(private kv: LibKV) {}

  private enqueue(job: () => Promise<void>) {
    this.queue = this.queue.then(job).catch(() => {})
  }

  // Queue a mutation and resolve once the drain reaches a terminal state:
  // confirmed, unconfirmed-but-landed, or null for unreadable storage. The
  // outer promise always settles - a failed get/set can never hang a caller
  // or wedge the queue behind it.
  write(mutate: Intent): Promise<WriteResult> {
    this.pending.push(mutate)
    return new Promise<WriteResult>((resolve) => {
      // drain().catch keeps a synchronous exception from hanging the caller:
      // every queued job must reach a terminal value.
      this.enqueue(async () => resolve(await this.drain().catch(() => null)))
    })
  }

  // Replays pending intents and this copy's union over the current stored
  // value. Wire it to every library-key change event: when a foreign commit
  // lands on top of an earlier write from this copy, this is what puts it
  // back.
  repair(): Promise<WriteResult> {
    return new Promise<WriteResult>((resolve) => {
      this.enqueue(async () => resolve(await this.drain().catch(() => null)))
    })
  }

  // Folds `mine` and every pending intent over the observed library, then
  // keeps only the intents that would still change the merged result - an
  // intent is satisfied exactly when the merged library already carries it,
  // so replaying a satisfied one can never resurrect dropped content.
  private fold(cur: Library): { merged: Library; threw: boolean } {
    let merged = mergeLib(cur, this.mine ?? cur)
    let threw = false
    const keep: Intent[] = []
    for (const m of this.pending) {
      // A throwing intent can never be satisfied: drop it so one bad mutation
      // cannot wedge every drain, and report it so the caller sees 'failed'
      // instead of an applied lie.
      try {
        const applied = m(merged)
        if (applied !== null) merged = mergeLib(merged, applied)
        // Satisfied only when the OBSERVED stored library already carries the
        // intent. Checking against `merged` would drop an intent the moment it
        // touched memory - a set that then fails would lose it silently.
        const probe = m(cur)
        if (probe === null || sameLib(cur, mergeLib(cur, probe))) continue
        keep.push(m)
      } catch {
        threw = true
      }
    }
    this.pending = keep
    return { merged, threw }
  }

  private async drain(): Promise<WriteResult> {
    let best: Library | null = null
    for (let i = 0; i < 6; i++) {
      const cur = await readLib(this.kv)
      if (!cur) continue
      const { merged, threw } = this.fold(cur)
      if (threw) return null
      if (sameLib(cur, merged)) {
        // The observed library already carries every intent and our union.
        this.mine = merged
        return { lib: merged, confirmed: true }
      }
      best = merged
      const next = { ...merged, rev: Math.max(cur.rev, merged.rev) + 1 }
      try {
        await this.kv.set(LIB_KEY, serializeLibrary(next))
      } catch {
        // A failed set may mean a peer write landed instead: the next pass
        // re-reads and replays the merge on top of it.
        continue
      }
      this.mine = next
      best = next
      // The set landed but a peer commit may have raced it: confirm by
      // re-reading and folding still-pending intents over what storage
      // actually holds now. Pending intents survive an unverifiable confirm
      // for the next drain instead of being dropped as 'probably applied'.
      const after = await readLib(this.kv)
      if (!after) return { lib: next, confirmed: false }
      const { merged: folded, threw: threwAfter } = this.fold(after)
      if (threwAfter) return null
      this.mine = folded
      best = folded
      if (this.pending.length === 0 && sameLib(after, folded)) return { lib: folded, confirmed: true }
    }
    return best === null ? null : { lib: best, confirmed: false }
  }
}

// Structural, never referential: every read is a fresh JSON parse, so plans
// compare by core content plus stamp - a same-content reserialize must be a
// no-op or the drain would rewrite forever.
const sameDoc = (a: PlanDoc, b: PlanDoc) => a.id === b.id && a.updated === b.updated && sameCore(a, b)
const sameLib = (a: Library, b: Library) =>
  Object.keys(a.plans).length === Object.keys(b.plans).length &&
  Object.keys(a.gone).length === Object.keys(b.gone).length &&
  Object.entries(a.plans).every(([id, d]) => {
    const e = b.plans[id]
    return !!e && sameDoc(d, e)
  }) &&
  Object.entries(a.gone).every(([id, tomb]) => {
    const e = b.gone[id]
    return !!e && e.ts === tomb.ts && e.born === tomb.born
  })
