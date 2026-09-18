import { useSyncExternalStore } from 'react'
import { KVMirror } from './mirror.ts'
import type { KV } from './protocol.ts'

const mirrors = new WeakMap<KV, KVMirror>()
export function useKV(space: KV, key: string) {
  let mirror = mirrors.get(space)
  if (!mirror) {
    mirror = new KVMirror(space)
    mirrors.set(space, mirror)
  }
  const state = useSyncExternalStore(mirror.subscribe, () => mirror.read(key))
  return { ...state, set: (v: string) => mirror.write(key, v), del: () => mirror.write(key, null) }
}
