import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'

/** `[seconds, label]`: where a chapter of the film starts. */
export type Chapter = readonly [number, string]

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * A film on the page: the poster and one play button until the reader asks,
 * then the browser's own controls. Chapters under it seek, and the one playing
 * fills as it runs, so the row doubles as a table of contents for the film.
 */
export function Film({
  src,
  poster,
  caption,
  chapters = []
}: {
  src: string
  poster: string
  caption?: string
  chapters?: readonly Chapter[]
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [t, setT] = useState(0)
  const [length, setLength] = useState(0)

  // The metadata can land before hydration, and React never hears that event.
  useEffect(() => {
    const v = video.current
    if (v && v.readyState > 0) setLength(v.duration)
  }, [])

  const play = (at?: number) => {
    const v = video.current
    if (!v) return
    if (at !== undefined) v.currentTime = at
    setStarted(true)
    void v.play()
  }

  const now = chapters.findLastIndex(([at]) => t >= at)
  return (
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.frame)}>
        <video
          ref={video}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          controls={started}
          onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          {...stylex.props(styles.video)}
        />
        {!started && (
          <button type="button" onClick={() => play()} {...stylex.props(styles.cover)}>
            <span {...stylex.props(styles.play)}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
              </svg>
              Play the film
              {length > 0 && <span {...stylex.props(styles.length)}>{clock(length)}</span>}
            </span>
          </button>
        )}
      </div>
      {chapters.length > 0 && (
        <ol {...stylex.props(styles.chapters)}>
          {chapters.map(([at, name], i) => {
            const end = chapters[i + 1]?.[0] ?? length
            const fill = started && i === now && end > at ? Math.min(1, (t - at) / (end - at)) : i < now ? 1 : 0
            return (
              <li key={name} {...stylex.props(styles.chapterItem)}>
                <button
                  type="button"
                  onClick={() => play(at)}
                  aria-current={started && i === now ? 'true' : undefined}
                  {...stylex.props(styles.chapter, started && i === now && styles.chapterOn)}
                >
                  <span {...stylex.props(styles.track)}>
                    <span {...stylex.props(styles.bar, styles.fill(fill))} />
                  </span>
                  <span {...stylex.props(styles.at)}>{clock(at)}</span>
                  <span {...stylex.props(styles.name)}>{name}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {caption && <figcaption {...stylex.props(styles.caption)}>{caption}</figcaption>}
    </figure>
  )
}

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  // Wider than the text column, centred on it, like a film should be.
  figure: {
    marginTop: 0,
    marginBottom: '56px',
    marginLeft: 'calc(50% - min(540px, 50vw - 24px))',
    marginRight: 0,
    width: 'min(1080px, 100vw - 48px)'
  },
  frame: {
    position: 'relative',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: color.well,
    boxShadow: color.shadow
  },
  video: { display: 'block', width: '100%', height: '100%', objectFit: 'cover' },
  cover: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: { default: '28px', [SMALL]: '14px' },
    paddingLeft: { default: '28px', [SMALL]: '14px' },
    paddingRight: 0,
    borderWidth: 0,
    cursor: 'pointer',
    // A floor of shade so the pill lifts off a white poster.
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.32), rgba(0,0,0,0) 38%)',
    backgroundColor: 'transparent',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '3px',
    outlineOffset: '-3px'
  },
  play: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: { default: '13px', [SMALL]: '10px' },
    paddingBottom: { default: '13px', [SMALL]: '10px' },
    paddingLeft: { default: '20px', [SMALL]: '16px' },
    paddingRight: { default: '24px', [SMALL]: '18px' },
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    color: '#141413',
    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
    fontFamily: font.sans,
    fontSize: { default: '16px', [SMALL]: '14px' },
    fontWeight: 600,
    transform: { default: 'scale(1)', ':hover': 'scale(1.04)' },
    transitionProperty: 'transform',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
  },
  length: { fontFamily: font.mono, fontSize: '13px', fontWeight: 400, opacity: 0.6 },
  chapters: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '16px',
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(auto-fit, minmax(120px, 1fr))', [SMALL]: 'repeat(2, 1fr)' },
    gap: '8px'
  },
  chapterItem: { minWidth: 0 },
  chapter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
    width: '100%',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': color.well },
    color: color.text2,
    textAlign: 'left',
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  chapterOn: { color: color.text },
  track: {
    display: 'block',
    width: '100%',
    height: '3px',
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: color.border
  },
  bar: {
    display: 'block',
    height: '100%',
    backgroundColor: color.accent,
    transformOrigin: 'left',
    transitionProperty: 'transform',
    transitionDuration: '0.25s',
    transitionTimingFunction: 'linear'
  },
  fill: (f: number) => ({ transform: `scaleX(${f})` }),
  at: { fontFamily: font.mono, fontSize: '11px', color: color.text3 },
  name: { fontFamily: font.sans, fontSize: '14px', fontWeight: 500, lineHeight: 1.3 },
  caption: {
    maxWidth: '720px',
    marginTop: '14px',
    marginLeft: 'auto',
    marginRight: 'auto',
    fontFamily: font.sans,
    fontSize: '14px',
    lineHeight: 1.5,
    color: color.text3
  }
})
