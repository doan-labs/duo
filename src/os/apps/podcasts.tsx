// Podcasts: shows on a shelf, episodes below, and a mini player that appears
// once something has been started.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { TRACKS, type Track } from './music.tsx'
import { art } from './shared.ts'

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
    <div {...stylex.props(shared.body, styles.root)}>
      <div {...stylex.props(shared.body)}>
        <div {...stylex.props(shared.hero)}>Listen Now</div>
        <div {...stylex.props(styles.shelf)}>
          {SHOWS.map(([s, w], si) => (
            <div key={s} {...stylex.props(styles.poster)} onClick={() => start(FIRST[si]!)}>
              <div {...stylex.props(styles.im, styles.bg(art(s)))}>{s}</div>
              <div {...stylex.props(shared.sub, styles.posterSub)}>{w}</div>
            </div>
          ))}
        </div>
        {SHOWS.map(([s, , list], si) => (
          <div key={s}>
            <div {...stylex.props(shared.hdr, styles.hdr)}>{s}</div>
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
      </div>
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
    </div>
  )
}

const styles = stylex.create({
  root: { paddingBottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: colors.groupedLight },
  shelf: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingTop: 2,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  poster: {
    flexShrink: 0,
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  im: {
    aspectRatio: 1,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.2,
    textShadow: '0 2px 8px rgba(0,0,0,.5)'
  },
  posterSub: { paddingTop: 6, paddingRight: 2, paddingBottom: 6, paddingLeft: 2 },
  bg: (image: string) => ({ backgroundImage: image }),
  hdr: { fontSize: 18 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingRight: 16,
    paddingBottom: 11,
    paddingLeft: 16,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)',
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  thumb: { width: 52, height: 52, borderRadius: 9, flexShrink: 0 },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: { display: 'block', fontSize: 15, fontWeight: 600 },
  txP: { fontSize: 13, color: colors.grey, lineHeight: 1.35, maxHeight: '2.7em', overflow: 'hidden' },
  mini: {
    position: 'relative',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 9,
    paddingRight: 14,
    paddingBottom: 9,
    paddingLeft: 14,
    backgroundColor: 'rgba(28,28,30,.92)',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(255,255,255,.1)',
    color: colors.white
  },
  art: { width: 40, height: 40, borderRadius: 7, aspectRatio: 1 },
  title: {
    fontWeight: 600,
    fontSize: 14,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  play: { fontSize: 20 },
  scrub: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,.2)',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  fill: { display: 'block', height: '100%', backgroundColor: 'rgba(255,255,255,.85)', borderRadius: 3 },
  w: (width: string) => ({ width })
})
