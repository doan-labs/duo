// The charts the metric pages draw. Bars grow from the baseline, lines draw
// left to right, the hypnogram stacks its stages - one animation vocabulary,
// and every point on it comes out of the book, never invented.

import type { Point, Sleep, SleepStage } from '@doan-labs/duo-fixtures/health.ts'
import { delay } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

const W = 340
const H = 140

/** Vertical bars with an optional dashed goal line and a label per stride. */
export function Bars({
  pts,
  tint,
  goal,
  labels
}: {
  pts: Point[]
  tint: string
  goal?: number
  labels?: (p: Point, i: number) => string | undefined
}) {
  const max = Math.max(goal ?? 0, ...pts.map((p) => p.value)) * 1.08 || 1
  const bw = W / pts.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      {pts.map((p, i) => {
        const h = Math.max(1.5, (p.value / max) * H)
        return (
          <rect
            key={p.key}
            x={i * bw + bw * 0.18}
            y={H - h}
            width={Math.max(1.5, bw * 0.64)}
            height={h}
            rx={Math.min(3, bw * 0.22)}
            {...stylex.props(styles.barGrow(tint), delay.ms(i * 24))}
          />
        )
      })}
      {goal != null && (
        <line x1={0} x2={W} y1={H - (goal / max) * H} y2={H - (goal / max) * H} {...stylex.props(styles.goalLine)} />
      )}
      {pts.map((p, i) => {
        const label = labels?.(p, i)
        return label ? (
          <text key={`l${p.key}`} x={i * bw + bw / 2} y={H + 14} textAnchor="middle" {...stylex.props(styles.axis)}>
            {label}
          </text>
        ) : null
      })}
    </svg>
  )
}

/** A smoothed line over a translucent fill, drawn in. */
export function Line({ pts, tint, floor }: { pts: Point[]; tint: string; floor?: number }) {
  const vals = pts.map((p) => p.value)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = Math.max(1, (hi - lo) * 0.2)
  const min = floor != null ? Math.min(floor, lo) : lo - pad
  const max = hi + pad
  const X = (i: number) => (i / (pts.length - 1)) * W
  const Y = (v: number) => H - ((v - min) / (max - min || 1)) * H
  // Catmull-Rom to cubic, the way every other soft chart in the kit curves.
  const d = pts
    .map((p, i) => {
      const p0 = pts[Math.max(0, i - 1)]!.value
      const p1 = p.value
      const p2 = pts[Math.min(pts.length - 1, i + 1)]!.value
      if (!i) return `M${X(0)} ${Y(p1)}`
      return `C${X(i - 1) + (X(i) - X(i - 1)) / 6} ${Y(p0)} ${X(i) - (X(i) - X(i - 1)) / 6} ${Y(p2)} ${X(i)} ${Y(p1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      <path d={`${d} L${W} ${H} L0 ${H} Z`} {...stylex.props(styles.lineFill(tint))} />
      <path d={d} fill="none" stroke={tint} strokeWidth={2} strokeLinejoin="round" {...stylex.props(styles.lineDraw)} />
      {pts.map((p, i) =>
        i % Math.ceil(pts.length / 6) === 0 ? (
          <text key={p.key} x={X(i)} y={H + 14} textAnchor="middle" {...stylex.props(styles.axis)}>
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  )
}

/** The card-size sparkline: a bare polyline, no axes. */
export function Spark({ pts, tint, w = 120, h = 44 }: { pts: number[]; tint: string; w?: number; h?: number }) {
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const d = pts
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * w).toFixed(1)} ${((1 - (v - lo) / (hi - lo || 1)) * h).toFixed(1)}`
    )
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" {...stylex.props(styles.spark)}>
      <path
        d={d}
        fill="none"
        stroke={tint}
        strokeWidth={1.6}
        strokeLinejoin="round"
        {...stylex.props(styles.lineDrawShort)}
      />
    </svg>
  )
}

const STAGE_TINT: Record<SleepStage, string> = {
  deep: colors.indigo,
  core: colors.blue,
  rem: colors.cyan,
  awake: colors.orange
}

/**
 * One night's hypnogram: the time axis runs left to right from bedtime to
 * wake, stages as colored bars at their level - deep low, awake high.
 */
export function Hypnogram({ sleep, w = 320, h = 96 }: { sleep: Sleep; w?: number; h?: number }) {
  const last = sleep.segs.at(-1)!
  const span = last.at + last.mins
  const lvl: Record<SleepStage, number> = { awake: 0, rem: 1, core: 2, deep: 3 }
  const rowH = h / 4
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" {...stylex.props(styles.spark)}>
      {sleep.segs.map((s, i) => (
        <rect
          // Segments are consecutive clock spans: positional, never reordered.
          // biome-ignore lint/suspicious/noArrayIndexKey: time segments have no id
          key={i}
          x={(s.at / span) * w}
          y={lvl[s.stage] * rowH + 3}
          width={Math.max(1.5, (s.mins / span) * w - 1)}
          height={rowH - 6}
          rx={4}
          {...stylex.props(styles.barGrow(STAGE_TINT[s.stage]), delay.ms(i * 14))}
        />
      ))}
    </svg>
  )
}
export { STAGE_TINT }

/** The sleep page's night bars: each night a vertical stack of its stages. */
export function SleepBars({ sleeps }: { sleeps: { key: string; s: Sleep }[] }) {
  const max = Math.max(...sleeps.map(({ s }) => s.bed)) * 1.05 || 1
  const bw = W / sleeps.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      {sleeps.map(({ key, s }, i) => {
        let y = H
        const totals: Record<SleepStage, number> = { awake: 0, rem: 0, core: 0, deep: 0 }
        for (const seg of s.segs) totals[seg.stage] += seg.mins
        return (
          <g key={key}>
            {(['deep', 'core', 'rem', 'awake'] as SleepStage[]).map((stage) => {
              const v = totals[stage]
              const h = (v / max) * H
              y -= h
              return h > 0.5 ? (
                <rect
                  key={stage}
                  x={i * bw + bw * 0.2}
                  y={y}
                  width={Math.max(1.5, bw * 0.6)}
                  height={h}
                  rx={Math.min(2.5, bw * 0.18)}
                  {...stylex.props(styles.barGrow(STAGE_TINT[stage]), delay.ms(i * 24))}
                />
              ) : null
            })}
            <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" {...stylex.props(styles.axis)}>
              {key.slice(8)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
