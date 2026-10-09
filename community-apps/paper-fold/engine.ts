// Pure domain logic for Paper Fold: step navigation, per-model progress,
// and validated wire formats for os.session / os.storage payloads.

export interface ModelProgress {
  // Highest step index reached (0..steps.length, where steps.length = result screen).
  hi: number
  done: boolean
  at: number
  // Incarnation counter bumped by reset tombstones: a pre-reset intent in
  // flight carries a lower inc and is refused instead of resurrecting progress.
  inc?: number
}

export type ProgressMap = Record<string, ModelProgress>

export interface Prefs {
  v: 1
  muted: boolean
  // True: full motion. False: reduced motion (user override; absent = follow OS).
  motion: boolean
  seq: number
  by: string
}

export interface UiState {
  v: 1
  model: string | null
  step: number
  seq: number
  by: string
}

// Total order over versioned docs: the two live copies share these keys and
// either may write with state that is a few hundred ms stale (fold race).
// Larger seq wins; `by` breaks simultaneous seq ties deterministically, so
// every copy converges to the same doc and a stale write is never adopted.
export interface Seq {
  seq: number
  by: string
}

export const newerSeq = (a: Seq, b: Seq): boolean => (a.seq !== b.seq ? a.seq > b.seq : a.by > b.by)

export const clampStep = (steps: number, i: number): number =>
  Math.max(0, Math.min(steps, Number.isFinite(i) ? Math.floor(i) : 0))

// Resume position when reopening a model: finished models land on their
// result screen, in-progress ones on the furthest step reached.
export const resumeStep = (steps: number, p: ModelProgress | undefined): number => (p ? clampStep(steps, p.hi) : 0)

export const nextStep = (steps: number, i: number): number => clampStep(steps, i + 1)
export const prevStep = (i: number): number => Math.max(0, i - 1)
export const isResult = (steps: number, i: number): boolean => i >= steps

// Progress is monotonic: revisiting earlier steps never shrinks `hi`,
// and `done` latches once reached.
export const recordProgress = (
  map: ProgressMap,
  modelId: string,
  step: number,
  steps: number,
  at: number
): ProgressMap => {
  const cur = map[modelId]
  const hi = Math.max(cur?.hi ?? 0, clampStep(steps, step))
  const done = Boolean(cur?.done) || hi >= steps
  return { ...map, [modelId]: { hi, done, at } }
}

export const modelDone = (p: ModelProgress | undefined): boolean => Boolean(p?.done)

// Progress is a grow-only map (hi only grows, done only latches), so merging
// two copies is commutative, associative and idempotent: a stale whole-doc
// write can never lose another model's progress once readers merge on read.
// A reset tombstone bumps `inc`; the higher incarnation replaces the record
// wholesale so max merge cannot resurrect progress a reset erased.
export const mergeProgress = (a: ProgressMap, b: ProgressMap): ProgressMap => {
  const out: ProgressMap = { ...a }
  for (const [k, e] of Object.entries(b)) {
    const c = out[k]
    if ((c?.inc ?? 0) > (e.inc ?? 0)) continue
    if ((e.inc ?? 0) > (c?.inc ?? 0)) {
      out[k] = e
      continue
    }
    out[k] = { hi: Math.max(c?.hi ?? 0, e.hi), done: Boolean(c?.done) || e.done, at: Math.max(c?.at ?? 0, e.at) }
  }
  return out
}

// True when every entry in `a` is already covered by `b` - used to detect a
// stale store write that dropped entries our merged view still holds.
export const progressSubset = (a: ProgressMap, b: ProgressMap): boolean =>
  Object.entries(a).every(([k, e]) => {
    const c = b[k]
    return !!c && c.hi >= e.hi && (c.done || !e.done)
  })

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

// ---- wire parsers: accept a raw JSON string or already-parsed value, never throw ----

export function parseProgress(raw: string | null | undefined): ProgressMap {
  if (!raw) return {}
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isObj(v)) return {}
  const out: ProgressMap = {}
  for (const [k, e] of Object.entries(v)) {
    if (!isObj(e)) continue
    const hi = num(e.hi) ? Math.max(0, Math.floor(e.hi)) : 0
    out[k] = { hi, done: e.done === true, at: num(e.at) ? e.at : 0 }
  }
  return out
}

export function parsePrefs(raw: string | null | undefined): Prefs {
  const fallback: Prefs = { v: 1, muted: false, motion: true, seq: 0, by: '' }
  if (!raw) return fallback
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v)) return fallback
    return {
      v: 1,
      muted: v.muted === true,
      motion: v.motion !== false,
      seq: num(v.seq) ? Math.max(0, Math.floor(v.seq)) : 0,
      by: typeof v.by === 'string' ? v.by : ''
    }
  } catch {
    return fallback
  }
}

export function parseUi(raw: string | null | undefined): UiState {
  const fallback: UiState = { v: 1, model: null, step: 0, seq: 0, by: '' }
  if (!raw) return fallback
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v)) return fallback
    return {
      v: 1,
      model: typeof v.model === 'string' ? v.model : null,
      step: num(v.step) ? Math.max(0, Math.floor(v.step)) : 0,
      seq: num(v.seq) ? Math.max(0, Math.floor(v.seq)) : 0,
      by: typeof v.by === 'string' ? v.by : ''
    }
  } catch {
    return fallback
  }
}
