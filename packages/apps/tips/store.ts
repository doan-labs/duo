// Saved tips, shared between the two displays' copies. A sandboxed app's
// copies are separate documents, so the ids live in os.storage - one saved
// list the fold hands over whole and that survives reloads (kv.ts does the
// synchronous-read part the module cell used to).

import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useSyncExternalStore } from 'react'

export type Saved = { ids: string[]; on: (id: string) => boolean; toggle: (id: string) => void }

const saved = cell<string[]>('storage', 'duo.tips.saved', [])

export const useSaved = (): Saved => {
  const value = useSyncExternalStore(saved.subscribe, saved.get)
  return {
    ids: value,
    on: (id) => value.includes(id),
    toggle: (id) => saved.set(value.includes(id) ? value.filter((s) => s !== id) : [...value, id])
  }
}
