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

/** The selected row settles into its tint rather than snapping to it. */
const settle = stylex.keyframes({ from: { transform: 'scale(.96)', opacity: 0 } })
/** A favourite star bounces in when toggled. */
const bounce = stylex.keyframes({
  '0%': { transform: 'scale(.4)' },
  '60%': { transform: 'scale(1.25)' },
  '100%': { transform: 'scale(1)' }
})
/** The detail card rises a touch as it fades in. */
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(10px)' } })
/** The index rail's toast letter pops beside the finger. */
const peek = stylex.keyframes({ from: { opacity: 0, transform: 'scale(.6)' } })

export const styles = stylex.create({
  root: { flexGrow: 1, minHeight: 0, display: 'flex', backgroundColor: app.bg, color: app.fg },
  /** Unfolded: the list column beside the card. */
  split: { display: 'flex', flexGrow: 1, minHeight: 0 },
  side: {
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    position: 'relative',
    backgroundColor: app.bg,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  pane: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: app.surface },
  paneWide: { backgroundColor: app.bg },
  column: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: app.bg
  },

  // ---------- list header ----------
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
  hero: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    paddingTop: 0,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    flexShrink: 0
  },
  heroSm: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    paddingBottom: space.xs
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    color: app.link,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  circleOn: { backgroundColor: app.link, color: colors.white },
  plain: { color: app.link, padding: 0, display: 'flex', alignItems: 'center' },

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
    color: app.label2,
    flexShrink: 0,
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.2s',
    boxShadow: { default: null, ':focus-within': shadow.card }
  },
  searchIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    '::placeholder': { color: app.label2 }
  },
  clear: {
    display: 'flex',
    color: app.label3,
    padding: 0,
    transitionProperty: 'transform, opacity',
    transitionDuration: motion.pressDuration,
    transform: { default: 'scale(1)', ':active': motion.press }
  },

  // ---------- the A-Z list ----------
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    paddingBottom: space.xxl,
    scrollBehavior: { default: 'smooth', '@media (prefers-reduced-motion: reduce)': 'auto' },
    position: 'relative'
  },
  withRail: { paddingRight: 14 },
  sec: {
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    fontWeight: weight.semibold,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2,
    backgroundColor: app.bg,
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  group: {
    marginRight: space.md,
    marginBottom: space.sm,
    marginLeft: space.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: app.surface
  },
  groupLabel: {
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.xxl,
    paddingRight: space.lg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    textAlign: 'left',
    paddingTop: 10,
    paddingRight: space.lg,
    paddingBottom: 10,
    paddingLeft: space.lg,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: `.2s, .2s, ${motion.pressDuration}`,
    transform: { default: 'scale(1)', ':active': 'scale(.985)' }
  },
  rowOn: {
    backgroundColor: { default: app.fill, ':hover': app.fill },
    animationName: { default: settle, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop
  },
  rowName: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  rowFirst: { fontWeight: weight.regular },
  rowLast: { fontWeight: weight.semibold },
  rowSub: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  rowPair: { display: 'grid', minWidth: 0, flexGrow: 1 },
  rowStar: { marginLeft: 'auto', color: app.label3, display: 'flex' },
  chevron: { marginLeft: 'auto', color: app.label3, display: 'flex' },
  empty: {
    paddingTop: space.xxxl,
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  /** Result rows drop in one after another as the query changes. */
  stagger: (i: number) => ({ animationDelay: `${Math.min(i, 12) * 18}ms`, animationFillMode: 'backwards' }),

  // ---------- index rail ----------
  rail: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: space.lg,
    width: 14,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    touchAction: 'none',
    userSelect: 'none'
  },
  railLetter: {
    fontSize: typeScale.caption2,
    lineHeight: 1,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption2,
    color: app.link,
    paddingTop: 1,
    paddingBottom: 1,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  railOn: { transform: 'scale(1.35)' },
  railPeek: {
    position: 'absolute',
    right: 22,
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.semibold,
    backgroundColor: app.elevated,
    color: app.fg,
    boxShadow: shadow.float,
    animationName: { default: peek, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.pop,
    pointerEvents: 'none'
  },

  // ---------- avatars ----------
  mono: {
    borderRadius: radius.circle,
    backgroundColor: colors.grey3,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontWeight: weight.medium,
    flexShrink: 0,
    overflow: 'hidden'
  },
  monoSize: (px: number, font: number, bg: string) => ({
    width: px,
    height: px,
    fontSize: font,
    lineHeight: 1,
    backgroundImage: bg
  }),
  monoGlyph: { color: colors.white, opacity: 0.92 },

  // ---------- detail ----------
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
  name: {
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
    backgroundColor: { default: app.surface, ':hover': appAppearance.contactsSelection },
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
    transitionDuration: '.2s'
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
  danger: { color: colors.red },
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
    backgroundColor: app.elevated,
    color: app.fg,
    boxShadow: shadow.float,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    pointerEvents: 'none',
    zIndex: 5
  },
  blank: {
    flexGrow: 1,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: space.sm,
    color: app.label2,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    textAlign: 'center'
  },
  blankGlyph: { color: app.label3 },
  blankSub: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.regular
  },

  // ---------- form sheet ----------
  sheet: { width: 360 },
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
  formBtn: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.regular,
    color: app.link,
    padding: 0
  },
  formDone: { fontWeight: weight.semibold },
  check: {
    marginLeft: 'auto',
    color: app.link,
    display: 'flex',
    opacity: 1,
    transitionProperty: 'opacity, transform',
    transitionDuration: '.2s'
  },
  checkOff: { opacity: 0, transform: 'scale(.6)' },
  listIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    backgroundColor: app.link,
    flexShrink: 0
  },
  count: { marginLeft: 'auto', color: app.label2 }
})
