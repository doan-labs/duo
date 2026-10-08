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
  /** The authored base the strip was generated from, at full HSL precision.
   *  The strip's hue order is not always base-first (analogous and split put
   *  the base at index 1), so the base cannot be assumed from `colors[0]`. */
  base?: Hsl
  updatedAt: number
}
export const MAX_PALETTE_NAME = 40
export const MAX_PALETTES = 24
export const MAX_SWATCHES = 8

export const newPalette = (name: string, colors: Rgb[], harmony?: HarmonyKind, base?: Hsl): SavedPalette => ({
  id: crypto.randomUUID(),
  name: name.trim().slice(0, MAX_PALETTE_NAME) || 'Untitled palette',
  colors: colors.slice(0, MAX_SWATCHES),
  harmony,
  base,
  updatedAt: Date.now()
})

/** Painted strip equality, all channels exact. */
const stripEq = (a: Rgb[], b: Rgb[]) => a.length === b.length && a.every((c, i) => rgbEq(c, b[i]!))

/** The strip a base intent regenerates under a harmony. */
const regen = (base: Hsl, kind: HarmonyKind): Rgb[] => harmonyColors(base, kind).map(hslToRgb)

/** Total channel error between two painted strips. */
const stripErr = (a: Rgb[], b: Rgb[]) => {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  let err = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!,
      y = b[i]!
    err += Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b)
  }
  return err
}

/**
 * How far a candidate's regenerated strip may drift from the stored one and
 * still count as its generator: byte quantization can shift a swatch by a
 * unit or two, while a swatch that was never the base regenerates hues tens
 * of degrees off and sits orders of magnitude past this bound.
 */
export const PAL_BASE_TOLERANCE = 8

/**
 * Resolve the authored working colour of a saved palette so reopening
 * restores the original base and ordering instead of blindly adopting
 * `colors[0]` - which is the h-30/h+150 sibling for analogous and split.
 *
 * A persisted `base` is trusted only when it still regenerates the stored
 * strip exactly; entries saved before `base` existed are recovered by
 * scanning the stored swatches for the colour whose own derivation paints
 * the strip most closely. Degenerate strips (all-equal swatches) can match
 * several slots; the earliest match is deterministic and paints the same
 * strip. A palette with no recoverable base returns null so callers can
 * adopt the first colour honestly instead of fabricating one.
 */
export const palBase = (p: SavedPalette): { color: Rgb; hsl: Hsl; harmony: HarmonyKind } | null => {
  if (!p.harmony) return null
  if (p.base && stripEq(regen(p.base, p.harmony), p.colors)) {
    return { color: hslToRgb(p.base), hsl: p.base, harmony: p.harmony }
  }
  let best: { color: Rgb; hsl: Hsl; harmony: HarmonyKind } | null = null
  let bestErr = Number.POSITIVE_INFINITY
  for (const c of p.colors) {
    const intent = rgbToHsl(c)
    const err = stripErr(regen(intent, p.harmony), p.colors)
    if (err < bestErr) {
      bestErr = err
      best = { color: c, hsl: intent, harmony: p.harmony }
      if (err === 0) break
    }
  }
  return bestErr <= PAL_BASE_TOLERANCE ? best : null
}
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
  | { id: string; seq: number; kind: 'rename'; target: string; name: string; base?: string }
  | { id: string; seq: number; kind: 'delete'; target: string }

/** The trailing ops window each publish echoes for fast id settlement. */
export const PAL_OP_WINDOW = 24
/** Bound on one copy's own unacknowledged ops awaiting wire echo. */
export const PAL_PENDING_LIMIT = 128
/** Bound on the per-writer watermark map carried on the wire. */
export const PAL_ACK_LIMIT = 32
/** Bound on durable tombstones: palette ids are unique per save, so a held
 *  delete marker can never collide with a later recreate. */
export const PAL_TOMB_LIMIT = 64

export type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

// ---- Live admission ----

/**
 * The only view state that admits a new user intent: the host reports this
 * copy both on-screen and the display in use. Read synchronously from
 * `os.view` at call time: the shell stores the latest view info on receipt,
 * while the kit's `useDisplay` mirror batches subscriber notify through a
 * frame and can lag the real flip, so a React view is never the gate. During
 * device sleep the shell reports `visible:false, active:true`, which is why
 * the check needs both halves.
 */
export const admitView = (view: { visible: boolean; active: boolean }) => view.visible && view.active

/**
 * Reject a new intent at its origin: the wrapped function runs only while the
 * given view admits it, so a hidden intent is never enqueued, armed, or given
 * a ref, timer, session, storage, audio, focus or clipboard side effect to be
 * discovered later. Callers that need the current view should rebuild the
 * wrapper per event or read the predicate directly - the view object is
 * rebound per host event, never mutated.
 */
export const whenLive = <A extends unknown[]>(
  view: { visible: boolean; active: boolean },
  fn: (...a: A) => void
): ((...a: A) => void) => {
  return (...a: A) => {
    if (admitView(view)) fn(...a)
  }
}

/**
 * Whether an already-admitted edit may still write: it stays bound to the
 * document incarnation captured at gesture start. A peer-switched adopt bumps
 * the incarnation, cancelling the binding so a stale write never lands on the
 * new core.
 */
export const editBound = (captured: number, current: number) => captured === current

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
 * Whether a confirmed bootstrap read may touch the wire or the disk. A read
 * whose merged result serializes back to the exact stored wire carries no
 * delta - re-emitting it would let a stale read (taken before a peer's
 * delete landed) win the last-writer race and resurrect tombstoned rows.
 * A null record is confirmed-absent, where the legitimate empty first boot
 * still writes and an in-flight op still publishes.
 */
export const hydrateNeedsEmit = (raw: string | null, merged: SavedPalette[]): boolean =>
  raw === null || serializePalettes(merged) !== raw

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
    // A causal rename replays only while the adopted row still shows the
    // base it was issued against: a foreign publish carrying a newer name
    // makes the op a stale replay, not a live intent - it stays unsettled
    // for the watermark, but it never overwrites the peer fact (and never
    // poisons the base a fresh rename would stamp).
    if (op.kind === 'rename' && op.base !== undefined) {
      const row = merged.find((i) => i.id === op.target)
      if (row && row.name !== op.base && row.name !== op.name) continue
    }
    const next = applyPalOp(merged, op)
    if (palListEq(next, merged)) continue
    merged = next
    replayed.push(op)
  }
  const floor = nextAck - PAL_OP_WINDOW
  return { merged, replayed, ops: myOps.filter((o) => o.seq > floor), maxAck: nextAck }
}

/**
 * This copy's palette-library authority: the shared list plus the op log and
 * watermarks that keep it convergent. `ready` is the bootstrap authority bit:
 * it turns true only on a confirmed source - a resolved storage read (null is
 * a true absent key, a rejection is not a read) or a foreign publish that
 * carried a library. A copy that is not ready has no library opinion, so it
 * must not publish `pals`/`ops`/`acks` and must not persist: a default empty
 * list or a failed read can never reach the wire or the disk through it.
 */
export class PalsLib {
  ready = false
  /** The current library: the adopted wire list plus replayed pending ops. */
  list: SavedPalette[] = []
  /** My own ops not yet acknowledged by a foreign watermark, plus a settled tail. */
  ops: PalOp[] = []
  /** The trailing wire window echoed in publishes. */
  wireOps: PalOp[] = []
  /** Per-writer watermarks folded from foreign publishes. */
  acks: Record<string, number> = {}
  seq = 0
  private maxAck = 0
  constructor(private me: string) {}

  /**
   * A resolved storage read, applied only while unconfirmed. My pending ops
   * replay onto the read base, so an op queued during the unconfirmed window
   * survives the seed. Returns false once a library is already confirmed, so
   * a delayed read cannot clobber a meanwhile-adopted wire state.
   */
  hydrate(raw: string | null): boolean {
    if (this.ready) return false
    const r = mergePalWire({ pals: parsePalettes(raw) }, this.ops, this.me, this.maxAck)
    this.maxAck = r.maxAck
    this.ops = r.ops
    this.list = r.merged
    this.wireOps = [...this.wireOps, ...r.replayed].slice(-PAL_OP_WINDOW)
    this.ready = true
    return true
  }

  /** Adopt a foreign publish's confirmed library: wholesale, then replay. */
  adopt(shared: { pals: SavedPalette[]; ops?: PalOp[]; acks?: Record<string, number> }) {
    const before = new Set(this.list.map((p) => p.id))
    mergeAcks(this.acks, shared.acks, this.me)
    const r = mergePalWire(shared, this.ops, this.me, this.maxAck)
    this.maxAck = r.maxAck
    this.ops = r.ops
    this.list = r.merged
    // Ids the adopt removed were decided deletes on the wire, so the durable
    // merge keeps them dead even while a stale durable row still claims them.
    const keep = new Set(this.list.map((p) => p.id))
    for (const id of before) if (!keep.has(id)) this.tomb(id)
    for (const op of r.replayed) if (op.kind === 'delete') this.tomb(op.target)
    this.wireOps = [...(shared.ops ?? []), ...r.replayed].slice(-PAL_OP_WINDOW)
    this.ready = true
    return r
  }

  /** Ids an admitted op - mine or an adopted peer's - has removed. The
   *  durable merge must never resurrect them: a palette id is unique per
   *  save, so a tomb can only mean a delete that was decided, never a
   *  recreate the writer has not seen. Bounded FIFO. */
  tombs = new Set<string>()
  private tomb(id: string) {
    this.tombs.delete(id)
    this.tombs.add(id)
    while (this.tombs.size > PAL_TOMB_LIMIT) this.tombs.delete(this.tombs.values().next().value!)
  }

  /** Apply one admitted local op; returns the stamped op. */
  push(op: DistOmit<PalOp, 'id' | 'seq'>): PalOp {
    const seq = ++this.seq
    // A rename stamps the name it was issued against as its causal base, so
    // a durable replay can tell 'the stored row predates my op' from 'the
    // stored row is a peer's newer replacement'.
    const base = op.kind === 'rename' ? this.list.find((p) => p.id === op.target)?.name : undefined
    const full = { ...op, id: `${this.me}:${seq}`, seq, ...(base === undefined ? {} : { base }) } as PalOp
    if (full.kind === 'delete') this.tomb(full.target)
    this.list = applyPalOp(this.list, full)
    this.acks[this.me] = seq
    this.wireOps = [...this.wireOps, full].slice(-PAL_OP_WINDOW)
    this.ops = [...this.ops, full].slice(-PAL_PENDING_LIMIT)
    return full
  }

  /** The ack map a publish carries: folded watermarks plus my own seq. */
  wireAcks(): Record<string, number> {
    return { ...this.acks, [this.me]: this.seq }
  }

  /** My ops no foreign watermark has covered yet and no ambiguous write has
   *  retired - the deliberate edits the durable intent may still re-apply
   *  onto a newer stored value. Ops that settled on the wire stay in `ops`
   *  as an echo tail but must not keep re-asserting against the store. */
  pending(): PalOp[] {
    return this.ops.filter((o) => o.seq > this.maxAck && o.seq > this.retiredSeq)
  }

  /** Ops at or below this seq retired after an ambiguous write: the write's
   *  durable fate is unknowable, so the same intent may never replay onto a
   *  readback it did not produce - not in-cycle, queued, or deferred. */
  private retiredSeq = 0

  /** Palette ids a reconcile readback denied: the last ambiguous write
   *  claimed them and the confirmed store proved them absent (a peer delete
   *  the wire has not delivered yet). Fenced out of local-only appends so a
   *  stale row can never resurrect them durable-side. */
  readonly denied = new Set<string>()

  /** An ambiguous write reconciled to a different confirmed value: every op
   *  issued so far retires, and ids the sent value claimed that the
   *  readback denies are fenced out of durable appends. Bounded FIFO. */
  fence(sent: string | null, readback: string | null) {
    this.retiredSeq = this.seq
    const rb = new Set(parsePalettes(readback).map((p) => p.id))
    for (const p of parsePalettes(sent)) {
      if (rb.has(p.id)) continue
      this.denied.delete(p.id)
      this.denied.add(p.id)
      while (this.denied.size > PAL_TOMB_LIMIT) this.denied.delete(this.denied.values().next().value!)
    }
  }
}

/**
 * The durable palette merge: the stored document is the last confirmed
 * write, so its row wins every shared id - an unproven local copy (adopted
 * peer fact, hydrated seed, or simply stale) can never overwrite a peer's
 * acknowledged edit through this merge. Deliberate local edits are not
 * asserted here at all: they re-apply as ops in `palsIntent`, which is what
 * keeps a lost-ack rebase from re-firing stale rows. Local rows the stored
 * document has never seen still append - peer saves not yet durable and
 * rows this copy must cover - minus ids a decided delete tombstoned. A peer
 * delete the wire has not shown me yet may reappear for one write cycle,
 * but the op that carries the delete lands on adoption and the next write
 * removes it again: the merge converges because deletes ride the op log,
 * not the snapshot.
 */
export const mergeDurablePals = (
  durable: SavedPalette[],
  local: SavedPalette[],
  tombs: ReadonlySet<string>
): SavedPalette[] => {
  // Order-stable: the durable order carries, durable rows I lack are peer
  // facts kept in place, and only ids the stored document has never seen
  // append from my list. A fixed derivation order is what makes the merge
  // idempotent - every copy re-derives byte-identical wire instead of
  // reordering forever.
  const seen = new Set<string>()
  const merged: SavedPalette[] = []
  for (const p of durable) {
    if (tombs.has(p.id) || seen.has(p.id)) continue
    seen.add(p.id)
    merged.push(p)
  }
  for (const p of local) if (!seen.has(p.id) && !tombs.has(p.id)) merged.push(p)
  return merged
}

// ---- Conditional durable writes (SDK 0.1.0) ----

/** One atomic read: the stored value and the `{ rev, gen }` token a
 *  conditional `set`/`del` must carry back to be accepted. */
export interface CasEntry {
  v: string | null
  rev: number
  gen: number
}
export type CasToken = { rev: number; gen: number }
/** The host's durable key surface: `entry` mints the token the write
 *  preconditions on, and a resolved `set`/`del` is a real durable ack - the
 *  mirror's optimistic setter is not. */
export interface CasApi {
  entry(k: string): Promise<CasEntry>
  set(k: string, v: string, expect: CasToken): Promise<unknown>
  del(k: string, expect: CasToken): Promise<unknown>
}
export const CAS_SKIP: unique symbol = Symbol('cas-skip')
/** The semantic intent for one write cycle: derive the exact value to store
 *  from the exact value just read. `CAS_SKIP` means the durable already
 *  satisfies the intent. `null` deletes the key. */
export type CasDerive = (cur: string | null) => string | null | typeof CAS_SKIP
export type CasOutcome = 'ack' | 'conflict' | 'unknown' | 'fail' | 'gone' | 'read'

/**
 * Errors whose protocol meaning is a typed zero-effect verdict: the request
 * ran inside (or never reached) the host transaction, so nothing changed.
 * `E_CONFLICT` rebases and `E_GONE` is terminal; the rest are honest
 * failures that never masquerade as durability. Everything else -
 * `E_TIMEOUT`, `E_CLOSED`, a non-PlatformError - leaves the outcome
 * ambiguous: the request may still commit late, so it is reconciled, never
 * assumed failed.
 */
const CAS_TYPED = new Set(['E_ARGS', 'E_QUOTA', 'E_RATE', 'E_DENIED', 'E_UNSUPPORTED', 'E_PROTOCOL', 'E_STORAGE'])
const casErrCode = (e: unknown): string | null =>
  e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : null

/**
 * The conditional writer for one durable key. Every mutation is derived
 * fresh from the exact `entry` read it preconditions on - never a frozen
 * document resent under a fresh token - so `E_CONFLICT` rebases keep every
 * peer fact the fresh read found. An ambiguous outcome (lost ack) is
 * reconciled by reading `entry` once: the stored value equal to the sent
 * bytes proves the write landed; anything else reports `unknown` instead of
 * pretending the mutation applied - a timed-out original may still commit
 * late, so a nonmatching readback (even the old value) authorizes no new
 * write in the same cycle. A nonmatching reconciliation read adopts the
 * confirmed value and retires the intent's pending ops through
 * `onAmbiguous` - a retired op is never replayed, not in this cycle, not
 * queued, not deferred; only a genuine new intent derives a fresh value.
 * Asks coalesce: a new `ask` while a cycle runs just re-derives the latest
 * intent on the next pass.
 */
export class CasKey {
  /** The newest confirmed durable moment (seed or a real settle). */
  acked: CasEntry | null = null
  /** `E_GONE` is terminal: the generation this copy's tokens bind to is dead. */
  dead = false
  private queued = false
  private inflight = false
  constructor(
    private key: string,
    private api: CasApi,
    private derive: CasDerive,
    private opts: {
      onOutcome?: (o: CasOutcome) => void
      onDrain?: () => void
      /** A reconciliation read disagreed with the sent bytes: the write's
       *  durable fate is unknowable. Fired once, before `unknown`, so the
       *  owner can retire the intent's pending ops and fence the ids the
       *  readback denied. */
      onAmbiguous?: (sent: string | null, readback: CasEntry) => void
    } = {}
  ) {}

  /** Record the confirmed read the durable bootstrap made. */
  seed(e: CasEntry | null) {
    if (e && !this.acked) this.acked = e
  }

  /** Something still wants a write cycle to run. */
  get dirty() {
    return this.queued
  }

  /** Ask that the current semantic intent become durable. */
  ask() {
    if (this.dead) return
    this.queued = true
    if (!this.inflight) void this.cycle()
  }

  /** Re-enter after a reported failure or a re-admission wake. */
  retry() {
    this.ask()
  }

  private out(o: CasOutcome) {
    this.opts.onOutcome?.(o)
  }

  private async entry(): Promise<CasEntry | null> {
    try {
      return await this.api.entry(this.key)
    } catch {
      // A failed read is not an empty key: stay dirty and let the next ask
      // or admission wake re-arm the cycle.
      this.out('read')
      return null
    }
  }

  private async cycle() {
    this.inflight = true
    try {
      while (this.queued && !this.dead) {
        this.queued = false
        const e = await this.entry()
        if (!e) {
          this.queued = true
          return
        }
        this.acked = e
        let v = this.derive(e.v)
        if (v === CAS_SKIP) continue
        let tok = { rev: e.rev, gen: e.gen }
        for (;;) {
          let code: string | null = null
          try {
            const res = v === null ? await this.api.del(this.key, tok) : await this.api.set(this.key, v, tok)
            const rev =
              res && typeof res === 'object' && typeof (res as { rev?: unknown }).rev === 'number'
                ? (res as { rev: number }).rev
                : tok.rev + 1
            this.acked = { v, rev, gen: tok.gen }
            this.out('ack')
            break
          } catch (err) {
            code = casErrCode(err)
          }
          if (code === 'E_CONFLICT') {
            // Typed zero-effect: nothing landed. Rebase on the newer state.
            this.out('conflict')
            const f = await this.entry()
            if (!f) {
              this.queued = true
              return
            }
            this.acked = f
            tok = { rev: f.rev, gen: f.gen }
            v = this.derive(f.v)
            if (v === CAS_SKIP) break
            continue
          }
          if (code === 'E_GONE') {
            this.dead = true
            this.out('gone')
            return
          }
          if (code && CAS_TYPED.has(code)) {
            // Typed zero-effect failure: nothing landed, no retry storm.
            this.out('fail')
            break
          }
          // Ambiguous: the request may still commit late. Reconcile once -
          // the stored value equal to the sent bytes proves the write
          // landed; any other value (including the untouched old one) does
          // not prove it never will, so no fresh write fires in this cycle
          // and the owner retires the intent's pending ops before 'unknown'.
          const f = await this.entry()
          if (!f) {
            this.queued = true
            return
          }
          this.acked = f
          if (f.v === v) {
            this.out('ack')
            break
          }
          this.opts.onAmbiguous?.(v, f)
          this.out('unknown')
          this.queued = true
          return
        }
      }
    } finally {
      this.inflight = false
      if (!this.queued && !this.dead) this.opts.onDrain?.()
    }
  }
}

/** One admitted op applied onto the stored document - the causal fence
 *  between my intent and a peer's replacement of the same id:
 *  - a rename applies only while the stored row still shows the name the
 *    op was issued against (`base`); a newer peer name suppresses the
 *    replay, so a stale op can never overwrite the acknowledged
 *    replacement. Ops minted before `base` existed apply unconditionally.
 *  - an add owns its palette id outright (ids are unique per save), so a
 *    stored same-id row is always a newer confirmed fact and is never
 *    overwritten.
 *  A rename already visible in the stored row is a no-op either way - the
 *  derive must converge to byte-identical wire, so a settled effect can
 *  never re-stamp `updatedAt` and keep rewriting forever. */
const applyDurablePalOp = (items: SavedPalette[], op: PalOp): SavedPalette[] => {
  if (op.kind === 'add') return items.some((i) => i.id === op.palette.id) ? items : applyPalOp(items, op)
  if (op.kind !== 'rename') return applyPalOp(items, op)
  const name = op.name.trim().slice(0, MAX_PALETTE_NAME)
  return items.map((i) =>
    i.id === op.target && name && i.name !== name && (op.base === undefined || i.name === op.base)
      ? { ...i, name, updatedAt: Date.now() }
      : i
  )
}

const EMPTY_IDS: ReadonlySet<string> = new Set()

/** The palette intent: the stored document carries every peer fact (it wins
 *  shared ids by definition - it is the last confirmed write), my unseen
 *  rows append to cover a peer's lost write, and only my ops no foreign
 *  watermark has covered re-apply on top - each gated by the causal base it
 *  was issued against, so a stale replay can never overwrite a peer's
 *  acknowledged replacement. `denied` fences the ids a reconciliation
 *  readback proved absent: a row the last ambiguous write claimed and the
 *  store denied is a peer delete the wire has not delivered yet, and
 *  re-appending it would resurrect it durable-side. */
export const palsIntent = (
  list: () => SavedPalette[],
  tombs: () => ReadonlySet<string>,
  ops: () => PalOp[] = () => [],
  denied: () => ReadonlySet<string> = () => EMPTY_IDS
): CasDerive => {
  return (cur) => {
    const deniedSet = denied()
    let merged = mergeDurablePals(
      parsePalettes(cur),
      list().filter((p) => !deniedSet.has(p.id)),
      tombs()
    )
    for (const op of ops()) merged = applyDurablePalOp(merged, op)
    const wire = serializePalettes(merged)
    return wire === serializePalettes(parsePalettes(cur)) ? CAS_SKIP : wire
  }
}

/** The document intent: persist the live doc - the same value a peer adopt
 *  installed counts as the peer fact, never a frozen earlier doc. A stored
 *  value that parses to the same document needs no rewrite, and a corrupt
 *  one is repaired under its own token. */
export const docIntent = (doc: () => Doc | null): CasDerive => {
  return (cur) => {
    const d = doc()
    if (!d) return CAS_SKIP
    const wire = serializeDoc(d)
    const stored = parseDocJson(cur)
    return stored && serializeDoc(stored) === wire ? CAS_SKIP : wire
  }
}

/** The preference intent: the last toggle wins, deduped on the raw flag. */
export const muteIntent = (muted: () => boolean): CasDerive => {
  return (cur) => {
    const wire = muted() ? '1' : '0'
    return cur === wire ? CAS_SKIP : wire
  }
}

/**
 * Explicit admission-aware retry for bootstrap reads (the session snapshot
 * and the storage bootstrap). A failed read retries on a bounded backoff only
 * while this copy is admitted; while hidden the attempt parks with no timer
 * and the next admitted view event re-arms it immediately. Reads themselves
 * are always permitted - this policy decides only when a retry fires.
 */
export class BootPolicy {
  /** A failed attempt is waiting for admission rather than polling hidden. */
  parked = false
  attempts = 0
  constructor(
    private live: () => boolean,
    private run: () => void,
    private later: (fn: () => void, ms: number) => void = (fn, ms) => {
      setTimeout(fn, ms)
    }
  ) {}

  /** Record a failed read. */
  fail() {
    this.attempts++
    if (!this.live()) {
      this.parked = true
      return
    }
    const ms = Math.min(1200 * this.attempts, 9000)
    this.later(() => {
      // Hidden between scheduling and firing: park rather than poll hidden.
      if (!this.live()) this.parked = true
      else this.run()
    }, ms)
  }

  /** Progress was made: the backoff resets. */
  ok() {
    this.attempts = 0
    this.parked = false
  }

  /** The copy was admitted again: a parked attempt fires at once. */
  wake() {
    if (!this.parked || !this.live()) return
    this.parked = false
    this.attempts = 0
    this.run()
  }
}

/**
 * The library fields a publish may carry: present only while `ready`. An
 * unconfirmed copy publishes doc/view alone, so a default or failed-read
 * snapshot can never replace a peer's library on the wire or on disk.
 */
export const sharedLib = (
  ready: boolean,
  pals: SavedPalette[],
  ops: PalOp[],
  acks: Record<string, number>
): { pals?: SavedPalette[]; ops?: PalOp[]; acks?: Record<string, number> } => (ready ? { pals, ops, acks } : {})

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
  // `base` is validated like any other wire field; palBase re-verifies it
  // against the stored strip at open time before trusting it.
  const base = parseHsl(i.base) ?? undefined
  return {
    id: i.id,
    name: i.name.slice(0, MAX_PALETTE_NAME),
    colors: i.colors.map((c) => parseRgb(c)!),
    harmony,
    base,
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
              return {
                id: o.id,
                seq,
                kind: 'rename',
                target: o.target,
                name: o.name.slice(0, MAX_PALETTE_NAME),
                ...(typeof o.base === 'string' ? { base: o.base.slice(0, MAX_PALETTE_NAME) } : {})
              }
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
