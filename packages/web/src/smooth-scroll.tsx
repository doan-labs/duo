import { ReactLenis, useLenis } from 'lenis/react'
import { useReducedMotion } from 'motion/react'
import { type ReactNode, useState } from 'react'

/**
 * Lenis on the window, mounted for every reader. Reduced motion takes the frame
 * loop and the wheel smoothing away through the options rather than skipping
 * the component.
 *
 * It used to return `children` unwrapped for those readers, on the reasoning
 * that `root` renders children directly so the DOM matches either way. The DOM
 * does match. `useId` does not: it encodes the React tree PATH, so mounting the
 * page one component shallower on a reduced-motion client than the server had
 * it desynchronised every generated id below this point, and the mismatch
 * surfaced in whichever component happened to call `useId` (the sidebar, the
 * nav's menu) rather than here. One tree, always.
 *
 * The tuning, and why:
 *
 * `duration` is under Lenis's own 1.2 s. At the default the page keeps gliding
 * after the wheel has stopped, which reads as floaty; shorter lands the scroll
 * while the gesture still feels connected to it.
 *
 * `syncTouch` stays off. A finger already has the platform's own physics, and
 * taking it over makes a phone feel like it is scrolling someone else's page.
 * Touch therefore scrolls natively and only the wheel is smoothed.
 *
 * `anchors` takes no offset of its own. Lenis reads the target's
 * `scroll-margin-top`, so the clearance under the sticky nav is set once in
 * CSS, in `reset.css` and in the doc headings, and holds whether or not Lenis
 * is mounted. Passing an offset here as well lands the heading twice as far
 * down, which is measurably what happened.
 *
 * `stopInertiaOnNavigate` lets the router's scroll to top win over a glide that
 * is still running when a nav link is clicked. Regions marked
 * `data-lenis-prevent`, such as the docs sidebar, keep their own native scroll:
 * Lenis honours that attribute itself, so nothing here has to name them.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const still = useReducedMotion() ?? false
  return (
    <ReactLenis
      root
      options={{
        duration: 0.85,
        easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
        syncTouch: false,
        // Off, not absent: no frame loop and no wheel interception, so the
        // reader gets the platform's own scrolling.
        autoRaf: !still,
        smoothWheel: !still,
        anchors: true,
        stopInertiaOnNavigate: true
      }}
    >
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
