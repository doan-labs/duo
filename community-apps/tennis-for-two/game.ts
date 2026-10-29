// The rules and physics of a 1958-style side-view rally. Units: the court is 1 long,
// the net stands at 0.5, heights are in the same unit, time in seconds.

export type Side = 'left' | 'right'
export type Mode = 'bot' | 'duo'
export type Level = 'Easy' | 'Normal' | 'Hard'
export type Phase = 'serve' | 'rally' | 'point' | 'over'
export type Cue = 'hit' | 'bounce' | 'net' | 'point' | 'over'
export type Score = { left: number; right: number }

export const NET_X = 0.5
export const NET_H = 0.07
export const REACH = 0.5
export const TARGET = 11
const GRAVITY = 1.6
const RESTITUTION = 0.72
const MIN_ANGLE = 8
const MAX_ANGLE = 75
const SERVE_Y = 0.22
const SPEED = 0.95
const MIN_POWER = 0.5
const MAX_POWER = 1.4
const TRAIL = 18
const STEP = 1 / 240

export type World = {
  x: number
  y: number
  vx: number
  vy: number
  phase: Phase
  server: Side
  lastHitter: Side | null
  canHit: Side | null
  bounces: number
  fault: Side | null
  score: Score
  winner: Side | null
  pause: number
  botWait: number
  botSkip: boolean
  aim: { side: Side; angle: number; age: number; x: number; y: number } | null
  trail: { x: number; y: number }[]
}

export const other = (side: Side): Side => (side === 'left' ? 'right' : 'left')
export const sideOf = (x: number): Side => (x < NET_X ? 'left' : 'right')
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Serve alternates every two points, and every point once both reach deuce. */
export function serverFor(score: Score): Side {
  const total = score.left + score.right
  const deuce = score.left >= TARGET - 1 && score.right >= TARGET - 1
  const turn = deuce ? total : Math.floor(total / 2)
  return turn % 2 === 0 ? 'left' : 'right'
}

export function matchWinner(score: Score): Side | null {
  const lead = score.left - score.right
  if (score.left >= TARGET && lead >= 2) return 'left'
  if (score.right >= TARGET && lead <= -2) return 'right'
  return null
}

export function newWorld(score: Score = { left: 0, right: 0 }): World {
  const winner = matchWinner(score)
  const server = serverFor(score)
  return {
    x: server === 'left' ? 0.1 : 0.9,
    y: SERVE_Y,
    vx: 0,
    vy: 0,
    phase: winner ? 'over' : 'serve',
    server,
    lastHitter: null,
    canHit: null,
    bounces: 0,
    fault: null,
    score: { ...score },
    winner,
    pause: 0,
    botWait: 0.9,
    botSkip: false,
    aim: null,
    trail: []
  }
}

/** Whether `side` may strike the ball right now. */
export function hittable(w: World, side: Side): boolean {
  if (w.phase === 'serve') return side === w.server
  return w.phase === 'rally' && w.canHit === side && sideOf(w.x) === side && w.y < REACH
}

/** Strikes the ball toward the other half. `power` scales the launch speed around 1. */
export function hit(w: World, side: Side, angle: number, power = 1): boolean {
  if (!hittable(w, side)) return false
  const theta = (clamp(angle, MIN_ANGLE, MAX_ANGLE) * Math.PI) / 180
  const speed = SPEED * clamp(power, MIN_POWER, MAX_POWER)
  const dir = side === 'left' ? 1 : -1
  w.vx = dir * speed * Math.cos(theta)
  w.vy = speed * Math.sin(theta)
  w.phase = 'rally'
  w.lastHitter = side
  w.canHit = null
  w.bounces = 0
  w.fault = null
  w.botSkip = false
  w.botWait = 0
  w.aim = { side, angle: clamp(angle, MIN_ANGLE, MAX_ANGLE), age: 0, x: w.x, y: w.y }
  return true
}

/**
 * The launch for a tap at (tx, ty) in court units: the ball is aimed to land under the tap,
 * mirrored onto the far half if the tap is on the hitter's own, and a higher tap lobs.
 */
export function aimFrom(w: World, tx: number, ty: number): { angle: number; power: number } {
  const forward = w.x < NET_X ? 1 : -1
  const land = (tx - NET_X) * forward > 0 ? tx : 2 * NET_X - tx
  const d = Math.max(0.05, Math.abs(land - w.x))
  const toNet = Math.abs(NET_X - w.x)
  // Speed squared that lands the ball at d for a launch angle, and the height it has over the net.
  const speed2 = (theta: number) => (GRAVITY * d * d) / (2 * Math.cos(theta) ** 2 * (w.y + d * Math.tan(theta)))
  const atNet = (theta: number) =>
    w.y + toNet * Math.tan(theta) - (GRAVITY * toNet * toNet) / (2 * speed2(theta) * Math.cos(theta) ** 2)
  let angle = clamp((Math.atan2(Math.max(0, ty - w.y) + 0.06, d) * 180) / Math.PI, MIN_ANGLE, MAX_ANGLE)
  // A low tap still clears the net: it drives as flat as the net allows.
  while (angle < MAX_ANGLE && atNet((angle * Math.PI) / 180) < NET_H + 0.03) angle += 1
  return { angle, power: clamp(Math.sqrt(speed2((angle * Math.PI) / 180)) / SPEED, MIN_POWER, MAX_POWER) }
}

function award(w: World, side: Side, cues: Cue[]) {
  w.score[side] += 1
  w.winner = matchWinner(w.score)
  w.phase = w.winner ? 'over' : 'point'
  w.pause = 1.1
  w.canHit = null
  cues.push(w.winner ? 'over' : 'point')
}

function physics(w: World, dt: number, cues: Cue[]) {
  const px = w.x
  w.vy -= GRAVITY * dt
  w.x += w.vx * dt
  w.y += w.vy * dt

  const crossed = sideOf(px) !== sideOf(w.x)
  if (crossed && w.y < NET_H && !w.fault) {
    // The net turns the ball back on the side it came from; that side loses the point.
    w.x = px < NET_X ? NET_X - 0.004 : NET_X + 0.004
    w.vx = -w.vx * 0.25
    w.fault = w.lastHitter
    cues.push('net')
  } else if (crossed) {
    w.bounces = 0
    w.canHit = w.fault ? null : sideOf(w.x)
    w.botSkip = false
  }

  if (w.y <= 0) {
    w.y = 0
    w.vy = Math.abs(w.vy) * RESTITUTION
    w.vx *= 0.94
    w.bounces += 1
    cues.push('bounce')
    const landed = sideOf(w.x)
    if (w.fault) return award(w, other(w.fault), cues)
    if (w.lastHitter && landed === w.lastHitter) return award(w, other(w.lastHitter), cues)
    if (w.lastHitter && w.bounces >= 2) return award(w, w.lastHitter, cues)
  }

  if (w.x < 0 || w.x > 1) {
    const receiver: Side = w.x < 0 ? 'left' : 'right'
    if (!w.lastHitter || receiver === w.lastHitter) return award(w, other(receiver), cues)
    // Long before it landed: out. After a fair bounce: the receiver never got it back.
    return award(w, w.bounces === 0 ? receiver : w.lastHitter, cues)
  }
}

/** Where a shot from the current ball would first land, or null if it hits the net. */
function landing(x: number, y: number, angle: number, dir: number): number | null {
  const theta = (angle * Math.PI) / 180
  const vx = SPEED * Math.cos(theta)
  const vy = SPEED * Math.sin(theta)
  const toNet = Math.abs(NET_X - x) / vx
  const atNet = y + vy * toNet - (GRAVITY * toNet * toNet) / 2
  if (atNet < NET_H + 0.02) return null
  const t = (vy + Math.sqrt(vy * vy + 2 * GRAVITY * y)) / GRAVITY
  return x + dir * vx * t
}

const SLOP: Record<Level, { aim: number; miss: number; delay: number }> = {
  Easy: { aim: 9, miss: 0.25, delay: 0.14 },
  Normal: { aim: 4, miss: 0.1, delay: 0.07 },
  Hard: { aim: 1.5, miss: 0.03, delay: 0.02 }
}

/** The bot's angle for a target deep in the left half, with its level's slop. */
function botAngle(w: World, level: Level): number {
  const target = 0.12 + Math.random() * 0.28
  let best = 40
  let bestMiss = Infinity
  for (let a = MIN_ANGLE; a <= MAX_ANGLE; a += 0.5) {
    const land = landing(w.x, w.y, a, -1)
    if (land === null) continue
    const miss = Math.abs(land - target)
    if (miss < bestMiss) {
      bestMiss = miss
      best = a
    }
  }
  return best + (Math.random() + Math.random() - 1) * SLOP[level].aim
}

function bot(w: World, dt: number, level: Level, cues: Cue[]) {
  if (w.phase === 'serve' && w.server === 'right') {
    w.botWait -= dt
    if (w.botWait <= 0 && hit(w, 'right', botAngle(w, level))) cues.push('hit')
    return
  }
  if (!hittable(w, 'right') || w.botSkip) return
  // Let a ball that is flying long go out; take the rest off the bounce, or on the volley at Hard.
  if (w.bounces === 0) {
    const t = (w.vy + Math.sqrt(w.vy * w.vy + 2 * GRAVITY * w.y)) / GRAVITY
    if (w.x + w.vx * t > 1) return
    if (level !== 'Hard' || w.y > 0.2 || w.vy > 0) return
  }
  w.botWait += dt
  // Reaction time, cut short when the ball is about to leave the court.
  if (w.botWait < SLOP[level].delay && w.x < 0.95) return
  if (Math.random() < SLOP[level].miss) {
    w.botSkip = true
    return
  }
  if (hit(w, 'right', botAngle(w, level))) cues.push('hit')
}

/** Advances the world by `dt` seconds and reports what the player should hear. */
export function step(w: World, dt: number, mode: Mode, level: Level): Cue[] {
  const cues: Cue[] = []
  if (w.aim) w.aim.age += dt
  if (w.phase === 'over') return cues
  if (w.phase === 'point') {
    w.pause -= dt
    if (w.pause <= 0) Object.assign(w, newWorld(w.score))
    return cues
  }
  if (mode === 'bot') bot(w, dt, level, cues)
  if (w.phase === 'rally') {
    for (let left = dt; left > 0 && w.phase === 'rally'; left -= STEP) physics(w, Math.min(STEP, left), cues)
    w.trail.push({ x: w.x, y: w.y })
    if (w.trail.length > TRAIL) w.trail.shift()
  }
  return cues
}
