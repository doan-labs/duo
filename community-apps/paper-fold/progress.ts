// Durable progress authority. The `progress` doc is a whole-map aggregate that
// any reader can use, but a store write replaces the whole key: a stale writer
// that never saw (or stopped seeing) a peer's facts would drop them when its
// older map lands last. Per-model receipt keys - one per catalog id, so the
// causal record stays bounded - keep each model's record independently, and
// every write merges the durable doc at write time instead of publishing an
// older in-memory map. Reads and repairs union aggregate + receipts, so a
// clobbered aggregate can never erase what the receipts still carry.
import {
  type ModelProgress,
  mergeProgress,
  type ProgressMap,
  parseProgress,
  progressSubset,
  recordProgress
} from './engine.ts'

// Minimal storage surface both the SDK `os.storage` and test spaces satisfy.
export interface Store {
  get: (k: string) => Promise<string | null>
  set: (k: string, v: string) => Promise<unknown>
}

export const PROGRESS_KEY = 'progress'
export const receiptKey = (modelId: string) => `progress.m.${modelId}`

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/** Never-throw parse of one model's receipt record. */
export function parseReceipt(raw: string | null | undefined): ModelProgress | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v)) return null
    const hi = isNum(v.hi) ? Math.max(0, Math.floor(v.hi)) : 0
    return { hi, done: v.done === true, at: isNum(v.at) ? v.at : 0 }
  } catch {
    return null
  }
}

const safeGet = async (store: Store, k: string): Promise<string | null> => {
  try {
    return await store.get(k)
  } catch {
    // An unreadable key is absent knowledge, not a fact to keep - merge
    // continues and the write below still publishes our own superset.
    return null
  }
}

/** Everything durable knows: aggregate doc union every per-model receipt. */
export async function durableProgress(
  store: Store,
  modelIds: string[]
): Promise<{
  facts: ProgressMap
  aggregate: ProgressMap
  receipts: Record<string, ModelProgress | undefined>
}> {
  const aggregate = parseProgress(await safeGet(store, PROGRESS_KEY))
  const receipts: Record<string, ModelProgress | undefined> = {}
  for (const id of modelIds) {
    const rec = parseReceipt(await safeGet(store, receiptKey(id)))
    if (rec) receipts[id] = rec
  }
  const receiptMap: ProgressMap = {}
  for (const [id, rec] of Object.entries(receipts)) if (rec) receiptMap[id] = rec
  return { facts: mergeProgress(aggregate, receiptMap), aggregate, receipts }
}

/**
 * Admitted progress write: merge the freshest durable doc into the record so a
 * writer that never observed a peer's facts emits their union, then store the
 * per-model receipt first (the record a stale aggregate cannot erase) and
 * publish the aggregate through the mirror last.
 */
export async function progressWrite(
  store: Store,
  best: ProgressMap,
  modelId: string,
  step: number,
  steps: number,
  at: number,
  publish: (mJson: string) => void
): Promise<ProgressMap> {
  const cur = parseProgress(await safeGet(store, PROGRESS_KEY))
  const merged = mergeProgress(best, mergeProgress(cur, recordProgress(best, modelId, step, steps, at)))
  // The SDK's E_TIMEOUT contract asks for a read-back before retrying: the
  // second attempt reads the receipt again so it retries with fresh state.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prev = parseReceipt(await store.get(receiptKey(modelId)))
      const keep = mergeProgress(prev ? { [modelId]: prev } : {}, { [modelId]: merged[modelId]! })[modelId]!
      await store.set(receiptKey(modelId), JSON.stringify(keep))
      break
    } catch (e) {
      if (attempt === 1) console.warn('paperfold: receipt write failed', e)
    }
  }
  publish(JSON.stringify(merged))
  return merged
}

export interface RepairPlan {
  aggregate?: string
  receipts: Record<string, ModelProgress>
}

/**
 * One reconcile pass: fold durable knowledge into `best` (both copies adopt
 * foreign facts) and, on a live copy only, plan repairs for what durable
 * evidence actually lacks. `held.sig` dedupes by the observed durable state, so
 * a deficiency is repaired once per distinct clobbered doc - never per render,
 * and a repeated clobber after a landed repair is repaired again because the
 * signature cleared when the doc was covered.
 */
export async function reconcileProgress(
  store: Store,
  modelIds: string[],
  best: ProgressMap,
  live: boolean,
  held: { sig: string | null }
): Promise<{ merged: ProgressMap; plan: RepairPlan }> {
  const d = await durableProgress(store, modelIds)
  const merged = mergeProgress(mergeProgress(best, d.aggregate), d.facts)
  const plan: RepairPlan = { receipts: {} }
  if (!live) {
    held.sig = null
    return { merged, plan }
  }
  const laggingReceipts: Record<string, ModelProgress> = {}
  for (const id of modelIds) {
    const b = merged[id]
    if (!b) continue
    const r = d.receipts[id]
    if (!r || r.hi < b.hi || (!r.done && b.done)) laggingReceipts[id] = b
  }
  const needAggregate = !progressSubset(merged, d.aggregate)
  const sig = JSON.stringify([d.aggregate, laggingReceipts, needAggregate])
  if (!needAggregate && !Object.keys(laggingReceipts).length) {
    held.sig = null
    return { merged, plan }
  }
  if (held.sig === sig) return { merged, plan }
  held.sig = sig
  if (needAggregate) plan.aggregate = JSON.stringify(merged)
  plan.receipts = laggingReceipts
  return { merged, plan }
}
