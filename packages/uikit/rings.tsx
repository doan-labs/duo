// Activity rings and the weekly bar chart, shared by Fitness, Health and Watch.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { app, appAppearance, easing, leading, radius, shadow, tracking, typeScale, weight } from './tokens.stylex.ts'

/** label, colour, done, goal, unit */
export const RINGS: [string, string, number, number, string][] = [
  ['Move', appAppearance.fitnessMove, 486, 620, 'KCAL'],
  ['Exercise', appAppearance.fitnessExercise, 41, 30, 'MIN'],
  ['Stand', appAppearance.fitnessStand, 9, 12, 'HRS']
]

/**
 * The three activity rings. They mount empty and fill on the next two frames —
 * a ring drawn straight at its value reads as a diagram, not as today's total.
 */
export function Rings({ size = 160, stroke = 15 }: { size?: number; stroke?: number }) {
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setFilled(true))
    })
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div {...stylex.props(styles.rings)}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true" {...stylex.props(styles.svg, styles.square(size))}>
        {RINGS.map(([label, c, done, goal], i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + 2)
          const C = 2 * Math.PI * r
          const to = C * Math.max(0, 1 - done / goal)
          return (
            <g key={label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={c}
                strokeWidth={stroke}
                strokeOpacity={0.22}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={c}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={filled ? to : C}
                {...stylex.props(styles.arc)}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * A bar chart with one bar per day, growing out of the axis on mount. The
 * caller supplies the values: a random walk barely moves over seven steps, so
 * the plot stretches whatever range it is given or every day comes out the
 * same height.
 */
export function Bars({ values, colour }: { values: number[]; colour: string }) {
  const n = values.length
  const raw = n > 0 ? values : [0]
  const lo = Math.min(...raw)
  const span = Math.max(1, Math.max(...raw) - lo)
  const vals = raw.map((v) => 26 + ((v - lo) / span) * 74)
  const d0 = new Date().getDay()
  return (
    <div>
      <div {...stylex.props(styles.bars, styles.tint(colour))}>
        {vals.map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one bar per weekday, never reordered
          <i key={i} {...stylex.props(styles.bar, styles.barAt(`${v.toFixed(1)}%`, i * 55, i === n - 1 ? 1 : 0.62))} />
        ))}
      </div>
      <div {...stylex.props(styles.barsX)}>
        {vals.map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one label per weekday, never reordered
          <span key={i} {...stylex.props(styles.barLabel)}>
            {'SMTWTFS'[(d0 - (n - 1 - i) + 70) % 7]}
          </span>
        ))}
      </div>
    </div>
  )
}

const grow = stylex.keyframes({ from: { transform: 'scaleY(0)' } })
// Keyframes cannot be imported from uikit/styles.ts: the compiler only resolves
// cross-module values from .stylex.ts files, so each file redeclares its own.
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

const styles = stylex.create({
  rings: { display: 'grid', placeItems: 'center', paddingTop: 10, paddingBottom: 2 },
  svg: { transform: 'rotate(-90deg)' },
  square: (px: number) => ({ width: px, height: px }),
  arc: {
    transitionProperty: 'stroke-dashoffset',
    transitionDuration: '1.15s',
    transitionTimingFunction: easing.pop
  },
  tint: (c: string) => ({ color: c }),
  bars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 7,
    height: 78,
    paddingTop: 8,
    paddingInline: 4
  },
  bar: {
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: radius.xs,
    backgroundColor: 'currentColor',
    transformOrigin: 'bottom',
    animationName: grow,
    animationDuration: '.75s',
    animationFillMode: 'backwards',
    animationTimingFunction: easing.pop
  },
  barAt: (height: string, delayMs: number, opacity: number) => ({
    height,
    animationDelay: `${delayMs}ms`,
    opacity
  }),
  barsX: {
    display: 'flex',
    gap: 7,
    paddingTop: 5,
    paddingInline: 4,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    color: app.label2
  },
  barLabel: { flexGrow: 1, flexBasis: 0, textAlign: 'center' }
})

/**
 * Health-style summary cards. One column on the cover display, two on the
 * inner — a 430 px card is a card, a 760 px one is a banner.
 */
export const card = stylex.create({
  cols: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
    rowGap: 0,
    columnGap: 14,
    paddingInline: 16
  },
  hcard: {
    marginInline: 0,
    marginBottom: 12,
    borderRadius: radius.xl,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    animationName: rise,
    animationDuration: '.45s',
    animationFillMode: 'backwards'
  },
  /** Cards on the black Fitness surface. */
  hcardDark: { backgroundColor: app.fill3, boxShadow: 'none' },
  cap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  capTint: (c: string) => ({ color: c }),
  val: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.semibold
  },
  unit: {
    textDecorationLine: 'none',
    fontSize: typeScale.subheadline,
    fontWeight: weight.medium,
    opacity: 0.55,
    marginLeft: 3
  }
})
