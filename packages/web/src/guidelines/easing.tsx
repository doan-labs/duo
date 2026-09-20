// The curves and the one press state, each with a sample you can run: hover or
// focus sends the dot out, leaving brings it back, and a tap toggles it on a
// touch screen. Feeling the difference between `push` and `bounce` is the only
// way to pick between them. Both scales are token strings at runtime, so they
// reach CSS through dynamic styles rather than literals.
import * as stylex from '@stylexjs/stylex'
import { useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { easing, motion as pressTokens } from '../generated/tokens'
import { color, font, radius } from '../tokens.stylex'
import { Group } from './group'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

/** Long enough that the shape of the curve, not just the distance, is legible. */
const TRAVEL = '900ms'

const PRESS = new Map(pressTokens.map((t) => [t.name, t.value]))

export const EASING_COUNT = easing.length + pressTokens.length

export function Easing() {
  const still = !!useReducedMotion()
  const scale = PRESS.get('press') ?? 'scale(1)'
  const duration = PRESS.get('pressDuration') ?? '0s'
  return (
    <div>
      <Group title="Curves" note="The only easings in the system. Hover a row to run it, or tap it.">
        <div {...stylex.props(styles.rows)}>
          {easing.map((t) => (
            <Curve key={t.name} name={t.name} value={t.value} doc={t.doc} still={still} />
          ))}
        </div>
      </Group>

      <Group title="Press" note="One press state, shared by everything tappable. Hold the button to feel it.">
        <div {...stylex.props(styles.rows)}>
          <div {...stylex.props(styles.row)}>
            <span {...stylex.props(styles.name)}>press</span>
            <span>
              <button type="button" {...stylex.props(styles.press, styles.held(still ? 'scale(1)' : scale, duration))}>
                Hold me
              </button>
            </span>
            <span {...stylex.props(styles.metrics)}>{pressTokens.map((t) => t.value).join(' / ')}</span>
          </div>
        </div>
      </Group>
    </div>
  )
}

/** One row: the token name, a track the dot runs along, and the curve in mono. */
function Curve({ name, value, doc, still }: { name: string; value: string; doc: string; still: boolean }) {
  const [out, setOut] = useState(false)
  return (
    <button
      type="button"
      title={doc || undefined}
      onClick={() => setOut((v) => !v)}
      onPointerEnter={() => setOut(true)}
      onPointerLeave={() => setOut(false)}
      onFocus={() => setOut(true)}
      onBlur={() => setOut(false)}
      {...stylex.props(styles.row, styles.runner)}
    >
      <span {...stylex.props(styles.name)}>{name}</span>
      <span {...stylex.props(styles.track)}>
        <span {...stylex.props(styles.dot, styles.curve(value, still ? '0ms' : TRAVEL), out && styles.dotOut)} />
      </span>
      <span {...stylex.props(styles.metrics)}>{value}</span>
    </button>
  )
}

const styles = stylex.create({
  // Wide enough that the shape of the curve reads, narrow enough that the row
  // is not mostly empty track.
  rows: { display: 'grid', gap: 0, maxWidth: '820px' },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: '96px minmax(0, 1fr) 208px', [SMALL]: '76px minmax(0, 1fr)' },
    alignItems: 'center',
    gap: '14px',
    paddingTop: '12px',
    paddingBottom: '12px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  runner: {
    width: '100%',
    appearance: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    margin: 0,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: 'transparent',
    borderTopStyle: 'none',
    borderLeftStyle: 'none',
    borderRightStyle: 'none',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '2px'
  },
  name: { display: 'block', fontFamily: font.mono, fontSize: '12px', lineHeight: 1.5, color: color.text },
  track: {
    position: 'relative',
    display: 'block',
    height: '18px',
    borderRadius: radius.pill,
    backgroundColor: color.well
  },
  // `left` rather than a transform: the travel is the width of the track, which
  // a percentage resolves against and a translate does not.
  dot: {
    position: 'absolute',
    top: '3px',
    left: '3px',
    width: '12px',
    height: '12px',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    transitionProperty: 'left'
  },
  curve: (ease: string, duration: string) => ({ transitionTimingFunction: ease, transitionDuration: duration }),
  dotOut: { left: 'calc(100% - 15px)' },
  press: {
    appearance: 'none',
    cursor: 'pointer',
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 500,
    color: color.text,
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    borderRadius: radius.sm,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '16px',
    paddingRight: '16px',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '3px'
  },
  held: (scale: string, duration: string) => ({
    transform: { default: 'scale(1)', ':active': scale },
    transitionDuration: duration
  }),
  metrics: {
    display: 'block',
    gridColumn: { default: 'auto', [SMALL]: '1 / -1' },
    fontFamily: font.mono,
    fontSize: '12px',
    lineHeight: 1.5,
    color: color.text3,
    overflowWrap: 'anywhere'
  }
})
