// Event-time admission for new user intent on this copy.
//
// A Duo app runs on both displays at once: one copy can be painted but hidden
// (folded cover), clipped to zero area, or parked while still 'active' in the
// OS sense. The shell delivers input to the copy it believes is focused, but a
// raw event can still land on an occluded copy (native tooling, a focus leak).
// Converged shared state does not authorise that input: only a copy that is
// BOTH visible AND active at dispatch time may take new user intent.
//
// `live` and `admit` are pure so the admission rules run under plain Bun
// without the SDK client (which touches window/postMessage at import time).
// main.tsx supplies the real snapshot via `live(os.view)` - synchronous, at
// event time, never a lagging React ref.

import { clampStep } from './engine.ts'

export type ViewLike = { visible: boolean; active: boolean }

/** A copy may take new user intent only while it is both visible and active. */
export const live = (v: ViewLike): boolean => v.visible && v.active

/**
 * Gate a user-intent thunk at event time. A rejected intent runs nothing: no
 * ref mutation, no UI change, no KV/session/storage write, no audio, no timer.
 * Returns whether the intent was admitted so callers can branch if needed.
 */
export const admit = (v: ViewLike, run: () => void): boolean => {
  if (!live(v)) return false
  run()
  return true
}

/**
 * Relative transport intent ('next step', 'previous step', arrow keys) resolved
 * against the best-known model and step - never the rendered snapshot, which
 * can lag a rapid accepted input by a frame. The intent is bound to the model
 * it was issued on: if a peer copy has since switched the session to another
 * model, the stale intent is dropped instead of replayed onto that model or
 * double-counting progress. Returns the clamped target step, or null to drop.
 */
export const stepTarget = (
  best: { model: string | null; step: number },
  modelId: string,
  delta: number,
  steps: number
): number | null => (best.model === modelId ? clampStep(steps, best.step + delta) : null)
