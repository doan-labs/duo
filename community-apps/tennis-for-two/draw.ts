// Canvas paint for the oscilloscope court. Colours arrive resolved from the kit's tokens
// through the root element's computed style, so nothing here hand-types a value.
import { hittable, NET_H, NET_X, type Side, type World } from './game.ts'

export type Ink = { trace: string; screen: string }
export type Frame = { left: number; ground: number; scale: number }

// Height of court the stage keeps in view. The steepest lobs climb past it and show as a caret on the top edge.
const SKY = 0.42

/** Court placement for a canvas of w x h CSS pixels: the court fills the width unless the height runs out. */
export function frame(w: number, h: number): Frame {
  const pad = Math.max(12, w * 0.05)
  const ground = h - Math.max(18, h * 0.16)
  const scale = Math.max(1, Math.min(w - pad * 2, (ground - pad) / SKY))
  return { left: (w - scale) / 2, ground, scale }
}

export const toCourt = (f: Frame, px: number, py: number) => ({
  x: (px - f.left) / f.scale,
  y: (f.ground - py) / f.scale
})

export function paint(ctx: CanvasRenderingContext2D, w: World, width: number, height: number, ink: Ink, live: Side[]) {
  const f = frame(width, height)
  const at = (x: number, y: number) => [f.left + x * f.scale, f.ground - y * f.scale] as const
  const line = Math.max(1.5, f.scale * 0.005)

  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.fillStyle = ink.screen
  ctx.fillRect(0, 0, width, height)

  // The faint graticule of the scope face.
  ctx.strokeStyle = ink.trace
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.08
  ctx.beginPath()
  for (let i = 0; i <= 10; i++) {
    const [x] = at(i / 10, 0)
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = f.ground; y > 0; y -= f.scale / 10) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  ctx.globalAlpha = 1
  ctx.shadowColor = ink.trace
  ctx.shadowBlur = line * 4
  ctx.lineWidth = line
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(...at(0, 0))
  ctx.lineTo(...at(1, 0))
  ctx.moveTo(...at(NET_X, 0))
  ctx.lineTo(...at(NET_X, NET_H))
  ctx.stroke()

  // The last strike's direction, fading like a phosphor trace.
  if (w.aim && w.aim.age < 0.6) {
    const from = w.aim
    const rad = (w.aim.angle * Math.PI) / 180
    const dir = w.aim.side === 'left' ? 1 : -1
    ctx.globalAlpha = 0.6 * (1 - w.aim.age / 0.6)
    ctx.beginPath()
    ctx.moveTo(...at(from.x, from.y))
    ctx.lineTo(...at(from.x + dir * Math.cos(rad) * 0.08, from.y + Math.sin(rad) * 0.08))
    ctx.stroke()
  }

  const radius = Math.max(3, f.scale * 0.011)
  w.trail.forEach((p, i) => {
    ctx.globalAlpha = ((i + 1) / w.trail.length) * 0.45
    ctx.beginPath()
    ctx.arc(...at(p.x, p.y), radius * (0.4 + (0.5 * i) / w.trail.length), 0, Math.PI * 2)
    ctx.fillStyle = ink.trace
    ctx.fill()
  })

  ctx.globalAlpha = 1
  ctx.shadowBlur = radius * 4
  ctx.fillStyle = ink.trace
  ctx.beginPath()
  ctx.arc(...at(w.x, w.y), radius, 0, Math.PI * 2)
  ctx.fill()

  const [bx, by] = at(w.x, w.y)
  if (by < radius) {
    ctx.beginPath()
    ctx.moveTo(bx, 2)
    ctx.lineTo(bx - radius * 1.4, 2 + radius * 2)
    ctx.lineTo(bx + radius * 1.4, 2 + radius * 2)
    ctx.closePath()
    ctx.fill()
  }

  // A ring tells a human player the ball is theirs to strike.
  if (live.some((side) => hittable(w, side))) {
    ctx.globalAlpha = 0.5
    ctx.shadowBlur = 0
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(...at(w.x, w.y), radius * 2.6, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}
