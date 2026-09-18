import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTheme } from './theme'
import { color } from './tokens.stylex'

const BASE = import.meta.env.VITE_SIMULATOR_URL ?? (import.meta.env.DEV ? 'http://localhost:3000/' : '/device/')

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
  eager = false,
  tall = false,
  mount = true,
  children
}: {
  deg?: number
  /** Turn of the device in radians; negative shows the right edge and its buttons. */
  yaw?: number
  /** A baked app to open at load, by its home screen name. */
  app?: string
  /** Mount at once instead of waiting for the viewport (the hero). */
  eager?: boolean
  tall?: boolean
  /** Hold the frame back until true (the camera scene waits for its permission prompt). */
  mount?: boolean
  /** Shown while the frame has not mounted yet. */
  children?: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [near, setNear] = useState(eager)
  const [ready, setReady] = useState(false)
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
  // HTML can finish loading before React attaches anything.
  useEffect(() => {
    const f = frame.current
    if (!near || !f) return
    const loaded = () => {
      setReady(true)
      post(f, { bg: bg(), deg, yaw })
    }
    if (f.contentDocument?.readyState === 'complete') loaded()
    f.addEventListener('load', loaded)
    return () => f.removeEventListener('load', loaded)
  }, [near, deg, yaw])

  // The backdrop follows the theme; the pose follows its props.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `theme` is the trigger, not an input.
  useEffect(() => {
    if (ready) post(frame.current, { bg: bg() })
  }, [ready, theme])
  useEffect(() => {
    if (ready) post(frame.current, { deg })
  }, [ready, deg])
  useEffect(() => {
    if (ready && yaw !== undefined) post(frame.current, { yaw })
  }, [ready, yaw])

  const q = new URLSearchParams({ deg: String(deg) })
  if (yaw !== undefined) q.set('yaw', String(yaw))
  if (app) q.set('app', app)
  return (
    <div ref={box} {...stylex.props(styles.box, tall && styles.tall)} data-simulator={near ? 'mounted' : 'waiting'}>
      {near ? (
        <iframe
          ref={frame}
          title={app ? `Duo running ${app}` : 'Duo simulator'}
          src={`${BASE}?${q}`}
          allow="camera; geolocation"
          {...stylex.props(styles.frame, !ready && styles.hidden)}
        />
      ) : null}
      {children}
    </div>
  )
}

const post = (f: HTMLIFrameElement | null, msg: { deg?: number; yaw?: number; bg?: string }) =>
  f?.contentWindow?.postMessage(msg, location.origin)
const bg = () => getComputedStyle(document.body).backgroundColor

const styles = stylex.create({
  box: {
    position: 'relative',
    width: '100%',
    aspectRatio: '818 / 664',
    maxHeight: '78vh',
    backgroundColor: color.bg
  },
  tall: { maxHeight: 'calc(100vh - 160px)' },
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
  hidden: { opacity: 0 }
})
