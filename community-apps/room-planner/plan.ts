// The document model: one rectangular room in centimetres plus the furniture
// placed in it. Items are axis-aligned rectangles rotated in quarter turns, so
// every bounds/containment/overlap question reduces to integer-ish box math.
// Everything here is pure: the UI commits snapshots, storage validates them.

export type Units = 'metric' | 'imperial'
export type View = { x: number; y: number; zoom: number; framed?: boolean }
export type Room = { w: number; d: number }
export type Item = {
  id: string
  kind: string
  /** Centre of the footprint, in room coordinates (cm). */
  x: number
  y: number
  /** Quarter turns clockwise: 0, 90, 180 or 270 degrees. */
  rot: 0 | 1 | 2 | 3
}
export type PlanDoc = {
  id: string
  name: string
  room: Room
  items: Record<string, Item>
  view: View
  /** Incarnation stamp, fixed at creation and carried untouched by edits.
   * Two docs sharing an id but born apart are different layouts: a delete
   * tombstone kills the incarnation it saw, never a recreation. */
  born: number
  /** Last-writer-wins clock for picking the newest layout in a library. */
  updated: number
}
export type Library = {
  /** Monotonic write counter: two copies compare whose write landed last. */
  rev: number
  plans: Record<string, PlanDoc>
  /** Delete tombstones keyed by plan id. `ts` orders deletions against each
   * other and stale writes; `born` names the killed incarnation: every doc
   * stamped at or before it is dead forever, while a recreation born later
   * legitimately survives the tomb. Version stamps cannot express this - a
   * ghost re-publish always looks 'newer' than the tomb it outlived. */
  gone: Record<string, Tomb>
}
/** One deletion: the write stamp plus the incarnation bound it kills. */
export type Tomb = { ts: number; born: number }

export type Prefs = { units: Units; snap: number; muted: boolean }
export type Mirror = { by: string; at: number; sel: string | null; doc: PlanDoc }

export type Piece = { kind: string; name: string; w: number; d: number; hue: number }
/** The furniture palette: footprint in cm, hue index into the style palette. */
export const CATALOG: readonly Piece[] = [
  { kind: 'sofa', name: 'Sofa', w: 220, d: 95, hue: 0 },
  { kind: 'loveseat', name: 'Loveseat', w: 160, d: 95, hue: 0 },
  { kind: 'armchair', name: 'Armchair', w: 95, d: 90, hue: 0 },
  { kind: 'coffee', name: 'Coffee table', w: 120, d: 60, hue: 1 },
  { kind: 'side', name: 'Side table', w: 55, d: 55, hue: 1 },
  { kind: 'dining', name: 'Dining table', w: 180, d: 90, hue: 2 },
  { kind: 'chair', name: 'Chair', w: 45, d: 48, hue: 2 },
  { kind: 'desk', name: 'Desk', w: 140, d: 70, hue: 3 },
  { kind: 'task', name: 'Task chair', w: 62, d: 62, hue: 3 },
  { kind: 'bed', name: 'Queen bed', w: 160, d: 200, hue: 4 },
  { kind: 'night', name: 'Nightstand', w: 45, d: 40, hue: 4 },
  { kind: 'shelf', name: 'Bookshelf', w: 100, d: 35, hue: 5 },
  { kind: 'tv', name: 'TV stand', w: 160, d: 45, hue: 5 },
  { kind: 'lamp', name: 'Floor lamp', w: 38, d: 38, hue: 6 },
  { kind: 'plant', name: 'Plant', w: 34, d: 34, hue: 6 },
  { kind: 'rug', name: 'Rug', w: 200, d: 140, hue: 7 }
]
export const PIECE = new Map(CATALOG.map((p) => [p.kind, p]))

export const ROOM_MIN = 120
export const ROOM_MAX = 3000
export const ITEM_LIMIT = 80
export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 4
export const HISTORY_LIMIT = 60
const NAME_LIMIT = 48

/** Snap steps offered per unit system, stored in cm so rounding stays exact. */
export const SNAP_METRIC = [0, 5, 10, 25, 50]
export const SNAP_IMPERIAL = [0, 2.54, 15.24, 30.48, 60.96]
export const snapSteps = (units: Units) => (units === 'metric' ? SNAP_METRIC : SNAP_IMPERIAL)

export const CM_PER_IN = 2.54

const spawn = () => crypto.randomUUID().slice(0, 8)
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const normRot = (v: unknown): 0 | 1 | 2 | 3 => (((Math.round(num(v, 0)) % 4) + 4) % 4) as 0 | 1 | 2 | 3

// --- footprints, bounds and flags -------------------------------------------

/** Footprint after rotation: odd quarter turns swap width and depth. */
export function itemSize(item: Pick<Item, 'kind' | 'rot'>): { w: number; d: number } {
  const piece = PIECE.get(item.kind) ?? { w: 60, d: 60 }
  return item.rot % 2 === 0 ? { w: piece.w, d: piece.d } : { w: piece.d, d: piece.w }
}

export type Rect = { x0: number; y0: number; x1: number; y1: number }
export function itemRect(item: Item): Rect {
  const { w, d } = itemSize(item)
  return { x0: item.x - w / 2, y0: item.y - d / 2, x1: item.x + w / 2, y1: item.y + d / 2 }
}

/** A rect counts as inside only when no edge leaves the room past a 1mm epsilon. */
export function rectInRoom(room: Room, r: Rect): boolean {
  return r.x0 >= -0.1 && r.y0 >= -0.1 && r.x1 <= room.w + 0.1 && r.y1 <= room.d + 0.1
}

/** Interior overlap: touching edges are fine, a shared face is not. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.2 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.2
}

/** Floor coverings are a surface, not an obstacle: a rug belongs under furniture. */
const EXEMPT_KINDS = new Set(['rug'])

export type Issues = { out: string[]; hits: string[] }
/** Flags the planner surfaces: items breaching a wall and pairs colliding. */
export function planIssues(doc: Pick<PlanDoc, 'room' | 'items'>): Issues {
  const out: string[] = []
  const hits = new Set<string>()
  const all = Object.values(doc.items)
  const solid = all.filter((item) => !EXEMPT_KINDS.has(item.kind))
  const rects = new Map(all.map((item) => [item.id, itemRect(item)] as const))
  for (const item of all) if (!rectInRoom(doc.room, rects.get(item.id)!)) out.push(item.id)
  for (let i = 0; i < solid.length; i++)
    for (let j = i + 1; j < solid.length; j++)
      if (rectsOverlap(rects.get(solid[i]!.id)!, rects.get(solid[j]!.id)!)) {
        hits.add(solid[i]!.id)
        hits.add(solid[j]!.id)
      }
  return { out, hits: [...hits] }
}

/** Gap between an item edge and the room edge on each side, cm; may be negative. */
export function wallGaps(room: Room, item: Item): { l: number; t: number; r: number; b: number } {
  const r = itemRect(item)
  return { l: r.x0, t: r.y0, r: room.w - r.x1, b: room.d - r.y1 }
}

// --- units -------------------------------------------------------------------

/** Display length: metric prefers cm under 2 m, imperial prefers inches under 2 ft. */
export function fmtLength(cm: number, units: Units): string {
  if (units === 'metric') {
    if (Math.abs(cm) < 195) return `${Math.round(cm)} cm`
    return `${(cm / 100).toFixed(2).replace(/\.?0+$/, '')} m`
  }
  const inches = cm / CM_PER_IN
  // Round the absolute total first, then split: splitting raw inches leaves a
  // rounded remainder of 12, printing `14 ft 12 in` for what is exactly 15 ft.
  const total = Math.round(Math.abs(inches))
  const sign = inches < 0 ? '-' : ''
  if (total < 24) return total === 12 ? `${sign}1 ft` : `${sign}${total} in`
  const ft = Math.floor(total / 12)
  const rest = total % 12
  return rest === 0 ? `${sign}${ft} ft` : `${sign}${ft} ft ${rest} in`
}

/** Pair of dimensions sharing one unit when both fit furniture scale: `220 × 95 cm`. */
export function fmtDims(w: number, d: number, units: Units): string {
  if (units === 'metric' && Math.abs(w) < 290 && Math.abs(d) < 290) return `${Math.round(w)} × ${Math.round(d)} cm`
  if (units === 'imperial' && Math.abs(w) / CM_PER_IN < 95.5 && Math.abs(d) / CM_PER_IN < 95.5)
    return `${Math.round(w / CM_PER_IN)} × ${Math.round(d / CM_PER_IN)} in`
  return `${fmtLength(w, units)} × ${fmtLength(d, units)}`
}

/** A snap step labelled in its own unit system: `25 cm`, `1 ft`, `Off`. */
export function fmtSnap(stepCm: number, units: Units): string {
  if (stepCm === 0) return 'Off'
  return fmtLength(stepCm, units)
}

/**
 * Parses a dimension typed by the user, forgiving about notation: bare numbers
 * read as the field's home unit (m or ft for a room, cm or in for furniture),
 * and unit suffixes (`m`, `cm`, `mm`, `ft`, `'`, `in`, `"`) switch it. Returns
 * cm, or null when nothing parses.
 */
export function parseLength(text: string, units: Units, scope: 'room' | 'item'): number | null {
  const t = text.trim().toLowerCase().replace(',', '.')
  if (!t) return null
  // Imperial compound forms first: 13'6", 13 ft 6 in, 13ft6in.
  const compound = /^(\d+(?:\.\d+)?|\.\d+)\s*(?:ft|')\s*(\d+(?:\.\d+)?|\.\d+)\s*(?:in|")?$/.exec(t)
  if (compound) return Number(compound[1]) * 12 * CM_PER_IN + Number(compound[2]) * CM_PER_IN
  const single = /^(\d+(?:\.\d+)?|\.\d+)\s*(mm|cm|m|in|ft|'|")?$/.exec(t)
  if (!single) return null
  const value = Number(single[1])
  if (!Number.isFinite(value) || value < 0) return null
  const unit = single[2]
  if (unit === 'mm') return value / 10
  if (unit === 'cm') return value
  if (unit === 'm') return value * 100
  if (unit === 'in' || unit === '"') return value * CM_PER_IN
  if (unit === 'ft' || unit === "'") return value * 12 * CM_PER_IN
  // Bare number: the field's home unit, with the room guess that no room is
  // typed in hundreds - `4.6` reads as metres/feet, `460` as centimetres/inches.
  if (units === 'metric') return scope === 'room' ? (value <= 50 ? value * 100 : value) : value
  return scope === 'room' ? (value <= 50 ? value * 12 * CM_PER_IN : value * CM_PER_IN) : value * CM_PER_IN
}

// --- edits -------------------------------------------------------------------

export const snapTo = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v)

// `updated` doubles as a per-doc version: strictly increasing, so an edit
// landing in the same millisecond as the stored copy still wins the merge.
const touch = (doc: PlanDoc): PlanDoc => ({ ...doc, updated: Math.max(Date.now(), doc.updated + 1) })

export function addItem(doc: PlanDoc, kind: string, x: number, y: number): { doc: PlanDoc; id: string } {
  if (!PIECE.has(kind) || Object.keys(doc.items).length >= ITEM_LIMIT) return { doc, id: '' }
  const piece = PIECE.get(kind)!
  const item: Item = {
    id: spawn(),
    kind,
    x: clamp(Math.round(x), -piece.w, doc.room.w + piece.w),
    y: clamp(Math.round(y), -piece.d, doc.room.d + piece.d),
    rot: 0
  }
  return { doc: touch({ ...doc, items: { ...doc.items, [item.id]: item } }), id: item.id }
}

export function moveItem(doc: PlanDoc, id: string, x: number, y: number, snap: number): PlanDoc {
  const item = doc.items[id]
  if (!item) return doc
  // Snap steps can be fractional (1 in = 2.54 cm); unsnapped drags land on cm.
  const nx = clamp(snap > 0 ? Math.round(snapTo(x, snap) * 100) / 100 : Math.round(x), -300, doc.room.w + 300)
  const ny = clamp(snap > 0 ? Math.round(snapTo(y, snap) * 100) / 100 : Math.round(y), -300, doc.room.d + 300)
  if (nx === item.x && ny === item.y) return doc
  return touch({ ...doc, items: { ...doc.items, [id]: { ...item, x: nx, y: ny } } })
}

export function rotateItem(doc: PlanDoc, id: string, dir: 1 | -1 = 1): PlanDoc {
  const item = doc.items[id]
  if (!item) return doc
  return touch({ ...doc, items: { ...doc.items, [id]: { ...item, rot: normRot(item.rot + dir) } } })
}

export function removeItem(doc: PlanDoc, id: string): PlanDoc {
  if (!doc.items[id]) return doc
  const items = { ...doc.items }
  delete items[id]
  return touch({ ...doc, items })
}

export function clearItems(doc: PlanDoc): PlanDoc {
  return Object.keys(doc.items).length ? touch({ ...doc, items: {} }) : doc
}

export function resizeRoom(doc: PlanDoc, w: number, d: number): PlanDoc {
  const room = { w: clamp(Math.round(w), ROOM_MIN, ROOM_MAX), d: clamp(Math.round(d), ROOM_MIN, ROOM_MAX) }
  if (room.w === doc.room.w && room.d === doc.room.d) return doc
  return touch({ ...doc, room })
}

export function renameDoc(doc: PlanDoc, name: string): PlanDoc {
  const next = name.slice(0, NAME_LIMIT)
  // A whitespace-only name would blank the plan row everywhere; keep the old
  // one instead of committing it. A real rename still touches: the library
  // merge and tombstones order by `updated`, so an untouched rename loses to
  // the stale stored copy and silently reverts on the next reload.
  if (!next.trim()) return doc
  return next === doc.name ? doc : touch({ ...doc, name: next })
}

export function setView(doc: PlanDoc, view: View): PlanDoc {
  return { ...doc, view: cleanView(view) }
}

/** Farthest furniture reach plus the room itself, for a fit that frames both. */
export function docBounds(doc: PlanDoc): { cx: number; cy: number; w: number; h: number } {
  let x0 = 0
  let y0 = 0
  let x1 = doc.room.w
  let y1 = doc.room.d
  for (const item of Object.values(doc.items)) {
    const r = itemRect(item)
    x0 = Math.min(x0, r.x0)
    y0 = Math.min(y0, r.y0)
    x1 = Math.max(x1, r.x1)
    y1 = Math.max(y1, r.y1)
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
}

// --- undo/redo ---------------------------------------------------------------

/** The editable core: undo snapshots capture plan content, never the camera. */
export type Core = { name: string; room: Room; items: Record<string, Item> }
export const coreOf = (doc: PlanDoc): Core => ({ name: doc.name, room: doc.room, items: doc.items })
export const withCore = (doc: PlanDoc, core: Core): PlanDoc =>
  touch({ ...doc, name: core.name, room: core.room, items: core.items })
// Structural, not referential: a remote doc is a fresh wire clone every time,
// so identity compares would log view/selection-only adoptions as edits and
// arm Undo with no-op entries.
export const sameCore = (a: Core, b: Core): boolean => {
  if (a.name !== b.name || a.room.w !== b.room.w || a.room.d !== b.room.d) return false
  const keys = Object.keys(a.items)
  if (keys.length !== Object.keys(b.items).length) return false
  for (const key of keys) {
    const x = a.items[key]
    const y = b.items[key]
    if (!x || !y || x.kind !== y.kind || x.x !== y.x || x.y !== y.y || x.rot !== y.rot) return false
  }
  return true
}

export type History = { past: { core: Core; tag: string | null }[]; future: Core[] }
export const emptyHistory = (): History => ({ past: [], future: [] })

/**
 * Records `prev` before a commit. A tagged run (typing a name, stepping a
 * room field) collapses into one entry holding the oldest snapshot, so undo
 * steps over the whole edit, not per keystroke. Redo dies on a new commit.
 */
export function commitHistory(h: History, prev: Core, next: Core, tag: string | null = null): History {
  if (sameCore(prev, next)) return h
  const last = h.past[h.past.length - 1]
  if (tag && last?.tag === tag) return { past: h.past, future: [] }
  const past = [...h.past, { core: prev, tag }]
  if (past.length > HISTORY_LIMIT) past.shift()
  return { past, future: [] }
}

export function undoHistory(h: History, current: Core): { h: History; core: Core | null } {
  const last = h.past[h.past.length - 1]
  if (!last) return { h, core: null }
  return { h: { past: h.past.slice(0, -1), future: [current, ...h.future].slice(0, HISTORY_LIMIT) }, core: last.core }
}

export function redoHistory(h: History, current: Core): { h: History; core: Core | null } {
  const next = h.future[0]
  if (!next) return { h, core: null }
  const past = [...h.past, { core: current, tag: null }]
  if (past.length > HISTORY_LIMIT) past.shift()
  return { h: { past, future: h.future.slice(1) }, core: next }
}

// --- documents, library, wire shapes ----------------------------------------

function cleanView(v: unknown): View {
  const view = record(v) ? v : {}
  return {
    x: clamp(num(view.x, 0), -40000, 40000),
    y: clamp(num(view.y, 0), -40000, 40000),
    zoom: clamp(num(view.zoom, 1), ZOOM_MIN, ZOOM_MAX),
    ...(view.framed === false ? { framed: false } : {})
  }
}

function cleanItem(id: string, v: unknown): Item | null {
  if (!record(v)) return null
  const kind = typeof v.kind === 'string' && PIECE.has(v.kind) ? v.kind : null
  if (!kind) return null
  return {
    id,
    kind,
    x: clamp(num(v.x, 0), -ROOM_MAX, ROOM_MAX * 2),
    y: clamp(num(v.y, 0), -ROOM_MAX, ROOM_MAX * 2),
    rot: normRot(v.rot)
  }
}

/** Validates a stored or mirrored plan; unknown shapes get defaults. */
export function cleanDoc(v: unknown): PlanDoc | null {
  if (!record(v)) return null
  const rawItems = record(v.items) ? v.items : {}
  const items: Record<string, Item> = {}
  for (const key of Object.keys(rawItems)
    .filter((k) => /^[\w-]+$/.test(k))
    .slice(0, ITEM_LIMIT)) {
    const item = cleanItem(key, rawItems[key])
    if (item) items[key] = item
  }
  const room = record(v.room) ? v.room : {}
  const name = typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, NAME_LIMIT) : 'Untitled layout'
  return {
    id: typeof v.id === 'string' && v.id ? v.id : spawn(),
    name,
    room: {
      w: clamp(num(room.w, 420), ROOM_MIN, ROOM_MAX),
      d: clamp(num(room.d, 340), ROOM_MIN, ROOM_MAX)
    },
    items,
    view: cleanView(v.view),
    // Pre-incarnation rows carry no `born`: their version stamp is the
    // closest creation hint, and a legacy numeric tombstone (born=ts) still
    // outranks it exactly the way the old timestamp compare did.
    born: num(v.born, num(v.updated, 0)),
    updated: num(v.updated, 0)
  }
}

export function parseLibrary(raw: string | null): Library {
  if (!raw) return { rev: 0, plans: {}, gone: {} }
  try {
    const parsed: unknown = JSON.parse(raw)
    const plans: Record<string, PlanDoc> = {}
    const gone: Record<string, Tomb> = {}
    if (record(parsed) && record(parsed.plans)) {
      for (const [id, value] of Object.entries(parsed.plans)) {
        const doc = cleanDoc(value)
        if (doc) plans[id] = doc
      }
      if (record(parsed.gone)) {
        for (const [id, v] of Object.entries(parsed.gone)) {
          if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
            // Legacy tombstone: the delete time doubles as the incarnation
            // bound, killing everything stamped before it.
            gone[id] = { ts: v, born: v }
          } else if (record(v)) {
            const ts = num(v.ts, 0)
            const born = num(v.born, ts)
            if (ts > 0) gone[id] = { ts, born }
          }
        }
      }
    }
    return { rev: record(parsed) ? num(parsed.rev, 0) : 0, plans, gone }
  } catch {
    return { rev: 0, plans: {}, gone: {} }
  }
}

export const serializeLibrary = (lib: Library) => JSON.stringify(lib)

export function parsePrefs(raw: string | null): Prefs {
  const fallback: Prefs = { units: 'metric', snap: 10, muted: false }
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed)) return fallback
    const units: Units = parsed.units === 'imperial' ? 'imperial' : 'metric'
    const snap = clamp(num(parsed.snap, 10), 0, 100)
    return { units, snap, muted: parsed.muted === true }
  } catch {
    return fallback
  }
}

export const serializePrefs = (prefs: Prefs) => JSON.stringify(prefs)

export function parseMirror(raw: string | null): Mirror | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || typeof parsed.by !== 'string') return null
    const doc = cleanDoc(parsed.doc)
    if (!doc) return null
    const sel = typeof parsed.sel === 'string' && doc.items[parsed.sel] ? parsed.sel : null
    // A payload without a stamp falls back to the doc's own version: it is
    // the best ordering hint an older writer could leave.
    return { by: parsed.by, at: num(parsed.at, doc.updated), sel, doc }
  } catch {
    return null
  }
}

export const serializeMirror = (by: string, doc: PlanDoc, sel: string | null, at = Date.now()) =>
  JSON.stringify({ by, at, sel, doc } satisfies Mirror)

// An equal-version fork is a second commit at the same stamp: two copies
// editing one plan in a millisecond both stamp `updated` the same (`touch`
// only orders a single lineage). Only a doc carrying DIFFERENT content at
// that exact stamp binds one past the stored version, so the acknowledged
// write order is strict and the live intent lands as the last commit. A
// same-core doc at the same stamp is an idempotent republish and an older
// doc is a stale re-offer: both place as-is, and mergeLib's strictly-newer
// rule lets the stored winner stand - a frozen snapshot is never promoted
// merely because a current revision was read.
export const withDoc = (lib: Library, doc: PlanDoc): Library => {
  const existing = lib.plans[doc.id]
  const bound =
    existing && doc.updated === existing.updated && !sameCore(coreOf(existing), coreOf(doc))
      ? { ...doc, updated: existing.updated + 1 }
      : doc
  return { ...lib, plans: { ...lib.plans, [doc.id]: bound } }
}

export function withoutDoc(lib: Library, id: string): Library {
  const plans = { ...lib.plans }
  const doc = plans[id]
  delete plans[id]
  const prev = lib.gone[id]
  // The write stamp must outrank every version this doc ever carried,
  // including a monotonic `updated` that ran ahead of the wall clock.
  const ts = Math.max(prev?.ts ?? 0, Date.now(), (doc?.updated ?? 0) + 1)
  // The killed incarnation is the doc's own birth when it is in view; when
  // the doc is out of view (a peer held a newer copy than this read saw) the
  // delete stamp itself is the bound, so anything born before it dies.
  const born = Math.max(prev?.born ?? 0, doc?.born ?? ts)
  return { ...lib, plans, gone: { ...lib.gone, [id]: { ts, born } } }
}

/**
 * Union of two library snapshots. Storage writes are read-modify-write with
 * no cross-copy compare-and-set, so a cover and an inner writing at once can
 * each clobber the other's merge; merging per-plan by `updated` and per-tombstone
 * by timestamp makes the outcome order-independent. A tombstone only beats a
 * plan the same age or older, so a real edit that postdates the delete
 * survives.
 */
export function mergeLib(a: Library, b: Library): Library {
  const plans: Record<string, PlanDoc> = { ...a.plans }
  for (const [id, doc] of Object.entries(b.plans)) {
    const cur = plans[id]
    // Strictly newer only. An equal stamp is either the same doc republished
    // (a no-op either way) or a cross-copy fork - and `a` is always the side
    // closer to ground truth (stored or accumulated), so a union must never
    // promote a frozen snapshot over the acknowledged commit. Equal-version
    // replacement happens only through withDoc's fork binding on a live
    // intent, which is what makes the commit order durable in the first place.
    if (!cur || cur.updated < doc.updated) plans[id] = doc
  }
  const gone: Record<string, Tomb> = { ...a.gone }
  for (const [id, tomb] of Object.entries(b.gone)) {
    const cur = gone[id]
    if (!cur || tomb.born > cur.born || (tomb.born === cur.born && tomb.ts > cur.ts)) gone[id] = tomb
  }
  for (const [id, tomb] of Object.entries(gone)) {
    const doc = plans[id]
    // The tomb kills the incarnation it witnessed: a ghost re-publish of the
    // same creation loses no matter how high it stamps `updated`, while a
    // genuine recreation (born after the tomb) is the one legitimate survivor.
    if (doc && doc.born <= tomb.born) delete plans[id]
  }
  return { rev: Math.max(a.rev, b.rev), plans, gone }
}

/** A same-doc edit grown from a base older than the newest adopted remote
 * write: stamping it back would be an older-over-newer overwrite. */
export const isOlderEdit = (base: PlanDoc, remote: { id: string; updated: number } | null): boolean =>
  !!remote && base.id === remote.id && base.updated < remote.updated

/** The most recently edited layout, or null on a fresh install. */
/** True when this doc belongs to an incarnation the tombstone killed. */
export const isDeadIncarnation = (doc: PlanDoc, gone: Record<string, Tomb>): boolean => {
  const t = gone[doc.id]
  return !!t && doc.born <= t.born
}

export function latestDoc(lib: Library): PlanDoc | null {
  return Object.values(lib.plans).reduce<PlanDoc | null>(
    (best, doc) => (doc.updated > (best?.updated ?? -1) ? doc : best),
    null
  )
}

export function newPlan(name: string, id = spawn()): PlanDoc {
  const now = Date.now()
  return {
    id,
    name,
    room: { w: 420, d: 340 },
    items: {},
    view: { x: 0, y: 0, zoom: 1, framed: false },
    born: now,
    updated: now
  }
}

/**
 * First-run layout: a furnished living room so the planner reads at a glance.
 * The fixed id keeps a two-display seed race to a single document.
 */
export function welcomePlan(): PlanDoc {
  const items: Item[] = [
    { id: 'w-sofa', kind: 'sofa', x: 230, y: 60, rot: 0 },
    { id: 'w-side', kind: 'side', x: 375, y: 60, rot: 0 },
    { id: 'w-rug', kind: 'rug', x: 230, y: 200, rot: 0 },
    { id: 'w-coffee', kind: 'coffee', x: 230, y: 165, rot: 0 },
    { id: 'w-armchair', kind: 'armchair', x: 85, y: 200, rot: 3 },
    { id: 'w-tv', kind: 'tv', x: 230, y: 337, rot: 0 },
    { id: 'w-shelf', kind: 'shelf', x: 425, y: 80, rot: 1 },
    { id: 'w-plant', kind: 'plant', x: 415, y: 300, rot: 0 },
    { id: 'w-lamp', kind: 'lamp', x: 60, y: 60, rot: 0 }
  ]
  const now = Date.now()
  return {
    id: 'welcome',
    name: 'Welcome',
    room: { w: 460, d: 360 },
    items: Object.fromEntries(items.map((item) => [item.id, item])),
    view: { x: 0, y: 0, zoom: 1, framed: false },
    born: now,
    updated: now
  }
}
