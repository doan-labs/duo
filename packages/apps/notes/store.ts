import { useSyncExternalStore } from 'react'
import type { Note } from './data.ts'

const listeners = new Set<() => void>()
const key = (note: Note) => `duo.notes.${note.id}`
const read = (note: Note) => localStorage.getItem(key(note)) ?? note.body
const notify = () => {
  for (const listener of listeners) listener()
}
const onStorage = (event: StorageEvent) => {
  if (event.storageArea === localStorage && (event.key === null || event.key.startsWith('duo.notes.'))) notify()
}
const subscribe = (listener: () => void) => {
  if (listeners.size === 0) addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) removeEventListener('storage', onStorage)
  }
}

/** Both displays and every row read the same persisted text; no editor keeps a stale copy. */
export function useNoteText(note: Note) {
  const value = useSyncExternalStore(subscribe, () => read(note))
  const put = (body: string) => {
    if (body === note.body) localStorage.removeItem(key(note))
    else localStorage.setItem(key(note), body)
    notify()
  }
  return [value, put, () => put(note.body)] as const
}
