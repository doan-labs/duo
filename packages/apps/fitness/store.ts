// Fitness's app state: the kit's KV cells on os.session, same `path` shape as
// Health, so a selection survives the fold. The data is the health book bound
// to os.storage at boot - a workout logged in Health is already here.

import { healthStore } from '@doan-labs/duo-fixtures/health.ts'
import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useEffect, useSyncExternalStore } from 'react'

/** `summary` | `activity` | `workouts` | `awards` at root, `w:<id>` pushed. */
const pathCell = cell<string[]>('session', 'fitness.path', ['summary'])
export const usePath = () => useSyncExternalStore(pathCell.subscribe, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
/** The path outside render: handlers that check what page is up. */
export const pathNow = () => pathCell.get()

/** The Activity tab's date scrubber: 0 is today, 1 yesterday, and so on. */
const dayCell = cell('session', 'fitness.day', 0)
export const useDayOffset = () => useSyncExternalStore(dayCell.subscribe, dayCell.get)
export const scrubDay = (d: -1 | 1) => dayCell.set(Math.max(0, dayCell.get() + d))
export const setDayOffset = (n: number) => dayCell.set(Math.max(0, n))
export const resetDay = () => dayCell.set(0)

/** The sheets Fitness can raise: add-workout, change-goals, none. */
const sheetCell = cell<'workout' | 'goals' | null>('session', 'fitness.sheet', null)
export const useSheet = () => useSyncExternalStore(sheetCell.subscribe, sheetCell.get)
export const openSheet = sheetCell.set
export const closeSheet = () => sheetCell.set(null)

export const useBook = () => useSyncExternalStore(healthStore.subscribe, healthStore.get)

/** Same clock as Health: the active copy accrues, the parked one just draws. */
export function useTicker(off?: boolean) {
  useEffect(() => {
    if (off) return
    const t = setInterval(healthStore.poke, 30_000)
    return () => clearInterval(t)
  }, [off])
}
