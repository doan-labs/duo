// Pixel Studio's document model and pure editing logic: the cell buffer,
// palette slots named after UI kit colour tokens, flood fill, diff-based
// undo/redo and the (de)serialization used by the durable draft, the saved
// gallery and the session mirror shared between the two displays.

export const EMPTY = -1
export const CANVAS_SIZES = [16, 32] as const
export type CanvasSize = (typeof CANVAS_SIZES)[number]

/**
 * Every colour a palette slot can hold, by UI kit token name. Pixels store the
 * slot index, never a colour value, so artwork re-themes with the app.
 */
export const TOKEN_SWATCHES = [
  'black',
  'grey6',
  'grey5',
  'grey4',
  'grey3',
  'grey2',
  'grey',
  'white',
  'red',
  'orange',
  'yellow',
  'green',
  'mint',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'pink',
  'brown'
] as const
export type SwatchName = (typeof TOKEN_SWATCHES)[number]
const SWATCH_SET = new Set<string>(TOKEN_SWATCHES)

export const MAX_PALETTE = 16
export const MAX_NAME = 40
export const UNDO_LIMIT = 48

export const DEFAULT_PALETTE: SwatchName[] = [
  'white',
  'black',
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'pink',
  'brown',
  'grey',
  'grey3'
]

export interface PixelDoc {
  v: 1
  id: string
  name: string
  size: CanvasSize
  palette: SwatchName[]
  /** One palette index per pixel, row-major; EMPTY for an unset pixel. */
  cells: number[]
}

export const newDoc = (size: CanvasSize, name: string, id = crypto.randomUUID()): PixelDoc => ({
  v: 1,
  id,
  name,
  size,
  palette: [...DEFAULT_PALETTE],
  cells: Array.from({ length: size * size }, () => EMPTY)
})

/** 'grey3' reads 'Grey 3' beside the swatch and in cell labels. */
export const swatchLabel = (name: string) => name.replace(/(\d+)/, ' $1').replace(/^./, (c) => c.toUpperCase())

/** One cell changed as part of an edit. `from` is what undo restores. */
export interface CellEdit {
  i: number
  from: number
  to: number
}
export type Edit = CellEdit[]

export interface WorkState {
  doc: PixelDoc
  undo: Edit[]
  redo: Edit[]
}

export const newWork = (doc: PixelDoc): WorkState => ({ doc, undo: [], redo: [] })

export const indexAt = (size: number, x: number, y: number) => y * size + x

export function applyEdit(cells: number[], edit: Edit, dir: 'do' | 'undo'): number[] {
  const next = cells.slice()
  for (const c of edit) next[c.i] = dir === 'do' ? c.to : c.from
  return next
}

/** Paint a stroke cell into a dedupe map: repeat visits update `to`, never `from`. */
export function recordStroke(map: Map<number, CellEdit>, cells: number[], i: number, value: number) {
  const prev = map.get(i)
  if (prev) {
    prev.to = value
    if (prev.from === value) map.delete(i)
    return
  }
  const from = cells[i]
  if (from !== undefined && from !== value) map.set(i, { i, from, to: value })
}

/** Flood fill from `start` over the contiguous same-colour region. Bounded to the canvas. */
export function floodFill(cells: number[], size: number, start: number, value: number): Edit {
  const from = cells[start]
  if (from === undefined || from === value) return []
  const edit: Edit = []
  const seen = new Uint8Array(cells.length)
  seen[start] = 1
  const queue = [start]
  while (queue.length) {
    const i = queue.pop()!
    if (cells[i] !== from) continue
    edit.push({ i, from, to: value })
    const x = i % size
    if (x > 0 && !seen[i - 1]) {
      seen[i - 1] = 1
      queue.push(i - 1)
    }
    if (x < size - 1 && !seen[i + 1]) {
      seen[i + 1] = 1
      queue.push(i + 1)
    }
    if (i >= size && !seen[i - size]) {
      seen[i - size] = 1
      queue.push(i - size)
    }
    if (i < cells.length - size && !seen[i + size]) {
      seen[i + size] = 1
      queue.push(i + size)
    }
  }
  return edit
}

/** An edit that empties every painted cell, so Clear is undoable like any stroke. */
export const clearEdit = (cells: number[]): Edit =>
  cells.flatMap((from, i) => (from === EMPTY ? [] : [{ i, from, to: EMPTY }]))

/** Apply an edit onto the document and push it on the undo stack, clearing redo. */
export function withEdit(work: WorkState, edit: Edit): WorkState {
  if (!edit.length) return work
  return {
    doc: { ...work.doc, cells: applyEdit(work.doc.cells, edit, 'do') },
    undo: [...work.undo.slice(-(UNDO_LIMIT - 1)), edit],
    redo: []
  }
}

export function undoWork(work: WorkState): WorkState {
  const edit = work.undo[work.undo.length - 1]
  if (!edit) return work
  return {
    doc: { ...work.doc, cells: applyEdit(work.doc.cells, edit, 'undo') },
    undo: work.undo.slice(0, -1),
    redo: [...work.redo, edit]
  }
}

export function redoWork(work: WorkState): WorkState {
  const edit = work.redo[work.redo.length - 1]
  if (!edit) return work
  return {
    doc: { ...work.doc, cells: applyEdit(work.doc.cells, edit, 'do') },
    undo: [...work.undo, edit],
    redo: work.redo.slice(0, -1)
  }
}

/** Re-slot a palette colour. Cell indexes stay valid because slots keep their order. */
export const setPaletteSlot = (doc: PixelDoc, slot: number, swatch: SwatchName): PixelDoc =>
  slot < 0 || slot >= doc.palette.length ? doc : { ...doc, palette: doc.palette.with(slot, swatch) }

/** Append a colour; a duplicate or a full palette is a no-op. */
export const addPaletteSlot = (doc: PixelDoc, swatch: SwatchName): PixelDoc =>
  doc.palette.length >= MAX_PALETTE || doc.palette.includes(swatch)
    ? doc
    : { ...doc, palette: [...doc.palette, swatch] }

/** Drop a slot; cells that used it empty out and higher indexes shift down. */
export function removePaletteSlot(doc: PixelDoc, slot: number): PixelDoc {
  if (slot < 0 || slot >= doc.palette.length || doc.palette.length <= 1) return doc
  const palette = doc.palette.filter((_, i) => i !== slot)
  const cells = doc.cells.map((c) => (c === slot ? EMPTY : c > slot ? c - 1 : c))
  return { ...doc, palette, cells }
}

export const docValid = (doc: PixelDoc) => {
  const { size, palette, cells } = doc
  return palette.length > 0 && palette.length <= MAX_PALETTE && cells.length === size * size
}

function editValid(raw: unknown, cells: number, palette: number): raw is CellEdit[] {
  return (
    Array.isArray(raw) &&
    raw.every(
      (c) =>
        typeof c === 'object' &&
        c !== null &&
        Number.isInteger((c as CellEdit).i) &&
        (c as CellEdit).i >= 0 &&
        (c as CellEdit).i < cells &&
        Number.isInteger((c as CellEdit).from) &&
        (c as CellEdit).from >= EMPTY &&
        (c as CellEdit).from < palette &&
        Number.isInteger((c as CellEdit).to) &&
        (c as CellEdit).to >= EMPTY &&
        (c as CellEdit).to < palette
    )
  )
}

/** A doc shape check: wrong versions, sizes, palettes or cells are rejected, unknown keys ignored. */
export function parseDoc(raw: unknown): PixelDoc | null {
  if (typeof raw !== 'object' || raw === null) return null
  const doc = raw as PixelDoc
  if (doc.v !== 1) return null
  if (typeof doc.id !== 'string' || !doc.id.length) return null
  if (typeof doc.name !== 'string' || !doc.name.length || doc.name.length > MAX_NAME) return null
  if (!CANVAS_SIZES.includes(doc.size)) return null
  if (!Array.isArray(doc.palette) || !doc.palette.every((s) => SWATCH_SET.has(s))) return null
  if (!docValid(doc)) return null
  if (!doc.cells.every((c) => Number.isInteger(c) && c >= EMPTY && c < doc.palette.length)) return null
  return doc
}

export function parseWork(raw: unknown): WorkState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const work = raw as WorkState
  const doc = parseDoc(work.doc)
  if (!doc) return null
  const palette = doc.palette.length
  const cells = doc.cells.length
  if (
    !Array.isArray(work.undo) ||
    !Array.isArray(work.redo) ||
    !work.undo.every((e) => editValid(e, cells, palette)) ||
    !work.redo.every((e) => editValid(e, cells, palette))
  )
    return null
  return { doc, undo: work.undo, redo: work.redo }
}

/** The working draft: the doc plus which gallery entry it is bound to and a dirty flag. */
export interface DocState {
  work: WorkState
  galleryId: string | null
  dirty: boolean
}

export const newDocState = (size: CanvasSize, name: string): DocState => ({
  work: newWork(newDoc(size, name)),
  galleryId: null,
  dirty: false
})

export function parseDocState(raw: unknown): DocState | null {
  if (typeof raw === 'string') raw = safeParse(raw)
  if (typeof raw !== 'object' || raw === null) return null
  const state = raw as DocState
  const work = parseWork(state.work)
  if (!work) return null
  if (state.galleryId !== null && typeof state.galleryId !== 'string') return null
  if (typeof state.dirty !== 'boolean') return null
  return { work, galleryId: state.galleryId, dirty: state.dirty }
}

export const serializeDocState = (state: DocState) => JSON.stringify(state)

/** The session mirror payload: the draft plus which display copy wrote it. */
export interface SharedState extends DocState {
  by: string
}

export function parseShared(raw: unknown): SharedState | null {
  const shared = typeof raw === 'string' ? safeParse(raw) : raw
  if (typeof shared !== 'object' || shared === null) return null
  const { by, ...state } = shared as SharedState
  if (typeof by !== 'string' || !by.length) return null
  return parseDocState(state) ? (shared as SharedState) : null
}

export const serializeShared = (state: SharedState) => JSON.stringify(state)

/** One named creation kept in the durable gallery. */
export interface GalleryItem {
  id: string
  updatedAt: number
  doc: PixelDoc
}

/** Gallery storage tolerates a corrupt entry by dropping it, not the whole shelf. */
export function parseGallery(raw: unknown): GalleryItem[] {
  const list = typeof raw === 'string' ? safeParse(raw) : raw
  if (typeof list !== 'object' || list === null || (list as { v?: number }).v !== 1) return []
  const items = (list as { items?: unknown }).items
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const { id, updatedAt, doc } = item as GalleryItem
    if (typeof id !== 'string' || !id.length || !Number.isFinite(updatedAt)) return []
    return parseDoc(doc) ? [{ id, updatedAt, doc }] : []
  })
}

export const serializeGallery = (items: GalleryItem[]) => JSON.stringify({ v: 1, items })

export const upsertGallery = (items: GalleryItem[], doc: PixelDoc, at = Date.now()): GalleryItem[] => {
  const item = { id: doc.id, updatedAt: at, doc }
  return items.some((i) => i.id === doc.id) ? items.map((i) => (i.id === doc.id ? item : i)) : [...items, item]
}

const safeParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
