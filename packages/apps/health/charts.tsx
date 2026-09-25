// The charts the metric pages draw, on a look of our own: a dotted hairline
// grid behind everything, capsule bars off a baseline, a smooth line over a
// gradient that fades to nothing, and sleep as one continuous wave that
// changes colour at each stage. One animation vocabulary, and every point
// comes out of the book, never invented.

import type { Point, Sleep, SleepStage } from '@doan-labs/duo-fixtures/health.ts'
import { delay } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

const W = 340
const H = 140

/** Catmull-Rom through the points, the way every soft chart in the kit curves. */
const smooth = (points: [number, number][]) =>
  points
    .map(([x, y], i) => {
      if (!i) return `M${x} ${y}`
      const [px, py] = points[i - 1]!
      const ny = points[Math.min(points.length - 1, i + 1)]![1]
      const dx = (x - px) / 6
      return `C${px + dx} ${py} ${x - dx} ${ny} ${x} ${y}`
    })
    .join(' ')

/** Dotted hairlines at the quartiles - the chart paper every big chart shares. */
const Grid = () => (
  <>
    {[0.25, 0.5, 0.75].map((t) => (
      <line key={t} x1={0} x2={W} y1={H * t} y2={H * t} {...stylex.props(styles.gridLine)} />
    ))}
  </>
)

/** Capsule bars off a baseline hairline, an optional dotted goal, a label per stride. */
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
  const barW = Math.min(24, Math.max(1.5, bw * 0.58))
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      <Grid />
      <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} {...stylex.props(styles.baseline)} />
      {pts.map((p, i) => {
        const h = Math.max(3, (p.value / max) * H)
        return (
          <rect
            key={p.key}
            x={i * bw + (bw - barW) / 2}
            y={H - h}
            width={barW}
            height={h}
            rx={Math.min(barW / 2, 6)}
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

/** A smoothed line over a fading gradient, drawn in, latest point dotted. */
export function Line({ pts, tint, floor }: { pts: Point[]; tint: string; floor?: number }) {
  const vals = pts.map((p) => p.value)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = Math.max(1, (hi - lo) * 0.2)
  const min = floor != null ? Math.min(floor, lo) : lo - pad
  const max = hi + pad
  const X = (i: number) => (i / (pts.length - 1)) * W
  const Y = (v: number) => H - ((v - min) / (max - min || 1)) * H
  const d = smooth(pts.map((p, i) => [X(i), Y(p.value)] as [number, number]))
  const gid = `line-${tint.replace(/[^a-zA-Z0-9]/g, '')}`
  const last = pts.at(-1)!
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity="0.3" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </linearGradient>
      </defs>
      <Grid />
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${gid})`} />
      <path
        d={d}
        fill="none"
        stroke={tint}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...stylex.props(styles.lineDraw)}
      />
      <circle cx={X(pts.length - 1)} cy={Y(last.value)} r={5.5} {...stylex.props(styles.lineDotRing(tint))} />
      <circle cx={X(pts.length - 1)} cy={Y(last.value)} r={3} {...stylex.props(styles.lineDot(tint))} />
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

/** The card-size sparkline: the same smooth line and fade, no axes. */
export function Spark({ pts, tint, w = 120, h = 44 }: { pts: number[]; tint: string; w?: number; h?: number }) {
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const pad = (hi - lo) * 0.08
  const Y = (v: number) => h - ((v - (lo - pad)) / (hi - lo + pad * 2 || 1)) * h
  const d = smooth(pts.map((v, i) => [(i / (pts.length - 1)) * w, Y(v)] as [number, number]))
  const gid = `spark-${tint.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" {...stylex.props(styles.spark)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity="0.24" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />
      <path
        d={d}
        fill="none"
        stroke={tint}
        strokeWidth={1.8}
        strokeLinecap="round"
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
 * One night's hypnogram, drawn as a wave instead of a bar chart: the level of
 * each stage is a row, and the line runs along a segment's row then eases to
 * the next stage's row at the boundary - deep low, awake high.
 */
export function Hypnogram({ sleep, w = 320, h = 96 }: { sleep: Sleep; w?: number; h?: number }) {
  const last = sleep.segs.at(-1)!
  const span = last.at + last.mins
  const lvl: Record<SleepStage, number> = { awake: 0, rem: 1, core: 2, deep: 3 }
  const rowH = h / 4
  const sw = Math.min(6, rowH * 0.45)
  const X0 = (s: Sleep['segs'][number]) => (s.at / span) * w
  const X1 = (s: Sleep['segs'][number]) => ((s.at + s.mins) / span) * w
  const Y = (s: Sleep['segs'][number]) => lvl[s.stage] * rowH + rowH / 2
  const rows = ['awake', 'rem', 'core', 'deep'] as const
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" {...stylex.props(styles.spark)}>
      {rows.map((stage) => (
        <line
          key={stage}
          x1={sw}
          x2={w - sw}
          y1={lvl[stage] * rowH + rowH / 2}
          y2={lvl[stage] * rowH + rowH / 2}
          {...stylex.props(styles.gridLine)}
        />
      ))}
      {sleep.segs.map((s, i) => {
        const next = sleep.segs[i + 1]
        const x0 = X0(s)
        const x1 = X1(s)
        const y = Y(s)
        const off = Math.min(11, Math.max(4, (x1 - x0) * 0.4))
        return (
          // Segments are consecutive clock spans: positional, never reordered.
          // biome-ignore lint/suspicious/noArrayIndexKey: time segments have no id
          <g key={i}>
            <path
              d={`M${x0} ${y} L${x1} ${y}`}
              {...stylex.props(styles.hypnoRun(STAGE_TINT[s.stage], sw), delay.ms(i * 30))}
            />
            {next && (
              <path
                d={`M${x1} ${y} C${x1 + off * 0.5} ${y} ${x1 + off * 0.5} ${Y(next)} ${x1 + off} ${Y(next)}`}
                {...stylex.props(styles.hypnoLink(STAGE_TINT[next.stage], sw), delay.ms(i * 30 + 25))}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
export { STAGE_TINT }

/** The sleep page's night bars: each night a capsule stack of its stages. */
export function SleepBars({ sleeps }: { sleeps: { key: string; s: Sleep }[] }) {
  const max = Math.max(...sleeps.map(({ s }) => s.bed)) * 1.05 || 1
  const bw = W / sleeps.length
  const barW = Math.min(14, Math.max(1.5, bw * 0.56))
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} aria-hidden="true" {...stylex.props(styles.chartSvg)}>
      <Grid />
      <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} {...stylex.props(styles.baseline)} />
      {sleeps.map(({ key, s }, i) => {
        let y = H
        const totals: Record<SleepStage, number> = { awake: 0, rem: 0, core: 0, deep: 0 }
        for (const seg of s.segs) totals[seg.stage] += seg.mins
        const segs = (['deep', 'core', 'rem', 'awake'] as SleepStage[]).filter(
          (stage) => (totals[stage] / max) * H > 0.5
        )
        return (
          <g key={key}>
            {segs.map((stage, j) => {
              const v = totals[stage]
              const h = (v / max) * H
              y -= h
              return (
                <rect
                  key={stage}
                  x={i * bw + (bw - barW) / 2}
                  y={y}
                  width={barW}
                  height={h}
                  rx={Math.min(j === segs.length - 1 ? barW / 2 : 1, 3)}
                  {...stylex.props(styles.barGrow(STAGE_TINT[stage]), delay.ms(i * 24))}
                />
              )
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
