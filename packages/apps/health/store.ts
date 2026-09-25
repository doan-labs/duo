// App state, the baked-app way (docs/decisions.md 59): module cells, read
// through useSyncExternalStore, so the cover and the inner copy render the
// same selection and one write hits both. The data itself lives in
// `@doan-labs/duo-fixtures/health.ts`, shared with Fitness.

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

/**
 * The navigation path as destination ids. `[0]` is a root destination
 * (`summary` | `browse` | `sharing`); deeper entries are `cat:<id>`,
 * `m:<id>` or `profile`. The cover draws it as a pushed stack; the unfolded
 * pane reads only the top. Kept in a cell so folding never loses the page.
 */
const pathCell = cell<string[]>(['summary'])
export const usePath = () => useSyncExternalStore(pathCell.sub, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
/** Replace the whole stack, e.g. a sidebar pick that lands mid-tree. */
export const goToPath = (p: string[]) => pathCell.set(p)

/** The add-data / add-workout sheet, open or not, and for which metric. */
const sheetCell = cell<{ metric?: string; workout?: boolean } | null>(null)
export const useSheet = () => useSyncExternalStore(sheetCell.sub, sheetCell.get)
export const openSheet = sheetCell.set
export const closeSheet = () => sheetCell.set(null)

/** The whole book, re-rendered on every write. `dateKey` bumps each poke. */
export const useBook = () => useSyncExternalStore(healthStore.subscribe, healthStore.get)

/**
 * Today's data keeps accruing while the clock runs: a 30 s poke turns the
 * day over at midnight without a reload and nudges intraday totals. The
 * mirror copy draws and starts nothing, so only the live display ticks.
 */
export function useTicker(mirror?: boolean) {
  useEffect(() => {
    if (mirror) return
    const t = setInterval(healthStore.poke, 30_000)
    return () => clearInterval(t)
  }, [mirror])
}
