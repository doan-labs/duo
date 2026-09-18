/**
 * Runs `fn` inside a same-document view transition, so whatever it changes on
 * screen cross-fades instead of snapping. Falls back to a plain call where the
 * API is missing or the user asked for reduced motion. Concurrent calls are
 * fine: the browser skips the one in flight.
 */
export function transition(fn: () => void) {
  const doc = typeof document === 'undefined' ? undefined : document
  if (!doc?.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return fn()
  const vt = doc.startViewTransition(fn)
  // A newer transition skips the one in flight; that is expected, not an error to surface.
  vt.ready.catch(() => {})
  vt.finished.catch(() => {})
}
