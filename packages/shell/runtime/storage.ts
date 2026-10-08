import { bytes, keyValid, PlatformError, valueValid } from '../../sdk/guards.ts'
import { record } from '../../sdk/manifest.ts'
import { type Change, LIMITS, type Snapshot } from '../../sdk/protocol.ts'
import { authority, broadcast, entries, type Meta, put, read, transaction } from './database.ts'

export const emptyMeta = (): Meta => ({ rev: 0, used: 0 })
export function page(data: [string, string][], rev: number, cursor?: unknown): Snapshot {
  let offset = 0
  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || !/^\d+:\d+$/.test(cursor)) throw new PlatformError('E_ARGS')
    const [version, start] = cursor.split(':').map(Number)
    if (version !== rev) throw new PlatformError('E_STALE', 'Snapshot changed; start again.')
    offset = start!
    if (!Number.isSafeInteger(offset) || offset > data.length) throw new PlatformError('E_ARGS')
  }
  let end = offset
  let size = 0
  while (end < data.length && end - offset < LIMITS.page) {
    const next = bytes(JSON.stringify(data[end]))
    if (end > offset && size + next > LIMITS.envelope - 1024) break
    size += next
    end++
  }
  return { rev, entries: data.slice(offset, end), ...(end < data.length ? { cursor: `${rev}:${end}` } : {}) }
}
export function kvArgs(action: string, p: unknown): Record<string, unknown> {
  const args = record(p) ? p : {}
  if (['get', 'set', 'del', 'entry'].includes(action) && !keyValid(args.k)) throw new PlatformError('E_ARGS')
  if (action === 'set' && !valueValid(args.v)) throw new PlatformError('E_ARGS')
  // `expect` conditions a write on the entry token it was computed from.
  if (['set', 'del'].includes(action)) {
    const expect = record(args.expect) ? (args.expect as { rev?: unknown; gen?: unknown }) : undefined
    if (
      args.expect !== undefined &&
      (!expect ||
        !Number.isSafeInteger(expect.rev) ||
        (expect.rev as number) < 0 ||
        !Number.isSafeInteger(expect.gen) ||
        (expect.gen as number) < 1)
    )
      throw new PlatformError('E_ARGS')
  } else if (args.expect !== undefined) throw new PlatformError('E_ARGS')
  return args
}
// The token, authority check, quota and mutation share one transaction, so a
// stale writer conflicts at commit without touching value, quota or rev. The
// generation half binds the token: a restore that regresses meta.rev cannot
// make a pre-restore `expect` match again - it fails E_GONE, not E_CONFLICT.
const expectMeta = (meta: Meta, expect: unknown, generation: number) => {
  if (expect === undefined) {
    if (meta.rev >= Number.MAX_SAFE_INTEGER) throw new PlatformError('E_STORAGE', 'Revision space exhausted')
    return
  }
  const token = expect as { rev: number; gen: number }
  if (token.gen !== generation) throw new PlatformError('E_GONE', `Generation ${token.gen} is not ${generation}`)
  if (meta.rev >= Number.MAX_SAFE_INTEGER) throw new PlatformError('E_STORAGE', 'Revision space exhausted')
  if (meta.rev !== token.rev) throw new PlatformError('E_CONFLICT', `Revision ${meta.rev} is not ${token.rev}`)
}
const KV_ACTIONS = ['get', 'set', 'del', 'entry', 'snapshot', 'keys']
export async function snapshot(id: string, generation: number, cursor?: unknown) {
  return transaction(['installed', 'appdata', 'meta'], 'readonly', async (tx) => {
    await authority(tx, id, generation)
    const meta = (await read<Meta>(tx, 'meta', id)) ?? emptyMeta()
    return page(await entries<string>(tx, 'appdata', id), meta.rev, cursor)
  })
}
export async function storage(id: string, generation: number, action: string, p: unknown) {
  const args = kvArgs(action, p)
  if (!KV_ACTIONS.includes(action)) throw new PlatformError('E_UNSUPPORTED')
  if (action === 'snapshot' || action === 'keys') {
    const data = await snapshot(id, generation, args.cursor)
    return action === 'keys' ? { keys: data.entries.map(([k]) => k), cursor: data.cursor } : data
  }
  const write = action !== 'get' && action !== 'entry'
  const value = await transaction(['installed', 'appdata', 'meta'], write ? 'readwrite' : 'readonly', async (tx) => {
    await authority(tx, id, generation)
    const k = args.k as string
    const old = await read<string>(tx, 'appdata', [id, k])
    if (!write) {
      if (action === 'get') return old ?? null
      const meta = (await read<Meta>(tx, 'meta', id)) ?? emptyMeta()
      return { k, v: old ?? null, rev: meta.rev, gen: generation }
    }
    const meta = (await read<Meta>(tx, 'meta', id)) ?? emptyMeta()
    expectMeta(meta, args.expect, generation)
    const v = action === 'set' ? (args.v as string) : null
    const used = meta.used - (old === undefined ? 0 : bytes(k) + bytes(old)) + (v === null ? 0 : bytes(k) + bytes(v))
    if (used > LIMITS.storage) throw new PlatformError('E_QUOTA')
    if (
      v !== null &&
      old === undefined &&
      (await new Promise<number>((resolve, reject) => {
        const req = tx.objectStore('appdata').count(IDBKeyRange.bound([id], [id, []]))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })) >= LIMITS.keys
    )
      throw new PlatformError('E_ARGS', 'Too many keys')
    if (v === null) tx.objectStore('appdata').delete([id, k])
    else await put(tx, 'appdata', [id, k], v)
    await put(tx, 'meta', id, { ...meta, used, rev: meta.rev + 1 })
    return { rev: meta.rev + 1, k, v } satisfies Change
  })
  if (write) broadcast({ id, rev: (value as Change).rev })
  return value
}

export class MemoryKV {
  values = new Map<string, string>()
  rev = 0
  used = 0
  history: Change[] = []
  // Session memory has no restore path: it lives exactly one generation.
  gen = 1
  run(action: string, p: unknown) {
    const args = kvArgs(action, p)
    if (!KV_ACTIONS.includes(action)) throw new PlatformError('E_UNSUPPORTED')
    const k = args.k as string
    if (action === 'get') return this.values.get(k) ?? null
    if (action === 'entry') return { k, v: this.values.get(k) ?? null, rev: this.rev, gen: this.gen }
    if (action === 'snapshot' || action === 'keys') {
      const data = page(
        [...this.values].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        this.rev,
        args.cursor
      )
      return action === 'keys' ? { keys: data.entries.map(([key]) => key), cursor: data.cursor } : data
    }
    expectMeta({ rev: this.rev, used: this.used }, args.expect, this.gen)
    const old = this.values.get(k)
    const v = action === 'set' ? (args.v as string) : null
    const used = this.used - (old === undefined ? 0 : bytes(k) + bytes(old)) + (v === null ? 0 : bytes(k) + bytes(v))
    if (used > LIMITS.session) throw new PlatformError('E_QUOTA')
    if (v !== null && old === undefined && this.values.size >= LIMITS.keys) throw new PlatformError('E_ARGS')
    if (v === null) this.values.delete(k)
    else this.values.set(k, v)
    this.used = used
    const change = { rev: ++this.rev, k, v }
    this.history.push(change)
    if (this.history.length > LIMITS.dedupe) this.history.shift()
    return change
  }
}
