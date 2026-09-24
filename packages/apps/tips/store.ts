// Saved tips, shared between the two displays' copies. Tips is a baked app, so
// the SDK client's storage is out of reach - it connects through the sandbox
// port only sandboxed apps get. Both copies run in the same document, so a
// module-level store is what they agree on (the way music.tsx's deck is shared).

import { useSyncExternalStore } from 'react'

export type Saved = { ids: string[]; on: (id: string) => boolean; toggle: (id: string) => void }

let ids: string[] = []
const subs = new Set<() => void>()

const set = (next: string[]) => {
  ids = next
  for (const cb of subs) cb()
}

export const useSaved = (): Saved => {
  const value = useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => ids
  )
  return {
    ids: value,
    on: (id) => value.includes(id),
    toggle: (id) => set(value.includes(id) ? value.filter((s) => s !== id) : [...value, id])
  }
}
