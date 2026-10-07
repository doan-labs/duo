/**
 * Live-display admission: the one predicate every input handler, deferred
 * callback and effect execution routes through.
 *
 * It must read the SDK's synchronous `os.view` snapshot, never the React
 * copy produced by `useDisplay`: the state value is a render behind, so a
 * fold/hide delivered in the same turn would otherwise be evaluated against
 * a stale true. Callers pass `os.view` at the moment of admission, so a
 * same-turn flip is seen at once.
 *
 * `document.visibilityState` is supplemental only - it backs the occluded
 * painted-but-not-really-visible iframe case the shell reports poorly; it
 * cannot replace the current SDK view.
 */
export function admitLive(view: { visible: boolean; active: boolean }, doc: { visibilityState: string }): boolean {
  return view.visible && view.active && doc.visibilityState === 'visible'
}
