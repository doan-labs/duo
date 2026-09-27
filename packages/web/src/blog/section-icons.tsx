import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'

// A 16 × 16 stroked glyph per post section, keyed by the heading's id, for the
// phone's contents pill. Each is a few parts with a small gesture of its own:
// the bell rings, the eye blinks, the loop turns. Every gesture starts and ends
// at rest, so playing it once or on repeat never leaves a part out of place.

type Keys = { x?: number[]; y?: number[]; rotate?: number[]; scale?: number[]; scaleX?: number[]; scaleY?: number[] }
type Part = { d: string; to?: Keys; origin?: [number, number]; delay?: number; draw?: boolean }

const ICONS: Record<string, Part[]> = {
  // duo-0-2-0
  'apps-can-hear-the-hardware': [
    {
      d: 'M5 1.75h6a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2.75a1 1 0 0 1 1-1z',
      to: { rotate: [0, -9, 7, -3, 0] }
    },
    { d: 'M14 4v3.5', to: { x: [0, -1, 0] }, delay: 0.1 },
    { d: 'M2 5v2', to: { x: [0, 1, 0] }, delay: 0.2 }
  ],
  'notifications-without-a-permission': [
    { d: 'M4 11.25V7a4 4 0 0 1 8 0v4.25l1.25 1.25H2.75z', to: { rotate: [0, 16, -12, 7, -3, 0] }, origin: [0.5, 0] },
    { d: 'M6.75 14.5h2.5', to: { x: [0, 1.4, -1.2, 0.6, 0] }, delay: 0.05 }
  ],
  'a-microphone-the-sandbox-never-touches': [
    { d: 'M6 3a2 2 0 0 1 4 0v4.25a2 2 0 0 1-4 0z', to: { y: [0, -1.2, 0] } },
    { d: 'M3.75 7.25a4.25 4.25 0 0 0 8.5 0', to: { scale: [1, 1.14, 1] }, origin: [0.5, 0], delay: 0.08 },
    { d: 'M8 11.5v2.75' }
  ],
  'the-dock-arranged-by-hand': [
    { d: 'M2 11h12v3H2z' },
    { d: 'M3.5 3.5h3.5V7H3.5z', to: { y: [0, -2.5, 0] } },
    { d: 'M9 3.5h3.5V7H9z', to: { y: [0, -2.5, 0] }, delay: 0.14 }
  ],
  'twenty-five-apps-rebuilt': [
    { d: 'M2.5 2.5h4.25v4.25H2.5z', to: { scale: [1, 0.6, 1] } },
    { d: 'M9.25 2.5h4.25v4.25H9.25z', to: { scale: [1, 0.6, 1] }, delay: 0.08 },
    { d: 'M9.25 9.25h4.25v4.25H9.25z', to: { scale: [1, 0.6, 1] }, delay: 0.16 },
    { d: 'M2.5 9.25h4.25v4.25H2.5z', to: { scale: [1, 0.6, 1] }, delay: 0.24 }
  ],
  'community-apps': [
    {
      d: 'M6 7.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM1.75 13.5a4.25 4.25 0 0 1 8.5 0',
      to: { y: [0, -1.2, 0] }
    },
    { d: 'M10.75 2.9a2.25 2.25 0 0 1 0 4.2M12 9.4a4.25 4.25 0 0 1 2.25 4.1', to: { y: [0, -1.2, 0] }, delay: 0.14 }
  ],
  'get-it': [
    { d: 'M8 2v8M4.75 6.75 8 10l3.25-3.25', to: { y: [0, 2, 0] } },
    { d: 'M2.75 13.5h10.5', to: { scaleX: [1, 0.8, 1] }, delay: 0.12 }
  ],
  // introducing-duo
  'two-ways-to-draw-a-screen': [
    { d: 'M1.75 3.5h5.5v9h-5.5z', to: { x: [0, -1.2, 0] } },
    { d: 'M8.75 3.5h5.5v9h-5.5z', to: { x: [0, 1.2, 0] } }
  ],
  'a-fixed-eye': [
    { d: 'M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z', to: { scaleY: [1, 0.12, 1] }, delay: 0.3 },
    { d: 'M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', to: { x: [0, 1.6, -1.6, 0] } }
  ],
  'run-the-os-twice': [
    {
      d: 'M2.75 7a5.25 5.25 0 0 1 9.4-3.2M13.25 9a5.25 5.25 0 0 1-9.4 3.2M12.5 1.5V4H10M3.5 14.5V12H6',
      to: { rotate: [0, 180] }
    }
  ],
  'measured-not-eyeballed': [
    {
      d: 'M1.75 10.5 10.5 1.75l3.75 3.75-8.75 8.75zM4.75 7.5l1.5 1.5M7 5.25l1 1M9.25 3l1.5 1.5',
      to: { rotate: [0, -12, 4, 0] }
    }
  ],
  'a-sandbox-for-strangers-code': [
    { d: 'M8 1.75l5.25 2v4c0 3.2-2.3 5.6-5.25 6.5-2.95-.9-5.25-3.3-5.25-6.5v-4z', to: { scale: [1, 1.1, 1] } },
    { d: 'M5.75 8l1.5 1.5 3-3', draw: true, delay: 0.15 }
  ]
}

const DOT: Part[] = [{ d: 'M8 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', to: { scale: [1, 1.5, 1] } }]

/** How long one gesture takes, and the rest between repeats. */
const GESTURE = 0.9
const REST = 2.6

/**
 * `play` runs the gesture on mount: once, or on repeat for the section in view.
 * Remount (a new `key`) to play it again.
 */
export function SectionIcon({ id, play, delay = 0 }: { id: string; play: 'once' | 'loop' | false; delay?: number }) {
  const still = useReducedMotion()
  const on = !!play && !still
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.glyph)}>
      {(ICONS[id] ?? DOT).map((p) => {
        const timing = {
          duration: GESTURE,
          ease: 'easeInOut' as const,
          delay: delay + (p.delay ?? 0),
          ...(play === 'loop' && { repeat: Number.POSITIVE_INFINITY, repeatDelay: REST })
        }
        return (
          <motion.path
            key={p.d}
            d={p.d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ originX: p.origin?.[0] ?? 0.5, originY: p.origin?.[1] ?? 0.5 }}
            initial={p.draw && on ? { pathLength: 0 } : undefined}
            animate={on ? (p.draw ? { pathLength: [0, 1] } : (p.to ?? {})) : undefined}
            transition={timing}
          />
        )
      })}
    </svg>
  )
}

const styles = stylex.create({ glyph: { display: 'block', flexShrink: 0, overflow: 'visible' } })
