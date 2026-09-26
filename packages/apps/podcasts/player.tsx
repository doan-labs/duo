// Now Playing: the full-screen sheet over the app - artwork, the seek bar,
// the 15-second skips, the speed cycle, and the door into Up Next. It shares
// the one deck with the mini player, so they never disagree.

import { art, mmss } from '@doan-labs/duo-fixtures'
import { Button, usePresence } from '@doan-labs/duo-uikit'
import { animations, shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { usePodcastsDeck } from './deck.ts'
import { Glyph } from './glyphs.tsx'
import { setQueueOpen } from './store.ts'
import { styles } from './styles.ts'

export const NowPlaying = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const d = usePodcastsDeck()
  const { mounted, closing } = usePresence(open, 380)
  if (!mounted || !d.started || !d.now) return null
  const ep = d.now
  const frac = d.dur ? d.at / d.dur : 0
  return (
    <div
      role="dialog"
      aria-label="Now Playing"
      {...stylex.props(styles.np, animations.float, closing && animations.floatOut)}
    >
      <div {...stylex.props(styles.npTop)}>
        <button
          type="button"
          aria-label="Close Now Playing"
          {...stylex.props(styles.npClose, shared.press)}
          onClick={onClose}
        >
          <Sym name="down" size={20} />
        </button>
        <span {...stylex.props(typography.footnote, styles.npFrom)}>Now Playing</span>
        <button
          type="button"
          aria-label="Up Next"
          {...stylex.props(styles.npClose, shared.press)}
          onClick={() => {
            onClose()
            setQueueOpen(true)
          }}
        >
          <Sym name="list" size={20} />
        </button>
      </div>
      <div {...stylex.props(styles.npBody)}>
        <div {...stylex.props(styles.npArt, styles.bg(art(ep.title, 50)), !d.playing && styles.npArtRest)}>
          <span {...stylex.props(styles.npArtTx)}>{ep.title}</span>
        </div>
        <div {...stylex.props(styles.npTitle)}>{ep.title}</div>
        <div {...stylex.props(typography.footnote, styles.npShow)}>{ep.show}</div>
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={1000}
          value={Math.round(frac * 1000)}
          onChange={(e) => d.seek(Number(e.target.value) / 1000)}
          {...stylex.props(styles.seek)}
        />
        <div {...stylex.props(styles.npTimes)}>
          <span>{mmss(d.at)}</span>
          <span>-{mmss(Math.max(0, d.dur - d.at))}</span>
        </div>
        <div {...stylex.props(styles.npTrans)}>
          <button
            type="button"
            aria-label="Skip back 15 seconds"
            {...stylex.props(styles.npSkip, shared.press)}
            onClick={() => d.skipSecs(-15)}
          >
            <Glyph name="back15" size={30} />
          </button>
          <button
            type="button"
            aria-label={d.playing ? 'Pause' : 'Play'}
            {...stylex.props(styles.npPlay, shared.press)}
            onClick={() => d.toggle()}
          >
            <Glyph name={d.playing ? 'pause' : 'play'} size={44} />
          </button>
          <button
            type="button"
            aria-label="Skip forward 15 seconds"
            {...stylex.props(styles.npSkip, shared.press)}
            onClick={() => d.skipSecs(15)}
          >
            <Glyph name="fwd15" size={30} />
          </button>
        </div>
        <Button variant="plain" aria-label={`Playback speed ${d.rate}x`} onClick={() => d.cycleRate()}>
          {`${d.rate}x`}
        </Button>
      </div>
    </div>
  )
}
