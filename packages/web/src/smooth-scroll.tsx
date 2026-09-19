import { ReactLenis, useLenis } from 'lenis/react'
import { useReducedMotion } from 'motion/react'
import { type ReactNode, useState } from 'react'

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
      {import.meta.env.DEV && <GlideButton />}
    </ReactLenis>
  )
}

// Dev only, for screen recordings: a dot in the top right corner that glides the page
// to the bottom at a steady pace and hides itself while it runs. Click again to stop.
const GLIDE_SECONDS = 45

function GlideButton() {
  const lenis = useLenis()
  const [gliding, setGliding] = useState(false)
  if (!lenis) return null
  const toggle = () => {
    if (gliding) {
      lenis.stop()
      lenis.start()
      setGliding(false)
      return
    }
    setGliding(true)
    lenis.scrollTo(document.documentElement.scrollHeight, {
      duration: GLIDE_SECONDS,
      easing: (t) => t,
      onComplete: () => setGliding(false)
    })
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={gliding ? 'Stop the glide' : 'Glide to the bottom'}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 9999,
        width: 14,
        height: 14,
        padding: 0,
        border: 0,
        borderRadius: '0 0 0 6px',
        background: gliding ? 'transparent' : 'rgba(127,127,127,0.35)',
        cursor: 'pointer'
      }}
    />
  )
}
