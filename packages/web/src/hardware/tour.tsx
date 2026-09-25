// A guided pass over the phone: a ring pulses on the cap the chapter is about,
// and a card beside it says what to do. The rings sit where the shell says the
// caps are (the `spots` bridge), so they follow the phone as it eases into a pose.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Spots } from '../simulator'
import { color, ease, font, radius } from '../tokens.stylex'

const REDUCE = '@media (prefers-reduced-motion: reduce)'
const SMALL = '@media (max-width: 734px)'
/** How far the card stands off the cap it points at. */
const GAP = 26
const CARD = 264

export type Stop = {
  title: string
  text: string
  /** The caps to ring, `drag` for the phone itself, or nothing to point at. */
  at: (keyof Spots)[] | 'drag' | null
  /** The card under the caps rather than beside them: volume, whose two caps sit side by side on the top edge. */
  below?: boolean
}

export function Tour({
  stop,
  step,
  steps,
  spots,
  done,
  onStep,
  onClose
}: {
  stop: Stop
  step: number
  steps: number
  spots: Spots | null
  /** The chapter's event has been heard: the ring has done its job. */
  done: boolean
  onStep: (i: number) => void
  onClose: () => void
}) {
  const layer = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = layer.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const caps = Array.isArray(stop.at) ? (spots ? stop.at.map((b) => spots[b]) : null) : []
  const below = stop.below || stop.at === 'drag'
  const mid = caps?.length ? caps.reduce((a, [cx]) => a + cx, 0) / caps.length : width / 2
  // A card under the caps stays inside the stage; its tail keeps pointing at them.
  const cx = below && width ? Math.min(Math.max(mid, CARD / 2 + 8), width - CARD / 2 - 8) : mid
  const x = caps?.length || width ? `${cx}px` : '50%'
  const y = caps?.length ? `${caps.reduce((a, [, cy]) => a + cy, 0) / caps.length}px` : '50%'
  const last = step === steps - 1
  return (
    <div ref={layer} {...stylex.props(styles.layer)}>
      {!done &&
        caps?.map(([px, py], i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the caps of one stop, fixed in number and order.
          <span key={i} {...stylex.props(styles.ring, styles.at(`${px}px`, `${py}px`))}>
            <span {...stylex.props(styles.pulse)} />
          </span>
        ))}
      {!done && stop.at === 'drag' && (
        <span {...stylex.props(styles.at('50%', '50%'), styles.track)}>
          <span {...stylex.props(styles.finger)} />
        </span>
      )}
      {caps && (
        <div
          {...stylex.props(
            styles.anchor,
            stop.at === null
              ? styles.bottom
              : styles.at(x, below ? `calc(${y} + ${stop.at === 'drag' ? 70 : GAP}px)` : y),
            stop.at !== null && (below ? styles.under : styles.beside)
          )}
        >
          <div key={step} role="dialog" aria-label={stop.title} {...stylex.props(styles.card)}>
            {stop.at !== null && stop.at !== 'drag' && (
              <span {...stylex.props(styles.arrow, below ? styles.arrowUp(mid - cx) : styles.arrowRight)} />
            )}
            <div {...stylex.props(styles.head)}>
              <p {...stylex.props(styles.title)}>{stop.title}</p>
              {done && <span {...stylex.props(styles.heard)}>✓ heard</span>}
              <button type="button" aria-label="Close the tour" onClick={onClose} {...stylex.props(styles.close)}>
                <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden="true">
                  <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p {...stylex.props(styles.text)}>{stop.text}</p>
            <div {...stylex.props(styles.foot)}>
              <button
                type="button"
                disabled={step === 0}
                onClick={() => onStep(step - 1)}
                {...stylex.props(styles.button)}
              >
                Back
              </button>
              <span role="img" aria-label={`Step ${step + 1} of ${steps}`} {...stylex.props(styles.dots)}>
                {Array.from({ length: steps }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: one dot per step, never reordered.
                  <span key={i} {...stylex.props(styles.dot, i === step && styles.dotOn)} />
                ))}
              </span>
              <button
                type="button"
                onClick={() => (last ? onClose() : onStep(step + 1))}
                {...stylex.props(styles.button, done && styles.primary)}
              >
                {last ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** The way back into a closed tour: a bubble in the stage's top right that breathes until it is pressed. */
export function TourBubble({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} {...stylex.props(styles.bubble)}>
      <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth={1.5} />
        <path
          d="M6.2 6.3a1.9 1.9 0 0 1 3.6.7c0 1.2-1.8 1.5-1.8 2.6M8 11.6v.1"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
      Show the tour
    </button>
  )
}

// A ring that swells off the bubble and fades: seen from across the page, never in the way.
const breathe = stylex.keyframes({
  '0%': { boxShadow: `${color.shadow}, 0 0 0 0 ${color.ring}` },
  '70%, 100%': { boxShadow: `${color.shadow}, 0 0 0 12px transparent` }
})
const pulse = stylex.keyframes({
  from: { opacity: 0.6, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(2.4)' }
})
const pop = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(0.96)' },
  to: { opacity: 1, transform: 'none' }
})
const swipe = stylex.keyframes({
  '0%, 100%': { transform: 'translateX(-46px)' },
  '50%': { transform: 'translateX(46px)' }
})

const styles = stylex.create({
  layer: { position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' },
  at: (left: string, top: string) => ({ left, top }),
  ring: {
    position: 'absolute',
    width: '30px',
    height: '30px',
    marginLeft: '-15px',
    marginTop: '-15px',
    borderRadius: radius.pill,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: color.accent,
    boxSizing: 'border-box'
  },
  pulse: {
    position: 'absolute',
    inset: '-2px',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    animationName: { default: pulse, [REDUCE]: 'none' },
    animationDuration: '1.6s',
    animationTimingFunction: ease.out,
    animationIterationCount: 'infinite',
    opacity: { default: 0, [REDUCE]: 0.25 }
  },
  track: { position: 'absolute', width: 0, height: 0 },
  finger: {
    position: 'absolute',
    width: '26px',
    height: '26px',
    marginLeft: '-13px',
    marginTop: '-13px',
    borderRadius: radius.pill,
    backgroundColor: color.accentSoft,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: color.accent,
    boxSizing: 'border-box',
    animationName: { default: swipe, [REDUCE]: 'none' },
    animationDuration: '2.4s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite'
  },
  anchor: {
    position: 'absolute',
    display: { default: 'block', [SMALL]: 'none' },
    transitionProperty: 'left, top',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out
  },
  beside: { transform: `translate(calc(-100% - ${GAP}px), -50%)` },
  under: { transform: 'translateX(-50%)' },
  bottom: { left: '50%', bottom: '24px', transform: 'translateX(-50%)' },
  card: {
    position: 'relative',
    width: `${CARD}px`,
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderRadius: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface,
    boxShadow: color.shadow,
    pointerEvents: 'auto',
    animationName: { default: pop, [REDUCE]: 'none' },
    animationDuration: '0.3s',
    animationTimingFunction: ease.out
  },
  // A turned square whose two outer sides carry the card's border: the tail of a speech bubble.
  arrow: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    backgroundColor: color.surface,
    borderColor: color.border,
    borderStyle: 'solid',
    borderWidth: 0
  },
  arrowRight: {
    right: '-7px',
    top: 'calc(50% - 6px)',
    transform: 'rotate(45deg)',
    borderTopWidth: '1px',
    borderRightWidth: '1px'
  },
  arrowUp: (dx: number) => ({
    top: '-7px',
    left: `calc(50% - 6px + ${dx}px)`,
    transform: 'rotate(45deg)',
    borderTopWidth: '1px',
    borderLeftWidth: '1px'
  }),
  head: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { margin: 0, flexGrow: 1, fontSize: '15px', fontWeight: 600, color: color.text },
  heard: { fontFamily: font.mono, fontSize: '11px', color: color.green },
  close: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': color.well },
    color: color.text3,
    cursor: 'pointer'
  },
  text: { marginTop: '6px', marginBottom: 0, fontSize: '13.5px', lineHeight: 1.5, color: color.text2 },
  foot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' },
  dots: { display: 'flex', gap: '5px' },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: radius.pill,
    backgroundColor: color.borderStrong,
    transitionProperty: 'background-color, width',
    transitionDuration: '0.25s'
  },
  dotOn: { width: '16px', backgroundColor: color.accent },
  button: {
    fontFamily: font.sans,
    fontSize: '12.5px',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.borderStrong, ':disabled': color.border },
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: { default: color.text2, ':disabled': color.text3 },
    cursor: { default: 'pointer', ':disabled': 'default' },
    transitionProperty: 'background-color, border-color, color',
    transitionDuration: '0.2s'
  },
  bubble: {
    position: 'absolute',
    zIndex: 2,
    top: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: font.sans,
    fontSize: '12.5px',
    fontWeight: 500,
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '11px',
    paddingRight: '13px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.pill,
    backgroundColor: { default: color.surface, ':hover': color.accentSoft },
    boxShadow: color.shadow,
    color: color.accent,
    cursor: 'pointer',
    animationName: { default: breathe, [REDUCE]: 'none' },
    animationDuration: '2.4s',
    animationTimingFunction: ease.out,
    animationIterationCount: 'infinite',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  primary: { backgroundColor: color.accent, borderColor: color.accent, color: color.onAccent }
})
