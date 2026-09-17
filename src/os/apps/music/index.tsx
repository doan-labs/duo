// Music: a now-playing card over the queue, driven by one <audio> and a clock.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import type { Os } from '../../uikit/app.ts'
import { shared } from '../../uikit/styles.ts'
import { art, mmss } from '../shared.ts'
import { styles } from './styles.ts'

export type Track = [string, string, string]
export const TRACKS: Track[] = [
  ['Midnight Titanium', 'The Anodisers', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'],
  ['Hinge', 'Spine & Rail', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'],
  ['Anisotropic', 'Brushed', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'],
  ['Sapphire Coat', 'Thin Film', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'],
  ['Path Traced', 'Cycles', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3']
]

/**
 * One `<audio>` plus the state every player here needs. Built once for the whole
 * device (`nowPlaying` below): the app and Control Center drive the same deck, so
 * a track started in one shows in the other and closing the app does not stop it.
 * The clock falls back to counting on its own if the file never loads, so the UI
 * still moves offline instead of freezing at 0:00 and looking broken.
 */
function deck(list: Track[]) {
  const a = new Audio()
  a.preload = 'none'
  let i = 0
  let t = 0
  let on = false
  const len = 214
  const subs = new Set<() => void>()
  const emit = () => {
    for (const f of subs) f()
  }
  const load = (n: number) => {
    i = ((n % list.length) + list.length) % list.length
    t = 0
    a.src = list[i]![2]
    if (on) void a.play().catch(() => {})
    emit()
  }
  const skip = (d: number) => load(i + d)
  const toggle = () => {
    if (!a.src) load(i)
    on = !on
    if (on) void a.play().catch(() => {})
    else a.pause()
    emit()
  }
  const seek = (frac: number) => {
    t = frac * (a.duration || len)
    if (a.duration) a.currentTime = t
    emit()
  }
  a.addEventListener('ended', () => skip(1))
  // The clock outlives every listener: audio keeps playing with the app closed
  // and Control Center's scrubber has to be right when it comes back.
  setInterval(() => {
    if (!on) return
    t = a.currentTime || t + 0.25
    if (t >= (a.duration || len)) skip(1)
    else emit()
  }, 250)
  return {
    get now() {
      return list[i]!
    },
    get at() {
      return t
    },
    get dur() {
      return a.duration || len
    },
    get playing() {
      return on
    },
    /** False until something has been loaded: Control Center says "Not Playing" until then. */
    get started() {
      return !!a.src
    },
    load,
    skip,
    toggle,
    seek,
    /** Reports every change to `onChange`; returns the unsubscribe. */
    watch(onChange: () => void) {
      subs.add(onChange)
      return () => {
        subs.delete(onChange)
      }
    }
  }
}

/** The device's deck: one `<audio>` behind the Music app and Control Center both. */
export const nowPlaying = deck(TRACKS)

/** Re-renders the caller on every change of the deck. */
export function useNowPlaying() {
  const [, bump] = useState(0)
  useEffect(() => nowPlaying.watch(() => bump((n) => n + 1)), [])
  return nowPlaying
}

const BARS = [0, 1, 2, 3]

/** Bars that rise and fall while something is playing. Decorative, not an FFT. */
function Eq({ live }: { live: boolean }) {
  const [hs, setHs] = useState(() => BARS.map(() => '25%'))
  useEffect(() => {
    const t = setInterval(() => setHs(BARS.map(() => (live ? `${20 + Math.random() * 80}%` : '18%'))), 120)
    return () => clearInterval(t)
  }, [live])
  return (
    <div {...stylex.props(styles.eq)}>
      {BARS.map((b) => (
        <i key={b} {...stylex.props(styles.bar, styles.barH(hs[b]!))} />
      ))}
    </div>
  )
}

export const Music = (_: { os: Os }) => {
  const d = useNowPlaying()
  const [n, ar] = d.now
  return (
    <div {...stylex.props(shared.body, styles.flush)}>
      <div {...stylex.props(styles.np)}>
        <div {...stylex.props(styles.art, styles.cover, styles.bg(art(n)))}>{n}</div>
        <div {...stylex.props(styles.center)}>
          <div {...stylex.props(styles.title)}>{n}</div>
          <div {...stylex.props(shared.sub)}>{ar}</div>
        </div>
        <div
          {...stylex.props(styles.scrub)}
          onPointerDown={(e) => {
            const el = e.currentTarget
            // getBoundingClientRect is in screen space and this panel may be rotated in
            // 3D, so width is the only component of it that survives. offsetX does not.
            d.seek(
              Math.min(1, Math.max(0, e.nativeEvent.offsetX / (el.offsetWidth || el.getBoundingClientRect().width)))
            )
          }}
        >
          <i {...stylex.props(styles.fill, styles.w(`${(d.at / d.dur) * 100}%`))} />
        </div>
        <div {...stylex.props(styles.tr)}>
          <span>{mmss(d.at)}</span>
          <span>-{mmss(Math.max(0, d.dur - d.at))}</span>
        </div>
        <div {...stylex.props(styles.pbtn)}>
          <button type="button" {...stylex.props(styles.pb)} onClick={() => d.skip(-1)}>
            ⏮
          </button>
          <button type="button" {...stylex.props(styles.pb)} onClick={() => d.toggle()}>
            {d.playing ? '❚❚' : '▶'}
          </button>
          <button type="button" {...stylex.props(styles.pb)} onClick={() => d.skip(1)}>
            ⏭
          </button>
        </div>
        <Eq live={d.playing} />
      </div>
      <div {...stylex.props(shared.hdr, styles.hdr)}>Up Next</div>
      <div {...stylex.props(shared.grp, styles.queue)}>
        {TRACKS.map(([name, who], k) => (
          <div
            key={name}
            {...stylex.props(shared.row, styles.qrow)}
            onClick={() => {
              d.load(k)
              if (!d.playing) d.toggle()
            }}
          >
            <div {...stylex.props(styles.thumb, styles.bg(art(name)))} />
            <div>
              <div {...stylex.props(styles.name)}>{name}</div>
              <div {...stylex.props(shared.sub)}>{who}</div>
            </div>
            <span {...stylex.props(shared.rowR, styles.go)}>▶</span>
          </div>
        ))}
      </div>
    </div>
  )
}
