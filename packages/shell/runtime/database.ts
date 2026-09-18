import { PlatformError } from '../../sdk/guards.ts'
import type { Release, ReleaseId } from '../../sdk/manifest.ts'
import type { WidgetSnapshot } from '../../sdk/protocol.ts'

export type Installed = {
  id: string
  generation: number
  state: 'installing' | 'ready' | 'trial' | 'removing'
  current: ReleaseId
  candidate?: ReleaseId
  recovery?: { release: ReleaseId; checkpoint: [string, ReleaseId] }
  failedVersion?: ReleaseId
  attempts: number
  migration?: { from: ReleaseId; to: ReleaseId; done: boolean }
  installedAt: number
  source?: string
}
export type StoredRelease = { release: Release; html: string; icons: Blob[]; committedAt: number }
export type Meta = { rev: number; used: number; schema?: string }
export type StoredWidget = WidgetSnapshot & { updatedAt: number; epoch: number }
export type Checkpoint = { entries: [string, string][]; meta: Meta; widgets: [string, StoredWidget][]; takenAt: number }
export const STORES = [
  'installed',
  'releases',
  'appdata',
  'meta',
  'checkpoints',
  'recovery',
  'legacy',
  'widgets',
  'leases',
  'marks'
] as const
export type Store = (typeof STORES)[number]
let opening: Promise<IDBDatabase> | undefined
export const changes = new EventTarget()
let channel: BroadcastChannel | undefined
export function broadcast(data: { id: string; generation?: number; rev?: number }) {
  channel ??= new BroadcastChannel('ipduo')
  channel.postMessage(data)
  changes.dispatchEvent(new CustomEvent('change', { detail: data }))
}
export function listenDatabase() {
  channel ??= new BroadcastChannel('ipduo')
  channel.onmessage = (event) => {
    if (typeof event.data?.id === 'string')
      changes.dispatchEvent(new CustomEvent('change', { detail: { id: event.data.id } }))
  }
}
export function database(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('ipduo', 2)
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
export const result = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new PlatformError('E_STORAGE', request.error?.message))
  })
export async function transaction<T>(
  names: Store[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await database()
  const tx = db.transaction([...new Set(names.includes('installed') ? [...names, 'marks'] : names)], mode)
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(new PlatformError('E_STORAGE', tx.error?.message))
  })
  // Install the rejection handler before user work so an aborted transaction never leaks a rejection.
  void done.catch(() => {})
  try {
    const value = await run(tx)
    await done
    return value
  } catch (error) {
    try {
      tx.abort()
    } catch {
      /* A request may already have aborted the transaction. */
    }
    await done.catch(() => {})
    throw error instanceof PlatformError ? error : new PlatformError('E_STORAGE', String(error))
  }
}
export const read = <T>(tx: IDBTransaction, store: Store, key: IDBValidKey) =>
  result(tx.objectStore(store).get(key)) as Promise<T | undefined>
export const put = (tx: IDBTransaction, store: Store, key: IDBValidKey, value: unknown) =>
  result(tx.objectStore(store).put(value, key))
export const range = (ns: string) => IDBKeyRange.bound([ns], [ns, []])
export async function entries<T>(tx: IDBTransaction, store: Store, ns: string): Promise<[string, T][]> {
  const object = tx.objectStore(store)
  const [keys, values] = await Promise.all([result(object.getAllKeys(range(ns))), result(object.getAll(range(ns)))])
  return keys.map((key, i) => [(key as string[])[1]!, values[i] as T])
}
export async function authority(
  tx: IDBTransaction,
  id: string,
  generation: number,
  lifecycle = false
): Promise<Installed> {
  const installed = await readAuthority(tx, id)
  if (!installed || installed.state === 'removing' || installed.generation !== generation)
    throw new PlatformError(lifecycle ? 'E_STALE' : 'E_GONE')
  return installed
}
export const readAuthority = (tx: IDBTransaction, id: string) =>
  read<Installed>(tx, id.startsWith('dev:') ? 'marks' : 'installed', id)
export const writeAuthority = (tx: IDBTransaction, app: Installed) =>
  put(tx, app.id.startsWith('dev:') ? 'marks' : 'installed', app.id, app)
export const getInstalled = (id: string) => transaction(['installed'], 'readonly', (tx) => readAuthority(tx, id))
export const allInstalled = () =>
  transaction(['installed'], 'readonly', (tx) => result(tx.objectStore('installed').getAll()) as Promise<Installed[]>)
export const getRelease = (id: ReleaseId) =>
  transaction(['releases'], 'readonly', (tx) => read<StoredRelease>(tx, 'releases', id))
export const appLock = <T>(id: string, action: () => Promise<T>) =>
  navigator.locks.request(`ipduo:app:${id}`, { mode: 'exclusive' }, action)
