// Fitness's chrome: the same floating-glass recipe as Health (decision 18) but
// dark - the tint is `glass.tintDark`, the cards are `hcardDark`, and the Move
// ring's pink is the app accent.

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

export const styles = stylex.create({
  split: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: app.bg
  },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  paneSide: { paddingLeft: 202 },
  /** The keyed wrapper the wide pane fades between destinations. */
  paneWide: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },

  /** Floating dark glass sidebar. */
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
    paddingTop: 20,
    paddingRight: 8,
    paddingBottom: 12,
    paddingLeft: 8,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  sideTitle: {
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 12,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.bold,
    color: colors.white
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, minHeight: 0, overflowY: 'auto' },
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
  sideRowOn: { backgroundColor: app.fill, fontWeight: weight.semibold },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideTint: { display: 'grid', placeItems: 'center', width: 20, flexShrink: 0 },
  sideSec: {
    paddingTop: 12,
    paddingRight: 10,
    paddingBottom: 3,
    paddingLeft: 10,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2
  },
  /** The streak chip under the destinations. */
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
    borderRadius: radius.lg,
    backgroundColor: app.fill3,
    color: app.fg
  },

  /** The cover's floating tab bar, dark glass. */
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
    backgroundColor: glass.tintDark,
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
    paddingRight: 12,
    paddingBottom: 4,
    paddingLeft: 12,
    borderRadius: radius.lg,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  tabOn: { color: colors.white },

  /** Page bodies and headers. */
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
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  headSide: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.sm },
  date: { paddingRight: space.lg, paddingBottom: space.sm, paddingLeft: space.lg, color: app.label2 },
  pageHead: { paddingTop: space.xl, paddingRight: space.lg, paddingLeft: space.lg },
  bigVal: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  unit: {
    fontSize: typeScale.footnote,
    fontWeight: weight.medium,
    color: app.label2,
    marginLeft: 4,
    fontStyle: 'normal'
  },
  secHead: {
    display: 'flex',
    alignItems: 'baseline',
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },

  /** Dark cards, the hcard of the kit with the app's own rounding. */
  dcard: {
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
    color: app.fg,
    textAlign: 'left'
  },
  dcardBtn: {
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 12,
    paddingRight: space.lg,
    paddingLeft: space.lg
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

  /** Rings hero and legend. */
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
  legendRow: { display: 'flex', gap: space.xl, paddingTop: 10, justifyContent: 'center', flexWrap: 'wrap' },
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

  /** Weekly bars. */
  chartSvg: { width: '100%', height: 'auto', display: 'block' },
  axis: { fill: app.label2, fontSize: typeScale.caption2, fontFamily: fonts.system },
  barGrow: (tint: string) => ({
    fill: tint,
    transformBox: 'fill-box',
    transformOrigin: '50% 100%',
    animationName: { default: growY, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  }),
  goalLine: { stroke: app.label3, strokeDasharray: '4 4', strokeWidth: 1 },

  /** Workout rows on dark. */
  woRow: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 10 },
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
  woName: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  woSub: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  woRight: { marginLeft: 'auto', textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 },
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

  /** History rows: mini rings beside the day's totals. */
  histRow: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 8 },

  /** Awards grid. */
  awardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 12,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  award: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingRight: 10,
    paddingBottom: 14,
    paddingLeft: 10,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    textAlign: 'center'
  },
  medal: (earned: boolean) => ({
    display: 'grid',
    placeItems: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.circle,
    backgroundColor: earned ? colors.yellow : app.fill3,
    color: earned ? colors.black : app.label3
  }),
  awardName: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  awardSub: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  progress: { height: 4, width: '100%', borderRadius: radius.pill, backgroundColor: app.fill3, overflow: 'hidden' },
  progressFill: (c: string, pct: number) => ({
    height: '100%',
    width: `${Math.min(100, (pct * 100) | 0)}%`,
    backgroundColor: c,
    borderRadius: radius.pill
  }),

  /** Date scrubber on Activity. */
  scrubber: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: space.sm },

  /** Sheet internals - same shapes as Health's, on dark glass. */
  sheetPad: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
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
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  stat: {
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderRadius: radius.xl,
    backgroundColor: app.surface
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
  /** Text buttons inside section headers. */
  linkBtn: { marginLeft: 'auto', color: app.link, cursor: 'pointer' },
  /** The awards shelf under the sections. */
  awardBanner: { marginRight: space.lg, marginLeft: space.lg, marginTop: space.sm },
  stepper: {
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    backgroundColor: app.fill3,
    color: colors.white,
    fontSize: typeScale.title3,
    cursor: 'pointer'
  }
})
