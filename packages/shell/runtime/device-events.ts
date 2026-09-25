// The phone's hardware as one sandboxed view hears it: `device.watch` starts a
// type, `device.unwatch` or revocation stops it, and nothing reaches a view that
// did not ask. An SDK older than a type would treat its event as a protocol
// error, so asking is also what makes a new type safe to send (contract 3.8).

import type { DeviceEvent, DeviceEvents, Evt } from '../../sdk/protocol.ts'
import { type Heard, listen, orientation, watchOrientation } from '../device.ts'
import { subscribeToggles, toggles } from '../springboard/toggles.ts'
import type { SessionView } from './sessions.ts'

/** A view's side of it, or the embedding page's in packages/shell/main.ts, which hears as an always-active view. */
type Hearer = { readonly info: Pick<SessionView['info'], 'visible' | 'active'>; send: SessionView['send'] }

export function deviceEvents(view: Hearer) {
  const live = new Map<DeviceEvent, () => void>()
  const send = <K extends DeviceEvent>(type: K, data: DeviceEvents[K]) =>
    view.send({ ev: 'device', p: { type, data } } as Evt)
  // A press goes to the view you are using; its slide and release follow it even if it no longer is.
  const button = <K extends keyof Heard>(type: K) =>
    listen(type, (e) => {
      if (e.action === 'press' && !(view.info.visible && view.info.active)) return false
      send(type, e as DeviceEvents[K])
      return true
    })
  const start: Record<DeviceEvent, () => () => void> = {
    volume: () => button('volume'),
    'camera-control': () => button('camera-control'),
    side: () => button('side'),
    orientation: () => watchOrientation(() => send('orientation', orientation())),
    switches: () => subscribeToggles(() => send('switches', { ...toggles }))
  }
  /** What a state type is right now; the reply to its watch. */
  const current: Partial<Record<DeviceEvent, () => unknown>> = {
    orientation,
    switches: () => ({ ...toggles })
  }
  return {
    watch(type: DeviceEvent) {
      if (!live.has(type)) live.set(type, start[type]())
      return current[type]?.()
    },
    unwatch(type: DeviceEvent) {
      live.get(type)?.()
      live.delete(type)
    },
    close() {
      for (const stop of live.values()) stop()
      live.clear()
    }
  }
}
