// The platform page's hero: Duo taken apart, twice over. On the left the
// stack, one plate per layer, the trust line drawn through it. On the right
// the real phone, rendered by the shell, pulled into the same six layers: the
// window, the chassis, the displays, the sandbox, the app, the kit. Picking
// either side picks both.
import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAutoplay } from '../blog/autoplay'
import { diagram } from '../blog/diagram'
import { LAYERS, type Layer } from '../blog/layers'
import { Cap, Headline, Lede } from '../home/parts'
import { Button } from '../layout'
import { color, ease, font, radius } from '../tokens.stylex'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
const STILL = '@media (prefers-reduced-motion: reduce)'

const APP = 4
// The page's own words for each layer. The blog's figure names the stack it is
// built on; this page is for anyone, so it says what each layer is for.
const PLAIN = [
  'the frame it lives in',
  'the body you can turn',
  'a home screen on each display',
  'the guard at the door',
  "a stranger's code, walled off",
  'what an app is given'
]
// What opens beside a layer once it is clicked: three plain facts, still no technology names.
const FACTS: [string, string][][] = [
  [
    ['Where', 'a desktop window or a browser tab'],
    ['Looks', 'no frame, see-through'],
    ['Knows', 'which computer it is on']
  ],
  [
    ['Drawn', 'a real 3D phone, live'],
    ['Moves', 'fold it, turn it, press its buttons'],
    ['Screens', 'both displays, painted on the glass']
  ],
  [
    ['Copies', 'two, one for each display'],
    ['Holds', 'the home grid and Control Center'],
    ['Built in', 'Camera, Clock and the rest']
  ],
  [
    ['Checks', 'every app before it opens'],
    ['Keeps', "each app's data apart"],
    ['Talks', 'through one port, nothing else']
  ],
  [
    ['Is', 'one file, everything inside it'],
    ['Cannot', 'reach the internet or the page'],
    ['Runs', 'twice, once per display']
  ],
  [
    ['Knows', 'the hinge angle, which display'],
    ['Hears', 'the buttons and the sensors'],
    ['Looks', 'iOS parts that already fold']
  ]
]

const NARROW = '(max-width: 734px)'
const listen = (cb: () => void) => {
  const m = matchMedia(NARROW)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
/** Whether the two drawings stack: the zoom lands somewhere else when they do. */
const useNarrow = () =>
  useSyncExternalStore(
    listen,
    () => matchMedia(NARROW).matches,
    () => false
  )

// One projection for both drawings: a plane seen from 24 degrees, flatter than
// true isometric so six plates fit a hero without towering.
const C = Math.cos((24 * Math.PI) / 180)
const S = Math.sin((24 * Math.PI) / 180)
type Pt = readonly [number, number]
type Proj = (x: number, y: number) => Pt
const at =
  (ox: number, oy: number): Proj =>
  (x, y) => [ox + (x - y) * C, oy + (x + y) * S]

/** A rounded rectangle on the plane, centred at (cx, cy), as points to project. */
function round(cx: number, cy: number, w: number, h: number, r: number): Pt[] {
  const pts: Pt[] = []
  const corners: [number, number, number][] = [
    [cx + w / 2 - r, cy - h / 2 + r, -90],
    [cx + w / 2 - r, cy + h / 2 - r, 0],
    [cx - w / 2 + r, cy + h / 2 - r, 90],
    [cx - w / 2 + r, cy - h / 2 + r, 180]
  ]
  for (const [x, y, a0] of corners)
    for (let k = 0; k <= 6; k++) {
      const a = ((a0 + k * 15) * Math.PI) / 180
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r])
    }
  return pts
}
/** A closed outline, projected; `dy` drops it by a slab's thickness. */
const shape = (p: Proj, pts: Pt[], dy = 0) =>
  `M${pts
    .map(([x, y]) => p(x, y))
    .map(([x, y]) => `${x.toFixed(1)},${(y + dy).toFixed(1)}`)
    .join('L')}Z`

export function Architecture() {
  const [pick, setPick] = useState(APP)
  const auto = useAutoplay<HTMLElement>((t) => setPick((Math.floor(t / 3.2) + APP) % LAYERS.length))
  const box = useRef<HTMLDivElement>(null)
  const open = useInView(box, { once: true, amount: 0.3 })
  // Hover previews a layer on both sides and dims the rest; a click keeps it.
  const [hover, setHover] = useState<number | null>(null)
  const choose = (i: number) => {
    auto.stop()
    setPick(i)
  }
  const point = (i: number | null) => {
    if (i !== null) auto.stop()
    setHover(i)
  }
  // A click opens a layer: it comes forward, the rest scatter, and its facts come in beside it.
  const [zoom, setZoom] = useState<number | null>(null)
  const enter = (i: number) => {
    choose(i)
    setHover(null)
    setZoom(i)
  }
  useEffect(() => {
    if (zoom === null) return
    const out = (e: PointerEvent) => {
      if (!(e.target as Element).closest('[data-layer]')) setZoom(null)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null)
      const step =
        e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
      if (step) {
        e.preventDefault()
        enter((zoom + step + LAYERS.length) % LAYERS.length)
      }
    }
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', out)
      document.removeEventListener('keydown', key)
    }
  })
  const shown = zoom ?? hover ?? pick
  const sides = { pick: shown, dim: zoom === null && hover !== null, zoom, open, onPick: enter, onHover: point }
  return (
    <section {...stylex.props(styles.hero)} aria-labelledby="arch-title">
      <div {...stylex.props(styles.inner)}>
        <div {...stylex.props(styles.head)}>
          <div>
            <Cap>Platform · SDK · UI kit</Cap>
            <Headline as="h1" id="arch-title" lines={['Duo,', 'taken apart.']} />
          </div>
          <div>
            <Lede>Six layers. Hover to find one, click to open it.</Lede>
            <div {...stylex.props(styles.actions)}>
              <Button href="#kit">The UI kit</Button>
              <Button href="#sdk" outline>
                The SDK
              </Button>
            </div>
          </div>
        </div>
        <figure ref={auto.ref} {...stylex.props(styles.figure)}>
          <div ref={box} {...stylex.props(styles.panels)}>
            <div {...stylex.props(styles.panel, styles.back, zoom !== null && styles.aside)}>
              <p {...stylex.props(styles.caption)}>The stack</p>
              <Stack {...sides} />
            </div>
            <div {...stylex.props(styles.panel)}>
              <p {...stylex.props(styles.caption, styles.back, zoom !== null && styles.away)}>The phone, in parts</p>
              <Phone {...sides} />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {zoom !== null && (
              <Detail key={zoom} i={zoom} onStep={(d) => enter((zoom + d + LAYERS.length) % LAYERS.length)} />
            )}
          </AnimatePresence>
        </figure>
      </div>
    </section>
  )
}

const rise = (d: number) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.35 + d * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
  },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18 } }
})

/** The opened layer's page: what it is, whose it is, three facts, and a way to the next one. */
function Detail({ i, onStep }: { i: number; onStep: (d: number) => void }) {
  const l = LAYERS[i] as Layer
  const own = l.trust !== 'sandboxed'
  return (
    <motion.div data-layer="" role="region" aria-live="polite" aria-label={l.name} {...stylex.props(styles.detail)}>
      <motion.p {...rise(0)} {...stylex.props(styles.count)}>
        {String(i + 1).padStart(2, '0')} / {String(LAYERS.length).padStart(2, '0')}
        <span {...stylex.props(styles.trust, own ? styles.trustOwn : styles.trustApp)}>
          {own ? "Duo's own" : 'walled off'}
        </span>
      </motion.p>
      <motion.h3 {...rise(1)} {...stylex.props(styles.name)}>
        {l.name}
      </motion.h3>
      <motion.p {...rise(2)} {...stylex.props(styles.plain)}>
        {PLAIN[i]}
      </motion.p>
      <dl {...stylex.props(styles.facts)}>
        {(FACTS[i] as [string, string][]).map(([k, v], n) => (
          <motion.div key={k} {...rise(3 + n)} {...stylex.props(styles.fact)}>
            <dt {...stylex.props(styles.factKey)}>{k}</dt>
            <dd {...stylex.props(styles.factValue)}>{v}</dd>
          </motion.div>
        ))}
      </dl>
      <motion.div {...rise(6)} {...stylex.props(styles.steps)}>
        <button type="button" aria-label="Layer below" onClick={() => onStep(-1)} {...stylex.props(styles.step)}>
          ↓
        </button>
        <button type="button" aria-label="Layer above" onClick={() => onStep(1)} {...stylex.props(styles.step)}>
          ↑
        </button>
        <span {...stylex.props(styles.hint)}>click outside or Esc to close</span>
      </motion.div>
    </motion.div>
  )
}

type Props = {
  pick: number
  /** The opened layer, if one is. */
  zoom: number | null
  /** A layer is under the pointer: the others step back. */
  dim: boolean
  open: boolean
  onPick: (i: number) => void
  onHover: (i: number | null) => void
}

/** A layer as something to press: the plate or the part is the control. */
function Plate({
  i,
  pick,
  dim,
  onPick,
  onHover,
  zoom,
  lift,
  scatter = false,
  children
}: Omit<Props, 'open'> & { i: number; lift: number; scatter?: boolean; children: ReactNode }) {
  const hover = (n: number | null) => zoom === null && onHover(n)
  return (
    // biome-ignore lint/a11y/useSemanticElements: an svg plate cannot be a <button>.
    <g
      role="button"
      tabIndex={0}
      aria-pressed={i === pick}
      aria-label={(LAYERS[i] as Layer).name}
      onClick={() => onPick(i)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(i)}
      data-layer=""
      onPointerEnter={() => hover(i)}
      onPointerLeave={() => hover(null)}
      onFocus={() => hover(i)}
      onBlur={() => hover(null)}
      {...stylex.props(
        styles.plate,
        styles.lift(`translateY(${-lift}px)`, `${i * 0.06}s, 0s`),
        dim && i !== pick && styles.dim,
        scatter && zoom !== null && i !== zoom && styles.away,
        zoom === i && styles.opened
      )}
    >
      {children}
    </g>
  )
}

// Both drawings share a floor and a gap, and their viewBoxes are sized to their columns so
// one unit is the same on screen: a plate sits level with its part.
const GAP = 62

// The stack, in viewBox units.
const SX = 190
const SY = 392
const SIDE = 124
const SIDE_H = SIDE * S
const BX = 30

/** The abstract stack: square plates, the trust brackets, the one port through the line. */
function Stack({ open, ...side }: Props) {
  const { pick } = side
  const p = at(SX, SY)
  const sq = round(0, 0, SIDE, SIDE, 6)
  // Closed, the plates gather at the middle of the pull, where the phone sits closed.
  const y = (i: number) => (open ? SY - i * GAP : SY - 2.5 * GAP - (i - 2.5) * 8)
  const line = (y(3) + y(4)) / 2
  return (
    <svg
      viewBox={`0 0 ${Math.round(355 * K)} ${H + PULL}`}
      role="img"
      aria-label={`Duo's six layers, ${(LAYERS[pick] as Layer).name} chosen`}
    >
      <g transform={`translate(0 ${TY}) scale(${K})`}>
        {LAYERS.map((l, i) => {
          const on = i === pick
          const app = l.trust === 'sandboxed'
          return (
            <Plate key={l.name} i={i} {...side} lift={SY - y(i)}>
              <path d={shape(p, sq, 7)} {...stylex.props(styles.side, app && styles.sideApp, on && styles.sideOn)} />
              <path d={shape(p, sq)} {...stylex.props(styles.top, app && styles.topApp, on && styles.topOn)} />
              <text x={SX} y={SY + 5} textAnchor="middle" {...stylex.props(styles.plateName, on && styles.plateNameOn)}>
                {l.name}
              </text>
            </Plate>
          )
        })}
        <g {...stylex.props(styles.fade, open && styles.shown)}>
          <path d={`M${BX + 6} ${y(0) + SIDE_H + 7}H${BX}V${line + 5}H${BX + 6}`} {...stylex.props(styles.bracket)} />
          <path
            d={`M${BX + 6} ${line - 5}H${BX}V${y(5) - SIDE_H}H${BX + 6}`}
            {...stylex.props(styles.bracket, styles.bracketApp)}
          />
          <text
            x={BX - 10}
            y={(y(0) + SIDE_H + 7 + line) / 2}
            textAnchor="middle"
            {...stylex.props(diagram.svgText, styles.vertical, styles.duo)}
          >
            Duo
          </text>
          <text
            x={BX - 10}
            y={(line + y(5) - SIDE_H) / 2}
            textAnchor="middle"
            {...stylex.props(diagram.svgText, styles.vertical, styles.stranger)}
          >
            a stranger's app
          </text>
          <line x1={BX - 6} x2={BX + 14} y1={line} y2={line} {...stylex.props(styles.boundary)} />
          {/* The one way down: messages on a single port, App to Runtime and back. */}
          <line x1={SX + 76} x2={SX + 76} y1={y(4)} y2={y(3)} {...stylex.props(styles.port)} />
          <circle cx={SX + 76} cy={y(4)} r="4" {...stylex.props(styles.packet)} />
          <text x={SX + 84} y={line + 4} {...stylex.props(diagram.svgText, styles.portText)}>
            one port
          </text>
        </g>
      </g>
    </svg>
  )
}

// The phone, in the renders' pixels. Each layer is a still of the real shell
// (scripts/capture-layers.sh): the scene's own chassis, SpringBoard and a
// running Clock, and the window, sandbox and kit drawn onto the same panel,
// all from one camera. Stacked flat they are the phone; pulled up they are
// its parts.
const W = 1193
const H = 524
const LIFT = 150
const LX = W + 44
const PULL = LIFT * 5
/** A plate's centre on the phone's scale: the middle of its display, which is where each leader leaves. */
const ROW = 246
// The stack is drawn in its own units, then scaled so its gap is the phone's
// and shifted so plate i sits level with layer i. The grid columns keep the
// two viewBoxes' widths in proportion, so both render at one scale.
const K = LIFT / GAP
const TY = PULL + ROW - K * SY
const FILES = ['window', 'shell', 'os', 'runtime', 'app', 'sdk'] as const
/** Where each layer's leader starts: its rightmost pixel, from the capture. */
const EDGE: Pt[] = [
  [1189, 258],
  [1108, 251],
  [1086, 244],
  [1064, 241],
  [1086, 244],
  [1086, 241]
]
/** Each layer's outline as its four extreme pixels, as matte-layers.py prints them: the area that answers the pointer. */
const HIT: Pt[][] = [
  [
    [4, 194],
    [786, 4],
    [1189, 258],
    [302, 520]
  ],
  [
    [75, 213],
    [766, 32],
    [1108, 251],
    [336, 496]
  ],
  [
    [95, 208],
    [762, 38],
    [1086, 244],
    [343, 459]
  ],
  [
    [116, 209],
    [769, 46],
    [1064, 241],
    [346, 446]
  ],
  [
    [95, 208],
    [762, 38],
    [1086, 244],
    [343, 459]
  ],
  [
    [95, 207],
    [770, 38],
    [1086, 241],
    [339, 459]
  ]
]
/** Drawn, not rendered: stacked flat these three would only veil the phone, so they come in with the pull. */
const DRAWN = new Set([0, 3, 5])

/**
 * The real phone, split along its screen's normal, each layer labelled from its
 * right edge. A layer answers over its own outline and its label; drawn bottom
 * up, the one on top wins where two overlap, as it does to the eye.
 */
function Phone({ open, ...side }: Props) {
  const { pick, zoom } = side
  const narrow = useNarrow()
  const top = PULL
  // Closed, every layer sits at the middle of the pull, so the phone is centred until it opens.
  const y = (i: number) => (open ? top - i * LIFT : top / 2)
  // Opened, a layer grows into the space the stack left, its right edge short of the facts;
  // on a phone it centres in its own column and the facts come in under it.
  const s = narrow ? 1.3 : 1.35
  const cx = narrow ? (LX + 370) / 2 : -60
  const focus = `translate(${cx - (W * s) / 2}px, ${(H + top - H * s) / 2}px) scale(${s})`
  // The rest scatter away from it, up or down, as they fade.
  const move = (i: number) =>
    zoom === null
      ? `translateY(${y(i)}px)`
      : i === zoom
        ? focus
        : `translateY(${y(i) + (i > zoom ? -1 : 1) * LIFT * 1.5}px)`
  return (
    <svg
      {...stylex.props(styles.stage)}
      viewBox={`0 0 ${LX + 370} ${H + top}`}
      role="img"
      aria-label={`The Duo in six layers, ${(LAYERS[pick] as Layer).name} chosen`}
    >
      {LAYERS.map((l, i) => {
        const on = i === pick
        const [ex, ey] = EDGE[i] as Pt
        return (
          <Plate key={l.name} i={i} {...side} lift={0} scatter>
            <g
              {...stylex.props(
                styles.layer,
                zoom !== null && styles.zooming,
                styles.move(move(i), zoom === null ? `${i * 0.07}s` : '0s')
              )}
            >
              <image
                href={`/platform/${FILES[i]}.webp`}
                width={W}
                height={H}
                {...stylex.props(styles.shot, DRAWN.has(i) && !open && styles.hidden)}
              />
              {open && <path d={`M${(HIT[i] as Pt[]).join('L')}Z`} {...stylex.props(styles.hit)} />}
              <g {...stylex.props(styles.fade, zoom !== null && styles.quick, open && zoom === null && styles.shown)}>
                <path d={`M${ex + 12} ${ey}H${LX - 14}`} {...stylex.props(styles.leader, on && styles.leaderOn)} />
                <circle cx={ex + 12} cy={ey} r="5" {...stylex.props(styles.dot, on && styles.dotOn)} />
                <text x={LX} y={ey - 2} {...stylex.props(styles.label, on && styles.labelOn)}>
                  {l.name}
                </text>
                <text x={LX} y={ey + 36} {...stylex.props(styles.note)}>
                  {PLAIN[i]}
                </text>
              </g>
            </g>
          </Plate>
        )
      })}
    </svg>
  )
}

/**
 * How the page is made, not just what is in it: the four rules every pixel on
 * Duo answers to, from DESIGN.md. Each is a door into the guidelines.
 */
// A message down to the host and its reply back up, on the one port: one gap apart.
const travel = stylex.keyframes({
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: `translateY(${GAP}px)` }
})

const styles = stylex.create({
  hero: {
    paddingTop: { default: '96px', [MID]: '72px', [SMALL]: '48px' },
    paddingBottom: { default: '48px', [SMALL]: '32px' },
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  inner: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: { default: '40px', [SMALL]: '16px' },
    paddingRight: { default: '40px', [SMALL]: '16px' }
  },
  head: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) minmax(0, 1fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'end',
    gap: { default: '64px', [MID]: '8px' }
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '28px' },
  figure: {
    position: 'relative',
    marginTop: { default: '56px', [SMALL]: '36px' },
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    padding: 0
  },
  panels: {
    display: 'grid',
    // The two viewBox widths, 355 × K and LX + 370: one unit is the same size in both columns.
    gridTemplateColumns: { default: 'minmax(0, 859fr) minmax(0, 1607fr)', [SMALL]: 'minmax(0, 1fr)' },
    gap: { default: '24px', [SMALL]: '8px' }
  },
  panel: { minWidth: 0 },
  // The phone may grow past its own column when a layer opens.
  stage: { overflow: 'visible' },
  back: { transitionProperty: 'opacity', transitionDuration: '0.5s', transitionTimingFunction: ease.out },
  away: { opacity: 0, pointerEvents: 'none' },
  // The stack makes room for the opened layer; on a phone it stays, as the way between layers.
  aside: { opacity: { default: 0, [SMALL]: 1 }, pointerEvents: { default: 'none', [SMALL]: 'auto' } },
  // Labels leave at once when a layer opens, not after the pull's delay.
  quick: { transitionDelay: '0s', transitionDuration: '0.2s' },
  opened: { cursor: 'default' },
  zooming: {
    transitionDuration: { default: '0.9s', [STILL]: '0s' },
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
  },
  detail: {
    position: { default: 'absolute', [SMALL]: 'static' },
    top: '50%',
    right: 0,
    width: { default: '31%', [SMALL]: 'auto' },
    transform: { default: 'translateY(-50%)', [SMALL]: 'none' },
    marginTop: { default: 0, [SMALL]: '16px' }
  },
  count: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.08em',
    color: color.text3
  },
  trust: {
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radius.pill,
    fontSize: '11px',
    textTransform: 'uppercase'
  },
  trustOwn: { color: color.green, backgroundColor: color.greenBg },
  trustApp: { color: color.accent, backgroundColor: color.accentSoft },
  name: {
    marginTop: '14px',
    marginBottom: 0,
    fontFamily: font.display,
    fontSize: { default: '56px', [MID]: '40px', [SMALL]: '34px' },
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    color: color.orange
  },
  plain: { marginTop: '10px', marginBottom: 0, fontSize: '19px', lineHeight: 1.4, color: color.text2 },
  facts: { marginTop: '28px', marginBottom: 0 },
  fact: {
    display: 'grid',
    gridTemplateColumns: '84px minmax(0, 1fr)',
    gap: '12px',
    paddingTop: '12px',
    paddingBottom: '12px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  factKey: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3,
    paddingTop: '3px'
  },
  factValue: { margin: 0, fontSize: '16px', lineHeight: 1.4, color: color.text },
  steps: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' },
  step: {
    width: '36px',
    height: '36px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': color.well },
    color: color.text,
    fontSize: '15px',
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  hint: { marginLeft: '8px', fontFamily: font.mono, fontSize: '11px', color: color.text3 },
  caption: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  plate: {
    cursor: 'pointer',
    outlineStyle: 'none',
    transitionProperty: 'transform, opacity',
    transitionDuration: { default: '1.1s, 0.25s', [STILL]: '0s' },
    transitionTimingFunction: ease.out
  },
  // Stepped back, not gone: the layer under the pointer reads against the rest.
  dim: { opacity: 0.5 },
  lift: (transform: string, delay: string) => ({ transform, transitionDelay: delay }),
  top: {
    fill: color.well,
    stroke: color.borderStrong,
    strokeWidth: 1.2,
    strokeLinejoin: 'round',
    transitionProperty: 'fill, stroke',
    transitionDuration: '0.3s'
  },
  // Mixed onto the card, not left translucent: a see-through plate muddies every one under it.
  topApp: { fill: `color-mix(in srgb, ${color.accent} 16%, ${color.bg})`, stroke: color.accent },
  topOn: { fill: `color-mix(in srgb, ${color.orange} 14%, ${color.bg})`, stroke: color.orange, strokeWidth: 2 },
  side: { fill: color.border, transitionProperty: 'fill', transitionDuration: '0.3s' },
  sideApp: { fill: color.accent, opacity: 0.45 },
  sideOn: { fill: color.orange, opacity: 0.45 },
  plateName: { fontFamily: font.sans, fontSize: '13px', fontWeight: 600, fill: color.text2, pointerEvents: 'none' },
  plateNameOn: { fill: color.text },
  leader: { fill: 'none', stroke: color.borderStrong, strokeWidth: 2, strokeDasharray: '4 6' },
  leaderOn: { stroke: color.orange },
  layer: {
    transitionProperty: 'transform',
    transitionDuration: { default: '1.3s', [STILL]: '0s' },
    transitionTimingFunction: ease.out
  },
  move: (transform: string, delay: string) => ({ transform, transitionDelay: delay }),
  shot: {
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: { default: '0.4s', [STILL]: '0s' }
  },
  hidden: { opacity: 0 },
  hit: { fill: 'transparent' },
  dot: { fill: color.borderStrong },
  dotOn: { fill: color.orange },
  label: { fontFamily: font.sans, fontSize: '34px', fontWeight: 600, fill: color.text2 },
  labelOn: { fill: color.orange },
  note: { fontFamily: font.sans, fontSize: '25px', fill: color.text3 },
  bracket: { fill: 'none', stroke: color.green, strokeWidth: 1.5 },
  bracketApp: { stroke: color.accent },
  vertical: { transformBox: 'fill-box', transformOrigin: 'center', transform: 'rotate(-90deg)' },
  duo: { fill: color.green },
  stranger: { fill: color.accent },
  boundary: { stroke: color.red, strokeWidth: 2 },
  port: { stroke: color.accent, strokeWidth: 1.5, strokeDasharray: '2 3' },
  portText: { fill: color.accent, fontSize: '10.5px' },
  packet: {
    fill: color.accent,
    animationName: { default: travel, [STILL]: 'none' },
    animationDuration: '1.8s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite'
  },
  fade: {
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: { default: '0.5s', [STILL]: '0s' },
    transitionDelay: '0.6s'
  },
  shown: { opacity: 1 }
})
