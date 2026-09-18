import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTheme } from './theme'
import { color } from './tokens.stylex'

const BASE = import.meta.env.VITE_SIMULATOR_URL ?? (import.meta.env.DEV ? 'http://localhost:3000/' : '/device/')

/** Something for the phone to do once its app is up; the shell's side is packages/shell/cues.ts. */
export type Cue = { split?: string; screenshot?: boolean; play?: boolean }

/**
 * The real shell in a frame, sitting on the page rather than in a card. It
 * mounts when it comes within a screen of the viewport, takes its backdrop
 * from the page so the device floats on it in either theme, and follows the
 * `deg` prop by postMessage rather than a reload (the bridge is in
 * packages/shell/main.ts). In development the frame points at the root dev
 * server on port 3000; in the build it is the root `dist/` copied under `/device/`.
 */
export function Simulator({
  deg = 180,
  yaw,
  app,
  cue,
  eager = false,
  tall = false,
  mount = true,
  bare = false,
  fill = false,
  children
}: {
  deg?: number
  /** Turn of the device in radians; negative shows the right edge and its buttons. */
  yaw?: number
  /** The app to show, by its home screen name; the empty string is Home. Changes after load go by postMessage. */
  app?: string
  /** The split-screen drag toward `split`, a screenshot, or a song, replayed whenever the cue changes. */
  cue?: Cue
  /** Mount at once instead of waiting for the viewport (the hero). */
  eager?: boolean
  tall?: boolean
  /** Hold the frame back until true (the camera scene waits for its permission prompt). */
  mount?: boolean
  /** The phone only: no slider, buttons, hint or orbit widget inside the frame. */
  bare?: boolean
  /** Take the parent's height instead of the device aspect ratio (a grid row that is what is left of the viewport). */
  fill?: boolean
  /** Shown while the frame has not mounted yet. */
  children?: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [near, setNear] = useState(eager)
  const [ready, setReady] = useState(false)
  // The frame answers its load event seconds before the shell has the model on
  // screen. Poses may go as soon as it loads (the shell queues them), but the
  // frame stays hidden behind the placeholder until it says it has a picture.
  const [painted, setPainted] = useState(false)
  const shown = useRef(app)
  const theme = useTheme()

  useEffect(() => {
    if (near || !mount || !box.current) return
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) setNear(true)
      },
      { rootMargin: '600px 0px' }
    )
    io.observe(box.current)
    return () => io.disconnect()
  }, [near, mount])

  // Every load of the frame gets the full state: the browser can fire `load`
  // once for the blank document before the shell's, and a frame in the server
  // HTML can finish loading before React attaches anything. That last case is
  // why the shell's own `live` message counts as a load too: cross-origin the
  // readyState fallback below reads nothing, and the event is already past.
  useEffect(() => {
    const f = frame.current
    if (!near || !f) return
    const loaded = () => {
      setReady(true)
      post(f, { bg: bg(box.current), deg, yaw })
    }
    const heard = (e: MessageEvent<{ live?: boolean; ready?: boolean }>) => {
      if (e.source !== f.contentWindow || !e.data) return
      // `ready` re-sends too: it is the second chance for a `live` sent before
      // this listener existed.
      if (e.data.live || e.data.ready) loaded()
      if (e.data.ready) setPainted(true)
    }
    addEventListener('message', heard)
    // The shell can be up and drawn before this page has hydrated, in which case
    // both its announcements are already past: ask, and it answers with the one
    // that applies.
    post(f, { hello: true })
    if (f.contentDocument?.readyState === 'complete') loaded()
    f.addEventListener('load', loaded)
    return () => {
      removeEventListener('message', heard)
      f.removeEventListener('load', loaded)
    }
  }, [near, deg, yaw])

  // Off screen, the shell stops rendering; a scroll back resumes it without a reload.
  useEffect(() => {
    if (!ready || !box.current) return
    const io = new IntersectionObserver(([e]) => post(frame.current, { paused: !e?.isIntersecting }), {
      rootMargin: '200px 0px'
    })
    io.observe(box.current)
    return () => io.disconnect()
  }, [ready])

  // The backdrop follows the theme; the pose follows its props.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `theme` is the trigger, not an input.
  useEffect(() => {
    if (ready) post(frame.current, { bg: bg(box.current) })
  }, [ready, theme])
  useEffect(() => {
    if (ready) post(frame.current, { deg })
  }, [ready, deg])
  useEffect(() => {
    if (ready && yaw !== undefined) post(frame.current, { yaw })
  }, [ready, yaw])
  useEffect(() => {
    if (!ready || app === shown.current) return
    shown.current = app
    post(frame.current, { app: app ?? '' })
  }, [ready, app])
  const cueKey = JSON.stringify(cue ?? null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cueKey` stands for `cue`; an equal object is not a new cue.
  useEffect(() => {
    if (ready && cue) post(frame.current, { cue })
  }, [ready, cueKey])

  // The URL is fixed at first render: later poses go by postMessage. Putting
  // a live `deg` in `src` would reload the whole scene on every change.
  const [src] = useState(() => {
    const q = new URLSearchParams({ deg: String(deg) })
    if (yaw !== undefined) q.set('yaw', String(yaw))
    if (app) q.set('app', app)
    if (bare) q.set('hud', '0')
    return `${BASE}?${q}`
  })
  return (
    <div
      ref={box}
      {...stylex.props(styles.box, tall && styles.tall, fill && styles.fill)}
      data-simulator={near ? 'mounted' : 'waiting'}
    >
      {near ? (
        <iframe
          ref={frame}
          title={app ? `Duo running ${app}` : 'Duo simulator'}
          src={src}
          allow="camera; geolocation"
          {...stylex.props(styles.frame, !painted && styles.hidden)}
        />
      ) : null}
      {!painted && <div {...stylex.props(styles.ghost, deg <= 90 && styles.ghostShut)} aria-hidden="true" />}
      {children}
    </div>
  )
}

const post = (
  f: HTMLIFrameElement | null,
  msg: { deg?: number; yaw?: number; bg?: string; paused?: boolean; app?: string; cue?: Cue; hello?: boolean }
) => f?.contentWindow?.postMessage(msg, new URL(BASE, location.href).origin)
// The box's own colour, not the body's: a frame inside a dark section takes the section's backdrop.
const bg = (el: HTMLElement | null) => getComputedStyle(el ?? document.body).backgroundColor

const REDUCE = '@media (prefers-reduced-motion: reduce)'
const breathe = stylex.keyframes({ '0%, 100%': { opacity: 0.35 }, '50%': { opacity: 0.75 } })

const styles = stylex.create({
  box: {
    position: 'relative',
    width: '100%',
    aspectRatio: '818 / 664',
    maxHeight: '78vh',
    backgroundColor: color.bg
  },
  tall: { maxHeight: 'calc(100vh - 160px)' },
  fill: { height: '100%', aspectRatio: 'auto', maxHeight: 'none' },
  frame: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    transitionProperty: 'opacity',
    transitionDuration: '0.6s'
  },
  hidden: { opacity: 0 },
  /** The phone's own outline, breathing, while its 3.6 MB body is on the way. */
  ghost: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    height: '68%',
    aspectRatio: '16.6 / 11.8',
    transform: 'translate(-50%, -50%)',
    borderRadius: '18px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    animationName: { default: breathe, [REDUCE]: 'none' },
    animationDuration: '1.8s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    opacity: { default: null, [REDUCE]: 0.5 },
    pointerEvents: 'none'
  },
  /** Folded shut, the phone stands on its cover display instead. */
  ghostShut: { aspectRatio: '8.3 / 11.8', height: '62%' }
})
