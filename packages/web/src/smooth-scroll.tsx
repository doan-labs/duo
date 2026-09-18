import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Lenis on the window. With `root` it renders children directly, so both
 * branches give the same DOM and hydration is safe; reduced-motion readers
 * keep native scrolling. `stopInertiaOnNavigate` lets the router's scroll to
 * top win over a glide that is still running when a nav link is clicked.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  if (useReducedMotion()) return children
  return (
    <ReactLenis root options={{ anchors: true, stopInertiaOnNavigate: true }}>
      {children}
    </ReactLenis>
  )
}
