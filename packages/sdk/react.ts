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
