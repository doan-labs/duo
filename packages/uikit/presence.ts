import { useEffect, useState } from 'react'

/**
 * Keeps a thing mounted for `ms` after `open` drops so its exit animation can
 * play. `closing` is true during that tail; style the exit off it.
 */
export function usePresence(open: boolean, ms = 340) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = setTimeout(() => setMounted(false), ms)
    return () => clearTimeout(t)
  }, [open, ms])
  return { mounted: open || mounted, closing: !open && mounted }
}
