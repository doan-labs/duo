import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { KVMirror } from './mirror.ts'
import type { KV } from './protocol.ts'
import { transition } from './transition.ts'

const mirrors = new WeakMap<KV, KVMirror>()
export function useKV(space: KV, key: string) {
  let mirror = mirrors.get(space)
  if (!mirror) {
    // Remote changes render synchronously inside the transition so the snapshot sees the new screen.
    mirror = new KVMirror(space, (fn) => transition(() => flushSync(fn)))
    mirrors.set(space, mirror)
  }
  const state = useSyncExternalStore(mirror.subscribe, () => mirror.read(key))
  return { ...state, set: (v: string) => mirror.write(key, v), del: () => mirror.write(key, null) }
}

/**
 * `useKV` for a key holding JSON: parsed on read, stringified on write. Nothing
 * written yet gives `fallback`, which is what a fresh install looks like, so the
 * app can seed itself there rather than at every call site.
 */
export function useJSON<T>(space: KV, key: string, fallback: T) {
  const kv = useKV(space, key)
  return {
    ...kv,
    // Empty string falls back too: it is not JSON, and `del()` on some mirrors lands there.
    value: kv.value ? (JSON.parse(kv.value) as T) : fallback,
    set: (v: T) => kv.set(JSON.stringify(v))
  }
}
