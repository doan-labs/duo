import * as stylex from '@stylexjs/stylex'
import { useInView } from 'motion/react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'
import { useAutoplay } from './autoplay'
import { diagram, Stat } from './diagram'

// The cover glass in mm (OUTER in packages/shell/main.ts), the radii measured
// off Apple's mesh and the bezel inside them (packages/shell/screen.ts). The
// hinge runs down the left edge of the cover as it faces you.
const W = 77.4
const H = 112.5
const FREE = 11.4
const HINGE = 1.3
const BEZEL = 1.2
const ACTIVE_FREE = 10.2
const ACTIVE_HINGE = 0.5
/** The cover drawn at 3 svg units per mm, the zoom lens beside it. */
const S = 3
const OX = 36
const OY = 24
const LENS = { x: 340, y: 24, size: 280 }

type Corner = 'free' | 'hinge'
const CORNERS: Record<Corner, { x: number; y: number; span: number; r: number; inner: number; label: string }> = {
  free: { x: W - 14, y: 0, span: 14, r: FREE, inner: ACTIVE_FREE, label: 'free edge' },
  hinge: { x: 0, y: 0, span: 3, r: HINGE, inner: ACTIVE_HINGE, label: 'hinge edge' }
}

/** A rounded rectangle with its own radius on every corner: top-left, top-right, bottom-right, bottom-left. */
const rr = (x: number, y: number, w: number, h: number, [a, b, c, d]: [number, number, number, number]) =>
  `M${x + a} ${y}H${x + w - b}A${b} ${b} 0 0 1 ${x + w} ${y + b}V${y + h - c}A${c} ${c} 0 0 1 ${x + w - c} ${y + h}H${x + d}A${d} ${d} 0 0 1 ${x} ${y + h - d}V${y + a}A${a} ${a} 0 0 1 ${x + a} ${y}Z`

const glass = rr(0, 0, W, H, [HINGE, FREE, FREE, HINGE])
const active = rr(BEZEL, BEZEL, W - 2 * BEZEL, H - 2 * BEZEL, [ACTIVE_HINGE, ACTIVE_FREE, ACTIVE_FREE, ACTIVE_HINGE])

/** The glass and its active area in mm, drawn at whatever scale the group around it sets. */
function Cover() {
  return (
    <>
      <path d={glass} {...stylex.props(styles.glass)} />
      <path d={active} {...stylex.props(styles.active)} />
    </>
  )
}

/**
 * Duo's cover display to scale, with the numbers the shell draws it from.
 * The lens flips between the two corners, so the asymmetry reads at a glance:
 * a round free edge, a nearly square hinge edge. Under it, a gesture scrubbing
 * a real paused Web Animation, the way the shell's swipes do.
 */
export function Measured() {
  const [corner, setCorner] = useState<Corner>('free')
  const figure = useRef<SVGSVGElement>(null)
  const seen = useInView(figure, { once: true, amount: 0.4 })
  const auto = useAutoplay<HTMLDivElement>((t) => setCorner(Math.floor(t / 3.2) % 2 ? 'hinge' : 'free'))
  const c = CORNERS[corner]
  const z = LENS.size / c.span
  // Where the corner's arc meets its 45 degree line, in mm: the radius callout points there.
  const k = corner === 'free' ? 1 : -1
  const cx = corner === 'free' ? W - c.r : c.r
  const tip = { x: cx + k * c.r * Math.SQRT1_2, y: c.r - c.r * Math.SQRT1_2 }
  const lens = (p: { x: number; y: number }) => ({ x: LENS.x + (p.x - c.x) * z, y: LENS.y + (p.y - c.y) * z })
  const centre = lens({ x: cx, y: c.r })
  const arc = lens(tip)
  const bezelX = corner === 'free' ? W - c.span * 0.75 : c.span * 0.75
  const b0 = lens({ x: bezelX, y: 0 })
  const b1 = lens({ x: bezelX, y: BEZEL })

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={auto.ref}>
        <svg
          ref={figure}
          viewBox="0 0 640 400"
          role="img"
          aria-label={`The cover display to scale, zoomed on its ${c.label} corner`}
        >
          <title>Cover display, measured</title>
          <defs>
            <clipPath id="measuredLens">
              <rect x={LENS.x} y={LENS.y} width={LENS.size} height={LENS.size} rx="16" />
            </clipPath>
          </defs>
          <g transform={`translate(${OX} ${OY}) scale(${S})`}>
            <Cover />
            {/* The lens's patch on the full cover. */}
            <rect
              x={c.x}
              y={c.y}
              width={c.span}
              height={c.span}
              {...stylex.props(styles.patch)}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <line
            x1={OX + (c.x + c.span) * S}
            y1={OY + c.y * S}
            x2={LENS.x}
            y2={LENS.y}
            {...stylex.props(styles.leader)}
          />
          <text x={OX + (W * S) / 2} y={OY + H * S + 22} textAnchor="middle" {...stylex.props(diagram.svgText)}>
            77.4 × 112.5 mm
          </text>
          <text
            x={OX - 12}
            y={OY + (H * S) / 2}
            textAnchor="middle"
            {...stylex.props(diagram.svgText, styles.vertical)}
          >
            hinge
          </text>
          <rect x={LENS.x} y={LENS.y} width={LENS.size} height={LENS.size} rx="16" {...stylex.props(styles.lensBg)} />
          <g clipPath="url(#measuredLens)">
            <g
              {...stylex.props(
                styles.zoom(`translate(${LENS.x}px, ${LENS.y}px) scale(${z}) translate(${-c.x}px, ${-c.y}px)`)
              )}
            >
              <Cover />
            </g>
          </g>
          {/* The callouts redraw each time the lens moves, keyed on the corner. */}
          {seen && (
            <g key={corner}>
              <line
                x1={centre.x}
                y1={centre.y}
                x2={arc.x}
                y2={arc.y}
                pathLength={1}
                {...stylex.props(styles.dim, styles.draw)}
              />
              <circle cx={centre.x} cy={centre.y} r="3" {...stylex.props(styles.dot)} />
              <text
                x={(centre.x + arc.x) / 2 + 10}
                y={(centre.y + arc.y) / 2 + 16}
                {...stylex.props(styles.callout, styles.fade)}
              >
                R {c.r} glass
              </text>
              <line
                x1={b0.x - 24}
                y1={b0.y}
                x2={b0.x + 24}
                y2={b0.y}
                pathLength={1}
                {...stylex.props(styles.dim, styles.draw, styles.later)}
              />
              <line
                x1={b1.x - 24}
                y1={b1.y}
                x2={b1.x + 24}
                y2={b1.y}
                pathLength={1}
                {...stylex.props(styles.dim, styles.draw, styles.later)}
              />
              <text x={b1.x - 24} y={b1.y + 18} {...stylex.props(styles.callout, styles.fade, styles.later)}>
                {BEZEL} bezel
              </text>
              <text
                x={LENS.x + 14}
                y={LENS.y + LENS.size - 14}
                {...stylex.props(diagram.svgText, styles.lensNote, styles.fade, styles.later)}
              >
                {c.label} · R {c.inner} active · {Math.round(z)} px/mm
              </text>
            </g>
          )}
        </svg>
      </div>
      <div {...stylex.props(diagram.controls)}>
        {(['free', 'hinge'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={corner === k}
            onClick={() => {
              auto.stop()
              setCorner(k)
            }}
            {...stylex.props(diagram.button, corner !== k && styles.off)}
          >
            {CORNERS[k].label}
          </button>
        ))}
      </div>
      <Scrub />
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Inner glass" value="R 10.7 mm" />
        <Stat label="Cover free edge" value={`R ${FREE} mm`} />
        <Stat label="Cover hinge edge" value={`R ${HINGE} mm`} />
        <Stat label="Bezel" value={`${BEZEL} mm`} />
      </dl>
      <figcaption {...stylex.props(diagram.caption)}>
        The cover to scale and each corner up close, drawn from the shell's numbers. Below, drag the icon open: the
        finger sets the time of a paused animation, and letting go plays it on or back.
      </figcaption>
    </figure>
  )
}

const OPEN_MS = 500

/**
 * An app opening from its icon as one paused Web Animation. The finger writes
 * `currentTime`; release plays it on or reverses it, by where and how fast.
 */
function Scrub() {
  const track = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const anim = useRef<Animation | null>(null)
  const grab = useRef<{ x: number; t: number; v: number } | null>(null)
  const [ms, setMs] = useState(0)
  const [held, setHeld] = useState(false)
  const auto = useAutoplay<HTMLDivElement>((t) => {
    const a = anim.current
    const dir = Math.floor(t / 1.6) % 2 ? -1 : 1
    if (a && a.playbackRate !== dir) {
      a.playbackRate = dir
      a.play()
    }
  })

  useEffect(() => {
    const el = card.current
    if (!el) return
    const a = el.animate(
      [
        { width: '56px', height: '56px', borderRadius: '14px', opacity: 0.9 },
        { width: '100%', height: '100%', borderRadius: '16px', opacity: 1 }
      ],
      { duration: OPEN_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
    )
    a.pause()
    anim.current = a
    let raf = 0
    const read = () => {
      setMs(Number(a.currentTime ?? 0))
      raf = requestAnimationFrame(read)
    }
    raf = requestAnimationFrame(read)
    return () => {
      cancelAnimationFrame(raf)
      a.cancel()
    }
  }, [])

  const at = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect()
    return r ? Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) : 0
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    auto.stop()
    e.currentTarget.setPointerCapture(e.pointerId)
    anim.current?.pause()
    grab.current = { x: e.clientX, t: performance.now(), v: 0 }
    setHeld(true)
    move(e)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = grab.current
    const a = anim.current
    if (!g || !a) return
    const now = performance.now()
    g.v = (e.clientX - g.x) / Math.max(1, now - g.t)
    g.x = e.clientX
    g.t = now
    a.currentTime = at(e) * OPEN_MS
  }
  const up = () => {
    const g = grab.current
    const a = anim.current
    grab.current = null
    setHeld(false)
    if (!g || !a) return
    const p = Number(a.currentTime ?? 0) / OPEN_MS
    a.playbackRate = g.v > 0.4 || (g.v > -0.4 && p > 0.5) ? 1 : -1
    a.play()
  }

  return (
    <div ref={auto.ref} {...stylex.props(styles.scrub)}>
      <div
        ref={track}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        {...stylex.props(styles.track, held && styles.grabbing)}
      >
        <div ref={card} {...stylex.props(styles.card)}>
          <img src="/icons/notes.webp" alt="" width={56} height={56} {...stylex.props(styles.cardIcon)} />
        </div>
        <span {...stylex.props(styles.hint)}>drag to open →</span>
      </div>
      <code {...stylex.props(styles.time)}>
        currentTime = {Math.round(ms).toString().padStart(3, ' ')} ms{held ? ' · held' : ''}
      </code>
    </div>
  )
}

const draw = stylex.keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } })
const fade = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

const styles = stylex.create({
  glass: { fill: color.text, stroke: 'none' },
  active: { fill: color.accent },
  patch: { fill: 'none', stroke: color.orange, strokeWidth: 1.5 },
  leader: { stroke: color.orange, strokeWidth: 1, strokeDasharray: '3 4' },
  vertical: { transformBox: 'fill-box', transformOrigin: 'center', transform: 'rotate(-90deg)' },
  lensBg: { fill: color.well, stroke: color.orange, strokeWidth: 1.5 },
  zoom: (transform: string) => ({
    transform,
    transitionProperty: 'transform',
    transitionDuration: '0.9s',
    transitionTimingFunction: ease.inOut
  }),
  // The draw-ins start hidden, so they hold their last frame (AGENTS.md).
  dim: { stroke: color.onAccent, strokeWidth: 1.5, strokeDasharray: 1, strokeDashoffset: 1 },
  draw: {
    animationName: draw,
    animationDuration: '0.7s',
    animationDelay: '0.9s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  fade: {
    opacity: 0,
    animationName: fade,
    animationDuration: '0.4s',
    animationDelay: '1.3s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  later: { animationDelay: '1.5s' },
  dot: { fill: color.onAccent },
  lensNote: { fill: color.onAccent },
  callout: { fontFamily: font.mono, fontSize: '13px', fontWeight: 500, fill: color.onAccent },
  off: { backgroundColor: { default: color.well, ':hover': color.border }, color: color.text },
  scrub: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '18px' },
  track: {
    position: 'relative',
    height: '120px',
    padding: '8px',
    borderRadius: radius.md,
    backgroundColor: color.well,
    backgroundImage: `linear-gradient(90deg, transparent, ${color.accentSoft})`,
    touchAction: 'none',
    cursor: 'grab',
    userSelect: 'none'
  },
  grabbing: { cursor: 'grabbing' },
  hint: {
    position: 'absolute',
    right: '16px',
    bottom: '12px',
    fontFamily: font.mono,
    fontSize: '11px',
    color: color.text3,
    pointerEvents: 'none'
  },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    width: '56px',
    height: '56px',
    backgroundColor: color.surface,
    boxShadow: color.shadow
  },
  cardIcon: { display: 'block', width: '56px', height: '56px', flexShrink: 0 },
  time: { fontFamily: font.mono, fontSize: '12px', color: color.text3, whiteSpace: 'pre' }
})
