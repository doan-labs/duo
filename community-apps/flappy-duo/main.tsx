import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Status = 'ready' | 'playing' | 'over'
type Pillar = { x: number; gapY: number; passed: boolean }
type World = {
  status: Status
  y: number
  vy: number
  fold: number
  pillars: Pillar[]
  score: number
  time: number
  shake: number
  ground: number
}

// Everything is in units of canvas height (vertical) or width (horizontal),
// so the same game fits the cover and the inner display.
const GRAVITY = 2.6
const FLAP = -0.78
const SPEED = 0.42
const PILLAR_SPACING = 0.5
const PILLAR_WIDTH = 0.12
const DUO_SIZE = 0.13
const DUO_X = 0.28
const GROUND = 0.9

const START_LINES = [
  'Tap to fold. Avoid the hinges.',
  'It is one button. You will still lose.',
  'Flappy Bird, but with worse decisions.'
]

const MILESTONES: Record<number, string> = {
  1: 'One. Groundbreaking.',
  3: 'Three. Do not get cocky.',
  5: 'Five. Someone call the press.',
  10: 'Ten. Your parents would be mildly proud.',
  15: 'Fifteen. Okay, who is playing for you?',
  20: 'Twenty. Touch grass soon.',
  30: 'Thirty. This is a cry for help.',
  50: 'Fifty. Go outside. Please.'
}

const ROASTS: [number, string[]][] = [
  [
    1,
    [
      'You folded before the first hinge. Bold.',
      'Zero. The hinge is fine. You are not.',
      'That was the tutorial. There is no tutorial.'
    ]
  ],
  [4, ['The pillars did not even move. You did.', 'Gravity remains undefeated.', 'That was a warm-up, right? Right?']],
  [9, ['Respectable. For a phone.', 'You blinked. The D noticed.', 'So close to being mediocre.']],
  [16, ['Fine. That was almost skill.', 'The hinge is impressed. Slightly.', 'You have a problem. A good one.']],
  [
    Number.POSITIVE_INFINITY,
    [
      'Okay. Screenshot this. Nobody will believe you.',
      'Suspicious. We are watching you.',
      'Put the phone down. Or do not.'
    ]
  ]
]

const MEDALS: [number, string][] = [
  [1, 'Participation'],
  [5, 'Wooden'],
  [10, 'Bronze-ish'],
  [20, 'Silver, allegedly'],
  [40, 'Gold, no questions'],
  [Number.POSITIVE_INFINITY, 'Suspiciously good']
]

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!
const roastFor = (score: number) => pick(ROASTS.find(([max]) => score < max)![1])
const medalFor = (score: number) => MEDALS.find(([max]) => score < max)![1]

function newWorld(): World {
  return { status: 'ready', y: 0.45, vy: 0, fold: 0, pillars: [], score: 0, time: 0, shake: 0, ground: 0 }
}

function spawn(x: number): Pillar {
  return { x, gapY: 0.22 + Math.random() * 0.46, passed: false }
}

// Gap shrinks a little as you score, floors at a fair-ish size.
const gapFor = (score: number) => Math.max(0.24, 0.32 - score * 0.004)

function step(w: World, dt: number, aspect: number): { world: World; scored: boolean } {
  if (w.status !== 'playing')
    return { world: { ...w, time: w.time + dt, ground: w.ground + SPEED * dt }, scored: false }
  let vy = w.vy + GRAVITY * dt
  let y = w.y + vy * dt
  if (y < DUO_SIZE / 2) {
    y = DUO_SIZE / 2
    vy = 0
  }
  const fold = Math.max(0, w.fold - dt * 3)
  const pillars = w.pillars.map((p) => ({ ...p, x: p.x - SPEED * dt })).filter((p) => p.x + PILLAR_WIDTH > -0.05)
  const last = pillars[pillars.length - 1]
  if (!last || last.x < 1 - PILLAR_SPACING) pillars.push(spawn(1.05))

  let score = w.score
  let scored = false
  const half = DUO_SIZE / 2
  // Horizontal positions are in width units; the Duo is drawn in height units, convert once.
  const duoLeft = DUO_X - (half / aspect) * 0.8
  const duoRight = DUO_X + (half / aspect) * 0.8
  const gap = gapFor(score)
  let dead = y + half > GROUND
  for (const p of pillars) {
    if (!p.passed && p.x + PILLAR_WIDTH < DUO_X) {
      p.passed = true
      score += 1
      scored = true
    }
    const overlapsX = duoRight > p.x && duoLeft < p.x + PILLAR_WIDTH
    if (overlapsX && (y - half * 0.8 < p.gapY - gap / 2 || y + half * 0.8 > p.gapY + gap / 2)) dead = true
  }
  return {
    world: {
      ...w,
      y,
      vy,
      fold,
      pillars,
      score,
      time: w.time + dt,
      ground: w.ground + SPEED * dt,
      shake: dead ? 0.35 : 0,
      status: dead ? 'over' : 'playing'
    },
    scored
  }
}

function flap(w: World): World {
  if (w.status === 'over') return w
  return { ...w, status: 'playing', vy: FLAP, fold: 1, pillars: w.status === 'ready' ? [spawn(1.3)] : w.pillars }
}

// The Duo "D" from the platform icon, drawn in a 256 box, scaled to `size`.
function drawDuo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  vy: number,
  fold: number,
  dead: boolean
) {
  const s = size / 256
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dead ? Math.PI / 2 : Math.max(-0.5, Math.min(1.2, vy * 1.4)))
  ctx.scale(s, s)
  ctx.translate(-128, -128)
  // Folded back plane swings out on a flap.
  const swing = 28 + fold * 40
  ctx.fillStyle = '#b9a9e6'
  ctx.beginPath()
  ctx.moveTo(76, 44)
  ctx.lineTo(76 - swing, 72 - fold * 10)
  ctx.lineTo(76 - swing, 216 + fold * 10)
  ctx.lineTo(76, 188)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f4efe4'
  ctx.beginPath()
  ctx.moveTo(80, 44)
  ctx.lineTo(136, 44)
  ctx.bezierCurveTo(176, 44, 208, 76, 208, 116)
  ctx.bezierCurveTo(208, 156, 176, 188, 136, 188)
  ctx.lineTo(80, 188)
  ctx.closePath()
  ctx.moveTo(112, 76)
  ctx.lineTo(112, 156)
  ctx.lineTo(136, 156)
  ctx.bezierCurveTo(158, 156, 176, 138, 176, 116)
  ctx.bezierCurveTo(176, 94, 158, 76, 136, 76)
  ctx.closePath()
  ctx.fill('evenodd')
  // One judgmental eye.
  ctx.fillStyle = '#2a2a2e'
  ctx.beginPath()
  if (dead) {
    ctx.lineWidth = 8
    ctx.strokeStyle = '#2a2a2e'
    ctx.moveTo(120, 100)
    ctx.lineTo(140, 120)
    ctx.moveTo(140, 100)
    ctx.lineTo(120, 120)
    ctx.stroke()
  } else {
    ctx.arc(146, 106, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(149, 103, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function draw(ctx: CanvasRenderingContext2D, w: World, width: number, height: number) {
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  if (w.shake > 0) ctx.translate((Math.random() - 0.5) * w.shake * 30, (Math.random() - 0.5) * w.shake * 30)

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#1a1a2e')
  sky.addColorStop(1, '#3a2f5c')
  ctx.fillStyle = sky
  ctx.fillRect(-40, -40, width + 80, height + 80)

  // Parallax hills
  ctx.fillStyle = 'rgba(185,169,230,.12)'
  for (let i = -1; i < 6; i += 1) {
    const hx = ((i * 0.35 - ((w.ground * 0.25) % 0.35)) % 2.1) * width
    ctx.beginPath()
    ctx.arc(hx, height * GROUND, height * 0.22, Math.PI, 0)
    ctx.fill()
  }

  // Pillars: dark hinges with a lip
  for (const p of w.pillars) {
    const gap = gapFor(w.score)
    const px = p.x * width
    const pw = PILLAR_WIDTH * width
    const top = (p.gapY - gap / 2) * height
    const bottom = (p.gapY + gap / 2) * height
    ctx.fillStyle = '#2a2a2e'
    ctx.fillRect(px, -10, pw, top + 10)
    ctx.fillRect(px, bottom, pw, height * GROUND - bottom)
    ctx.fillStyle = '#4a4a52'
    const lip = Math.max(6, height * 0.03)
    ctx.fillRect(px - pw * 0.08, top - lip, pw * 1.16, lip)
    ctx.fillRect(px - pw * 0.08, bottom, pw * 1.16, lip)
    ctx.fillStyle = 'rgba(255,255,255,.08)'
    ctx.fillRect(px + pw * 0.15, -10, pw * 0.12, top + 10)
    ctx.fillRect(px + pw * 0.15, bottom, pw * 0.12, height * GROUND - bottom)
  }

  // Ground
  ctx.fillStyle = '#2a2a2e'
  ctx.fillRect(-40, height * GROUND, width + 80, height)
  ctx.fillStyle = '#b9a9e6'
  ctx.fillRect(-40, height * GROUND, width + 80, Math.max(3, height * 0.012))
  ctx.fillStyle = 'rgba(185,169,230,.35)'
  const dash = width * 0.06
  const offset = (w.ground * width) % (dash * 2)
  for (let x = -offset - dash * 2; x < width + dash; x += dash * 2)
    ctx.fillRect(x, height * GROUND + height * 0.03, dash, Math.max(2, height * 0.008))

  drawDuo(ctx, DUO_X * width, w.y * height, DUO_SIZE * height * 1.3, w.vy, w.fold, w.status === 'over')

  // Score
  if (w.status !== 'ready') {
    ctx.fillStyle = '#fff'
    ctx.font = `800 ${Math.round(height * 0.14)}px -apple-system, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(0,0,0,.5)'
    ctx.shadowBlur = 8
    ctx.fillText(String(w.score), width / 2, height * 0.06)
  }
  ctx.restore()
}

function Game() {
  const view = useDisplay()
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef(newWorld())
  const [status, setStatus] = useState<Status>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [toast, setToast] = useState('')
  const [roast, setRoast] = useState('')
  const [startLine] = useState(() => pick(START_LINES))
  const cover = view.display === 'cover'
  const width = view.width || 740
  const height = view.height || 480

  useEffect(() => {
    void os.storage.get('best').then((v) => v && setBest(Number(v) || 0))
    requestAnimationFrame(() => os.ready())
  }, [])

  const doFlap = () => {
    if (world.current.status === 'over') return
    world.current = flap(world.current)
    if (status !== 'playing') setStatus('playing')
  }

  const reset = () => {
    world.current = newWorld()
    setStatus('ready')
    setScore(0)
    setToast('')
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
      const { world: next, scored } = step(before, dt, width / height)
      world.current = next
      if (scored) {
        setScore(next.score)
        const line = MILESTONES[next.score]
        if (line) {
          setToast(line)
          window.clearTimeout(toastTimer)
          toastTimer = window.setTimeout(() => setToast(''), 1800)
        }
      }
      if (before.status === 'playing' && next.status === 'over') {
        setStatus('over')
        setRoast(roastFor(next.score))
        setBest((b) => {
          const nb = Math.max(b, next.score)
          if (nb !== b) void os.storage.set('best', String(nb))
          return nb
        })
      }
      if (next.shake > 0) world.current = { ...next, shake: Math.max(0, next.shake - dt) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, world.current, width, height)
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
      {status === 'ready' && (
        <section {...stylex.props(styles.intro, cover && styles.introCover)}>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.title, cover && styles.titleCover)}>Flappy Duo</h1>
          <p {...stylex.props(styles.line)}>{startLine}</p>
          {best > 0 && <p {...stylex.props(styles.best)}>Best {best}. You peaked already.</p>}
          <span {...stylex.props(styles.tap)}>{cover ? 'Tap to fold' : 'Tap or press space to fold'}</span>
        </section>
      )}
      {toast && status === 'playing' && <div {...stylex.props(styles.toast, cover && styles.toastCover)}>{toast}</div>}
      {status === 'over' && (
        <section {...stylex.props(styles.over, cover && styles.overCover)}>
          <span {...stylex.props(styles.kicker)}>YOU FOLDED</span>
          <p {...stylex.props(styles.roast)}>{roast}</p>
          <div {...stylex.props(styles.stats)}>
            <div {...stylex.props(styles.stat)}>
              <span>SCORE</span>
              <strong {...stylex.props(styles.value)}>{score}</strong>
            </div>
            <div {...stylex.props(styles.stat)}>
              <span>BEST</span>
              <strong {...stylex.props(styles.value)}>{best}</strong>
            </div>
            <div {...stylex.props(styles.stat, styles.medal)}>
              <span>MEDAL</span>
              <strong {...stylex.props(styles.value, styles.medalValue)}>{medalFor(score)}</strong>
            </div>
          </div>
          {newBest && <p {...stylex.props(styles.best)}>New best. Screenshot it. Nobody will believe you.</p>}
          <button type="button" onClick={reset} {...stylex.props(styles.again)}>
            Fold again
          </button>
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
  intro: {
    position: 'absolute',
    insetInline: 0,
    top: '12%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    textAlign: 'center',
    paddingInline: 16,
    pointerEvents: 'none'
  },
  introCover: { top: '8%', gap: 3 },
  kicker: { color: colors.purple, fontSize: 10, fontWeight: 700, letterSpacing: 2 },
  title: {
    marginBlock: 0,
    fontSize: 44,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: -1.5,
    textShadow: '0 4px 16px rgba(0,0,0,.5)'
  },
  titleCover: { fontSize: 30 },
  line: { marginBlock: 0, color: colors.grey3, fontSize: 13 },
  best: { marginBlock: 0, color: colors.purple, fontSize: 12, fontWeight: 600 },
  tap: {
    marginTop: 10,
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: 999,
    backgroundColor: colors.fillDark,
    fontSize: 12,
    fontWeight: 600,
    animationName: stylex.keyframes({ '0%': { opacity: 0.5 }, '50%': { opacity: 1 }, '100%': { opacity: 0.5 } }),
    animationDuration: '1.4s',
    animationIterationCount: 'infinite'
  },
  toast: {
    position: 'absolute',
    insetInline: 0,
    top: '26%',
    marginInline: 'auto',
    width: 'fit-content',
    maxWidth: '80%',
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,.55)',
    color: colors.white,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    pointerEvents: 'none'
  },
  toastCover: { fontSize: 11, top: '30%' },
  over: {
    position: 'absolute',
    insetInline: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    marginInline: 'auto',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingBlock: 16,
    paddingInline: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,30,.92)',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,.5)'
  },
  overCover: { insetInline: 10, gap: 5, paddingBlock: 10, paddingInline: 10 },
  roast: { marginBlock: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.25 },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  stat: {
    minWidth: 60,
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: 8,
    color: colors.grey3,
    backgroundColor: colors.fillDark,
    fontSize: 8,
    letterSpacing: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  medal: { color: colors.purple },
  value: { color: colors.white, fontSize: 18, fontWeight: 800, letterSpacing: 0 },
  medalValue: { color: colors.purple, fontSize: 12 },
  again: {
    marginTop: 4,
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 8,
    paddingInline: 18,
    color: colors.black,
    backgroundColor: colors.purple,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  }
})

await os.connect()
createRoot(document.body).render(<Game />)
