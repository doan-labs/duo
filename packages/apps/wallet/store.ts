// Wallet state on the kit's KV cells (uikit/kv.ts): the navigation path and
// the open sheets live in os.session so both displays' copies agree and the
// fold hands the page over whole. The data itself lives in
// `@doan-labs/duo-fixtures/wallet.ts`, bound to os.storage at boot.

import type { PassGroup } from '@doan-labs/duo-fixtures/wallet.ts'
import { walletStore } from '@doan-labs/duo-fixtures/wallet.ts'
import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'

/**
 * The navigation path as destination ids. `[0]` is `browse` or `stack`;
 * deeper entries are `g:<group>` and `p:<passId>`. The cover draws it as a
 * pushed stack; the unfolded pane reads only the top. Kept in a cell so
 * folding never loses the page.
 */
const pathCell = cell<string[]>('session', 'wallet.path', ['browse'])
export const usePath = () => useSyncExternalStore(pathCell.subscribe, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
export const goToPath = (p: string[]) => pathCell.set(p)

/** The double-click pay sheet: which pass is armed, and whether it has paid. */
const payCell = cell<{ id: string; phase: 'armed' | 'done' } | null>('session', 'wallet.pay', null)
export const usePay = () => useSyncExternalStore(payCell.subscribe, payCell.get)
export const armPay = (id: string) => payCell.set({ id, phase: 'armed' })
export const confirmPay = () => {
  const p = payCell.get()
  if (p) payCell.set({ ...p, phase: 'done' })
}
export const closePay = () => payCell.set(null)

/** The stack page's front card: a tap fans it to the top. */
const fanCell = cell('session', 'wallet.fan', '')
export const useFanSel = () => useSyncExternalStore(fanCell.subscribe, fanCell.get)
export const selFan = (id: string) => fanCell.set(id)

/** The browse promo card: the "Passes and Tickets" banner until it is dismissed. */
const promoCell = cell('session', 'wallet.promo', true)
export const usePromo = () => useSyncExternalStore(promoCell.subscribe, promoCell.get)
export const dismissPromo = () => promoCell.set(false)

/** The add-pass sheet, open for one group (the picker lives in the sheet). */
const addCell = cell<{ group: PassGroup } | null>('session', 'wallet.add', null)
export const useAdd = () => useSyncExternalStore(addCell.subscribe, addCell.get)
export const openAdd = addCell.set
export const setAddGroup = (group: PassGroup) => {
  const a = addCell.get()
  if (a) addCell.set({ group })
}
export const closeAdd = () => addCell.set(null)

/** The whole book, re-rendered on every write. */
export const useBook = () => useSyncExternalStore(walletStore.subscribe, walletStore.get)
