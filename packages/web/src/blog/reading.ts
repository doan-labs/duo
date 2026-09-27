import { useEffect } from 'react'

// How far into a post the reader is and how long they have spent on it, kept
// for the tab only (sessionStorage), so an app sheet opened from the post can
// say so on the way back. Nothing leaves the browser.

export type Reading = { ms: number; pct: number; title: string }

const key = (slug: string) => `duo-reading:${slug}`

export function readingOf(slug: string): Reading | null {
  try {
    const raw = sessionStorage.getItem(key(slug))
    return raw ? (JSON.parse(raw) as Reading) : null
  } catch {
    return null
  }
}

/** Counts visible seconds and the furthest point of the post body that reached the bottom of the window. */
export function useReading(slug: string, title: string) {
  useEffect(() => {
    if (!slug) return
    const read = { ms: 0, pct: 0, ...readingOf(slug), title }
    const measure = () => {
      const body = document.querySelector('[data-post-body]')
      if (!body) return
      const r = body.getBoundingClientRect()
      const pct = Math.min(1, Math.max(0, (window.innerHeight - r.top) / r.height))
      read.pct = Math.max(read.pct, pct)
    }
    const tick = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      read.ms += 1000
      measure()
      sessionStorage.setItem(key(slug), JSON.stringify(read))
    }, 1000)
    measure()
    return () => {
      window.clearInterval(tick)
      sessionStorage.setItem(key(slug), JSON.stringify(read))
    }
  }, [slug, title])
}
