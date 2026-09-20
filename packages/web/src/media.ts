// Viewport queries for the few places that swap what renders, not just how it
// looks. The server and first client render take the wide branch, then the
// hook corrects after hydration.
import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (fn: () => void) => {
    const m = matchMedia(query)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }
}

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => matchMedia(query).matches,
    () => false
  )
}

/** Under 734 px: the kit strip drops its second run and becomes a scroller the visitor pushes. */
export const useNarrow = () => useMedia('(max-width: 734px)')
