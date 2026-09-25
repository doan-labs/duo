// The Safari book: favourites, bookmarks, the reading list and history in one
// module-level store both displays read, persisted under a single localStorage
// key (`duo.` so Erase All Content and Settings wipes it). Private tabs never
// write here; what a private tab visits ends at its own back list.

const KEY = 'duo.safari.v1'
// History is a rolling window of where the address bar has been.
const HIST_MAX = 300

export type MarkList = 'favorites' | 'bookmarks' | 'reading'
export type Mark = { url: string; title: string; added: number }
export type Visit = { url: string; title: string; at: number }
export const host = (url: string) => url.replace(/^https?:\/\//, '').split('/')[0]!

export type Book = {
  schema: 1
  /** Shown on the start page and under Favorites. */
  favorites: Mark[]
  /** Top-level bookmarks; Recently Saved reads these and the favourites. */
  bookmarks: Mark[]
  reading: Mark[]
  /** Newest first. */
  history: Visit[]
}

const seed = (): Book => ({
  schema: 1,
  favorites: [
    { url: 'https://duo.doan-labs.com', title: 'Duo', added: 0 },
    { url: 'https://en.m.wikipedia.org', title: 'Wikipedia', added: 0 },
    { url: 'https://threejs.org', title: 'three.js', added: 0 },
    { url: 'https://bun.sh/docs', title: 'Bun', added: 0 },
    { url: 'https://archive.org', title: 'Internet Archive', added: 0 },
    { url: 'https://www.bing.com/search?q=iphone+duo', title: 'Bing', added: 0 }
  ],
  bookmarks: [],
  reading: [],
  history: []
})

let book: Book = (() => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Book
      if (
        v.schema === 1 &&
        Array.isArray(v.favorites) &&
        Array.isArray(v.bookmarks) &&
        Array.isArray(v.reading) &&
        Array.isArray(v.history)
      )
        return v
    }
  } catch {}
  const fresh = seed()
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh))
  } catch {}
  return fresh
})()

const subs = new Set<() => void>()
const set = (next: Book) => {
  book = next
  try {
    localStorage.setItem(KEY, JSON.stringify(book))
  } catch {}
  for (const fn of subs) fn()
}

export const safari = {
  subscribe: (fn: () => void) => {
    subs.add(fn)
    return () => subs.delete(fn)
  },
  get: () => book
}

/**
 * A page the address bar went to. Every navigation is an entry, whichever tab
 * it came from; only a mount asks to coalesce, so a reload or the second
 * display's copy of the same page on top does not repeat it.
 */
export function visit(url: string, title: string, coalesce = false) {
  if (coalesce && book.history[0]?.url === url) return
  set({ ...book, history: [{ url, title, at: Date.now() }, ...book.history].slice(0, HIST_MAX) })
}

/**
 * The one title a cross-origin frame cannot give up until the page is ours and
 * `contentDocument.title` reads. Upgrades the latest visit at that url and any
 * marks holding it.
 */
export function retitle(url: string, title: string) {
  if (!title) return
  const name = <T extends { url: string }>(m: T): T => (m.url === url ? { ...m, title } : m)
  const i = book.history.findIndex((x) => x.url === url)
  set({
    ...book,
    favorites: book.favorites.map(name),
    bookmarks: book.bookmarks.map(name),
    reading: book.reading.map(name),
    history: i < 0 ? book.history : book.history.map((v, j) => (j === i ? { ...v, title } : v))
  })
}

/** Saves a page. The same url in the list moves to the top rather than doubling. */
export function mark(url: string, title: string, list: MarkList = 'bookmarks') {
  const m: Mark = { url, title, added: Date.now() }
  set({ ...book, [list]: [m, ...book[list].filter((x) => x.url !== url)] })
}

export function unmark(url: string, list: MarkList) {
  set({ ...book, [list]: book[list].filter((m) => m.url !== url) })
}

/** Drops one entry, keyed by when it happened; identical urls do not collide. */
export function forgetVisit(v: Visit) {
  set({ ...book, history: book.history.filter((x) => x.at !== v.at || x.url !== v.url) })
}

/** Clears visits at or after `since` (0 is all time), keeping what came before. */
export function clearHistory(since = 0) {
  set({ ...book, history: book.history.filter((v) => v.at < since) })
}
