import type { KV } from '@doan-labs/duo-sdk'
import {
  type Library,
  latestDoc,
  mergeLib,
  newPlan,
  type PlanDoc,
  parseLibrary,
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
// and clobber it. null marks 'could not read' - writeLib retries the read and
// never writes on top of a library it has not seen.
export const readLib = (storage: LibKV): Promise<Library | null> => storage.get(LIB_KEY).then(parseLibrary, () => null)

// What a confirmed library means for a cold open: the newest stored plan when
// one exists; a fresh layout when the welcome plan was deliberately deleted
// (its tombstone in `gone` bars reviving the shared 'welcome' id); else the
// deterministic first-run welcome both displays can agree on. Reachable only
// after a successful read - a failed read is 'unknown', not 'empty'.
export const seedDoc = (lib: Library): PlanDoc =>
  latestDoc(lib) ?? (lib.gone.welcome !== undefined ? newPlan('Layout 1') : welcomePlan())

// Cold-open admission: 'retry' when the library state is unknown (a failed
// read must not masquerade as an empty library to seed over), null when a doc
// is already on screen (a peer's adopted plan or a user action makes the
// bootstrap stale - stamping ours now would overwrite the fold's settled
// plan), else the doc this copy should open.
export const admitSeed = (lib: Library | null, taken: boolean): PlanDoc | 'retry' | null =>
  lib === null ? 'retry' : taken ? null : seedDoc(lib)

let libQueue = Promise.resolve()
// Library writes funnel through one queue so two quick edits cannot each merge
// into the same stale snapshot and overwrite one another's plans.
const enqueue = (job: () => Promise<void>) => {
  libQueue = libQueue.then(job).catch(() => {})
}

const sameLib = (a: Library, b: Library) =>
  Object.keys(a.plans).length === Object.keys(b.plans).length &&
  Object.keys(a.gone).length === Object.keys(b.gone).length &&
  Object.entries(a.plans).every(([id, d]) => b.plans[id] === d) &&
  Object.entries(a.gone).every(([id, ts]) => b.gone[id] === ts)

// os.storage has no cross-copy compare-and-set: the other display can commit
// between our get and set and we would clobber it. Every write instead
// re-reads, applies the mutation and merges per plan/tombstone (order-
// independent), then loops - a peer's intervening write shows up in the next
// read and the mutation is replayed on top of it, so concurrent edits from
// both displays survive. `mutate` returning null means no write is needed.
// Resolves the library that was confirmed applied (or confirmed a no-op);
// resolves null when the read or write never landed - a failed write must
// never masquerade as an empty library, and a failed iteration must not hang
// the caller or wedge the queue.
export const writeLib = (storage: LibKV, mutate: (lib: Library) => Library | null): Promise<Library | null> =>
  new Promise<Library | null>((resolve) => {
    enqueue(async () => {
      let out: Library | null = null
      let settled = false
      try {
        for (let i = 0; i < 5 && !settled; i++) {
          const cur = await readLib(storage)
          if (!cur) continue
          const mine = mutate(cur)
          const merged = mergeLib(cur, mine ?? cur)
          if (!mine || sameLib(cur, merged)) {
            out = merged
            settled = true
            break
          }
          const next = { ...merged, rev: Math.max(cur.rev, mine.rev) + 1 }
          try {
            await storage.set(LIB_KEY, serializeLibrary(next))
            out = next
            settled = true
          } catch {
            // A failed set may mean a peer write landed instead: re-read and
            // replay the merge on top of it rather than retrying the same blob.
          }
        }
      } finally {
        resolve(settled ? out : null)
      }
    })
  })
