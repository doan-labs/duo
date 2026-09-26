// Single-path glyphs the kit's SF Symbol set does not carry: the mic, the
// transport and the trim crop marks. Drawn the way phone/glyphs.tsx draws its
// own, tinted by the element's colour.

import * as stylex from '@stylexjs/stylex'

export const GLYPH = {
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5.6-3A5.6 5.6 0 0 1 6.4 11H4.4a7.6 7.6 0 0 0 6.6 7.55V21h2v-2.45A7.6 7.6 0 0 0 19.6 11z',
  micOff:
    'M9 6.2V6a3 3 0 0 1 6 0v5a3 3 0 0 1-.4 1.5L9 6.2zm8.6 4.8a5.6 5.6 0 0 1-9 4.4l1.5-1.5a3.9 3.9 0 0 0 5.4-2.9zM4.4 4 3 5.4l6 6v.6a3 3 0 0 0 4.2 2.7l1.6 1.6a5.6 5.6 0 0 1-6.2-5.3H4.4a7.6 7.6 0 0 0 6.6 7.55V21h2v-2.45a7.5 7.5 0 0 0 2.5-1L19.6 21 21 19.6z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  /** Centered bars, the shape a waveform meter reads as. */
  wave: 'M4 10v4h1.6v-4zM8.4 7v10H10V7zM12.8 4v16h1.6V4zM17.2 8v8h1.6V8zM21.6 10v4h-1.6v-4z',
  /** Crop marks around a region: the trim affordance. */
  trim: 'M5 3h1.6v18H5zM17.4 3H19v18h-2zM7.5 11h9v2h-9z',
  /** Skip back: a replay arrow; the button label carries the seconds. */
  back15: 'M12 4V1L6.5 5.5 12 10V7a6 6 0 1 1-6 6H3.5a8.5 8.5 0 1 0 8.5-9z',
  fwd15: 'M12 4V1l5.5 4.5L12 10V7a6 6 0 1 0 6 6h2.5A8.5 8.5 0 1 1 12 4z'
} as const

export type GlyphName = keyof typeof GLYPH

/** One glyph, tinted by the element's colour like `Sym`. */
export const Glyph = ({ name, size = 22 }: { name: GlyphName; size?: number }) => (
  <svg aria-hidden="true" {...stylex.props(styles.g(size))} viewBox="0 0 24 24" fill="currentColor">
    <path d={GLYPH[name]} />
  </svg>
)

const styles = stylex.create({
  g: (size: number) => ({ width: size, height: size, flexShrink: 0, display: 'inline-block' })
})
