// The view as the finger left it: hinge angle, the whole-phone turn, the camera's
// orbit and zoom, and whether the phone turns on its own. Kept in localStorage
// under `os.view` so Erase All Content and Settings forgets it with the rest of
// the device, and read once at load. It is a floor, not a pin: the pose bridge
// (`?deg=`, `?yaw=`, `?spin=` and postMessage) poses the phone on purpose and
// always wins, and only gestures write here, so an embedding page's pose never
// becomes a preference.

export type View = {
  /** Hinge target, 0 closed .. 180 open. */
  deg?: number
  /** Whole-phone turn in radians, the Flip button's. */
  yaw?: number
  /** Orbit azimuth and polar in radians and distance in cm, as OrbitControls reports them. */
  az?: number
  pol?: number
  dist?: number
  /** Auto-rotate. */
  spin?: boolean
}

const KEY = 'os.view'

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

let saved: View = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return {}
    return {
      deg: num(raw.deg),
      yaw: num(raw.yaw),
      az: num(raw.az),
      pol: num(raw.pol),
      dist: num(raw.dist),
      spin: typeof raw.spin === 'boolean' ? raw.spin : undefined
    }
  } catch {
    return {}
  }
})()

/** What was saved, as far as it parses. An empty object poses nothing. */
export const view = (): View => saved

export function saveView(patch: View) {
  saved = { ...saved, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Private mode or quota: the pose holds until the page reloads.
  }
}
