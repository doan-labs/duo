// Pure simulation: no DOM, no canvas. step() advances one frame.
import {
  BANNER_LIFE,
  DUO_X,
  FLAP,
  FLOOR,
  GRAVITY,
  gapCenter,
  gapFor,
  has,
  MISSILE_LABELS,
  type Missile,
  NOTICES,
  PHONE,
  pick,
  type Shard,
  SLAB_LABELS,
  SLAB_SPACING,
  SLAB_WIDTH,
  type Slab,
  speedFor,
  type World
} from './config.ts'

export function newWorld(run = 1): World {
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
    banners: [],
    missiles: [],
    run,
    score: 0,
    folds: 0,
    scroll: 0,
    slow: 0,
    cause: null
  }
}

export const spawn = (x: number, n: number): Slab => ({
  x,
  n,
  gapY: 0.22 + Math.random() * 0.44,
  label: pick(SLAB_LABELS),
  passed: false,
  slam: 0,
  dir: n % 4 === 1 ? 1 : -1
})

const throwAt = (y: number, speed: number): Missile => ({
  x: 1.1,
  y: Math.min(FLOOR - 0.1, Math.max(0.08, y + (Math.random() - 0.5) * 0.2)),
  vx: -speed * 2.2,
  vy: (Math.random() - 0.5) * 0.2,
  rot: Math.random() * Math.PI,
  label: pick(MISSILE_LABELS)
})

export function burst(x: number, y: number): Shard[] {
  return Array.from({ length: 22 }, () => {
    const a = Math.random() * Math.PI * 2
    const v = 0.3 + Math.random() * 0.9
    return { x, y, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v - 0.4, r: Math.random() * 6, life: 1 }
  })
}

export function step(w: World, raw: number, aspect: number): { world: World; scored: boolean } {
  const dt = w.slow > 0 ? raw * 0.25 : raw
  const speed = speedFor(w)
  const scroll = w.scroll + (w.status === 'over' ? 0 : speed * dt)
  const clouds = w.clouds.map((c) => {
    const x = c.x - speed * dt * (0.15 + c.layer * 0.2)
    return x < -0.3 ? { ...c, x: 1.3, y: 0.05 + Math.random() * 0.75 } : { ...c, x }
  })
  const shards = w.shards
    .map((s) => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, vy: s.vy + GRAVITY * dt, life: s.life - dt * 1.2 }))
    .filter((s) => s.life > 0)
  const banners = w.banners.map((b) => ({ ...b, life: b.life - raw })).filter((b) => b.life > 0)
  const fold = Math.max(0, w.fold - dt * 4)
  const slow = Math.max(0, w.slow - raw)
  if (w.status !== 'playing') {
    // A dead phone keeps falling until it hits the deck.
    const vy = w.status === 'over' ? w.vy + GRAVITY * dt : 0
    const y = w.status === 'over' ? Math.min(FLOOR - PHONE * 0.1, w.y + vy * dt) : w.y
    return { world: { ...w, y, vy, fold, clouds, shards, banners, scroll, slow }, scored: false }
  }
  if (has(w, 'notify') && banners.length < 2 && Math.random() < dt * 0.45) {
    const [title, text] = pick(NOTICES)
    banners.push({ title, text, y: 0.1 + Math.random() * 0.5, life: BANNER_LIFE })
  }
  let vy = w.vy + GRAVITY * dt
  let y = w.y + vy * dt
  if (y < PHONE * 0.15) {
    y = PHONE * 0.15
    vy = 0
  }
  // Every other slab snaps shut once the phone is close enough to have committed.
  const slabs = w.slabs
    .map((s) => {
      const x = s.x - speed * dt
      const arm = has(w, 'slam') && s.n % 2 === 1 && x < DUO_X + 0.28
      return { ...s, x, slam: arm ? Math.min(1, s.slam + dt * 7) : s.slam }
    })
    .filter((s) => s.x + SLAB_WIDTH > -0.05)
  const last = slabs[slabs.length - 1]
  if (!last || last.x < 1 - SLAB_SPACING) slabs.push(spawn(1.05, (last?.n ?? -1) + 1))

  const missiles = w.missiles
    .map((m) => ({ ...m, x: m.x + m.vx * dt, y: m.y + m.vy * dt, rot: m.rot + dt * 9 }))
    .filter((m) => m.x > -0.1)
  if (has(w, 'throw') && missiles.length < 2 && Math.random() < dt * 0.55) missiles.push(throwAt(y, speed))

  let score = w.score
  let scored = false
  const r = PHONE * 0.22 // hit radius, height units
  const left = DUO_X - (r / aspect) * 1.6
  const right = DUO_X + (r / aspect) * 1.6
  const gap = gapFor(w)
  let cause: World['cause'] = y + r > FLOOR ? 'floor' : null
  for (const s of slabs) {
    if (!s.passed && s.x + SLAB_WIDTH < DUO_X) {
      s.passed = true
      score += 1
      scored = true
    }
    const c = gapCenter(s, { ...w, scroll })
    if (right > s.x && left < s.x + SLAB_WIDTH && (y - r < c - gap / 2 || y + r > c + gap / 2)) cause = 'slab'
  }
  for (const m of missiles) {
    const dx = ((m.x - DUO_X) * aspect) / 1.6
    if (Math.hypot(dx, m.y - y) < r * 0.9) cause = 'missile'
  }
  return {
    world: {
      ...w,
      y,
      vy: cause ? -0.3 : vy,
      fold,
      slabs,
      clouds,
      banners,
      missiles,
      shards: cause ? burst(DUO_X, y) : shards,
      score,
      scroll,
      slow: cause ? 0.7 : slow,
      cause,
      status: cause ? 'over' : 'playing'
    },
    scored
  }
}

export function flap(w: World): World {
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
