// Wallet state, the baked-app way (docs/decisions.md 59): module cells read
// through useSyncExternalStore so the cover and the inner copy render the same
// page and one write hits both. The data itself lives in
// `@doan-labs/duo-fixtures/wallet.ts`, persisted across reloads.

import type { PassGroup } from '@doan-labs/duo-fixtures/wallet.ts'
import { walletStore } from '@doan-labs/duo-fixtures/wallet.ts'
import { useSyncExternalStore } from 'react'

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
 * The navigation path as destination ids. `[0]` is `browse` or `stack`;
 * deeper entries are `g:<group>` and `p:<passId>`. The cover draws it as a
 * pushed stack; the unfolded pane reads only the top. Kept in a cell so
 * folding never loses the page.
 */
const pathCell = cell<string[]>(['browse'])
export const usePath = () => useSyncExternalStore(pathCell.sub, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
export const goToPath = (p: string[]) => pathCell.set(p)

/** The double-click pay sheet: which pass is armed, and whether it has paid. */
const payCell = cell<{ id: string; phase: 'armed' | 'done' } | null>(null)
export const usePay = () => useSyncExternalStore(payCell.sub, payCell.get)
export const armPay = (id: string) => payCell.set({ id, phase: 'armed' })
export const confirmPay = () => {
  const p = payCell.get()
  if (p) payCell.set({ ...p, phase: 'done' })
}
export const closePay = () => payCell.set(null)

/** The stack page's front card: a tap fans it to the top. */
const fanCell = cell<string>('')
export const useFanSel = () => useSyncExternalStore(fanCell.sub, fanCell.get)
export const selFan = (id: string) => fanCell.set(id)

/** The browse promo card: the "Passes and Tickets" banner until it is dismissed. */
const promoCell = cell(true)
export const usePromo = () => useSyncExternalStore(promoCell.sub, promoCell.get)
export const dismissPromo = () => promoCell.set(false)

/** The add-pass sheet, open for one group (the picker lives in the sheet). */
const addCell = cell<{ group: PassGroup } | null>(null)
export const useAdd = () => useSyncExternalStore(addCell.sub, addCell.get)
export const openAdd = addCell.set
export const setAddGroup = (group: PassGroup) => {
  const a = addCell.get()
  if (a) addCell.set({ group })
}
export const closeAdd = () => addCell.set(null)

/** The whole book, re-rendered on every write. */
export const useBook = () => useSyncExternalStore(walletStore.subscribe, walletStore.get)
