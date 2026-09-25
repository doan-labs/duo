// The `volume` event as the two caps it came from: the one last heard is lit,
// and it sinks while it is held, so `e.button` and `e.action` read at a glance.
import type { DeviceEvents } from '@doan-labs/duo-sdk'
import * as stylex from '@stylexjs/stylex'
import { color, ease, font, radius } from '../tokens.stylex'

const REDUCE = '@media (prefers-reduced-motion: reduce)'

export function VolumeKeys({ e }: { e?: DeviceEvents['volume'] }) {
  return (
    <span {...stylex.props(styles.keys)}>
      {(['up', 'down'] as const).map((b) => {
        const last = e?.button === b
        const held = last && e.action === 'press'
        return (
          <span
            key={b}
            role="img"
            aria-label={`Volume ${b}${held ? ', held' : ''}`}
            {...stylex.props(styles.key, last && styles.last, held && styles.held)}
          >
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={b === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
            </svg>
          </span>
        )
      })}
    </span>
  )
}

/** The score, sliding in from the side the press pushed it. */
export function Score({ score, up }: { score: number; up?: boolean }) {
  return (
    <span key={score} {...stylex.props(styles.score, up === true && styles.rise, up === false && styles.fall)}>
      {score}
    </span>
  )
}

const rise = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(10px)' },
  to: { opacity: 1, transform: 'none' }
})
const fall = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(-10px)' },
  to: { opacity: 1, transform: 'none' }
})

const styles = stylex.create({
  keys: { display: 'flex', gap: '8px' },
  key: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '32px',
    borderRadius: radius.pill,
    backgroundColor: color.well,
    color: color.text3,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: '0.22s',
    transitionTimingFunction: ease.out
  },
  last: { color: color.accent, backgroundColor: color.accentSoft },
  held: {
    backgroundColor: color.accent,
    color: color.onAccent,
    transform: { default: 'scale(0.9)', [REDUCE]: 'none' },
    transitionDuration: '0.08s'
  },
  score: { display: 'inline-block', fontFamily: font.mono, fontSize: '22px', fontVariantNumeric: 'tabular-nums' },
  rise: {
    animationName: { default: rise, [REDUCE]: 'none' },
    animationDuration: '0.28s',
    animationTimingFunction: ease.out
  },
  fall: {
    animationName: { default: fall, [REDUCE]: 'none' },
    animationDuration: '0.28s',
    animationTimingFunction: ease.out
  }
})
