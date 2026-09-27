import * as stylex from '@stylexjs/stylex'
import { useInView, useReducedMotion } from 'motion/react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'
import { keyed, useAutoplay } from './autoplay'
import { diagram, Stat } from './diagram'

// Both displays at one scale, in mm (INNER and OUTER in packages/shell/main.ts).
const IW = 158
const IH = 111
const CW = 77.4
const CH = 112.5
/** Where the lead passes between the displays (HANDOVER in packages/shell/main.ts). */
const HANDOVER = 40
const APPS = [
  ['maps', 'photos', 'notes', 'music', 'mail', 'calendar', 'safari', 'clock'],
  ['weather', 'reminders', 'stocks', 'books', 'podcasts', 'news', 'contacts', 'settings']
]
const LOOP: [number, number][] = [
  [0, 180],
  [1.6, 180],
  [4.2, 12],
  [6, 12],
  [8.6, 180]
]
const FETCH_EVERY = 0.7

const pct = (v: number) => `${v}%`

/**
 * The inner grid: eight columns, 4 + a seam + 4, off the hinge. The cover is
 * this same element cropped to its left four columns, so a fold moves nothing
 * already on screen. The trip is the app: one shared value both copies draw.
 */
function Screen({ trip, clock }: { trip: number; clock: string }) {
  return (
    <div {...stylex.props(styles.screen)}>
      {APPS.map((row, r) =>
        row.map((a, c) => (
          <img
            key={a}
            src={`/icons/${a}.webp`}
            alt=""
            width={48}
            height={48}
            {...stylex.props(styles.icon, styles.at(pct(6 + c * 10.6 + (c > 3 ? 3.2 : 0)), pct(8 + r * 22)))}
          />
        ))
      )}
      <div {...stylex.props(styles.app)}>
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true" {...stylex.props(styles.route)}>
          <path d="M2 16 C 20 2, 35 18, 50 10 S 80 2, 98 12" {...stylex.props(styles.path)} />
        </svg>
        <span {...stylex.props(styles.car, styles.along(`${2 + trip * 92}%`))} />
        <span {...stylex.props(styles.eta)}>{clock}</span>
      </div>
    </div>
  )
}

/**
 * The OS, running twice (packages/shell/main.ts). Both copies draw the same
 * trip from one store; only the display in use runs it, so only it fetches.
 * Cross 40 degrees and the lead passes: the mirror flag follows the pose.
 */
export function TwinOS() {
  const [deg, setDeg] = useState(180)
  const [now, setNow] = useState(0)
  const fetches = useRef<{ id: number; on: 'inner' | 'cover' }[]>([])
  const last = useRef(0)
  const auto = useAutoplay<HTMLDivElement>((t) => setDeg(keyed(t, LOOP)))

  const lead: 'inner' | 'cover' = deg > HANDOVER ? 'inner' : 'cover'
  // The shared store's clock ticks on the running copy's timer, whichever that is.
  useClock(auto.ref, setNow)
  if (now - last.current >= FETCH_EVERY) {
    last.current = now
    fetches.current = [...fetches.current, { id: Math.round(now * 10), on: lead }].slice(-6)
  }
  const trip = (now % 12) / 12
  const clock = `${Math.max(1, 12 - Math.floor(now % 12))} min`

  const lane = (on: 'inner' | 'cover') => (
    <div {...stylex.props(styles.lane)} aria-hidden="true">
      {lead === on ? (
        fetches.current
          .filter((f) => f.on === on)
          .map((f) => (
            <span key={f.id} {...stylex.props(styles.packet)}>
              fetch
            </span>
          ))
      ) : (
        <span {...stylex.props(styles.gated)}>gated</span>
      )}
    </div>
  )

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={auto.ref} {...stylex.props(styles.stage)}>
        <div {...stylex.props(styles.col, styles.grow(IW))}>
          {lane('inner')}
          <div {...stylex.props(styles.display, styles.ratio(IW, IH), lead === 'inner' && styles.leading)}>
            <Screen trip={trip} clock={clock} />
          </div>
          <code {...stylex.props(styles.flag, lead === 'inner' && styles.flagOn)}>
            inner · os.mirror = {String(lead !== 'inner')}
          </code>
        </div>
        <div {...stylex.props(styles.col, styles.grow(CW))}>
          {lane('cover')}
          <div {...stylex.props(styles.display, styles.ratio(CW, CH), lead === 'cover' && styles.leading)}>
            {/* The inner layout at the inner width, cropped: the left four columns and the same wallpaper. */}
            <div {...stylex.props(styles.crop, styles.cropWidth(`${(IW / CW) * 100}%`))}>
              <Screen trip={trip} clock={clock} />
            </div>
            <span {...stylex.props(styles.edge)} />
          </div>
          <code {...stylex.props(styles.flag, lead === 'cover' && styles.flagOn)}>
            cover · os.mirror = {String(lead !== 'cover')}
          </code>
        </div>
      </div>
      <div {...stylex.props(diagram.controls)}>
        <button
          type="button"
          onClick={() => (auto.on ? auto.stop() : auto.play())}
          aria-pressed={auto.on}
          {...stylex.props(diagram.button)}
        >
          {auto.on ? 'Pause' : 'Fold it'}
        </button>
        <div {...stylex.props(styles.track)}>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={Math.round(deg)}
            onChange={(e) => {
              auto.stop()
              setDeg(Number(e.target.value))
            }}
            aria-label="Hinge angle"
            {...stylex.props(diagram.range, styles.range)}
          />
          <span {...stylex.props(styles.tick)}>40° handover</span>
        </div>
        <output {...stylex.props(diagram.deg)}>{Math.round(deg)}°</output>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Lead display" value={lead === 'inner' ? 'Inner' : 'Cover'} />
        <Stat label="Running copy" value={lead === 'inner' ? 'Inner' : 'Cover'} />
        <Stat label="Mirror copy" value={lead === 'inner' ? 'Cover' : 'Inner'} />
        <Stat label="Fetches from" value={lead === 'inner' ? 'Inner only' : 'Cover only'} />
      </dl>
      <figcaption {...stylex.props(diagram.caption)}>
        Both copies draw the same trip. Only the display in your hand fetches. Cross 40° and they swap roles; nothing on
        screen moves.
      </figcaption>
    </figure>
  )
}

/** The trip's clock: it runs while the figure is on screen, touched or not, so a held pose still shows a live app. */
function useClock(ref: RefObject<Element | null>, set: (s: number) => void) {
  const seen = useInView(ref)
  const still = useReducedMotion()
  useEffect(() => {
    if (!seen || still) return
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      set((now - start) / 1000)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [seen, still, set])
}

const rise = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(18px) scale(0.6)' },
  '25%': { opacity: 1, transform: 'translateY(8px) scale(1)' },
  to: { opacity: 0, transform: 'translateY(-26px) scale(1)' }
})

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  stage: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: { default: '28px', [SMALL]: '12px' },
    paddingLeft: { default: '12px', [SMALL]: '0' },
    paddingRight: { default: '12px', [SMALL]: '0' }
  },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', minWidth: 0 },
  grow: (w: number) => ({ flexGrow: w, flexBasis: 0 }),
  lane: { position: 'relative', width: '100%', height: '44px', display: 'flex', justifyContent: 'center' },
  packet: {
    position: 'absolute',
    bottom: 0,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    color: color.onAccent,
    fontFamily: font.mono,
    fontSize: '10px',
    opacity: 0,
    animationName: rise,
    animationDuration: '1.8s',
    animationTimingFunction: ease.out
  },
  gated: {
    alignSelf: 'flex-end',
    fontFamily: font.mono,
    fontSize: '10.5px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  display: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: color.text,
    borderRadius: radius.md,
    opacity: 0.5,
    filter: 'saturate(0.6)',
    transitionProperty: 'opacity, filter, box-shadow',
    transitionDuration: '0.4s',
    transitionTimingFunction: ease.out
  },
  ratio: (w: number, h: number) => ({ aspectRatio: `${w} / ${h}` }),
  leading: { opacity: 1, filter: 'saturate(1)', boxShadow: `0 0 0 3px ${color.accent}` },
  crop: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  cropWidth: (width: string) => ({ width }),
  // Where the crop ends: the other four columns live past it, on the inner display only.
  edge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '2px',
    backgroundImage: `repeating-linear-gradient(0deg, ${color.onAccent} 0 4px, transparent 4px 8px)`,
    opacity: 0.6
  },
  screen: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(155deg, ${color.accent}, ${color.rec} 70%, ${color.orange})`
  },
  icon: { position: 'absolute', width: '7.4%', height: 'auto', borderRadius: '22%' },
  at: (left: string, top: string) => ({ left, top }),
  // The app keeps to the left four columns, so the cover's crop holds all of it.
  app: {
    position: 'absolute',
    left: '4%',
    width: '42%',
    bottom: '7%',
    height: '30%',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.85)'
  },
  route: { position: 'absolute', left: '3%', right: '3%', top: '28%', width: '94%', height: '44%' },
  path: {
    fill: 'none',
    stroke: color.accent,
    strokeWidth: 2.5,
    strokeLinecap: 'round',
    vectorEffect: 'non-scaling-stroke'
  },
  car: {
    position: 'absolute',
    top: '44%',
    width: '10px',
    height: '10px',
    marginLeft: '-5px',
    borderRadius: '50%',
    backgroundColor: color.accent,
    boxShadow: '0 0 0 3px #fff'
  },
  along: (left: string) => ({ left }),
  eta: {
    position: 'absolute',
    left: '3%',
    top: '8%',
    fontFamily: font.sans,
    fontSize: { default: '12px', [SMALL]: '9px' },
    fontWeight: 600,
    color: '#1c1c1e'
  },
  flag: {
    fontFamily: font.mono,
    fontSize: { default: '12px', [SMALL]: '10px' },
    whiteSpace: { default: 'nowrap', [SMALL]: 'normal' },
    textAlign: 'center',
    color: color.text3,
    transitionProperty: 'color',
    transitionDuration: '0.3s'
  },
  flagOn: { color: color.accent },
  track: { position: 'relative', flexGrow: 1, minWidth: 0, display: 'flex', paddingBottom: '18px' },
  range: { width: '100%' },
  tick: {
    position: 'absolute',
    bottom: 0,
    left: `${(HANDOVER / 180) * 100}%`,
    transform: 'translateX(-50%)',
    fontFamily: font.mono,
    fontSize: '10.5px',
    whiteSpace: 'nowrap',
    color: color.text3
  }
})
