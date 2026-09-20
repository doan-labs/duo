import { type RefObject, useEffect, useState } from 'react'

/** The width two columns start at. The cover display stays under it; so does a split half. */
export const SPLIT = 600

/**
 * True once the box is wide enough for two columns, measured with a
 * `ResizeObserver` on the app's own root rather than read off the display: a
 * split half of the inner display is as narrow as the cover and gets the cover's
 * layout. A boolean is the whole result on purpose. An app that keeps the
 * observed width in state re-renders on every pixel of the fold; this one
 * re-renders when the layout actually changes.
 */
export function useSplit(ref: RefObject<HTMLElement | null>, at: number = SPLIT) {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > at))
    ro.observe(ref.current!)
    return () => ro.disconnect()
  }, [ref, at])
  return wide
}
