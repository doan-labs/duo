// The wall clock. Its own file because two unrelated pieces of the shell read the
// same minute: the status stack beside the camera and the lock screen.

import { useEffect, useState } from 'react'

/** The wall clock, re-read every ten seconds so the minute is never more than that late. */
export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])
  return now
}
export const clock = (d: Date) =>
  d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }).replace(/ [AP]M/, '')
export const dateOf = (d: Date) =>
  d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '')
