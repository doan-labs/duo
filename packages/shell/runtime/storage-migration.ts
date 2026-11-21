// Copies every store from one backend to another, a few rows per transaction so
// no single commit has to carry every release bundle of the device at once.

import { type Backend, STORES } from './database.ts'

const BATCH = 32

export async function copyStores(from: Backend, to: Backend): Promise<number> {
  let rows = 0
  for (const store of STORES) {
    const all = await from.transaction([store], 'readonly', (tx) => tx.all(store))
    for (let i = 0; i < all.length; i += BATCH)
      await to.transaction([store], 'readwrite', async (tx) => {
        for (const [key, value] of all.slice(i, i + BATCH)) await tx.put(store, key, value)
      })
    rows += all.length
  }
  return rows
}
