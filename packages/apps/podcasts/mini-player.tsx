// The mini player: the dark bar pinned under the panes once something has been
// queued - art, title, a progress hairline along its bottom edge, play/pause,
// and the whole face opens Now Playing.

import { art } from '@doan-labs/duo-fixtures'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { usePodcastsDeck } from './deck.ts'
import { Glyph } from './glyphs.tsx'
import { setPlayer } from './store.ts'
import { styles } from './styles.ts'

export const MiniPlayer = () => {
  const d = usePodcastsDeck()
  if (!d.started || !d.now) return null
  const ep = d.now
  return (
    <div {...stylex.props(styles.mini)}>
      <button
        type="button"
        {...stylex.props(styles.miniFace, shared.press)}
        onClick={() => setPlayer(true)}
        aria-label={`Now Playing: ${ep.title}`}
      >
        <div {...stylex.props(styles.miniArt, styles.bg(art(ep.title)))} />
        <span {...stylex.props(styles.miniMain)}>
          <span {...stylex.props(styles.miniName)}>{ep.title}</span>
          <span {...stylex.props(styles.miniSub)}>{ep.show}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={d.playing ? 'Pause' : 'Play'}
        {...stylex.props(styles.miniBtn, shared.press)}
        onClick={() => d.toggle()}
      >
        <Glyph name={d.playing ? 'pause' : 'play'} size={21} />
      </button>
      <button
        type="button"
        aria-label="Skip forward 15 seconds"
        {...stylex.props(styles.miniBtn, shared.press)}
        onClick={() => d.skipSecs(15)}
      >
        <Glyph name="fwd15" size={21} />
      </button>
      {/* The hairline along the bar's bottom edge: how far into the episode it is. */}
      <span {...stylex.props(styles.scrub)}>
        <i {...stylex.props(styles.fill, styles.w(`${Math.min(100, (d.at / (d.dur || 1)) * 100)}%`))} />
      </span>
    </div>
  )
}
