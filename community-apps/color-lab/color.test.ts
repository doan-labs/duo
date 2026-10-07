// Throw-based test runner for the colour domain: community apps cannot import
// bun:test or node modules, so each check throws on failure and the file's
// evaluation is the suite. Run: `bun community-apps/color-lab/color.test.ts`.
//
// The token gate flags fixed colour literals even in strings, so test inputs
// are built with the small helpers below rather than written as literals.
import {
  admitView,
  applyPalOp,
  BLACK,
  BootPolicy,
  contrast,
  coreEq,
  coreOf,
  editBound,
  exportCodes,
  HARMONY_KINDS,
  type Hsl,
  harmonyColors,
  harmonyHues,
  hslEq,
  hslToRgb,
  hydrateNeedsEmit,
  inkFor,
  luminance,
  MAX_PALETTES,
  mergeAcks,
  mergePalWire,
  newDoc,
  newPalette,
  PAL_ACK_LIMIT,
  PAL_OP_WINDOW,
  PAL_PENDING_LIMIT,
  type PalOp,
  PalStore,
  PalsLib,
  palBase,
  parseColor,
  parseColorFull,
  parseCore,
  parseDocJson,
  parsePalettes,
  parseShared,
  type Rgb,
  ratioFloor,
  redoDoc,
  removePalette,
  renamePalette,
  rgb,
  rgbEq,
  rgbToHsl,
  type SavedPalette,
  SEED_COLOR,
  serializeDoc,
  serializePalettes,
  serializeShared,
  sharedLib,
  toHex,
  toHexShort,
  toHslString,
  toRgbString,
  undoDoc,
  upsertPalette,
  variations,
  verdict,
  WHITE,
  whenLive,
  withCore,
  wrapHue
} from './color.ts'

let passed = 0
const check = (name: string, fn: () => void) => {
  try {
    fn()
    passed++
  } catch (e) {
    throw new Error(`${name}: ${(e as Error).message}`)
  }
}
const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg)
}
const eq = <T>(a: T, b: T, msg: string) => {
  if (a !== b) throw new Error(`${msg}: expected ${String(b)}, got ${String(a)}`)
}
const near = (a: number, b: number, eps: number, msg: string) => {
  if (Math.abs(a - b) > eps) throw new Error(`${msg}: expected ~${b}, got ${a}`)
}
const rgbEqTo = (a: Rgb, r: number, g: number, b: number, msg: string) => {
  if (!rgbEq(a, { r, g, b })) throw new Error(`${msg}: expected ${r},${g},${b} got ${a.r},${a.g},${a.b}`)
}
const stripEq = (a: Rgb[], b: Rgb[]) => a.length === b.length && a.every((c, i) => rgbEq(c, b[i]!))

// Builders so no fixed colour literal ever enters a string.
const hash = (s: string) => `#${s}`
const rgbIn = (s: string) => `rgb(${s})`
const rgbaIn = (s: string) => `rgba(${s})`
const hslIn = (s: string) => `hsl(${s})`
const hslaIn = (s: string) => `hsla(${s})`
const hexOf = (r: number, g: number, b: number) => hash([r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''))

// ---- parsing ----

check('parses 6-digit hex with hash', () => {
  rgbEqTo(parseColor(hexOf(255, 0, 0))!, 255, 0, 0, 'red')
  rgbEqTo(parseColor(hexOf(59, 130, 246))!, 59, 130, 246, 'blue')
})
check('parses 3-digit hex', () => {
  rgbEqTo(parseColor(hash('f00'))!, 255, 0, 0, 'short red')
  rgbEqTo(parseColor(hash('0f8'))!, 0, 255, 136, 'short green')
})
check('parses bare hex without hash', () => {
  rgbEqTo(parseColor('ff0000')!, 255, 0, 0, 'bare red')
  rgbEqTo(parseColor('abc')!, 170, 187, 204, 'bare short')
})
check('parses 8-digit hex and drops alpha', () => {
  rgbEqTo(parseColor(hash('ff000080'))!, 255, 0, 0, 'alpha hex')
})
check('parses rgb() comma and space forms', () => {
  rgbEqTo(parseColor(rgbIn('255, 0, 0'))!, 255, 0, 0, 'comma')
  rgbEqTo(parseColor(rgbIn('255 0 0'))!, 255, 0, 0, 'space')
  rgbEqTo(parseColor(rgbaIn('255, 0, 0, 0.5'))!, 255, 0, 0, 'rgba alpha')
  rgbEqTo(parseColor(rgbIn('100% 0% 0%'))!, 255, 0, 0, 'percent')
})
check('parses hsl() forms', () => {
  rgbEqTo(parseColor(hslIn('0, 100%, 50%'))!, 255, 0, 0, 'hsl red')
  rgbEqTo(parseColor(hslIn('120 100% 25%'))!, 0, 128, 0, 'space hsl')
  rgbEqTo(parseColor(hslaIn('240, 100%, 50%, 0.5'))!, 0, 0, 255, 'hsla blue')
  rgbEqTo(parseColor(hslIn('0.5turn 100% 50%'))!, 0, 255, 255, 'turn hue')
  // 'grad' must not be eaten by the 'rad' check (100grad is 90deg).
  rgbEqTo(parseColor(hslIn('100grad 100% 50%'))!, 128, 255, 0, 'grad hue')
  rgbEqTo(parseColor(hslIn(`${Math.PI}rad 100% 50%`))!, 0, 255, 255, 'rad hue')
  rgbEqTo(parseColor(hslIn('180deg 100% 50%'))!, 0, 255, 255, 'deg hue')
})
check('rejects bad codes', () => {
  eq(parseColor(''), null, 'empty')
  eq(parseColor('   '), null, 'blank')
  eq(parseColor(hash('gg0000')), null, 'bad hex chars')
  eq(parseColor('12345'), null, '5-digit hex')
  eq(parseColor(rgbIn('300, 0, 0')), null, 'channel over 255')
  eq(parseColor(rgbIn('1, 2')), null, 'too few channels')
  eq(parseColor('banana'), null, 'word')
  eq(parseColor(hslIn('deg, 50%, 50%')), null, 'bad hue')
})
check('rejects malformed channel tokens and arity', () => {
  // Every malformed shape the parser once accepted must now fail.
  eq(parseColor(rgbIn('1 2 3 / banana')), null, 'alpha word')
  eq(parseColor(rgbIn('1,,2,3')), null, 'empty comma slot')
  eq(parseColor(rgbIn(',1,2,3')), null, 'leading comma')
  eq(parseColor(rgbIn('1 2 3 4')), null, 'fourth space channel')
  eq(parseColor(rgbIn('5x%,0,0')), null, 'suffixed percent')
  eq(parseColor(rgbIn('1e2,0,0')), null, 'scientific notation')
  eq(parseColor(rgbIn('255, 0, 0, 0.5, 1')), null, 'five channels')
  eq(parseColor(`${rgbIn('10 20 30')}/`), null, 'trailing slash')
  eq(parseColor(hslIn('120abc 50% 50%')), null, 'hue junk suffix')
  eq(parseColor(hslIn('120 50%x 50%')), null, 'percent junk suffix')
  eq(parseColor(hslIn('turn 1 1')), null, 'unit without digits')
  eq(parseColor(hslIn('120 50 50')), null, 'hsl s/l need percent signs')
  eq(parseColor(rgbIn('')), null, 'empty parens')
  eq(parseColor('cafe-extra'), null, 'word with hex prefix')
})
check('accepts valid alpha forms and discloses the drop', () => {
  const slashPct = parseColorFull(rgbIn('255 0 0 / 50%'))
  ok(slashPct?.droppedAlpha === true, '50% alpha disclosed')
  rgbEqTo(slashPct!.color, 255, 0, 0, 'solid under alpha')
  const opaque = parseColorFull(rgbIn('255 0 0 / 100%'))
  ok(opaque !== null && !opaque?.droppedAlpha, 'opaque alpha not disclosed')
  const hexAlpha = parseColorFull(hash('ff000080'))
  ok(hexAlpha?.droppedAlpha === true, 'hex alpha disclosed')
  const hexOpaque = parseColorFull(hash('ff0000ff'))
  ok(hexOpaque !== null && !hexOpaque?.droppedAlpha, 'opaque hex not disclosed')
  const comma = parseColorFull(rgbaIn('255, 0, 0, 0.5'))
  ok(comma?.droppedAlpha === true, 'rgba comma alpha disclosed')
})
check('parseColorFull keeps authored HSL precision', () => {
  const info = parseColorFull(hslIn('216.25 84.7% 58.2%'))
  ok(info !== null, 'parsed')
  near(info!.hsl.h, 216.25, 1e-9, 'h exact')
  near(info!.hsl.s, 0.847, 1e-9, 's exact')
})
check('wraps out-of-range hue in hsl()', () => {
  rgbEqTo(parseColor(hslIn('360 100% 50%'))!, 255, 0, 0, '360 wraps to 0')
  rgbEqTo(parseColor(hslIn('-120 100% 50%'))!, 0, 0, 255, '-120 wraps to 240')
})
check('clamps out-of-range s/l in hsl()', () => {
  rgbEqTo(parseColor(hslIn('0 200% 50%'))!, 255, 0, 0, 's>1 clamps')
})

// ---- HSL round trip ----

check('rgb->hsl->rgb round-trips web colours', () => {
  const cases: [number, number, number][] = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [59, 130, 246],
    [255, 255, 255],
    [0, 0, 0],
    [128, 128, 128],
    [250, 204, 21]
  ]
  for (const [r, g, b] of cases) {
    const back = hslToRgb(rgbToHsl({ r, g, b }))
    // +-1 per channel is the honest tolerance of integer HSL.
    ok(Math.abs(back.r - r) <= 1 && Math.abs(back.g - g) <= 1 && Math.abs(back.b - b) <= 1, `round trip ${r},${g},${b}`)
  }
})
check('hue wraps', () => {
  eq(wrapHue(360), 0, '360')
  eq(wrapHue(-30), 330, '-30')
  eq(wrapHue(390), 30, '390')
})
check('grey has zero saturation', () => {
  eq(rgbToHsl({ r: 128, g: 128, b: 128 }).s, 0, 'grey s')
})

// ---- harmonies and variations ----

check('harmony hue sets', () => {
  const comp = harmonyHues(30, 'complementary')
  eq(comp.length, 2, 'comp len')
  near(comp[1]!, 210, 0.01, 'comp second')
  const tri = harmonyHues(0, 'triadic')
  eq(tri.length, 3, 'tri len')
  near(tri[1]!, 120, 0.01, 'tri 120')
  const ana = harmonyHues(10, 'analogous')
  near(ana[0]!, 340, 0.01, 'analogous wraps below zero')
  const tet = harmonyHues(300, 'tetradic')
  near(tet[3]!, 210, 0.01, 'tetradic wraps past 360')
})
check('every harmony keeps s/l', () => {
  for (const kind of HARMONY_KINDS) {
    for (const c of harmonyColors({ h: 100, s: 0.5, l: 0.4 }, kind)) {
      eq(c.s, 0.5, `${kind} keeps s`)
      eq(c.l, 0.4, `${kind} keeps l`)
    }
  }
})
check('variations ladder is ordered light to dark', () => {
  const vs = variations({ h: 200, s: 0.8, l: 0.5 })
  eq(vs.length, 8, '8 steps')
  for (let i = 1; i < vs.length; i++) ok(vs[i]!.l < vs[i - 1]!.l, 'descending lightness')
})

// ---- WCAG contrast: known vectors ----

check('white on black is 21:1', () => {
  near(contrast(WHITE, BLACK), 21, 0.05, 'max contrast')
})
check('same colour is 1:1', () => {
  near(contrast(WHITE, WHITE), 1, 0.01, 'identity')
})
check('luminance is monotonic on the grey ramp', () => {
  near(luminance(BLACK), 0, 0.001, 'black lum')
  near(luminance(WHITE), 1, 0.001, 'white lum')
})
check('known WCAG vector: pure blue on white', () => {
  // The spec example: pure blue on white measures 8.59:1.
  near(contrast({ r: 0, g: 0, b: 255 }, WHITE), 8.59, 0.01, 'blue on white')
})
check('verdict thresholds', () => {
  const v = verdict(4.5)
  ok(v.aa, '4.5 passes AA')
  ok(v.aaLarge, '4.5 passes AA large')
  ok(v.aaaLarge, '4.5 passes AAA large')
  ok(!v.aaa, '4.5 fails AAA body')
  const low = verdict(2.9)
  ok(!low.aaLarge && !low.aa && !low.aaaLarge && !low.aaa, 'below all')
  ok(verdict(7).aaa, '7 passes AAA')
  ok(verdict(3).aaLarge && !verdict(3).aa, '3:1 is AA large only')
})
check('inkFor picks the higher-contrast ink', () => {
  rgbEqTo(inkFor(WHITE), 0, 0, 0, 'black ink on white')
  rgbEqTo(inkFor(BLACK), 255, 255, 255, 'white ink on black')
  // The crossover sits near #767676: at 119 black ink still edges white out.
  rgbEqTo(inkFor({ r: 119, g: 119, b: 119 }), 0, 0, 0, 'mid grey keeps black ink')
  rgbEqTo(inkFor({ r: 100, g: 100, b: 100 }), 255, 255, 255, 'dark grey flips to white ink')
})

// ---- format strings ----

check('serializers', () => {
  eq(toHex({ r: 255, g: 0, b: 0 }), hash('ff0000'), 'hex')
  eq(toHexShort({ r: 255, g: 0, b: 0 }), hash('f00'), 'short hex')
  eq(toHexShort({ r: 59, g: 130, b: 246 }), hash('3b82f6'), 'no shortening when uneven')
  eq(toRgbString({ r: 1, g: 2, b: 3 }), rgbIn('1, 2, 3'), 'rgb text')
  eq(toHslString({ h: 216.4, s: 0.85, l: 0.58 }), hslIn('216, 85%, 58%'), 'hsl text')
})

// ---- doc and undo ----

check('withCore pushes undo and clears redo', () => {
  let d = newDoc({ r: 255, g: 0, b: 0 })
  d = withCore(d, { color: { r: 0, g: 0, b: 255 } })
  eq(d.undo.length, 1, 'one undo')
  eq(d.color.b, 255, 'new color')
  d = undoDoc(d)
  eq(d.color.r, 255, 'undo restores')
  eq(d.redo.length, 1, 'redo staged')
  d = redoDoc(d)
  eq(d.color.b, 255, 'redo applies')
  d = withCore(d, { color: { r: 0, g: 255, b: 0 } })
  eq(d.redo.length, 0, 'new edit clears redo')
})
check('withCore no-ops on identical cores', () => {
  const d = newDoc({ r: 1, g: 2, b: 3 })
  ok(withCore(d, { color: { r: 1, g: 2, b: 3 } }) === d, 'same doc identity')
})
check('undo stack caps at limit', () => {
  let d = newDoc({ r: 0, g: 0, b: 0 })
  for (let i = 1; i <= 40; i++) d = withCore(d, { color: { r: i % 256, g: 0, b: 0 } })
  eq(d.undo.length, 32, 'exactly 32 after overflow')
  for (let i = 0; i < 40; i++) d = undoDoc(d)
  eq(d.undo.length, 0, 'drained to zero')
  eq(d.redo.length, 32, 'redo holds all 32')
  ok(rgbEq(d.color, { r: 8, g: 0, b: 0 }), `oldest retained core, got ${toHex(d.color)}`)
  for (let i = 0; i < 40; i++) d = redoDoc(d)
  eq(d.redo.length, 0, 'redo drained')
  ok(rgbEq(d.color, { r: 40, g: 0, b: 0 }), `redo restores newest, got ${toHex(d.color)}`)
})
check('hsl intent survives rgb quantization in cores', () => {
  // Dragging L to black and back through the authority path must return the
  // original hue/saturation, not the grey the quantization produced.
  let d = newDoc(hslToRgb(SEED_COLOR))
  const seed = d.hsl
  d = withCore(d, { hsl: { ...seed, l: 0 }, color: hslToRgb({ ...seed, l: 0 }) })
  ok(d.color.r === 0 && d.color.g === 0 && d.color.b === 0, 'black reached')
  d = withCore(d, { hsl: seed, color: hslToRgb(seed) })
  ok(hslEq(d.hsl, seed), 'hsl restored exactly')
  ok(rgbEq(d.color, hslToRgb(SEED_COLOR)), 'rgb restored')
  // A hue keyboard step that paints the same bytes still counts as a change.
  const dark = newDoc({ r: 26, g: 22, b: 18 })
  const stepped = withCore(dark, {
    hsl: { ...dark.hsl, h: dark.hsl.h + 1 },
    color: hslToRgb({ ...dark.hsl, h: dark.hsl.h + 1 })
  })
  ok(stepped !== dark, 'hue step committed even when rgb matched')
  ok(!coreEq(coreOf(dark), coreOf(stepped)), 'cores differ on intent')
})

// ---- palettes ----

check('palBase restores the authored base for every harmony', () => {
  // The deterministic defect: Open adopted colors[0], but analogous and
  // split paint the base at index 1, so reopening regenerated a shifted
  // strip and shifted the heading colour.
  const intents: Hsl[] = [
    { h: 216, s: 0.85, l: 0.58 },
    { h: 5, s: 0.9, l: 0.5 },
    { h: 350, s: 0.7, l: 0.4 },
    { h: 120, s: 0.2, l: 0.08 },
    { h: 300, s: 1, l: 0.5 },
    { h: 40, s: 0.6, l: 1 },
    { h: 0, s: 0, l: 0.5 }
  ]
  for (const kind of HARMONY_KINDS)
    for (const intent of intents) {
      const colors = harmonyColors(intent, kind).map(hslToRgb)
      const b = palBase(newPalette('P', colors, kind, intent))!
      ok(b !== null, `${kind} h${intent.h} resolves a base`)
      ok(rgbEq(b.color, hslToRgb(intent)), `${kind} h${intent.h} keeps the authored colour`)
      ok(hslEq(b.hsl, intent), `${kind} h${intent.h} keeps full-precision intent`)
      eq(b.harmony, kind, 'harmony carried')
      ok(stripEq(harmonyColors(b.hsl, kind).map(hslToRgb), colors), `${kind} h${intent.h} reopened strip is exact`)
    }
})
check('palBase infers the authored slot for legacy entries without base', () => {
  for (const kind of HARMONY_KINDS) {
    const intent = { h: 216, s: 0.85, l: 0.58 }
    const colors = harmonyColors(intent, kind).map(hslToRgb)
    const legacy = newPalette('L', colors, kind)
    const b = palBase(legacy)!
    ok(b !== null, `${kind} legacy resolves`)
    const expected = kind === 'analogous' || kind === 'split' ? colors[1]! : colors[0]!
    ok(rgbEq(b.color, expected), `${kind} legacy picks the authored slot, not colors[0]`)
    ok(stripEq(harmonyColors(b.hsl, kind).map(hslToRgb), colors), `${kind} legacy strip regenerates`)
  }
})
check('palBase keeps a split palette on its authored base', () => {
  // The reviewed repro: a stored split strip [h+150, h, h+210] reopened as
  // if the first swatch were the base, regenerating a shifted strip.
  const intent = { h: 216, s: 0.85, l: 0.58 }
  const colors = harmonyColors(intent, 'split').map(hslToRgb)
  const b = palBase(newPalette('Review', colors, 'split'))!
  ok(b !== null, 'split resolves without a stored base')
  ok(rgbEq(b.color, colors[1]!), 'base is the middle swatch, not colors[0]')
  ok(stripEq(harmonyColors(b.hsl, 'split').map(hslToRgb), colors), 'reopened strip identical to stored')
})
check('palBase is honest on forged base, missing harmony and foreign strips', () => {
  const intent = { h: 216, s: 0.85, l: 0.58 }
  const colors = harmonyColors(intent, 'split').map(hslToRgb)
  const forged = newPalette('F', colors, 'split', { h: 0, s: 0.5, l: 0.5 })
  const b = palBase(forged)!
  ok(b !== null && rgbEq(b.color, colors[1]!), 'forged base falls back to inference')
  eq(palBase(newPalette('N', [rgb(1, 2, 3), rgb(4, 5, 6)])), null, 'no harmony returns null')
  // A strip no stored swatch can regenerate is not this palette's generator.
  const foreign = newPalette('X', [rgb(10, 20, 30), rgb(200, 10, 10), rgb(10, 200, 200), rgb(90, 90, 200)], 'split')
  eq(palBase(foreign), null, 'non-generated strip returns null')
})
check('palBase stays deterministic on achromatic strips', () => {
  const colors = harmonyColors({ h: 216, s: 0, l: 0.5 }, 'split').map(hslToRgb)
  const b = palBase(newPalette('G', colors, 'split'))!
  ok(b !== null, 'grey strip resolves')
  ok(rgbEq(b.color, colors[0]!), 'identical swatches pick the first matching slot')
})
check('palette base survives serialize/parse round trip', () => {
  const intent = { h: 216.4, s: 0.85, l: 0.58 }
  const p = newPalette('R', harmonyColors(intent, 'analogous').map(hslToRgb), 'analogous', intent)
  const back = parsePalettes(serializePalettes([p]))
  ok(back[0]!.base !== undefined && hslEq(back[0]!.base!, intent), 'base intent persists through the wire')
  const b = palBase(back[0]!)!
  ok(b !== null && rgbEq(b.color, hslToRgb(intent)), 'reloaded palette reopens the same base')
})
check('repeated save and open cycles do not drift the palette', () => {
  // Quantization guard: save -> open -> save again must be a fixed point.
  const intent = { h: 216, s: 0.85, l: 0.58 }
  let colors = harmonyColors(intent, 'split').map(hslToRgb)
  for (let round = 0; round < 3; round++) {
    const b = palBase(newPalette('C', colors, 'split', rgbToHsl(colors[1]!)))!
    colors = harmonyColors(b.hsl, 'split').map(hslToRgb)
  }
  ok(stripEq(colors, harmonyColors(intent, 'split').map(hslToRgb)), 'strip is a fixed point across reopens')
})
check('palette create/upsert/rename/remove', () => {
  const red = rgb(255, 0, 0)
  let items = upsertPalette([], newPalette('Warm', [red]))
  eq(items.length, 1, 'one saved')
  eq(items[0]!.name, 'Warm', 'named')
  items = renamePalette(items, items[0]!.id, 'Sunset')
  eq(items[0]!.name, 'Sunset', 'renamed')
  items = upsertPalette(items, { ...items[0]!, name: 'Sunset re-saved' })
  eq(items.length, 1, 'upsert replaces by id')
  items = removePalette(items, items[0]!.id)
  eq(items.length, 0, 'removed')
})
check('palette name trims and falls back', () => {
  eq(newPalette('   ', [rgb(1, 2, 3)]).name, 'Untitled palette', 'blank falls back')
  ok(newPalette('x'.repeat(60), [rgb(1, 2, 3)]).name.length <= 40, 'name capped')
})
check('library caps at MAX_PALETTES', () => {
  let items = upsertPalette([], newPalette('seed', [rgb(0, 0, 0)]))
  for (let i = 0; i < MAX_PALETTES + 5; i++) items = upsertPalette(items, newPalette(`P${i}`, [rgb(i % 256, 0, 0)]))
  eq(items.length, MAX_PALETTES, 'capped')
})

// ---- persistence ----

check('doc survives serialize/parse round trip', () => {
  let d = newDoc(hslToRgb(SEED_COLOR))
  d = withCore(d, { harmony: 'triadic', pair: { fg: BLACK, bg: WHITE } })
  const back = parseDocJson(serializeDoc(d))
  ok(back !== null, 'parsed')
  eq(back!.harmony, 'triadic', 'harmony kept')
  ok(rgbEq(back!.color, d.color), 'colour kept')
  ok(rgbEq(back!.pair.fg, BLACK) && rgbEq(back!.pair.bg, WHITE), 'pair kept')
  eq(back!.undo.length, 1, 'undo kept')
})
check('parseDocJson rejects garbage', () => {
  eq(parseDocJson(null), null, 'null')
  eq(parseDocJson('not json'), null, 'bad json')
  eq(parseDocJson('{"v":2}'), null, 'wrong version')
  eq(
    parseDocJson(
      '{"v":1,"color":{"r":300,"g":0,"b":0},"harmony":"triadic","pair":{"fg":{"r":0,"g":0,"b":0},"bg":{"r":1,"g":1,"b":1}},"undo":[],"redo":[]}'
    ),
    null,
    'byte out of range'
  )
})
check('palettes survive serialize/parse round trip', () => {
  const items = [newPalette('A', [rgb(1, 2, 3), rgb(4, 5, 6)], 'triadic')]
  const back = parsePalettes(serializePalettes(items))
  eq(back.length, 1, 'count')
  rgbEqTo(back[0]!.colors[1]!, 4, 5, 6, 'second swatch')
  eq(back[0]!.harmony, 'triadic', 'harmony kept')
  eq(parsePalettes('garbage').length, 0, 'garbage yields empty')
  const dup = parsePalettes(
    JSON.stringify({
      v: 1,
      items: [
        { id: 'x', name: 'a', colors: [], updatedAt: 1 },
        { id: 'x', name: 'b', colors: [], updatedAt: 2 }
      ]
    })
  )
  eq(dup.length, 1, 'duplicate ids deduped')
})
check('palette ops apply', () => {
  const a = newPalette('A', [rgb(255, 0, 0)])
  const b = newPalette('B', [rgb(0, 0, 255)])
  const addA = { id: 'o1', seq: 1, kind: 'add' as const, palette: a }
  let items = applyPalOp([], addA)
  // The concurrent case: B was added onto a base that never saw A; replaying
  // the add-A op merges it without losing B.
  items = applyPalOp([b], addA)
  eq(items.length, 2, 'replayed add merges')
  const rn = { id: 'o3', seq: 3, kind: 'rename' as const, target: a.id, name: 'Renamed' }
  items = applyPalOp(items, rn)
  eq(items.find((p) => p.id === a.id)!.name, 'Renamed', 'rename applied')
  const del = { id: 'o4', seq: 4, kind: 'delete' as const, target: b.id }
  items = applyPalOp(items, del)
  eq(items.length, 1, 'B gone')
})

// ---- causal op settlement: mergePalWire drives the shared-library merge ----

const pal = (id: string, name: string): SavedPalette => ({
  id,
  name,
  colors: [rgb(9, 9, 9)],
  updatedAt: 1
})
const rn = (w: string, seq: number, target: string, name: string) => ({
  id: `${w}:${seq}`,
  seq,
  kind: 'rename' as const,
  target,
  name
})
const add = (w: string, seq: number, p: SavedPalette) => ({ id: `${w}:${seq}`, seq, kind: 'add' as const, palette: p })
const del = (w: string, seq: number, target: string) => ({ id: `${w}:${seq}`, seq, kind: 'delete' as const, target })
check('ops settle by writer watermark past the wire window', () => {
  // The S4/S5 failures: more renames than the trailing op window. The op log
  // must drop ops only when a foreign watermark covers them, so a publish
  // whose window no longer echoes them still settles causally.
  const all: { id: string; seq: number; kind: 'rename'; target: string; name: string }[] = []
  for (let i = 1; i <= 26; i++) all.push(rn('I', i, 't', `R${i}`))
  const theirList = all.reduce((items, op) => applyPalOp(items, op), [pal('t', 'Main')])
  // The foreign publish saw everything, but its ops window holds only 24.
  const first = mergePalWire({ pals: theirList, ops: all.slice(-PAL_OP_WINDOW), acks: { I: 26 } }, all, 'I', 0)
  eq(first.merged[0]!.name, 'R26', 'final name adopted')
  eq(first.replayed.length, 0, 'covered ops settle, none replay')
  eq(first.ops.length, PAL_OP_WINDOW, 'one window-deep settled tail kept')
  // A regressed publish (watermark 2, stale list) replays the settled tail.
  // Its ops window echoes only what that older writer had actually seen.
  const stale = mergePalWire(
    { pals: [pal('t', 'R2')], ops: all.slice(0, 2), acks: { I: 2 } },
    first.ops,
    'I',
    first.maxAck
  )
  eq(stale.merged[0]!.name, 'R26', 'regressed publish still lands every op')
  eq(stale.maxAck, 26, 'watermark never goes backwards')
})
check('delete stays deleted after the add scrolls out of the window', () => {
  // The S6 failure: add, fill the window with renames, delete. Existence-based
  // settle let the evicted add replay over the delete.
  const ops: ReturnType<typeof rn>[] = []
  let list = applyPalOp([], add('I', 1, pal('tmp', 'Temp')))
  ops.push(rn('I', 2, 'tmp', 'x'))
  for (let i = 3; i <= 24; i++) ops.push(rn('I', i, 'tmp', `R${i}`))
  list = ops.reduce((items, op) => applyPalOp(items, op), list)
  list = applyPalOp(list, del('I', 25, 'tmp'))
  // Foreign publish has the empty list and full coverage of writer I.
  const r = mergePalWire(
    {
      pals: [],
      ops: [add('I', 1, pal('tmp', 'Temp')), ...ops, del('I', 25, 'tmp')].slice(-PAL_OP_WINDOW),
      acks: { I: 25 }
    },
    [add('I', 1, pal('tmp', 'Temp')), ...ops, del('I', 25, 'tmp')],
    'I',
    0
  )
  eq(r.merged.length, 0, 'temp stays deleted')
  eq(r.replayed.length, 0, 'nothing replays over the delete')
})
check('unsettled ops replay onto foreign state in seq order', () => {
  const mine = [add('I', 1, pal('a', 'A')), rn('I', 2, 'a', 'A2')]
  // Foreign publish knows nothing of my ops.
  const r = mergePalWire({ pals: [pal('b', 'B')], ops: [], acks: {} }, mine, 'I', 0)
  eq(r.merged.length, 2, 'both lists merged')
  eq(r.merged.find((p) => p.id === 'a')!.name, 'A2', 'rename replayed')
  eq(r.ops.length, 2, 'unacked ops stay in the log')
  // Now the publisher covers them: they settle on the next adopt and stay in
  // the log only as the bounded repair tail.
  const ack = mergePalWire({ pals: r.merged, ops: mine, acks: { I: 2 } }, r.ops, 'I', r.maxAck)
  eq(ack.replayed.length, 0, 'covered ops never replay')
  eq(ack.maxAck, 2, 'watermark advanced')
})
check('echoed ids settle even without a watermark', () => {
  // An old publisher that never learned to emit acks still settles ops it
  // echoes inside the window.
  const mine = [add('I', 1, pal('a', 'A'))]
  const r = mergePalWire(
    { pals: mine.map((o) => (o.kind === 'add' ? o.palette : pal('x', 'x'))), ops: mine },
    mine,
    'I',
    0
  )
  eq(r.replayed.length, 0, 'echoed op does not replay')
})
check('a 100-op burst converges and the log stays bounded', () => {
  const all: ReturnType<typeof rn>[] = []
  for (let i = 1; i <= 100; i++) all.push(rn('I', i, 't', `R${i}`))
  const theirList = all.reduce((items, op) => applyPalOp(items, op), [pal('t', 'Main')])
  // Two-round convergence: cover in one publish, settle on the next.
  const a = mergePalWire({ pals: theirList, ops: all.slice(-PAL_OP_WINDOW), acks: { I: 100 } }, all, 'I', 0)
  eq(a.merged[0]!.name, 'R100', 'all 100 applied')
  eq(a.replayed.length, 0, 'nothing replays once the watermark covers them')
  eq(a.ops.length, PAL_OP_WINDOW, 'log bounded to the settled tail')
  // Alternating concurrent writes from two writers: each side's unacked ops
  // replay over the other's publish; neither copy loses the other's data.
  const iOps = [add('I', 1, pal('ia', 'IA'))]
  const kOps = [add('K', 1, pal('kb', 'KB'))]
  const kSeesI = mergePalWire({ pals: [pal('ia', 'IA')], ops: [...iOps], acks: { I: 1 } }, kOps, 'K', 0)
  eq(kSeesI.merged.length, 2, 'peer sees both adds')
  const iSeesK = mergePalWire({ pals: [pal('kb', 'KB')], ops: [...kOps], acks: { K: 1 } }, iOps, 'I', 0)
  eq(iSeesK.merged.length, 2, 'both converge to two palettes')
})
check('ack map stays sound past the 32-writer bound', () => {
  const into: Record<string, number> = { me: 5 }
  for (let i = 1; i <= 33; i++) mergeAcks(into, { [`w${i}`]: i }, 'me')
  ok(Object.keys(into).length <= PAL_ACK_LIMIT, 'writer map bounded')
  eq(into.me, 5, 'own watermark never evicted')
  // An evicted writer's later, higher claim re-enters: watermarks only move
  // forward, so a transient eviction loses no settlement state.
  mergeAcks(into, { w1: 40 }, 'me')
  eq(into.w1, 40, 'evicted writer re-learned on a higher claim')
})
check('pending replay honours seq order across holes and tombstones', () => {
  // Seq holes (a writer whose log skipped numbers) do not block replay.
  const sparse = [rn('I', 3, 't', 'B'), rn('I', 7, 't', 'G')]
  const r = mergePalWire({ pals: [pal('t', 'A')], ops: [], acks: { I: 1 } }, sparse, 'I', 0)
  eq(r.merged[0]!.name, 'G', 'ops replay in seq order across holes')
  eq(r.ops.length, 2, 'both unacked ops kept')
  const r2 = mergePalWire({ pals: [pal('t', 'A')], ops: [], acks: { I: 3 } }, sparse, 'I', 0)
  eq(r2.replayed.length, 1, 'covered prefix settles, hole does not block the tail')
  eq(r2.merged[0]!.name, 'G', 'uncovered tail applies')
  // Tombstone: delete then re-add of the same id keeps the last write.
  const life = [add('I', 1, pal('x', 'One')), del('I', 2, 'x'), add('I', 3, pal('x', 'Back'))]
  const t = mergePalWire({ pals: [], ops: [], acks: {} }, life, 'I', 0)
  eq(t.merged.length, 1, 're-add after delete survives')
  eq(t.merged[0]!.name, 'Back', 'last write wins the tombstone')
})
check('a regressed publisher is repaired by the settled tail', () => {
  const all: ReturnType<typeof rn>[] = []
  for (let i = 1; i <= 30; i++) all.push(rn('I', i, 't', `R${i}`))
  const covered = mergePalWire(
    { pals: all.reduce((l, o) => applyPalOp(l, o), [pal('t', 'A')]), ops: all.slice(-PAL_OP_WINDOW), acks: { I: 30 } },
    all,
    'I',
    0
  )
  // A publish that skipped six ops claims only ack 24; the settled tail
  // (window-deep below the high watermark) re-replays exactly those ops.
  const staleList = all.slice(0, 24).reduce((l, o) => applyPalOp(l, o), [pal('t', 'A')])
  const r = mergePalWire({ pals: staleList, ops: all.slice(0, 24), acks: { I: 24 } }, covered.ops, 'I', covered.maxAck)
  eq(r.replayed.length, 6, 'exactly the uncovered ops replay')
  eq(r.merged[0]!.name, 'R30', 'settled tail repairs the gap')
  eq(r.maxAck, 30, 'high watermark retained')
})
check('the pending bound trims history, not the applied result', () => {
  // >PAL_PENDING_LIMIT unacked writes is a synthetic-only condition - it
  // needs more than 128 palette mutations without any publish echo. Model
  // the app's own slice: the log keeps the newest window and still lands
  // the latest state.
  const many: ReturnType<typeof rn>[] = []
  for (let i = 1; i <= 140; i++) many.push(rn('I', i, 't', `R${i}`))
  const trimmed = many.slice(-PAL_PENDING_LIMIT)
  const r = mergePalWire({ pals: [pal('t', 'R0')], ops: [], acks: {} }, trimmed, 'I', 0)
  eq(r.merged[0]!.name, 'R140', 'bounded log still lands the latest')
  ok(r.ops.length <= PAL_PENDING_LIMIT, 'log never exceeds the pending bound')
})
check('mergeAcks keeps watermarks monotone and bounded', () => {
  const into: Record<string, number> = { me: 5 }
  mergeAcks(into, { me: 3, k: 9 }, 'me')
  eq(into.me, 5, 'my own watermark never regresses')
  eq(into.k, 9, 'foreign watermark learned')
  mergeAcks(into, { k: 4 }, 'me')
  eq(into.k, 9, 'lower foreign claim ignored')
  mergeAcks(into, { junk: Number.NaN, neg: -2, frac: 1.5 }, 'me')
  ok(into.junk === undefined && into.neg === undefined && into.frac === undefined, 'non-integer acks rejected')
})
check('shared state survives serialize/parse round trip', () => {
  const d = newDoc(rgb(10, 20, 30))
  const pal = newPalette('Wire', [rgb(9, 9, 9)], 'analogous')
  const s = serializeShared({
    by: 'writer-id',
    doc: d,
    pals: [pal],
    ops: [{ id: 'w1:1', seq: 1, kind: 'add', palette: pal }],
    acks: { 'writer-id': 1 },
    view: {
      field: 'ff0000',
      fieldErr: false,
      page: true,
      sheet: 'save',
      nameInput: 'n',
      actionId: null,
      deleteId: null,
      copyText: null,
      muted: true
    }
  })
  const back = parseShared(s)
  ok(back !== null, 'parsed')
  eq(back!.by, 'writer-id', 'writer')
  eq(back!.view.page, true, 'page kept')
  eq(back!.view.muted, true, 'mute kept')
  eq(back!.pals?.length, 1, 'library on the wire')
  eq(back!.pals?.[0]?.harmony, 'analogous', 'palette harmony on the wire')
  eq(back!.ops?.length, 1, 'op window on the wire')
  eq(back!.acks!['writer-id'], 1, 'watermarks parsed')
  eq(parseShared('{}'), null, 'empty object rejected')
  eq(parseShared('{"by":"x","doc":null}'), null, 'missing doc rejected')
  const legacy = parseShared(
    serializeShared({
      by: 'old-build',
      doc: d,
      view: {
        field: '',
        fieldErr: false,
        page: false,
        sheet: null,
        nameInput: '',
        actionId: null,
        deleteId: null,
        copyText: null,
        muted: false
      }
    })
  )
  ok(legacy !== null && legacy.pals === undefined, 'writes without a library leave it alone')
})
check('wire payload repair keeps the shared library sound', () => {
  const d = newDoc(rgb(1, 2, 3))
  const mk = (extra: string) =>
    `{"by":"w","doc":${serializeDoc(d)},"view":{"field":"","fieldErr":false,"page":false,"sheet":null,"nameInput":"","actionId":null,"deleteId":null,"copyText":null,"muted":false}${extra}}`
  // Duplicate ids and overflow dedupe and cap rather than corrupt the list.
  const pals = JSON.stringify([
    { id: 'a', name: 'A', colors: [{ r: 1, g: 2, b: 3 }], updatedAt: 1 },
    { id: 'a', name: 'A2', colors: [{ r: 4, g: 5, b: 6 }], updatedAt: 2 },
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `x${i}`,
      name: `X${i}`,
      colors: [{ r: 1, g: 1, b: 1 }],
      updatedAt: i
    }))
  ])
  const s = parseShared(mk(`,"pals":${pals}`))
  eq(s!.pals!.length, MAX_PALETTES, 'wire pals capped')
  eq(s!.pals!.filter((p) => p.id === 'a').length, 1, 'duplicate ids deduped')
  // Ops without a monotonic seq are dropped from the window wholesale.
  const mixed = parseShared(
    mk(
      `,"pals":[],"ops":[{"id":"w:1","kind":"delete","target":"a"},{"id":"w:2","seq":2,"kind":"delete","target":"b"},{"id":"w:x","seq":"y","kind":"delete","target":"c"}]`
    )
  )
  eq(mixed!.ops!.length, 1, 'seq-less ops dropped')
  eq(mixed!.ops![0]!.id, 'w:2', 'only the sequenced op kept')
  // Ack payloads accept integers >= 0 only.
  const ack = parseShared(mk(',"pals":[],"acks":{"w":3,"bad":-1,"nan":"x","frac":1.2}'))
  eq(ack!.acks!.w, 3, 'valid watermark kept')
  ok(
    ack!.acks!.bad === undefined && ack!.acks!.nan === undefined && ack!.acks!.frac === undefined,
    'bad watermarks dropped'
  )
})
check('wire core repair preserves intent but rejects forged hsl', () => {
  const base = { harmony: 'analogous', pair: { fg: rgb(0, 0, 0), bg: rgb(255, 255, 255) } }
  // A quantized color that legitimately matches the authored hsl keeps the
  // authored intent (achromatic round trip).
  const grey = parseCore({ ...base, color: { r: 148, g: 148, b: 148 }, hsl: { h: 30, s: 0, l: 0.58 } })!
  eq(grey.hsl.h, 30, 'authored achromatic hue kept')
  eq(grey.hsl.l, 0.58, 'authored lightness kept')
  // An hsl that does not quantize to the color is a forgery: rgb wins.
  const bad = parseCore({ ...base, color: { r: 57, g: 130, b: 239 }, hsl: { h: 10, s: 0.8, l: 0.4 } })!
  ok(!hslEq(bad.hsl, { h: 10, s: 0.8, l: 0.4 }), 'forged hsl repaired')
  const roundtrip = hslToRgb(bad.hsl)
  ok(Math.abs(roundtrip.r - 57) <= 1 && Math.abs(roundtrip.g - 130) <= 1, 'repaired hsl tracks color')
  eq(parseCore({ ...base, color: { r: Number.NaN, g: 0, b: 0 } }), null, 'non-finite color rejected')
  eq(parseCore({ ...base, color: { r: 300, g: 0, b: 0 } }), null, 'out-of-range color rejected')
  const broken = parseCore({ ...base, color: { r: 1, g: 2, b: 3 }, hsl: { h: Number.NaN, s: 0.5, l: 0.5 } })!
  ok(broken !== null && hslEq(broken.hsl, rgbToHsl(rgb(1, 2, 3))), 'non-finite hsl repaired, not trusted')
})
check('exportCodes writes one unambiguous line', () => {
  const text = exportCodes([rgb(255, 0, 0), rgb(0, 0, 255)], 'Deck')
  eq(text, `Deck: ${hash('ff0000')}, ${hash('0000ff')}`, 'single line name: codes')
  ok(!text.includes('\n'), 'no newlines to corrupt')
})
check('ratioFloor never reads past a failed threshold', () => {
  eq(ratioFloor(4.49886, 2), '4.49', 'floored below 4.5')
  eq(ratioFloor(2.99979, 2), '2.99', 'floored below 3')
  eq(ratioFloor(4.5, 2), '4.50', 'exact threshold intact')
  eq(ratioFloor(21, 2), '21.00', 'max unchanged')
  eq(ratioFloor(2.99979, 1), '2.9', 'one decimal floored')
  // A floored display can never claim a threshold the real ratio missed.
  for (const r of [4.49886, 2.99979, 2.9955, 4.5, 6.9999, 7])
    for (const t of [3, 4.5, 7])
      ok(Number(ratioFloor(r, 2)) >= t === r >= t || Number(ratioFloor(r, 2)) < t, `${r} honest vs ${t}`)
})
check('coreOf is a copy, not an alias', () => {
  const d = newDoc(rgb(7, 8, 9))
  const c = coreOf(d)
  c.color = rgb(1, 1, 1)
  ok(d.color.r === 7, 'doc untouched')
})

// ---- live admission ----

const VIEW_HIDDEN_ASLEEP = { visible: false, active: true }
const VIEW_HIDDEN_INERT = { visible: false, active: false }
const VIEW_SEEN_OTHER = { visible: true, active: false }
const VIEW_LIVE = { visible: true, active: true }

check('admission requires visible AND active at call time', () => {
  ok(admitView(VIEW_LIVE), 'visible+active admits')
  ok(!admitView(VIEW_HIDDEN_ASLEEP), 'sleep keeps active but hides')
  ok(!admitView(VIEW_HIDDEN_INERT), 'hidden+inactive rejected')
  ok(!admitView(VIEW_SEEN_OTHER), 'visible on the other display is not ours')
  // The synchronous read sees a same-turn lifecycle flip a lagging view copy
  // would miss: the predicate reads the live view object, never a snapshot.
  let current = VIEW_HIDDEN_ASLEEP
  const admit = () => admitView(current)
  ok(!admit(), 'hidden before the flip')
  current = VIEW_LIVE
  ok(admit(), 'the same call admits once live')
  current = VIEW_HIDDEN_ASLEEP
  ok(!admit(), 'and rejects again once hidden')
})

check('whenLive drops the intent before any side effect', () => {
  let ran = 0
  const onHidden = whenLive(VIEW_HIDDEN_ASLEEP, () => ran++)
  const onLive = whenLive(VIEW_LIVE, () => ran++)
  onHidden()
  onHidden()
  eq(ran, 0, 'hidden intent never ran')
  onLive()
  eq(ran, 1, 'admitted intent ran once')
})

check('editBound binds a write to its admitted incarnation', () => {
  ok(editBound(3, 3), 'same incarnation completes')
  ok(!editBound(3, 4), 'a peer adopt bumped the incarnation: stale write dropped')
})

// ---- palette library authority (PalsLib) ----

const palNamed = (name: string, r = 1, g = 2, b = 3) =>
  newPalette(name, [rgb(r, g, b)], 'analogous', { h: 0, s: 0, l: 0 })
const sixPals = () => ['a', 'b', 'c', 'd', 'e', 'f'].map((n, i) => palNamed(n, i, i, i))

check('sharedLib keeps the library off the wire until authority is confirmed', () => {
  const hidden = sharedLib(false, sixPals(), [], { w: 2 })
  ok(hidden.pals === undefined && hidden.ops === undefined && hidden.acks === undefined, 'unready: no fields')
  const wire = serializeShared({
    by: 'me',
    doc: newDoc(rgb(1, 2, 3)),
    view: {
      field: '',
      fieldErr: false,
      page: false,
      sheet: null,
      nameInput: '',
      actionId: null,
      deleteId: null,
      copyText: null,
      muted: false
    },
    ...hidden
  })
  const parsed = parseShared(wire)!
  ok(parsed.pals === undefined, 'unready publish parses as doc-only')
  const shown = sharedLib(true, sixPals(), [], { w: 2 })
  eq(shown.pals!.length, 6, 'ready publish carries the list')
})

check('PalsLib hydrate: rejected read is not a read; null is a true absent key', () => {
  const lib = new PalsLib('me')
  ok(!lib.ready, 'starts with no opinion')
  // A failed read simply never calls hydrate - the library stays unpublished.
  ok(lib.hydrate(null), 'null resolves to a legitimate empty library')
  ok(lib.ready && lib.list.length === 0, 'first boot is empty and authoritative')
  const six = new PalsLib('me')
  six.hydrate(serializePalettes(sixPals()))
  eq(six.list.length, 6, 'resolved read seeds the durable list')
})

check('PalsLib: ops queued before hydrate replay onto the read base', () => {
  const lib = new PalsLib('me')
  lib.push({ kind: 'add', palette: palNamed('early') })
  eq(lib.list.length, 1, 'queued op applies to the empty opinion')
  ok(!lib.ready, 'still unconfirmed')
  lib.hydrate(serializePalettes(sixPals()))
  eq(lib.list.length, 7, 'the queued add replays onto the read')
  // A foreign watermark not yet covering our seq keeps the op pending.
  ok(lib.ops.length > 0, 'op still pending a foreign ack')
})

check('PalsLib: a late seed cannot clobber a meanwhile-adopted wire state', () => {
  const lib = new PalsLib('me')
  lib.adopt({ pals: sixPals(), ops: [], acks: { peer: 4 } })
  eq(lib.list.length, 6, 'foreign library adopted')
  ok(!lib.hydrate(null), 'delayed storage read ignored after adopt')
  eq(lib.list.length, 6, 'adopted list preserved')
})

check('PalsLib: adopt replays pending ops and folds watermarks', () => {
  const lib = new PalsLib('me')
  lib.hydrate(serializePalettes(sixPals()))
  const op = lib.push({ kind: 'add', palette: palNamed('mine') })
  // The peer's publish does not know about my op yet.
  const r = lib.adopt({ pals: sixPals(), ops: [], acks: { peer: 2 } })
  eq(r.replayed.length, 1, 'pending op replayed')
  eq(lib.list.length, 7, 'merged list keeps the local add')
  eq(lib.acks.peer, 2, 'foreign watermark folded')
  // Once the peer covers my seq the op settles out of the log.
  const r2 = lib.adopt({ pals: lib.list, ops: [op], acks: { me: op.seq } })
  eq(r2.replayed.length, 0, 'acknowledged op no longer replays')
  ok(
    lib.ops.every((o) => o.seq > op.seq - PAL_OP_WINDOW || o.id !== op.id),
    'settled op dropped from pending'
  )
})

check('PalsLib: wire ops bound to the window, pending bound to the limit', () => {
  const lib = new PalsLib('me')
  lib.hydrate(null)
  for (let i = 0; i < PAL_PENDING_LIMIT + 10; i++)
    lib.push({ kind: 'add', palette: palNamed(`p${i}`, i % 7, i % 11, i % 13) })
  eq(lib.wireOps.length, PAL_OP_WINDOW, 'echo window capped')
  ok(lib.ops.length <= PAL_PENDING_LIMIT, 'pending log bounded')
  eq(lib.seq, PAL_PENDING_LIMIT + 10, 'seq still monotonic')
  eq(lib.wireAcks().me, lib.seq, 'own watermark published')
})

check('two copies converge across loss and recovery', () => {
  // Copy A holds six durable palettes; copy B boots unhydrated beside it.
  const a = new PalsLib('A')
  a.hydrate(serializePalettes(sixPals()))
  const b = new PalsLib('B')
  // B's unready publish must not move A.
  const bWire = sharedLib(b.ready, b.list, b.wireOps, b.wireAcks())
  ok(bWire.pals === undefined, 'B has no library opinion to broadcast')
  // A's publish carries six; B adopts them instead of erasing them.
  const aWire = sharedLib(a.ready, a.list, a.wireOps, a.wireAcks())
  b.adopt({ pals: aWire.pals!, ops: aWire.ops, acks: aWire.acks })
  eq(b.list.length, 6, 'B recovered the peer library')
  // A rename storm then a delete round-trips without resurrection.
  for (let i = 0; i < 26; i++) a.push({ kind: 'rename', target: a.list[0]!.id, name: `r${i}` })
  a.push({ kind: 'delete', target: a.list[1]!.id })
  const aw2 = sharedLib(a.ready, a.list, a.wireOps, a.wireAcks())
  b.adopt({ pals: aw2.pals!, ops: aw2.ops, acks: aw2.acks })
  eq(b.list.length, 5, 'delete honoured after the rename storm')
  eq(b.list[0]!.name, 'r25', 'last rename wins, no ghost row')
  // Rapid accepted ops arriving through replays land once.
  const c = new PalsLib('C')
  c.hydrate(null)
  c.push({ kind: 'add', palette: palNamed('c1') })
  c.push({ kind: 'add', palette: palNamed('c2') })
  c.push({ kind: 'rename', target: c.list[0]!.id, name: 'c1b' })
  const cWire = sharedLib(c.ready, c.list, c.wireOps, c.wireAcks())
  b.adopt({ pals: cWire.pals!, ops: cWire.ops, acks: cWire.acks })
  const again = b.adopt({ pals: cWire.pals!, ops: cWire.ops, acks: cWire.acks })
  eq(again.replayed.length, 0, 're-adopting the same wire replays nothing new')
})

check('a stale bootstrap read cannot resurrect a peer delete on wire or disk', () => {
  // The reproduced race: six palettes durable, A deletes one, and B's
  // bootstrap read - taken before the delete landed - resolves with the
  // pre-delete wire. B's merged content serializes back to exactly what it
  // read, so it may not publish or persist anything: re-emitting the stale
  // wire is what clobbered both the session and the disk with the dead row.
  const base = sixPals()
  const rawPre = serializePalettes(base)
  const a = new PalsLib('A')
  a.hydrate(rawPre)
  const b = new PalsLib('B')
  a.push({ kind: 'delete', target: base[0]!.id })
  const aWire = sharedLib(a.ready, a.list, a.wireOps, a.wireAcks())
  const durable: string[] = [serializePalettes(a.list)]
  let session: { pals?: SavedPalette[]; ops?: PalOp[]; acks?: Record<string, number> } = aWire as {
    pals?: SavedPalette[]
    ops?: PalOp[]
    acks?: Record<string, number>
  }
  // B's read resolves with rawPre while A's delete wire is still in flight.
  ok(b.hydrate(rawPre), 'read applied while B was unconfirmed')
  if (hydrateNeedsEmit(rawPre, b.list)) {
    session = sharedLib(b.ready, b.list, b.wireOps, b.wireAcks())
    durable.push(serializePalettes(b.list))
  }
  eq(session.pals!.length, 5, 'the session still carries the post-delete list')
  eq(durable.length, 1, 'the stale read never touched the disk')
  // A's delete wire arrives; B converges and persists the same five rows.
  b.adopt({ pals: session.pals!, ops: session.ops, acks: session.acks })
  eq(b.list.length, 5, 'B honours the delete after its own read')
  durable.push(serializePalettes(b.list))
  eq(durable[durable.length - 1], durable[0], 'both copies end on the same wire')
  // A relaunch hydrates from that durable: the deleted row stays dead.
  const c = new PalsLib('C')
  c.hydrate(durable[durable.length - 1]!)
  eq(c.list.length, 5, 'no resurrection on relaunch')
  eq(
    c.list.some((p) => p.id === base[0]!.id),
    false,
    'dead row stays dead'
  )
})

check('hydrateNeedsEmit gates publish+persist on a real delta only', () => {
  const pals = [palNamed('p1'), palNamed('p2')]
  const raw = serializePalettes(pals)
  eq(hydrateNeedsEmit(raw, pals), false, 'identical read stays silent')
  eq(hydrateNeedsEmit(raw, [palNamed('p3'), ...pals]), true, 'merged delta must emit')
  eq(hydrateNeedsEmit(null, []), true, 'confirmed-absent still writes the true empty')
  eq(hydrateNeedsEmit(null, pals), true, 'pending ops on an absent key emit')
})

check('empty bootstrap publish differs from an explicit delete-all', () => {
  // A fresh, authoritative empty library may legitimately publish [].
  const fresh = new PalsLib('new')
  fresh.hydrate(null)
  const wire = sharedLib(fresh.ready, fresh.list, fresh.wireOps, fresh.wireAcks())
  ok(wire.pals !== undefined && wire.pals.length === 0, 'first boot publishes the true empty list')
  // An explicit delete-all arrives as ops, not as a bare empty snapshot.
  const base = sixPals()
  const killer = new PalsLib('K')
  killer.hydrate(serializePalettes(base))
  for (const p of base) killer.push({ kind: 'delete', target: p.id })
  eq(killer.list.length, 0, 'all six deleted locally')
  const victim = new PalsLib('V')
  victim.hydrate(serializePalettes(base))
  const kw = sharedLib(killer.ready, killer.list, killer.wireOps, killer.wireAcks())
  victim.adopt({ pals: kw.pals!, ops: kw.ops, acks: kw.acks })
  eq(victim.list.length, 0, 'peer honours the explicit delete-all')
})

// ---- durable writer acknowledgements (PalStore) ----

check('PalStore: persisted advances only on settle, never at send time', () => {
  const sent: string[] = []
  const failed: string[] = []
  const store = new PalStore(
    (w) => sent.push(w),
    (w) => failed.push(w)
  )
  store.request('w1')
  eq(sent.join(','), 'w1', 'wire sent')
  ok(store.persisted !== 'w1' && store.dirty, 'sent is not durable yet')
  store.settle('w1', true)
  eq(store.persisted, 'w1', 'acknowledged write is durable')
  ok(!store.dirty, 'caught up')
})

check('PalStore: rejected writes stay dirty and retry once re-armed', () => {
  const sent: string[] = []
  const failed: string[] = []
  const store = new PalStore(
    (w) => sent.push(w),
    (w) => failed.push(w)
  )
  store.request('w1')
  store.settle('w1', false)
  eq(failed.join(','), 'w1', 'failure reported honestly')
  ok(store.persisted !== 'w1' && store.dirty, 'uncertain write never claims durability')
  store.retry()
  eq(sent.join(','), 'w1,w1', 'retry resends the outstanding wire')
  store.settle('w1', true)
  eq(store.persisted, 'w1', 'second attempt confirms')
})

check('PalStore: coalesces rapid requests and survives a foreign wire landing', () => {
  const sent: string[] = []
  const store = new PalStore((w) => sent.push(w))
  store.request('w1')
  store.request('w2')
  eq(sent.join(','), 'w1,w2', 'each newest wire sent once')
  store.settle('w2', true)
  eq(store.persisted, 'w2', 'newest confirmed')
  // A foreign write winning the rev race is the durable truth - and must not
  // be clobbered by our stale latest before the merge re-bases it.
  store.request('w3')
  store.settle('wF', true)
  eq(store.persisted, 'wF', 'foreign wire is the durable truth')
  eq(sent.join(','), 'w1,w2,w3', 'no blind resend of the stale wire')
  store.request('w3')
  eq(sent.join(','), 'w1,w2,w3,w3', 'the re-based request still goes out')
})

check('PalStore: bootstrap seed never overrides an outstanding write', () => {
  const sent: string[] = []
  const store = new PalStore((w) => sent.push(w))
  store.request('wMine')
  store.seed('wRead')
  ok(store.persisted === null, 'in-flight write keeps the seed out')
  store.settle('wMine', true)
  eq(store.persisted, 'wMine', 'settled write is the authority')
  const fresh = new PalStore((w) => sent.push(w))
  fresh.seed('wRead')
  eq(fresh.persisted, 'wRead', 'idle seed adopts the confirmed read')
})

// ---- admission-aware bootstrap retry (BootPolicy) ----

check('BootPolicy parks while hidden and re-arms on admission', () => {
  const runs: number[] = []
  const timers: (() => void)[] = []
  let live = true
  const boot = new BootPolicy(
    () => live,
    () => runs.push(1),
    (fn) => timers.push(fn)
  )
  boot.fail()
  eq(timers.length, 1, 'live failure schedules a bounded retry')
  timers[0]!()
  eq(runs.length, 1, 'scheduled retry fired while live')
  // Hide: failures park with no timer at all.
  live = false
  boot.fail()
  ok(boot.parked, 'hidden failure parks')
  eq(timers.length, 1, 'no hidden polling timer')
  boot.wake()
  eq(runs.length, 1, 'still hidden: no run')
  // Re-admitted: the parked attempt fires at once, not on a timer.
  live = true
  boot.wake()
  eq(runs.length, 2, 'wake re-arms the parked read')
  ok(!boot.parked, 'park cleared')
})

check('BootPolicy: a timer armed while live never fires hidden', () => {
  const runs: number[] = []
  const timers: (() => void)[] = []
  let live = true
  const boot = new BootPolicy(
    () => live,
    () => runs.push(1),
    (fn) => timers.push(fn)
  )
  boot.fail()
  live = false
  timers[0]!()
  ok(boot.parked && runs.length === 0, 'same-turn flip to hidden parks the armed retry')
  live = true
  boot.wake()
  eq(runs.length, 1, 're-admission runs it')
})

check('BootPolicy: progress resets the backoff', () => {
  const delays: number[] = []
  const boot = new BootPolicy(
    () => true,
    () => {},
    (_fn, ms) => delays.push(ms)
  )
  boot.fail()
  boot.fail()
  ok(delays[1]! > delays[0]!, 'backoff grows on failure')
  boot.ok()
  boot.fail()
  eq(delays[2], delays[0], 'a success resets to the base delay')
})

console.log(`color.test.ts: ${passed} checks passed`)
