// Renders one origami step scene as SVG. Elements are drawn in order; fold
// lines and arrows animate in when `still` is false (the app's own reduced
// motion flag) and honour the OS media query through the keyframes below.

import { colors, easing } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { El, Pt } from './models.ts'

// A diagram depicts literal paper, so its stock and ink are constants rather
// than theme surfaces: a white sheet stays a white sheet in either appearance
// (before this it borrowed app.surface and vanished on the dark stage), and
// its linework keeps a single reading contrast everywhere it is drawn.
const paperFill = {
  top: colors.white,
  flap: `color-mix(in srgb, ${colors.white}, ${colors.black} 9%)`,
  back: `color-mix(in srgb, ${colors.white}, ${colors.black} 17%)`
} as const

// The printed ink ramp: solid contours and layer edges darkest, prior creases
// a step lighter, ghost landing outlines intentionally faintest of all.
export const ink = {
  edge: `color-mix(in srgb, ${colors.black}, ${colors.white} 45%)`,
  crease: `color-mix(in srgb, ${colors.black}, ${colors.white} 52%)`,
  ghost: `color-mix(in srgb, ${colors.black}, ${colors.white} 68%)`,
  badge: `color-mix(in srgb, ${colors.white}, ${colors.black} 7%)`,
  valley: colors.blue,
  // Fold/action hues on white stock dip under 3:1; pulling them toward black
  // keeps the blue/orange/green semantics at reading contrast in both themes.
  mountain: `color-mix(in srgb, ${colors.orange}, ${colors.black} 22%)`,
  arrow: `color-mix(in srgb, ${colors.green}, ${colors.black} 22%)`
} as const

const path = (pts: readonly Pt[], close = false) =>
  `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')}${close ? ' Z' : ''}`

const quad = (pts: readonly Pt[]) => {
  const [a, b, c] = pts
  return a && b && c && pts.length === 3 ? `M${a[0]} ${a[1]} Q${b[0]} ${b[1]} ${c[0]} ${c[1]}` : path(pts)
}

// Arrowhead: a small filled triangle at the end of the last segment.
function head(pts: readonly Pt[]): string {
  const n = pts.length
  const a = pts[n - 2]
  const b = pts[n - 1]
  if (!a || !b) return ''
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const hx = b[0] - ux * 4.6
  const hy = b[1] - uy * 4.6
  return `M${b[0]} ${b[1]} L${hx + px * 2.6} ${hy + py * 2.6} L${hx - px * 2.6} ${hy - py * 2.6} Z`
}

function Mark({ at, sym }: { at: Pt; sym: 'flip' | 'open' | 'blow' }) {
  const [x, y] = at
  return (
    <g {...stylex.props(s.mark)}>
      <circle cx={x} cy={y} r={7.5} {...stylex.props(s.markBg)} />
      {sym === 'flip' && (
        <path
          d={`M${x - 3.4} ${y + 1.2} A3.6 3.6 0 1 1 ${x - 1.4} ${y - 3.2} M${x - 4.6} ${y - 3.6} L${x - 1.2} ${y - 3.6} L${x - 1.4} ${y - 0.4}`}
          {...stylex.props(s.markGlyph)}
        />
      )}
      {sym === 'open' && (
        <path
          d={`M${x} ${y} L${x - 3.6} ${y + 3.4} M${x} ${y} L${x + 3.6} ${y + 3.4} M${x - 4.6} ${y + 2.4} L${x - 3.6} ${y + 3.4} L${x - 2.6} ${y + 2.4} M${x + 4.6} ${y + 2.4} L${x + 3.6} ${y + 3.4} L${x + 2.6} ${y + 2.4}`}
          {...stylex.props(s.markGlyph)}
        />
      )}
      {sym === 'blow' && (
        <path
          d={`M${x - 3.4} ${y - 1.6} L${x - 1} ${y - 1.6} M${x - 4.2} ${y + 0.6} L${x - 0.6} ${y + 0.6} M${x - 3} ${y + 2.8} L${x - 0.4} ${y + 2.8} M${x + 1.8} ${y - 2.6} Q${x + 3.4} ${y - 1} ${x + 1.8} ${y + 0.6}`}
          {...stylex.props(s.markGlyph)}
        />
      )}
    </g>
  )
}

export function StepDiagram({ els, still, eager }: { els: readonly El[]; still?: boolean; eager?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" {...stylex.props(s.svg)} role="img" aria-hidden="true">
      {els.map((el, i) => {
        const key = `${el.k}${i}`
        switch (el.k) {
          case 'paper':
            return (
              <path
                key={key}
                d={path(el.pts, true)}
                fill={paperFill[el.tone ?? 'top']}
                stroke={ink.edge}
                strokeWidth={0.8}
                strokeLinejoin="round"
                {...stylex.props(still || eager ? s.in0 : s.fade)}
              />
            )
          case 'edge':
            return <path key={key} d={path(el.pts)} {...stylex.props(s.edge, still ? s.in0 : s.fade)} />
          case 'crease':
            return <path key={key} d={path(el.pts)} {...stylex.props(s.crease, still ? s.in0 : s.fade)} />
          case 'ghost':
            return <path key={key} d={path(el.pts, true)} {...stylex.props(s.ghost, still ? s.in0 : s.fade2)} />
          case 'fold':
            return (
              <path
                key={key}
                d={path(el.pts)}
                pathLength={1}
                {...stylex.props(el.dir === 'v' ? s.valley : s.mountain, still ? s.in0 : s.draw)}
              />
            )
          case 'arrow':
            return (
              <g key={key} {...stylex.props(still ? s.in0 : s.draw2)}>
                <path d={quad(el.pts)} pathLength={1} {...stylex.props(s.arrowLine)} />
                <path d={head(el.pts)} {...stylex.props(s.arrowHead)} />
              </g>
            )
          case 'mark':
            return <Mark key={key} at={el.at} sym={el.sym} />
        }
      })}
    </svg>
  )
}

const draw = stylex.keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } })
const fade = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const grow = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.6)' },
  to: { opacity: 1, transform: 'scale(1)' }
})

const s = stylex.create({
  // Height follows the box so a flex-shrunk card letterboxes the drawing
  // instead of overflowing it (preserveAspectRatio keeps it square).
  svg: { display: 'block', width: '100%', height: '100%' },
  in0: {},
  fade: {
    animationName: { default: fade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.25s',
    animationFillMode: 'backwards'
  },
  fade2: {
    animationName: { default: fade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationDelay: '.25s',
    animationFillMode: 'backwards'
  },
  draw: {
    animationName: { default: draw, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.out,
    animationFillMode: 'backwards'
  },
  draw2: {
    animationName: { default: fade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationDelay: '.3s',
    animationFillMode: 'backwards'
  },
  edge: { fill: 'none', stroke: ink.edge, strokeWidth: 0.7 },
  crease: { fill: 'none', stroke: ink.crease, strokeWidth: 0.6, strokeDasharray: '0.1 2.2', strokeLinecap: 'round' },
  valley: { fill: 'none', stroke: ink.valley, strokeWidth: 1.5, strokeDasharray: '3.4 2.4', strokeLinecap: 'round' },
  mountain: {
    fill: 'none',
    stroke: ink.mountain,
    strokeWidth: 1.5,
    strokeDasharray: '4.4 1.6 1 1.6',
    strokeLinecap: 'round'
  },
  ghost: { fill: 'none', stroke: ink.ghost, strokeWidth: 0.8, strokeDasharray: '2.2 2.2' },
  arrowLine: { fill: 'none', stroke: ink.arrow, strokeWidth: 1.6, strokeLinecap: 'round' },
  arrowHead: { fill: ink.arrow, stroke: 'none' },
  mark: {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    animationName: { default: grow, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationDelay: '.35s',
    animationFillMode: 'backwards'
  },
  markBg: { fill: ink.badge, stroke: ink.crease, strokeWidth: 0.5 },
  markGlyph: { fill: 'none', stroke: ink.edge, strokeWidth: 1.1, strokeLinecap: 'round', strokeLinejoin: 'round' }
})
