// Single-path glyphs the kit's SF Symbol set does not carry: call controls and
// the voicemail transport. Drawn the way contacts/detail.tsx draws its own.

import * as stylex from '@stylexjs/stylex'

export const GLYPH = {
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5.6-3A5.6 5.6 0 0 1 6.4 11H4.4a7.6 7.6 0 0 0 6.6 7.55V21h2v-2.45A7.6 7.6 0 0 0 19.6 11z',
  micOff:
    'M9 6.2V6a3 3 0 0 1 6 0v5a3 3 0 0 1-.4 1.5L9 6.2zm8.6 4.8a5.6 5.6 0 0 1-9 4.4l1.5-1.5a3.9 3.9 0 0 0 5.4-2.9zM4.4 4 3 5.4l6 6v.6a3 3 0 0 0 4.2 2.7l1.6 1.6a5.6 5.6 0 0 1-6.2-5.3H4.4a7.6 7.6 0 0 0 6.6 7.55V21h2v-2.45a7.5 7.5 0 0 0 2.5-1L19.6 21 21 19.6z',
  speaker:
    'M4 10v4h3l4 4V6L7 10H4zm10.5 2a3.4 3.4 0 0 0-2-3.1v6.2a3.4 3.4 0 0 0 2-3.1zM12.5 5.2v2.1a5.2 5.2 0 0 1 0 9.4v2.1a7.3 7.3 0 0 0 0-13.6z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  bubble: 'M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.3 21l4.4-2.2c1 .3 2.1.4 3.3.4 5.5 0 10-3.6 10-8.2S17.5 3 12 3z',
  envelope:
    'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v.6l-9 5.6-9-5.6v-.6zM3 8.4l8.5 5.3c.3.2.7.2 1 0L21 8.4v10.1A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V8.4z',
  /** Outgoing-call arrow: a phone glyph with an arrow, drawn as one path. */
  callOut:
    'M15 4v2h3.6l-5.5 5.5 1.4 1.4 5.5-5.5V11h2V4h-7zM6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.4.6 3.7.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.7.1.4 0 .8-.2 1.1z',
  callIn:
    'M20 5.4 14.5 11H18v2h-7V6h2v3.6l5.6-5.6zM6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.4.6 3.7.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.7.1.4 0 .8-.2 1.1z',
  /** Slide-over reorder grip: three short bars. */
  grip: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  minus: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM7 11h10v2H7z'
} as const

export type GlyphName = keyof typeof GLYPH

/** One glyph, tinted by the element's colour like `Sym`. */
export const Glyph = ({ name, size = 22 }: { name: GlyphName; size?: number }) => (
  // minus relies on evenodd to punch its bar out of the circle; the other's
  // overlapping subpaths would eat each other under the same rule.
  <svg aria-hidden="true" {...stylex.props(styles.g(size))} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule={name === 'minus' ? 'evenodd' : 'nonzero'} d={GLYPH[name]} />
  </svg>
)

const styles = stylex.create({
  g: (size: number) => ({ width: size, height: size, flexShrink: 0, display: 'inline-block' })
})
