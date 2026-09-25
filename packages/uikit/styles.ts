// stylex.create blocks used by more than one app. One app's own look stays in
// that app's file. The keyframes below only work inside this file: StyleX
// resolves `stylex.keyframes` at compile time and cannot follow it across an
// import, so an app that animates with its own timing defines its own
// keyframes and reuses `shared.rise` / `shared.spin` only as whole blocks.
import * as stylex from '@stylexjs/stylex'
import {
  app,
  colors,
  easing,
  glass,
  layout,
  leading,
  motion,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from './tokens.stylex.ts'

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
export const shrink = stylex.keyframes({ to: { transform: 'scale(.94) translateY(8px)', opacity: 0 } })
export const slideIn = stylex.keyframes({ from: { transform: 'translateX(100%)' } })
export const slideOut = stylex.keyframes({ to: { transform: 'translateX(100%)' } })

// Keyframes stay in this module because StyleX resolves their definitions locally.
export const animations = stylex.create({
  spin: {
    animationName: { default: spin, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1s',
    animationTimingFunction: easing.linear,
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
  /** How a popped card leaves. `Sheet` pairs it with `pop` through `usePresence`. */
  popOut: {
    animationName: { default: shrink, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.out,
    animationFillMode: 'forwards'
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
  /** Anything tappable: shrinks under the finger and eases back. The one press state. */
  press: {
    transitionProperty: 'transform, color, background-color',
    transitionDuration: `${motion.pressDuration}, .2s, .2s`,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  /** A selectable row: colours ease instead of snapping; the row itself does not shrink. */
  select: {
    transitionProperty: 'color, background-color, border-color',
    transitionDuration: '.22s'
  },
  /** Content that swaps in place (a detail pane changing note): fades in. */
  swap: {
    animationName: { default: fade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.25s'
  },
  /** Fixed app header: title left, actions right. Title 2, semibold. */
  hdr: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
    paddingRight: 56,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold
  },
  /** Small trailing controls inside `hdr`: footnote, secondary. */
  hdrSm: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular,
    color: app.label2,
    marginLeft: 'auto'
  },
  /** Scrolling content below the header. */
  body: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    position: 'relative',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: space.xxl
  },
  /** Back chevron in a nav page header. */
  bk: { display: 'flex', alignItems: 'center', color: app.link, marginLeft: -6 },
  /** Grouped-list row. */
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingTop: 11,
    paddingRight: space.lg,
    paddingBottom: 11,
    paddingLeft: space.lg,
    backgroundColor: app.surface,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  /** Coloured glyph square at the start of a row. */
  rowIc: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    flexShrink: 0
  },
  /** Trailing detail text in a row. */
  rowR: { marginLeft: 'auto', color: app.label2 },
  /** Inset group of rows. */
  grp: {
    marginRight: space.lg,
    marginBottom: space.xl,
    marginLeft: space.lg,
    borderRadius: radius.md,
    overflow: 'hidden'
  },
  /** iOS switch, an `<input type="checkbox">`. */
  sw: {
    appearance: 'none',
    width: 51,
    height: 31,
    borderRadius: radius.pill,
    backgroundColor: { default: app.fill2, ':checked': colors.green },
    position: 'relative',
    marginLeft: 'auto',
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'background-color',
    transitionDuration: '.2s',
    '::after': {
      content: '""',
      position: 'absolute',
      top: 2,
      left: 2,
      width: 27,
      height: 27,
      borderRadius: radius.circle,
      backgroundColor: colors.white,
      boxShadow: shadow.card,
      transitionProperty: 'transform',
      transitionDuration: '.2s',
      transform: { default: null, ':checked': 'translateX(20px)' }
    }
  },
  /** Big numerals (Clock, Weather). */
  big: {
    fontSize: 84,
    fontWeight: weight.thin,
    lineHeight: 1,
    textAlign: 'center',
    paddingTop: space.xl,
    paddingBottom: space.sm,
    letterSpacing: -2
  },
  /** Empty-state placeholder, centred. */
  ph: {
    flexGrow: 1,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    gap: space.sm,
    alignContent: 'center'
  },
  phImg: { width: 96, height: 96 },
  /** Floating action button, bottom right. */
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.xxl,
    width: 52,
    height: 52,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.link,
    color: colors.white,
    boxShadow: shadow.float,
    zIndex: 4,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** Tinted capsule button: subheadline semibold on systemFill. */
  pill: {
    paddingTop: 7,
    paddingRight: space.lg,
    paddingBottom: 7,
    paddingLeft: space.lg,
    borderRadius: radius.pill,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    backgroundColor: app.fill,
    color: app.link,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  /** Secondary label: footnote in the secondary colour. */
  sub: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  /** Large title, bold. */
  hero: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    paddingTop: space.xxs,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },
  /** Loading spinner. */
  spin: {
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },
  /** Entrance for cards and list items. */
  rise: { animationName: rise, animationDuration: '.5s', animationFillMode: 'backwards' },
  hide: { display: 'none' },
  /** Column that fills its parent; a page or a whole app body. */
  column: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  /** Current app surface colour, for sheets and pages inside an app. */
  surface: { backgroundColor: app.bg, color: app.fg },
  /** Liquid glass: blur, tint and a rim, per decision 18. Status stack, dock, widgets, lock-screen buttons, volume HUD. */
  glass: {
    position: 'relative',
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    backgroundColor: glass.tint,
    boxShadow: shadow.rim
  },
  // white-space and text-shadow are the enclosing tile's, meant for its label:
  // left on, the event line runs straight out through the widget's right edge.
  widget: {
    position: 'relative',
    width: layout.widget,
    height: layout.widget,
    borderRadius: radius.xxl,
    padding: space.md,
    overflow: 'hidden',
    cursor: 'pointer',
    whiteSpace: 'normal',
    textShadow: 'none',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** Small semibold label inside a widget. */
  widgetLabel: {
    display: 'block',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    opacity: 0.92
  }
})

/**
 * The type ramp as whole blocks: Dynamic Type at the Large size, each step
 * carrying size, leading, tracking and weight, because setting one without the
 * others is what produced 233 loose `fontSize` declarations across the apps.
 * `Text`'s `size` prop names these; `Text`'s `weight` prop emphasises a step.
 */
export const typography = stylex.create({
  largeTitle: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold
  },
  title1: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold
  },
  title2: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold
  },
  title3: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold
  },
  /** Body raised to semibold: the lead line of a row or card. */
  headline: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  body: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.regular
  },
  callout: {
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    fontWeight: weight.regular
  },
  subheadline: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.regular
  },
  footnote: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular
  },
  caption1: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.regular
  },
  caption2: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.regular
  }
})

/**
 * The two app themes: UIKit's light and dark dynamic colours. Apply one to an
 * app's root instead of hand-rolling a `createTheme`: every row, separator,
 * switch and secondary label in the kit reads from these. `light` restates the
 * kit's own defaults, so applying it changes nothing.
 */
export const light = stylex.createTheme(app, {
  bg: colors.grey6,
  fg: colors.black,
  surface: colors.white,
  elevated: colors.white,
  label2: 'rgba(60,60,67,.6)',
  label3: 'rgba(60,60,67,.3)',
  link: colors.blue,
  separator: 'rgba(60,60,67,.29)',
  fill: 'rgba(120,120,128,.2)',
  fill2: 'rgba(120,120,128,.16)',
  fill3: 'rgba(118,118,128,.12)',
  control: colors.white,
  glass: 'rgba(255,255,255,.18)'
})
export const dark = stylex.createTheme(app, {
  bg: colors.black,
  fg: colors.white,
  surface: colors.grey6Dark,
  elevated: colors.grey5Dark,
  label2: 'rgba(235,235,245,.6)',
  label3: 'rgba(235,235,245,.3)',
  link: colors.blueDark,
  separator: 'rgba(84,84,88,.6)',
  fill: 'rgba(120,120,128,.36)',
  fill2: 'rgba(120,120,128,.32)',
  fill3: 'rgba(118,118,128,.24)',
  control: colors.grey2Dark,
  glass: 'rgba(30,30,32,.55)'
})

/** Stagger for lists: `stylex.props(shared.rise, delay(i * 40))`. */
export const delay = stylex.create({
  ms: (ms: number) => ({ animationDelay: `${ms}ms` })
})

export { easing }
