// The mini player: the floating capsule that keeps the live track one tap
// away in every section. It is the Now Playing sheet collapsed — same deck,
// same art, the progress hairline along its bottom edge; the capsule's face
// is the button that opens the sheet, the buttons beside it skip and pause.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useNowPlaying } from './deck.ts'
import { Glyph } from './glyphs.tsx'
import { styles } from './styles.ts'

export function MiniPlayer({ wide, onOpen }: { wide: boolean; onOpen: () => void }) {
  const d = useNowPlaying()
  if (!d.started) return null
  const t = d.now
  return (
    <div {...stylex.props(styles.mini, wide && styles.miniWide)}>
      <button
        type="button"
        {...stylex.props(styles.bare, styles.miniFace, shared.press)}
        onClick={onOpen}
        aria-label={`Now Playing: ${t.title}`}
      >
        <img src={t.cover} alt="" {...stylex.props(styles.miniArt)} />
        <span {...stylex.props(styles.miniMain)}>
          <span {...stylex.props(styles.miniName)}>{t.title}</span>
          <span {...stylex.props(styles.miniSub)}>{t.artist}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={d.playing ? 'Pause' : 'Play'}
        {...stylex.props(styles.bare, styles.miniBtn, shared.press)}
        onClick={() => d.toggle()}
      >
        <Glyph name={d.playing ? 'pause' : 'play'} size={21} />
      </button>
      <button
        type="button"
        aria-label="Next"
        {...stylex.props(styles.bare, styles.miniBtn, shared.press)}
        onClick={() => d.skip(1)}
      >
        <Glyph name="next" size={21} />
      </button>
      {/* The hairline along the capsule's bottom edge: how far into the song it is. */}
      <span {...stylex.props(styles.miniTrk)}>
        <i {...stylex.props(styles.miniFill, styles.miniW(`${Math.min(1, d.at / d.dur) * 100}%`))} />
      </span>
    </div>
  )
}
