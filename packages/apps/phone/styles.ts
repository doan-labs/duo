import {
  app,
  appAppearance,
  colors,
  easing,
  leading,
  motion,
  radius,
  shadow,
  space,
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

/** A favourite star bounces in when toggled. */
const bounce = stylex.keyframes({
  '0%': { transform: 'scale(.4)' },
  '60%': { transform: 'scale(1.25)' },
  '100%': { transform: 'scale(1)' }
})

/** The detail card rises a touch as it fades in. */
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(10px)' } })

// 76px discs when they fit, else what is left of the keypad's height after the
// 61px number, the grid's padding and three gaps, and the call button's margin,
// shared by four key rows and the call button.
const disc = 'min(76px, (100cqh - 141px) / 5)'
// The in-call pad sits under the caller header, so it gets a smaller disc.
const dtmfDisc = 'min(56px, (100cqh - 96px) / 4)'

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
  // Column flex: Push sizes its nav by flexGrow, so a plain block pane would
  // collapse it to zero height and clip the whole tab.
  pane: { position: 'absolute', inset: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' },
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
  keysSm: {
    display: 'grid',
    gridTemplateColumns: `repeat(3, ${dtmfDisc})`,
    justifyContent: 'center',
    rowGap: 10,
    columnGap: 20,
    flexShrink: 0
  },
  keySm: { fontSize: `calc(${dtmfDisc} * .45)` },
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
  // ---------- dial pad ----------
  // The number and its match share a two-line zone so the keys never jump.
  dialZone: { display: 'grid', gap: 2, minHeight: 78 },
  dialPh: { color: app.label3 },
  dialMatch: {
    textAlign: 'center',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2,
    minHeight: 20
  },
  dialRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 },
  dialSide: { width: 62, display: 'grid', placeItems: 'center' },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    color: app.fg,
    transform: { default: null, ':active': motion.press },
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },

  // ---------- list rows ----------
  hdrActs: { display: 'flex', alignItems: 'center', gap: space.sm },
  plain: { color: app.link, padding: 0, display: 'flex', alignItems: 'center' },
  empty: { padding: space.xl, textAlign: 'center', color: app.label2 },
  favRow: { display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10 },
  favHit: {
    flexGrow: 1,
    minWidth: 0,
    display: 'grid',
    gap: 1,
    textAlign: 'left',
    paddingTop: 8,
    paddingBottom: 8,
    color: app.fg,
    opacity: { default: 1, ':disabled': 0.5 }
  },
  minus: {
    width: 26,
    height: 26,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.redDark,
    transform: { default: null, ':active': motion.press },
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  grip: { display: 'flex', padding: 6, color: app.label3, cursor: 'grab', touchAction: 'none' },
  infoBtn: {
    width: 34,
    height: 34,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: app.link,
    transform: { default: null, ':active': motion.press },
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  recRow: { display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10 },
  recHit: {
    flexGrow: 1,
    minWidth: 0,
    display: 'grid',
    gap: 1,
    textAlign: 'left',
    paddingTop: 8,
    paddingBottom: 8,
    color: app.fg
  },
  recSub: { display: 'flex', alignItems: 'center', gap: 6 },
  recDir: { display: 'flex', color: app.label3 },
  recTime: {
    flexShrink: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  deleteBtn: {
    flexShrink: 0,
    marginRight: 12,
    paddingTop: 7,
    paddingRight: 14,
    paddingBottom: 7,
    paddingLeft: 14,
    borderRadius: radius.md,
    backgroundColor: colors.redDark,
    color: colors.white,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  clearAll: {
    alignSelf: 'flex-start',
    paddingTop: 2,
    paddingRight: space.lg,
    paddingBottom: 8,
    paddingLeft: space.lg,
    color: colors.redDark,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },

  // ---------- search ----------
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
    marginRight: space.lg,
    marginBottom: space.sm,
    marginLeft: space.lg,
    paddingInline: space.sm,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: app.label2
  },
  searchIc: { display: 'flex', color: app.label2 },
  searchIn: { flexGrow: 1, minWidth: 0, height: '100%', backgroundColor: 'transparent', color: app.fg },
  searchX: {
    width: 18,
    height: 18,
    flexShrink: 0,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill2,
    color: app.label2
  },
  noHits: { padding: space.xl, textAlign: 'center', color: app.label2 },

  // ---------- call surfaces ----------
  // The control grid: three across, two deep, label under each disc.
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: 'calc(100% - 56px)', maxWidth: 320 },
  ctl: {
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.fg
  },
  ctlOn: { color: app.fg },
  ctlBtn: {
    width: 62,
    height: 62,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.phoneKeyFaint,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: `.2s, .2s, ${motion.pressDuration}`,
    transform: { default: null, ':active': motion.press }
  },
  // An armed control inverts: white disc, dark glyph, the way iOS draws it.
  ctlBtnOn: { backgroundColor: colors.white, color: colors.black },
  swap: {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: 8,
    paddingRight: space.md,
    paddingBottom: 8,
    paddingLeft: space.md,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.phoneGlass,
    boxShadow: appAppearance.phoneGlassEdge,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    zIndex: 2
  },
  swapName: { fontWeight: weight.semibold },
  swapBtn: { color: app.link, fontWeight: weight.semibold },
  // The in-call pad fills the space the controls grid leaves; the keys size off
  // its container height like the dial pad's do.
  dtmf: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexGrow: 1,
    width: '100%',
    containerType: 'size'
  },
  dtmfNum: {
    minHeight: 40,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.regular,
    textAlign: 'center',
    overflowWrap: 'anywhere',
    paddingInline: space.lg
  },
  hidePad: {
    color: app.fg,
    padding: 8,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    marginBottom: 14
  },
  // The screening reply, typed in under the caller's name.
  screen: {
    maxWidth: '84%',
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: appAppearance.phoneKeyFaint,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    textAlign: 'center'
  },
  ringRow: { marginTop: 10 },
  ringOpt: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  ringCtl: { display: 'flex', gap: 64, marginTop: 34, alignItems: 'center' },
  ringBtn: {
    display: 'grid',
    justifyItems: 'center',
    gap: 8,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.fg
  },
  ringDisc: {
    width: 74,
    height: 74,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  redDisc: { backgroundColor: colors.redDark, color: colors.white },
  grnDisc: { backgroundColor: colors.greenDark, color: colors.white },
  // The minimised call's green strip: name left, clock right, tap to return.
  pill: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 6,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: 7,
    paddingRight: space.md,
    paddingBottom: 7,
    paddingLeft: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.greenDark,
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    boxShadow: shadow.float
  },
  pillWho: { maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  // ---------- the contact picker ----------
  pick: {
    position: 'absolute',
    inset: 0,
    zIndex: 7,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg
  },
  pickHd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },
  pickTitle: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  pickBody: { flexGrow: 1, minHeight: 0, overflow: 'auto' },
  pickList: { marginTop: 4 },

  // ---------- voicemail ----------
  vmRow: { paddingLeft: 10 },
  vmHit: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    paddingTop: 9,
    paddingBottom: 9,
    color: app.fg
  },
  vmWho: { flexGrow: 1, minWidth: 0, display: 'grid', gap: 1 },
  vmPrev: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: app.label2 },
  vmPlay: {
    paddingTop: 4,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 20,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator
  },
  vmTrack: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 },
  vmCtl: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.phoneKeyFaint,
    color: colors.white,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: `.2s, .2s, ${motion.pressDuration}`,
    transform: { default: null, ':active': motion.press }
  },
  vmCtlOn: { backgroundColor: colors.white, color: colors.black },
  vmRange: { flexGrow: 1, minWidth: 0, height: 28, accentColor: app.link },
  vmTime: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingRight: 4,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  vmTranscript: {
    paddingTop: 10,
    paddingBottom: 4,
    paddingRight: 8,
    color: app.fg,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout
  },
  vmActs: { display: 'flex', gap: 6, paddingTop: 6 },
  vmAct: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 8,
    textAlign: 'center',
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    transform: { default: null, ':active': motion.press },
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  danger: { color: colors.redDark },

  // ---------- detail card ----------
  column: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: app.bg,
    overflow: 'hidden'
  },
  hdr: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
    paddingRight: space.md,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    minHeight: 44
  },
  hdrInner: { paddingRight: 56 },
  hdrBack: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    marginLeft: -6
  },
  hdrSpace: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.xs },
  card: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    paddingBottom: space.xxxl,
    animationName: { default: rise, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.32s',
    animationTimingFunction: easing.pop
  },
  head: {
    display: 'grid',
    justifyItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    paddingBottom: space.xs,
    textAlign: 'center'
  },
  cardName: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    paddingInline: space.lg
  },
  company: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2,
    marginTop: -4
  },
  acts: {
    display: 'flex',
    justifyContent: 'center',
    gap: space.sm,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    paddingInline: space.lg
  },
  act: {
    display: 'grid',
    justifyItems: 'center',
    gap: space.xs,
    flexBasis: 0,
    flexGrow: 1,
    maxWidth: 84,
    minWidth: 0,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderRadius: radius.lg,
    color: app.link,
    backgroundColor: app.surface,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: 'scale(1)', ':active': motion.press },
    boxShadow: shadow.card,
    opacity: { default: 1, ':disabled': 0.4 }
  },
  actGlyph: { display: 'flex', height: 22, alignItems: 'center' },
  group: {
    marginRight: space.md,
    marginBottom: space.sm,
    marginLeft: space.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: app.surface
  },
  field: {
    display: 'grid',
    gap: space.xxs,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    width: '100%',
    textAlign: 'left',
    backgroundColor: { default: app.surface, ':hover': app.fill3 },
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    transitionProperty: 'background-color',
    transitionDuration: '.2s',
    color: app.fg
  },
  fieldLabel: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.fg
  },
  fieldValue: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: app.link,
    overflowWrap: 'anywhere'
  },
  fieldNote: { color: app.fg, whiteSpace: 'pre-wrap' },
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    textAlign: 'left',
    paddingTop: 11,
    paddingRight: space.lg,
    paddingBottom: 11,
    paddingLeft: space.lg,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: app.link,
    backgroundColor: { default: app.surface, ':hover': app.fill3 },
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    transitionProperty: 'background-color, transform',
    transitionDuration: `.2s, ${motion.pressDuration}`,
    transform: { default: 'scale(1)', ':active': 'scale(.985)' }
  },
  count: {
    marginLeft: 'auto',
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    display: 'flex'
  },
  bounce: {
    display: 'flex',
    animationName: { default: bounce, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.pop
  },
  gold: { color: colors.yellow },
  toast: {
    position: 'absolute',
    left: '50%',
    bottom: space.xxl,
    transform: 'translateX(-50%)',
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.phoneGlass,
    boxShadow: appAppearance.phoneGlassEdge,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    whiteSpace: 'nowrap',
    zIndex: 8
  },
  monoSize: (size: number, fontSize: number) => ({ width: size, height: size, fontSize }),
  monoGlyph: { display: 'flex', color: colors.white, opacity: 0.8 },

  // ---------- the contact form sheet ----------
  formSheet: { width: 360 },
  form: { display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
  formHdr: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  formBody: { overflow: 'auto', paddingBottom: space.lg, backgroundColor: app.bg },
  formHead: { display: 'grid', justifyItems: 'center', paddingTop: space.lg, paddingBottom: space.md },
  formGroup: {
    marginTop: space.md,
    marginRight: space.lg,
    marginLeft: space.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: app.surface
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  formLabel: {
    width: 68,
    flexShrink: 0,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  formIn: {
    flexGrow: 1,
    height: 44,
    paddingInline: space.xs,
    backgroundColor: 'transparent',
    borderRadius: 0,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: app.fg
  },
  formArea: { height: 'auto', minHeight: 88, paddingTop: space.md, paddingBottom: space.md },
  formDone: { fontWeight: weight.semibold },

  // ---------- tab badge ----------
  tabGlyph: { position: 'relative', display: 'flex' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -12,
    minWidth: 15,
    height: 15,
    paddingInline: 4,
    borderRadius: radius.pill,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.redDark,
    color: colors.white,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  }
})
