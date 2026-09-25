import type { DeviceEvent, DeviceEvents } from '@doan-labs/duo-sdk'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTheme } from './theme'
import { color, ease } from './tokens.stylex'

const BASE = import.meta.env.VITE_SIMULATOR_URL ?? (import.meta.env.DEV ? 'http://localhost:3000/' : '/device/')

/** Something for the phone to do once its app is up; the shell's side is packages/shell/cues.ts. */
export type Cue = {
  split?: string
  switcher?: boolean
  folder?: boolean
  wallpaper?: boolean
  screenshot?: boolean
  play?: boolean
  control?: boolean
}

/** One hardware event as the shell forwards it: what `os.device.on(type)` hands an app. */
export type Heard = { [K in DeviceEvent]: { type: K; data: DeviceEvents[K] } }[DeviceEvent]

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
  arg,
  cue,
  eager = false,
  spin = false,
  tall = false,
  mount = true,
  bare = false,
  fill = false,
  builder,
  onBuilderReady,
  onPainted,
  hear,
  onDevice,
  children
}: {
  deg?: number
  /** Turn of the device in radians; negative shows the right edge and its buttons. */
  yaw?: number
  /** The app to show, by its home screen name; the empty string is Home. Changes after load go by postMessage. */
  app?: string
  /** The deep link `app` opens with, arriving as its `os.arg`: a catalog id opens that page in the Store. */
  arg?: string
  /** A gesture for the phone to play: the split drag toward `split`, the switcher, a folder, the wallpaper, a screenshot, a song. Replayed whenever the cue changes. */
  cue?: Cue
  /** Mount at once instead of waiting for the viewport (the hero). */
  eager?: boolean
  /** Turn the phone on its own from the moment the scene draws; off under prefers-reduced-motion. */
  spin?: boolean
  tall?: boolean
  /** Hold the frame back until true (the camera scene waits for its permission prompt). */
  mount?: boolean
  /** The phone only: no slider, buttons, hint or orbit widget inside the frame. */
  bare?: boolean
  /** Take the parent's height instead of the device aspect ratio (a grid row that is what is left of the viewport). */
  fill?: boolean
  builder?: string
  onBuilderReady?: (frame: HTMLIFrameElement) => void
  /** The shell has a picture on screen. Anything captioning the device waits for this rather than for `load`. */
  onPainted?: () => void
  /** Device events to be told of, as an app listening to them would be: its volume and Camera Control presses are the page's. */
  hear?: DeviceEvent[]
  onDevice?: (e: Heard) => void
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
  const shown = useRef({ app, arg })
  const told = useRef(onDevice)
  told.current = onDevice
  const hearing = useRef(hear)
  hearing.current = hear
  const theme = useTheme()

  useEffect(() => {
    if (painted && builder && frame.current) onBuilderReady?.(frame.current)
  }, [painted, builder, onBuilderReady])

  useEffect(() => {
    if (painted) onPainted?.()
  }, [painted, onPainted])

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
      post(f, { bg: bg(box.current), deg, yaw, hear: hearing.current })
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
    if (!ready || (app === shown.current.app && arg === shown.current.arg)) return
    shown.current = { app, arg }
    post(frame.current, { app: app ?? '', arg })
  }, [ready, app, arg])
  const hearKey = hear?.join() ?? ''
  // biome-ignore lint/correctness/useExhaustiveDependencies: `hearKey` stands for `hear`; an equal list is not a new one.
  useEffect(() => {
    const f = frame.current
    if (!ready || !f || !hear) return
    const heard = (e: MessageEvent<{ device?: Heard }>) => {
      if (e.source === f.contentWindow && e.data?.device) told.current?.(e.data.device)
    }
    addEventListener('message', heard)
    post(f, { hear })
    return () => {
      removeEventListener('message', heard)
      post(f, { hear: [] })
    }
  }, [ready, hearKey])
  const cueKey = JSON.stringify(cue ?? null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cueKey` stands for `cue`; an equal object is not a new cue.
  useEffect(() => {
    if (ready && cue) post(frame.current, { cue })
  }, [ready, cueKey])

  // The URL is fixed at first render: later poses go by postMessage. Putting
  // a live `deg` in `src` would reload the whole scene on every change.
  const [src] = useState(() => {
    const q = new URLSearchParams({ deg: String(deg) })
    if (spin) q.set('spin', '1')
    if (builder) q.set('builder', builder)
    if (yaw !== undefined) q.set('yaw', String(yaw))
    if (app) q.set('app', app)
    if (arg) q.set('arg', arg)
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
      {/* Mounted through the handover, not until it: dropping the node on `painted`
          would cut the cross-fade at the one moment it has something to carry. */}
      <div {...stylex.props(styles.ghost, !bare && styles.ghostBand, painted && styles.gone)} aria-hidden="true">
        <div
          {...stylex.props(
            styles.slab,
            tall && styles.slabTall,
            deg <= 90 && styles.slabShut,
            painted && styles.slabStill
          )}
        >
          {deg > 90 && <span {...stylex.props(styles.seam)} />}
        </div>
      </div>
      {children}
    </div>
  )
}

const post = (
  f: HTMLIFrameElement | null,
  msg: {
    deg?: number
    yaw?: number
    bg?: string
    paused?: boolean
    app?: string
    arg?: string
    cue?: Cue
    hello?: boolean
    hear?: DeviceEvent[]
  }
) => f?.contentWindow?.postMessage(msg, new URL(BASE, location.href).origin)
// The box's own colour, not the body's: a frame inside a dark section takes the section's backdrop.
const bg = (el: HTMLElement | null) => getComputedStyle(el ?? document.body).backgroundColor

const REDUCE = '@media (prefers-reduced-motion: reduce)'
const SMALL = '@media (max-width: 734px)'
// A breath, not a blink: the slab is already the phone, it is just not here yet.
const breathe = stylex.keyframes({
  '0%, 100%': { transform: 'scale(0.986)', opacity: 0.7 },
  '50%': { transform: 'scale(1)', opacity: 1 }
})

const styles = stylex.create({
  box: {
    position: 'relative',
    width: '100%',
    aspectRatio: '818 / 664',
    maxHeight: '78vh',
    backgroundColor: color.bg
  },
  // The shell fits the phone into the shorter of the two axes, so on a phone the
  // landscape box is what keeps the device small: stand the stage up instead, and
  // the width becomes the limit, which is the one we want it to fill.
  tall: { aspectRatio: { default: '818 / 664', [SMALL]: '5 / 7' }, maxHeight: 'calc(100vh - 160px)' },
  fill: { height: '100%', aspectRatio: 'auto', maxHeight: 'none' },
  frame: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    transform: 'scale(1)',
    transitionProperty: 'opacity, transform',
    transitionDuration: { default: '0.7s', [REDUCE]: '0.2s' },
    transitionTimingFunction: ease.out
  },
  /** Arriving from just behind where it lands, so the swap settles rather than cuts. */
  hidden: { opacity: 0, transform: 'scale(0.97)' },
  /** The stand-in while 3.6 MB of phone is on the way, and the half that lets go of the handover. */
  ghost: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    transform: 'scale(1)',
    transitionProperty: 'opacity, transform',
    transitionDuration: { default: '0.55s', [REDUCE]: '0.2s' },
    transitionTimingFunction: ease.out,
    pointerEvents: 'none'
  },
  /** The shell keeps a band under the phone for its slider, so the real thing lands high of centre. */
  ghostBand: { paddingBottom: '70px' },
  gone: { opacity: 0, transform: 'scale(1.03)' },
  /**
   * A body with a hinge down it: enough to read as the phone rather than as an
   * empty box, and close enough to where the phone lands that the swap is one
   * object settling. Sized off the height, never the width: with a width set,
   * `aspect-ratio` only supplies the height, and a cap on that flattens the slab
   * instead of shrinking it.
   */
  slab: {
    position: 'relative',
    height: '75%',
    maxWidth: '92%',
    aspectRatio: '16.6 / 11.8',
    borderRadius: '20px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.well,
    boxShadow: color.shadow,
    animationName: { default: breathe, [REDUCE]: 'none' },
    animationDuration: '2.6s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationPlayState: 'running'
  },
  /** The stage stands up on a phone, where the shell draws the device smaller against its box. */
  slabTall: { height: { default: '75%', [SMALL]: '55%' } },
  /** Folded shut, the phone stands on its cover display instead. */
  slabShut: { aspectRatio: '8.3 / 11.8', height: '62%' },
  // Paused rather than removed: a removed animation snaps back to its base frame
  // mid-fade, and paused costs the compositor nothing.
  slabStill: { animationPlayState: 'paused' },
  seam: { position: 'absolute', top: '9%', bottom: '9%', left: '50%', width: '1px', backgroundColor: color.border }
})
