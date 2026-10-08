// Durable progress authority. Progress lives in per-model receipt keys - one
// per catalog id, so the causal record stays bounded - and each write is a
// read-modify-verify merge, never a whole-map replace. The legacy whole-map
// `progress` doc is still read and repaired when it lacks facts, but new
// writes never overwrite it: a stale writer that never saw (or stopped
// seeing) a peer's facts can only clobber a whole-map value, and there is no
// whole-map value left to clobber. Per-key last-writer-wins is still not
// atomic across copies, so every writer verifies its own commit and re-merges
// once if a concurrent write raced in, and a live copy repairs any durable
// deficiency it observes (deduped, never an idle storm).
import { type ModelProgress, mergeProgress, type ProgressMap, parseProgress, progressSubset } from './engine.ts'

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

/** cur already carries every fact intent adds (hi watermark and done latch). */
const covers = (cur: ModelProgress | null, intent: ModelProgress) =>
  cur !== null && cur.hi >= intent.hi && (cur.done || !intent.done)

const union = (a: ModelProgress | null, b: ModelProgress): ModelProgress =>
  mergeProgress(a ? { m: a } : {}, { m: b }).m!

const safeGet = async (store: Store, k: string): Promise<string | null> => {
  try {
    return await store.get(k)
  } catch {
    // An unreadable key is absent knowledge, not a fact to keep - merge
    // continues and the write below still publishes our own superset.
    return null
  }
}

/** Everything durable knows: legacy aggregate doc union every receipt. */
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

export interface WriteResult {
  rec: ModelProgress
  acked: boolean
}

/**
 * Commit one model's record with read-modify-verify: each round re-reads the
 * durable receipt (the read-back the SDK's E_TIMEOUT contract asks for),
 * unions it into the intent so a writer that never observed a peer's facts
 * emits their union, stores once, and re-reads to catch a concurrent write
 * that raced in between. `acked: false` means storage never confirmed the
 * merge - the caller routes the fact through the reconcile pass so the retry
 * is deduped against whatever actually committed rather than guessed.
 */
export async function receiptWrite(store: Store, modelId: string, intent: ModelProgress): Promise<WriteResult> {
  const key = receiptKey(modelId)
  let merged = intent
  for (let round = 0; round < 3; round++) {
    const cur = parseReceipt(await safeGet(store, key))
    merged = union(cur, intent)
    if (covers(cur, intent)) return { rec: merged, acked: true }
    try {
      await store.set(key, JSON.stringify(merged))
    } catch {
      intent = merged
      continue
    }
    const verify = parseReceipt(await safeGet(store, key))
    if (verify && covers(verify, merged)) return { rec: union(verify, merged), acked: true }
    intent = verify ? union(verify, merged) : merged
  }
  return { rec: merged, acked: false }
}

/**
 * Admitted progress write: optimistic state already moved, so this only
 * commits the one model's receipt. The whole-map aggregate is deliberately
 * left alone - durable readers union it with the receipts, and a reconcile
 * pass repairs it only if it is observed lacking facts.
 */
export async function progressWrite(
  store: Store,
  modelId: string,
  intent: ModelProgress
): Promise<{ map: ProgressMap; acked: boolean }> {
  const { rec, acked } = await receiptWrite(store, modelId, intent)
  return { map: { [modelId]: rec }, acked }
}

export interface RepairPlan {
  aggregate?: string
  receipts: Record<string, ModelProgress>
}

/**
 * One reconcile pass: fold durable knowledge into `best` (both copies adopt
 * foreign facts) and, on a live copy only, plan repairs for what durable
 * evidence actually lacks. `held.sig` dedupes by the observed durable state,
 * so a deficiency is repaired once per distinct clobbered doc - never per
 * render, and a repeated clobber after a landed repair is repaired again
 * because the signature cleared when the doc was covered.
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
