// App state, the sandboxed way: the data lives in `os.storage`, the chrome
// around it in `os.session` so both displays draw the same page. `useJSON`
// seeds a fresh install from `data.ts` without a write.

import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { useEffect, useMemo, useReducer } from 'react'
import { type Reminder, type RList, seed } from './data.ts'

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Every reminder, oldest first; a new one appends at the bottom like iOS. */
export function useReminders() {
  const s = useMemo(seed, [])
  const raw = useKV(os.storage, 'items')
  const legacy = useKV(os.storage, 'tasks')
  // v1 kept a flat `tasks` checklist; fold it into the Reminders list once.
  useEffect(() => {
    if (raw.status === 'hydrating' || legacy.status === 'hydrating') return
    if (raw.value || !legacy.value) return
    try {
      const old = JSON.parse(legacy.value) as { t: string; done?: boolean }[]
      raw.set(JSON.stringify(old.map((r) => ({ id: uid(), t: r.t, done: r.done, list: 'reminders' }))))
    } catch {
      // An unreadable legacy value is left alone.
    }
  }, [raw, legacy])
  const items: Reminder[] = raw.value ? (JSON.parse(raw.value) as Reminder[]) : s.items
  const write = (v: Reminder[]) => raw.set(JSON.stringify(v))
  return {
    items,
    hydrating: raw.status === 'hydrating',
    put: (r: Reminder) =>
      write(items.some((x) => x.id === r.id) ? items.map((x) => (x.id === r.id ? r : x)) : [...items, r]),
    add: (r: Omit<Reminder, 'id'>) => {
      const n: Reminder = { ...r, id: uid() }
      write([...items, n])
      return n
    },
    remove: (id: string) => write(items.filter((x) => x.id !== id)),
    setDone: (r: Reminder, done: boolean) =>
      write(items.map((x) => (x.id === r.id ? { ...x, done, doneAt: done ? Date.now() : undefined } : x))),
    removeList: (id: string) => write(items.filter((x) => x.list !== id))
  }
}

/** The user's lists; order here is the order My Lists draws. */
export function useLists() {
  const s = useMemo(seed, [])
  const kv = useJSON<RList[]>(os.storage, 'lists', s.lists)
  const lists = kv.value
  return {
    lists,
    put: (l: RList) =>
      kv.set(lists.some((x) => x.id === l.id) ? lists.map((x) => (x.id === l.id ? l : x)) : [...lists, l]),
    remove: (id: string) => kv.set(lists.filter((x) => x.id !== id))
  }
}

// ---------- navigation: one path cell drives both displays ----------

const ROOT = ['root']
/** The last non-detail destination in the path; the pane's page. */
export const destOf = (path: string[]) => path.filter((p) => p !== 'root' && !p.startsWith('detail:')).at(-1)
/** The open Details view's reminder id, if the path ends in one. */
export const detailOf = (path: string[]) => {
  const top = path.at(-1)
  return top?.startsWith('detail:') ? top.slice(7) : undefined
}

export const usePath = () => useJSON<string[]>(os.session, 'path', ROOT).value

export function useGo() {
  const kv = useJSON<string[]>(os.session, 'path', ROOT)
  const path = kv.value
  return {
    home: () => kv.set(ROOT),
    /** Sidebar or tile pick: the destination replaces whatever was open. */
    open: (d: string) => kv.set(['root', d]),
    /** Open a reminder's Details over the current destination. */
    detail: (id: string) => kv.set([...(detailOf(path) ? path.slice(0, -1) : path), `detail:${id}`]),
    back: () => kv.set(path.length > 1 ? path.slice(0, -1) : path)
  }
}

/** The sidebar/cover search field; results swap the whole pane when set. */
export function useQuery() {
  const kv = useKV(os.session, 'q')
  return [kv.value ?? '', (v: string) => (v ? kv.set(v) : kv.del())] as const
}

/** "Show Completed" is a per-destination switch, like iOS keeps it per list. */
export function useShowDone(dest: string) {
  const kv = useKV(os.session, `done:${dest}`)
  return [kv.value === '1', (v: boolean) => (v ? kv.set('1') : kv.del())] as const
}

/** The inline new-reminder draft at the bottom of a list. */
export type Draft = {
  t: string
  list: string
  dest?: string
  date?: string
  time?: string
  flag?: boolean
  pri?: 1 | 2 | 3
}
export function useEditor() {
  const kv = useJSON<Draft | null>(os.session, 'editor', null)
  return { draft: kv.value, set: kv.set, close: () => kv.set(null) }
}

/** The Add/Edit List sheet: 'new', a list id, or closed. */
export function useListSheet() {
  const kv = useKV(os.session, 'listSheet')
  return [kv.value, (v?: string) => (v ? kv.set(v) : kv.del())] as const
}

/** The Lists page's "Edit Lists" mode. */
export function useEditLists() {
  const kv = useKV(os.session, 'editLists')
  return [kv.value === '1', (v: boolean) => (v ? kv.set('1') : kv.del())] as const
}

/** The wide layout's sidebar, hidden or shown. */
export function useSideOff() {
  const kv = useKV(os.session, 'sideOff')
  return [kv.value === '1', (v: boolean) => (v ? kv.set('1') : kv.del())] as const
}

/** A 30 s poke turns "Today" over at midnight; the mirror copy starts nothing. */
export function useNow(mirror?: boolean) {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (mirror) return
    const t = setInterval(bump, 30_000)
    return () => clearInterval(t)
  }, [mirror])
}
