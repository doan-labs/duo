// stylex.create blocks used by more than one app. One app's own look stays in
// that app's file. The keyframes below only work inside this file: StyleX
// resolves `stylex.keyframes` at compile time and cannot follow it across an
// import, so an app that animates with its own timing defines its own
// keyframes and reuses `shared.rise` / `shared.spin` only as whole blocks.
import * as stylex from '@stylexjs/stylex'
import { app, colors, easing, layout } from './tokens.stylex.ts'

export const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })
export const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })
export const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })
export const rip = stylex.keyframes({ to: { transform: 'scale(2.3)', opacity: 0 } })
export const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })
export const bob = stylex.keyframes({
  '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
  '30%': { transform: 'translateY(-5px)', opacity: 1 }
})
export const glow = stylex.keyframes({ '50%': { opacity: 0.55 } })
export const fade = stylex.keyframes({ from: { opacity: 0 } })

// Keyframes stay in this module because StyleX resolves their definitions locally.
export const animations = stylex.create({
  spin: {
    animationName: { default: spin, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  },
  rise: {
    animationName: { default: rise, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.5s',
    animationFillMode: 'backwards'
  },
  pop: {
    animationName: { default: pop, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.pop
  },
  fade: {
    animationName: { default: fade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.25s'
  },
  rip: { animationName: { default: rip, '@media (prefers-reduced-motion: reduce)': 'none' }, animationDuration: '.6s' },
  draw: {
    animationName: { default: draw, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1s'
  },
  bob: {
    animationName: { default: bob, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1s',
    animationIterationCount: 'infinite'
  },
  glow: {
    animationName: { default: glow, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '2s',
    animationIterationCount: 'infinite'
  }
})

export const shared = stylex.create({
  /** Fixed app header: title left, actions right. */
  hdr: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingRight: 56,
    paddingBottom: 10,
    paddingLeft: 16,
    fontSize: 22,
    fontWeight: 700
  },
  /** Small trailing controls inside `hdr`. */
  hdrSm: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    fontSize: 13,
    fontWeight: 500,
    opacity: 0.6,
    marginLeft: 'auto'
  },
  /** Scrolling content below the header. */
  body: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    position: 'relative',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 28
  },
  /** Back chevron in a nav page header. */
  bk: { display: 'flex', alignItems: 'center', color: colors.blue, marginLeft: -6 },
  /** Grouped-list row. */
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 11,
    paddingRight: 16,
    paddingBottom: 11,
    paddingLeft: 16,
    backgroundColor: colors.white,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: colors.separator
  },
  /** Coloured glyph square at the start of a row. */
  rowIc: {
    width: 30,
    height: 30,
    borderRadius: 7,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    flexShrink: 0
  },
  /** Trailing detail text in a row. */
  rowR: { marginLeft: 'auto', color: colors.grey },
  /** Inset group of rows. */
  grp: { marginRight: 16, marginBottom: 20, marginLeft: 16, borderRadius: 12, overflow: 'hidden' },
  /** iOS switch, an `<input type="checkbox">`. */
  sw: {
    appearance: 'none',
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: { default: colors.trackLight, ':checked': colors.green },
    position: 'relative',
    marginLeft: 'auto',
    cursor: 'pointer',
    flexShrink: 0,
    '::after': {
      content: '""',
      position: 'absolute',
      top: 2,
      left: 2,
      width: 27,
      height: 27,
      borderRadius: '50%',
      backgroundColor: colors.white,
      boxShadow: '0 3px 8px rgba(0,0,0,.15)',
      transitionProperty: 'transform',
      transitionDuration: '.2s',
      transform: { default: null, ':checked': 'translateX(20px)' }
    }
  },
  /** Photo grid. */
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: 2 },
  gridImg: { width: '100%', aspectRatio: 1, objectFit: 'cover', display: 'block', cursor: 'pointer' },
  /** Full-bleed image viewer over an app. */
  viewer: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.black,
    display: 'grid',
    placeItems: 'center',
    zIndex: 3
  },
  viewerImg: { maxWidth: '100%', maxHeight: '100%' },
  /** Big numerals (Clock, Weather). */
  big: { fontSize: 84, fontWeight: 200, textAlign: 'center', paddingTop: 20, paddingBottom: 10, letterSpacing: -2 },
  /** Empty-state placeholder, centred. */
  ph: {
    flexGrow: 1,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    color: colors.grey,
    fontSize: 14,
    gap: 10,
    alignContent: 'center'
  },
  phImg: { width: 96, height: 96 },
  /** Floating action button, bottom right. */
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.blue,
    color: colors.white,
    boxShadow: '0 8px 22px rgba(0,60,140,.4)',
    zIndex: 4,
    transitionProperty: 'transform',
    transitionDuration: '.18s',
    transform: { default: null, ':active': 'scale(.88)' }
  },
  /** Tinted capsule button. */
  pill: {
    paddingTop: 6,
    paddingRight: 15,
    paddingBottom: 6,
    paddingLeft: 15,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 700,
    backgroundColor: colors.fill,
    color: colors.blue,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .2s',
    transform: { default: null, ':active': 'scale(.9)' }
  },
  /** Secondary label. */
  sub: { color: colors.grey, fontSize: 13 },
  /** Large title. */
  hero: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.8,
    paddingTop: 2,
    paddingRight: 16,
    paddingBottom: 10,
    paddingLeft: 16
  },
  /** Loading spinner. */
  spin: {
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  },
  /** Entrance for cards and list items. */
  rise: { animationName: rise, animationDuration: '.5s', animationFillMode: 'backwards' },
  hide: { display: 'none' },
  /** Column that fills its parent; a page or a whole app body. */
  column: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  /** Current app surface colour, for sheets and pages inside an app. */
  surface: { backgroundColor: app.bg, color: app.fg },
  /** Liquid glass: status stack, dock, widgets, lock-screen buttons, volume HUD. */
  glass: {
    position: 'relative',
    backdropFilter: 'blur(18px) saturate(170%)',
    WebkitBackdropFilter: 'blur(18px) saturate(170%)',
    backgroundColor: 'rgba(255,255,255,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(255,255,255,.28),0 8px 18px rgba(0,0,0,.26)',
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      backgroundImage: 'radial-gradient(120% 60% at 30% -10%,rgba(255,255,255,.45),rgba(255,255,255,0) 60%)',
      pointerEvents: 'none'
    }
  },
  // white-space and text-shadow are the enclosing tile's, meant for its label:
  // left on, the event line runs straight out through the widget's right edge.
  widget: {
    position: 'relative',
    width: layout.widget,
    height: layout.widget,
    borderRadius: 23,
    padding: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    whiteSpace: 'normal',
    textShadow: 'none',
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  /** Small bold label inside a widget. */
  widgetLabel: { display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.92 }
})

/** Stagger for lists: `stylex.props(shared.rise, delay(i * 40))`. */
export const delay = stylex.create({
  ms: (ms: number) => ({ animationDelay: `${ms}ms` })
})

export { easing }
