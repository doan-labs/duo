// Home state on the kit's KV cells (uikit/kv.ts): the navigation path and the
// open sheets live in os.session so both displays' copies agree and the fold
// hands the page over whole. The data itself lives in
// `@doan-labs/duo-fixtures/home.ts`, bound to os.storage at boot.

import type { AccKind } from '@doan-labs/duo-fixtures/home.ts'
import { homeStore } from '@doan-labs/duo-fixtures/home.ts'
import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'

/**
 * The navigation path as destination ids. `[0]` is `browse`; deeper entries
 * are `g:<group>`, `r:<roomId>` and `a:<accId>`. The cover draws it as a
 * pushed stack; the unfolded pane reads only the top. Kept in a cell so
 * folding never loses the page.
 */
const pathCell = cell<string[]>('session', 'home.path', ['browse'])
export const usePath = () => useSyncExternalStore(pathCell.subscribe, pathCell.get)
export const goRoot = (d: string) => pathCell.set([d])
export const goTo = (d: string) => pathCell.set([...pathCell.get(), d])
export const goBack = () => {
  const p = pathCell.get()
  if (p.length > 1) pathCell.set(p.slice(0, -1))
}
export const goToPath = (p: string[]) => pathCell.set(p)

/** The new-accessory sheet: open for one room, kind picked inside the sheet. */
const addCell = cell<{ room: string; kind: AccKind } | null>('session', 'home.add', null)
export const useAddAcc = () => useSyncExternalStore(addCell.subscribe, addCell.get)
export const openAddAcc = addCell.set
export const setAddKind = (kind: AccKind) => {
  const a = addCell.get()
  if (a) addCell.set({ ...a, kind })
}
export const closeAddAcc = () => addCell.set(null)

/** The new-room sheet: a name field, nothing else. */
const roomCell = cell('session', 'home.room', false)
export const useAddRoom = () => useSyncExternalStore(roomCell.subscribe, roomCell.get)
export const openAddRoom = () => roomCell.set(true)
export const closeAddRoom = () => roomCell.set(false)

/** The whole book, re-rendered on every write. */
export const useBook = () => useSyncExternalStore(homeStore.subscribe, homeStore.get)
