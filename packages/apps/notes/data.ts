// The note model: one index entry plus a structured document under `note:<id>`.
// A document is ordered blocks - styled text paragraphs, tables and images -
// stored as one JSON value so both displays serialize the same bytes.

export type Note = {
  id: string
  /** Creation time, ISO. */
  when: string
  /** Last edit, ISO; notes written before this field existed fall back to `when`. */
  edited?: string
  /** Folder id; unset means the built-in "Notes" folder. */
  folder?: string
  pinned?: boolean
  locked?: boolean
  /** When the note entered Recently Deleted, ISO. Deleted rows keep the doc for 30 days. */
  deleted?: string
  /** Cached first-line text and #tags, kept on the index so sort and the tag strip never read a doc. */
  title?: string
  tags?: string[]
}

export type Folder = { id: string; name: string }

/** Paragraph styles the Aa menu offers; `ind` carries list and quote depth. */
export type TextStyle =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'mono'
  | 'quote'
  | 'bullet'
  | 'dash'
  | 'number'
  | 'check'

export type Block =
  | { id: string; s: TextStyle; t: string; ind?: number; done?: boolean }
  | { id: string; s: 'table'; rows: string[][] }
  | { id: string; s: 'image'; img: string }

export type Doc = { v: 2; blocks: Block[] }

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A blank document: the first line is Title, the way a fresh note starts. */
export const fresh = (): Doc => ({ v: 2, blocks: [{ id: uid(), s: 'title', t: '' }] })

export const serialize = (doc: Doc) => JSON.stringify(doc)

const normalizeBlock = (b: unknown): Block | undefined => {
  if (typeof b !== 'object' || b === null) return undefined
  const block = b as Record<string, unknown>
  const id = typeof block.id === 'string' ? block.id : uid()
  if (block.s === 'table' && Array.isArray(block.rows)) {
    const rows = (block.rows as unknown[][])
      .filter(Array.isArray)
      .map((row) => row.map((c) => String(c)))
      .filter((row) => row.length)
    return rows.length
      ? { id, s: 'table', rows }
      : {
          id,
          s: 'table',
          rows: [
            ['', ''],
            ['', '']
          ]
        }
  }
  if (block.s === 'image' && typeof block.img === 'string') return { id, s: 'image', img: block.img }
  const s = typeof block.s === 'string' ? block.s : 'body'
  const style: TextStyle = (
    ['title', 'heading', 'subheading', 'body', 'mono', 'quote', 'bullet', 'dash', 'number', 'check'] as const
  ).includes(s as TextStyle)
    ? (s as TextStyle)
    : 'body'
  return {
    id,
    s: style,
    t: typeof block.t === 'string' ? block.t : '',
    ...(typeof block.ind === 'number' && block.ind > 0 ? { ind: Math.min(4, Math.round(block.ind)) } : {}),
    ...(block.done === true ? { done: true } : {})
  }
}

/**
 * The stored value into a document. A v1 note held plain text: its lines become
 * blocks, the first in Title style since it always led the list row.
 */
export const parse = (raw: string | undefined): Doc => {
  if (raw) {
    try {
      const doc = JSON.parse(raw) as Doc
      if (doc && doc.v === 2 && Array.isArray(doc.blocks)) {
        const blocks = doc.blocks.map(normalizeBlock).filter((b): b is Block => !!b)
        if (blocks.length) return { v: 2, blocks }
      }
    } catch {
      // Plain text: fall through to the line migration.
    }
    if (!raw.startsWith('{'))
      return { v: 2, blocks: raw.split('\n').map((t, i) => ({ id: uid(), s: i === 0 ? 'title' : 'body', t: esc(t) })) }
  }
  return fresh()
}

// ---------- reading a document without a DOM ----------

const STRIP = /<[^>]*>/g
/** Inline HTML to flat text for previews, search and tags. */
export const plain = (html: string) =>
  html
    .replace(STRIP, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, '')
    .trim()

/** The text lines a block contributes to a list preview. */
const lines = (b: Block): string[] => {
  if (b.s === 'table') return b.rows.map((row) => row.map(plain).filter(Boolean).join('  ')).filter(Boolean)
  if (b.s === 'image') return []
  const t = plain(b.t)
  return t ? [t] : []
}

export const textOf = (doc: Doc) => doc.blocks.flatMap(lines).join('\n')

/** First non-empty line leads the row, like the real list's bold line. */
export const titleOf = (doc: Doc) => {
  for (const b of doc.blocks) {
    const t = lines(b)[0]
    if (t) return t
  }
  return ''
}

/** Everything after the title's own block, squashed to one preview line. */
export const previewOf = (doc: Doc) => {
  const rest: string[] = []
  let past = false
  for (const b of doc.blocks) {
    const own = lines(b)
    for (const t of own) {
      if (!past) {
        past = true
        continue
      }
      rest.push(t)
    }
  }
  return rest.join(' ').trim()
}

export const hasAttachment = (doc: Doc) => doc.blocks.some((b) => b.s === 'table' || b.s === 'image')

const TAG = /#([\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu
/** The #tags typed anywhere in a document, lowercase, each once. */
export const tagsOf = (doc: Doc) => {
  const found = new Set<string>()
  for (const b of doc.blocks) {
    if (b.s === 'image') continue
    const source = b.s === 'table' ? b.rows.flat().map(plain).join(' ') : plain(b.t)
    for (const m of source.matchAll(TAG)) found.add(m[1]!.toLowerCase())
  }
  return [...found]
}

// ---------- list stamps, groups and sorting ----------

/** The line under the toolbar in the real editor: "September 18, 2026 at 3:38 PM". */
export const longStamp = (note: Note) => {
  const d = new Date(note.edited ?? note.when)
  return `${d.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}`
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** Today's notes show a time, older ones a date, like the real list. */
export const stamp = (note: Note) => {
  const d = new Date(note.edited ?? note.when)
  return sameDay(d, new Date())
    ? d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

/** Section header a note files under: Today, Yesterday, then the month. */
export const groupOf = (note: Note) => {
  const d = new Date(note.edited ?? note.when)
  const now = new Date()
  if (sameDay(d, now)) return 'Today'
  if (sameDay(d, new Date(now.getTime() - 864e5))) return 'Yesterday'
  return d.toLocaleDateString('en', {
    month: 'long',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  })
}

export const group = (notes: Note[]) =>
  [...new Set(notes.map(groupOf))].map((name) => ({ name, notes: notes.filter((n) => groupOf(n) === name) }))

/** Recently Deleted keeps a note 30 days before it is gone for good. */
export const daysLeft = (note: Note) =>
  Math.max(0, Math.ceil(30 - (Date.now() - new Date(note.deleted ?? 0).getTime()) / 864e5))

export const groupDeleted = (notes: Note[]) =>
  [...new Set(notes.map(daysLeft))].map((days) => ({
    name: `${days} ${days === 1 ? 'Day' : 'Days'}`,
    days,
    notes: notes.filter((n) => daysLeft(n) === days)
  }))

/** Recovering keeps the note's folder only when that folder still exists. */
export const recovered = (note: Note, folders: Folder[]): Note => ({
  ...note,
  deleted: undefined,
  folder: folders.some((f) => f.id === note.folder) ? note.folder : undefined
})

export type Sort = 'edited' | 'created' | 'title'
export const SORTS: [Sort, string][] = [
  ['edited', 'Date Edited'],
  ['created', 'Date Created'],
  ['title', 'Title']
]

/** The list order under a sort pref; pinned notes keep their own section either way. */
export const sorted = (notes: Note[], sort: Sort) => {
  const by: Record<Sort, (a: Note, b: Note) => number> = {
    edited: (a, b) => (b.edited ?? b.when).localeCompare(a.edited ?? a.when),
    created: (a, b) => b.when.localeCompare(a.when),
    title: (a, b) => (a.title || 'New Note').localeCompare(b.title || 'New Note', 'en', { sensitivity: 'base' })
  }
  return [...notes].sort(by[sort])
}
