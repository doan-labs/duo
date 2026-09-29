// The library lives in os.storage under `duo.memos.*` - durable, and erased
// with the rest of app data by the device wipe - while the audio itself lives
// in the `appfiles` store through os.files, never as a string here. Session
// cells carry the shared UI state so both displays draw the same sheet,
// selection and deck.

import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useMemo, useSyncExternalStore } from 'react'

export type Memo = {
  id: string
  name: string
  /** Key in the `appfiles` store; the blob behind it is the audio. */
  file: string
  mime: string
  ms: number
  at: number
  fav: boolean
  folder?: string
  deletedAt?: number
  /** Absent entirely means no transcript was captured - never an empty fake. */
  transcript?: string
  /** Waveform bars drawn without decoding the file again. */
  peaks: number[]
  /** Synthesized sample data; labeled and never shown as a mic recording. */
  demo?: boolean
}
export type Folder = { id: string; name: string }
export type Sort = 'newest' | 'oldest' | 'title' | 'longest'

/** Deleted memos auto-erase past this, the way iOS's Recently Deleted does. */
export const RECENTLY_DELETED_DAYS = 30

export const memosCell = cell<Memo[]>('storage', 'duo.memos.list', [])
export const foldersCell = cell<Folder[]>('storage', 'duo.memos.folders', [])
const sortCell = cell<Sort>('storage', 'duo.memos.sort', 'newest')

// ---------- session cells: shared by both displays, never persisted ----------

type AnyCell = ReturnType<typeof cell<unknown>>
const shared = new Map<string, AnyCell>()
export function useShared<T>(key: string, initial: T) {
  let c = shared.get(key)
  if (!c) {
    c = cell<T>('session', `memos.${key}`, initial) as unknown as AnyCell
    shared.set(key, c)
  }
  return [useSyncExternalStore(c.subscribe, c.get as () => T), c.set as (v: T) => void] as const
}

/** A Set does not survive a cell's JSON trip; keep the id list in the cell and the Set in the view. */
export function useSetShared(key: string) {
  const [ids, setIds] = useShared<string[]>(key, [])
  return [new Set(ids), (s: Set<string>) => setIds([...s])] as const
}

const patch = (id: string, p: Partial<Memo>) =>
  memosCell.set(memosCell.get().map((m) => (m.id === id ? { ...m, ...p } : m)))

const bySort = (sort: Sort) => (a: Memo, b: Memo) =>
  sort === 'oldest'
    ? a.at - b.at
    : sort === 'title'
      ? a.name.localeCompare(b.name)
      : sort === 'longest'
        ? b.ms - a.ms
        : b.at - a.at

export function useMemos() {
  const memos = useSyncExternalStore(memosCell.subscribe, memosCell.get)
  const folders = useSyncExternalStore(foldersCell.subscribe, foldersCell.get)
  const [query, setQuery] = useShared('query', '')
  const sort = useSyncExternalStore(sortCell.subscribe, sortCell.get)
  const [editing, setEditing] = useShared('editing', false)
  const [selection, setSelection] = useSetShared('selection')
  const [deck, setDeck] = useShared<'closed' | 'open'>('deck', 'closed')
  const [folder, setFolder] = useShared<string | null>('folder', null)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return memos
      .filter((m) => (folder ? m.folder === folder : !m.deletedAt))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.transcript?.toLowerCase().includes(q))
      .sort(bySort(sort))
  }, [memos, folder, query, sort])
  return {
    memos,
    folders,
    visible,
    query,
    setQuery,
    sort,
    setSort: (s: Sort) => sortCell.set(s),
    editing,
    setEditing,
    selection,
    setSelection,
    deck,
    setDeck,
    folder,
    setFolder
  }
}

const mutate = (fn: (m: Memo) => Memo, ids: Iterable<string>) => {
  const set = new Set(ids)
  memosCell.set(memosCell.get().map((m) => (set.has(m.id) ? fn(m) : m)))
}

export const memoOps = {
  add(m: Memo) {
    memosCell.set([m, ...memosCell.get()])
  },
  patch,
  rename(id: string, name: string) {
    const trimmed = name.trim()
    if (trimmed) patch(id, { name: trimmed })
  },
  toggleFav(id: string) {
    const m = memosCell.get().find((x) => x.id === id)
    if (m) patch(id, { fav: !m.fav })
  },
  moveTo(ids: Iterable<string>, folder: string | undefined) {
    mutate((m) => ({ ...m, folder }), ids)
  },
  trash(ids: Iterable<string>) {
    const at = Date.now()
    mutate((m) => ({ ...m, deletedAt: at }), ids)
  },
  recover(ids: Iterable<string>) {
    mutate((m) => ({ ...m, deletedAt: undefined }), ids)
  },
  /** Forget metadata; the caller deletes the file first. */
  drop(ids: Iterable<string>) {
    const set = new Set(ids)
    memosCell.set(memosCell.get().filter((m) => !set.has(m.id)))
  },
  /** Memos past the Recently Deleted window; the engine erases their files. */
  expired(): Memo[] {
    return memosCell.get().filter((m) => m.deletedAt && Date.now() - m.deletedAt > RECENTLY_DELETED_DAYS * 86_400_000)
  },
  defaultName() {
    const taken = new Set(memosCell.get().map((m) => m.name))
    let n = memosCell.get().filter((m) => !m.deletedAt).length + 1
    while (taken.has(`New Recording ${n}`)) n++
    return `New Recording ${n}`
  }
}

export const folderOps = {
  add(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    foldersCell.set([...foldersCell.get(), { id: crypto.randomUUID(), name: trimmed }])
  },
  rename(id: string, name: string) {
    const trimmed = name.trim()
    if (trimmed) foldersCell.set(foldersCell.get().map((f) => (f.id === id ? { ...f, name: trimmed } : f)))
  },
  /** Deleting a folder frees its memos back to All Recordings; nothing is lost. */
  remove(id: string) {
    memosCell.set(memosCell.get().map((m) => (m.folder === id ? { ...m, folder: undefined } : m)))
    foldersCell.set(foldersCell.get().filter((f) => f.id !== id))
  }
}
