import type { ViewInfo } from '../../sdk/protocol.ts'

type Glass = { visible: boolean; active: boolean; angle: number; clip: number }
// The loop reports what the glass would show; `sleeping` masks it so a parked
// display reads hidden the moment the device sleeps, not a frame later.
const physical: Record<ViewInfo['display'], Glass> = {
  inner: { visible: false, active: true, angle: 180, clip: 0 },
  cover: { visible: false, active: false, angle: 180, clip: 0 }
}
const displays: Record<ViewInfo['display'], Glass> = {
  inner: { visible: false, active: true, angle: 180, clip: 0 },
  cover: { visible: false, active: false, angle: 180, clip: 0 }
}
let sleeping = false
const masked = (glass: Glass): Glass => ({ ...glass, visible: glass.visible && !sleeping })
const listeners = new Set<() => void>()
export const observeDisplay = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
const emit = () => {
  for (const fn of listeners) fn()
}
export function updateDisplays(inner: Glass, cover: Glass) {
  physical.inner = inner
  physical.cover = cover
  displays.inner = masked(inner)
  displays.cover = masked(cover)
  emit()
}
/** Applies or lifts the sleep mask and pushes the truth at once: a display-state flip cannot wait for the next rendered frame. */
export function maskDisplays(asleep: boolean) {
  if (sleeping === asleep) return
  sleeping = asleep
  displays.inner = masked(physical.inner)
  displays.cover = masked(physical.cover)
  emit()
}
/**
 * Drops DOM focus out of a view no person can see. A hidden copy that keeps
 * focus still receives real key events; hiding the view must move focus.
 */
export function releaseHiddenFocus(element: HTMLElement) {
  const active = document.activeElement
  if (active && element.contains(active) && (sleeping || !element.checkVisibility())) (active as HTMLElement).blur()
}

export function viewInfo(
  element: HTMLElement,
  display: ViewInfo['display'],
  placement: ViewInfo['placement']
): ViewInfo {
  const glass = displays[display]
  return {
    display,
    placement,
    width: element.clientWidth,
    height: element.clientHeight,
    angle: glass.angle,
    active: glass.active,
    visible: glass.visible && glass.clip < (placement === 'left' ? 0.5 : 1) && element.checkVisibility(),
    focused: element.contains(document.activeElement)
  }
}
