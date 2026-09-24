// The Now Playing sheet: full-screen over the app, artwork and transport on
// the face of it, Up Next and the track's credits behind the two footer
// buttons. It slides the app's bottom edge like the sheet iOS pulls up, and
// shares the one deck with the mini player and Control Center.

import { mmss } from '@doan-labs/duo-fixtures'
import { usePresence } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { albumOf } from './data.ts'
import { useNowPlaying } from './deck.ts'
import { Glyph } from './glyphs.tsx'
import { styles } from './styles.ts'
import { Bar, Eq } from './widgets.tsx'

export function NowPlaying({ open, onClose, wide }: { open: boolean; onClose: () => void; wide: boolean }) {
  const d = useNowPlaying()
  const { mounted, closing } = usePresence(open, 380)
  // On the inner display the art sits left of the controls, as iPad Now
  // Playing does; on the cover it stacks.
  // What the middle of the sheet shows while it is up.
  const [mode, setMode] = useState<'art' | 'queue' | 'credits'>('art')
  // The sheet's face is what opens next time; the queue and credits are detours.
  useEffect(() => {
    if (!open) setMode('art')
  }, [open])
  if (!mounted || !d.started) return null
  const t = d.now
  const album = albumOf(t)
  return (
    <div role="dialog" aria-label="Now Playing" {...stylex.props(styles.np, closing && styles.npDown)}>
      <div {...stylex.props(styles.npTop)}>
        <button
          type="button"
          aria-label="Close Now Playing"
          {...stylex.props(styles.bare, styles.npClose, shared.press)}
          onClick={onClose}
        >
          <Sym name="down" size={20} />
        </button>
        <span {...stylex.props(styles.npFrom)}>
          {mode === 'credits' ? 'Credits' : d.context ? `Playing from ${d.context}` : 'Music'}
        </span>
      </div>
      {mode === 'art' && (
        <div {...stylex.props(styles.npBody, wide && styles.npBodyWide)}>
          <img
            src={t.cover}
            alt=""
            {...stylex.props(styles.npArt, wide && styles.npArtWide, !d.playing && styles.npArtRest)}
          />
          <div {...stylex.props(styles.npRight)}>
            <div {...stylex.props(styles.npMeta)}>
              <div {...stylex.props(styles.npTitle)}>{t.title}</div>
              <button
                type="button"
                {...stylex.props(styles.bare, styles.npSub, shared.press)}
                onClick={() => setMode('credits')}
              >
                {t.artist} — {t.album}
              </button>
            </div>
            <div {...stylex.props(styles.npScrub)}>
              <Bar value={Math.min(1, d.at / d.dur)} onChange={(v) => d.seek(v)} />
              <div {...stylex.props(styles.npTimes)}>
                <span>{mmss(d.at)}</span>
                <span>-{mmss(Math.max(0, d.dur - d.at))}</span>
              </div>
            </div>
            <div {...stylex.props(styles.npTrans)}>
              <button
                type="button"
                aria-label="Shuffle"
                aria-pressed={d.shuffle}
                {...stylex.props(styles.bare, styles.npModeBtn, d.shuffle && styles.npModeOn, shared.press)}
                onClick={() => d.setShuffle(!d.shuffle)}
              >
                <Glyph name="shuffle" size={17} />
                {d.shuffle && <i {...stylex.props(styles.npDot)} />}
              </button>
              <button
                type="button"
                aria-label="Previous"
                {...stylex.props(styles.bare, styles.npSkip, shared.press)}
                onClick={() => d.skip(-1)}
              >
                <Glyph name="prev" size={30} />
              </button>
              <button
                type="button"
                aria-label={d.playing ? 'Pause' : 'Play'}
                {...stylex.props(styles.bare, styles.npPlay, shared.press)}
                onClick={() => d.toggle()}
              >
                <Glyph name={d.playing ? 'pause' : 'play'} size={44} />
              </button>
              <button
                type="button"
                aria-label="Next"
                {...stylex.props(styles.bare, styles.npSkip, shared.press)}
                onClick={() => d.skip(1)}
              >
                <Glyph name="next" size={30} />
              </button>
              <button
                type="button"
                aria-label="Repeat"
                aria-pressed={d.repeat !== 'off'}
                {...stylex.props(styles.bare, styles.npModeBtn, d.repeat !== 'off' && styles.npModeOn, shared.press)}
                onClick={() => d.cycleRepeat()}
              >
                <Glyph name={d.repeat === 'one' ? 'repeat1' : 'repeat'} size={17} />
                {d.repeat !== 'off' && <i {...stylex.props(styles.npDot)} />}
              </button>
            </div>
            <div {...stylex.props(styles.npVol)}>
              <Sym name="volume" size={13} />
              <Bar value={d.volume} onChange={(v) => d.setVolume(v)} xstyle={styles.npVolBar} />
              <Sym name="volume" size={19} />
            </div>
          </div>
        </div>
      )}
      {mode === 'queue' && (
        <div {...stylex.props(styles.npQueue)}>
          <div {...stylex.props(styles.npQueueHead)}>Playing Next</div>
          <div {...stylex.props(styles.npQueueList)}>
            <div {...stylex.props(styles.qRow, styles.qRowNow)}>
              <span {...stylex.props(styles.qEq)}>
                <Eq live={d.playing} size={14} />
              </span>
              <img src={t.cover} alt="" {...stylex.props(styles.qArt)} />
              <span {...stylex.props(styles.qMain)}>
                <span {...stylex.props(styles.qName, styles.qLive)}>{t.title}</span>
                <span {...stylex.props(styles.qSub)}>{t.artist}</span>
              </span>
            </div>
            {d.upcoming().map(({ track, pos }) => (
              <button
                key={`${track.src}-${pos}`}
                type="button"
                {...stylex.props(styles.qRow, shared.press)}
                onClick={() => d.load(pos)}
              >
                <span {...stylex.props(styles.qEq)} />
                <img src={track.cover} alt="" {...stylex.props(styles.qArt)} />
                <span {...stylex.props(styles.qMain)}>
                  <span {...stylex.props(styles.qName)}>{track.title}</span>
                  <span {...stylex.props(styles.qSub)}>{track.artist}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === 'credits' && (
        <div {...stylex.props(styles.cred)}>
          <img src={t.cover} alt="" {...stylex.props(styles.credArt)} />
          <div {...stylex.props(styles.credTitle)}>{t.album}</div>
          <div {...stylex.props(styles.credLine)}>{t.artist}</div>
          {/* Where the licence asks to be named: on the card that plays the track. */}
          <div {...stylex.props(styles.credLine)}>℗ {t.license}</div>
          <div {...stylex.props(styles.credLine, styles.credDim)}>{t.source.replace('https://', '')}</div>
          {album && album.tracks.length > 1 && (
            <button
              type="button"
              {...stylex.props(styles.pill, styles.credPlay, shared.press)}
              onClick={() => {
                d.play(album.tracks, Math.max(0, album.tracks.indexOf(t)), { name: album.title })
                setMode('art')
              }}
            >
              <Glyph name="play" size={13} />
              Play the album
            </button>
          )}
        </div>
      )}
      <div {...stylex.props(styles.npFoot)}>
        <button
          type="button"
          aria-label="Credits"
          aria-pressed={mode === 'credits'}
          {...stylex.props(styles.bare, styles.npFootBtn, mode === 'credits' && styles.npModeOn, shared.press)}
          onClick={() => setMode(mode === 'credits' ? 'art' : 'credits')}
        >
          <Sym name="info" size={20} />
        </button>
        <span {...stylex.props(styles.npFootBtn, styles.npDim)}>
          <Glyph name="airplay" size={20} />
        </span>
        <button
          type="button"
          aria-label="Up Next"
          aria-pressed={mode === 'queue'}
          {...stylex.props(styles.bare, styles.npFootBtn, mode === 'queue' && styles.npModeOn, shared.press)}
          onClick={() => setMode(mode === 'queue' ? 'art' : 'queue')}
        >
          <Sym name="list" size={20} />
        </button>
      </div>
    </div>
  )
}
