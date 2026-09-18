export async function storageProbe() {
  const result = { loader: 'storage', origin: location.origin, locks: !!navigator.locks }
  const timeout = (promise) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Probe timed out after 10 s')), 10000))
    ])
  try {
    const db = await timeout(
      new Promise((resolve, reject) => {
        const request = indexedDB.open('ipduo')
        request.onupgradeneeded = () => request.result.createObjectStore('stage2-probe')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    )
    result.open = 'ok'
    const read = () =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('stage2-probe', 'readonly')
        const get = tx.objectStore('stage2-probe').get('one-mib')
        tx.oncomplete = () => resolve(get.result)
        tx.onabort = () => reject(tx.error)
      })
    result.persistedFromPriorRun = (await read()) === 'x'.repeat(1024 * 1024)
    await timeout(
      new Promise((resolve, reject) => {
        const tx = db.transaction('stage2-probe', 'readwrite')
        tx.objectStore('stage2-probe').put('x'.repeat(1024 * 1024), 'one-mib')
        tx.oncomplete = resolve
        tx.onabort = () => reject(tx.error)
        tx.onerror = () => reject(tx.error)
      })
    )
    result.roundTrip = (await read())?.length === 1024 * 1024
    // An aborted write must preserve the last successful transaction.
    await new Promise((resolve) => {
      const tx = db.transaction('stage2-probe', 'readwrite')
      tx.objectStore('stage2-probe').put('bad', 'one-mib')
      tx.onabort = resolve
      tx.abort()
    })
    result.abortPreservesValue = (await read()) === 'x'.repeat(1024 * 1024)
    db.close()
  } catch (e) {
    result.storageError = `${e.name}: ${e.message}`
  }
  if (navigator.locks) {
    try {
      const order = []
      const name = `ipduo:app:stage2-${crypto.randomUUID()}`
      await timeout(
        Promise.all([
          navigator.locks.request(name, async () => {
            order.push('a-start')
            await new Promise((r) => setTimeout(r, 60))
            order.push('a-end')
          }),
          navigator.locks.request(name, () => {
            order.push('b')
          })
        ])
      )
      result.serialized = order.join(',') === 'a-start,a-end,b'
      const holder = document.createElement('iframe')
      holder.srcdoc = `<script>navigator.locks.request(${JSON.stringify(name)}, async () => { parent.postMessage({held:${JSON.stringify(name)}}, '*'); await new Promise(()=>{}) })</script>`
      const acquired = new Promise((resolve) => {
        const listen = (event) => {
          if (event.source === holder.contentWindow && event.data?.held === name) {
            removeEventListener('message', listen)
            resolve()
          }
        }
        addEventListener('message', listen)
      })
      document.body.append(holder)
      await timeout(acquired)
      const successor = navigator.locks.request(name, () => true)
      holder.remove()
      result.holderDeathReleases = await timeout(successor)
    } catch (e) {
      result.lockError = String(e)
    }
  }
  return result
}
