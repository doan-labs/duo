// Erase All Content and Settings. Clears everything the device persists and
// reloads, so the next boot reseeds the preinstalled catalog exactly as a first
// visit does: bootRegistry() installs each bundled release whose `seeded` mark
// is gone, and grid.ts and wallpaper.ts fall back to what apps.ts ships.
//
// Not `localStorage.clear()`. The shell shares an origin with the website, whose
// own keys are hyphenated (`ipduo-theme`, `duo-builder-*`); the device's all
// start `os.` or `duo.`, so erasing a phone must not sign a reader out of a
// dark page.

import { STORES, transaction } from './database.ts'

const DEVICE_KEY = /^(?:os|duo)\./

/** Wipes the device and reloads. Both displays share this page, so one reload resets the pair. */
export async function erase() {
  await transaction([...STORES], 'readwrite', async (tx) => {
    for (const name of STORES) tx.objectStore(name).clear()
  })
  for (const key of Object.keys(localStorage)) if (DEVICE_KEY.test(key)) localStorage.removeItem(key)
  location.reload()
}
