import {
  app,
  appAppearance,
  colors,
  fonts,
  glass,
  leading,
  motion,
  radius,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  // The pad reads its height off the body, so the readout is never pushed off the top.
  body: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', containerType: 'size' },

  // Top chrome: the mode menu on the left, history and friends on the right.
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.sm,
    paddingRight: space.sm,
    paddingBottom: 0,
    paddingLeft: space.sm
  },
  barSide: { display: 'flex', gap: space.xs, alignItems: 'center' },
  tool: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.circle,
    backgroundColor: appAppearance.calculatorKey,
    color: colors.white,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  toolOn: { backgroundColor: colors.orange },
  modeMenu: { position: 'absolute', top: 46, left: 8, minWidth: 190, zIndex: 8 },

  // Pad wraps readout + keys in one centered column so the number right-aligns
  // over the rightmost key on any display width.
  pad: { display: 'flex', flexDirection: 'column', alignSelf: 'center' },

  // Readout: the typed trail in caption type over a number that shrinks to fit.
  readout: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingInline: space.xl,
    paddingBottom: space.xs,
    gap: space.xxs,
    minHeight: 96
  },
  trail: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    color: app.label2,
    minHeight: leading.callout
  },
  annunc: {
    display: 'flex',
    gap: space.sm,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    color: app.label2,
    minHeight: leading.footnote
  },
  numWrap: {
    width: '100%',
    height: typeScale.displayLg,
    lineHeight: 1,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end'
  },
  num: {
    display: 'inline-block',
    fontSize: typeScale.displayLg,
    fontWeight: weight.thin,
    color: colors.white,
    whiteSpace: 'nowrap',
    transformOrigin: 'right bottom'
  },

  // Keypads. Columns size off the container height: cqh is the body's height.
  keys: {
    display: 'grid',
    justifyContent: 'center',
    gap: space.sm,
    paddingInline: 14,
    paddingBottom: 12
  },
  keysBasic: {
    gridTemplateColumns: 'repeat(4, min(72px, (100cqh - 160px) / 5))'
  },
  keysConv: {
    // Convert trades the readout for rows + the category strip (~330px).
    gridTemplateColumns: 'repeat(4, min(72px, max(24px, (100cqh - 330px) / 5)))'
  },
  keysBasicSci: {
    // Under the scientific block both grids share the budget: 10 rows.
    gridTemplateColumns: 'repeat(4, min(64px, (100cqh - 210px) / 10, (100cqw - 70px) / 4))'
  },
  keysSci: {
    gridTemplateColumns: 'repeat(6, min(52px, (100cqh - 210px) / 10, (100cqw - 76px) / 6))'
  },
  key: {
    aspectRatio: 1,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.calculatorKey,
    color: colors.white,
    fontSize: typeScale.title1,
    lineHeight: 1,
    display: 'grid',
    placeItems: 'center',
    transitionProperty: 'transform, filter',
    transitionDuration: `${motion.pressDuration}, .1s`,
    transform: { default: null, ':active': motion.press },
    filter: { default: null, ':active': 'brightness(1.5)' }
  },
  keySci: {
    aspectRatio: 'auto',
    borderRadius: radius.pill,
    fontSize: typeScale.body,
    fontWeight: weight.regular,
    height: 'min(52px, (100cqh - 210px) / 10)'
  },
  g: { backgroundColor: appAppearance.calculatorKeyLight, color: colors.black },
  o: { backgroundColor: colors.orange },
  on: { backgroundColor: colors.white, color: colors.black },
  off: { opacity: 0.35, pointerEvents: 'none' },
  // The zero spans two columns, so it is a capsule rather than a disc.
  z: {
    gridColumn: 'span 2',
    aspectRatio: 'auto',
    borderRadius: radius.pill,
    textAlign: 'left',
    paddingLeft: 28,
    justifyItems: 'start'
  },
  keysRow: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: space.lg },
  keysCol: { flexDirection: 'column', alignItems: 'center', gap: space.sm },

  // History and sheets slide up over the pad.
  sheet: {
    position: 'absolute',
    inset: 0,
    zIndex: 6,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  sheetBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingBottom: space.xs,
    paddingLeft: space.lg
  },
  sheetTitle: { fontSize: typeScale.headline, fontWeight: weight.semibold, lineHeight: leading.headline },
  sheetBody: { flexGrow: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' },
  histRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  histTap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: space.xxs,
    flexGrow: 1,
    minWidth: 0,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.xs,
    textAlign: 'right',
    color: colors.white,
    transitionProperty: 'background-color',
    transitionDuration: '.2s',
    backgroundColor: { default: null, ':active': app.fill2 }
  },
  histExpr: {
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    color: app.label2,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  histRes: { fontSize: typeScale.title1, lineHeight: leading.title1, fontWeight: weight.thin },
  empty: {
    display: 'grid',
    placeItems: 'center',
    minHeight: 160,
    color: app.label3,
    fontSize: typeScale.callout,
    lineHeight: leading.callout
  },

  // Convert mode: two value rows and a category strip over the same keypad.
  convRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    paddingInline: space.lg,
    paddingBottom: space.sm,
    flexShrink: 0
  },
  convRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingBottom: space.sm,
    paddingLeft: space.md,
    borderRadius: radius.lg,
    backgroundColor: appAppearance.calculatorKey
  },
  convRowOn: { boxShadow: `inset 0 0 0 1.5px ${colors.orange}` },
  convTap: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    justifyContent: 'flex-end',
    textAlign: 'right',
    color: colors.white
  },
  convVal: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.thin,
    color: colors.white,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flexShrink: 1
  },
  convUnit: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    color: colors.orange,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    fontWeight: weight.medium,
    flexShrink: 0
  },
  convSwap: {
    alignSelf: 'center',
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.calculatorKeyLight,
    color: colors.black
  },
  catStrip: {
    display: 'flex',
    gap: space.xs,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingInline: space.lg,
    paddingBottom: space.sm,
    scrollbarWidth: 'none',
    flexShrink: 0
  },
  cat: {
    flexShrink: 0,
    paddingTop: space.xs,
    paddingRight: space.md,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.calculatorKey,
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  catOn: { backgroundColor: colors.orange, color: colors.black },
  fxNote: {
    paddingInline: space.lg,
    paddingBottom: space.xs,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label3,
    flexShrink: 0
  },
  convMenu: {
    position: 'absolute',
    right: space.md,
    top: '18%',
    maxHeight: '56%',
    minWidth: 180,
    overflowY: 'auto',
    zIndex: 7
  },

  // Math Notes: a page of lines, each evaluated inline.
  notes: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    paddingTop: 44,
    paddingInline: space.lg,
    paddingBottom: space.xxl
  },
  nLine: { position: 'relative', minHeight: 32, display: 'flex', alignItems: 'baseline', gap: space.sm },
  nInput: {
    flexGrow: 1,
    minWidth: 0,
    fontFamily: fonts.system,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    color: colors.white,
    backgroundColor: 'transparent',
    paddingTop: space.xxs,
    paddingBottom: space.xxs
  },
  nText: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    color: colors.white,
    paddingTop: space.xxs,
    paddingBottom: space.xxs,
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap'
  },
  nRes: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    color: colors.orange,
    fontWeight: weight.medium,
    flexShrink: 0
  },
  nErr: { fontSize: typeScale.caption1, lineHeight: leading.caption1, color: app.label3, fontStyle: 'italic' },
  nGraph: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xxs,
    paddingTop: space.xxs,
    paddingRight: space.sm,
    paddingBottom: space.xxs,
    paddingLeft: space.sm,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.calculatorKey,
    color: colors.orange,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  nMore: {
    alignSelf: 'flex-start',
    color: app.label3,
    fontSize: typeScale.title3,
    minHeight: 44,
    minWidth: 44
  },
  nHint: {
    paddingTop: space.xxl,
    color: app.label3,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    textAlign: 'center'
  },

  // The ink canvas floats over the notes page while the pen tool is on.
  inkWrap: { position: 'absolute', inset: 0, zIndex: 5, touchAction: 'none' },
  inkCanvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    touchAction: 'none',
    cursor: 'crosshair'
  },
  inkBar: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    display: 'flex',
    gap: space.xs
  },
  inkGhost: {
    color: app.label3,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    textAlign: 'center',
    paddingTop: space.xxl,
    pointerEvents: 'none'
  },

  // Graphs: a sheet with a plot canvas and the equation chips under it.
  graphPlot: { position: 'relative', flexGrow: 1, minHeight: 0, margin: space.lg, marginTop: space.xs },
  plotBox: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: appAppearance.calculatorKey,
    touchAction: 'none',
    cursor: 'grab'
  },
  plotSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },
  plotCanvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },
  grid: { stroke: app.separator, strokeWidth: 1 },
  axis: { stroke: app.label2, strokeWidth: 1.2 },
  gridText: { fill: app.label3, fontSize: typeScale.caption2 },
  graphList: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    paddingInline: space.lg,
    paddingBottom: space.xl,
    maxHeight: '34%',
    overflowY: 'auto'
  },
  gEq: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    color: colors.white
  },
  gDot: { width: 10, height: 10, borderRadius: radius.circle, flexShrink: 0 },
  gExpr: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  gSlider: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xxs,
    paddingBottom: space.xxs,
    paddingLeft: space.xxl,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote
  },
  gVar: { color: colors.white, fontWeight: weight.medium, minWidth: 14 },
  slider: { flexGrow: 1, accentColor: colors.orange, minWidth: 0 },
  gVal: { minWidth: 44, textAlign: 'right' },
  mini: {
    display: 'grid',
    placeItems: 'center',
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    color: app.label2,
    transitionProperty: 'transform, color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  dropHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    color: app.label3,
    fontSize: typeScale.callout,
    pointerEvents: 'none',
    textAlign: 'center'
  }
})
