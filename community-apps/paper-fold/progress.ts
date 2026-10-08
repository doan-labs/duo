// Durable progress authority on the SDK 0.1 conditional-write API. Progress
// lives in per-model receipt keys - one per catalog id, so the causal record
// stays bounded - and every durable write is a compare-and-set against the
// {rev, gen} token the intent was computed from: a moved space rejects with
// E_CONFLICT, the writer re-reads the exact new entry and re-unions its
// semantic intent (confirmed peer facts are preserved, never a frozen full
// doc re-sent under a fresh token), and a dead generation rejects E_GONE,
// which stops this copy's authority entirely. An unknown outcome is read
// back against the same key before any retry, so the same operation keeps
// one identity - never a blind new write. A failed read returns failed:
// absent knowledge can never become an unconditional blank/seed overwrite.
// The legacy whole-map `progress` doc is still read and repaired when it
// lacks facts, but intent writes never touch it: a stale whole-doc value
// left by an old build is exactly what the conditional repair pass heals.
// Reset is a tombstone value carrying a fresh incarnation, not a delete, so
// a pre-reset write still in flight cannot resurrect erased progress.
import { type ModelProgress, mergeProgress, type ProgressMap, parseProgress, progressSubset } from './engine.ts'

// Minimal conditional-write surface both the SDK `os.storage`/`os.session`
// and test spaces satisfy.
export interface Cas {
  entry: (k: string) => Promise<{ v: string | null; rev: number; gen: number }>
  set: (k: string, v: string, expect?: { rev: number; gen: number }) => Promise<unknown>
  del: (k: string, expect?: { rev: number; gen: number }) => Promise<unknown>
}

export const PROGRESS_KEY = 'progress'
export const receiptKey = (modelId: string) => `progress.m.${modelId}`

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const codeOf = (e: unknown): string | null => (isObj(e) && typeof e.code === 'string' ? e.code : null)

/** Never-throw parse of one model's receipt record. */
export function parseReceipt(raw: string | null | undefined): ModelProgress | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v)) return null
    const hi = isNum(v.hi) ? Math.max(0, Math.floor(v.hi)) : 0
    const rec: ModelProgress = { hi, done: v.done === true, at: isNum(v.at) ? v.at : 0 }
    if (isNum(v.inc) && v.inc > 0) rec.inc = Math.floor(v.inc)
    return rec
  } catch {
    return null
  }
}

/** cur already carries every fact intent adds (hi watermark and done latch). */
const covers = (cur: ModelProgress | null, intent: ModelProgress) =>
  cur !== null && cur.hi >= intent.hi && (cur.done || !intent.done) && (cur.inc ?? 0) >= (intent.inc ?? 0)

const union = (a: ModelProgress | null, b: ModelProgress): ModelProgress =>
  mergeProgress(a ? { m: a } : {}, { m: b }).m!

export type CasOutcome<Doc> =
  | { kind: 'committed'; committed: Doc }
  // The doc already durable covers (or supersedes) the intent - adopt it.
  | { kind: 'adopted'; committed: Doc }
  // Outcome unknown after bounded rounds; caller routes through reconcile.
  | { kind: 'failed' }
  // E_GONE: this generation's authority is dead - stop, never retry.
  | { kind: 'gone' }

/**
 * Per-key rebase policy: given the exact durable value and the semantic
 * intent, return `commit` (the doc to write under the entry's token),
 * `adopt` (the durable doc wins - no write), or neither (intent already
 * covered - the existing durable doc is the committed answer).
 */
export type Decide<Doc> = (cur: Doc | null, intent: Doc) => { commit?: Doc; adopt?: Doc }

/**
 * One compare-and-set intent loop for any document shape. Each round reads
 * the entry (value+token atomically), re-decides on exactly that value, and
 * writes under its token. E_CONFLICT loops to the exact new value+token;
 * E_GONE stops; any other rejection is an unknown outcome and resolves by
 * read-back of the same key - the intent's identity never changes.
 */
// Same-space writes chain through a per-store tail: the host's conservative
// token conflicts on ANY sibling commit, so parallel conditional writes from
// this copy would invalidate each other deterministically. Serializing keeps
// self-writes conflict-free and preserves admitted intent order; only a
// genuine peer commit can still produce E_CONFLICT.
const tails = new WeakMap<Cas, Promise<unknown>>()

async function casAttempt<Doc>(
  store: Cas,
  key: string,
  parse: (raw: string | null) => Doc | null,
  decide: Decide<Doc>,
  intent: Doc,
  wire: (doc: Doc) => string,
  rounds: number
): Promise<CasOutcome<Doc>> {
  for (let round = 0; round < rounds; round++) {
    let e: { v: string | null; rev: number; gen: number }
    try {
      e = await store.entry(key)
    } catch {
      return { kind: 'failed' }
    }
    const cur = parse(e.v)
    const d = decide(cur, intent)
    if (d.adopt !== undefined) return { kind: 'adopted', committed: d.adopt }
    if (d.commit === undefined) return { kind: 'committed', committed: cur ?? intent }
    try {
      await store.set(key, wire(d.commit), { rev: e.rev, gen: e.gen })
      return { kind: 'committed', committed: d.commit }
    } catch (err) {
      const code = codeOf(err)
      if (code === 'E_GONE') return { kind: 'gone' }
      if (code === 'E_CONFLICT') continue // typed, provably zero-effect: safe to rebase
      // Any other rejection is an ambiguous outcome: a timed-out conditional
      // write may still commit later, and a readback equal to the old value
      // cannot prove otherwise. Read back the same key once - a doc that
      // covers the intent resolves it; anything else reports unknown/partial
      // rather than authorizing a second write that could race the original.
      try {
        const reread = await store.entry(key)
        const again = decide(parse(reread.v), intent)
        if (again.adopt !== undefined) return { kind: 'adopted', committed: again.adopt }
        if (again.commit === undefined) return { kind: 'committed', committed: parse(reread.v) ?? d.commit }
      } catch {
        return { kind: 'failed' }
      }
      return { kind: 'failed' }
    }
  }
  return { kind: 'failed' }
}

/**
 * One compare-and-set intent loop for any document shape (see casAttempt for
 * the semantics); calls on the same store serialize so the app's own writes
 * never conflict each other on the space-wide token.
 */
export function casUpdate<Doc>(
  store: Cas,
  key: string,
  parse: (raw: string | null) => Doc | null,
  decide: Decide<Doc>,
  intent: Doc,
  wire: (doc: Doc) => string,
  rounds = 3
): Promise<CasOutcome<Doc>> {
  const prev = tails.get(store) ?? Promise.resolve()
  const next = prev
    .then(() => casAttempt(store, key, parse, decide, intent, wire, rounds))
    .catch(() => ({ kind: 'failed' }) as CasOutcome<Doc>)
  tails.set(
    store,
    next.then(() => undefined)
  )
  return next
}

/** Never-throw read of one receipt entry value for the merge side. */
const safeEntry = async (store: Cas, k: string): Promise<string | null> => {
  try {
    return (await store.entry(k)).v
  } catch {
    // An unreadable key is absent knowledge, not a fact to keep - merge
    // continues; repair writes still need their own successful entry.
    return null
  }
}

/** Everything durable knows: legacy aggregate doc union every receipt. */
export async function durableProgress(
  store: Cas,
  modelIds: string[]
): Promise<{
  facts: ProgressMap
  aggregate: ProgressMap
  receipts: Record<string, ModelProgress | undefined>
}> {
  const aggregate = parseProgress(await safeEntry(store, PROGRESS_KEY))
  const receipts: Record<string, ModelProgress | undefined> = {}
  for (const id of modelIds) {
    const rec = parseReceipt(await safeEntry(store, receiptKey(id)))
    if (rec) receipts[id] = rec
  }
  const receiptMap: ProgressMap = {}
  for (const [id, rec] of Object.entries(receipts)) if (rec) receiptMap[id] = rec
  return { facts: mergeProgress(aggregate, receiptMap), aggregate, receipts }
}

/** Grow-only receipt rebase: union confirmed peer facts with our intent. */
const decideReceipt: Decide<ModelProgress> = (cur, intent) => {
  // A higher incarnation is a reset tombstone: a stale pre-reset intent in
  // flight is honestly refused instead of resurrecting erased progress.
  if ((cur?.inc ?? 0) > (intent.inc ?? 0)) return { adopt: cur! }
  return covers(cur, intent) ? { adopt: cur! } : { commit: union(cur, intent) }
}

export interface WriteResult {
  rec: ModelProgress
  acked: boolean
  gone: boolean
}

/**
 * Commit one model's receipt conditionally. `acked` means the host confirmed
 * the merged record (or a covering doc) durably; `gone` means this copy's
 * generation is dead and it must stop writing; otherwise the caller routes
 * the intent through the deduped reconcile pass rather than guessing.
 */
export async function receiptWrite(store: Cas, modelId: string, intent: ModelProgress): Promise<WriteResult> {
  const r = await casUpdate(store, receiptKey(modelId), parseReceipt, decideReceipt, intent, JSON.stringify)
  return {
    rec: r.kind === 'committed' || r.kind === 'adopted' ? r.committed : intent,
    acked: r.kind === 'committed' || r.kind === 'adopted',
    gone: r.kind === 'gone'
  }
}

/**
 * Admitted progress write: optimistic state already moved, so this only
 * commits the one model's receipt. The whole-map aggregate is deliberately
 * left alone - durable readers union it with the receipts, and a reconcile
 * pass repairs it only if it is observed lacking facts.
 */
export async function progressWrite(
  store: Cas,
  modelId: string,
  intent: ModelProgress
): Promise<{ map: ProgressMap; acked: boolean; gone: boolean }> {
  const { rec, acked, gone } = await receiptWrite(store, modelId, intent)
  return { map: { [modelId]: rec }, acked, gone }
}

/**
 * Legitimate reset: a tombstone value with a fresh incarnation, conditional
 * on the observed token. Because reset is a value, not a delete, grow-only
 * merges keep working and a pre-reset intent in flight is refused by
 * incarnation - max merge can never erase the reset itself.
 */
export async function receiptReset(store: Cas, modelId: string, at: number): Promise<WriteResult> {
  const r = await casUpdate(
    store,
    receiptKey(modelId),
    parseReceipt,
    (cur) => ({ commit: { hi: 0, done: false, at, inc: (cur?.inc ?? 0) + 1 } }),
    { hi: 0, done: false, at },
    JSON.stringify
  )
  return {
    rec: r.kind === 'committed' || r.kind === 'adopted' ? r.committed : { hi: 0, done: false, at },
    acked: r.kind === 'committed' || r.kind === 'adopted',
    gone: r.kind === 'gone'
  }
}

/**
 * Conditional repair of the legacy aggregate: re-read under CAS and commit
 * the union only if the durable doc still lacks facts; a covering doc
 * adopted in the meantime ends the repair. Conflict drops this pass - the
 * next observed change re-plans against the new value.
 */
export async function repairAggregate(store: Cas, merged: ProgressMap): Promise<boolean> {
  const r = await casUpdate(
    store,
    PROGRESS_KEY,
    parseProgress,
    (cur, intent) => (progressSubset(intent, cur ?? {}) ? { adopt: cur ?? {} } : { commit: intent }),
    merged,
    JSON.stringify
  )
  return r.kind === 'committed' || r.kind === 'adopted'
}

/**
 * Rebase policy for seq/by last-writer documents (ui position, prefs): a
 * strictly newer or equal-ordered durable doc is adopted and our intent is
 * honestly refused; otherwise the intent commits under the observed token.
 * Same semantic intent arriving twice dedupes to whichever seq wins - the
 * loser adopts, so rapid admitted inputs never double-apply.
 */
export const decideSeq = <D extends { seq: number; by: string }>(
  cur: D | null,
  intent: D
): { commit?: D; adopt?: D } => {
  const newer = (a: D, b: D) => (a.seq !== b.seq ? a.seq > b.seq : a.by > b.by)
  if (cur === null || newer(intent, cur)) return { commit: intent }
  return { adopt: cur }
}

export interface RepairPlan {
  aggregate?: ProgressMap
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
  store: Cas,
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
    if (!r || r.hi < b.hi || (!r.done && b.done) || (r.inc ?? 0) < (b.inc ?? 0)) laggingReceipts[id] = b
  }
  const needAggregate = !progressSubset(merged, d.aggregate)
  const sig = JSON.stringify([d.aggregate, laggingReceipts, needAggregate])
  if (!needAggregate && !Object.keys(laggingReceipts).length) {
    held.sig = null
    return { merged, plan }
  }
  if (held.sig === sig) return { merged, plan }
  held.sig = sig
  if (needAggregate) plan.aggregate = merged
  plan.receipts = laggingReceipts
  return { merged, plan }
}
