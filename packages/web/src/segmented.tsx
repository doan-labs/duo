// One segmented control for the whole site: a sunken track, and a thumb that
// slides to the option you pick instead of blinking into place. Tabs and button
// groups differ only in the ARIA they owe a screen reader, so `semantics` picks
// that rather than forking a second component. The container is a div, not a
// fieldset, because a fieldset does not lay out as a grid item in WebKit.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import type { KeyboardEvent, ReactNode } from 'react'
import { SLIDE, TAP } from './motion'
import { color, ease, font, radius } from './tokens.stylex'

export type Option<Value> = {
  value: Value
  /** The visible text. With an `icon` it becomes the spoken name instead. */
  label: string
  /** Renders in place of the label, for an icon-only control. */
  icon?: ReactNode
  /** The small mono badge after the label, as in `All 47`. */
  count?: ReactNode
}

/** Roving focus: each key maps to the index it lands on, wrapping at the ends. */
const MOVES: Record<string, (from: number, length: number) => number> = {
  ArrowRight: (from, length) => (from + 1) % length,
  ArrowLeft: (from, length) => (from - 1 + length) % length,
  Home: () => 0,
  End: (_from, length) => length - 1
}

const INSTANT = { duration: 0 }

export function Segmented<Value extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
  semantics = 'group',
  size = 'md'
}: {
  /** Unique on the page: the thumb travels by `layoutId`, so two controls sharing an id would swap thumbs. */
  id: string
  /** Names the whole control for screen readers. */
  label: string
  options: readonly Option<Value>[]
  value: Value
  onChange: (value: Value) => void
  /** `group` for a button group (`aria-pressed`), `tablist` for real tabs (`aria-selected`). */
  semantics?: 'group' | 'tablist'
  /** `sm` for dense bars like the builder toolbar. */
  size?: 'sm' | 'md'
}) {
  const still = useReducedMotion()
  const tabs = semantics === 'tablist'

  function move(e: KeyboardEvent<HTMLDivElement>) {
    const step = MOVES[e.key]
    if (!step) return
    e.preventDefault()
    const to = step(
      options.findIndex((o) => o.value === value),
      options.length
    )
    const next = options[to]
    if (!next) return
    onChange(next.value)
    // The selection carries focus with it, so the next arrow key starts from where the eye is.
    e.currentTarget.querySelectorAll('button')[to]?.focus()
  }

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the role is computed, so the rule reads this as a bare div. Both `tablist` and `group` take a label.
    // biome-ignore lint/a11y/noStaticElementInteractions: same blind spot. The container carries the key handler because a roving tabindex moves the selection between the buttons inside it, which are the interactive elements.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above.
    <div
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
      onKeyDown={move}
      {...stylex.props(styles.track, size === 'sm' && styles.trackSm)}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <motion.button
            key={String(o.value)}
            id={`${id}-${o.value}`}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            aria-label={o.icon ? o.label : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            whileTap={still ? undefined : { scale: TAP }}
            {...stylex.props(styles.option, styles[size], Boolean(o.icon) && styles.icon, on && styles.on)}
          >
            {on && (
              <motion.span
                layoutId={`${id}-thumb`}
                initial={false}
                transition={still ? INSTANT : SLIDE}
                {...stylex.props(styles.thumb)}
              />
            )}
            {/* Both faces sit above every thumb, not merely above their own: see `face`. */}
            <span {...stylex.props(styles.face)}>{o.icon ?? o.label}</span>
            {o.count !== undefined && <span {...stylex.props(styles.face, styles.count)}>{o.count}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

const styles = stylex.create({
  track: {
    // The one stacking context the thumb and the labels sort inside. Without it
    // they would sort against the page, and the thumb's shadow would sit over
    // whatever the control happens to be laid on.
    isolation: 'isolate',
    display: 'inline-flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px',
    margin: 0,
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '3px',
    paddingRight: '3px',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: color.well
  },
  trackSm: { paddingTop: '2px', paddingBottom: '2px', paddingLeft: '2px', paddingRight: '2px' },
  option: {
    // Positioned, but deliberately not a stacking context. `isolation: isolate`
    // was here once and it is what made the labels flash: an isolated button
    // paints as one unit, so the thumb travelling out of the right-hand button
    // painted over the text of every button it passed on the way left. Leaving
    // the buttons transparent lets the thumb and the faces sort against the
    // track instead, where z-index can put every face above every thumb.
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: { default: color.text2, ':hover': color.text },
    fontFamily: font.sans,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    outlineWidth: { default: '0', ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: color.ring,
    outlineOffset: '2px',
    // The label of the option being left and the one being entered cross-fade instead of snapping.
    transitionProperty: 'color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
  },
  md: { height: '32px', paddingLeft: '14px', paddingRight: '14px', fontSize: '14px' },
  sm: { height: '28px', paddingLeft: '12px', paddingRight: '12px', fontSize: '13px' },
  icon: { paddingLeft: '10px', paddingRight: '10px' },
  on: { color: color.text },
  thumb: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // The floor of the track: above its sunken fill, below every face.
    zIndex: 0,
    borderRadius: radius.pill,
    backgroundColor: color.thumb,
    boxShadow: color.thumbShadow
  },
  /** A positive z-index is painted after every auto and zero one, whichever button it belongs to. */
  face: { position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center' },
  count: { fontFamily: font.mono, fontSize: '12px', color: color.text3 }
})
