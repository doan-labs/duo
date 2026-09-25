// Health's chrome. The sidebar is a floating glass panel (decision 18: a tint,
// a rim, a shadow - nothing drawn), the cover's answer is the floating tab bar,
// and the pushed stack on the cover is the kit's own slide geometry re-stated
// so the shared `path` cell can drive it.

import {
  app,
  colors,
  easing,
  fonts,
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
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const growY = stylex.keyframes({ from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } })
const drawIn = stylex.keyframes({ to: { strokeDashoffset: 0 } })
const slideIn = stylex.keyframes({ from: { transform: 'translateX(100%)' } })
const slideOut = stylex.keyframes({ to: { transform: 'translateX(100%)' } })

export const styles = stylex.create({
  /** Whole app: sidebar floats over the pane, the pane runs under it. */
  split: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: app.bg
  },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  /** The pane keeps its text clear of the panel; everything else may pass under the glass. */
  paneSide: { paddingLeft: 202 },
  paneRoot: { isolation: 'isolate' },

  /** Floating glass sidebar, sized and rounded like the Store's. */
  side: {
    position: 'absolute',
    zIndex: 2,
    top: -32,
    bottom: 8,
    left: 8,
    width: 186,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 24,
    paddingRight: 8,
    paddingBottom: 12,
    paddingLeft: 8,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  sideFind: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    height: 34,
    paddingRight: 12,
    paddingLeft: 12,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    flexShrink: 0
  },
  sideField: {
    appearance: 'none',
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    outline: { default: 'none', ':focus': 'none' },
    '::placeholder': { color: app.label3 },
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: space.xs, flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  sideSec: {
    paddingTop: 12,
    paddingRight: 10,
    paddingBottom: 3,
    paddingLeft: 10,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label3
  },
  sideRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    textAlign: 'left',
    cursor: 'pointer'
  },
  sideRowOn: { backgroundColor: app.fill, color: app.link, fontWeight: weight.semibold },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideTint: { display: 'grid', placeItems: 'center', width: 20, flexShrink: 0 },
  /** The profile chip where a Mac puts the account. */
  sideFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    width: '100%',
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: app.fill3,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  avatar: (size: number) => ({
    display: 'grid',
    placeItems: 'center',
    width: size,
    height: size,
    borderRadius: radius.circle,
    backgroundColor: app.link,
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    flexShrink: 0
  }),
  sideFootName: { fontSize: typeScale.footnote, lineHeight: leading.footnote, fontWeight: weight.semibold },
  sideFootSub: { fontSize: typeScale.caption2, lineHeight: leading.caption2, color: app.label2 },

  /** The cover's floating tab bar. */
  tabs: {
    position: 'absolute',
    zIndex: 2,
    right: 10,
    bottom: 12,
    left: 10,
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: radius.xxl,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
    paddingRight: 14,
    paddingBottom: 4,
    paddingLeft: 14,
    borderRadius: radius.lg,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  tabOn: { color: app.link },

  /** Cover push navigation, the kit's slide geometry driven by the path cell. */
  nav: { position: 'relative', flexGrow: 1, minHeight: 0, overflow: 'hidden' },
  pg: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg,
    transitionProperty: 'transform, opacity',
    transitionDuration: { default: '.38s', '@media (prefers-reduced-motion: reduce)': '0s' },
    transitionTimingFunction: easing.push
  },
  pgOff: { transform: 'translateX(100%)' },
  pgUnder: { transform: 'translateX(-26%)', opacity: 0.5 },
  pgShadow: { boxShadow: shadow.float },
  pgIn: {
    animationName: { default: slideIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.push
  },
  pgOut: {
    animationName: { default: slideOut, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.push,
    animationFillMode: 'forwards'
  },

  /** A page's own chrome: the big title, the date line under it, an avatar at the trailing edge. */
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg
  },
  headSide: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.sm },
  date: { paddingRight: space.lg, paddingBottom: space.sm, paddingLeft: space.lg, color: app.label2 },

  /** Pinned-card grid: two columns on the cover, more as the pane allows. */
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 12,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  gridWide: { gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' },
  gcard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
    paddingTop: 12,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  gcardPress: {
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  cap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  capTint: (c: string) => ({ color: c }),
  val: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums'
  },
  unit: {
    fontSize: typeScale.footnote,
    fontWeight: weight.medium,
    color: app.label2,
    marginLeft: 4,
    fontStyle: 'normal'
  },
  cardChart: { marginTop: 4, minHeight: 44 },
  chev: { marginLeft: 'auto', display: 'flex', color: app.label3 },
  spark: { width: '100%', height: 'auto', display: 'block' },
  /** The unpin badge a card wears in edit mode. */
  unpin: {
    position: 'absolute',
    top: -6,
    right: -6,
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    borderRadius: radius.circle,
    backgroundColor: app.fill,
    color: app.label2,
    boxShadow: shadow.card
  },
  addPin: {
    display: 'grid',
    placeItems: 'center',
    minHeight: 120,
    borderRadius: radius.xxl,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: app.separator,
    color: app.label2,
    cursor: 'pointer'
  },

  /** Detail pages: a bounded column so text measure stays readable on the wide pane. */
  body: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 90,
    position: 'relative'
  },
  bodyWide: { paddingRight: space.lg },
  col: { width: '100%', maxWidth: 620, marginRight: 'auto', marginLeft: 'auto' },
  pageHead: { paddingTop: space.xl, paddingRight: space.lg, paddingBottom: space.sm, paddingLeft: space.lg },
  bigVal: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  segRow: { display: 'flex', justifyContent: 'center', paddingTop: space.sm },
  chartBox: {
    marginTop: space.lg,
    marginRight: space.lg,
    marginLeft: space.lg,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 6,
    paddingLeft: 12,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  chartSvg: { width: '100%', height: 'auto', display: 'block' },
  axis: { fill: app.label3, fontSize: typeScale.caption2, fontFamily: fonts.system },
  gridLine: { stroke: app.fill3, strokeWidth: 1, strokeDasharray: '1 5', strokeLinecap: 'round' },
  baseline: { stroke: app.separator, strokeWidth: 1 },
  barGrow: (tint: string) => ({
    fill: tint,
    transformBox: 'fill-box',
    transformOrigin: '50% 100%',
    animationName: { default: growY, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  }),
  goalLine: { stroke: app.label3, strokeDasharray: '1 5', strokeLinecap: 'round', strokeWidth: 1.5 },
  lineDot: (tint: string) => ({ fill: tint }),
  lineDotRing: (tint: string) => ({ fill: tint, opacity: 0.18 }),
  hypnoRun: (tint: string, w: number) => ({
    stroke: tint,
    strokeWidth: w,
    strokeLinecap: 'round',
    fill: 'none',
    strokeDasharray: 1600,
    strokeDashoffset: 1600,
    animationName: { default: drawIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.9s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'forwards'
  }),
  hypnoLink: (tint: string, w: number) => ({
    stroke: tint,
    strokeWidth: Math.max(1.5, w * 0.55),
    strokeLinecap: 'round',
    fill: 'none',
    strokeDasharray: 1600,
    strokeDashoffset: 1600,
    animationName: { default: drawIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'forwards'
  }),
  lineDraw: {
    strokeDasharray: 1600,
    strokeDashoffset: 1600,
    animationName: { default: drawIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1.1s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'forwards'
  },
  lineDrawShort: {
    strokeDasharray: 600,
    strokeDashoffset: 600,
    animationName: { default: drawIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.8s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'forwards'
  },

  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  stat: {
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  statCap: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    fontWeight: weight.medium
  },
  statVal: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    marginTop: 2
  },
  btnRow: { display: 'flex', gap: 10, paddingTop: space.lg, paddingRight: space.lg, paddingLeft: space.lg },
  legendRow: { display: 'flex', gap: space.xl, paddingTop: 10, justifyContent: 'center', flexWrap: 'wrap' },

  /** Activity page: the rings big, ring legend rows under it. */
  ringsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  ringStats: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 },
  ringStat: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium
  },
  ringStatVal: { fontSize: typeScale.title3, fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' },

  /** Sleep stage legend chips. */
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 3,
    paddingRight: 10,
    paddingBottom: 3,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    color: app.label2
  },
  dot: (c: string) => ({
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: radius.circle,
    backgroundColor: c
  }),

  /** A workout row: tinted circle glyph, name and kcal, duration and day trailing. */
  woGlyph: (c: string, size: number) => ({
    display: 'grid',
    placeItems: 'center',
    width: size,
    height: size,
    borderRadius: radius.circle,
    backgroundColor: c,
    color: colors.white,
    flexShrink: 0
  }),
  iconBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    backgroundColor: app.fill3,
    color: app.label2,
    cursor: 'pointer',
    flexShrink: 0
  },
  iconBtnTint: (c: string) => ({ color: c }),

  /** Add-data sheet internals. */
  sheetPad: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: { paddingBottom: space.xs },
  sheetRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  sheetBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: space.sm },
  kindGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  kindBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: app.fill3,
    color: app.fg,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  kindOn: (c: string) => ({ backgroundColor: c, color: colors.white }),
  fieldLabel: { width: 84, flexShrink: 0, color: app.label2 },
  grow: { flexGrow: 1, minWidth: 0 },

  /** A Row used as a button: full width, text left. */
  linkRow: { width: '100%', textAlign: 'left', cursor: 'pointer' },

  /** Summary section caption, and the note under groups. */
  secHead: {
    display: 'flex',
    alignItems: 'baseline',
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },
  empty: { paddingTop: 40, paddingBottom: 40, textAlign: 'center' }
})
