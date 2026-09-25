// App state, the sandboxed way: notes, folders and documents live in
// `os.storage`, the chrome (path, search, sort, view) in `os.session` so both
// displays draw the same page. Written values carry the derived bits - title
// and tags on the index entry - so nothing else has to open a doc.

import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { useEffect, useMemo } from 'react'
import { type Doc, type Folder, type Note, parse, type Sort, serialize, tagsOf, titleOf, uid } from './data.ts'

/** The list itself as one JSON key, like v1, so both displays agree on it. */
export function useNotes() {
  const index = useJSON<Note[]>(os.storage, 'index', [])
  const notes = index.value
  const write = (v: Note[]) => index.set(v)
  const add = (folder?: string) => {
    const note: Note = { id: uid(), when: new Date().toISOString(), edited: new Date().toISOString(), folder }
    write([note, ...notes])
    return note
  }
  const put = (note: Note) => write(notes.map((n) => (n.id === note.id ? note : n)))
  /** For good: index entry plus every key the doc owned. */
  const remove = (note: Note) => {
    write(notes.filter((n) => n.id !== note.id))
    void delMedia(note.id)
  }
  return { notes, add, put, remove, hydrating: index.status === 'hydrating' }
}

/** Deletes a note's doc, markup and image keys. Storage pages keys at 256. */
async function delMedia(id: string) {
  try {
    let cursor: string | undefined
    do {
      const page: { keys: string[]; cursor?: string } = await os.storage.keys(cursor)
      for (const k of page.keys) {
        if (k === `note:${id}` || k === `markup:${id}` || k.startsWith(`img:${id}:`)) void os.storage.del(k)
      }
      cursor = page.cursor
    } while (cursor)
  } catch {
    // A sweep that fails leaves orphan keys; the next purge tries again.
  }
}

/** Drops notes that have sat in Recently Deleted for 30 days, once per mount. */
export function usePurge() {
  const { notes, remove, hydrating } = useNotes()
  useEffect(() => {
    if (hydrating) return
    for (const n of notes) {
      if (n.deleted && Date.now() - new Date(n.deleted).getTime() > 30 * 864e5) remove(n)
    }
  }, [hydrating, notes, remove])
}

/** User folders under iCloud; the built-in "Notes" folder is `undefined` on a note. */
export function useFolders() {
  const list = useJSON<Folder[]>(os.storage, 'folders', [])
  const folders = list.value
  return {
    folders,
    add: (name: string) => {
      const folder: Folder = { id: uid(), name }
      list.set([...folders, folder])
      return folder
    },
    rename: (folder: Folder, name: string) => list.set(folders.map((f) => (f.id === folder.id ? { ...f, name } : f))),
    remove: (folder: Folder) => list.set(folders.filter((f) => f.id !== folder.id))
  }
}

// ---------- navigation: one path cell drives both displays ----------

const ROOT = ['folders']
export type Dest = { kind: 'notes' | 'folder' | 'deleted' | 'tag'; id?: string }

/** The list destination a path names: the Notes folder, a user folder, the bin, or a tag. */
export const destOf = (path: string[]): Dest => {
  const top = path.filter((p) => p !== 'folders' && !p.startsWith('note:')).at(-1)
  if (top === 'deleted') return { kind: 'deleted' }
  if (top?.startsWith('tag:')) return { kind: 'tag', id: top.slice(4) }
  if (top?.startsWith('fold:')) return { kind: 'folder', id: top.slice(5) }
  return { kind: 'notes' }
}

/** The open note's id, when the path ends in one. */
export const noteOf = (path: string[]) => {
  const top = path.at(-1)
  return top?.startsWith('note:') ? top.slice(5) : undefined
}

export const usePath = () => useJSON<string[]>(os.session, 'path', ROOT).value

export function useGo() {
  const kv = useJSON<string[]>(os.session, 'path', ROOT)
  const path = kv.value
  return {
    path,
    root: () => kv.set(ROOT),
    /** A sidebar or cover pick replaces whatever was open. */
    open: (d: string) => kv.set(['folders', d]),
    note: (id: string) => kv.set([...(noteOf(path) ? path.slice(0, -1) : path), `note:${id}`]),
    back: () => kv.set(path.length > 1 ? path.slice(0, -1) : path)
  }
}

// ---------- chrome prefs ----------

/** The search field; results swap the list on both displays. */
export function useSearch() {
  const kv = useKV(os.session, 'q')
  return [kv.value ?? '', (v: string) => (v ? kv.set(v) : kv.del())] as const
}

/** List order: Date Edited, Date Created or Title, like the real list's ellipsis menu. */
export function useSort() {
  const kv = useKV(os.session, 'sort')
  return [(kv.value as Sort) ?? 'edited', (v: Sort) => (v === 'edited' ? kv.del() : kv.set(v))] as const
}

/** Rows or the gallery grid. */
export function useView() {
  const kv = useKV(os.session, 'view')
  return [
    kv.value === 'gallery' ? 'gallery' : 'list',
    (v: 'list' | 'gallery') => (v === 'list' ? kv.del() : kv.set(v))
  ] as const
}

// ---------- the document itself ----------

/**
 * Both displays and every row read the same stored doc; the editor serializes
 * on input. `put` also stamps the index entry: edited time, title, tags.
 * Loading a doc written before the index carried those fields backfills them,
 * which is what migrates a v1 install just by opening its list.
 */
export function useDoc(note: Note) {
  const kv = useKV(os.storage, `note:${note.id}`)
  const doc = useMemo(() => parse(kv.value ?? undefined), [kv.value])
  const { notes, put: putNote } = useNotes()
  useEffect(() => {
    const current = notes.find((n) => n.id === note.id)
    if (!current || kv.status === 'hydrating' || (current.title !== undefined && current.tags !== undefined)) return
    putNote({ ...current, title: titleOf(doc), tags: tagsOf(doc) })
  }, [doc, note.id, kv.status, notes, putNote])
  const put = (next: Doc, touch = true) => {
    kv.set(serialize(next))
    if (!touch) return
    const current = notes.find((n) => n.id === note.id)
    if (current) putNote({ ...current, edited: new Date().toISOString(), title: titleOf(next), tags: tagsOf(next) })
  }
  return { doc, put, raw: kv.value ?? '', status: kv.status }
}

/** The tags every index entry advertises, for the sidebar strip. */
export function useTags() {
  const { notes } = useNotes()
  const all = new Set<string>()
  for (const n of notes) {
    if (n.deleted) continue
    for (const t of n.tags ?? []) all.add(t)
  }
  return [...all].sort()
}

export type Stroke = { c: string; w: number; pts: number[] }
/** Markup scribbles over a note: vector strokes under `markup:<id>`. */
export function useMarkup(note: Note) {
  const kv = useJSON<Stroke[]>(os.storage, `markup:${note.id}`, [])
  return { strokes: kv.value, put: kv.set }
}
