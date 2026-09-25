// Fitness's app state: the same module-cell pattern as Health (decision 59),
// same `path` shape, so a selection survives the fold. The data is the shared
// health book - a workout logged in Health is already here.

import { healthStore } from '@doan-labs/duo-fixtures/health.ts'
import { useEffect, useSyncExternalStore } from 'react'

function cell<T>(initial: T) {
  let v = initial
  const subs = new Set<() => void>()
  return {
    get: () => v,
    set(n: T) {
      if (Object.is(v, n)) return
      v = n
      for (const s of subs) s()
    },
    sub(cb: () => void) {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    }
  }
}

/** `summary` | `activity` | `workouts` | `awards` at root, `w:<id>` pushed. */
const pathCell = cell<string[]>(['summary'])
export const usePath = () => useSyncExternalStore(pathCell.sub, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
/** The path outside render: handlers that check what page is up. */
export const pathNow = () => pathCell.get()

/** The Activity tab's date scrubber: 0 is today, 1 yesterday, and so on. */
const dayCell = cell(0)
export const useDayOffset = () => useSyncExternalStore(dayCell.sub, dayCell.get)
export const scrubDay = (d: -1 | 1) => dayCell.set(Math.max(0, dayCell.get() + d))
export const setDayOffset = (n: number) => dayCell.set(Math.max(0, n))
export const resetDay = () => dayCell.set(0)

/** The sheets Fitness can raise: add-workout, change-goals, none. */
const sheetCell = cell<'workout' | 'goals' | null>(null)
export const useSheet = () => useSyncExternalStore(sheetCell.sub, sheetCell.get)
export const openSheet = sheetCell.set
export const closeSheet = () => sheetCell.set(null)

export const useBook = () => useSyncExternalStore(healthStore.subscribe, healthStore.get)

/** Same clock as Health: the live copy accrues, the mirror just draws. */
export function useTicker(mirror?: boolean) {
  useEffect(() => {
    if (mirror) return
    const t = setInterval(healthStore.poke, 30_000)
    return () => clearInterval(t)
  }, [mirror])
}
