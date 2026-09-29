// Store cells over os.session and os.storage - the sandboxed shape of the
// module cell the baked apps shared. A cell reads synchronously for
// useSyncExternalStore and writes through a KVMirror, so a set on one view
// lands on the other through the space's watch. The `session` space is the
// ephemeral one: navigation, sheets, queries - chrome both displays agree on
// for the session's life. `storage` is the durable one.
//
// Hydration is asynchronous, so main.tsx awaits `hydrateCells()` between
// os.connect() and the first render, the same place data.ts initializers run.

import { os } from '@doan-labs/duo-sdk'
import { KVMirror } from '@doan-labs/duo-sdk/mirror.ts'
import type { KV } from '@doan-labs/duo-sdk/protocol.ts'
import { flushSync } from 'react-dom'

const mirrors = new WeakMap<KV, KVMirror>()
const mirror = (space: 'session' | 'storage') => {
  const kv = space === 'session' ? os.session : os.storage
  let m = mirrors.get(kv)
  if (!m) {
    // Same transition wrap as react.ts's useKV: a write from the other view
    // renders inside the fold's cross-fade rather than as a second commit.
    m = new KVMirror(kv, (fn) => flushSync(fn))
    mirrors.set(kv, m)
  }
  return m
}

export type Cell<T> = {
  subscribe(fn: () => void): () => void
  get(): T
  set(v: T): void
}

/**
 * A JSON value under `key`, hydrated from `space` and watched on it. Reads
 * before hydration report `initial`, so seeding belongs in the fallback the
 * way useJSON does it.
 */
export function cell<T>(space: 'session' | 'storage', key: string, initial: T): Cell<T> {
  const m = mirror(space)
  const subs = new Set<() => void>()
  // The mirror notifies on any key; parse only when this key's string moved.
  let raw: string | null | undefined
  let parsed: T = initial
  let known = false
  const get = () => {
    const value = m.read(key).value
    if (value !== raw || !known) {
      raw = value
      known = true
      if (value === null) parsed = initial
      else {
        try {
          parsed = JSON.parse(value) as T
        } catch {
          parsed = initial
        }
      }
    }
    return parsed
  }
  m.subscribe(() => {
    for (const fn of subs) fn()
  })
  return {
    subscribe: (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    get,
    set: (v) => m.write(key, JSON.stringify(v))
  }
}

/** Awaited between connect() and render so the first paint already shows storage. */
export async function hydrateCells() {
  await Promise.all([mirror('session').hydrate(), mirror('storage').hydrate()])
}
