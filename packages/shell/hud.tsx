// The floating HUD under the device and the page chrome around it. main.ts
// owns the numbers (hinge angle, yaw, camera pose); this file only draws them
// and reports the controls back through `HudEvents`.

import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'

export type HudEvents = {
  angle: (deg: number) => void
  toggle: () => void
  flip: () => void
  home: () => void
  reset: () => void
}

type State = { target: number; yaw: number; hint: boolean; spin: boolean; away: boolean }

// A plain store rather than component state: main.ts calls `target()` before
// React has committed the first render, and reads `spinning()` every frame.
const createStore = (initial: State) => {
  let state = initial
  const subs = new Set<() => void>()
  return {
    get: () => state,
    set: (patch: Partial<State>) => {
      state = { ...state, ...patch }
      for (const f of subs) f()
    },
    subscribe: (f: () => void) => {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    }
  }
}
type Store = ReturnType<typeof createStore>

/**
 * Everything that changes every frame bypasses React: the elements are
 * collected through refs and mutated directly.
 */
type Live = {
  deg: number
  degEl: HTMLSpanElement | null
  rings: HTMLDivElement | null
  nucleus: HTMLDivElement | null
  electron: HTMLDivElement | null
  dist: HTMLDivElement | null
  cap: HTMLSpanElement | null
}
const readout = (deg: number) => `${Math.round(deg)}°`
/** Typographic minus, so "−42°" does not read as a hyphen. */
const signed = (deg: number) => {
  const n = Math.round(deg)
  return `${n < 0 ? '−' : ''}${Math.abs(n)}°`
}
/** Shortest signed distance from a multiple of 2π. */
const wrap = (rad: number) => Math.atan2(Math.sin(rad), Math.cos(rad))

/** The default pose main.ts homes to: camera at z = 40, level, in front. */
const HOME_DISTANCE = 40
/** Orbit-ring radius in the minimap, px. The tilt makes three ellipses read as one gimbal. */
const RING = 34
const RING_TILT = (75 * Math.PI) / 180

export function mountHud(events: HudEvents) {
  const store = createStore({ target: 180, yaw: 0, hint: true, spin: false, away: false })
  const live: Live = { deg: 180, degEl: null, rings: null, nucleus: null, electron: null, dist: null, cap: null }
  const web = document.documentElement.classList.contains('web')
  const container = document.body.appendChild(document.createElement('div'))
  createRoot(container).render(<Hud store={store} live={live} events={events} web={web} />)
  return {
    /** Live hinge angle, called every frame: update the readout without re-rendering (ref + textContent). */
    angle: (deg: number) => {
      live.deg = deg
      if (live.degEl) live.degEl.textContent = readout(deg)
    },
    /** Target angle: slider value, toggle's closed state and title. */
    target: (deg: number) => store.set({ target: deg }),
    /** Cumulative yaw in radians for the Flip icon's turn. */
    yaw: (rad: number) => store.set({ yaw: rad }),
    hideHint: () => store.set({ hint: false }),
    spinning: () => store.get().spin,
    /**
     * Camera pose, every frame after controls.update(). Drives the orbit
     * minimap through refs; React only hears about it when the view leaves or
     * returns to the default pose.
     */
    orbit: (azimuth: number, polar: number, distance: number, yaw: number) => {
      const tilt = polar - Math.PI / 2
      const away =
        Math.abs(azimuth) > 0.02 ||
        Math.abs(tilt) > 0.02 ||
        // Zooming in is for reading the screen, and the card would sit over it;
        // only zooming out counts as leaving the view.
        distance - HOME_DISTANCE > 0.5 ||
        Math.abs(wrap(yaw)) > 0.02
      if (away !== store.get().away) store.set({ away })
      // The rings are a gimbal fixed in the world; the world turns by the
      // inverse of the camera, so a drag to the right turns the rings right.
      if (live.rings) live.rings.style.transform = `rotateX(${tilt}rad) rotateY(${-azimuth}rad)`
      if (live.nucleus) live.nucleus.style.transform = `rotateY(${yaw}rad)`
      if (live.electron) {
        // The electron marks the phone's front on the tilted equator ring, then
        // takes the same world-to-view turn as the rings so it stays on them.
        const x0 = Math.sin(yaw) * RING
        const y0 = Math.cos(yaw) * Math.cos(RING_TILT) * RING
        const z0 = Math.cos(yaw) * Math.sin(RING_TILT) * RING
        const x1 = x0 * Math.cos(-azimuth) + z0 * Math.sin(-azimuth)
        const z1 = -x0 * Math.sin(-azimuth) + z0 * Math.cos(-azimuth)
        const y2 = y0 * Math.cos(tilt) - z1 * Math.sin(tilt)
        const z2 = y0 * Math.sin(tilt) + z1 * Math.cos(tilt)
        live.electron.style.transform = `translate3d(${x1}px, ${y2}px, ${z2}px)`
      }
      if (live.dist) {
        const r = Math.min(44, Math.max(22, (HOME_DISTANCE * 40) / distance))
        live.dist.style.transform = `scale(${r / 40})`
      }
      if (live.cap) {
        const az = (azimuth * 180) / Math.PI
        const el = -(tilt * 180) / Math.PI
        live.cap.textContent = `${signed(az)} · ${signed(el)}`
      }
    }
  }
}

function Hud({ store, live, events, web }: { store: Store; live: Live; events: HudEvents; web: boolean }) {
  const s = useSyncExternalStore(store.subscribe, store.get)
  const closed = s.target <= 90
  return (
    <div {...stylex.props(styles.ui)}>
      {web && (
        <>
          <h1 {...stylex.props(styles.h1)}>iPhone Duo</h1>
          <p {...stylex.props(styles.p)}>7.6″ inner display. 5.4″ outer. Grade&nbsp;5 titanium.</p>
          <div {...stylex.props(styles.hint, !s.hint && styles.hintHidden)}>
            Tap the screen to use it · Press the buttons on the frame · Drag outside to orbit · Wheel to zoom
          </div>
        </>
      )}
      {/* The HUD floats under the device; its padding drags the frameless window. */}
      <div {...stylex.props(styles.liquid, styles.hud)} data-tauri-drag-region="">
        <label {...stylex.props(styles.child, styles.label)} title="Hinge angle">
          <svg {...stylex.props(styles.svg)} viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 16 L10 4 L17 16" />
            <path d="M6.4 16 A6 6 0 0 0 13.6 16" opacity="0.6" />
          </svg>
          <input
            {...stylex.props(styles.range, styles.fill(s.target / 1.8))}
            type="range"
            min="0"
            max="180"
            step="1"
            value={Math.round(s.target)}
            onChange={(e) => events.angle(Number(e.currentTarget.value))}
            aria-label="Hinge angle"
          />
          <span
            {...stylex.props(styles.deg)}
            ref={(el) => {
              live.degEl = el
              if (el) el.textContent = readout(live.deg)
            }}
          />
        </label>
        <span {...stylex.props(styles.child, styles.sep)} />
        <button
          type="button"
          {...stylex.props(styles.child, styles.button)}
          title={closed ? 'Open' : 'Close'}
          onClick={events.toggle}
        >
          <svg {...stylex.props(styles.svg)} viewBox="0 0 20 20" aria-hidden="true">
            <rect x="2.5" y="4" width="7.5" height="12" rx="2" />
            <rect
              {...stylex.props(styles.lid, closed && styles.lidClosed)}
              x="10"
              y="4"
              width="7.5"
              height="12"
              rx="2"
            />
            <path d="M10 3 V17" opacity="0.5" />
          </svg>
        </button>
        <button type="button" {...stylex.props(styles.child, styles.button)} title="Flip" onClick={events.flip}>
          <svg {...stylex.props(styles.svg, styles.turn(s.yaw))} viewBox="0 0 20 20" aria-hidden="true">
            <path d="M15.5 6.5 A6.5 6.5 0 0 0 4 8.2" />
            <path d="M4 4.5 V8.5 H8" />
            <path d="M4.5 13.5 A6.5 6.5 0 0 0 16 11.8" />
            <path d="M16 15.5 V11.5 H12" />
          </svg>
        </button>
        <HomeButton onClick={events.home} />
        <button
          type="button"
          {...stylex.props(styles.child, styles.button, !s.away && styles.buttonOff)}
          title="Reset view"
          disabled={!s.away}
          onClick={events.reset}
        >
          <svg {...stylex.props(styles.svg)} viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4.4 8.4 A6 6 0 1 0 7.9 4.9" />
            <path d="M11.7 6.3 L7.9 4.9 L9.9 1.4" />
          </svg>
        </button>
        <span {...stylex.props(styles.child, styles.sep)} />
        <label {...stylex.props(styles.child, styles.label)} title="Auto-rotate">
          <input
            {...stylex.props(styles.checkbox, s.spin && styles.checkboxOn)}
            type="checkbox"
            checked={s.spin}
            onChange={(e) => store.set({ spin: e.currentTarget.checked })}
            aria-label="Auto-rotate"
          />
          <svg
            {...stylex.props(styles.svg, styles.orbit, s.spin && styles.orbiting)}
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <ellipse cx="10" cy="10" rx="8" ry="3.2" transform="rotate(-25 10 10)" />
            <circle cx="10" cy="10" r="2.4" fill="currentColor" stroke="none" />
            <circle cx="3.2" cy="13.4" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </label>
      </div>
      <Minimap live={live} on={s.away} onReset={events.reset} />
    </div>
  )
}

/**
 * The orbit minimap: an atom whose rings are the world's gimbal seen from the
 * camera, a nucleus that is the phone (turns with yaw), an electron marking
 * the phone's front, and a dashed circle that grows as the camera comes closer.
 * Shown only while the view is off its default pose; clicking it resets.
 */
function Minimap({ live, on, onReset }: { live: Live; on: boolean; onReset: () => void }) {
  return (
    <div
      {...stylex.props(styles.liquid, styles.card, on && styles.cardOn)}
      data-hud="orbit"
      data-on={on ? '' : undefined}
      title="Reset view"
      onClick={onReset}
    >
      <div {...stylex.props(styles.atom)}>
        <div
          {...stylex.props(styles.dist)}
          ref={(el) => {
            live.dist = el
          }}
        />
        <div
          {...stylex.props(styles.rings)}
          ref={(el) => {
            live.rings = el
          }}
        >
          {[0, 60, 120].map((deg) => (
            <div key={deg} {...stylex.props(styles.ring, styles.ringAt(deg))} />
          ))}
          <div
            {...stylex.props(styles.nucleus)}
            ref={(el) => {
              live.nucleus = el
            }}
          />
        </div>
        <div
          {...stylex.props(styles.electron)}
          ref={(el) => {
            live.electron = el
          }}
        />
      </div>
      <span
        {...stylex.props(styles.cap)}
        data-cap=""
        ref={(el) => {
          live.cap = el
        }}
      />
    </div>
  )
}

/** The four squares gather toward the centre while the button is hovered. */
const SQUARES: [x: number, y: number, dx: number, dy: number][] = [
  [3, 3, 1, 1],
  [11, 3, -1, 1],
  [3, 11, 1, -1],
  [11, 11, -1, -1]
]

function HomeButton({ onClick }: { onClick: () => void }) {
  // StyleX has no parent-hover selector, so the button reports its hover to the rects.
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      {...stylex.props(styles.child, styles.button)}
      title="Home (Esc)"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <svg {...stylex.props(styles.svg)} viewBox="0 0 20 20" aria-hidden="true">
        {SQUARES.map(([x, y, dx, dy]) => (
          <rect
            key={`${x},${y}`}
            {...stylex.props(styles.sq, hover && styles.gather(dx, dy))}
            x={x}
            y={y}
            width="6"
            height="6"
            rx="1.8"
          />
        ))}
      </svg>
    </button>
  )
}

const dim = '#6b7064'
const spring = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const ease = 'cubic-bezier(0.4, 0, 0.2, 1)'
const glassBlur = 'blur(20px) saturate(1.6)'
const font = '-apple-system, "SF Pro Text", system-ui, "Helvetica Neue", sans-serif'
const reduce = '@media (prefers-reduced-motion: reduce)'

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  ui: { position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', textAlign: 'center', fontFamily: font },
  h1: { position: 'absolute', top: 28, left: 32, fontSize: 28, letterSpacing: '-0.03em', fontWeight: 600 },
  p: { position: 'absolute', top: 64, left: 32, color: dim, fontSize: 14 },
  hint: {
    position: 'absolute',
    bottom: '13vh',
    left: 0,
    right: 0,
    color: dim,
    fontSize: 13,
    transitionProperty: 'opacity',
    transitionDuration: '0.5s'
  },
  hintHidden: { opacity: 0 },

  // Liquid glass, the quiet kind: a blurred, smoked body, a 1px hairline, one
  // highlight along the top edge and a faint inner glow where the edge would
  // refract. The material is the blur; nothing here is a gradient ramp.
  liquid: {
    position: 'relative',
    isolation: 'isolate',
    backgroundColor: 'rgba(28, 29, 34, 0.68)',
    backdropFilter: glassBlur,
    WebkitBackdropFilter: glassBlur,
    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.24), inset 0 0 14px rgba(255, 255, 255, 0.07), 0 1px 1px rgba(0, 0, 0, 0.08), 0 16px 40px -16px rgba(0, 0, 0, 0.45)'
  },

  hud: {
    position: 'absolute',
    // Centred under the phone, which hangs half the orbit card's column left of
    // the window's middle (RIGHT_BAND in main.ts).
    left: 'calc(50% - 70px)',
    bottom: 28,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 6,
    paddingLeft: 16,
    borderRadius: 26,
    color: colors.white,
    fontSize: 13,
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
    cursor: { default: 'grab', ':active': 'grabbing' }
  },
  /** Direct children of the pill take their own clicks instead of dragging the window. */
  child: { pointerEvents: 'auto', cursor: 'default', position: 'relative' },
  sep: { width: 1, height: 20, marginInline: 8, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  label: { display: 'flex', alignItems: 'center', gap: 10, paddingInline: 4 },
  svg: {
    display: 'block',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    overflow: 'visible'
  },
  deg: { minWidth: '4ch', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 },

  range: {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 140,
    height: 4,
    borderRadius: 2,
    outlineStyle: 'none',
    cursor: 'pointer',
    '::-webkit-slider-thumb': {
      WebkitAppearance: 'none',
      width: 18,
      height: 18,
      borderRadius: '50%',
      backgroundColor: colors.white,
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(0, 0, 0, 0.06)',
      transitionProperty: 'transform',
      transitionDuration: { default: '0.2s', [reduce]: '0s' },
      transitionTimingFunction: ease,
      transform: { default: null, ':active': 'scale(1.1)' }
    }
  },
  /** iOS fills the track up to the knob. */
  fill: (pct: number) => ({
    backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.9) ${pct}%, rgba(255, 255, 255, 0.22) ${pct}%)`
  }),

  button: {
    width: 38,
    height: 38,
    padding: 0,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    backgroundColor: {
      default: 'transparent',
      ':hover': 'rgba(255, 255, 255, 0.12)',
      ':active': 'rgba(255, 255, 255, 0.16)'
    },
    transitionProperty: 'transform, background-color, opacity',
    transitionDuration: { default: '0.2s', ':active': '0.08s', [reduce]: '0s' },
    transitionTimingFunction: ease,
    transform: { default: null, ':active': 'scale(0.9)' }
  },
  buttonOff: { opacity: 0.4, pointerEvents: 'none', cursor: 'default' },

  // Icons that move. Each one animates the thing the button does.
  lid: {
    transformBox: 'fill-box',
    transformOrigin: '0% 50%',
    transitionProperty: 'transform',
    transitionDuration: { default: '0.7s', [reduce]: '0s' },
    transitionTimingFunction: ease
  },
  lidClosed: { transform: 'scaleX(-1)' },
  turn: (rad: number) => ({
    transitionProperty: 'transform',
    transitionDuration: { default: '0.7s', [reduce]: '0s' },
    transitionTimingFunction: spring,
    transform: `rotate(${rad}rad)`
  }),
  sq: {
    transitionProperty: 'transform',
    transitionDuration: { default: '0.3s', [reduce]: '0s' },
    transitionTimingFunction: spring
  },
  gather: (dx: number, dy: number) => ({ transform: `translate(${dx}px, ${dy}px)` }),
  orbit: { transformOrigin: '50% 50%' },
  orbiting: {
    animationName: { default: spin, [reduce]: 'none' },
    animationDuration: '3s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  },

  checkbox: {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 30,
    height: 18,
    borderRadius: 9,
    position: 'relative',
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    transitionProperty: 'background-color',
    transitionDuration: { default: '0.25s', [reduce]: '0s' },
    '::after': {
      content: '""',
      position: 'absolute',
      top: 2,
      left: 2,
      width: 14,
      height: 14,
      borderRadius: '50%',
      backgroundColor: colors.white,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      transitionProperty: 'transform',
      transitionDuration: { default: '0.25s', [reduce]: '0s' },
      transitionTimingFunction: ease
    }
  },
  checkboxOn: { backgroundColor: colors.green, '::after': { transform: 'translateX(12px)' } },

  // The orbit minimap, bottom edge on the pill's baseline. It stands in its own
  // column: main.ts keeps 164 px clear on the right (RIGHT_BAND) so it never
  // lands on the phone, and the pill is offset by half that so it stays centred
  // under the phone rather than under the window.
  card: {
    position: 'absolute',
    right: 28,
    bottom: 28,
    width: 112,
    height: 112,
    borderRadius: 22,
    color: colors.white,
    cursor: 'pointer',
    opacity: 0,
    transform: 'scale(0.92)',
    pointerEvents: 'none',
    transitionProperty: 'opacity, transform',
    transitionDuration: { default: '0.3s', [reduce]: '0s' },
    transitionTimingFunction: ease
  },
  cardOn: { opacity: 1, transform: 'scale(1)', pointerEvents: 'auto' },
  atom: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 92,
    perspective: '300px',
    transformStyle: 'preserve-3d'
  },
  /** Children centre on the atom and offset themselves; the gimbal keeps its 3D space. */
  rings: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    transformStyle: 'preserve-3d'
  },
  ring: {
    position: 'absolute',
    top: -RING,
    left: -RING,
    width: RING * 2,
    height: RING * 2,
    borderRadius: '50%',
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.7)'
  },
  ringAt: (deg: number) => ({ transform: `rotateZ(${deg}deg) rotateX(75deg)` }),
  nucleus: {
    position: 'absolute',
    top: -6,
    left: -4,
    width: 8,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)'
  },
  electron: {
    position: 'absolute',
    top: 'calc(50% - 2.5px)',
    left: 'calc(50% - 2.5px)',
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: colors.cyan,
    boxShadow: `0 0 6px ${colors.cyan}, 0 0 2px ${colors.white}`
  },
  dist: {
    position: 'absolute',
    top: 'calc(50% - 40px)',
    left: 'calc(50% - 40px)',
    width: 80,
    height: 80,
    borderRadius: '50%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.28)'
  },
  cap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 9,
    fontSize: 11,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    color: 'rgba(255, 255, 255, 0.72)'
  }
})
