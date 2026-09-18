import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import type { Note } from './data.ts'

/** Both displays and every row read the same persisted text; no editor keeps a stale copy. */
export function useNoteText(note: Note) {
  const state = useKV(os.storage, note.id)
  const put = (body: string) => (body === note.body ? state.del() : state.set(body))
  return [state.value ?? note.body, put, state.del, state] as const
}
