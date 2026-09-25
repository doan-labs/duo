// The Camera Control sample's three calls, drawn: `focus()` brackets the middle
// while the cap is held, `zoom` scales the scene, and `shoot()` flashes it.
import * as stylex from '@stylexjs/stylex'
import { color, ease, font } from '../tokens.stylex'

const REDUCE = '@media (prefers-reduced-motion: reduce)'
const MAX = 10

export function Viewfinder({ zoom, focusing, shots }: { zoom: number; focusing: boolean; shots: number }) {
  const z = Math.min(MAX, Math.max(1, zoom))
  return (
    <svg viewBox="0 0 160 96" role="img" aria-label={`Viewfinder at ${zoom.toFixed(1)}×`} {...stylex.props(styles.svg)}>
      {/* A plain id: a token inside one would not parse (AGENTS.md). One viewfinder per page. */}
      <clipPath id="hwfinder">
        <rect width="160" height="96" rx="10" />
      </clipPath>
      <g clipPath="url(#hwfinder)">
        <rect width="160" height="96" {...stylex.props(styles.sky)} />
        <g {...stylex.props(styles.scene, styles.zoomTo(z))}>
          <circle cx="108" cy="30" r="8" {...stylex.props(styles.sun)} />
          <path d="M-20 96L30 52l22 18 30-32 36 34 22-14 40 38z" {...stylex.props(styles.far)} />
          <path d="M-20 96l60-24 36 12 34-18 70 30z" {...stylex.props(styles.near)} />
          {/* Too small to make out until you zoom: the reason to slide. */}
          <path d="M78.6 47.6l1 .8 1-.8M81.6 46.8l.7.6.7-.6" {...stylex.props(styles.birds)} />
        </g>
        {shots > 0 && <rect key={shots} width="160" height="96" {...stylex.props(styles.flash)} />}
      </g>
      <path d="M8 22V8h14M138 8h14v14M152 74v14h-14M22 88H8V74" {...stylex.props(styles.corners)} />
      {focusing && <rect x="66" y="34" width="28" height="28" rx="2" {...stylex.props(styles.focus)} />}
      <rect x="64" y="74" width="32" height="14" rx="7" {...stylex.props(styles.pill)} />
      <text x="80" y="84" textAnchor="middle" {...stylex.props(styles.label)}>
        {z < 9.95 ? z.toFixed(1) : MAX}×
      </text>
    </svg>
  )
}

const flash = stylex.keyframes({ from: { opacity: 0.9 }, to: { opacity: 0 } })
const lock = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(1.35)' },
  to: { opacity: 1, transform: 'none' }
})

const styles = stylex.create({
  svg: { display: 'block', width: '100%', maxWidth: '320px', height: 'auto' },
  sky: { fill: color.well },
  // Scaled about the middle of the frame, where the focus square sits.
  scene: {
    transformBox: 'view-box',
    transformOrigin: '80px 48px',
    transitionProperty: 'transform',
    transitionDuration: { default: '0.18s', [REDUCE]: '0s' },
    transitionTimingFunction: ease.out
  },
  zoomTo: (z: number) => ({ transform: `scale(${z})` }),
  sun: { fill: color.orange },
  far: { fill: color.borderStrong },
  near: { fill: color.text3 },
  birds: { fill: 'none', stroke: color.text, strokeWidth: 0.35, strokeLinecap: 'round', strokeLinejoin: 'round' },
  flash: {
    fill: color.surface,
    opacity: 0,
    animationName: { default: flash, [REDUCE]: 'none' },
    animationDuration: '0.4s',
    animationTimingFunction: ease.out
  },
  corners: { fill: 'none', stroke: color.text2, strokeWidth: 1.5, strokeLinecap: 'round' },
  focus: {
    fill: 'none',
    stroke: color.orange,
    strokeWidth: 1.2,
    transformBox: 'fill-box',
    transformOrigin: 'center',
    animationName: { default: lock, [REDUCE]: 'none' },
    animationDuration: '0.25s',
    animationTimingFunction: ease.out
  },
  pill: { fill: color.text },
  label: { fill: color.bg, fontFamily: font.mono, fontSize: '7.5px', fontWeight: 600 }
})
