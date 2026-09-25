// Hacker News through the Algolia API. The owner view fetches and caches into
// `os.storage` (`feed:<key>`, `cmt:<id>`) so the mirror copy paints the same
// stories without starting a request; a view that needs fresher data asks the
// owner over `os.commands`. Patterns mirror `packages/apps/weather/data.ts`.
import { os, transition } from '@doan-labs/duo-sdk'
import { useEffect, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type Story = {
  id: string
  title: string
  url?: string
  author: string
  points: number
  comments: number
  time: number
  text?: string
}
export type Comment = { id: number; author: string; text: string; time: number; kids: Comment[] }

type Hit = {
  objectID: string
  title?: string
  url?: string
  author?: string
  points?: number
  num_comments?: number
  created_at_i?: number
  story_text?: string
}
const toStory = (h: Hit): Story => ({
  id: h.objectID,
  title: h.title ?? 'Untitled',
  url: h.url,
  author: h.author ?? '',
  points: h.points ?? 0,
  comments: h.num_comments ?? 0,
  time: h.created_at_i ?? 0,
  text: h.story_text
})
type Item = { id: number; author?: string; text?: string | null; created_at_i?: number; children?: Item[] }
const toComment = (c: Item): Comment | null =>
  c.text
    ? {
        id: c.id,
        author: c.author ?? '',
        text: c.text,
        time: c.created_at_i ?? 0,
        kids: (c.children ?? [])
          .map(toComment)
          .filter((k): k is Comment => !!k)
          .slice(0, 2)
      }
    : null

/** Feed keys to Algolia paths. `topic:<query>` searches story titles and text. */
const FEEDS: Record<string, string> = {
  today: 'search?tags=front_page&hitsPerPage=26',
  latest: 'search_by_date?tags=story&hitsPerPage=26',
  show: 'search?tags=show_hn&hitsPerPage=26',
  ask: 'search?tags=ask_hn&hitsPerPage=26',
  jobs: 'search?tags=job&hitsPerPage=26'
}
const feedPath = (key: string) =>
  FEEDS[key] ??
  (key.startsWith('topic:')
    ? `search?${new URLSearchParams({ query: key.slice(6), tags: 'story', hitsPerPage: '22' })}`
    : undefined)

type Entry = { hits?: Story[]; loading: boolean; error?: string; fetched?: number }
type CEntry = { items?: Comment[]; loading: boolean; error?: string }
const feeds = new Map<string, Entry>()
const comments = new Map<string, CEntry>()
const empty: Entry = { loading: true }
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
const swap = () => transition(() => flushSync(emit))
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
let ownerAbort = new AbortController()
const pending = new Set<string>()
const STALE = 600_000

export async function refresh(key: string, force = false) {
  const path = feedPath(key)
  if (!path) return
  if (!os.owner) {
    // The mirror copy never fetches; it asks the owner and reads the storage echo.
    const prior = feeds.get(key)
    if (force || !prior?.fetched || Date.now() - prior.fetched >= STALE) await os.commands.send('refresh', key)
    return
  }
  const epoch = os.owner.epoch
  const prior = feeds.get(key)
  if (pending.has(key) || (!force && prior?.fetched && Date.now() - prior.fetched < STALE)) return
  pending.add(key)
  feeds.set(key, { ...prior, loading: true, error: undefined })
  emit()
  try {
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const response = await fetch(`https://hn.algolia.com/api/v1/${path}`, { credentials: 'omit', signal })
    if (!response.ok) throw new Error('Feed unavailable')
    const data = await response.json()
    if (!Array.isArray(data.hits)) throw new Error('Incomplete feed')
    const hits = (data.hits as Hit[]).filter((h) => h.title).map(toStory)
    if (os.owner?.epoch !== epoch) return
    feeds.set(key, { hits, loading: false, fetched: Date.now() })
  } catch {
    feeds.set(key, { ...prior, loading: false, error: 'Unable to update. Check your connection and try again.' })
  } finally {
    pending.delete(key)
    emit()
    if (os.owner?.epoch === epoch) {
      try {
        await os.storage.set(`feed:${key}`, JSON.stringify(feeds.get(key)))
      } catch {
        feeds.set(key, { ...feeds.get(key), loading: false, error: 'Feed could not be saved. Try again.' })
        emit()
      }
    }
  }
}
export function useFeed(key: string) {
  const entry = useSyncExternalStore(subscribe, () => feeds.get(key) || empty)
  useEffect(() => {
    void refresh(key)
  }, [key])
  return entry
}

const CM_MAX = 12
async function requestComments(id: string, force = false) {
  if (!os.owner) {
    await os.commands.send('comments', id)
    return
  }
  if (comments.get(id)?.items && !force) return
  const epoch = os.owner.epoch
  comments.set(id, { ...comments.get(id), loading: true, error: undefined })
  emit()
  try {
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const response = await fetch(`https://hn.algolia.com/api/v1/items/${id}`, { credentials: 'omit', signal })
    if (!response.ok) throw new Error('Discussion unavailable')
    const data = await response.json()
    const items = ((data.children ?? []) as Item[])
      .map(toComment)
      .filter((c): c is Comment => !!c)
      .slice(0, CM_MAX)
    if (os.owner?.epoch !== epoch) return
    comments.set(id, { items, loading: false })
  } catch {
    comments.set(id, { ...comments.get(id), loading: false, error: 'Discussion could not be loaded.' })
  } finally {
    emit()
    if (os.owner?.epoch === epoch && comments.get(id)?.items) {
      try {
        await os.storage.set(`cmt:${id}`, JSON.stringify(comments.get(id)))
        // Discussion caches are read-once weight: keep only the freshest dozen.
        const { keys } = await os.storage.keys()
        const stale = keys.filter((k) => k.startsWith('cmt:')).sort()
        for (const k of stale.slice(0, Math.max(0, stale.length - CM_MAX))) await os.storage.del(k)
      } catch {
        /* A cached discussion is a nicety, not a failure. */
      }
    }
  }
}
export function useComments(id: string) {
  const entry = useSyncExternalStore(subscribe, () => comments.get(id) || { loading: true })
  useEffect(() => {
    void requestComments(id)
  }, [id])
  return entry
}

export async function search(query: string, signal: AbortSignal): Promise<Story[]> {
  if (!os.owner) {
    const request = crypto.randomUUID()
    await os.commands.send('search', JSON.stringify({ query, request }))
    const value = await os.session.get(`search:${request}`)
    await os.session.del(`search:${request}`)
    signal.throwIfAborted()
    return JSON.parse(value ?? '[]')
  }
  const response = await fetch(
    `https://hn.algolia.com/api/v1/search?${new URLSearchParams({ query, hitsPerPage: '30' })}`,
    { credentials: 'omit', signal: AbortSignal.any([signal, ownerAbort.signal, AbortSignal.timeout(15000)]) }
  )
  if (!response.ok) throw new Error('Search unavailable')
  const data = await response.json()
  return ((data.hits ?? []) as Hit[]).filter((h) => h.title).map(toStory)
}

/** A `?arg=<objectID>` deep link lands here: one item fetch, then the article opens. */
export async function fetchStory(id: string): Promise<Story | null> {
  try {
    if (!os.owner) {
      // The mirror never fetches; the owner's 'open' command writes session.story for both views.
      await os.commands.send('open', id)
      return null
    }
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const response = await fetch(`https://hn.algolia.com/api/v1/items/${id}`, { credentials: 'omit', signal })
    if (!response.ok) return null
    const data = await response.json()
    return toStory({ ...data, objectID: String(data.id), num_comments: data.children?.length })
  } catch {
    return null
  }
}

export async function initializeNews() {
  let revision = 0
  let unwatch: (() => void) | undefined
  const apply = (k: string, v: string | null) => {
    try {
      if (k.startsWith('feed:')) {
        const key = k.slice(5)
        if (v) feeds.set(key, JSON.parse(v))
        else feeds.delete(key)
      }
      if (k.startsWith('cmt:')) {
        const id = k.slice(4)
        if (v) comments.set(id, JSON.parse(v))
        else comments.delete(id)
      }
    } catch {
      /* A malformed cache entry is skipped, not fatal. */
    }
  }
  const load = async () => {
    unwatch?.()
    let cursor: string | undefined
    do {
      const snap = await os.storage.snapshot(cursor)
      revision = snap.rev
      cursor = snap.cursor
      for (const [k, v] of snap.entries) apply(k, v)
    } while (cursor)
    unwatch = os.storage.watch(revision, (change) => {
      if (change.rev < 0 || change.rev > revision + 1) {
        void load()
        return
      }
      if (change.rev <= revision) return
      revision = change.rev
      apply(change.k, change.v)
      swap()
    })
    emit()
  }
  await load()
  const reconcile = () => {
    if (!os.owner) return
    // Today and Latest are the always-fresh pair; the rest refresh on open.
    void refresh('today')
    void refresh('latest')
  }
  os.onOwner(() => {
    ownerAbort.abort()
    ownerAbort = new AbortController()
    reconcile()
  })
  os.onView((view) => {
    if (view.visible) reconcile()
  })
  os.commands.onCommand(async ({ type, payload }) => {
    if (type === 'refresh') await refresh(payload, true)
    if (type === 'comments') await requestComments(payload, true)
    if (type === 'open') {
      const s = await fetchStory(payload)
      if (s) await os.session.set('story', JSON.stringify(s))
    }
    if (type === 'search') {
      const { query, request } = JSON.parse(payload)
      await os.session.set(`search:${request}`, JSON.stringify(await search(query, ownerAbort.signal)))
    }
  })
  setInterval(reconcile, 300_000)
  reconcile()
}
