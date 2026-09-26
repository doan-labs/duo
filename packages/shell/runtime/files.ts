// The durable blob store behind `os.files` and the baked `os.files` prop.
// `appdata` settles the strings-only contract (contract.md §4.2); audio,
// renders and friends get their own store rather than a base64 workaround.
// Quota is recomputed from the rows themselves on every put, so a crashed
// delete never leaks bytes a retry would have to pay for twice.

import { fileNameValid, PlatformError } from '../../sdk/guards.ts'
import type { FileHost } from '../../sdk/legacy.ts'
import { LIMITS, type StoredFile } from '../../sdk/protocol.ts'
import { entries, put, read, result, transaction } from './database.ts'

type Row = { blob: Blob; type: string; size: number; at: number }
const row = (name: string, r: Row): StoredFile => ({ name, size: r.size, type: r.type, at: r.at })

export async function fileService(ns: string, method: string, p: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case 'file.list':
      return transaction(['appfiles'], 'readonly', async (tx) =>
        (await entries<Row>(tx, 'appfiles', ns)).map(([name, r]) => row(name, r))
      )
    case 'file.get': {
      if (!fileNameValid(p.name)) throw new PlatformError('E_ARGS')
      const got = await transaction(['appfiles'], 'readonly', (tx) => read<Row>(tx, 'appfiles', [ns, p.name as string]))
      return got?.blob ?? null
    }
    case 'file.put': {
      const blob = p.blob
      if (!fileNameValid(p.name) || !(blob instanceof Blob) || blob.size > LIMITS.file)
        throw new PlatformError('E_ARGS')
      return transaction(['appfiles'], 'readwrite', async (tx) => {
        const existing = await entries<Row>(tx, 'appfiles', ns)
        const replacing = existing.find(([name]) => name === p.name)?.[1]
        const used = existing.reduce((n, [, r]) => n + r.size, 0) - (replacing?.size ?? 0)
        if (!replacing && existing.length >= LIMITS.files) throw new PlatformError('E_QUOTA', 'Too many files')
        if (used + blob.size > LIMITS.filesBytes) throw new PlatformError('E_QUOTA', 'File storage is full')
        const next: Row = { blob, type: blob.type, size: blob.size, at: Date.now() }
        await put(tx, 'appfiles', [ns, p.name as string], next)
        return row(p.name as string, next)
      })
    }
    case 'file.del': {
      if (!fileNameValid(p.name)) throw new PlatformError('E_ARGS')
      return transaction(['appfiles'], 'readwrite', (tx) =>
        result(tx.objectStore('appfiles').delete([ns, p.name as string])).then(() => undefined)
      )
    }
  }
  throw new PlatformError('E_ARGS')
}

/** The baked app's `os.files`: the same service bound to its own namespace. */
export const fileHost = (ns: string): FileHost => ({
  list: () => fileService(ns, 'file.list', {}) as Promise<StoredFile[]>,
  get: (name: string) => fileService(ns, 'file.get', { name }) as Promise<Blob | null>,
  put: (name: string, blob: Blob) => fileService(ns, 'file.put', { name, blob }) as Promise<StoredFile>,
  del: (name: string) => fileService(ns, 'file.del', { name }) as Promise<void>
})
