// The transport glyphs. `Sym` has no play, pause, skip, shuffle or repeat, so
// Music draws its own in the same stroke weight the SF-flavoured icons use.
// Each is one <svg> taking its size and colour from the caller, currentColor
// everywhere so the accent works through it.

import type * as stylex from '@stylexjs/stylex'
import * as sx from '@stylexjs/stylex'

export type GlyphName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'shuffle'
  | 'repeat'
  | 'repeat1'
  | 'note'
  | 'home'
  | 'airplay'

const FILLED: Record<string, string> = {
  play: 'M7 4.2v15.6c0 .9 1 1.5 1.8 1L19.5 13a1.3 1.3 0 0 0 0-2L8.8 3.2C8 2.7 7 3.3 7 4.2z',
  pause: 'M6.4 4.6h3.2v14.8H6.4zM14.4 4.6h3.2v14.8h-3.2z',
  // backward.end.fill and forward.end.fill: the bar plus the triangle.
  prev: 'M3.6 5.4h2v13.2h-2zM19.6 5.9v12.2c0 .9-1 1.5-1.9 1L7.6 13a1.4 1.4 0 0 1 0-2l10.1-6.1c.9-.5 1.9.1 1.9 1z',
  next: 'M20.4 5.4h-2v13.2h2zM4.4 5.9v12.2c0 .9 1 1.5 1.9 1l10.1-6.1a1.4 1.4 0 0 0 0-2L6.3 4.9c-.9-.5-1.9.1-1.9 1z',
  // An eighth-note pair, for a song or the Songs row.
  note: 'M9.6 17.4c0 1.8-1.6 3-3.4 3s-3.2-1.1-3.2-2.8 1.5-3 3.3-3c.4 0 .8 0 1.1.1V5.5c0-.4.2-.7.6-.8l9.5-2.5c.6-.2 1.2.2 1.2.8v12.2c0 1.8-1.6 3-3.4 3s-3.2-1.1-3.2-2.8 1.5-3 3.3-3c.4 0 .7 0 1 .1V7l-8.1 2.1z'
}

const STROKED: Record<string, string[]> = {
  // shuffle: two crossing arcs ending in arrowheads.
  shuffle: [
    'M3.5 7h3.2c3.4 0 5.4 2.5 7.4 5.4 2 3 4 4.6 7 4.6h-2.6',
    'M18.6 14.4l2.7 2.6-2.7 2.6',
    'M3.5 17h3.2c1.6 0 3-.7 4.3-1.9',
    'M18.6 7.1h-2.6c-1.7 0-3.1.7-4.4 1.9',
    'M18.6 4.5l2.7 2.6-2.7 2.6'
  ],
  // repeat: a rounded loop with two arrowheads; the one-state adds a 1 below.
  repeat: [
    'M17.5 9.5l2.6 2.5-2.6 2.5',
    'M3.5 8.5v-1a2.5 2.5 0 0 1 2.5-2.5h14.1',
    'M6.5 14.5l-2.6-2.5 2.6-2.5',
    'M20.5 15.5v1a2.5 2.5 0 0 1-2.5 2.5H3.9'
  ],
  // house, the Home tab's mark on iOS 26.
  home: ['M4.6 10.6L12 4.2l7.4 6.4v8.3a1.5 1.5 0 0 1-1.5 1.5H6.1a1.5 1.5 0 0 1-1.5-1.5z', 'M9.8 20.4v-5.2h4.4v5.2'],
  // airplayaudio: the open-bottomed screen and its triangle.
  airplay: [
    'M9.6 16.4H5.6A1.6 1.6 0 0 1 4 14.8V6.6A1.6 1.6 0 0 1 5.6 5h12.8A1.6 1.6 0 0 1 20 6.6v8.2a1.6 1.6 0 0 1-1.6 1.6h-4',
    'M12 19.4l-3.9-3.4h7.8z'
  ]
}

export function Glyph({ name, size = 18, xstyle }: { name: GlyphName; size?: number; xstyle?: stylex.StyleXStyles }) {
  const filled = FILLED[name]
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" {...sx.props(styles.glyph, xstyle)}>
      {filled ? (
        <path d={filled} fill="currentColor" />
      ) : (
        (STROKED[name] ?? []).map((d) => (
          <path key={d} d={d} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        ))
      )}
      {name === 'repeat1' && (
        <>
          {STROKED.repeat!.map((d) => (
            <path key={d} d={d} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <text x="12" y="18.8" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor">
            1
          </text>
        </>
      )}
    </svg>
  )
}

const styles = sx.create({
  glyph: {
    display: 'inline-block',
    flexShrink: 0,
    verticalAlign: 'middle'
  }
})
