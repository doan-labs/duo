import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Status = 'ready' | 'playing' | 'over'
type Cameo = 'tim' | 'steve' | 'john'
type Slab = { x: number; gapY: number; label: string; passed: boolean; cameo?: Cameo; n: number }
type Shard = { x: number; y: number; vx: number; vy: number; r: number; life: number }
type Cloud = { x: number; y: number; s: number; layer: number }
type World = {
  status: Status
  y: number
  vy: number
  fold: number
  slabs: Slab[]
  shards: Shard[]
  clouds: Cloud[]
  score: number
  folds: number
  scroll: number
  slow: number
  cause: 'slab' | 'floor' | null
}

// Vertical values are in units of canvas height, horizontal in canvas width,
// so the same game fits the cover and the inner display.
const GRAVITY = 2.6
const FLAP = -0.78
const SPEED = 0.42
const SLAB_SPACING = 0.5
const SLAB_WIDTH = 0.11
const GAP = 0.3
const PHONE = 0.2 // wingspan as a fraction of height
const DUO_X = 0.3
const FLOOR = 0.88
const HINGE_RATING = 200000
const PRICE = 2399

const START_LINES = [
  'Tap to fold. Every fold comes off the warranty.',
  'Hinge rated for 200,000 folds. Let us test that.',
  `You paid $${PRICE.toLocaleString()} for this. Make it count.`,
  'The crease is permanent. So is your record.',
  'Flappy Bird, but the bird cost more than your rent.'
]

const SLAB_LABELS = [
  'CREASE',
  `$${PRICE.toLocaleString()}`,
  'GENIUS BAR',
  'APPLECARE+',
  'iOS 27 BETA',
  'HINGE',
  'NO CHARGER',
  'PRE-ORDER',
  'DONGLE',
  'BATTERY 79%'
]

const MILESTONES: Record<number, string> = {
  1: 'One. The Genius Bar is proud of you.',
  3: 'Three. Statistically you die at four.',
  5: 'Five. AppleCare does not cover skill.',
  7: 'Seven. The hinge is squeaking. Ignore it.',
  10: 'Ten. Still cheaper than a screen repair.',
  15: 'Fifteen. Please stop folding it.',
  20: 'Twenty. The engineers are nervous.',
  30: 'Thirty. HR has been notified.',
  50: 'Fifty. Nobody is coming to save you.'
}

const ROASTS: [number, string[]][] = [
  [
    1,
    [
      'Zero. You dropped a $2,399 phone into the clouds.',
      'Died before the first slab. Refund denied.',
      'The tutorial was one tap. You failed the tutorial.'
    ]
  ],
  [4, ['The slabs were standing still. You were not.', 'Hinge failure. Cause: you.', 'It was a beta. So were you.']],
  [
    9,
    [
      'Almost mediocre. The bar is on the floor and you clipped it.',
      'The crease saw that coming.',
      'Face ID did not recognise that attempt.'
    ]
  ],
  [16, ['Fine. Some skill. Still dead.', 'Impressive. The hinge disagrees.', 'You have a talent. It is falling.']],
  [
    Number.POSITIVE_INFINITY,
    [
      'Screenshot it. The support forum will not believe you.',
      'You have folded more than most owners ever will.',
      'Go outside. The phone would have wanted that.'
    ]
  ]
]

const FLOOR_ROASTS = [
  'You hit the floor. The floor is fine.',
  'Gravity: 1. You: still 0.',
  'Face down on a glass deck. Iconic.'
]

const MEDALS: [number, string][] = [
  [1, 'Participation'],
  [5, 'Refurbished'],
  [10, 'Out of warranty'],
  [20, 'Genius, allegedly'],
  [40, 'Suspiciously good'],
  [Number.POSITIVE_INFINITY, 'Please seek help']
]

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!
const roastFor = (score: number) => pick(ROASTS.find(([max]) => score < max)![1])
const medalFor = (score: number) => MEDALS.find(([max]) => score < max)![1]
const gapFor = (score: number) => Math.max(0.24, GAP - score * 0.003)

function newWorld(): World {
  return {
    status: 'ready',
    y: 0.45,
    vy: 0,
    fold: 0,
    slabs: [],
    shards: [],
    clouds: Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * 1.4,
      y: 0.05 + Math.random() * 0.75,
      s: 0.05 + Math.random() * 0.09,
      layer: i % 3
    })),
    score: 0,
    folds: 0,
    scroll: 0,
    slow: 0,
    cause: null
  }
}

// Every fifth slab has an executive peeking out of it. Cartoon likenesses, for fun only.
const CAMEO_ORDER: Cameo[] = ['tim', 'john', 'steve']
const CAMEO_LINES: Record<Cameo, string[]> = {
  tim: [
    'Tim: "Wonderful. Just wonderful."',
    'Tim: "This is our best Duo yet. You are not our best user."',
    'Tim: "Good morning! Your hinge says otherwise."'
  ],
  john: [
    'John: "It is the thinnest crash we have ever made."',
    'John: "We engineered every fold. Not that one."',
    'John: "Titanium. Still not idiot-proof."'
  ],
  steve: [
    'Steve: "You are folding it wrong."',
    'Steve: "One more thing. You are bad at this."',
    'Steve: "It just works. You do not."'
  ]
}
const spawn = (x: number, n: number): Slab => ({
  x,
  n,
  gapY: 0.22 + Math.random() * 0.44,
  label: pick(SLAB_LABELS),
  passed: false,
  cameo: n % 5 === 4 ? CAMEO_ORDER[Math.floor(n / 5) % 3] : undefined
})

function burst(x: number, y: number): Shard[] {
  return Array.from({ length: 22 }, () => {
    const a = Math.random() * Math.PI * 2
    const v = 0.3 + Math.random() * 0.9
    return { x, y, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v - 0.4, r: Math.random() * 6, life: 1 }
  })
}

function step(w: World, raw: number, aspect: number): { world: World; scored: boolean; cameo?: Cameo } {
  const dt = w.slow > 0 ? raw * 0.25 : raw
  const scroll = w.scroll + (w.status === 'over' ? 0 : SPEED * dt)
  const clouds = w.clouds.map((c) => {
    const x = c.x - SPEED * dt * (0.15 + c.layer * 0.2)
    return x < -0.3 ? { ...c, x: 1.3, y: 0.05 + Math.random() * 0.75 } : { ...c, x }
  })
  const shards = w.shards
    .map((s) => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, vy: s.vy + GRAVITY * dt, life: s.life - dt * 1.2 }))
    .filter((s) => s.life > 0)
  const fold = Math.max(0, w.fold - dt * 4)
  const slow = Math.max(0, w.slow - raw)
  if (w.status !== 'playing') {
    // A dead phone keeps falling until it hits the deck.
    const vy = w.status === 'over' ? w.vy + GRAVITY * dt : 0
    const y = w.status === 'over' ? Math.min(FLOOR - PHONE * 0.1, w.y + vy * dt) : w.y
    return { world: { ...w, y, vy, fold, clouds, shards, scroll, slow }, scored: false }
  }
  let vy = w.vy + GRAVITY * dt
  let y = w.y + vy * dt
  if (y < PHONE * 0.15) {
    y = PHONE * 0.15
    vy = 0
  }
  const slabs = w.slabs.map((s) => ({ ...s, x: s.x - SPEED * dt })).filter((s) => s.x + SLAB_WIDTH > -0.05)
  const last = slabs[slabs.length - 1]
  if (!last || last.x < 1 - SLAB_SPACING) slabs.push(spawn(1.05, (last?.n ?? -1) + 1))

  let score = w.score
  let scored = false
  let cameo: Cameo | undefined
  const r = PHONE * 0.22 // hit radius, height units
  const left = DUO_X - (r / aspect) * 1.6
  const right = DUO_X + (r / aspect) * 1.6
  const gap = gapFor(score)
  let cause: World['cause'] = y + r > FLOOR ? 'floor' : null
  for (const s of slabs) {
    if (!s.passed && s.x + SLAB_WIDTH < DUO_X) {
      s.passed = true
      score += 1
      scored = true
      cameo = s.cameo
    }
    if (right > s.x && left < s.x + SLAB_WIDTH && (y - r < s.gapY - gap / 2 || y + r > s.gapY + gap / 2)) cause = 'slab'
  }
  return {
    world: {
      ...w,
      y,
      vy: cause ? -0.3 : vy,
      fold,
      slabs,
      clouds,
      shards: cause ? burst(DUO_X, y) : shards,
      score,
      scroll,
      slow: cause ? 0.7 : slow,
      cause,
      status: cause ? 'over' : 'playing'
    },
    scored,
    cameo
  }
}

function flap(w: World): World {
  if (w.status === 'over') return w
  return {
    ...w,
    status: 'playing',
    vy: FLAP,
    fold: 1,
    folds: w.folds + 1,
    slabs: w.status === 'ready' ? [spawn(1.3, 0)] : w.slabs
  }
}

// ---- audio: three tiny synth cues, no assets ----
let audio: AudioContext | undefined
function cue(kind: 'flap' | 'score' | 'crash') {
  try {
    audio ??= new AudioContext()
    const t = audio.currentTime
    const gain = audio.createGain()
    gain.connect(audio.destination)
    if (kind === 'crash') {
      const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.35), audio.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
      const src = audio.createBufferSource()
      src.buffer = buffer
      const filter = audio.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 900
      src.connect(filter).connect(gain)
      gain.gain.setValueAtTime(0.5, t)
      src.start(t)
      return
    }
    const osc = audio.createOscillator()
    osc.type = kind === 'flap' ? 'triangle' : 'sine'
    osc.connect(gain)
    if (kind === 'flap') {
      osc.frequency.setValueAtTime(520, t)
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.08)
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
      osc.start(t)
      osc.stop(t + 0.1)
    } else {
      osc.frequency.setValueAtTime(880, t)
      osc.frequency.setValueAtTime(1320, t + 0.07)
      gain.gain.setValueAtTime(0.16, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  } catch {
    // No audio is fine. The roasts still work.
  }
}

// ---- drawing ----
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// The Duo seen from the front, hinge in the middle, halves as wings.
function drawPhone(
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
      ctx.font = `600 ${Math.round(thick * 0.28)}px -apple-system, system-ui, sans-serif`
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

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
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

function drawSlab(
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
    ctx.font = `800 ${Math.round(w * 0.36)}px -apple-system, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 0, 0, h - lip - 12)
    ctx.restore()
  }
}

// Cartoon executive peeking down from behind the top slab. Skin, hair, glasses. Nothing else.
function drawCameo(ctx: CanvasRenderingContext2D, who: Cameo, cx: number, cy: number, r: number) {
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

function draw(ctx: CanvasRenderingContext2D, w: World, width: number, height: number, t: number) {
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
    const top = (s.gapY - gap / 2) * height
    const bottom = (s.gapY + gap / 2) * height
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

  if (w.status !== 'ready') {
    ctx.fillStyle = '#fff'
    ctx.font = `800 ${Math.round(height * 0.13)}px -apple-system, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(20,60,120,.45)'
    ctx.shadowBlur = 12
    ctx.fillText(String(w.score), width / 2, height * 0.05)
  }
  ctx.restore()
}

// ---- component ----
function Game() {
  const view = useDisplay()
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef(newWorld())
  const [status, setStatus] = useState<Status>('ready')
  const [score, setScore] = useState(0)
  const [folds, setFolds] = useState(0)
  const [best, setBest] = useState(0)
  const [lifetime, setLifetime] = useState(0)
  const [spent, setSpent] = useState(PRICE)
  const [toast, setToast] = useState('')
  const [roast, setRoast] = useState('')
  const [startLine] = useState(() => pick(START_LINES))
  const cover = view.display === 'cover'
  const width = view.width || 740
  const height = view.height || 480

  useEffect(() => {
    void os.storage.get('best').then((v) => v && setBest(Number(v) || 0))
    void os.storage.get('folds').then((v) => v && setLifetime(Number(v) || 0))
    void os.storage.get('spent').then((v) => v && setSpent(Number(v) || PRICE))
    requestAnimationFrame(() => os.ready())
  }, [])

  const doFlap = () => {
    if (world.current.status === 'over') return
    world.current = flap(world.current)
    cue('flap')
    setFolds(world.current.folds)
    if (status !== 'playing') setStatus('playing')
  }

  const reset = (buy = false) => {
    if (buy) {
      setSpent((s) => {
        void os.storage.set('spent', String(s + PRICE))
        return s + PRICE
      })
      setToast(`Charged $${PRICE.toLocaleString()}. Thank you for your loyalty.`)
      window.setTimeout(() => setToast(''), 2200)
    } else setToast('')
    world.current = { ...newWorld(), clouds: world.current.clouds }
    setStatus('ready')
    setScore(0)
    setFolds(0)
    setRoast('')
  }

  useEffect(() => {
    const el = canvas.current!
    const ctx = el.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
    let last = performance.now()
    let frame = 0
    let toastTimer = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const before = world.current
      const { world: next, scored, cameo } = step(before, dt, width / height)
      world.current = next
      if (scored) {
        cue('score')
        setScore(next.score)
        const line = cameo ? pick(CAMEO_LINES[cameo]) : MILESTONES[next.score]
        if (line) {
          setToast(line)
          window.clearTimeout(toastTimer)
          toastTimer = window.setTimeout(() => setToast(''), 2000)
        }
      }
      if (before.status === 'playing' && next.status === 'over') {
        cue('crash')
        setStatus('over')
        setToast('')
        setRoast(next.cause === 'floor' ? pick(FLOOR_ROASTS) : roastFor(next.score))
        setBest((b) => {
          const nb = Math.max(b, next.score)
          if (nb !== b) void os.storage.set('best', String(nb))
          return nb
        })
        setLifetime((l) => {
          const nl = l + next.folds
          void os.storage.set('folds', String(nl))
          return nl
        })
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, world.current, width, height, now / 1000)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(toastTimer)
    }
  }, [width, height])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        if (world.current.status === 'over') reset()
        else doFlap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const newBest = status === 'over' && score > 0 && score >= best
  const warranty = Math.max(0, HINGE_RATING - lifetime)

  return (
    <main
      {...stylex.props(styles.root)}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        doFlap()
      }}
    >
      <canvas
        ref={canvas}
        aria-label="Flappy Duo"
        role="img"
        {...stylex.props(styles.canvas, styles.size(width, height))}
      />
      {status !== 'ready' && (
        <div {...stylex.props(styles.hud, cover && styles.hudCover)}>
          <span>
            {folds} {folds === 1 ? 'fold' : 'folds'}
          </span>
          <span {...stylex.props(styles.hudDim)}>hinge {((1 - warranty / HINGE_RATING) * 100).toFixed(2)}% used</span>
        </div>
      )}
      {status === 'ready' && (
        <section {...stylex.props(styles.intro, cover && styles.introCover)}>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE · FIRST CONTACT</span>
          <h1 {...stylex.props(styles.title, cover && styles.titleCover)}>Flappy Duo</h1>
          <p {...stylex.props(styles.line, cover && styles.lineCover)}>{startLine}</p>
          {best > 0 && (
            <p {...stylex.props(styles.best)}>
              Best {best}. Lifetime folds {lifetime.toLocaleString()} of {HINGE_RATING.toLocaleString()}.
            </p>
          )}
          <span {...stylex.props(styles.tap)}>{cover ? 'Tap to fold' : 'Tap or press space to fold'}</span>
        </section>
      )}
      {toast && status !== 'over' && <div {...stylex.props(styles.toast, cover && styles.toastCover)}>{toast}</div>}
      {status === 'over' && (
        <section
          role="alertdialog"
          aria-label="Hinge failure"
          {...stylex.props(styles.alert, cover && styles.alertCover)}
        >
          <strong {...stylex.props(styles.alertTitle)}>Hinge Failure</strong>
          <p {...stylex.props(styles.roast)}>{roast}</p>
          <p {...stylex.props(styles.fine)}>
            {folds} {folds === 1 ? 'fold' : 'folds'} this life. {warranty.toLocaleString()} left on the hinge. Not
            covered.
          </p>
          <div {...stylex.props(styles.stats)}>
            <div {...stylex.props(styles.stat)}>
              <span>SCORE</span>
              <strong {...stylex.props(styles.value)}>{score}</strong>
            </div>
            <div {...stylex.props(styles.stat)}>
              <span>BEST</span>
              <strong {...stylex.props(styles.value)}>{best}</strong>
            </div>
            <div {...stylex.props(styles.stat)}>
              <span>MEDAL</span>
              <strong {...stylex.props(styles.value, styles.medalValue)}>{medalFor(score)}</strong>
            </div>
          </div>
          {newBest && <p {...stylex.props(styles.best)}>New best. Screenshot it. Nobody will believe you.</p>}
          <div {...stylex.props(styles.actions)}>
            <button type="button" onClick={() => reset()} {...stylex.props(styles.button, styles.secondary)}>
              Fold again
            </button>
            <button type="button" onClick={() => reset(true)} {...stylex.props(styles.button)}>
              Buy another · ${PRICE.toLocaleString()}
            </button>
          </div>
          <span {...stylex.props(styles.fine)}>Spent so far: ${spent.toLocaleString()}</span>
        </section>
      )}
    </main>
  )
}

const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    color: colors.white,
    backgroundColor: colors.black,
    fontFamily: fonts.system,
    fontSize: 14,
    userSelect: 'none',
    touchAction: 'manipulation',
    cursor: 'pointer'
  },
  // The platform reset hides `canvas` until the shell marks the body ready; this app owns its canvas.
  canvas: { position: 'absolute', top: 0, left: 0, display: 'block', opacity: 1, cursor: 'pointer' },
  size: (w: number, h: number) => ({ width: `${w}px`, height: `${h}px` }),
  hud: {
    position: 'absolute',
    top: 10,
    left: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 12,
    fontWeight: 700,
    textShadow: '0 1px 6px rgba(20,60,120,.5)',
    pointerEvents: 'none'
  },
  hudCover: { top: 6, left: 8, fontSize: 10 },
  hudDim: { opacity: 0.8, fontWeight: 500 },
  intro: {
    position: 'absolute',
    insetInline: 0,
    top: '10%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    textAlign: 'center',
    paddingInline: 16,
    pointerEvents: 'none',
    textShadow: '0 2px 12px rgba(20,60,120,.5)'
  },
  introCover: { top: '6%', gap: 3 },
  kicker: { fontSize: 10, fontWeight: 700, letterSpacing: 2, opacity: 0.9 },
  title: { marginBlock: 0, fontSize: 48, lineHeight: 1, fontWeight: 800, letterSpacing: -1.5 },
  titleCover: { fontSize: 30 },
  line: { marginBlock: 0, fontSize: 14, fontWeight: 600 },
  lineCover: { fontSize: 12 },
  best: { marginBlock: 0, fontSize: 12, fontWeight: 600, opacity: 0.95 },
  tap: {
    marginTop: 8,
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.25)',
    backdropFilter: 'blur(8px)',
    fontSize: 12,
    fontWeight: 700,
    textShadow: 'none',
    animationName: stylex.keyframes({ '0%': { opacity: 0.6 }, '50%': { opacity: 1 }, '100%': { opacity: 0.6 } }),
    animationDuration: '1.4s',
    animationIterationCount: 'infinite'
  },
  toast: {
    position: 'absolute',
    insetInline: 0,
    top: '24%',
    marginInline: 'auto',
    width: 'fit-content',
    maxWidth: '80%',
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.85)',
    color: '#0b1a3a',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
    pointerEvents: 'none',
    boxShadow: '0 6px 20px rgba(20,60,120,.25)'
  },
  toastCover: { fontSize: 11, top: '28%' },
  alert: {
    position: 'absolute',
    insetInline: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    marginInline: 'auto',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingBlock: 16,
    paddingInline: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.88)',
    backdropFilter: 'blur(18px)',
    color: '#0b1a3a',
    textAlign: 'center',
    boxShadow: '0 16px 48px rgba(20,60,120,.35)'
  },
  alertCover: { insetInline: 8, gap: 4, paddingBlock: 10, paddingInline: 10, borderRadius: 16 },
  alertTitle: { fontSize: 17, fontWeight: 700 },
  roast: { marginBlock: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3 },
  fine: { marginBlock: 0, fontSize: 11, color: '#5b6b85' },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  stat: {
    minWidth: 62,
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: 10,
    color: '#5b6b85',
    backgroundColor: 'rgba(20,60,120,.08)',
    fontSize: 8,
    letterSpacing: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  value: { color: '#0b1a3a', fontSize: 18, fontWeight: 800, letterSpacing: 0 },
  medalValue: { fontSize: 12 },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  button: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 8,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: colors.blueBright,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondary: { color: '#0b1a3a', backgroundColor: 'rgba(20,60,120,.1)' }
})

await os.connect()
createRoot(document.body).render(<Game />)
