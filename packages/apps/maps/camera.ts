// Camera motion. Every programmatic move - picking a result, centering on the
// dot, fitting a route - flies rather than snaps. `fly` builds a plan: the
// centre travels in world-pixel space so the path is a straight line on the
// ground, the zoom eases with it and dips a little on long hauls, the way
// Apple Maps pulls out to cross a city. `run` plays a plan through
// requestAnimationFrame until it lands or the map's own panning cancels it.

import { MAX_Z, MIN_Z, project, unproject, type View } from './data.ts'

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export type Plan = { ms: number; at: (t: number) => View }

export function fly(from: View, to: View): Plan {
  // The shorter ground path can cross the date line: fly the equivalent
  // longitude nearest the start, and put the landing back inside +-180.
  const lon = from.lon + ((((to.lon - from.lon) % 360) + 540) % 360) - 180
  const a = project(from.lat, from.lon, to.z)
  const b = project(to.lat, lon, to.z)
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  // Far jumps pull the zoom out first so the ground stays readable en route.
  const dip = Math.min(2.5, Math.max(0, Math.log2(d / 1200)))
  const ms = Math.min(1100, Math.max(380, 380 + 200 * Math.log2(1 + d / 500)))
  return {
    ms,
    at: (t) => {
      const e = ease(t)
      const z = Math.min(MAX_Z, Math.max(MIN_Z, from.z + (to.z - from.z) * e - dip * Math.sin(Math.PI * t)))
      const v = unproject(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, to.z)
      // Tiles wrap the columns already; keeping the view inside +-180 keeps
      // the pins' wrapped deltas on the same side of the seam as the ground.
      return { ...v, lon: ((((v.lon + 180) % 360) + 360) % 360) - 180, z }
    }
  }
}

/**
 * Drives `set` along the plan; returns a cancel. A new play or a pointer grab
 * cancels the flight already in the air, so interruptions feel like picking
 * the map back up, not like it stalls.
 */
export function run(plan: Plan, set: (v: View) => void, done?: () => void): () => void {
  const t0 = performance.now()
  let raf = 0
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / plan.ms)
    set(plan.at(t))
    if (t < 1) raf = requestAnimationFrame(tick)
    else done?.()
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
