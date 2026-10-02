// Every fixed value comes from the kit scales; the board's geometry (cell and
// clue-gutter sizes) is computed at runtime and arrives through the dynamic
// blocks at the bottom. `light`/`dark` themes are applied on the root element
// by main.tsx, so `app.*` always resolves to the active appearance.
import {
  app,
  colors,
  easing,
  fonts,
  glass,
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

const cellPop = stylex.keyframes({
  '0%': { transform: 'scale(1)' },
  '40%': { transform: 'scale(1.18)' },
  '100%': { transform: 'scale(1)' }
})
// Popping back to the picker comes in from the left, mirroring sheet's
// right-side push so navigation reads as a stack either way.
const backIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateX(-30%)' },
  to: { opacity: 1, transform: 'translateX(0)' }
})
const toolIn = stylex.keyframes({
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.06)' },
  '100%': { transform: 'scale(1)' }
})

export const styles = stylex.create({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg,
    backgroundImage: `radial-gradient(90% 55% at 50% 0%,color-mix(in srgb, ${app.link} 9%, transparent),transparent 65%)`,
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    overflow: 'hidden',
    paddingTop: space.xl,
    paddingBottom: space.xxxl,
    paddingInline: space.xl,
    userSelect: 'none'
  },
  rootCover: {
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.xxl,
    paddingInline: space.md
  },
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  kicker: {
    color: app.link,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  title: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  titleCover: { fontSize: typeScale.title1, lineHeight: leading.title1 },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderRadius: radius.pill,
    backgroundColor: app.fill2,
    color: app.label2,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap'
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.xxs,
    minHeight: 20
  },
  statusName: { fontSize: typeScale.footnote, fontWeight: weight.semibold, whiteSpace: 'nowrap' },
  statusDim: { color: app.label2, fontSize: typeScale.footnote, fontWeight: weight.regular },
  statusDimAccent: { color: app.link, fontSize: typeScale.footnote, fontWeight: weight.semibold },
  statusTime: {
    color: app.fg,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums'
  },
  stage: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stageWide: { flexDirection: 'row', gap: space.xxxl },
  boardCard: {
    backgroundColor: app.surface,
    borderRadius: radius.lg,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: app.separator,
    boxShadow: shadow.card,
    padding: space.sm
  },
  grid: { display: 'grid', touchAction: 'none' },
  clueCorner: { backgroundColor: app.fill3 },
  rowClue: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.xs,
    paddingInlineEnd: space.xs,
    backgroundColor: app.fill3,
    borderStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 0
  },
  colClue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: app.fill3,
    borderStyle: 'solid',
    borderLeftWidth: 1,
    borderLeftColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0
  },
  clue: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    lineHeight: leading.caption2,
    fontVariantNumeric: 'tabular-nums',
    transitionProperty: 'color',
    transitionDuration: '.25s'
  },
  clueDim: { color: app.label3 },
  clueHot: { color: app.fg },
  cell: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '.16s, .3s'
  },
  cellRight: { borderRightWidth: 1, borderRightColor: app.label2 },
  cellBottom: { borderBottomWidth: 1, borderBottomColor: app.label2 },
  cellMajorTop: { borderTopColor: app.label2 },
  cellMajorLeft: { borderLeftColor: app.label2 },
  cellMajorRight: { borderRightColor: app.label2 },
  cellMajorBottom: { borderBottomColor: app.label2 },
  cellHot: { backgroundColor: app.fill3 },
  cellLive: { backgroundColor: app.fill2 },
  cellFilled: { backgroundColor: app.fg, color: app.fg },
  // Solving dissolves the grid so the picture reads as pixels, then the ink
  // settles cell by cell on the wave delay each FILLED cell already carries.
  cellDone: {
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  cellSolved: {
    animationName: { default: cellPop, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  cellFocus: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: app.link, outlineOffset: -2, zIndex: 1 },
  mark: {
    display: 'block',
    color: app.label3,
    width: '58%',
    height: '58%',
    transitionProperty: 'opacity',
    transitionDuration: '.2s'
  },
  markDone: { opacity: 0 },
  rail: { display: 'flex', flexDirection: 'column', gap: space.md, alignItems: 'stretch' },
  railCover: { alignSelf: 'stretch', gap: space.sm },
  railLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase',
    paddingBottom: space.xxs
  },
  // The editing toolbar is one well: tool choice next to the undo that drives it.
  toolBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    backgroundColor: app.fill3,
    borderRadius: radius.lg,
    paddingBlock: space.xs,
    paddingInline: space.xs
  },
  tools: { flexGrow: 1, display: 'flex', justifyContent: 'center' },
  toolBump: {
    animationName: { default: toolIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.spring
  },
  undoBtn: { width: 44, height: 44 },
  actions: { display: 'flex', gap: space.sm, justifyContent: 'center' },
  actionsWide: { flexDirection: 'column', alignItems: 'stretch' },
  actBtn: { flex: 1 },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    borderRadius: radius.md,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: app.fill3
  },
  metaRow: { display: 'flex', justifyContent: 'space-between', gap: space.md, fontSize: typeScale.caption1 },
  metaKey: { color: app.label2 },
  metaVal: { color: app.fg, fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' },
  armed: { backgroundColor: colors.red, color: colors.white },
  banner: {
    position: 'absolute',
    bottom: space.xxl,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 3
  },
  bannerCard: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: space.lg,
    paddingBlock: space.md,
    paddingInline: space.lg,
    borderRadius: radius.xl,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  bannerText: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  bannerTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontWeight: weight.bold
  },
  bannerSub: { color: app.label2, fontSize: typeScale.footnote },
  bannerActions: { display: 'flex', gap: space.sm },
  listScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    animationName: { default: backIn, [reduce]: 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.push,
    animationFillMode: 'backwards'
  },
  tierLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase',
    paddingTop: space.sm,
    paddingBottom: space.xxs
  },
  pickGroup: {
    backgroundColor: app.surface,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: app.separator,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  pickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderStyle: 'solid',
    borderWidth: 0,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomColor: app.separator,
    backgroundColor: { default: 'transparent', ':active': app.fill3 },
    textAlign: 'start',
    cursor: 'pointer',
    animationFillMode: 'backwards'
  },
  pickChev: { display: 'flex', alignItems: 'center', color: app.label3, flexShrink: 0 },
  pickDone: { color: colors.green, display: 'inline-flex' },
  pickDoneDark: { color: colors.greenDark },
  pickBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  pickName: { fontSize: typeScale.subheadline, fontWeight: weight.semibold },
  pickMeta: { color: app.label2, fontSize: typeScale.caption1, fontVariantNumeric: 'tabular-nums' },
  preview: {
    display: 'grid',
    flexShrink: 0,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: app.fill3
  },
  previewCell: { backgroundColor: app.fg },
  previewGap: { backgroundColor: 'transparent' },
  cellSize: (px: number) => ({ width: px, height: px }),
  clueW: (px: number) => ({ width: px }),
  clueH: (px: number) => ({ height: px }),
  gridTemplate: (cols: string, rows: string) => ({ gridTemplateColumns: cols, gridTemplateRows: rows })
})
