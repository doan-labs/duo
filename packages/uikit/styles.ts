// stylex.create blocks used by more than one app. One app's own look stays in
// that app's file. The keyframes below only work inside this file: StyleX
// resolves `stylex.keyframes` at compile time and cannot follow it across an
// import, so an app that animates with its own timing defines its own
// keyframes and reuses `shared.rise` / `shared.spin` only as whole blocks.
import * as stylex from '@stylexjs/stylex'
import { app, colors, easing, layout, typeScale } from './tokens.stylex.ts'

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
export const drop = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(-8px) scale(.98)' } })
export const lift = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(24px) scale(.96)' } })
export const sink = stylex.keyframes({ to: { opacity: 0, transform: 'translateY(24px) scale(.96)' } })
export const slideIn = stylex.keyframes({ from: { transform: 'translateX(100%)' } })
export const slideOut = stylex.keyframes({ to: { transform: 'translateX(100%)' } })

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
  },
  /** A row that just appeared in a list: settles down from above. */
  row: {
    animationName: { default: drop, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop
  },
  /** A floating tray or toolbar entering from below; pair with `floatOut` under `usePresence`. */
  float: {
    animationName: { default: lift, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop
  },
  floatOut: {
    animationName: { default: sink, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.34s',
    animationFillMode: 'forwards'
  },
  /** A page pushed over another, sliding in from the right; `Push` in nav.tsx applies these. */
  sheet: {
    animationName: { default: slideIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.push
  },
  sheetOut: {
    animationName: { default: slideOut, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.push,
    animationFillMode: 'forwards'
  }
})

export const shared = stylex.create({
  /** Anything tappable: shrinks under the finger and eases back. */
  press: {
    transitionProperty: 'transform, color, background-color',
    transitionDuration: '.15s, .2s, .2s',
    transform: { default: 'scale(1)', ':active': 'scale(.9)' }
  },
  /** A selectable row: colours ease instead of snapping, with a gentler press. */
  select: {
    transitionProperty: 'transform, color, background-color, border-color',
    transitionDuration: '.15s, .22s, .22s, .22s',
    transform: { default: 'scale(1)', ':active': 'scale(.98)' }
  },
  /** Content that swaps in place (a detail pane changing note): fades in. */
  swap: {
    animationName: { default: fade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.25s'
  },
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
    backgroundColor: app.surface,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
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
  rowR: { marginLeft: 'auto', color: app.label2 },
  /** Inset group of rows. */
  grp: { marginRight: 16, marginBottom: 20, marginLeft: 16, borderRadius: 12, overflow: 'hidden' },
  /** iOS switch, an `<input type="checkbox">`. */
  sw: {
    appearance: 'none',
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: { default: app.track, ':checked': colors.green },
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
  /** Big numerals (Clock, Weather). */
  big: { fontSize: 84, fontWeight: 200, textAlign: 'center', paddingTop: 20, paddingBottom: 10, letterSpacing: -2 },
  /** Empty-state placeholder, centred. */
  ph: {
    flexGrow: 1,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    color: app.label2,
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
    backgroundColor: app.fill,
    color: colors.blue,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .2s',
    transform: { default: null, ':active': 'scale(.9)' }
  },
  /** Secondary label. */
  sub: { color: app.label2, fontSize: 13 },
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

/**
 * The type ramp as whole blocks: size, leading and weight together, because
 * setting one without the others is what produced 233 loose `fontSize`
 * declarations across the apps. `Text`'s `size` prop names these.
 */
export const typography = stylex.create({
  largeTitle: { fontSize: typeScale.largeTitle, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.8 },
  title1: { fontSize: typeScale.title1, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.6 },
  title2: { fontSize: typeScale.title2, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.4 },
  title3: { fontSize: typeScale.title3, fontWeight: 600, lineHeight: 1.25 },
  /** Body weight raised to semibold: the lead line of a row or card. */
  headline: { fontSize: typeScale.headline, fontWeight: 600, lineHeight: 1.3 },
  body: { fontSize: typeScale.body, fontWeight: 400, lineHeight: 1.4 },
  callout: { fontSize: typeScale.callout, fontWeight: 400, lineHeight: 1.4 },
  subheadline: { fontSize: typeScale.subheadline, fontWeight: 400, lineHeight: 1.4 },
  footnote: { fontSize: typeScale.footnote, fontWeight: 400, lineHeight: 1.35 },
  caption1: { fontSize: typeScale.caption1, fontWeight: 400, lineHeight: 1.3 },
  caption2: { fontSize: typeScale.caption2, fontWeight: 400, lineHeight: 1.3 }
})

/**
 * The two app themes. Apply one to an app's root instead of hand-rolling a
 * `createTheme`: every row, separator, switch and secondary label in the kit
 * reads from these, so a dark app no longer has to avoid `Row` and `Section`.
 * `light` restates the kit's own defaults, so applying it changes nothing.
 */
export const light = stylex.createTheme(app, {
  bg: colors.groupedLight,
  fg: colors.black,
  surface: colors.white,
  elevated: colors.barLight,
  label2: colors.grey,
  separator: colors.separator,
  fill: colors.fill,
  track: colors.trackLight
})
export const dark = stylex.createTheme(app, {
  bg: colors.black,
  fg: colors.white,
  surface: colors.darkElevated,
  elevated: colors.darkElevated2,
  label2: colors.grey,
  separator: colors.separatorDark,
  fill: colors.fillDark,
  track: colors.trackDark
})

/** Stagger for lists: `stylex.props(shared.rise, delay(i * 40))`. */
export const delay = stylex.create({
  ms: (ms: number) => ({ animationDelay: `${ms}ms` })
})

export { easing }
