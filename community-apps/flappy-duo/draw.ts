// Canvas 2D rendering. drawWorld() is the scene, drawOverlay() stays crisp above the blur.
import {
  BANNER_LIFE,
  type Banner,
  type Cameo,
  DUO_X,
  FLOOR,
  gapCenter,
  gapFor,
  PHONE,
  SLAB_WIDTH,
  type World
} from './config.ts'

export const FONT = '-apple-system, system-ui, sans-serif'
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// The Duo seen from the front, hinge in the middle, halves as wings.
export function drawPhone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  span: number,
  vy: number,
  fold: number,
  dead: boolean,
  t: number
) {
  const half = span / 2
  const thick = span * 0.36
  const wing = dead ? 1.25 : Math.sin(Math.min(1, fold) * Math.PI) * 0.95
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dead ? Math.min(1.4, 0.4 + vy) : Math.max(-0.35, Math.min(0.9, vy * 1.1)))
  for (const side of [-1, 1] as const) {
    ctx.save()
    ctx.rotate(-wing * side)
    const x0 = side === -1 ? -half : 0
    const body = ctx.createLinearGradient(x0, -thick / 2, x0 + half, thick / 2)
    body.addColorStop(0, '#f7f7fa')
    body.addColorStop(1, '#c9cad3')
    ctx.fillStyle = body
    roundRect(ctx, x0, -thick / 2, half, thick, thick * 0.22)
    ctx.fill()
    ctx.lineWidth = Math.max(1, span * 0.012)
    ctx.strokeStyle = 'rgba(255,255,255,.9)'
    ctx.stroke()
    const inset = thick * 0.09
    if (side === 1) {
      // outer display, lit
      const screen = ctx.createLinearGradient(0, -thick / 2, half, thick / 2)
      screen.addColorStop(0, '#0b1a3a')
      screen.addColorStop(0.5, '#1d5fa8')
      screen.addColorStop(1, '#8be7ff')
      ctx.fillStyle = screen
      roundRect(ctx, inset, -thick / 2 + inset, half - inset * 2, thick - inset * 2, thick * 0.16)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.92)'
      ctx.font = `600 ${Math.round(thick * 0.28)}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(dead ? ':(' : '9:41', half / 2, 0)
    } else {
      // back, with the camera plateau
      ctx.fillStyle = 'rgba(0,0,0,.08)'
      roundRect(ctx, x0 + inset, -thick / 2 + inset, half - inset * 2, thick - inset * 2, thick * 0.16)
      ctx.fill()
      ctx.fillStyle = '#9a9ba6'
      roundRect(ctx, x0 + thick * 0.18, -thick * 0.34, thick * 0.42, thick * 0.68, thick * 0.12)
      ctx.fill()
      ctx.fillStyle = '#1d1e26'
      for (const cy of [-0.16, 0.16]) {
        ctx.beginPath()
        ctx.arc(x0 + thick * 0.39, thick * cy, thick * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }
  // hinge cap with a rainbow sheen, like light through the glass
  const cap = thick * 0.28
  const sheen = ctx.createLinearGradient(0, -cap, 0, cap)
  const hue = (t * 60) % 360
  sheen.addColorStop(0, `hsla(${hue},90%,70%,.95)`)
  sheen.addColorStop(0.5, `hsla(${(hue + 120) % 360},90%,70%,.95)`)
  sheen.addColorStop(1, `hsla(${(hue + 240) % 360},90%,70%,.95)`)
  ctx.fillStyle = sheen
  roundRect(ctx, -span * 0.02, -cap, span * 0.04, cap * 2, span * 0.02)
  ctx.fill()
  ctx.restore()
}

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  // One path for all puffs so the overlaps do not show through.
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  for (const [dx, dy, r] of [
    [0, 0, 1],
    [0.9, 0.1, 0.75],
    [-0.9, 0.15, 0.7],
    [0.4, -0.45, 0.65],
    [-0.4, -0.4, 0.6]
  ] as const) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s)
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

export function drawSlab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  w: number,
  h: number,
  label: string,
  t: number,
  cap: 'top' | 'bottom'
) {
  if (h <= 0) return
  const glass = ctx.createLinearGradient(x, 0, x + w, 0)
  glass.addColorStop(0, 'rgba(230,242,255,.55)')
  glass.addColorStop(0.35, 'rgba(255,255,255,.85)')
  glass.addColorStop(0.5, 'rgba(210,232,255,.5)')
  glass.addColorStop(1, 'rgba(180,210,240,.6)')
  ctx.fillStyle = glass
  ctx.fillRect(x, y0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,.95)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(x + 0.75, y0 + 0.75, w - 1.5, h - 1.5)
  // rainbow edge line running down the slab
  const hue = (t * 40 + x) % 360
  const edge = ctx.createLinearGradient(0, y0, 0, y0 + h)
  edge.addColorStop(0, `hsla(${hue},95%,65%,.8)`)
  edge.addColorStop(0.5, `hsla(${(hue + 120) % 360},95%,65%,.8)`)
  edge.addColorStop(1, `hsla(${(hue + 240) % 360},95%,65%,.8)`)
  ctx.fillStyle = edge
  ctx.fillRect(x + w * 0.12, y0, Math.max(2, w * 0.05), h)
  // the lip facing the gap
  const lip = Math.max(6, w * 0.22)
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  ctx.fillRect(x - w * 0.08, cap === 'top' ? y0 + h - lip : y0, w * 1.16, lip)
  ctx.fillStyle = 'rgba(120,170,230,.45)'
  ctx.fillRect(x - w * 0.08, cap === 'top' ? y0 + h - lip : y0 + lip - 2, w * 1.16, 2)
  // label, engraved vertically
  if (h > w * 2.6) {
    ctx.save()
    ctx.translate(x + w * 0.62, y0 + h / 2 + (cap === 'top' ? -lip / 2 : lip / 2))
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = 'rgba(30,60,110,.55)'
    ctx.font = `800 ${Math.round(w * 0.36)}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 0, 0, h - lip - 12)
    ctx.restore()
  }
}

// Cartoon executive peeking down from behind the top slab. Skin, hair, glasses. Nothing else.
export function drawCameo(ctx: CanvasRenderingContext2D, who: Cameo, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.translate(cx, cy)
  // head
  ctx.fillStyle = '#f1c9a5'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  // hair
  ctx.fillStyle = who === 'tim' ? '#d9d9de' : who === 'john' ? '#3b2a20' : '#9a9aa0'
  ctx.beginPath()
  if (who === 'steve') {
    ctx.arc(-r * 0.85, -r * 0.1, r * 0.3, 0, Math.PI * 2)
    ctx.arc(r * 0.85, -r * 0.1, r * 0.3, 0, Math.PI * 2)
  } else {
    ctx.arc(0, -r * 0.15, r, Math.PI * 1.05, Math.PI * 1.95)
    ctx.lineTo(r * 0.95, -r * 0.35)
    ctx.lineTo(-r * 0.95, -r * 0.35)
  }
  ctx.fill()
  if (who === 'steve') {
    // beard
    ctx.fillStyle = 'rgba(120,120,128,.8)'
    ctx.beginPath()
    ctx.arc(0, r * 0.25, r * 0.85, Math.PI * 0.15, Math.PI * 0.85)
    ctx.fill()
  }
  // eyes
  ctx.fillStyle = '#1d1e26'
  for (const ex of [-0.35, 0.35]) {
    ctx.beginPath()
    ctx.arc(ex * r, -r * 0.05, r * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }
  // glasses
  if (who !== 'john') {
    ctx.strokeStyle = who === 'steve' ? '#1d1e26' : 'rgba(80,80,90,.7)'
    ctx.lineWidth = Math.max(1, r * 0.08)
    for (const ex of [-0.35, 0.35]) {
      ctx.beginPath()
      ctx.arc(ex * r, -r * 0.05, r * 0.26, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(-r * 0.09, -r * 0.05)
    ctx.lineTo(r * 0.09, -r * 0.05)
    ctx.stroke()
  }
  // mouth
  ctx.strokeStyle = '#8a4b3a'
  ctx.lineWidth = Math.max(1, r * 0.08)
  ctx.beginPath()
  if (who === 'john') ctx.arc(0, r * 0.3, r * 0.35, Math.PI * 0.15, Math.PI * 0.85)
  else if (who === 'tim') ctx.arc(0, r * 0.35, r * 0.25, Math.PI * 0.2, Math.PI * 0.8)
  else {
    ctx.moveTo(-r * 0.25, r * 0.45)
    ctx.lineTo(r * 0.25, r * 0.45)
  }
  ctx.stroke()
  ctx.restore()
}

// A fake iOS notification that drops in over the action and blocks the view.
export function drawBanner(ctx: CanvasRenderingContext2D, b: Banner, width: number, height: number) {
  const bw = Math.min(width * 0.58, 380)
  const bh = Math.max(44, height * 0.115)
  const enter = Math.min(1, (BANNER_LIFE - b.life) * 4)
  const leave = Math.min(1, b.life * 3)
  const ease = 1 - (1 - enter) ** 3
  const y = b.y * height - (1 - ease) * bh * 1.6 - (1 - leave) * bh * 1.6
  const x = (width - bw) / 2
  const pad = bh * 0.2
  const icon = bh - pad * 2
  ctx.save()
  ctx.globalAlpha = Math.min(enter, leave)
  ctx.shadowColor = 'rgba(20,60,120,.3)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.fillStyle = 'rgba(255,255,255,.94)'
  roundRect(ctx, x, y, bw, bh, bh * 0.36)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  const g = ctx.createLinearGradient(x + pad, y + pad, x + pad + icon, y + pad + icon)
  g.addColorStop(0, '#ff5f6d')
  g.addColorStop(1, '#ffc371')
  ctx.fillStyle = g
  roundRect(ctx, x + pad, y + pad, icon, icon, icon * 0.28)
  ctx.fill()
  const tx = x + pad * 2 + icon
  const tw = bw - icon - pad * 3.5
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#0b1a3a'
  ctx.font = `700 ${Math.round(bh * 0.26)}px ${FONT}`
  ctx.fillText(b.title, tx, y + pad * 0.95, tw)
  ctx.fillStyle = '#3a4a66'
  // shrink the body until it fits instead of letting canvas squash the glyphs
  let size = Math.round(bh * 0.23)
  ctx.font = `500 ${size}px ${FONT}`
  while (size > 9 && ctx.measureText(b.text).width > tw) {
    size -= 1
    ctx.font = `500 ${size}px ${FONT}`
  }
  ctx.fillText(b.text, tx, y + pad * 0.95 + bh * 0.3)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#8a95a8'
  ctx.font = `500 ${Math.round(bh * 0.2)}px ${FONT}`
  ctx.fillText('now', x + bw - pad, y + pad)
  ctx.restore()
}

export function drawWorld(ctx: CanvasRenderingContext2D, w: World, width: number, height: number, t: number) {
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  if (w.slow > 0.4) ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14)

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#3d86d6')
  sky.addColorStop(0.55, '#9ccdf2')
  sky.addColorStop(1, '#eaf5ff')
  ctx.fillStyle = sky
  ctx.fillRect(-40, -40, width + 80, height + 80)

  const sun = ctx.createRadialGradient(width * 0.82, height * 0.12, 0, width * 0.82, height * 0.12, height * 0.5)
  sun.addColorStop(0, 'rgba(255,250,225,.95)')
  sun.addColorStop(0.15, 'rgba(255,245,210,.5)')
  sun.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, width, height)

  for (const c of w.clouds)
    if (c.layer < 2)
      drawCloud(ctx, c.x * width, c.y * height, c.s * height * (0.7 + c.layer * 0.3), 0.35 + c.layer * 0.25)

  const gap = gapFor(w.score)
  for (const s of w.slabs) {
    const x = s.x * width
    const sw = SLAB_WIDTH * width
    const c = gapCenter(s, w.score, w.scroll)
    const top = (c - gap / 2) * height
    const bottom = (c + gap / 2) * height
    if (s.cameo) drawCameo(ctx, s.cameo, x + sw / 2, top + sw * 0.1, sw * 0.42)
    drawSlab(ctx, x, -10, sw, top + 10, s.label, t, 'top')
    drawSlab(ctx, x, bottom, sw, height * FLOOR - bottom, s.label, t, 'bottom')
  }

  // glass deck with racing rainbow lines, like the launch film
  const floorY = height * FLOOR
  const deck = ctx.createLinearGradient(0, floorY, 0, height)
  deck.addColorStop(0, 'rgba(255,255,255,.92)')
  deck.addColorStop(1, 'rgba(205,228,250,.9)')
  ctx.fillStyle = deck
  ctx.fillRect(-40, floorY, width + 80, height - floorY + 40)
  ;['#7ff0c8', '#7fd0ff', '#c9a6ff'].forEach((color, i) => {
    ctx.fillStyle = color
    const yy = floorY + 6 + i * 6
    const dash = width * 0.12
    const offset = (w.scroll * width * (1 + i * 0.15)) % (dash * 2)
    for (let x = -offset - dash * 2; x < width + dash; x += dash * 2) ctx.fillRect(x, yy, dash, 2.5)
  })

  for (const c of w.clouds)
    if (c.layer === 2) drawCloud(ctx, c.x * width, c.y * height + height * 0.05, c.s * height * 1.1, 0.75)

  for (const s of w.shards) {
    ctx.save()
    ctx.translate(s.x * width, s.y * height)
    ctx.rotate(s.r + s.life * 6)
    ctx.fillStyle = `rgba(255,255,255,${s.life})`
    ctx.beginPath()
    ctx.moveTo(0, -5)
    ctx.lineTo(4, 4)
    ctx.lineTo(-4, 3)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  drawPhone(ctx, DUO_X * width, w.y * height, PHONE * height, w.vy, w.fold, w.status === 'over', t)
  ctx.restore()
}

// Drawn on top of the (possibly blurred) world so it stays crisp.
export function drawOverlay(ctx: CanvasRenderingContext2D, w: World, width: number, height: number) {
  for (const b of w.banners) drawBanner(ctx, b, width, height)
  if (w.status === 'ready') return
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.font = `800 ${Math.round(height * 0.13)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(20,60,120,.45)'
  ctx.shadowBlur = 12
  ctx.fillText(String(w.score), width / 2, height * 0.05)
  ctx.restore()
}
