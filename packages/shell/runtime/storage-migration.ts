// Copies every store from one backend to another. The source is read in one
// transaction so every store comes from the same moment: an uninstall in another
// tab cannot land between `installed` and `releases`. The destination is emptied
// first, so a retry after an interrupted copy does not keep rows the source has
// deleted since. Writes go a few rows per transaction so no single commit has to
// carry every release bundle of the device at once.

import { type Backend, type Key, STORES, type Store } from './database.ts'

const BATCH = 32

export async function copyStores(from: Backend, to: Backend): Promise<number> {
  const snapshot = await from.transaction([...STORES], 'readonly', async (tx) => {
    const out: [Store, [Key, unknown][]][] = []
    for (const store of STORES) out.push([store, await tx.all(store)])
    return out
  })
  await to.transaction([...STORES], 'readwrite', async (tx) => {
    for (const store of STORES) await tx.clear(store)
  })
  let rows = 0
  for (const [store, all] of snapshot) {
    for (let i = 0; i < all.length; i += BATCH)
      await to.transaction([store], 'readwrite', async (tx) => {
        for (const [key, value] of all.slice(i, i + BATCH)) await tx.put(store, key, value)
      })
    rows += all.length
  }
  return rows
}
