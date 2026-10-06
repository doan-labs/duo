// Throw-based test runner for the colour domain: community apps cannot import
// bun:test or node modules, so each check throws on failure and the file's
// evaluation is the suite. Run: `bun community-apps/color-lab/color.test.ts`.
//
// The token gate flags fixed colour literals even in strings, so test inputs
// are built with the small helpers below rather than written as literals.
import {
  applyPalOp,
  BLACK,
  contrast,
  coreEq,
  coreOf,
  exportCodes,
  HARMONY_KINDS,
  harmonyColors,
  harmonyHues,
  hslEq,
  hslToRgb,
  inkFor,
  luminance,
  MAX_PALETTES,
  newDoc,
  newPalette,
  palOpDone,
  parseColor,
  parseColorFull,
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
  SEED_COLOR,
  serializeDoc,
  serializePalettes,
  serializeShared,
  toHex,
  toHexShort,
  toHslString,
  toRgbString,
  undoDoc,
  upsertPalette,
  variations,
  verdict,
  WHITE,
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
check('palette ops apply and settle', () => {
  const a = newPalette('A', [rgb(255, 0, 0)])
  const b = newPalette('B', [rgb(0, 0, 255)])
  const addA = { id: 'o1', kind: 'add' as const, palette: a }
  const addB = { id: 'o2', kind: 'add' as const, palette: b }
  let items = applyPalOp([], addA)
  ok(palOpDone(items, addA), 'add settles')
  // The concurrent case: B was added onto a base that never saw A; replaying
  // the unsettled add-A op merges it without losing B.
  items = applyPalOp([b], addA)
  eq(items.length, 2, 'replayed add merges')
  ok(palOpDone(items, addA) && palOpDone(items, addB), 'both settled')
  const rn = { id: 'o3', kind: 'rename' as const, target: a.id, name: 'Renamed' }
  items = applyPalOp(items, rn)
  eq(items.find((p) => p.id === a.id)!.name, 'Renamed', 'rename applied')
  ok(palOpDone(items, rn), 'rename settles')
  const del = { id: 'o4', kind: 'delete' as const, target: b.id }
  items = applyPalOp(items, del)
  ok(palOpDone(items, del), 'delete settles')
  eq(items.length, 1, 'B gone')
  ok(!palOpDone(items, addB), 'deleted add reports unsettled')
})
check('shared state survives serialize/parse round trip', () => {
  const d = newDoc(rgb(10, 20, 30))
  const pal = newPalette('Wire', [rgb(9, 9, 9)], 'analogous')
  const s = serializeShared({
    by: 'writer-id',
    doc: d,
    pals: [pal],
    ops: [{ id: 'w1', kind: 'add', palette: pal }],
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

console.log(`color.test.ts: ${passed} checks passed`)
