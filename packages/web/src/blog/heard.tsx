import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent } from 'motion/react'
import { type ReactNode, useRef, useState } from 'react'
import { color, ease, font } from '../tokens.stylex'
import { useAutoplay } from './autoplay'
import { diagram, Stat } from './diagram'

// The closed Duo as a blueprint, cover facing you, every event an app can hear
// wired to where it comes from. The buttons sit where packages/shell/buttons.ts
// finds Apple's caps: side button and Camera Control down the right edge,
// volume along the top with up nearer the corner, the hinge down the left.

type Kind = 'up' | 'down' | 'side' | 'camera' | 'orientation' | 'switches'
type Rule = 'taken' | 'heard' | 'state'

/** The cover in svg units: 77.4 × 112.5 mm at 2.2 a millimetre, free-edge corners R 11.4, hinge-edge R 1.3. */
const PH = { x: 140, y: 92, w: 170, h: 248 }
const FREE = 25
const HINGE = 3
const MID = { x: PH.x + PH.w / 2, y: PH.y + PH.h / 2 }
const RIGHT = PH.x + PH.w

const CAPS = {
  up: { x: 258, y: PH.y - 5, w: 24, h: 5, push: { x: 0, y: 2.5 } },
  down: { x: 228, y: PH.y - 5, w: 24, h: 5, push: { x: 0, y: 2.5 } },
  side: { x: RIGHT, y: 140, w: 5, h: 36, push: { x: -2.5, y: 0 } },
  camera: { x: RIGHT, y: 222, w: 5, h: 36, push: { x: -2.5, y: 0 } }
} as const

const EVENTS: Record<
  Kind,
  { type: string; rule: Rule; meanwhile: string; wire: readonly (readonly [number, number])[] }
> = {
  up: {
    type: 'volume',
    rule: 'taken',
    meanwhile: 'Ringer stays put',
    wire: [
      [270, 86],
      [270, 70],
      [255, 70],
      [255, 58]
    ]
  },
  down: {
    type: 'volume',
    rule: 'taken',
    meanwhile: 'Ringer stays put',
    wire: [
      [240, 86],
      [240, 70],
      [255, 70],
      [255, 58]
    ]
  },
  side: {
    type: 'side',
    rule: 'heard',
    meanwhile: 'It still locks',
    wire: [
      [RIGHT + 5, 158],
      [350, 158]
    ]
  },
  camera: {
    type: 'camera-control',
    rule: 'taken',
    meanwhile: 'Camera stays shut',
    wire: [
      [RIGHT + 5, 240],
      [350, 240]
    ]
  },
  orientation: {
    type: 'orientation',
    rule: 'state',
    meanwhile: 'Once a frame, at most',
    wire: [
      [MID.x, 382],
      [MID.x, 392]
    ]
  },
  switches: {
    type: 'switches',
    rule: 'state',
    meanwhile: 'Read-only',
    wire: [
      [98, 221],
      [PH.x - 3, 221]
    ]
  }
}
const PICKS = [
  ['volume', 'up'],
  ['camera-control', 'camera'],
  ['side', 'side'],
  ['orientation', 'orientation'],
  ['switches', 'switches']
] as const
const LOOP: Kind[] = ['up', 'down', 'camera', 'side', 'orientation', 'switches']
const BEAT = 2.4

/** A rounded rectangle with its own radius per corner: top-left, top-right, bottom-right, bottom-left. */
const rr = (x: number, y: number, w: number, h: number, [a, b, c, d]: [number, number, number, number]) =>
  `M${x + a} ${y}H${x + w - b}A${b} ${b} 0 0 1 ${x + w} ${y + b}V${y + h - c}A${c} ${c} 0 0 1 ${x + w - c} ${y + h}H${x + d}A${d} ${d} 0 0 1 ${x} ${y + h - d}V${y + a}A${a} ${a} 0 0 1 ${x + a} ${y}Z`
const COVER = rr(PH.x, PH.y, PH.w, PH.h, [HINGE, FREE, FREE, HINGE])
const ACTIVE = rr(PH.x + 4, PH.y + 4, PH.w - 8, PH.h - 8, [1, FREE - 4, FREE - 4, 1])
/** Crop marks at the cover's corners, the way a drawing sheet frames its part. */
const CROPS = [
  [PH.x - 8, PH.y, 1, 1],
  [RIGHT + 8, PH.y, -1, 1],
  [PH.x - 8, PH.y + PH.h, 1, -1],
  [RIGHT + 8, PH.y + PH.h, -1, -1]
]
  .map(([x, y, sx, sy]) => `M${x} ${y! + 10 * sy!}V${y}H${x! + 10 * sx!}`)
  .join('')

type Pose = { yaw: number; hinge: number; pitch: number }
type P3 = [number, number, number]
/** Seconds for the whole turn: out, open, back, shut. */
const TURN = 4.2
/** 0 to 1 with no kink at either end (Perlin's smootherstep). */
const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (6 * x - 15) + 10)
}
/** The pose at a point of the turn: swing one way and back, tip toward you, open flat, close. */
const poseAt = (p: number): Pose => ({
  yaw: -26 * Math.sin(2 * Math.PI * p),
  pitch: 14 * Math.sin(Math.PI * p) ** 2,
  hinge: 180 * (smooth((p - 0.08) / 0.4) - smooth((p - 0.58) / 0.36))
})
/** Each half's thickness, and the eye's distance for the perspective, in svg units. */
const T = 8
const EYE = 900
/** The cover's outline as points, clockwise from the top-left, so a 3D pose can move every one. */
const RING: [number, number][] = (() => {
  const { x, y, w, h } = PH
  const arc = (cx: number, cy: number, r: number, from: number): [number, number][] =>
    Array.from({ length: 7 }, (_, i) => {
      const a = ((from + i * 15) * Math.PI) / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })
  return [
    ...arc(x + HINGE, y + HINGE, HINGE, 180),
    ...arc(x + w - FREE, y + FREE, FREE, 270),
    ...arc(x + w - FREE, y + h - FREE, FREE, 0),
    ...arc(x + HINGE, y + h - HINGE, HINGE, 90)
  ]
})()
/** Where the struts join the two outlines of a slab: the middle of each corner's arc. */
const CORNERS = [3, 10, 17, 24]
/** Control Center's glyphs, drawn on a 16 unit square. */
const GLYPHS = {
  airplane: 'M8 2v12M8 6.5l5.5 3v1.2L8 9.4M8 6.5L2.5 9.5v1.2L8 9.4M6 13.5l2-.8 2 .8',
  wifi: 'M2.2 7a8.2 8.2 0 0 1 11.6 0M4.4 9.3a5.1 5.1 0 0 1 7.2 0M6.6 11.6a2 2 0 0 1 2.8 0',
  bt: 'M5 5.2l6 5.4-3 2.8V2.6l3 2.8-6 5.4',
  moon: 'M12.6 10.2A5.4 5.4 0 0 1 5.8 3.4a5.4 5.4 0 1 0 6.8 6.8z'
}

/**
 * Every event `os.device.on` hears, drawn back to its source. A press sinks
 * the cap, a pulse rides the leader to its name, and the cover prints what the
 * app is handed. Plays through all five until the reader taps a cap or a name.
 */
export function Heard() {
  const [shot, setShot] = useState<{ k: Kind; n: number }>({ k: 'up', n: 0 })
  const [down, setDown] = useState<Kind | null>(null)
  const [wifi, setWifi] = useState(true)
  const [slide, setSlide] = useState(0)
  // The turn: yaw about the long axis, the hinge opening, and a little pitch so the depth reads.
  // One clock for the whole turn; every angle is a smooth curve of it, so nothing stops and starts.
  const [turning, setTurning] = useState(false)
  const clock = useMotionValue(0)
  const [p, setP] = useState(0)
  useMotionValueEvent(clock, 'change', setP)
  const pose = poseAt(p)
  const svg = useRef<SVGSVGElement>(null)
  const seen = useInView(svg, { once: true, amount: 0.4 })
  const release = useRef(0)
  const beat = useRef({ i: 0, at: 0, last: 0 })

  const fire = (k: Kind) => {
    setShot((s) => ({ k, n: s.n + 1 }))
    clearTimeout(release.current)
    if (k in CAPS) {
      setDown(k)
      release.current = window.setTimeout(() => setDown(null), k === 'camera' ? 1300 : 240)
    }
    if (k === 'camera') animate(0, 1.2, { duration: 1.1, delay: 0.15, ease: 'easeInOut', onUpdate: setSlide })
    if (k === 'orientation') {
      setTurning(true)
      clock.jump(0)
      animate(clock, 1, { duration: TURN, ease: 'linear' }).then(() => setTurning(false))
    }
    if (k === 'switches') setWifi((w) => !w)
  }
  const auto = useAutoplay<HTMLDivElement>((t) => {
    // The clock restarts each time the figure comes back into view.
    if (t < beat.current.last) beat.current.at = 0
    beat.current.last = t
    if (t < beat.current.at) return
    const k = LOOP[beat.current.i % LOOP.length]!
    fire(k)
    // The turn takes longer than a press; it gets its whole run before the next beat.
    beat.current = { i: beat.current.i + 1, at: t + (k === 'orientation' ? TURN + 0.6 : BEAT), last: t }
  })
  const tap = (k: Kind) => {
    auto.stop()
    fire(k === 'up' && shot.k === 'up' ? 'down' : k)
  }

  const e = EVENTS[shot.k]
  const payload = {
    up: 'up · press',
    down: 'down · press',
    side: 'press',
    camera: `slide ${slide.toFixed(2)} cm`,
    orientation: `yaw ${pose.yaw.toFixed(1)}°\nhinge ${pose.hinge.toFixed(1)}°`,
    switches: `wifi: ${wifi}`
  }[shot.k]
  const live = shot.n > 0
  const wire = (k: Kind) => `M${EVENTS[k].wire.map(([x, y]) => `${x} ${y}`).join('L')}`
  const hot = (k: Kind) => live && (shot.k === k || (k === 'up' && shot.k === 'down'))

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={auto.ref} {...stylex.props(styles.sheet)}>
        <svg ref={svg} viewBox="-5 0 470 430" role="img" aria-label={`Duo's hardware, ${e.type} last heard`}>
          <title>What an app can hear</title>
          <defs>
            <pattern id="heardGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" {...stylex.props(styles.grid)} />
            </pattern>
            <marker id="heardArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L8 4L0 8" {...stylex.props(styles.arrowHead)} />
            </marker>
          </defs>
          <rect x="-5" width="470" height="430" fill="url(#heardGrid)" />

          {/* The part: cover, active area, construction lines, crop marks. */}
          {/* The flat drawing steps aside while the wireframe turns; at rest the two coincide. */}
          <g opacity={turning ? 0 : 1}>
            <path d={COVER} pathLength={1} {...stylex.props(styles.body, seen && styles.draw)} />
            <path d={ACTIVE} pathLength={1} {...stylex.props(styles.faint, seen && styles.draw, styles.wait('0.3s'))} />
            <path
              d={`M${MID.x} ${PH.y - 12}V${PH.y + PH.h + 12}M${PH.x - 12} ${MID.y}H${RIGHT + 12}`}
              {...stylex.props(styles.center, seen && styles.show, styles.wait('0.6s'))}
            />
            <path d={CROPS} {...stylex.props(styles.faint, seen && styles.show, styles.wait('0.5s'))} />
            {/* The hinge barrel down the left edge. */}
            <path
              d={`M${PH.x - 4} ${PH.y + 8}V${PH.y + PH.h - 8}`}
              pathLength={1}
              {...stylex.props(styles.body, seen && styles.draw, styles.wait('0.4s'))}
            />
            {(Object.keys(CAPS) as (keyof typeof CAPS)[]).map((k) => {
              const c = CAPS[k]
              const on = down === k
              return (
                <motion.rect
                  key={k}
                  x={c.x}
                  y={c.y}
                  width={c.w}
                  height={c.h}
                  rx="1.5"
                  animate={{ x: on ? c.push.x : 0, y: on ? c.push.y : 0 }}
                  transition={{ type: 'spring', stiffness: 900, damping: 30 }}
                  {...stylex.props(styles.cap, hot(k) && styles.capOn, seen && styles.show, styles.wait('0.7s'))}
                />
              )
            })}
            {/* A fingertip sliding along Camera Control, toward the top of the phone. */}
            {shot.k === 'camera' && down === 'camera' && (
              <circle cx={RIGHT + 9} cy={254 - slide * 26} r="4" {...stylex.props(styles.finger)} />
            )}
            <text x={RIGHT - 30} y={PH.y + 20} {...stylex.props(styles.note, seen && styles.show, styles.wait('0.9s'))}>
              R 11.4
            </text>
            <text
              x={MID.x}
              y={PH.y + PH.h - 14}
              textAnchor="middle"
              {...stylex.props(styles.note, seen && styles.show, styles.wait('0.9s'))}
            >
              77.4 × 112.5 mm
            </text>
          </g>
          {turning && <Wireframe pose={pose} />}
          {/* What the app is handed, printed on the glass. */}
          <AnimatePresence mode="wait" initial={false}>
            {live && (
              <motion.g
                key={shot.k}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <text x={MID.x} y={MID.y - 30} textAnchor="middle" {...stylex.props(styles.screenType)}>
                  on('{e.type}')
                </text>
                <rect
                  x={MID.x - 72}
                  y={MID.y + 26}
                  width="144"
                  height={payload.includes('\n') ? 50 : 28}
                  rx="8"
                  {...stylex.props(styles.plate)}
                />
                <text x={MID.x} y={MID.y + 45} textAnchor="middle" {...stylex.props(styles.screenValue)}>
                  {payload.split('\n').map((line, i) => (
                    <tspan key={line.slice(0, 4)} x={MID.x} dy={i ? 20 : 0}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </motion.g>
            )}
          </AnimatePresence>
          <text
            x={PH.x - 14}
            y={PH.y + 50}
            textAnchor="middle"
            {...stylex.props(styles.note, styles.vertical, seen && styles.show, styles.wait('0.9s'))}
          >
            hinge
          </text>

          {/* Yaw: the turn about the long axis. */}
          <path
            d={`M${PH.x - 10} 364A${PH.w / 2 + 10} 16 0 0 0 ${RIGHT + 10} 364`}
            pathLength={1}
            markerEnd="url(#heardArrow)"
            {...stylex.props(styles.lead, styles.state, seen && styles.draw, styles.wait('1s'))}
          />
          {/* The switches: Control Center's, not the frame's. */}
          <g {...stylex.props(seen && styles.show, styles.fadeIn, styles.wait('1s'))}>
            <rect x="30" y="190" width="68" height="62" rx="12" {...stylex.props(styles.faintBox)} />
            <Tile x={48} y={206} on={false} glyph={GLYPHS.airplane} />
            <Tile x={80} y={206} on={wifi} glyph={GLYPHS.wifi} />
            <Tile x={48} y={236} on glyph={GLYPHS.bt} />
            <Tile x={80} y={236} on={false} glyph={GLYPHS.moon} />
          </g>

          {/* The leaders, and the pulse that rides one when its event fires. */}
          <g opacity={turning ? 0.25 : 1}>
            {(['up', 'down', 'side', 'camera', 'switches'] as const).map((k) => (
              <path
                key={k}
                d={wire(k)}
                pathLength={1}
                {...stylex.props(
                  styles.lead,
                  styles[EVENTS[k].rule],
                  k === 'switches' && styles.dashed,
                  seen && (k === 'switches' ? styles.show : styles.draw),
                  styles.wait('1.1s')
                )}
              />
            ))}
          </g>
          {live && (
            <motion.circle
              key={shot.n}
              r="3.5"
              initial={{ cx: e.wire[0]![0], cy: e.wire[0]![1], opacity: 1 }}
              animate={{ cx: e.wire.map((p) => p[0]), cy: e.wire.map((p) => p[1]), opacity: [1, 1, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              {...stylex.props(styles.packet, styles[`${e.rule}Fill`])}
            />
          )}
          {live && shot.k in CAPS && (
            <motion.circle
              key={`ring-${shot.n}`}
              cx={e.wire[0]![0]}
              cy={e.wire[0]![1]}
              initial={{ r: 4, opacity: 0.9 }}
              animate={{ r: 20, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              {...stylex.props(styles.ring, styles[e.rule])}
            />
          )}

          <Label x={255} y={50} anchor="middle" kind="up" rule="taken" hot={hot('up')} seen={seen} onTap={tap}>
            volume
          </Label>
          <Label x={356} y={162} kind="side" rule="heard" hot={hot('side')} seen={seen} onTap={tap}>
            side
          </Label>
          <Label x={356} y={244} kind="camera" rule="taken" hot={hot('camera')} seen={seen} onTap={tap}>
            camera-control
          </Label>
          <Label
            x={MID.x}
            y={404}
            anchor="middle"
            kind="orientation"
            rule="state"
            hot={hot('orientation')}
            seen={seen}
            onTap={tap}
            under
          >
            orientation
          </Label>
          <Label
            x={64}
            y={182}
            anchor="middle"
            kind="switches"
            rule="state"
            hot={hot('switches')}
            seen={seen}
            onTap={tap}
          >
            switches
          </Label>
        </svg>
      </div>
      <div {...stylex.props(diagram.controls, styles.picks)}>
        {PICKS.map(([label, k]) => {
          const on = shot.k === k || (k === 'up' && shot.k === 'down')
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => tap(k)}
              {...stylex.props(diagram.button, styles.pick, !on && styles.off)}
            >
              {label}
            </button>
          )
        })}
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Event" value={e.type} />
        <Stat label="Rule" value={e.rule === 'taken' ? 'Taken' : e.rule === 'heard' ? 'Heard' : 'State'} />
        <Stat label="Meanwhile" value={e.meanwhile} />
        <Stat label="Heard" value={`${shot.n}×`} />
      </dl>
    </figure>
  )
}

/** Control Center's round tile, drawn in the sheet's ink: filled when on. */
function Tile({ x, y, on, glyph }: { x: number; y: number; on: boolean; glyph: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="12" {...stylex.props(styles.tile, on && styles.tileOn)} />
      <path
        d={glyph}
        transform={`translate(${x - 8} ${y - 8})`}
        {...stylex.props(styles.glyph, on && styles.glyphOn)}
      />
    </g>
  )
}

/**
 * The phone as a wireframe in perspective: the cover half and the half behind
 * it, each a slab of two outlines joined at the corners. The back half swings
 * about the hinge on the left, through the back, until the two lie flat; the
 * whole thing yaws and pitches about its centre. At rest it lands exactly on
 * the flat drawing, which is why the two can swap without a jump.
 */
function Wireframe({ pose }: { pose: Pose }) {
  const rad = Math.PI / 180
  const o = pose.hinge / 180
  // Open, it is twice as wide: shrink it and keep the hinge centred.
  const s = 1 - 0.4 * o
  const c = MID.x * (1 - o) + PH.x * o
  const th = pose.hinge * rad
  const yw = pose.yaw * rad
  const pt = pose.pitch * rad
  const place = ([x, y, z]: P3, back: boolean): [number, number] => {
    if (back) {
      const dx = x - PH.x
      const dz = z - T
      x = PH.x + dx * Math.cos(th) - dz * Math.sin(th)
      z = T + dx * Math.sin(th) + dz * Math.cos(th)
    }
    x = MID.x + (x - c) * s
    y = MID.y + (y - MID.y) * s
    z = T + (z - T) * s
    const X = x - MID.x
    const Z1 = z - T
    x = MID.x + X * Math.cos(yw) + Z1 * Math.sin(yw)
    z = T - X * Math.sin(yw) + Z1 * Math.cos(yw)
    const Y = y - MID.y
    const Z2 = z - T
    y = MID.y + Y * Math.cos(pt) - Z2 * Math.sin(pt)
    z = T + Y * Math.sin(pt) + Z2 * Math.cos(pt)
    const k = EYE / (EYE + z)
    return [MID.x + (x - MID.x) * k, MID.y + (y - MID.y) * k]
  }
  const ring = (z: number, back: boolean) =>
    `M${RING.map(([x, y]) =>
      place([x, y, z], back)
        .map((v) => v.toFixed(1))
        .join(' ')
    ).join('L')}Z`
  const struts = (z0: number, z1: number, back: boolean) =>
    CORNERS.map((i) => {
      const [x, y] = RING[i]!
      const a = place([x, y, z0], back)
      const b = place([x, y, z1], back)
      return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`
    }).join('')
  return (
    <g>
      <path d={ring(2 * T, true)} {...stylex.props(styles.wire, styles.wireFaint)} />
      <path d={struts(T, 2 * T, true)} {...stylex.props(styles.wire, styles.wireFaint)} />
      <path d={ring(T, true)} {...stylex.props(styles.wire)} />
      <path d={ring(T, false)} {...stylex.props(styles.wire, styles.wireFaint)} />
      <path d={struts(0, T, false)} {...stylex.props(styles.wire, styles.wireFaint)} />
      <path d={ring(0, false)} {...stylex.props(styles.wire, styles.wireFront)} />
    </g>
  )
}

function Label({
  x,
  y,
  anchor = 'start',
  kind,
  rule,
  hot,
  seen,
  under = false,
  onTap,
  children
}: {
  x: number
  y: number
  anchor?: 'start' | 'middle'
  kind: Kind
  rule: Rule
  hot: boolean
  seen: boolean
  under?: boolean
  onTap: (k: Kind) => void
  children: ReactNode
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: an svg label cannot be a <button>.
    <g
      role="button"
      tabIndex={0}
      aria-label={`Fire ${children}`}
      onClick={() => onTap(kind)}
      onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && onTap(kind)}
      {...stylex.props(styles.label, seen && styles.show, styles.fadeIn, styles.wait('1.3s'))}
    >
      <text x={x} y={under ? y + 18 : y - 18} textAnchor={anchor} {...stylex.props(styles.tag, styles[`${rule}Fill`])}>
        {rule}
      </text>
      <text x={x} y={y} textAnchor={anchor} {...stylex.props(styles.name, hot && styles.nameOn)}>
        {children}
      </text>
    </g>
  )
}

const draw = stylex.keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } })
const appear = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

const INK = color.accent

const styles = stylex.create({
  sheet: { maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' },
  grid: { fill: 'none', stroke: color.accent, strokeOpacity: 0.09, strokeWidth: 1 },
  arrowHead: { fill: 'none', stroke: color.green, strokeWidth: 1.4, strokeLinejoin: 'round' },
  // Strokes start undrawn; the draw-in holds them drawn (forwards), per docs/working.md.
  body: { fill: 'none', stroke: INK, strokeWidth: 1.6, strokeDasharray: 1, strokeDashoffset: 1 },
  faint: { fill: 'none', stroke: INK, strokeOpacity: 0.45, strokeWidth: 1, strokeDasharray: 1, strokeDashoffset: 1 },
  faintBox: { fill: color.surface, stroke: INK, strokeOpacity: 0.45, strokeWidth: 1 },
  center: { fill: 'none', stroke: INK, strokeOpacity: 0.3, strokeWidth: 0.8, strokeDasharray: '6 3 1 3', opacity: 0 },
  draw: {
    animationName: draw,
    animationDuration: '0.9s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  show: {
    animationName: appear,
    animationDuration: '0.4s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  fadeIn: { opacity: 0 },
  wait: (delay: string) => ({ animationDelay: delay }),
  cap: {
    fill: color.surface,
    stroke: INK,
    strokeWidth: 1.4,
    opacity: 0,
    transitionProperty: 'fill',
    transitionDuration: '0.2s'
  },
  capOn: { fill: color.accentSoft },
  finger: { fill: color.accent, fillOpacity: 0.35, stroke: color.accent, strokeWidth: 1 },
  note: { fontFamily: font.mono, fontSize: '10px', fill: INK, fillOpacity: 0.6, opacity: 0 },
  vertical: { transformBox: 'fill-box', transformOrigin: 'center', transform: 'rotate(-90deg)' },
  screenType: { fontFamily: font.mono, fontSize: '11px', fill: color.text3 },
  screenValue: { fontFamily: font.mono, fontSize: '14px', fontWeight: 400, fill: color.text },
  // A card under the readout so the wireframe's lines never run through the numbers.
  plate: { fill: color.surface, fillOpacity: 0.88, stroke: INK, strokeOpacity: 0.25, strokeWidth: 1 },
  lead: { fill: 'none', strokeWidth: 1.3, strokeDasharray: 1, strokeDashoffset: 1 },
  dashed: { strokeDasharray: '3 3', strokeDashoffset: 0, opacity: 0 },
  taken: { stroke: color.accent },
  heard: { stroke: color.orange },
  state: { stroke: color.green },
  takenFill: { fill: color.accent },
  heardFill: { fill: color.orange },
  stateFill: { fill: color.green },
  packet: {},
  ring: { fill: 'none', strokeWidth: 1.5 },
  tile: {
    fill: color.surface,
    stroke: INK,
    strokeOpacity: 0.45,
    strokeWidth: 1,
    transitionProperty: 'fill',
    transitionDuration: '0.25s'
  },
  tileOn: { fill: color.accent, strokeOpacity: 0 },
  glyph: {
    fill: 'none',
    stroke: INK,
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    transitionProperty: 'stroke',
    transitionDuration: '0.25s'
  },
  glyphOn: { stroke: color.onAccent },
  wire: { fill: 'none', stroke: INK, strokeWidth: 1.2, strokeLinejoin: 'round' },
  wireFaint: { strokeOpacity: 0.4, strokeWidth: 1 },
  wireFront: { strokeWidth: 1.6, fill: color.accentSoft },
  tiny: { fontFamily: font.mono, fontSize: '9px', fill: color.text3 },
  label: { cursor: 'pointer', outlineStyle: 'none' },
  tag: { fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' },
  name: {
    fontFamily: font.mono,
    fontSize: '13px',
    fontWeight: 500,
    fill: color.text2,
    transitionProperty: 'fill',
    transitionDuration: '0.2s'
  },
  nameOn: { fill: color.text },
  picks: { flexWrap: 'wrap', gap: '8px' },
  pick: { minWidth: 0, fontFamily: font.mono, fontSize: '13px' },
  off: { backgroundColor: { default: color.well, ':hover': color.border }, color: color.text }
})
