// Figures in the first post play themselves: a hook that runs a frame loop
// while the figure is on screen, until the reader takes over, and the keyed
// loop each one plays.
import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/**
 * A figure plays itself while it is on screen, until the reader touches it:
 * `on` is true in view, with motion allowed, before `stop` is called. `t` hands
 * the frame callback seconds since it started playing.
 */
export function useAutoplay<T extends Element>(frame: (t: number) => void) {
  const ref = useRef<T>(null)
  const seen = useInView(ref, { amount: 0.5 })
  const still = useReducedMotion()
  const [touched, setTouched] = useState(false)
  const on = seen && !still && !touched
  const cb = useRef(frame)
  cb.current = frame
  useEffect(() => {
    if (!on) return
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      cb.current((now - start) / 1000)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return { ref, on, stop: () => setTouched(true), play: () => setTouched(false) }
}

/** The value at `t` seconds into a loop of `[second, value]` keyframes, eased between them. */
export function keyed(t: number, keys: readonly (readonly [number, number])[]) {
  const end = keys[keys.length - 1]?.[0] ?? 1
  const x = t % end
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1]!
    const [t1, v1] = keys[i]!
    if (x <= t1) {
      const k = (x - t0) / (t1 - t0 || 1)
      return v0 + (v1 - v0) * (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2)
    }
  }
  return keys[keys.length - 1]?.[1] ?? 0
}
