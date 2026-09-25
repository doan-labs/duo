// Price charts: the detail page's gradient area chart and each row's sparkline.
// Both draw real closes only - a Catmull-Rom curve through them keeps the iOS
// shape without inventing points, and non-scaling strokes hold weight at any
// aspect ratio.

import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { Point } from './data.ts'
import { styles } from './styles.ts'

const W = 720
const H = 220
const PAD = 8

/** Catmull-Rom through every point, so the curve passes through real closes. */
const line = (pts: Point[], w: number, h: number, pad = PAD) => {
  if (pts.length < 2) return null
  const xs = pts.map((_, i) => pad + (i / (pts.length - 1)) * (w - pad * 2))
  const lo = Math.min(...pts.map((p) => p.c))
  const hi = Math.max(...pts.map((p) => p.c))
  const span = hi - lo || 1
  const ys = pts.map((p) => pad + (1 - (p.c - lo) / span) * (h - pad * 2))
  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = Math.max(0, i - 1)
    const p2 = i + 1
    const p3 = Math.min(pts.length - 1, i + 2)
    const c1x = xs[i]! + (xs[p2]! - xs[p0]!) / 6
    const c1y = ys[i]! + (ys[p2]! - ys[p0]!) / 6
    const c2x = xs[p2]! - (xs[p3]! - xs[i]!) / 6
    const c2y = ys[p2]! - (ys[p3]! - ys[i]!) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${xs[p2]} ${ys[p2]}`
  }
  return { d, x0: xs[0]!, x1: xs[xs.length - 1]!, up: pts[pts.length - 1]!.c >= pts[0]!.c }
}

/** The row's small preview: a bare stroke, green or red across the window. */
export function Spark({ pts, w = 64, ht = 30 }: { pts: Point[]; w?: number; ht?: number }) {
  const shape = line(pts, w, ht, 2)
  if (!shape)
    return (
      <svg viewBox={`0 0 ${w} ${ht}`} {...stylex.props(styles.spark, styles.size(w, ht))}>
        <title>Price history</title>
      </svg>
    )
  return (
    <svg viewBox={`0 0 ${w} ${ht}`} {...stylex.props(styles.spark, styles.size(w, ht))}>
      <title>Price history</title>
      <path
        d={shape.d}
        fill="none"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        stroke={shape.up ? colors.greenDark : colors.redDark}
      />
    </svg>
  )
}

/** The detail chart: smoothed line over a fading area fill in the trend colour. */
export function Chart({ pts }: { pts: Point[] }) {
  const shape = line(pts, W, H)
  if (!shape) return null
  const tone = shape.up ? colors.greenDark : colors.redDark
  const id = `fill-${tone === colors.greenDark ? 'up' : 'down'}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" {...stylex.props(styles.chartSvg)}>
      <title>Price chart</title>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone} stopOpacity={0.3} />
          <stop offset="1" stopColor={tone} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${shape.d} L ${shape.x1} ${H - PAD} L ${shape.x0} ${H - PAD} Z`} fill={`url(#${id})`} stroke="none" />
      <path
        d={shape.d}
        fill="none"
        stroke={tone}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
