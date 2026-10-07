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
// Anchored channel forms: a bare number, a percent, or a hue with an optional
// angle unit. Anything else - extra digits, stray letters, empty slots,
// scientific notation - is rejected rather than silently coerced.
const CHAN_TOKEN = /^[-+]?\d*\.?\d+%?$/
const PCT_TOKEN = /^[-+]?\d*\.?\d+%$/
const HUE_TOKEN = /^[-+]?\d*\.?\d+(?:deg|grad|rad|turn)?$/

/** A parsed code plus the editing state it implies. Alpha is never applied. */
export interface ParsedColor {
  color: Rgb
  hsl: Hsl
  droppedAlpha: boolean
}

const alphaValue = (token: string | null): number => {
  if (token === null || !CHAN_TOKEN.test(token)) return Number.NaN
  const n = token.endsWith('%') ? Number.parseFloat(token.slice(0, -1)) / 100 : Number.parseFloat(token)
  return Number.isFinite(n) ? n : Number.NaN
}

/**
 * The code field's parser. Accepts `#abc`, `#aabbcc`, 4/8-digit alpha forms,
 * the same without the `#`, `rgb()`/`rgba()` with comma or space separators,
 * percent channels, and `hsl()`/`hsla()` in comma or space syntax with an
 * optional `/alpha` (comma form takes a fourth channel instead). Comma and
 * space forms never mix, alpha needs `/` in space form, and channel counts and
 * token shapes are exact. Alpha is parsed and reported as dropped: a swatch is
 * always the solid colour underneath, which is what WCAG ratios are defined
 * on. The caller discloses the drop; nothing pretends to render transparency.
 */
export function parseColorFull(text: string): ParsedColor | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const bare = t.startsWith('#') ? t.slice(1) : t
  if (HEX.test(bare)) {
    const v = bare.length <= 4 ? [...bare].map((c) => c + c).join('') : bare
    if (v.length !== 6 && v.length !== 8) return null
    const n = Number.parseInt(v.slice(0, 6), 16)
    const color = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    return { color, hsl: rgbToHsl(color), droppedAlpha: v.length === 8 && Number.parseInt(v.slice(6), 16) < 255 }
  }
  const fn = /^(rgba?|hsla?)\((.*)\)$/is.exec(t)
  if (!fn) return null
  const kind = fn[1]!.startsWith('rgb') ? 'rgb' : 'hsl'
  const body = fn[2]!.trim()
  if (!body) return null
  let chan: string[]
  let alphaTok: string | null = null
  if (body.includes(',')) {
    if (body.includes('/')) return null
    const parts = body.split(',').map((p) => p.trim())
    if ((parts.length !== 3 && parts.length !== 4) || parts.some((p) => p === '')) return null
    chan = parts.slice(0, 3)
    alphaTok = parts[3] ?? null
  } else {
    const slash = body.split('/')
    if (slash.length > 2) return null
    chan = slash[0]!.trim().split(/\s+/)
    if (chan.length !== 3 || chan.some((p) => p === '')) return null
    if (slash.length === 2) {
      const a = slash[1]!.trim()
      if (!a || /[\s,]/.test(a)) return null
      alphaTok = a
    }
  }
  const alpha = alphaValue(alphaTok)
  if (alphaTok !== null && !Number.isFinite(alpha)) return null
  const droppedAlpha = Number.isFinite(alpha) && alpha < 1
  if (kind === 'rgb') {
    const vals = chan.map((p) => {
      if (!CHAN_TOKEN.test(p)) return Number.NaN
      return p.endsWith('%') ? (Number.parseFloat(p.slice(0, -1)) / 100) * 255 : Number.parseFloat(p)
    })
    if (vals.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null
    const color = rgb(vals[0]!, vals[1]!, vals[2]!)
    return { color, hsl: rgbToHsl(color), droppedAlpha }
  }
  const hueRaw = chan[0]!
  if (!HUE_TOKEN.test(hueRaw)) return null
  let h = Number.NaN
  // 'grad' must be matched before 'rad': every grad string also ends with 'rad'.
  if (hueRaw.endsWith('turn')) h = Number.parseFloat(hueRaw) * 360
  else if (hueRaw.endsWith('grad')) h = Number.parseFloat(hueRaw) * 0.9
  else if (hueRaw.endsWith('rad')) h = Number.parseFloat(hueRaw) * (180 / Math.PI)
  else h = Number.parseFloat(hueRaw.replace(/deg$/, ''))
  // Saturation and lightness are CSS percents; a bare number is rejected.
  if (!PCT_TOKEN.test(chan[1]!) || !PCT_TOKEN.test(chan[2]!)) return null
  const sl = chan.slice(1).map((p) => Number.parseFloat(p.slice(0, -1)) / 100)
  if (!Number.isFinite(h) || sl.some((v) => !Number.isFinite(v))) return null
  const hslv = { h: wrapHue(h), s: clamp(sl[0]!, 0, 1), l: clamp(sl[1]!, 0, 1) }
  return { color: hslToRgb(hslv), hsl: hslv, droppedAlpha }
}

/** Parse a colour code to its solid swatch; see parseColorFull for detail. */
export function parseColor(text: string): Rgb | null {
  return parseColorFull(text)?.color ?? null
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
  const base = doc.hsl
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
/** The undoable core: the colour, its intended HSL, its harmony and the pair. */
export interface Core {
  color: Rgb
  /** The editing intent at full precision: survives rgb() rounding so hue and
   *  saturation are never lost at achromatic or near-black extremes. */
  hsl: Hsl
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

export const coreOf = (doc: Core): Core => ({ color: doc.color, hsl: doc.hsl, harmony: doc.harmony, pair: doc.pair })
/** Hue-aware equality: two cores differ if the intended HSL moved even when
 *  the painted rgb() landed on the same byte triple (keyboard hue steps at
 *  near-black must accumulate, not stick). */
export const hslEq = (a: Hsl, b: Hsl) => {
  const dh = Math.abs(wrapHue(a.h) - wrapHue(b.h))
  return (dh < 1e-6 || dh > 360 - 1e-6) && Math.abs(a.s - b.s) < 1e-6 && Math.abs(a.l - b.l) < 1e-6
}
export const coreEq = (a: Core, b: Core) =>
  a.harmony === b.harmony &&
  rgbEq(a.color, b.color) &&
  hslEq(a.hsl, b.hsl) &&
  rgbEq(a.pair.fg, b.pair.fg) &&
  rgbEq(a.pair.bg, b.pair.bg)

export function newDoc(color: Rgb): Doc {
  return {
    v: 1,
    color,
    hsl: rgbToHsl(color),
    harmony: 'complementary',
    pair: { fg: color, bg: WHITE },
    undo: [],
    redo: []
  }
}

/** One commit path for an editor change: pushes the old core on undo, clears redo. */
export function withCore(doc: Doc, next: Partial<Core>): Doc {
  const merged: Core = {
    color: next.color ?? doc.color,
    // A colour set without an explicit intent derives its HSL; sliders always
    // pass both so the high-precision hue survives quantization.
    hsl: next.hsl ?? (next.color ? rgbToHsl(next.color) : doc.hsl),
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
  /** The harmony that produced the strip, when known, so reopening restores
   *  the palette rather than re-skinning its first colour under the live one. */
  harmony?: HarmonyKind
  updatedAt: number
}
export const MAX_PALETTE_NAME = 40
export const MAX_PALETTES = 24
export const MAX_SWATCHES = 8

export const newPalette = (name: string, colors: Rgb[], harmony?: HarmonyKind): SavedPalette => ({
  id: crypto.randomUUID(),
  name: name.trim().slice(0, MAX_PALETTE_NAME) || 'Untitled palette',
  colors: colors.slice(0, MAX_SWATCHES),
  harmony,
  updatedAt: Date.now()
})
export const upsertPalette = (items: SavedPalette[], p: SavedPalette): SavedPalette[] =>
  [p, ...items.filter((i) => i.id !== p.id)].slice(0, MAX_PALETTES)
export const renamePalette = (items: SavedPalette[], id: string, name: string): SavedPalette[] =>
  items.map((i) =>
    i.id === id ? { ...i, name: name.trim().slice(0, MAX_PALETTE_NAME) || i.name, updatedAt: Date.now() } : i
  )
export const removePalette = (items: SavedPalette[], id: string): SavedPalette[] => items.filter((i) => i.id !== id)
/** The export text for one palette or strip: one unambiguous line that
 *  survives a single-line field - `name: #hex, #hex, ...`. */
export const exportCodes = (colors: Rgb[], name: string) => `${name}: ${colors.map(toHex).join(', ')}`

/** Conservative ratio display: floor, never round up across a WCAG threshold. */
export const ratioFloor = (r: number, digits: number) => {
  const k = 10 ** digits
  return (Math.floor(r * k) / k).toFixed(digits)
}

// ---- Shared palette writes ----

/**
 * One palette mutation as a wire operation. Each op carries its writer's id
 * inside `id` (`writer:seq`) plus a per-writer monotonically increasing `seq`,
 * so settlement is causal, not cosmetic: an op is settled exactly when a
 * foreign publish's watermark `acks[writer]` covers `seq` (or the op echoes
 * back inside the wire's `ops` window). Unsettled ops replay onto the adopted
 * list in seq order and republish, which serializes overlapping writes from
 * both displays through the wire's last-writer-wins register.
 */
export type PalOp =
  | { id: string; seq: number; kind: 'add'; palette: SavedPalette }
  | { id: string; seq: number; kind: 'rename'; target: string; name: string }
  | { id: string; seq: number; kind: 'delete'; target: string }

/** The trailing ops window each publish echoes for fast id settlement. */
export const PAL_OP_WINDOW = 24
/** Bound on one copy's own unacknowledged ops awaiting wire echo. */
export const PAL_PENDING_LIMIT = 128
/** Bound on the per-writer watermark map carried on the wire. */
export const PAL_ACK_LIMIT = 32

export function applyPalOp(items: SavedPalette[], op: PalOp): SavedPalette[] {
  if (op.kind === 'add') return upsertPalette(items, op.palette)
  if (op.kind === 'rename') return renamePalette(items, op.target, op.name)
  return removePalette(items, op.target)
}

/**
 * Fold learned watermarks: `acks` are monotone per writer, so a higher claim
 * always wins. Acks only ever describe ops whose effects the claimant's list
 * already contains, so they can be propagated transitively; the map stays
 * bounded by evicting the lowest watermark of a writer that is not `me`.
 */
export function mergeAcks(into: Record<string, number>, from: Record<string, number> | undefined, me: string) {
  if (!from) return
  for (const [w, s] of Object.entries(from)) {
    if (Number.isInteger(s) && s >= 0 && s > (into[w] ?? 0)) into[w] = s
  }
  const writers = Object.keys(into)
  while (writers.length > PAL_ACK_LIMIT) {
    let worst: string | null = null
    let worstSeq = Number.MAX_SAFE_INTEGER
    for (const w of writers) {
      if (w === me) continue
      if (into[w]! < worstSeq) {
        worstSeq = into[w]!
        worst = w
      }
    }
    if (worst === null) break
    delete into[worst]
    writers.splice(writers.indexOf(worst), 1)
  }
}

export const palListEq = (a: SavedPalette[], b: SavedPalette[]) => serializePalettes(a) === serializePalettes(b)

/**
 * Merge one foreign publish's library into mine: the wire list is adopted
 * wholesale, then each of my ops the publisher has not incorporated replays
 * onto it in seq order. An op stops needing replay exactly when the
 * publisher's watermark for `me` covers its seq or the op echoes inside the
 * wire's `ops` window - never by whether its target exists. `maxAck` is the
 * highest watermark any foreign publish has ever claimed for `me`; the
 * returned `ops` keeps every still-unacked op plus a settled tail one window
 * deep, so a publish that regresses below it still re-replays those writes.
 */
export function mergePalWire(
  shared: { pals: SavedPalette[]; ops?: PalOp[]; acks?: Record<string, number> },
  myOps: PalOp[],
  me: string,
  maxAck: number
): { merged: SavedPalette[]; replayed: PalOp[]; ops: PalOp[]; maxAck: number } {
  const myAck = shared.acks?.[me] ?? 0
  const nextAck = Math.max(myAck, maxAck)
  const seen = new Set((shared.ops ?? []).map((o) => o.id))
  let merged = shared.pals
  const replayed: PalOp[] = []
  for (const op of myOps) {
    if (op.seq <= myAck || seen.has(op.id)) continue
    const next = applyPalOp(merged, op)
    if (palListEq(next, merged)) continue
    merged = next
    replayed.push(op)
  }
  const floor = nextAck - PAL_OP_WINDOW
  return { merged, replayed, ops: myOps.filter((o) => o.seq > floor), maxAck: nextAck }
}

// ---- Wire parsing and serialization ----

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isByte = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255
export const parseRgb = (v: unknown): Rgb | null =>
  isObj(v) && isByte(v.r) && isByte(v.g) && isByte(v.b) ? { r: v.r, g: v.g, b: v.b } : null
export const parseCore = (v: unknown): Core | null => {
  if (!isObj(v)) return null
  const color = parseRgb(v.color)
  const harmony =
    typeof v.harmony === 'string' && (HARMONY_KINDS as readonly string[]).includes(v.harmony)
      ? (v.harmony as HarmonyKind)
      : null
  const pair = isObj(v.pair) ? { fg: parseRgb(v.pair.fg), bg: parseRgb(v.pair.bg) } : null
  if (!color || !harmony || !pair?.fg || !pair.bg) return null
  // Stored intent is only trusted when it still paints the stored colour:
  // authored hue/saturation at achromatic stops quantizes to the same bytes,
  // while a hsl that disagrees with the rgb is a corrupt wire value and is
  // repaired to the colour's own derivation instead of surviving as a lie.
  const intent = parseHsl(v.hsl)
  return {
    color,
    hsl: intent && rgbEq(hslToRgb(intent), color) ? intent : rgbToHsl(color),
    harmony,
    pair: { fg: pair.fg, bg: pair.bg }
  }
}
const parseHsl = (v: unknown): Hsl | null =>
  isObj(v) &&
  typeof v.h === 'number' &&
  Number.isFinite(v.h) &&
  typeof v.s === 'number' &&
  v.s >= 0 &&
  v.s <= 1 &&
  typeof v.l === 'number' &&
  v.l >= 0 &&
  v.l <= 1
    ? { h: wrapHue(v.h), s: v.s, l: v.l }
    : null
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
export function parsePaletteEntry(i: unknown): SavedPalette | null {
  if (
    !isObj(i) ||
    typeof i.id !== 'string' ||
    typeof i.name !== 'string' ||
    !Array.isArray(i.colors) ||
    !i.colors.every((c) => parseRgb(c) !== null) ||
    typeof i.updatedAt !== 'number'
  )
    return null
  const harmony =
    typeof i.harmony === 'string' && (HARMONY_KINDS as readonly string[]).includes(i.harmony)
      ? (i.harmony as HarmonyKind)
      : undefined
  return {
    id: i.id,
    name: i.name.slice(0, MAX_PALETTE_NAME),
    colors: i.colors.map((c) => parseRgb(c)!),
    harmony,
    updatedAt: i.updatedAt
  }
}

/** One entry per palette id wins; the library never grows past the cap. */
const dedupePalettes = (list: unknown[]): SavedPalette[] => {
  const seen = new Set<string>()
  const out: SavedPalette[] = []
  for (const raw of list) {
    const i = parsePaletteEntry(raw)
    if (!i || seen.has(i.id)) continue
    seen.add(i.id)
    out.push(i)
    if (out.length >= MAX_PALETTES) break
  }
  return out
}

export function parsePalettes(raw: string | null): SavedPalette[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v) || !Array.isArray(v.items)) return []
    return dedupePalettes(v.items)
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
  /** The authoritative palette library, mirrored on the wire so both copies
   *  share one list instead of two cached ones. Absent in writes from builds
   *  that predate the shared library: those leave the local list alone. */
  pals?: SavedPalette[]
  /** The trailing window of palette ops the writer has seen, newest last. */
  ops?: PalOp[]
  /** Per-writer high-water mark: the highest `seq` of each writer's palette
   *  ops whose effects this publish's `pals` already contains. Watermarks are
   *  contiguous prefixes (seq n implies ops 1..n landed), so a copy can drop
   *  a pending op the moment a foreign publish covers it - even after the op
   *  itself scrolled out of the `ops` window. */
  acks?: Record<string, number>
}
export const serializeShared = (s: SharedState) => JSON.stringify({ v: 1, ...s })
export function parseShared(raw: string | null): SharedState | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v) || typeof v.by !== 'string') return null
    const doc = parseDoc(v.doc)
    if (!doc) return null
    const pals = Array.isArray(v.pals) ? dedupePalettes(v.pals) : undefined
    const ops = Array.isArray(v.ops)
      ? v.ops
          .map((o): PalOp | null => {
            if (!isObj(o) || typeof o.id !== 'string' || !Number.isInteger(o.seq) || (o.seq as number) < 1) return null
            const seq = o.seq as number
            if (o.kind === 'add') {
              const palette = parsePaletteEntry(o.palette)
              return palette ? { id: o.id, seq, kind: 'add', palette } : null
            }
            if (o.kind === 'rename' && typeof o.target === 'string' && typeof o.name === 'string')
              return { id: o.id, seq, kind: 'rename', target: o.target, name: o.name.slice(0, MAX_PALETTE_NAME) }
            if (o.kind === 'delete' && typeof o.target === 'string')
              return { id: o.id, seq, kind: 'delete', target: o.target }
            return null
          })
          .filter((o): o is PalOp => o !== null)
          .slice(-PAL_OP_WINDOW)
      : undefined
    const acks = isObj(v.acks)
      ? Object.fromEntries(
          Object.entries(v.acks).filter((e): e is [string, number] => Number.isInteger(e[1]) && (e[1] as number) >= 0)
        )
      : undefined
    const w = isObj(v.view) ? v.view : {}
    return {
      by: v.by,
      doc,
      pals,
      ops,
      acks,
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
