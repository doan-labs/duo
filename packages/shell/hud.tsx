// The floating HUD under the device and the page chrome around it. main.ts
// owns the numbers (hinge angle, yaw, camera pose); this file only draws them
// and reports the controls back through `HudEvents`.

import {
  chrome,
  colors,
  easing,
  fonts,
  glass,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useSyncExternalStore } from 'react'
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
 * The hinge readout changes every frame, so it bypasses React: the element is
 * collected through a ref and mutated directly.
 */
type Live = { deg: number; degEl: HTMLSpanElement | null }
const readout = (deg: number) => `${Math.round(deg)}°`
/** Shortest signed distance from a multiple of 2π. */
const wrap = (rad: number) => Math.atan2(Math.sin(rad), Math.cos(rad))

/** The default pose main.ts homes to: camera at z = 40, level, in front. */
const HOME_DISTANCE = 40

export function mountHud(events: HudEvents) {
  const q = new URLSearchParams(location.search)
  // `?spin=1`: start turning as soon as the scene draws (the hero). A stated
  // preference for less motion wins; the checkbox still turns it on by hand.
  const spin = q.get('spin') === '1' && !matchMedia('(prefers-reduced-motion: reduce)').matches
  const store = createStore({ target: 180, yaw: 0, hint: true, spin, away: false })
  const live: Live = { deg: 180, degEl: null }
  const web = document.documentElement.classList.contains('web')
  // An embedding page has its own headline; the frame shows the device alone.
  const title = web && window.self === window.top
  // `?hud=0`: the phone and nothing else, for pages that pose it by postMessage.
  if (q.get('hud') !== '0') {
    const container = document.body.appendChild(document.createElement('div'))
    createRoot(container).render(<Hud store={store} live={live} events={events} web={web} title={title} />)
  }
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
     * Camera pose, every frame after controls.update(). React only hears about
     * it when the view leaves or returns to the default pose, which is the
     * whole state the Reset button needs.
     */
    orbit: (azimuth: number, polar: number, distance: number, yaw: number) => {
      const away =
        Math.abs(azimuth) > 0.02 ||
        Math.abs(polar - Math.PI / 2) > 0.02 ||
        // Zooming in is for reading the screen; only zooming out counts as
        // leaving the view.
        distance - HOME_DISTANCE > 0.5 ||
        Math.abs(wrap(yaw)) > 0.02
      if (away !== store.get().away) store.set({ away })
    }
  }
}

function Hud({
  store,
  live,
  events,
  web,
  title
}: {
  store: Store
  live: Live
  events: HudEvents
  web: boolean
  title: boolean
}) {
  const s = useSyncExternalStore(store.subscribe, store.get)
  const closed = s.target <= 90
  return (
    <div {...stylex.props(styles.ui)}>
      {title && (
        <>
          <h1 {...stylex.props(styles.h1)}>iPhone Duo</h1>
          <p {...stylex.props(styles.p)}>7.6″ inner display. 5.4″ outer. Grade&nbsp;5 titanium.</p>
        </>
      )}
      {web && (
        <div {...stylex.props(styles.hint, !s.hint && styles.hintHidden)}>
          {/* Two lines, one per input. The long one wrapped to three lines on a
              phone and ran into the device, and half of it named gestures a
              touch screen does not have. */}
          <span {...stylex.props(styles.hintWide)}>
            Tap the screen to use it · Press the buttons on the frame · Drag outside to orbit · Wheel to zoom
          </span>
          <span {...stylex.props(styles.hintNarrow)}>Tap the screen to use it · Drag to turn</span>
        </div>
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
    </div>
  )
}

const HomeButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" {...stylex.props(styles.child, styles.button)} title="Home (Esc)" onClick={onClick}>
    <svg {...stylex.props(styles.svg)} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 9.5 L10 3.5 L17 9.5 V16.5 H3 Z" />
      <path d="M8 16.5 V11.5 H12 V16.5" />
    </svg>
  </button>
)

const dim = colors.grey
const spring = easing.bounce
const ease = easing.inOut
const glassBlur = glass.blur
const font = fonts.system
const reduce = '@media (prefers-reduced-motion: reduce)'

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  ui: { position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', textAlign: 'center', fontFamily: font },
  h1: {
    position: 'absolute',
    top: 28,
    left: 32,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.semibold
  },
  p: {
    position: 'absolute',
    top: 64,
    left: 32,
    color: dim,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  hint: {
    position: 'absolute',
    bottom: '13vh',
    left: 0,
    right: 0,
    color: dim,
    fontSize: { default: typeScale.footnote, '@media (max-width: 600px)': typeScale.caption2 },
    whiteSpace: 'normal',
    paddingLeft: 16,
    paddingRight: 16,
    transitionProperty: 'opacity',
    transitionDuration: '0.5s'
  },
  hintHidden: { opacity: 0 },
  hintWide: { display: { default: 'inline', '@media (max-width: 600px)': 'none' } },
  hintNarrow: { display: { default: 'none', '@media (max-width: 600px)': 'inline' } },

  // Liquid glass, the quiet kind: a blurred, smoked body, a 1px hairline, one
  // highlight along the top edge and a faint inner glow where the edge would
  // refract. The material is the blur; nothing here is a gradient ramp.
  liquid: {
    position: 'relative',
    isolation: 'isolate',
    backgroundColor: chrome.hud,
    backdropFilter: glassBlur,
    WebkitBackdropFilter: glassBlur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },

  hud: {
    position: 'absolute',
    left: '50%',
    bottom: 20,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: { default: 4, '@media (max-width: 600px)': 2 },
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 6,
    paddingLeft: { default: 16, '@media (max-width: 600px)': 8 },
    borderRadius: radius.pill,
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
    cursor: { default: 'grab', ':active': 'grabbing' }
  },
  /** Direct children of the pill take their own clicks instead of dragging the window. */
  child: { pointerEvents: 'auto', cursor: 'default', position: 'relative' },
  sep: {
    width: 1,
    height: 20,
    marginInline: { default: 8, '@media (max-width: 600px)': 4 },
    backgroundColor: chrome.fill2
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: { default: 10, '@media (max-width: 600px)': 6 },
    paddingInline: 4
  },
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
  deg: { minWidth: '4ch', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: weight.medium },

  range: {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: { default: 140, '@media (max-width: 600px)': 'clamp(24px, calc(100vw - 342px), 140px)' },
    height: 4,
    borderRadius: radius.xs,
    outlineStyle: 'none',
    cursor: 'pointer',
    '::-webkit-slider-thumb': {
      WebkitAppearance: 'none',
      width: 18,
      height: 18,
      borderRadius: radius.circle,
      backgroundColor: colors.white,
      boxShadow: shadow.card,
      transitionProperty: 'transform',
      transitionDuration: { default: '0.2s', [reduce]: '0s' },
      transitionTimingFunction: ease,
      transform: { default: null, ':active': 'scale(1.1)' }
    }
  },
  /** iOS fills the track up to the knob. */
  fill: (pct: number) => ({
    backgroundImage: `linear-gradient(90deg, ${colors.white} ${pct}%, ${chrome.fill} ${pct}%)`
  }),

  button: {
    width: { default: 38, '@media (max-width: 600px)': 34 },
    height: 38,
    padding: 0,
    borderRadius: radius.circle,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    backgroundColor: { default: 'transparent', ':hover': chrome.fill3, ':active': chrome.fill2 },
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
  orbit: { transformOrigin: '50% 50%' },
  orbiting: {
    animationName: { default: spin, [reduce]: 'none' },
    animationDuration: '3s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },

  checkbox: {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 30,
    height: 18,
    borderRadius: radius.pill,
    position: 'relative',
    cursor: 'pointer',
    backgroundColor: chrome.fill,
    transitionProperty: 'background-color',
    transitionDuration: { default: '0.25s', [reduce]: '0s' },
    '::after': {
      content: '""',
      position: 'absolute',
      top: 2,
      left: 2,
      width: 14,
      height: 14,
      borderRadius: radius.circle,
      backgroundColor: colors.white,
      boxShadow: shadow.card,
      transitionProperty: 'transform',
      transitionDuration: { default: '0.25s', [reduce]: '0s' },
      transitionTimingFunction: ease
    }
  },
  checkboxOn: { backgroundColor: colors.green, '::after': { transform: 'translateX(12px)' } }
})
