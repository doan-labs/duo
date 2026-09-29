// App state on the kit's KV cells (uikit/kv.ts): the navigation path and the
// open sheet live in os.session so both displays' copies agree and the fold
// hands the page over whole. The data itself lives in
// `@doan-labs/duo-fixtures/health.ts`, bound to os.storage at boot.

import { healthStore } from '@doan-labs/duo-fixtures/health.ts'
import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useEffect, useSyncExternalStore } from 'react'

/**
 * The navigation path as destination ids. `[0]` is a root destination
 * (`summary` | `browse` | `sharing`); deeper entries are `cat:<id>`,
 * `m:<id>` or `profile`. The cover draws it as a pushed stack; the unfolded
 * pane reads only the top. Kept in a cell so folding never loses the page.
 */
const pathCell = cell<string[]>('session', 'health.path', ['summary'])
export const usePath = () => useSyncExternalStore(pathCell.subscribe, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
/** Replace the whole stack, e.g. a sidebar pick that lands mid-tree. */
export const goToPath = (p: string[]) => pathCell.set(p)

/** The add-data / add-workout sheet, open or not, and for which metric. */
const sheetCell = cell<{ metric?: string; workout?: boolean } | null>('session', 'health.sheet', null)
export const useSheet = () => useSyncExternalStore(sheetCell.subscribe, sheetCell.get)
export const openSheet = sheetCell.set
export const closeSheet = () => sheetCell.set(null)

/** The whole book, re-rendered on every write. `dateKey` bumps each poke. */
export const useBook = () => useSyncExternalStore(healthStore.subscribe, healthStore.get)

/**
 * Today's data keeps accruing while the clock runs: a 30 s poke turns the
 * day over at midnight without a reload and nudges intraday totals. Only the
 * active copy ticks; the one the fold parks draws and starts nothing.
 */
export function useTicker(off?: boolean) {
  useEffect(() => {
    if (off) return
    const t = setInterval(healthStore.poke, 30_000)
    return () => clearInterval(t)
  }, [off])
}
