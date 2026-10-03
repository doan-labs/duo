import {
  app,
  colors,
  easing,
  fonts,
  leading,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const reduce = '@media (prefers-reduced-motion: reduce)'

// One-shot entrances may only touch transform and opacity.
const tickPop = stylex.keyframes({
  '0%': { transform: 'scale(.8)' },
  '60%': { transform: 'scale(1.12)' },
  '100%': { transform: 'scale(1)' }
})
const stepIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(8px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    color: app.fg,
    backgroundColor: app.bg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  // A page filling the Push host: fixed header, scrolling body.
  page: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  hdr: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    paddingBottom: space.sm,
    paddingInline: space.lg
  },
  hdrCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs, flexGrow: 1, minWidth: 0 },
  hdrActions: { display: 'flex', alignItems: 'center', gap: space.xs, marginLeft: 'auto', flexShrink: 0 },
  kicker: {
    color: colors.orangeDark,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle,
    textTransform: 'uppercase'
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  titleCover: { fontSize: typeScale.title1, lineHeight: leading.title1, letterSpacing: tracking.title1 },
  pageTitle: {
    marginBlock: 0,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontWeight: weight.semibold,
    letterSpacing: tracking.title3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingInline: space.lg,
    // The home bar owns the bottom edge; content floats clear of it.
    paddingBottom: space.xxxl,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg
  },
  scrollCover: { paddingInline: space.md, gap: space.md },
  grid: { display: 'grid', gridTemplateColumns: '1fr', gap: space.md },
  gridWide: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  // The li filling a grid cell so its card can stretch to row height.
  cardCell: { display: 'flex', minWidth: 0 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    height: '100%',
    minWidth: 0,
    paddingBlock: space.md,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.xl,
    color: app.fg,
    backgroundColor: { default: app.surface, ':hover': app.elevated },
    boxShadow: shadow.card,
    textAlign: 'start',
    cursor: 'pointer',
    touchAction: 'manipulation'
  },
  tile: {
    width: 44,
    height: 44,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.lg,
    color: colors.white
  },
  tileBig: { width: 56, height: 56, borderRadius: radius.xl },
  tileTint: (tint: string) => ({ backgroundColor: tint }),
  cardCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs, flex: 1, minWidth: 0 },
  cardName: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    fontWeight: weight.semibold,
    letterSpacing: tracking.headline,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  cardNote: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  cardMeta: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    flexWrap: 'wrap'
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption2,
    flexShrink: 0
  },
  chipHot: { backgroundColor: app.fill2, color: colors.orangeDark },
  cardChevron: { display: 'flex', color: app.label3, flexShrink: 0 },
  saved: {
    alignSelf: 'center',
    color: app.label3,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    flexShrink: 0
  },
  empty: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    textAlign: 'center',
    color: app.label2
  },
  emptyTitle: {
    marginBlock: 0,
    color: app.fg,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.title2
  },
  emptyHint: {
    marginBlock: 0,
    maxWidth: 240,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  // Detail / cook / editor sheet internals
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  heroTop: { display: 'flex', alignItems: 'center', gap: space.md, minWidth: 0 },
  heroName: {
    marginBlock: 0,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.bold,
    letterSpacing: tracking.title2
  },
  heroNote: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: space.xs },
  columns: { display: 'flex', flexDirection: 'column', gap: space.md, minWidth: 0 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg },
  column: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.md },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  panelLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.xs,
    paddingInline: space.xs,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.semibold,
    letterSpacing: tracking.largeTitle,
    textTransform: 'uppercase'
  },
  rows: {
    listStyleType: 'none',
    marginBlock: 0,
    paddingInline: 0
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    paddingBlock: space.sm,
    paddingInline: space.xs,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    minWidth: 0,
    borderRadius: radius.md
  },
  // The whole ingredient row is the label: one tap anywhere toggles the box.
  rowLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    borderRadius: radius.md,
    cursor: 'pointer',
    touchAction: 'manipulation'
  },
  // A tappable step row: the li owns the hairline and padding, the button only
  // fills it, so :last-child keeps meaning the last row.
  rowButton: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    textAlign: 'start',
    cursor: 'pointer',
    touchAction: 'manipulation'
  },
  checkText: {
    flex: 1,
    minWidth: 0,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    transitionProperty: 'color',
    transitionDuration: '.2s'
  },
  checkDone: { color: app.label3, textDecorationLine: 'line-through' },
  stepNum: {
    width: 22,
    flexShrink: 0,
    textAlign: 'center',
    fontFamily: fonts.rounded,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.bold,
    color: colors.orangeDark,
    fontVariantNumeric: 'tabular-nums'
  },
  stepText: {
    flex: 1,
    minWidth: 0,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  // The live step row: filled number badge plus a tinted lift so the eye lands
  // on it without scanning the list.
  stepNow: { backgroundColor: app.fill2, borderRadius: radius.md },
  stepNumNow: { backgroundColor: colors.orangeDark, color: colors.white, borderRadius: radius.pill },
  stepTextNow: { fontWeight: weight.semibold },
  stepPast: { color: app.label3 },
  // Cook mode
  cookCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.lg,
    paddingBlock: space.xl,
    paddingInline: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    textAlign: 'center'
  },
  cookKicker: {
    color: colors.orangeDark,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle,
    textTransform: 'uppercase'
  },
  cookText: {
    marginBlock: 0,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontWeight: weight.semibold,
    letterSpacing: tracking.title3,
    animationName: { default: stepIn, [reduce]: 'none' },
    animationDuration: '.25s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  cookTextCover: { fontSize: typeScale.headline, lineHeight: leading.headline, letterSpacing: tracking.headline },
  cookControls: { display: 'flex', alignItems: 'center', gap: space.sm, width: '100%', justifyContent: 'center' },
  cookMeta: { color: app.label2, fontSize: typeScale.caption1, letterSpacing: tracking.caption1 },
  timeline: {
    width: '100%',
    height: space.sm,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: app.fill3
  },
  timelineFill: (progress: number) => ({
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.orangeDark,
    transformOrigin: 'left center',
    transform: `scaleX(${progress / 100})`,
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.push
  }),
  // Editor
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: space.sm },
  fieldRow: { display: 'flex', alignItems: 'flex-start', gap: space.sm, minWidth: 0 },
  fieldGrow: { flexGrow: 1, minWidth: 0 },
  fieldNum: {
    width: 22,
    flexShrink: 0,
    paddingTop: space.xs,
    textAlign: 'center',
    fontFamily: fonts.rounded,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.bold,
    color: app.label2
  },
  actions: { display: 'flex', alignItems: 'center', gap: space.sm, paddingBottom: space.sm },
  actionGrow: { flexGrow: 1, minWidth: 0 },
  saveButton: { width: '100%' },
  danger: { color: colors.redDark },
  tickDone: {
    animationName: { default: tickPop, [reduce]: 'none' },
    animationDuration: '.25s',
    animationTimingFunction: easing.pop
  }
})
