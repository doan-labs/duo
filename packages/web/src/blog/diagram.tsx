import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useRef, useSyncExternalStore } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'

// The frame every interactive figure in a post shares: an SVG on a card, a
// control row under it, a row of readouts.

/**
 * A readout that rolls: each changed character slides out and its successor in,
 * up when the number grew, down when it shrank, like an odometer.
 */
export function Roll({ text }: { text: string }) {
  const still = useReducedMotion()
  const last = useRef({ text, n: 0, dir: 1 })
  const n = Number.parseFloat(text.replace(/[^\d.-]/g, ''))
  if (text !== last.current.text) last.current = { text, n, dir: n >= last.current.n ? 1 : -1 }
  const dir = last.current.dir
  if (still) return <>{text}</>
  const chars = [...text.replace(/ /g, '\u00a0')]
  return (
    <span {...stylex.props(roll.row)}>
      {chars.map((ch, i) => (
        // Keyed from the right, so a new leading digit does not reshuffle the rest.
        // biome-ignore lint/suspicious/noArrayIndexKey: a slot is its place counted from the right.
        <span key={chars.length - i} {...stylex.props(roll.slot)}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={ch}
              initial={{ y: `${dir * 100}%`, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: `${dir * -100}%`, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

const roll = stylex.create({
  row: { display: 'inline-flex', fontVariantNumeric: 'tabular-nums' },
  slot: { position: 'relative', display: 'inline-flex', flexDirection: 'column', overflow: 'hidden' }
})

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div {...stylex.props(diagram.stat)}>
      <dt {...stylex.props(diagram.statLabel)}>{label}</dt>
      <dd {...stylex.props(diagram.statValue)}>{value}</dd>
    </div>
  )
}

const SMALL = '@media (max-width: 734px)'

export const diagram = stylex.create({
  figure: {
    marginTop: '8px',
    marginBottom: '36px',
    marginLeft: 0,
    marginRight: 0,
    paddingTop: '20px',
    paddingBottom: '20px',
    paddingLeft: { default: '24px', [SMALL]: '14px' },
    paddingRight: { default: '24px', [SMALL]: '14px' },
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.lg
  },
  svgText: { fontFamily: font.mono, fontSize: '12px', fill: color.text3 },
  controls: { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' },
  button: {
    flexShrink: 0,
    minWidth: '84px',
    paddingTop: '9px',
    paddingBottom: '9px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: color.accent, ':hover': color.accentHover },
    color: color.onAccent,
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  range: { flexGrow: 1, minWidth: 0, accentColor: color.accent },
  deg: { width: '44px', textAlign: 'right', fontFamily: font.mono, fontSize: '14px', color: color.text },
  stats: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(4, 1fr)', [SMALL]: 'repeat(2, 1fr)' },
    gap: '8px',
    marginTop: '18px',
    marginBottom: 0
  },
  stat: {
    minWidth: 0,
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '12px',
    paddingRight: '12px',
    backgroundColor: color.well,
    borderRadius: radius.sm
  },
  statLabel: {
    fontFamily: font.mono,
    fontSize: '10.5px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  statValue: {
    margin: 0,
    marginTop: '4px',
    fontFamily: font.sans,
    fontSize: '16px',
    fontWeight: 600,
    color: color.text
  }
})

const PHONE = '(max-width: 734px)'
const onPhone = (change: () => void) => {
  const q = window.matchMedia(PHONE)
  q.addEventListener('change', change)
  return () => q.removeEventListener('change', change)
}
/** Phone-width screens, for figures that redraw rather than shrink. Prerendered wide, then corrected on hydration. */
export const useNarrow = () =>
  useSyncExternalStore(
    onPhone,
    () => window.matchMedia(PHONE).matches,
    () => false
  )
