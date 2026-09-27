import * as stylex from '@stylexjs/stylex'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'

/** How a figure's count is drawn: days as dots, apps as icon tiles, events as live meter bars. */
type Kind = 'dot' | 'tile' | 'pulse' | 'people'
type Item = readonly [value: string, label: string, kind?: Kind]

const VW = 132
const VH = 30

/**
 * A row of big numbers with a line under each: a release at a glance. Each
 * number counts up the first time the row scrolls in, over a drawing of the
 * same count, so "26 apps" is twenty-six tiles popping in.
 */
export function Figures({ items }: { items: readonly Item[] }) {
  const row = useRef<HTMLDListElement>(null)
  const seen = useInView(row, { once: true, amount: 0.6 })
  return (
    <dl ref={row} {...stylex.props(styles.row)}>
      {items.map(([value, label, kind = 'tile'], i) => (
        <div key={label} {...stylex.props(styles.cell)}>
          <dt {...stylex.props(styles.label)}>{label}</dt>
          <dd {...stylex.props(styles.value)}>
            <Count to={value} on={seen} delay={i * 0.12} />
          </dd>
          <Pips n={Number.parseInt(value, 10) || 0} kind={kind} on={seen} delay={i * 0.12} />
        </div>
      ))}
    </dl>
  )
}

function Count({ to, on, delay }: { to: string; on: boolean; delay: number }) {
  const n = Number.parseInt(to, 10)
  const still = useReducedMotion() || Number.isNaN(n)
  const [shown, setShown] = useState(still ? to : '0')
  useEffect(() => {
    if (still || !on) return
    const run = animate(0, n, {
      duration: 0.9,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(String(Math.round(v)))
    })
    return () => run.stop()
  }, [on, n, delay, still])
  return <>{still ? to : shown}</>
}

const HUES = [color.accent, color.green, color.orange, color.red, color.rec]
type Shape = 'squircle' | 'circle' | 'triangle' | 'diamond' | 'ring'
const SHAPES: Shape[] = ['squircle', 'circle', 'triangle', 'diamond', 'ring']

/** One of the tile shapes, centred on (cx, cy) inside a square of side s. */
function Glyph({ shape, cx, cy, s, hue }: { shape: Shape; cx: number; cy: number; s: number; hue: string }) {
  const h = s / 2
  if (shape === 'circle') return <circle cx={cx} cy={cy} r={h} fill={hue} />
  if (shape === 'ring') return <circle cx={cx} cy={cy} r={h - 1} fill="none" stroke={hue} strokeWidth={2} />
  if (shape === 'triangle')
    return (
      <polygon
        points={`${cx},${cy - h} ${cx + h},${cy + h * 0.8} ${cx - h},${cy + h * 0.8}`}
        fill={hue}
        strokeLinejoin="round"
        stroke={hue}
        strokeWidth={1.5}
      />
    )
  if (shape === 'diamond')
    return <polygon points={`${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`} fill={hue} />
  return <rect x={cx - h} y={cy - h} width={s} height={s} rx={s * 0.28} fill={hue} />
}

function Pips({ n, kind, on, delay }: { n: number; kind: Kind; on: boolean; delay: number }) {
  if (n < 1) return null
  if (kind === 'people') return <People n={n} on={on} delay={delay} />
  const cols = n > 8 ? Math.ceil(n / 2) : n
  const rows = Math.ceil(n / cols)
  const cell = Math.min(VW / cols, VH / rows)
  const size = cell * 0.66
  const at = (i: number) => ({
    cx: (i % cols) * cell + cell / 2,
    cy: Math.floor(i / cols) * cell + (VH - rows * cell) / 2 + cell / 2
  })
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} aria-hidden="true" {...stylex.props(styles.pips)}>
      {/* Events: a wire the dots sit on, a signal running along it. */}
      {kind === 'pulse' && (
        <>
          <line x1={cell / 2} x2={VW - cell / 2} y1={VH / 2} y2={VH / 2} {...stylex.props(styles.wire)} />
          <line
            x1={cell / 2}
            x2={VW - cell / 2}
            y1={VH / 2}
            y2={VH / 2}
            pathLength={100}
            {...stylex.props(styles.signal, on && styles.signalOn)}
          />
        </>
      )}
      {Array.from({ length: n }, (_, i) => {
        const { cx, cy } = at(i)
        const wait = styles.wait(`${delay + (i / n) * 0.8}s`)
        const loop = styles.wait(`${delay + 0.9 + i * (kind === 'pulse' ? 0.36 : 0.12)}s`)
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a pip is its position.
          <g key={i} {...stylex.props(styles.pip, on && styles.popOn, wait)}>
            {kind === 'pulse' ? (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={VH / 5}
                  {...stylex.props(styles.shape, styles.ring, on && styles.ringOn, loop)}
                />
                <circle cx={cx} cy={cy} r={VH / 7} fill={color.green} />
              </>
            ) : kind === 'dot' ? (
              <>
                <circle cx={cx} cy={cy} r={size / 2.4} {...stylex.props(styles.day)} />
                {/* The week filling in, day after day, then starting over. */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={size / 2.4}
                  {...stylex.props(
                    styles.shape,
                    styles.today,
                    on && (i === n - 1 ? styles.glowOn : styles.fillOn),
                    loop
                  )}
                />
              </>
            ) : (
              <g {...stylex.props(styles.shape, on && styles.bobOn, loop)}>
                <Glyph shape={SHAPES[i % SHAPES.length]!} cx={cx} cy={cy} s={size} hue={HUES[(i * 2) % HUES.length]!} />
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Contributors as an avatar stack: each waves in turn and a heart floats up from it. */
function People({ n, on, delay }: { n: number; on: boolean; delay: number }) {
  const r = 8.5
  const gap = Math.min(14, (VW - r * 2) / (n - 1))
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} aria-hidden="true" {...stylex.props(styles.pips)}>
      {Array.from({ length: n }, (_, i) => {
        const cx = r + 1 + i * gap
        const cy = VH - r - 1
        const hue = HUES[(i * 3) % HUES.length]!
        const loop = styles.wait(`${delay + 0.9 + i * 0.5}s`)
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: an avatar is its position.
          <g key={i} {...stylex.props(styles.pip, on && styles.popOn, styles.wait(`${delay + (i / n) * 0.8}s`))}>
            <path
              d={`M${cx} ${cy - 6.5}c1.4 -2.2 5 -1.6 4.4 1.4c-.5 2.3 -4.4 4.5 -4.4 4.5s-3.9 -2.2 -4.4 -4.5c-.6 -3 3 -3.6 4.4 -1.4z`}
              fill={hue}
              {...stylex.props(styles.shape, styles.heart, on && styles.heartOn, loop)}
            />
            <g {...stylex.props(styles.shape, on && styles.waveOn, loop)}>
              <circle cx={cx} cy={cy} r={r} fill={hue} {...stylex.props(styles.avatar)} />
              <circle cx={cx} cy={cy - 2} r={2.6} {...stylex.props(styles.face)} />
              <path d={`M${cx - 4.6} ${cy + 6}a4.6 4.2 0 0 1 9.2 0`} {...stylex.props(styles.face)} />
            </g>
          </g>
        )
      })}
    </svg>
  )
}

const pop = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(0.2) rotate(-40deg)' },
  '70%': { opacity: 1, transform: 'scale(1.15) rotate(6deg)' },
  to: { opacity: 1, transform: 'scale(1) rotate(0)' }
})

// A device event arriving: a ring leaves the dot and fades, one dot after another.
const ripple = stylex.keyframes({
  '0%': { opacity: 0.7, transform: 'scale(0.5)' },
  '45%, 100%': { opacity: 0, transform: 'scale(1.6)' }
})

// Apps: each shape bobs and turns a little, in a wave across the grid.
const bob = stylex.keyframes({
  '0%, 60%, 100%': { transform: 'translateY(0) rotate(0)' },
  '20%': { transform: 'translateY(-3px) rotate(-8deg)' },
  '40%': { transform: 'translateY(1px) rotate(4deg)' }
})

// Days: each fills in turn, holds, and empties before the week starts again.
const fill = stylex.keyframes({
  '0%, 5%': { opacity: 0, transform: 'scale(0.3)' },
  '15%, 75%': { opacity: 1, transform: 'scale(1)' },
  '90%, 100%': { opacity: 0, transform: 'scale(0.3)' }
})
const glow = stylex.keyframes({
  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
  '50%': { opacity: 0.55, transform: 'scale(1.25)' }
})

// A community: someone nods, a heart rises off them and fades.
const nod = stylex.keyframes({
  '0%, 30%, 100%': { transform: 'translateY(0) rotate(0)' },
  '10%': { transform: 'translateY(-3px) rotate(-10deg)' },
  '20%': { transform: 'translateY(0) rotate(8deg)' }
})
const rise = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(4px) scale(0.4)' },
  '8%': { opacity: 1, transform: 'translateY(0) scale(1.1)' },
  '30%, 100%': { opacity: 0, transform: 'translateY(-11px) scale(0.8)' }
})

const run = stylex.keyframes({
  from: { strokeDashoffset: 100 },
  to: { strokeDashoffset: -20 }
})

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  row: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(4, 1fr)', [SMALL]: 'repeat(2, 1fr)' },
    gap: '8px',
    marginTop: '8px',
    marginBottom: '36px'
  },
  cell: {
    display: 'flex',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-end',
    gap: '6px',
    minWidth: 0,
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '18px',
    paddingRight: '18px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md
  },
  value: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '40px', [SMALL]: '32px' },
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
    color: color.text
  },
  label: { fontFamily: font.sans, fontSize: '14px', lineHeight: 1.35, color: color.text2 },
  pips: { display: 'block', width: '100%', maxWidth: `${VW}px`, height: 'auto', marginBottom: '10px' },
  pip: { transformBox: 'fill-box', transformOrigin: 'center', opacity: 0 },
  shape: { transformBox: 'fill-box', transformOrigin: 'center' },
  popOn: {
    animationName: pop,
    animationDuration: '0.6s',
    animationTimingFunction: ease.out,
    animationFillMode: 'both'
  },
  wait: (delay: string) => ({ animationDelay: delay }),
  day: { fill: 'none', stroke: color.borderStrong, strokeWidth: 1.5 },
  today: { fill: color.accent, opacity: 0 },
  fillOn: {
    animationName: fill,
    animationDuration: '3.2s',
    animationTimingFunction: ease.out,
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  },
  glowOn: {
    animationName: glow,
    animationDuration: '1.6s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  },
  bobOn: {
    animationName: bob,
    animationDuration: '2.4s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  },
  ring: { fill: 'none', stroke: color.green, strokeWidth: 1.5, opacity: 0 },
  ringOn: {
    animationName: ripple,
    animationDuration: '1.8s',
    animationTimingFunction: ease.out,
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  },
  avatar: { stroke: color.surface, strokeWidth: 1.5 },
  face: { fill: color.surface, opacity: 0.9 },
  heart: { opacity: 0 },
  heartOn: {
    animationName: rise,
    animationDuration: '4s',
    animationTimingFunction: ease.out,
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  },
  waveOn: {
    animationName: nod,
    animationDuration: '4s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  },
  wire: { stroke: color.border, strokeWidth: 1.5 },
  signal: {
    stroke: color.green,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeDasharray: '20 100',
    strokeDashoffset: 100
  },
  signalOn: {
    animationName: run,
    animationDuration: '1.8s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  }
})
