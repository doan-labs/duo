import { useEffect } from 'react'

type SafariScrollMessage = { type: 'duo-safari-scroll'; top: number }

/**
 * The Safari app is a real cross-origin iframe, so its shell cannot observe
 * the page's scroll events directly. Keep this bridge tiny and opt-in through
 * the parent window: no page data crosses the boundary, only the scroll
 * position the browser chrome reads. The shell decides what a position means;
 * a wheel event here would report a scrollY the browser has not applied yet
 * and fight the shell's own reading.
 */
export function SafariScrollBridge() {
  useEffect(() => {
    if (window.parent === window) return

    const send = (event?: Event) => {
      const target = event?.target instanceof Element ? event.target : null
      const message: SafariScrollMessage = { type: 'duo-safari-scroll', top: target?.scrollTop ?? window.scrollY }
      window.parent.postMessage(message, '*')
    }
    // Scroll events do not bubble, but they still pass the window on the way down.
    window.addEventListener('scroll', send, { capture: true, passive: true })
    send()
    return () => window.removeEventListener('scroll', send, true)
  }, [])

  return null
}
