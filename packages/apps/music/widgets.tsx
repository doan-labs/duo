// Pieces every screen shares: the equalizer that marks the live track, the
// sideways shelf and its tile, the four-up collage mixes and artists fall back
// on, the song row, the Play/Shuffle pair a release leads with, the search
// field, and the flat bar the sheet scrubs and fades through.

import { mmss } from '@doan-labs/duo-fixtures'
import type { Track } from '@doan-labs/duo-fixtures/tracks.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, type PointerEvent as ReactPointerEvent, useEffect, useState } from 'react'
import { useNowPlaying } from './deck.ts'
import { Glyph } from './glyphs.tsx'
import { styles } from './styles.ts'

const BARS = [0, 1, 2, 3]

/** Bars that rise and fall while something is playing. Decorative, not an FFT. */
export function Eq({ live, size = 16 }: { live: boolean; size?: number }) {
  const [hs, setHs] = useState(() => BARS.map(() => '25%'))
  useEffect(() => {
    const t = setInterval(() => setHs(BARS.map(() => (live ? `${20 + Math.random() * 80}%` : '18%'))), 120)
    return () => clearInterval(t)
  }, [live])
  return (
    <div {...stylex.props(styles.eq, styles.eqH(size))}>
      {BARS.map((b) => (
        <i key={b} {...stylex.props(styles.bar, styles.barH(hs[b]!))} />
      ))}
    </div>
  )
}

/**
 * The flat bar for the scrubber and the volume slider. Absolute, not relative:
 * a tap jumps, as it does on iOS. `offsetX` is element-local, so it survives
 * this panel being a CSS3D object at any scale, and the children take no
 * pointer events so the offset always measures from the same box.
 */
export function Bar({
  value,
  onChange,
  xstyle
}: {
  value: number
  onChange: (v: number) => void
  xstyle?: stylex.StyleXStyles
}) {
  const [drag, setDrag] = useState(false)
  const set = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    onChange(Math.min(1, Math.max(0, e.nativeEvent.offsetX / (el.offsetWidth || 1))))
  }
  return (
    <div
      {...stylex.props(styles.scrub, xstyle)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(true)
        set(e)
      }}
      onPointerMove={(e) => drag && set(e)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
    >
      <i {...stylex.props(styles.scrubTrk)}>
        <i {...stylex.props(styles.scrubFill, styles.scrubW(value * 100))} />
      </i>
    </div>
  )
}

/** A shelf: a heading with an optional See All, over a sideways scroll of tiles. */
export function Shelf({ title, onMore, children }: { title?: string; onMore?: () => void; children: ReactNode }) {
  return (
    <section {...stylex.props(styles.shelf)}>
      {title && (
        <div {...stylex.props(styles.shelfHead)}>
          <h2 {...stylex.props(styles.shelfTitle)}>{title}</h2>
          {onMore && (
            <button type="button" {...stylex.props(styles.shelfMore, shared.press)} onClick={onMore}>
              See All
            </button>
          )}
        </div>
      )}
      <div {...stylex.props(styles.shelfRow)}>{children}</div>
    </section>
  )
}

/** The unit every shelf scrolls: square media over one strong line and a dimmer one. */
export function Tile({
  media,
  title,
  sub,
  onPress,
  xstyle
}: {
  media: ReactNode
  title: string
  sub?: ReactNode
  onPress: () => void
  xstyle?: stylex.StyleXStyles
}) {
  return (
    <button type="button" {...stylex.props(styles.tile, xstyle, shared.press)} onClick={onPress}>
      {media}
      <span {...stylex.props(styles.tileName)}>{title}</span>
      {sub ? <span {...stylex.props(styles.tileSub)}>{sub}</span> : null}
    </button>
  )
}

/** Four covers as one square; mixes, stations and artists have no art of their own. */
export function Collage({ arts, xstyle }: { arts: string[]; xstyle?: stylex.StyleXStyles }) {
  // A short list cycles to fill the 2x2; a lone cover stands alone.
  let four = arts.slice(0, 4)
  while (four.length > 1 && four.length < 4) four = [...four, ...arts].slice(0, 4)
  return four.length >= 4 ? (
    <span {...stylex.props(styles.collage, xstyle)}>
      {four.map((a, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a collage cell's position is its identity; the same cover can repeat
        <img key={`${a}-${i}`} src={a} alt="" {...stylex.props(styles.collageImg)} />
      ))}
    </span>
  ) : (
    <img src={four[0]} alt="" {...stylex.props(styles.tileArt, xstyle)} />
  )
}

/**
 * One song in a list: its place in the running order, or its artwork, then the
 * name and the running time. A tap hands the whole list to the deck as the new
 * queue, so what follows is what the list promised.
 */
export function SongRow({
  t,
  list,
  name,
  index,
  showArt,
  sub
}: {
  t: Track
  /** The queue a tap deals the deck; falls back to this song alone. */
  list?: Track[]
  /** The "Playing From" line the deck reports while this queue is up. */
  name?: string
  index?: number
  showArt?: boolean
  /** Defaults to the artist and release; pass '' where the page already names them. */
  sub?: string
}) {
  const d = useNowPlaying()
  const live = d.started && d.now.src === t.src
  const queue = list ?? [t]
  return (
    <button
      type="button"
      {...stylex.props(styles.song, shared.press)}
      onClick={() => d.play(queue, Math.max(0, queue.indexOf(t)), { name })}
    >
      {index !== undefined && (
        <span {...stylex.props(styles.songIx)}>{live ? <Eq live={d.playing} size={13} /> : index + 1}</span>
      )}
      {showArt && <img src={t.cover} alt="" {...stylex.props(styles.songArt)} />}
      <span {...stylex.props(styles.songMain)}>
        <span {...stylex.props(styles.songName, live && styles.songLive)}>
          {t.title}
          {t.explicit && <i {...stylex.props(styles.exp)}>E</i>}
        </span>
        {sub === undefined ? (
          <span {...stylex.props(styles.songSub)}>
            {t.artist} · {t.album}
          </span>
        ) : sub === '' ? null : (
          <span {...stylex.props(styles.songSub)}>{sub}</span>
        )}
      </span>
      <span {...stylex.props(styles.songTime)}>{mmss(t.secs)}</span>
    </button>
  )
}

/** The two pills a release opens with: play it through, or deal it shuffled. */
export function PlayPills({ name, tracks, xstyle }: { name: string; tracks: Track[]; xstyle?: stylex.StyleXStyles }) {
  const d = useNowPlaying()
  return (
    <div {...stylex.props(styles.pills, xstyle)}>
      <button type="button" {...stylex.props(styles.pill, shared.press)} onClick={() => d.play(tracks, 0, { name })}>
        <Glyph name="play" size={14} />
        Play
      </button>
      <button
        type="button"
        {...stylex.props(styles.pill, shared.press)}
        onClick={() => d.play(tracks, Math.floor(Math.random() * tracks.length), { name, shuffled: true })}
      >
        <Glyph name="shuffle" size={14} />
        Shuffle
      </button>
    </div>
  )
}

/** The search field, sidebar-top when wide and under the Search title when not. */
export function Field({
  value,
  onChange,
  placeholder,
  xstyle
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  xstyle?: stylex.StyleXStyles
}) {
  return (
    <label {...stylex.props(styles.search, xstyle)}>
      <Sym name="search" size={14} />
      <input
        aria-label="Search music"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...stylex.props(styles.searchInput)}
      />
    </label>
  )
}
