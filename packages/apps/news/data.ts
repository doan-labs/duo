// Feeds from DEV Community (dev.to): real articles with real cover art. Text
// search still goes to Hacker News through Algolia, which indexes far more
// than one site; those hits open the same sheets, just without photography.
// The owner view fetches and caches into `os.storage` (`feed:<key>`,
// `cmt:<id>`, `txt:<id>`, `img:<key>`) so the mirror copy paints the same
// stories, bodies and artwork without starting a request; a view that needs
// fresher data asks the owner over `os.commands`. Images travel as data URIs:
// the sandbox document policy renders no other image source.
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
  /** The lede: DEV's description or an HN item's own text. */
  text?: string
  /** Remote cover URL; useImage resolves it to a data URI for the document policy. */
  image?: string
  /** A real cover photo rather than DEV's generated social card. */
  cover?: boolean
  /** Algolia hit: the item endpoint carries its discussion instead of DEV's. */
  hn?: boolean
  /** DEV tag slugs, read as the article kicker. */
  tags?: string[]
}
export type Comment = { id: string; author: string; text: string; time: number; kids: Comment[] }

type Post = {
  id?: number
  title?: string
  url?: string
  description?: string
  published_timestamp?: string
  comments_count?: number
  positive_reactions_count?: number
  cover_image?: string | null
  social_image?: string | null
  user?: { name?: string }
  body_html?: string
  tag_list?: string[]
}
const toStory = (a: Post): Story => ({
  id: `d${a.id ?? 0}`,
  title: a.title ?? 'Untitled',
  url: a.url,
  author: a.user?.name ?? '',
  points: a.positive_reactions_count ?? 0,
  comments: a.comments_count ?? 0,
  time: a.published_timestamp ? Math.round(Date.parse(a.published_timestamp) / 1000) : 0,
  text: a.description,
  image: a.cover_image ?? a.social_image ?? undefined,
  cover: !!a.cover_image,
  tags: a.tag_list?.slice(0, 3)
})

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
const hitToStory = (h: Hit): Story => ({
  id: `h${h.objectID}`,
  title: h.title ?? 'Untitled',
  url: h.url,
  author: h.author ?? '',
  points: h.points ?? 0,
  comments: h.num_comments ?? 0,
  time: h.created_at_i ?? 0,
  text: h.story_text,
  hn: true
})

type Item = { id: number; author?: string; text?: string | null; created_at_i?: number; children?: Item[] }
const toComment = (c: Item): Comment | null =>
  c.text
    ? {
        id: String(c.id),
        author: c.author ?? '',
        text: c.text,
        time: c.created_at_i ?? 0,
        kids: (c.children ?? [])
          .map(toComment)
          .filter((k): k is Comment => !!k)
          .slice(0, 2)
      }
    : null
type DComment = {
  id_code?: string
  user?: { name?: string }
  body_html?: string
  created_at?: string
  children?: DComment[]
}
const toDComment = (c: DComment): Comment | null =>
  c.body_html
    ? {
        id: c.id_code ?? '',
        author: c.user?.name ?? '',
        text: c.body_html,
        time: c.created_at ? Math.round(Date.parse(c.created_at) / 1000) : 0,
        kids: (c.children ?? [])
          .map(toDComment)
          .filter((k): k is Comment => !!k)
          .slice(0, 2)
      }
    : null

/** Feed keys to DEV paths. `topic:<name>` reads a tag's best of the week. */
const FEEDS: Record<string, string> = {
  today: 'articles?per_page=26&top=1',
  latest: 'articles?per_page=26&state=fresh',
  rising: 'articles?per_page=26&state=rising',
  showdev: 'articles?per_page=26&top=7&tag=showdev',
  discuss: 'articles?per_page=26&top=7&tag=discuss',
  career: 'articles?per_page=26&top=30&tag=career'
}
/** A topic's name squashes into its DEV tag: 'Open Source' is `opensource`. */
export const topicTag = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
const feedPath = (key: string) =>
  FEEDS[key] ??
  (key.startsWith('topic:')
    ? `articles?${new URLSearchParams({ tag: topicTag(key.slice(6)), top: '7', per_page: '22' })}`
    : undefined)

type Entry = { hits?: Story[]; loading: boolean; error?: string; fetched?: number }
type CEntry = { items?: Comment[]; loading: boolean; error?: string }
type BEntry = { paras?: string[]; loading: boolean; error?: string }
const feeds = new Map<string, Entry>()
const comments = new Map<string, CEntry>()
const bodies = new Map<string, BEntry>()
const images = new Map<string, string>()
const imageOrder: string[] = []
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
    try {
      if (force || !prior?.fetched || Date.now() - prior.fetched >= STALE) await os.commands.send('refresh', key)
    } catch {
      /* The owner answering is best-effort; the storage echo can still arrive. */
    }
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
    const response = await fetch(`https://dev.to/api/${path}`, { credentials: 'omit', signal })
    if (!response.ok) throw new Error('Feed unavailable')
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Incomplete feed')
    const hits = (data as Post[]).filter((a) => a.title && a.id).map(toStory)
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
const emptyComments: CEntry = { loading: true }
async function requestComments(id: string, force = false) {
  if (!os.owner) {
    // Seed the same loading placeholder the owner writes, then ask for the real discussion.
    if (!comments.get(id)?.items) {
      comments.set(id, { loading: true })
      emit()
    }
    try {
      await os.commands.send('comments', id)
    } catch {
      comments.set(id, { loading: false, error: 'Discussion could not be loaded.' })
      emit()
    }
    return
  }
  if (comments.get(id)?.items && !force) return
  const epoch = os.owner.epoch
  comments.set(id, { ...comments.get(id), loading: true, error: undefined })
  emit()
  try {
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const items = id.startsWith('d')
      ? await devComments(id.slice(1), signal)
      : await hnComments(id.startsWith('h') ? id.slice(1) : id, signal)
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
async function devComments(id: string, signal: AbortSignal) {
  const response = await fetch(`https://dev.to/api/comments?a_id=${id}`, { credentials: 'omit', signal })
  if (!response.ok) throw new Error('Discussion unavailable')
  const data = await response.json()
  return ((data ?? []) as DComment[])
    .map(toDComment)
    .filter((c): c is Comment => !!c)
    .slice(0, CM_MAX)
}
async function hnComments(id: string, signal: AbortSignal) {
  const response = await fetch(`https://hn.algolia.com/api/v1/items/${id}`, { credentials: 'omit', signal })
  if (!response.ok) throw new Error('Discussion unavailable')
  const data = await response.json()
  return ((data.children ?? []) as Item[])
    .map(toComment)
    .filter((c): c is Comment => !!c)
    .slice(0, CM_MAX)
}
export function useComments(id: string) {
  // The fallback must be one stable object: a fresh literal per call reads as a
  // changed snapshot and useSyncExternalStore re-renders forever.
  const entry = useSyncExternalStore(subscribe, () => comments.get(id) || emptyComments)
  useEffect(() => {
    void requestComments(id)
  }, [id])
  return entry
}

const TXT_MAX = 8
const emptyBody: BEntry = { loading: true }
/** The article's own paragraphs: DEV's body_html split on block closes and stripped. */
const toParas = (html: string) =>
  html
    .split(/<\/(?:p|h[1-6]|li|pre|blockquote|tr)>/i)
    .map((chunk) => {
      const d = document.createElement('textarea')
      d.innerHTML = chunk.replace(/<[^>]*>/g, ' ')
      return d.value.replace(/\s+/g, ' ').trim()
    })
    .filter((p) => p.length > 1)
async function requestBody(id: string, force = false) {
  if (!id.startsWith('d')) return
  if (!os.owner) {
    if (!bodies.get(id)?.paras) {
      bodies.set(id, { loading: true })
      emit()
    }
    try {
      await os.commands.send('body', id)
    } catch {
      bodies.set(id, { loading: false, error: 'Article could not be loaded.' })
      emit()
    }
    return
  }
  if (bodies.get(id)?.paras && !force) return
  const epoch = os.owner.epoch
  bodies.set(id, { ...bodies.get(id), loading: true, error: undefined })
  emit()
  try {
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const response = await fetch(`https://dev.to/api/articles/${id.slice(1)}`, { credentials: 'omit', signal })
    if (!response.ok) throw new Error('Article unavailable')
    const data = (await response.json()) as Post
    const paras = data.body_html ? toParas(data.body_html).slice(0, 40) : []
    if (os.owner?.epoch !== epoch) return
    bodies.set(id, { paras, loading: false })
  } catch {
    bodies.set(id, { ...bodies.get(id), loading: false, error: 'Article could not be loaded.' })
  } finally {
    emit()
    if (os.owner?.epoch === epoch && bodies.get(id)?.paras) {
      try {
        await os.storage.set(`txt:${id}`, JSON.stringify(bodies.get(id)))
        const { keys } = await os.storage.keys()
        const stale = keys.filter((k) => k.startsWith('txt:')).sort()
        for (const k of stale.slice(0, Math.max(0, stale.length - TXT_MAX))) await os.storage.del(k)
      } catch {
        /* A cached body is a nicety, not a failure. */
      }
    }
  }
}
const noBody: BEntry = { loading: false }
export function useBody(s: Story) {
  const entry = useSyncExternalStore(subscribe, () => bodies.get(s.id) || emptyBody)
  useEffect(() => {
    void requestBody(s.id)
  }, [s.id])
  return s.hn ? noBody : entry
}

/**
 * Real photography under a `img-src data:` policy: the bytes are fetched through
 * the weserv resizer (one allowlisted origin whatever the CDN host), decoded to a
 * data URI, then shared with the mirror through `img:` storage keys. The map is
 * the session truth; storage is a warm cache trimmed to IMG_MAX oldest-first.
 */
const IMG_MAX = 80
const IMG_SIZES = { thumb: { w: '240', h: '240' }, hero: { w: '1400', h: '560' } } as const
export type ImageSize = keyof typeof IMG_SIZES
const imageHash = (s: string) => {
  let h = 0x811c9dc5
  for (const c of s) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}
const dataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
const imageKey = (url: string, size: ImageSize) => `${size}:${imageHash(url)}`
const imagePending = new Set<string>()
async function requestImage(url: string, size: ImageSize) {
  const key = imageKey(url, size)
  if (images.has(key) || imagePending.has(key)) return
  imagePending.add(key)
  try {
    if (!os.owner) {
      await os.commands.send('image', JSON.stringify({ u: url, s: size }))
      return
    }
    const epoch = os.owner.epoch
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const response = await fetch(
      `https://images.weserv.nl/?${new URLSearchParams({ url, ...IMG_SIZES[size], fit: 'cover', output: 'webp', q: '80' })}`,
      { credentials: 'omit', signal }
    )
    if (!response.ok) throw new Error('Image unavailable')
    const blob = await response.blob()
    // A storage value tops out at 256 KB; base64 inflates a blob by a third.
    if (!blob.type.startsWith('image/') || blob.size > 140 * 1024) throw new Error('Image unusable')
    const uri = await dataUrl(blob)
    if (os.owner?.epoch !== epoch) return
    images.set(key, uri)
    emit()
    try {
      await os.storage.set(`img:${key}`, JSON.stringify({ u: url, d: uri }))
      if (!imageOrder.includes(key)) imageOrder.push(key)
      while (imageOrder.length > IMG_MAX) {
        const old = imageOrder.shift()
        if (!old) break
        images.delete(old)
        try {
          await os.storage.del(`img:${old}`)
        } catch {
          /* A missing key is already evicted. */
        }
      }
    } catch {
      /* Artwork is decoration; a quota miss keeps the session map. */
    }
  } catch {
    /* The lettered tile stays. */
  } finally {
    imagePending.delete(key)
  }
}
/** The data URI for a story's artwork, once fetched; undefined keeps the gradient. */
export function useImage(url: string | undefined, size: ImageSize = 'thumb') {
  const uri = useSyncExternalStore(subscribe, () => (url ? images.get(imageKey(url, size)) : undefined))
  useEffect(() => {
    if (url) void requestImage(url, size)
  }, [url, size])
  return uri
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
  return ((data.hits ?? []) as Hit[]).filter((h) => h.title).map(hitToStory)
}

/** A `?arg=<id>` deep link lands here: one item fetch, then the article opens. */
export async function fetchStory(id: string): Promise<Story | null> {
  try {
    if (!os.owner) {
      // The mirror never fetches; the owner's 'open' command writes session.story for both views.
      await os.commands.send('open', id)
      return null
    }
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    if (id.startsWith('d')) {
      const response = await fetch(`https://dev.to/api/articles/${id.slice(1)}`, { credentials: 'omit', signal })
      if (!response.ok) return null
      const data = (await response.json()) as Post
      const s = toStory(data)
      if (data.body_html) {
        const paras = toParas(data.body_html).slice(0, 40)
        bodies.set(s.id, { paras, loading: false })
        emit()
      }
      return s
    }
    // Old links carry a bare HN objectID; new ones prefix the source (`d`/`h`).
    const response = await fetch(`https://hn.algolia.com/api/v1/items/${id.startsWith('h') ? id.slice(1) : id}`, {
      credentials: 'omit',
      signal
    })
    if (!response.ok) return null
    const data = await response.json()
    return hitToStory({ ...data, objectID: String(data.id), num_comments: data.children?.length })
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
      if (k.startsWith('txt:')) {
        const id = k.slice(4)
        if (v) bodies.set(id, JSON.parse(v))
        else bodies.delete(id)
      }
      if (k.startsWith('img:')) {
        // Deletes only trim the durable cache; the session map keeps showing them.
        if (v) {
          const stored = JSON.parse(v) as { u?: string; d?: string }
          if (stored.d) {
            images.set(k.slice(4), stored.d)
            if (!imageOrder.includes(k.slice(4))) imageOrder.push(k.slice(4))
          }
        }
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
      if (change.k.startsWith('img:')) emit()
      else swap()
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
    if (type === 'body') await requestBody(payload, true)
    if (type === 'image') {
      const { u, s } = JSON.parse(payload)
      if (typeof u === 'string' && (s === 'thumb' || s === 'hero')) await requestImage(u, s)
    }
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
