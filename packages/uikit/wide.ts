import { useEffect, useRef, useState } from 'react'

/**
 * Watches the returned ref's own box and reports whether it is wider than `at`.
 *
 * The box decides, not the display: a split half of the inner panel is as narrow
 * as the cover, so an app that branches on `useDisplay()` gets a two-column
 * layout in a space that cannot hold one. Attach the ref to whatever element the
 * layout actually lives in.
 */
export function useWide<T extends HTMLElement = HTMLDivElement>(at = 600) {
  const ref = useRef<T>(null)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > at))
    ro.observe(ref.current!)
    return () => ro.disconnect()
  }, [at])
  return [ref, wide] as const
}
