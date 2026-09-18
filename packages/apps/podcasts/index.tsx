import { LargeTitle, Screen, Text, Title } from '@doan-labs/duo-uikit'

// Podcasts: shows on a shelf, episodes below, and a mini player that appears
// once something has been started.

import { art } from '@doan-labs/duo-fixtures'
import { TRACKS, type Track } from '@doan-labs/duo-fixtures/tracks.ts'
import type { Os } from '@doan-labs/duo-sdk'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

const SHOWS: [string, string, string[]][] = [
  ['The Talk Show', 'John Gruber', ['Titanium, Folded', 'On Cycles and Colour', 'The Chamfer Episode']],
  ['Accidental Tech', 'ATP', ['Anisotropy Explained', 'Hinges Are Hard', 'Why Metal Renders Black']],
  ['Blender Today', 'Blender', ['AgX and You', 'Path Tracing a Phone', '5.2 Release Notes']]
]
const EPS: Track[] = SHOWS.flatMap(([show, who, list]) =>
  list.map((t, i) => [t, `${show} · ${who}`, TRACKS[(i + show.length) % TRACKS.length]![2]] as Track)
)
/** Index in EPS of each show's first episode. */
const FIRST = SHOWS.map((_, i) => SHOWS.slice(0, i).reduce((n, [, , list]) => n + list.length, 0))

/**
 * Music's deck without seeking: one `<audio>` and a clock that counts on its own
 * if the file never loads, so the mini player still moves offline.
 */
function deck(list: Track[]) {
  const a = new Audio()
  a.preload = 'none'
  let i = 0
  let t = 0
  let on = false
  const len = 214
  let emit = () => {}
  const load = (n: number) => {
    i = ((n % list.length) + list.length) % list.length
    t = 0
    a.src = list[i]![2]
    if (on) void a.play().catch(() => {})
    emit()
  }
  const toggle = () => {
    if (!a.src) load(i)
    on = !on
    if (on) void a.play().catch(() => {})
    else a.pause()
    emit()
  }
  a.addEventListener('ended', () => load(i + 1))
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
    /** Whether anything was ever started; the mini player stays hidden until then. */
    get loaded() {
      return !!a.src
    },
    load,
    toggle,
    /** Starts the clock and reports every change to `onChange`; returns the stop. */
    run(onChange: () => void) {
      emit = onChange
      const tick = setInterval(() => {
        if (!on) return
        t = a.currentTime || t + 0.25
        if (t >= (a.duration || len)) load(i + 1)
        else emit()
      }, 250)
      return () => {
        clearInterval(tick)
        a.pause()
        a.removeAttribute('src')
      }
    }
  }
}

function useDeck(list: Track[]) {
  const [, bump] = useState(0)
  const ref = useRef<ReturnType<typeof deck>>(null)
  if (!ref.current) ref.current = deck(list)
  const d = ref.current
  useEffect(() => d.run(() => bump((n) => n + 1)), [d])
  return d
}

export const Podcasts = (_: { os: Os }) => {
  const d = useDeck(EPS)
  const start = (k: number) => {
    d.load(k)
    if (!d.playing) d.toggle()
  }
  const [n] = d.now
  return (
    <Screen xstyle={[styles.root]}>
      <Screen>
        <LargeTitle>Listen Now</LargeTitle>
        <div {...stylex.props(styles.shelf)}>
          {SHOWS.map(([s, w], si) => (
            <div key={s} {...stylex.props(styles.poster)} onClick={() => start(FIRST[si]!)}>
              <div {...stylex.props(styles.im, styles.bg(art(s)))}>{s}</div>
              <Text as="div" size="caption" xstyle={[styles.posterSub]}>
                {w}
              </Text>
            </div>
          ))}
        </div>
        {SHOWS.map(([s, , list], si) => (
          <div key={s}>
            <Title xstyle={[styles.hdr]}>{s}</Title>
            <div>
              {list.map((t, ei) => (
                <div key={t} {...stylex.props(styles.li)} onClick={() => start(FIRST[si]! + ei)}>
                  <div {...stylex.props(styles.thumb, styles.bg(art(t)))} />
                  <div {...stylex.props(styles.tx)}>
                    <b {...stylex.props(styles.txB)}>{t}</b>
                    <p {...stylex.props(styles.txP)}>
                      {28 + (t.length % 30)} min · {s}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Screen>
      <div {...stylex.props(styles.mini, !d.loaded && shared.hide)}>
        <div {...stylex.props(styles.art, styles.bg(art(n)))} />
        <div {...stylex.props(styles.title)}>{n}</div>
        <button type="button" {...stylex.props(styles.play)} onClick={() => d.toggle()}>
          {d.playing ? '❚❚' : '▶'}
        </button>
        <div {...stylex.props(styles.scrub)}>
          <i {...stylex.props(styles.fill, styles.w(`${(d.at / d.dur) * 100}%`))} />
        </div>
      </div>
    </Screen>
  )
}
