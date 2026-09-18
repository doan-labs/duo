import type { ViewInfo } from '../../sdk/protocol.ts'

type Glass = { visible: boolean; active: boolean; angle: number; clip: number }
const displays: Record<ViewInfo['display'], Glass> = {
  inner: { visible: false, active: true, angle: 180, clip: 0 },
  cover: { visible: false, active: false, angle: 180, clip: 0 }
}
const listeners = new Set<() => void>()
export const observeDisplay = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function updateDisplays(inner: Glass, cover: Glass) {
  displays.inner = inner
  displays.cover = cover
  for (const fn of listeners) fn()
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
    visible: glass.visible && glass.clip < (placement === 'left' ? 0.5 : 1),
    focused: element.contains(document.activeElement)
  }
}
