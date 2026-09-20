import { WALL_KEY } from '@doan-labs/duo-uikit/icons/index.ts'
import * as THREE from 'three'
import { widgetAge } from '../uikit/widget.tsx'
import { byName, DOCK } from './apps.ts'
import { widgetSnapshot } from './runtime/widgets.tsx'
import { grid, isFolder, type Slot } from './springboard/grid.ts'

// Scene units are metres; PX converts a millimetre to canvas pixels.
const PX = 12
const M = 1000 * PX
const mm = (v: number) => v * PX
const BEZEL = mm(2.2)
// Active-area corners: the glass radius (10.7 mm inner, 11.4 mm outer, 1.3 mm on
// the outer's hinge edge) minus the bezel, so the bezel reads as an even ring.
const RADIUS = mm(8.5)
const OUTER_RADII = [mm(0.5), mm(9.2), mm(9.2), mm(0.5)]

// This layer shows while the hinge moves, when the live DOM panel cannot bend,
// so every number below is os.ts's — in the same CSS px, scaled by the ratio of
// the two resolutions (12 px/mm baked against 5 px/mm live). Change one, change
// both, or the home screen visibly jumps at the start of a fold.
const S = PX / 5
const u = (v: number) => v * S
const ICON = 51
const CELL = 70
const ROW = 78
const SEAM = 36
const TOP = 47
const WID = 127
const DOCKW = 57
const DOCKR = 10

const FONT = '-apple-system, "SF Pro", system-ui, sans-serif'
/** Decoded app icons, keyed by name. */
export type Icons = Record<string, HTMLImageElement>

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function grad(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][]
) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [t, c] of stops) g.addColorStop(t, c)
  return g
}

/**
 * The wallpaper, `background-size:cover` in canvas form. `posX` is
 * the horizontal anchor, matching --wpos: the cover display shows the same part
 * of the picture the inner display's left half does, so folding moves nothing.
 */
function paper(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, posX: number) {
  ctx.fillStyle = '#3a3632'
  ctx.fillRect(0, 0, w, h)
  if (img.width) {
    const s = Math.max(w / img.width, h / img.height)
    ctx.drawImage(img, (w - img.width * s) * posX, (h - img.height * s) / 2, img.width * s, img.height * s)
  }
  // iOS dims the home-screen wallpaper, which is what keeps white labels legible.
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [
    [0, 'rgba(0,0,0,0.34)'],
    [0.4, 'rgba(0,0,0,0.04)'],
    [1, 'rgba(0,0,0,0.36)']
  ])
  ctx.fillRect(0, 0, w, h)
}

/**
 * Liquid Glass slab: the blurred wallpaper shows through, an optional colour
 * tint sits on top, then a soft top-left specular and a bright refracting rim.
 */
function glass(
  ctx: CanvasRenderingContext2D,
  blur: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  tint?: [string, string]
) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = Math.min(w, h) * 0.3
  ctx.shadowOffsetY = Math.min(w, h) * 0.07
  ctx.fillStyle = '#000'
  rr(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.restore()

  ctx.save()
  rr(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.drawImage(blur, 0, 0)
  if (tint) {
    ctx.globalAlpha = 0.86
    ctx.fillStyle = grad(ctx, x, y, x, y + h, [
      [0, tint[0]],
      [1, tint[1]]
    ])
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
  }
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = 1
  const hl = ctx.createRadialGradient(x + w * 0.3, y, 0, x + w * 0.3, y, Math.max(w, h) * 0.85)
  hl.addColorStop(0, 'rgba(255,255,255,0.42)')
  hl.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hl
  ctx.fillRect(x, y, w, h)
  // Stroke on the clip edge: only the inner half survives, giving a thin rim.
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.03)
  ctx.strokeStyle = grad(ctx, x, y, x, y + h, [
    [0, 'rgba(255,255,255,0.9)'],
    [0.5, 'rgba(255,255,255,0.28)'],
    [1, 'rgba(255,255,255,0.62)']
  ])
  rr(ctx, x, y, w, h, r)
  ctx.stroke()
  ctx.restore()
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.save() // textAlign is centre in here and left everywhere else
  ctx.font = `600 ${u(11)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = u(3)
  ctx.shadowOffsetY = u(1)
  ctx.fillStyle = '#fff'
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** One home-screen cell: Apple's artwork, which carries its own squircle. */
function cell(
  ctx: CanvasRenderingContext2D,
  imgs: Icons,
  name: string,
  col: number,
  row: number,
  x0: number,
  y0: number
) {
  const x = x0 + col * u(CELL) + (u(CELL) - u(ICON)) / 2
  const y = y0 + row * u(ROW)
  const img = imgs[name]
  if (img?.width) ctx.drawImage(img, x, y, u(ICON), u(ICON))
  label(ctx, name, x + u(ICON) / 2, y + u(ICON) + u(4))
}

/** A folder tile: a translucent slab holding its first nine icons. */
function folder(
  ctx: CanvasRenderingContext2D,
  blur: HTMLCanvasElement,
  imgs: Icons,
  names: string[],
  name: string,
  col: number,
  row: number,
  x0: number,
  y0: number
) {
  const x = x0 + col * u(CELL) + (u(CELL) - u(ICON)) / 2
  const y = y0 + row * u(ROW)
  const s = u(ICON)
  glass(ctx, blur, x, y, s, s, u(14))
  const pad = u(4)
  const g = u(2)
  const mini = (s - 2 * pad - 2 * g) / 3
  names.slice(0, 9).forEach((n, i) => {
    const img = imgs[n]
    if (img?.width)
      ctx.drawImage(img, x + pad + (i % 3) * (mini + g), y + pad + Math.floor(i / 3) * (mini + g), mini, mini)
  })
  label(ctx, name, x + s / 2, y + s + u(4))
}

/** Wi-Fi in a battery ring with cellular dots below — the status glyph. */
function radios(ctx: CanvasRenderingContext2D, cx: number, top: number) {
  const k = u(34) / 44 // the glyph is authored on a 44-wide viewBox in os.ts
  ctx.save()
  ctx.translate(cx - 22 * k, top)
  ctx.scale(k, k)
  ctx.strokeStyle = ctx.fillStyle = '#fff'
  ctx.lineCap = 'round'
  // Same arcs as the SVG in os.ts, solved for centre and sweep: the ring is
  // open at the bottom, where the cellular dots sit.
  ctx.beginPath()
  ctx.arc(22, 27.76, 17, Math.PI * 0.755, Math.PI * 2.245)
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.lineWidth = 2.5
  for (const [r, cy] of [
    [13, 31.55],
    [8, 32.46],
    [3, 33.34]
  ] as [number, number][]) {
    ctx.beginPath()
    ctx.arc(22, cy, r, Math.PI * 1.28, Math.PI * 1.72)
    ctx.stroke()
  }
  for (const [x, y] of [
    [13.4, 46.6],
    [19.1, 48.4],
    [24.9, 48.4],
    [30.6, 46.6]
  ] as [number, number][]) {
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Bakes a display: black bezel with rounded glass corners, the wallpaper and
 * the iPhone Duo home screen. `width`/`height` are the glass size in metres;
 * `wide` picks the inner display, which also shows the right half of the grid.
 */
/** Date, glass numerals, torch and camera buttons, home bar: .lock in os.ts. */
function lockScreen(
  ctx: CanvasRenderingContext2D,
  blur: HTMLCanvasElement,
  X: number,
  Y: number,
  W: number,
  H: number,
  wide: boolean,
  now: Date,
  clock: string
) {
  const cx = X + W / 2
  const T = u(wide ? 96 : 72)
  const pad = u(wide ? 34 : 64)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = u(4)
  ctx.font = `600 ${u(15)}px ${FONT}`
  ctx.fillText(
    now.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
    cx,
    Y + pad
  )
  // The padlock, 14 x 17 like os.ts's .lpad: body, then the shackle as an arc.
  const py = Y + pad - u(21)
  rr(ctx, cx - u(7), py + u(6.6), u(14), u(10.4), u(2.6))
  ctx.fill()
  ctx.lineWidth = u(1.5)
  ctx.strokeStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, py + u(5.2), u(3), Math.PI, 0)
  ctx.lineTo(cx + u(3), py + u(7))
  ctx.moveTo(cx - u(3), py + u(5.2))
  ctx.lineTo(cx - u(3), py + u(7))
  ctx.stroke()
  const ty = Y + pad + u(15 * 1.3)
  ctx.shadowColor = 'rgba(20,20,40,0.35)'
  ctx.shadowBlur = u(14)
  ctx.shadowOffsetY = u(3)
  ctx.font = `700 ${T}px ${FONT}`
  ctx.letterSpacing = `${-T * 0.03}px`
  ctx.fillStyle = grad(ctx, 0, ty, 0, ty + T, [
    [0, 'rgba(255,255,255,0.92)'],
    [1, 'rgba(255,255,255,0.45)']
  ])
  ctx.fillText(clock, cx, ty)
  ctx.letterSpacing = '0px'
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Buttons: a column on the free edge when wide, the two bottom corners when not.
  const r = u(23)
  const spots: [number, number][] = wide
    ? [
        [X + W - u(20) - r, Y + H - u(22) - r - u(14) - 2 * r],
        [X + W - u(20) - r, Y + H - u(22) - r]
      ]
    : [
        [X + u(42) + r, Y + H - u(44) - r],
        [X + W - u(42) - r, Y + H - u(44) - r]
      ]
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = u(1.7)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  spots.forEach(([bx, by], i) => {
    glass(ctx, blur, bx - r, by - r, 2 * r, 2 * r, r, ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.28)'])
    const k = u(22) / 24 // the 24-unit SVG glyphs in os.ts, at 22 px
    const g = (x: number, y: number): [number, number] => [bx - u(11) + x * k, by - u(11) + y * k]
    ctx.beginPath()
    if (i === 0) {
      ctx.moveTo(...g(8, 2.5))
      ctx.lineTo(...g(16, 2.5))
      ctx.lineTo(...g(16, 5.7))
      ctx.lineTo(...g(13.8, 9.4))
      ctx.lineTo(...g(13.8, 21))
      ctx.arc(...g(12, 21), 1.8 * k, 0, Math.PI)
      ctx.lineTo(...g(10.2, 9.4))
      ctx.lineTo(...g(8, 5.7))
      ctx.closePath()
      ctx.moveTo(...g(8, 5.7))
      ctx.lineTo(...g(16, 5.7))
    } else {
      ctx.roundRect(...g(3.5, 7), 17 * k, 12 * k, 1.5 * k)
      ctx.moveTo(...g(7.6, 7))
      ctx.lineTo(...g(9.1, 4.8))
      ctx.lineTo(...g(14.9, 4.8))
      ctx.lineTo(...g(16.4, 7))
      ctx.moveTo(...g(15.4, 12.8))
      ctx.arc(...g(12, 12.8), 3.4 * k, 0, Math.PI * 2)
    }
    ctx.stroke()
  })

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  rr(ctx, cx - u(60), Y + H - u(12), u(120), u(5), u(3))
  ctx.fill()
}

/**
 * One display's home screen, or with `lock` its lock screen, on a canvas.
 * Both are drawn from the same numbers os.ts lays out with, see above.
 */
export function screen(width: number, height: number, wide: boolean, imgs: Icons, lock = false) {
  const w = Math.round(width * M)
  const h = Math.round(height * M)
  if (w < 200 || h < 200) throw new Error(`screen expects metres, got ${width}x${height}`)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  // Wallpaper, plus a blurred copy that shows through every glass element.
  const wall = document.createElement('canvas')
  wall.width = w
  wall.height = h
  paper(wall.getContext('2d')!, imgs[WALL_KEY]!, w, h, wide ? 0.5 : 0.22)
  const blur = document.createElement('canvas')
  blur.width = w
  blur.height = h
  const bctx = blur.getContext('2d')!
  bctx.filter = `blur(${mm(1.4)}px)`
  bctx.drawImage(wall, 0, 0)

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  rr(ctx, BEZEL, BEZEL, w - 2 * BEZEL, h - 2 * BEZEL, wide ? RADIUS : OUTER_RADII)
  ctx.clip()
  ctx.drawImage(wall, 0, 0)

  // Everything below is positioned inside the glass, like .disp in os.ts.
  const X = BEZEL
  const Y = BEZEL
  const W = w - 2 * BEZEL
  const H = h - 2 * BEZEL

  // Status stack, top right: camera, time, radios. The inner camera is
  // under-display, so only the cover half draws the punch-hole.
  // The cover's camera is 5.5 mm from the free edge, so its stack sits 11 px in; the inner keeps 24.
  const sx = X + W - u(wide ? 24 : 11) - u(17)
  let sy = Y + u(18)
  if (!wide) {
    ctx.beginPath()
    ctx.arc(sx, sy + u(11.5), u(11.5), 0, Math.PI * 2)
    ctx.fillStyle = '#000'
    ctx.fill()
    sy += u(23 + 2 + 5)
  }
  const now = new Date()
  const clock = now.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }).replace(/ [AP]M/, '')
  ctx.fillStyle = '#fff'
  ctx.font = `600 ${u(12)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(clock, sx, sy)
  radios(ctx, sx, sy + u(13 * 1.3 + 5))

  if (lock) {
    lockScreen(ctx, blur, X, Y, W, H, wide, now, clock)
    ctx.restore()
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  // The grid, anchored left. Two 2x2 widgets take rows 1-2 of the left half.
  const padl = u(wide ? 48 : 7)
  const x0 = X + padl
  const y0 = Y + u(TOP)
  const wsize = u(WID)
  const wtop = y0 - u(4)
  const wx = (i: number) => x0 + i * 2 * u(CELL) + (2 * u(CELL) - wsize) / 2

  // Weather widget.
  const weather = widgetSnapshot()
  glass(ctx, blur, wx(0), wtop, wsize, wsize, u(23), ['#377aaf', '#20395b'])
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'
  ctx.font = `600 ${u(11)}px ${FONT}`
  ctx.fillText(weather.lines[0]?.text ?? '', wx(0) + u(12), wtop + u(12), wsize - u(24))
  ctx.font = `300 ${u(34)}px ${FONT}`
  ctx.fillText(weather.lines[1]?.text ?? '', wx(0) + u(12), wtop + u(26))
  ctx.font = `600 ${u(11)}px ${FONT}`
  ctx.fillText(weather.lines[2]?.text ?? '', wx(0) + u(12), wtop + wsize - u(34))
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.fillText(widgetAge(weather.updatedAt) || weather.lines[3]?.text || '', wx(0) + u(12), wtop + wsize - u(19))
  label(ctx, 'Weather', wx(0) + wsize / 2, wtop + wsize + u(4))

  // Calendar widget, matching the live one in os.ts.
  glass(ctx, blur, wx(1), wtop, wsize, wsize, u(23), ['rgba(255,255,255,0.86)', 'rgba(255,255,255,0.76)'])
  ctx.fillStyle = '#ff383c'
  ctx.font = `600 ${u(11)}px ${FONT}`
  ctx.fillText(now.toLocaleDateString('en', { weekday: 'long' }).toUpperCase(), wx(1) + u(12), wtop + u(12))
  ctx.fillStyle = '#000'
  ctx.font = `600 ${u(31)}px ${FONT}`
  ctx.fillText(String(now.getDate()), wx(1) + u(10), wtop + u(26))
  ctx.fillStyle = '#ff8d28'
  ctx.fillRect(wx(1) + u(12), wtop + wsize - u(38), u(3), u(27))
  ctx.font = `600 ${u(10)}px ${FONT}`
  ctx.fillStyle = '#000'
  ctx.fillText('Duo keynote', wx(1) + u(19), wtop + wsize - u(37))
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.font = `400 ${u(10)}px ${FONT}`
  ctx.fillText('10:00 Apple Park', wx(1) + u(19), wtop + wsize - u(23))

  // Left half sits under the widgets, from row 3; the right half starts at row 1
  // one seam further across, so nothing lands on the hinge. The cells are the
  // grid as arranged, folders and all: the same snapshot the live home draws.
  const cells = grid()
  const named = (k: string) => byName(k)?.name ?? k
  const half = (slots: Slot[], x: number, row0: number) =>
    slots.forEach((s, i) => {
      const [col, row] = [i % 4, row0 + Math.floor(i / 4)]
      if (isFolder(s)) folder(ctx, blur, imgs, s.apps.map(named), s.name, col, row, x, y0)
      else cell(ctx, imgs, named(s), col, row, x, y0)
    })
  half(cells.left, x0, 2)
  if (wide) half(cells.right, x0 + 4 * u(CELL) + u(SEAM), 0)

  // Page dots, centred on the content rather than the glass: folded, the second
  // page is the half the cover display cannot show.
  const dockx = X + W - u(DOCKR) - u(DOCKW)
  if (!wide) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath()
      ctx.arc((X + dockx) / 2 + (i - 0.5) * u(13), Y + H - u(24), u(3), 0, Math.PI * 2)
      ctx.fillStyle = i ? 'rgba(255,255,255,0.35)' : '#fff'
      ctx.fill()
    }
  }

  // Dock: vertical, clear glass, hugging the hinge-free edge.
  const dockh = u(8 + DOCK.length * 41 + (DOCK.length - 1) * 9 + 8)
  const docky = Y + H * 0.525 - dockh / 2
  glass(ctx, blur, dockx, docky, u(DOCKW), dockh, u(21))
  DOCK.forEach((a, i) => {
    const img = imgs[a.name]
    if (img?.width) ctx.drawImage(img, dockx + u((DOCKW - 41) / 2), docky + u(8 + i * 50), u(41), u(41))
  })

  // Spotlight button.
  const bx = X + W - u(16) - u(22)
  const by = Y + H - u(15) - u(22)
  glass(ctx, blur, bx - u(22), by - u(22), u(44), u(44), u(22))
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = u(2)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(bx - u(1.3), by - u(1.3), u(5.8), 0, Math.PI * 2)
  ctx.moveTo(bx + u(2.9), by + u(2.9))
  ctx.lineTo(bx + u(7.4), by + u(7.4))
  ctx.stroke()

  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
