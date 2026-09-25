// Home state, the baked-app way (docs/decisions.md 59): module cells read
// through useSyncExternalStore so the cover and the inner copy render the same
// page and one write hits both. The data itself lives in
// `@doan-labs/duo-fixtures/home.ts`, persisted across reloads.

import type { AccKind } from '@doan-labs/duo-fixtures/home.ts'
import { homeStore } from '@doan-labs/duo-fixtures/home.ts'
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
 * The navigation path as destination ids. `[0]` is `browse`; deeper entries
 * are `g:<group>`, `r:<roomId>` and `a:<accId>`. The cover draws it as a
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

/** The new-accessory sheet: open for one room, kind picked inside the sheet. */
const addCell = cell<{ room: string; kind: AccKind } | null>(null)
export const useAddAcc = () => useSyncExternalStore(addCell.sub, addCell.get)
export const openAddAcc = addCell.set
export const setAddKind = (kind: AccKind) => {
  const a = addCell.get()
  if (a) addCell.set({ ...a, kind })
}
export const closeAddAcc = () => addCell.set(null)

/** The new-room sheet: a name field, nothing else. */
const roomCell = cell<boolean>(false)
export const useAddRoom = () => useSyncExternalStore(roomCell.sub, roomCell.get)
export const openAddRoom = () => roomCell.set(true)
export const closeAddRoom = () => roomCell.set(false)

/** The whole book, re-rendered on every write. */
export const useBook = () => useSyncExternalStore(homeStore.subscribe, homeStore.get)
