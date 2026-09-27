import * as stylex from '@stylexjs/stylex'
import { color, font, radius } from '../tokens.stylex'

/** Short cards, a title and a line each: what a paragraph of rules would say, at a glance. */
export function Points({ items }: { items: readonly (readonly [title: string, text: string, icon?: Icon])[] }) {
  return (
    <ul {...stylex.props(styles.grid)}>
      {items.map(([title, text, icon]) => (
        <li key={title} {...stylex.props(styles.card)}>
          {icon && <Glyph icon={icon} />}
          <span {...stylex.props(styles.title)}>{title}</span>
          <span {...stylex.props(styles.text)}>{text}</span>
        </li>
      ))}
    </ul>
  )
}

type Icon = 'taken' | 'heard' | 'state'

/** A small drawing that acts the rule out, in the text colour: shown, not told. */
function Glyph({ icon }: { icon: Icon }) {
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true" {...stylex.props(styles.glyph)}>
      {icon === 'taken' && (
        <>
          {/* A press on the side key travels into the app instead of the ringer. */}
          <rect x="15" y="3" width="18" height="22" rx="4" {...stylex.props(styles.line)} />
          <rect x="10" y="8" width="3" height="8" rx="1.5" {...stylex.props(styles.solid, styles.press)} />
          <circle cx="15" cy="12" r="2" {...stylex.props(styles.solid, styles.travel)} />
        </>
      )}
      {icon === 'heard' && (
        <>
          {/* The lock always closes; the app only hears it happen. */}
          <path d="M11 13V10a5 5 0 0 1 10 0v3" {...stylex.props(styles.line, styles.shackle)} />
          <rect x="8" y="13" width="16" height="12" rx="3" {...stylex.props(styles.line)} />
          <path d="M28 12a5 5 0 0 1 0 8" {...stylex.props(styles.line, styles.wave)} />
          <path d="M32 9a9 9 0 0 1 0 14" {...stylex.props(styles.line, styles.wave, styles.late)} />
        </>
      )}
      {icon === 'state' && (
        <>
          {/* A switch: its value now, then every flip. */}
          <rect x="4" y="7" width="32" height="14" rx="7" {...stylex.props(styles.line)} />
          <circle cx="11" cy="14" r="4.5" {...stylex.props(styles.solid, styles.knob)} />
        </>
      )}
    </svg>
  )
}

const press = stylex.keyframes({
  '0%, 30%, 100%': { transform: 'translateX(0)' },
  '10%, 20%': { transform: 'translateX(2px)' }
})
const travel = stylex.keyframes({
  '0%, 15%': { transform: 'translateX(0)', opacity: 0 },
  '25%': { opacity: 1 },
  '60%': { transform: 'translateX(9px)', opacity: 1 },
  '75%, 100%': { transform: 'translateX(9px) scale(2.2)', opacity: 0 }
})
const shackle = stylex.keyframes({
  '0%, 20%': { transform: 'translateY(-3px)' },
  '35%, 85%': { transform: 'translateY(0)' },
  '100%': { transform: 'translateY(-3px)' }
})
const wave = stylex.keyframes({
  '0%, 30%': { opacity: 0 },
  '45%': { opacity: 1 },
  '80%, 100%': { opacity: 0 }
})
const flip = stylex.keyframes({
  '0%, 35%': { transform: 'translateX(0)' },
  '50%, 85%': { transform: 'translateX(18px)' },
  '100%': { transform: 'translateX(0)' }
})

const LOOP = {
  animationDuration: '2.4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
} as const

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  grid: {
    listStyleType: 'none',
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(auto-fit, minmax(200px, 1fr))', [SMALL]: '1fr' },
    gap: '10px',
    marginTop: '8px',
    marginBottom: '32px',
    marginLeft: 0,
    marginRight: 0,
    padding: 0
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '18px',
    paddingRight: '18px',
    backgroundColor: color.well,
    borderRadius: radius.md
  },
  glyph: {
    display: 'block',
    width: '40px',
    height: '28px',
    marginBottom: '4px',
    color: color.text,
    overflow: 'visible'
  },
  line: { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
  solid: { fill: 'currentColor', transformBox: 'fill-box', transformOrigin: 'center' },
  press: { animationName: press, ...LOOP },
  travel: { animationName: travel, ...LOOP },
  shackle: { animationName: shackle, ...LOOP },
  wave: { opacity: 0, animationName: wave, ...LOOP },
  late: { animationDelay: '0.15s' },
  knob: { animationName: flip, ...LOOP },
  title: { fontFamily: font.sans, fontSize: '16px', fontWeight: 600, color: color.text },
  text: { fontFamily: font.sans, fontSize: '15px', lineHeight: 1.5, color: color.text2 }
})
