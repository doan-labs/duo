// The @doan-labs/mono backend: one Mono store `ipduo`, one collection per `Store`.
// A row is a document `{ _id, ns?, name?, v | vj, large? }`: `_id` is the key
// itself, or JSON of `[ns, name]` with both kept as fields under one index.
// Mono keeps documents in memory and bytes in `fs`, so anything big (a Blob, the
// icons of a release, a field whose JSON passes 64 KiB) is written to `/large/`
// in the same transaction and named in `large`. Mono refuses field names with
// `$` or `.`, so a value holding one travels as JSON text in `vj`.

import { type Store as MonoStore, type Tx as MonoTx, StoreError } from '@doan-labs/mono'
import { PlatformError } from '../../sdk/guards.ts'
import { type Backend, type Key, type ReadOptions, STORES, type Store, type Tx } from './database.ts'
import { copyStores } from './storage-migration.ts'

const NAMESPACED: readonly Store[] = ['appdata', 'appfiles', 'checkpoints', 'recovery', 'widgets', 'leases']
const LARGE = 64 * 1024
const DIR = '/large'
type Large = { field: string; kind: 'json' | 'blob' | 'blobs'; paths: string[]; types: string[] }
type Row = { ns?: string; name?: string; v?: unknown; vj?: string; large?: Large[] }
type Fs = MonoTx['fs']

const idOf = (key: Key) => (typeof key === 'string' ? key : JSON.stringify(key))
const plain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Blob)
const safe = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.every(safe)
    : plain(value)
      ? Object.entries(value).every(([k, v]) => k !== '' && !k.startsWith('$') && !k.includes('.') && safe(v))
      : true

async function encode(fs: Fs, value: unknown): Promise<Row> {
  const large: Large[] = []
  const write = async (data: Uint8Array) => {
    const path = `${DIR}/${crypto.randomUUID()}`
    await fs.writeFile(path, data)
    return path
  }
  const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())
  // Returns whether the field moved to fs.
  const moved = async (field: string, v: unknown) => {
    if (v instanceof Blob) {
      large.push({ field, kind: 'blob', paths: [await write(await bytes(v))], types: [v.type] })
      return true
    }
    if (Array.isArray(v) && v.length && v.every((b) => b instanceof Blob)) {
      const paths: string[] = []
      for (const blob of v as Blob[]) paths.push(await write(await bytes(blob)))
      large.push({ field, kind: 'blobs', paths, types: (v as Blob[]).map((b) => b.type) })
      return true
    }
    const text = JSON.stringify(v)
    if (text === undefined || text.length <= LARGE) return false
    large.push({ field, kind: 'json', paths: [await write(new TextEncoder().encode(text))], types: [] })
    return true
  }
  let kept: unknown
  if (plain(value)) {
    const fields: Record<string, unknown> = {}
    for (const [field, v] of Object.entries(value)) if (!(await moved(field, v))) fields[field] = v
    kept = fields
  } else if (!(await moved('', value))) kept = value
  // JSON is the contract's value model: undefined fields drop, as the bridge already does.
  const clean = kept === undefined ? undefined : JSON.parse(JSON.stringify(kept))
  return {
    ...(clean === undefined ? {} : safe(clean) ? { v: clean } : { vj: JSON.stringify(clean) }),
    ...(large.length ? { large } : {})
  }
}

async function decode(fs: Fs, row: Row, options?: ReadOptions): Promise<unknown> {
  let value = row.vj === undefined ? row.v : JSON.parse(row.vj)
  if (options?.large === false) return value
  for (const item of row.large ?? []) {
    const data = await Promise.all(item.paths.map((path) => fs.readFile(path)))
    const got =
      item.kind === 'json'
        ? JSON.parse(new TextDecoder().decode(data[0]))
        : item.kind === 'blob'
          ? new Blob([data[0] as BlobPart], { type: item.types[0] })
          : data.map((d, i) => new Blob([d as BlobPart], { type: item.types[i] }))
    value = item.field === '' ? got : { ...(value as object), [item.field]: got }
  }
  return value
}

function wrap(tx: MonoTx): Tx {
  const docs = (store: Store) => tx.collection<Row>(store)
  const drop = async (store: Store, row: Row & { _id: string }) => {
    for (const item of row.large ?? []) for (const path of item.paths) await tx.fs.rm(path, { force: true })
    await docs(store).remove(row._id)
  }
  const keyOf = (row: Row & { _id: string }): Key => (row.ns === undefined ? row._id : [row.ns, row.name!])
  return {
    get: async <T>(store: Store, key: Key) => {
      const row = await docs(store).get(idOf(key))
      return row ? ((await decode(tx.fs, row)) as T) : undefined
    },
    put: async (store, key, value) => {
      const id = idOf(key)
      const old = await docs(store).get(id)
      if (old) await drop(store, old)
      const row = await encode(tx.fs, value)
      await docs(store).put({ _id: id, ...(typeof key === 'string' ? {} : { ns: key[0], name: key[1] }), ...row })
    },
    delete: async (store, key) => {
      const old = await docs(store).get(idOf(key))
      if (old) await drop(store, old)
    },
    deleteRange: async (store, ns) => {
      for (const row of await docs(store).find({ ns }).all()) await drop(store, row)
    },
    clear: async (store) => {
      for (const row of await docs(store).find().all()) await drop(store, row)
    },
    entries: async <T>(store: Store, ns: string, options?: ReadOptions) => {
      const rows = await docs(store).find({ ns }).sort({ name: 1 }).all()
      const out: [string, T][] = []
      for (const row of rows) out.push([row.name!, (await decode(tx.fs, row, options)) as T])
      return out
    },
    all: async <T>(store: Store, options?: ReadOptions) => {
      const out: [Key, T][] = []
      for (const row of await docs(store).find().all()) out.push([keyOf(row), (await decode(tx.fs, row, options)) as T])
      return out
    },
    count: (store, ns) => docs(store).find({ ns }).count()
  }
}

const storageError = (error: unknown) =>
  error instanceof StoreError ? new PlatformError('E_STORAGE', `${error.code}: ${error.message}`) : error

/** A backend over an open Mono store. The shell passes none and gets the device's `ipduo` store. */
export async function monoBackend(given?: MonoStore): Promise<Backend> {
  const store = given ?? (await (await import('@doan-labs/mono')).open('ipduo'))
  for (const name of STORES)
    store.collection(name, { indexes: NAMESPACED.includes(name) ? [{ fields: ['ns', 'name'] }] : [] })
  await store.fs.mkdir(DIR, { recursive: true })
  const backend: Backend = {
    name: 'mono',
    async transaction(_names, _mode, run) {
      try {
        return await store.tx((tx) => run(wrap(tx)))
      } catch (error) {
        throw storageError(error)
      }
    }
  }
  if (!given) await adoptIndexedDb(store, backend)
  return backend
}

// The first Mono boot on a device copies what IndexedDB holds, once. IndexedDB
// is left as it was, so `?storage=indexeddb` goes back to the data of that moment.
async function adoptIndexedDb(store: MonoStore, backend: Backend) {
  const marks = store.collection<{ from: string; rows: number; at: number }>('duo')
  if (await marks.get('adopted')) return
  await navigator.locks.request('ipduo:adopt', { mode: 'exclusive' }, async () => {
    if (await marks.get('adopted')) return
    const rows =
      typeof indexedDB === 'undefined'
        ? 0
        : await copyStores(await (await import('./database-idb.ts')).indexedDbBackend(), backend)
    await marks.put({ _id: 'adopted', from: 'indexeddb', rows, at: Date.now() })
  })
}
