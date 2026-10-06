// Color Lab's domain layer: sRGB colour values, text parsing for the code
// field, HSL conversion, harmony and variation generators, the WCAG 2.x
// relative-luminance contrast math, and the wire models shared between the
// two displays and persisted through os.storage. No DOM, no React - every
// function is pure so the tests can run it headless.

export type Rgb = { r: number; g: number; b: number }
export type Hsl = { h: number; s: number; l: number }

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Hue is circular: -30 wraps to 330, 390 to 30. */
export const wrapHue = (h: number) => ((h % 360) + 360) % 360

export const rgb = (r: number, g: number, b: number): Rgb => ({
  r: clamp(Math.round(r), 0, 255),
  g: clamp(Math.round(g), 0, 255),
  b: clamp(Math.round(b), 0, 255)
})
export const hsl = (h: number, s: number, l: number): Hsl => ({
  h: wrapHue(h),
  s: clamp(s, 0, 1),
  l: clamp(l, 0, 1)
})

export const BLACK: Rgb = { r: 0, g: 0, b: 0 }
export const WHITE: Rgb = { r: 255, g: 255, b: 255 }

export const rgbEq = (a: Rgb, b: Rgb) => a.r === b.r && a.g === b.g && a.b === b.b

/** Standard HSL to sRGB: chroma at L, hue sectors of 60 degrees. */
export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = wrapHue(h) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return rgb((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60
  return hsl(h, s, l)
}

const HEX = /^[0-9a-f]{3,8}$/i
const NUMBER = /^[-+]?\d*\.?\d+$/

/**
 * The code field's parser. Accepts `#abc`, `#aabbcc`, 4/8-digit alpha forms,
 * the same without the `#`, `rgb()`/`rgba()` with comma or space separators,
 * percent channels, and `hsl()`/`hsla()` in comma or space syntax with an
 * optional `/alpha`. Alpha is parsed and dropped: a swatch is always the
 * solid colour underneath, which is also what WCAG ratios are defined on.
 */
export function parseColor(text: string): Rgb | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const bare = t.startsWith('#') ? t.slice(1) : t
  if (HEX.test(bare)) {
    const v = bare.length <= 4 ? [...bare].map((c) => c + c).join('') : bare
    if (v.length !== 6 && v.length !== 8) return null
    const n = Number.parseInt(v.slice(0, 6), 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const fn = /^(rgba?|hsla?)\((.*)\)$/s.exec(t)
  if (!fn) return null
  const kind = fn[1]!.startsWith('rgb') ? 'rgb' : 'hsl'
  const parts = fn[2]!.replace(/\//g, ' ').replace(/,/g, ' ').trim().split(/\s+/)
  // An alpha part is the one extra value after the three channels.
  if (parts.length !== 3 && parts.length !== 4) return null
  const chan = parts.slice(0, 3)
  if (kind === 'rgb') {
    const vals = chan.map((p) => {
      if (p.endsWith('%')) {
        const n = Number.parseFloat(p.slice(0, -1))
        return Number.isFinite(n) ? (n / 100) * 255 : Number.NaN
      }
      return NUMBER.test(p) ? Number.parseFloat(p) : Number.NaN
    })
    if (vals.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null
    return rgb(vals[0]!, vals[1]!, vals[2]!)
  }
  const hueRaw = chan[0]!
  let h = Number.NaN
  // 'grad' must be matched before 'rad': every grad string also ends with 'rad'.
  if (hueRaw.endsWith('turn')) h = Number.parseFloat(hueRaw) * 360
  else if (hueRaw.endsWith('grad')) h = Number.parseFloat(hueRaw) * 0.9
  else if (hueRaw.endsWith('rad')) h = Number.parseFloat(hueRaw) * (180 / Math.PI)
  else h = Number.parseFloat(hueRaw.replace(/deg$/, ''))
  const sl = chan.slice(1).map((p) => {
    const n = p.endsWith('%') ? Number.parseFloat(p.slice(0, -1)) : Number.parseFloat(p)
    return Number.isFinite(n) ? n / 100 : Number.NaN
  })
  if (!Number.isFinite(h) || sl.some((v) => !Number.isFinite(v))) return null
  return hslToRgb({ h, s: clamp(sl[0]!, 0, 1), l: clamp(sl[1]!, 0, 1) })
}

const byte = (v: number) => v.toString(16).padStart(2, '0')
/** `#rrggbb`, built at runtime so no fixed colour literal enters the app. */
export const toHex = ({ r, g, b }: Rgb) => `#${byte(r)}${byte(g)}${byte(b)}`
/** The short form when every channel is a doubled digit. */
export const toHexShort = (c: Rgb) => {
  const h = toHex(c)
  return h[1] === h[2] && h[3] === h[4] && h[5] === h[6] ? `#${h[1]}${h[3]}${h[5]}` : h
}
export const toRgbString = ({ r, g, b }: Rgb) => `rgb(${r}, ${g}, ${b})`
export const toHslString = ({ h, s, l }: Hsl) =>
  `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
/** A CSS `hsl()` for painting: same colour as toHex, kept as hue for tracks. */
export const hslCss = ({ h, s, l }: Hsl) =>
  `hsl(${Math.round(h * 10) / 10} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%)`
export const rgbCss = ({ r, g, b }: Rgb) => `rgb(${r} ${g} ${b})`

// ---- WCAG 2.x contrast ----

const lin = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
/** WCAG relative luminance of an sRGB colour, 0 (black) to 1 (white). */
export const luminance = (c: Rgb) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
/** WCAG contrast ratio, 1 to 21, orientation-free. */
export const contrast = (a: Rgb, b: Rgb) => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export type Verdict = { aaLarge: boolean; aa: boolean; aaaLarge: boolean; aaa: boolean }
/** The honest four thresholds: AA large 3:1, AA normal 4.5:1, AAA large 4.5:1, AAA normal 7:1. */
export const verdict = (ratio: number): Verdict => ({
  aaLarge: ratio >= 3,
  aa: ratio >= 4.5,
  aaaLarge: ratio >= 4.5,
  aaa: ratio >= 7
})
/** Ink that reads on an arbitrary swatch: whichever of black/white wins contrast. */
export const inkFor = (bg: Rgb) => (contrast(WHITE, bg) >= contrast(BLACK, bg) ? WHITE : BLACK)

// ---- Harmonies and variations ----

export type HarmonyKind = 'complementary' | 'analogous' | 'triadic' | 'split' | 'tetradic'
export const HARMONY_KINDS: readonly HarmonyKind[] = ['complementary', 'analogous', 'triadic', 'split', 'tetradic']
export const HARMONY_LABEL: Record<HarmonyKind, string> = {
  complementary: 'Complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
  split: 'Split comp',
  tetradic: 'Tetradic'
}
export const harmonyHues = (h: number, kind: HarmonyKind): number[] =>
  (kind === 'complementary'
    ? [h, h + 180]
    : kind === 'analogous'
      ? [h - 30, h, h + 30]
      : kind === 'triadic'
        ? [h, h + 120, h + 240]
        : kind === 'split'
          ? [h + 150, h, h + 210]
          : [h, h + 90, h + 180, h + 270]
  ).map(wrapHue)
/** The working strip for a colour: base first for a wheel harmony. */
export const harmonyColors = (base: Hsl, kind: HarmonyKind): Hsl[] =>
  harmonyHues(base.h, kind).map((h) => ({ ...base, h: wrapHue(h) }))

export const VARIATION_STEPS = 8
/** Tints through the base down to shades: a lightness ladder at fixed hue and saturation. */
export const variations = (base: Hsl, steps = VARIATION_STEPS): Hsl[] => {
  const lo = 0.08
  const hi = 0.92
  return Array.from({ length: steps }, (_, i) => ({ ...base, l: hi - ((hi - lo) * i) / (steps - 1) }))
}

/** The contrast picker's candidates: current, anchors, harmony and ladder, deduped. */
export const pairChoices = (doc: Doc): Rgb[] => {
  const base = rgbToHsl(doc.color)
  const all = [
    doc.color,
    WHITE,
    BLACK,
    ...harmonyColors(base, doc.harmony).map(hslToRgb),
    ...variations(base).map(hslToRgb)
  ]
  const seen = new Set<string>()
  return all.filter((c) => {
    const k = toHex(c)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ---- The working document ----

export interface Pair {
  fg: Rgb
  bg: Rgb
}
/** The undoable core: the colour, its harmony and the inspected pair. */
export interface Core {
  color: Rgb
  harmony: HarmonyKind
  pair: Pair
}
export interface Doc extends Core {
  v: 1
  undo: Core[]
  redo: Core[]
}

export const UNDO_LIMIT = 32
/** A blue tuned to read against both themes on first launch. */
export const SEED_COLOR: Hsl = { h: 216, s: 0.85, l: 0.58 }

export const coreOf = (doc: Core): Core => ({ color: doc.color, harmony: doc.harmony, pair: doc.pair })
export const coreEq = (a: Core, b: Core) =>
  a.harmony === b.harmony && rgbEq(a.color, b.color) && rgbEq(a.pair.fg, b.pair.fg) && rgbEq(a.pair.bg, b.pair.bg)

export function newDoc(color: Rgb): Doc {
  return { v: 1, color, harmony: 'complementary', pair: { fg: color, bg: WHITE }, undo: [], redo: [] }
}

/** One commit path for an editor change: pushes the old core on undo, clears redo. */
export function withCore(doc: Doc, next: Partial<Core>): Doc {
  const merged: Core = {
    color: next.color ?? doc.color,
    harmony: next.harmony ?? doc.harmony,
    pair: next.pair ?? doc.pair
  }
  if (coreEq(coreOf(doc), merged)) return doc
  return { ...merged, v: 1, undo: [...doc.undo.slice(-(UNDO_LIMIT - 1)), coreOf(doc)], redo: [] }
}
export function undoDoc(doc: Doc): Doc {
  const prev = doc.undo.at(-1)
  if (!prev) return doc
  return { ...prev, v: 1, undo: doc.undo.slice(0, -1), redo: [...doc.redo, coreOf(doc)] }
}
export function redoDoc(doc: Doc): Doc {
  const next = doc.redo.at(-1)
  if (!next) return doc
  return { ...next, v: 1, undo: [...doc.undo, coreOf(doc)], redo: doc.redo.slice(0, -1) }
}

// ---- Saved palettes ----

export interface SavedPalette {
  id: string
  name: string
  colors: Rgb[]
  updatedAt: number
}
export const MAX_PALETTE_NAME = 40
export const MAX_PALETTES = 24
export const MAX_SWATCHES = 8

export const newPalette = (name: string, colors: Rgb[]): SavedPalette => ({
  id: crypto.randomUUID(),
  name: name.trim().slice(0, MAX_PALETTE_NAME) || 'Untitled palette',
  colors: colors.slice(0, MAX_SWATCHES),
  updatedAt: Date.now()
})
export const upsertPalette = (items: SavedPalette[], p: SavedPalette): SavedPalette[] =>
  [p, ...items.filter((i) => i.id !== p.id)].slice(0, MAX_PALETTES)
export const renamePalette = (items: SavedPalette[], id: string, name: string): SavedPalette[] =>
  items.map((i) =>
    i.id === id ? { ...i, name: name.trim().slice(0, MAX_PALETTE_NAME) || i.name, updatedAt: Date.now() } : i
  )
export const removePalette = (items: SavedPalette[], id: string): SavedPalette[] => items.filter((i) => i.id !== id)
/** The export text for one palette or strip: one `name: hex` line per colour. */
export const exportCodes = (colors: Rgb[], names?: string[]) =>
  colors.map((c, i) => `${names?.[i] ?? `Colour ${i + 1}`}: ${toHex(c)}`).join('\n')

// ---- Wire parsing and serialization ----

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isByte = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255
export const parseRgb = (v: unknown): Rgb | null =>
  isObj(v) && isByte(v.r) && isByte(v.g) && isByte(v.b) ? { r: v.r, g: v.g, b: v.b } : null
const parseCore = (v: unknown): Core | null => {
  if (!isObj(v)) return null
  const color = parseRgb(v.color)
  const harmony =
    typeof v.harmony === 'string' && (HARMONY_KINDS as readonly string[]).includes(v.harmony)
      ? (v.harmony as HarmonyKind)
      : null
  const pair = isObj(v.pair) ? { fg: parseRgb(v.pair.fg), bg: parseRgb(v.pair.bg) } : null
  if (!color || !harmony || !pair?.fg || !pair.bg) return null
  return { color, harmony, pair: { fg: pair.fg, bg: pair.bg } }
}
export function parseDoc(raw: unknown): Doc | null {
  if (!isObj(raw) || raw.v !== 1) return null
  const core = parseCore(raw)
  if (!core) return null
  const undo = Array.isArray(raw.undo)
    ? raw.undo
        .map(parseCore)
        .filter((c): c is Core => c !== null)
        .slice(-UNDO_LIMIT)
    : []
  const redo = Array.isArray(raw.redo)
    ? raw.redo
        .map(parseCore)
        .filter((c): c is Core => c !== null)
        .slice(-UNDO_LIMIT)
    : []
  return { ...core, v: 1, undo, redo }
}
export const serializeDoc = (doc: Doc) => JSON.stringify(doc)
/** Storage and session values travel as JSON strings; both entry points accept either. */
export const parseDocJson = (raw: string | null) => {
  if (!raw) return null
  try {
    return parseDoc(JSON.parse(raw))
  } catch {
    return null
  }
}

export interface SavedLibrary {
  v: 1
  items: SavedPalette[]
}
export function parsePalettes(raw: string | null): SavedPalette[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v) || !Array.isArray(v.items)) return []
    return v.items
      .filter(
        (i): i is SavedPalette =>
          isObj(i) &&
          typeof i.id === 'string' &&
          typeof i.name === 'string' &&
          Array.isArray(i.colors) &&
          i.colors.every((c) => parseRgb(c)) &&
          typeof i.updatedAt === 'number'
      )
      .map((i) => ({ ...i, colors: (i.colors as unknown[]).map((c) => parseRgb(c)!) }))
      .slice(0, MAX_PALETTES)
  } catch {
    return []
  }
}
export const serializePalettes = (items: SavedPalette[]) =>
  JSON.stringify({ v: 1, items: items.slice(0, MAX_PALETTES) } satisfies SavedLibrary)

// ---- The session mirror ----

export type SheetKind = 'save' | 'palette' | 'rename' | 'copy'
export const SHEET_KINDS: readonly SheetKind[] = ['save', 'palette', 'rename', 'copy']
/** View context mirrored across the fold: the code field, open page, sheet and its drafts. */
export interface SharedView {
  field: string
  fieldErr: boolean
  page: boolean
  sheet: SheetKind | null
  nameInput: string
  actionId: string | null
  deleteId: string | null
  copyText: string | null
  muted: boolean
}
export interface SharedState {
  by: string
  doc: Doc
  view: SharedView
}
export const serializeShared = (s: SharedState) => JSON.stringify({ v: 1, ...s })
export function parseShared(raw: string | null): SharedState | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v) || typeof v.by !== 'string') return null
    const doc = parseDoc(v.doc)
    if (!doc) return null
    const w = isObj(v.view) ? v.view : {}
    return {
      by: v.by,
      doc,
      view: {
        field: typeof w.field === 'string' ? w.field.slice(0, 80) : '',
        fieldErr: w.fieldErr === true,
        page: w.page === true,
        sheet:
          typeof w.sheet === 'string' && (SHEET_KINDS as readonly string[]).includes(w.sheet)
            ? (w.sheet as SheetKind)
            : null,
        nameInput: typeof w.nameInput === 'string' ? w.nameInput.slice(0, MAX_PALETTE_NAME) : '',
        actionId: typeof w.actionId === 'string' ? w.actionId : null,
        deleteId: typeof w.deleteId === 'string' ? w.deleteId : null,
        copyText: typeof w.copyText === 'string' ? w.copyText.slice(0, 400) : null,
        muted: w.muted === true
      }
    }
  } catch {
    return null
  }
}
