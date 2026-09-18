import { useSyncExternalStore } from 'react'
import type { Note } from '../../../packages/apps/notes/data.ts'

const values = new Map<string, string>()
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
export function useNoteText(note: Note) {
  const value = useSyncExternalStore(subscribe, () => values.get(note.id) ?? note.body)
  const put = (text: string) => {
    values.set(note.id, text)
    for (const cb of listeners) cb()
  }
  return [value, put, () => put(note.body)] as const
}
