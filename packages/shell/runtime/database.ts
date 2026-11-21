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
  // Blobs too big for the string-only `appdata`: [ns, name] -> { blob, type, size, at }.
  'appfiles',
  'meta',
  'checkpoints',
  'recovery',
  'legacy',
  'widgets',
  'leases',
  'marks'
] as const
export type Store = (typeof STORES)[number]
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

/** A row key: an app-wide id, or `[ns, name]` inside one app's namespace. */
export type Key = string | readonly [string, string]
/**
 * `large: false` lets a backend skip the big fields it keeps apart (blobs, bundle
 * html, long strings): they come back missing. For listings that only need small fields.
 */
export type ReadOptions = { large?: boolean }
/** One transaction's operations. Every backend is all-or-nothing per `transaction()`. */
export interface Tx {
  get<T>(store: Store, key: Key): Promise<T | undefined>
  put(store: Store, key: Key, value: unknown): Promise<void>
  delete(store: Store, key: Key): Promise<void>
  /** Removes every `[ns, *]` row. */
  deleteRange(store: Store, ns: string): Promise<void>
  clear(store: Store): Promise<void>
  /** The `[ns, name]` rows of one namespace, by name. */
  entries<T>(store: Store, ns: string, options?: ReadOptions): Promise<[string, T][]>
  all<T>(store: Store, options?: ReadOptions): Promise<[Key, T][]>
  count(store: Store, ns: string): Promise<number>
}
export type Mode = 'readonly' | 'readwrite'
export interface Backend {
  readonly name: StorageEngine
  transaction<T>(names: Store[], mode: Mode, run: (tx: Tx) => Promise<T>): Promise<T>
}
export type StorageEngine = 'indexeddb' | 'mono'

// The engine is a per-device choice kept in localStorage; `?storage=mono` or
// `?storage=indexeddb` switches it. IndexedDB stays the default until Mono has
// proved itself here (docs/platform/runtime.md).
const ENGINE_KEY = 'os.storage'
export function storageEngine(): StorageEngine {
  if (typeof localStorage === 'undefined') return 'indexeddb'
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('storage')
  if (asked === 'mono' || asked === 'indexeddb') localStorage.setItem(ENGINE_KEY, asked)
  return localStorage.getItem(ENGINE_KEY) === 'mono' ? 'mono' : 'indexeddb'
}
let backend: Promise<Backend> | undefined
/** Tests and the migration pick a backend explicitly; the shell takes the device's. */
export function setBackend(next: Backend | Promise<Backend>) {
  backend = Promise.resolve(next)
}
export function activeBackend(): Promise<Backend> {
  backend ??=
    storageEngine() === 'mono'
      ? import('./database-mono.ts').then((m) => m.monoBackend())
      : import('./database-idb.ts').then((m) => m.indexedDbBackend())
  return backend
}
export async function transaction<T>(names: Store[], mode: Mode, run: (tx: Tx) => Promise<T>): Promise<T> {
  const db = await activeBackend()
  try {
    return await db.transaction(
      [...new Set(names.includes('installed') ? [...names, 'marks' as const] : names)],
      mode,
      run
    )
  } catch (error) {
    throw error instanceof PlatformError ? error : new PlatformError('E_STORAGE', String(error))
  }
}
export const read = <T>(tx: Tx, store: Store, key: Key) => tx.get<T>(store, key)
export const put = (tx: Tx, store: Store, key: Key, value: unknown) => tx.put(store, key, value)
export const remove = (tx: Tx, store: Store, key: Key) => tx.delete(store, key)
export const removeRange = (tx: Tx, store: Store, ns: string) => tx.deleteRange(store, ns)
export const entries = <T>(tx: Tx, store: Store, ns: string, options?: ReadOptions) => tx.entries<T>(store, ns, options)
export async function authority(tx: Tx, id: string, generation: number, lifecycle = false): Promise<Installed> {
  const installed = await readAuthority(tx, id)
  if (!installed || installed.state === 'removing' || installed.generation !== generation)
    throw new PlatformError(lifecycle ? 'E_STALE' : 'E_GONE')
  return installed
}
export const readAuthority = (tx: Tx, id: string) =>
  read<Installed>(tx, id.startsWith('dev:') ? 'marks' : 'installed', id)
export const writeAuthority = (tx: Tx, app: Installed) =>
  put(tx, app.id.startsWith('dev:') ? 'marks' : 'installed', app.id, app)
export const getInstalled = (id: string) => transaction(['installed'], 'readonly', (tx) => readAuthority(tx, id))
export const allInstalled = () =>
  transaction(['installed'], 'readonly', async (tx) => (await tx.all<Installed>('installed')).map(([, app]) => app))
/** The ids the shell seeded at boot: they come back on the next start, so no screen offers to remove them. */
export const seededApps = () =>
  transaction(['marks'], 'readonly', async (tx) => {
    const marks = await tx.all<{ seeded?: boolean }>('marks')
    return new Set(marks.filter(([key, mark]) => typeof key === 'string' && mark?.seeded).map(([key]) => key as string))
  })
export const getRelease = (id: ReleaseId) =>
  transaction(['releases'], 'readonly', (tx) => read<StoredRelease>(tx, 'releases', id))
/** Every stored release without its html and icons: what lifecycle sweeps need. */
export const releaseSummaries = (tx: Tx) =>
  tx.all<Pick<StoredRelease, 'release' | 'committedAt'>>('releases', { large: false })
export const appLock = <T>(id: string, action: () => Promise<T>) =>
  navigator.locks.request(`ipduo:app:${id}`, { mode: 'exclusive' }, action)
