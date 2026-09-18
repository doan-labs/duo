import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import type { Folder, Note } from './data.ts'

const parse = <T>(raw: string | null): T[] => (raw ? JSON.parse(raw) : [])

/** The list itself, newest first, as one JSON key so both displays agree on it. */
export function useNotes() {
  const index = useKV(os.storage, 'index')
  const notes = parse<Note>(index.value)
  const add = (folder?: string) => {
    const note: Note = { id: Date.now().toString(36), when: new Date().toISOString(), folder }
    index.set(JSON.stringify([note, ...notes]))
    return note
  }
  const remove = (note: Note) => {
    index.set(JSON.stringify(notes.filter((n) => n.id !== note.id)))
    void os.storage.del(`note:${note.id}`)
  }
  return { notes, add, remove, hydrating: index.status === 'hydrating' }
}

/** User folders under iCloud; the built-in "Notes" folder is `undefined` on a note. */
export function useFolders() {
  const list = useKV(os.storage, 'folders')
  const folders = parse<Folder>(list.value)
  const add = (name: string) => {
    const folder: Folder = { id: Date.now().toString(36), name }
    list.set(JSON.stringify([...folders, folder]))
    return folder
  }
  return { folders, add }
}

/** Which folder each display shows; both share it so a pick on one side follows on the other. */
export function useFolder() {
  const kv = useKV(os.session, 'folder')
  return [kv.value ?? undefined, (id?: string) => (id ? kv.set(id) : kv.del())] as const
}

/** Both displays and every row read the same persisted text; no editor keeps a stale copy. */
export function useNoteText(note: Note) {
  const state = useKV(os.storage, `note:${note.id}`)
  const put = (body: string) => (body === '' ? state.del() : state.set(body))
  return [state.value ?? '', put, state.del, state] as const
}
