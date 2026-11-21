// The IndexedDB backend: one `ipduo` database, one object store per `Store`,
// `[ns, name]` array keys for namespaced rows. Every operation is a request on
// the one IDBTransaction, so awaiting anything else inside `run` would let it
// auto-commit; callers only await these operations.

import { PlatformError } from '../../sdk/guards.ts'
import { type Backend, type Key, STORES, type Store, type Tx } from './database.ts'

let opening: Promise<IDBDatabase> | undefined
export function openIndexedDb(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('ipduo', 3)
    request.onupgradeneeded = () => {
      for (const name of STORES)
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name)
    }
    request.onerror = () => {
      opening = undefined
      reject(new PlatformError('E_STORAGE', request.error?.message))
    }
    request.onblocked = () => {
      opening = undefined
      reject(new PlatformError('E_STORAGE', 'Close the older shell tab to upgrade storage.'))
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        opening = undefined
      }
      resolve(db)
    }
  })
  return opening
}
const result = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new PlatformError('E_STORAGE', request.error?.message))
  })
const range = (ns: string) => IDBKeyRange.bound([ns], [ns, []])
const key = (k: Key) => k as IDBValidKey

function wrap(tx: IDBTransaction): Tx {
  const store = (name: Store) => tx.objectStore(name)
  return {
    get: (name, k) => result(store(name).get(key(k))),
    put: async (name, k, value) => {
      await result(store(name).put(value, key(k)))
    },
    delete: async (name, k) => {
      await result(store(name).delete(key(k)))
    },
    deleteRange: async (name, ns) => {
      await result(store(name).delete(range(ns)))
    },
    clear: async (name) => {
      await result(store(name).clear())
    },
    entries: async <T>(name: Store, ns: string) => {
      const [keys, values] = await Promise.all([
        result(store(name).getAllKeys(range(ns))),
        result(store(name).getAll(range(ns)))
      ])
      return keys.map((k, i) => [(k as string[])[1]!, values[i] as T] as [string, T])
    },
    all: async <T>(name: Store) => {
      const [keys, values] = await Promise.all([result(store(name).getAllKeys()), result(store(name).getAll())])
      return keys.map((k, i) => [k as Key, values[i] as T] as [Key, T])
    },
    count: (name, ns) => result(store(name).count(range(ns)))
  }
}

export async function indexedDbBackend(): Promise<Backend> {
  await openIndexedDb()
  return {
    name: 'indexeddb',
    async transaction(names, mode, run) {
      const db = await openIndexedDb()
      const tx = db.transaction(names, mode)
      const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onabort = tx.onerror = () => reject(new PlatformError('E_STORAGE', tx.error?.message))
      })
      // Install the rejection handler before user work so an aborted transaction never leaks a rejection.
      void done.catch(() => {})
      try {
        const value = await run(wrap(tx))
        await done
        return value
      } catch (error) {
        try {
          tx.abort()
        } catch {
          /* A request may already have aborted the transaction. */
        }
        await done.catch(() => {})
        throw error
      }
    }
  }
}
