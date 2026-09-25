// The embedding page hears the phone's hardware the way an app does: the site's
// /sdk page sends `{ hear: [...types] }` and gets each event back as
// `{ device: { type, data } }`, the payload `os.device.on` hands an app. It
// listens as a view that is always visible and active, so while it hears volume
// or Camera Control those presses are its, exactly as they would be an app's.

import { deviceEventName } from '../sdk/guards.ts'
import { deviceEvents } from './runtime/device-events.ts'

let live: ReturnType<typeof deviceEvents> | null = null

/** Replaces what the page hears; an empty list stops it. Only `origin`, the page that asked, is told. */
export function hear(types: unknown[], origin: string) {
  live?.close()
  const tell = (device: unknown) => parent.postMessage({ device }, origin)
  live = deviceEvents({
    info: { visible: true, active: true },
    send: (e) => {
      if (e.ev === 'device') tell(e.p)
    }
  })
  for (const type of new Set(types.filter(deviceEventName))) {
    const now = live.watch(type)
    if (now) tell({ type, data: now })
  }
}
