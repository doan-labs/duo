import {
  app,
  appAppearance,
  colors,
  easing,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local copies of shared's `pop` and `rip`: StyleX only resolves imported
// keyframes from `.stylex.ts` modules, so the ones in uikit/styles.ts stay
// there for its own blocks.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

const rip = stylex.keyframes({ to: { transform: 'scale(2.3)', opacity: 0 } })

// 76px discs when they fit, else what is left of the keypad's height after the
// 61px number, the grid's padding and three gaps, and the call button's margin,
// shared by four key rows and the call button.
const disc = 'min(76px, (100cqh - 141px) / 5)'

export const styles = stylex.create({
  // Phone is a dark app: the root carries the dark theme's own background so
  // every `app.*` colour below it reads against it.
  root: {
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg,
    color: app.fg
  },
  panes: { flexGrow: 1, minHeight: 0, position: 'relative' },
  pane: { position: 'absolute', inset: 0, overflow: 'auto' },
  list: { marginTop: 6 },
  dark: {
    width: '100%',
    textAlign: 'left',
    backgroundColor: app.surface,
    borderBottomColor: app.separator,
    cursor: 'pointer'
  },
  mono: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radius.circle,
    backgroundImage: appAppearance.phoneMono,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.callout,
    fontWeight: weight.semibold
  },
  info: { display: 'flex', color: app.link },
  letter: {
    paddingTop: 4,
    paddingBottom: 6,
    paddingLeft: 32,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  unheard: { width: 10, height: 10, flexShrink: 0, borderRadius: radius.circle, backgroundColor: app.link },
  heard: { opacity: 0 },
  name: { fontWeight: weight.semibold, color: app.fg },
  missed: { color: colors.redDark },
  // The discs read their size off the keypad's height, so the number is never
  // pushed off the top: both displays are shorter than a full-size keypad.
  keypad: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    height: '100%',
    containerType: 'size'
  },
  dial: {
    textAlign: 'center',
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.thin,
    minHeight: 48,
    paddingTop: 10,
    paddingBottom: 10
  },
  // flex:none on both, or the column shrinks them when the keypad is taller than
  // the panel and the call button lands as a 76x36 ellipse.
  keys: {
    display: 'grid',
    gridTemplateColumns: `repeat(3, ${disc})`,
    justifyContent: 'center',
    rowGap: 14,
    columnGap: 24,
    paddingTop: 4,
    paddingBottom: 14,
    flexShrink: 0
  },
  key: {
    aspectRatio: 1,
    borderRadius: radius.circle,
    backgroundColor: { default: appAppearance.phoneGlass, ':active': appAppearance.phoneKey },
    boxShadow: appAppearance.phoneGlassEdge,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    // The digit keeps its share of the disc as the disc shrinks, as a 76 px key's 34 px does.
    fontSize: `calc(${disc} * .45)`,
    fontWeight: weight.regular,
    lineHeight: 1,
    transitionProperty: 'background-color, transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  keySub: {
    textDecoration: 'none',
    fontSize: typeScale.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    marginTop: 3
  },
  grn: {
    width: 76,
    height: 76,
    flexShrink: 0,
    borderRadius: radius.circle,
    backgroundColor: colors.greenDark,
    display: 'grid',
    placeItems: 'center',
    marginInline: 'auto',
    fontSize: typeScale.largeTitle,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  red: { backgroundColor: colors.redDark },
  dialBtn: {
    width: disc,
    height: disc,
    marginBottom: 20,
    backgroundColor: appAppearance.phoneCall,
    boxShadow: appAppearance.phoneCallEdge,
    color: colors.white
  },
  hangUp: { marginTop: 26 },
  // iOS 26's floating tab bar. It stops 22 px up: the home indicator owns the
  // bottom 22 px, and a tab under it would lose its taps to the swipe.
  bar: {
    display: 'flex',
    flexShrink: 0,
    alignSelf: 'center',
    width: 'calc(100% - 40px)',
    maxWidth: 400,
    marginBottom: 22,
    paddingTop: 4,
    paddingRight: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.phoneGlass,
    boxShadow: appAppearance.phoneGlassEdge
  },
  tab: {
    flexGrow: 1,
    flexBasis: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: radius.pill,
    color: app.fg,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    transitionProperty: 'background-color, color',
    transitionDuration: motion.pressDuration
  },
  tabOn: { backgroundColor: appAppearance.phoneTabOn, color: app.link },
  call: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundImage: appAppearance.phoneDial,
    zIndex: 5,
    animationName: pop,
    animationDuration: '.4s',
    animationTimingFunction: easing.pop,
    transitionProperty: 'opacity, transform',
    transitionDuration: '.28s'
  },
  callOff: { opacity: 0, transform: 'scale(.94)' },
  av: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.phoneKeyDark,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.display,
    lineHeight: 1,
    fontWeight: weight.regular,
    marginBottom: 10
  },
  rip: {
    position: 'absolute',
    inset: -4,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: appAppearance.phoneKeyRim,
    animationName: rip,
    animationDuration: '2.2s',
    animationTimingFunction: easing.out,
    animationIterationCount: 'infinite'
  },
  who: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.medium
  },
  state: {
    opacity: 0.65,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  ctl: { display: 'flex', gap: 22, marginTop: 26 },
  ctlBtn: {
    width: 62,
    height: 62,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.phoneKeyFaint,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.title3
  }
})
