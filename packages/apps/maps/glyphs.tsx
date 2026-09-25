// `Sym` carries no transport or manoeuvre marks, so Maps draws its own the way
// Music draws its transport controls: same 24 grid, same stroke weight,
// currentColor throughout so panel accent colours flow through them.

import type * as stylex from '@stylexjs/stylex'
import * as sx from '@stylexjs/stylex'

export type GlyphName =
  | 'car'
  | 'bike'
  | 'up'
  | 'right'
  | 'left'
  | 'slightR'
  | 'slightL'
  | 'sharpR'
  | 'sharpL'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'flag'

const FILLED: Partial<Record<GlyphName, string>> = {
  // A car, front view; the evenodd windshield stays glass.
  car: 'M5.3 10.9l.9-3c.3-.9 1.1-1.4 2-1.4h7.6c.9 0 1.7.5 2 1.4l.9 3c1.1.4 1.8 1.3 1.8 2.5v3.4c0 .8-.6 1.4-1.4 1.4h-.6v1.2c0 .8-.6 1.4-1.4 1.4h-1c-.8 0-1.4-.6-1.4-1.4v-1.2H8.5v1.2c0 .8-.6 1.4-1.4 1.4h-1c-.8 0-1.4-.6-1.4-1.4v-1.2h-.6c-.8 0-1.4-.6-1.4-1.4v-3.4c0-1.2.7-2.1 1.8-2.5zm2.9-3.3h7.6c.3 0 .6.2.7.5l.6 2.2H7l.6-2.2c.1-.3.4-.5.7-.5z'
}

const STROKED: Partial<Record<GlyphName, string[]>> = {
  bike: [
    'M8.4 13.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    'M21.6 13.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    'M5.4 13.5l3.2-6h6l-3.6 6z',
    'M8.6 7.5H6.8',
    'M14.6 7.5l-1.4-2.6h2.6'
  ],
  // Straight on.
  up: ['M12 19.5V7', 'M7 11.5 12 6.5l5 5'],
  // Turn right: up the stem, out along the arm.
  right: ['M8.5 19.5v-7a4 4 0 0 1 4-4H19', 'M15.5 4.5 19.5 8.5l-4 4'],
  // Bear right: a 45 degree arm.
  slightR: ['M9 19.5 15.5 11', 'M11.4 9.2l4.1 1.8 1.3-4.4'],
  // Sharp right: the arm folds back past 90 degrees.
  sharpR: ['M6.5 19.5 15.5 8.5', 'M10.6 9.6l4.9-1.1.6 5'],
  // U-turn: up the right side and back down the left.
  uturn: ['M16.5 19.5v-8a4.5 4.5 0 0 0-9 0v4.5', 'M4.5 13 7.5 16l3-3'],
  // Roundabout: the ring with one head; exits are implied.
  roundabout: ['M12 4.5a7.5 7.5 0 1 1-7.4 8.7', 'M3.2 10.2 4.7 14.6l4-2.1'],
  // Merge: two stems into one upward arm.
  merge: ['M5.5 19.5v-3.5a4 4 0 0 1 4-4', 'M18.5 19.5v-3.5a4 4 0 0 0-4-4', 'M12 12V4.5', 'M8.5 8 12 4.5 15.5 8'],
  // Arrive: the flagpole and its pennant.
  flag: ['M6.5 19.5V4.5', 'M6.5 5h10.5l-2.2 3.2 2.2 3.3H6.5']
}

/** Right-hand marks mirror for their left-hand twins. */
const MIRROR: Partial<Record<GlyphName, GlyphName>> = { left: 'right', slightL: 'slightR', sharpL: 'sharpR' }

export function Glyph({ name, size = 16, xstyle }: { name: GlyphName; size?: number; xstyle?: stylex.StyleXStyles }) {
  const flip = MIRROR[name]
  const base = (flip ?? name) as GlyphName
  const filled = FILLED[base]
  const paths = (
    <g transform={flip ? 'translate(24,0) scale(-1,1)' : undefined}>
      {filled ? (
        <path d={filled} fill="currentColor" fillRule="evenodd" />
      ) : (
        (STROKED[base] ?? []).map((d) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))
      )}
    </g>
  )
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" {...sx.props(styles.glyph, xstyle)}>
      {paths}
    </svg>
  )
}

const styles = sx.create({
  glyph: { display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }
})
