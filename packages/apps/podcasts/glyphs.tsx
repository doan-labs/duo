// The transport glyphs. `Sym` has no play, pause or skip-15 icons, so Podcasts
// draws its own in the same stroke weight the SF-flavoured icons use, the way
// Music's glyphs.tsx does. Each is one <svg> taking size and colour from the
// caller, currentColor everywhere.

import * as sx from '@stylexjs/stylex'

export type GlyphName = 'play' | 'pause' | 'back15' | 'fwd15'

const FILLED: Partial<Record<GlyphName, string>> = {
  play: 'M7 4.2v15.6c0 .9 1 1.5 1.8 1L19.5 13a1.3 1.3 0 0 0 0-2L8.8 3.2C8 2.7 7 3.3 7 4.2z',
  pause: 'M6.4 4.6h3.2v14.8H6.4zM14.4 4.6h3.2v14.8h-3.2z'
}

export const Glyph = ({ name, size = 17 }: { name: GlyphName; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...sx.props(styles.glyph)}>
    {FILLED[name] ? (
      <path d={FILLED[name]!} fill="currentColor" />
    ) : (
      <>
        <path
          d={name === 'back15' ? 'M12.5 5a7 7 0 1 1-7 7' : 'M11.5 5a7 7 0 1 0 7 7'}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
        />
        <path
          d={name === 'back15' ? 'M5 4.4v5h5' : 'M19 4.4v5h-5'}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="12" y="16.6" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor">
          15
        </text>
      </>
    )}
  </svg>
)

const styles = sx.create({
  glyph: {
    display: 'inline-block',
    flexShrink: 0,
    verticalAlign: 'middle'
  }
})
