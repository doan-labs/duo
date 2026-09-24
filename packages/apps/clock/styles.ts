import {
  app,
  appAppearance,
  colors,
  easing,
  glass,
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

export const styles = stylex.create({
  // ---------- shell ----------
  shell: { display: 'flex', flexGrow: 1, minHeight: 0, backgroundColor: app.bg },
  side: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: 236,
    paddingTop: space.lg,
    paddingInline: space.sm,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  sideTitle: {
    paddingInline: space.sm,
    marginBottom: space.md,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    fontWeight: weight.bold
  },
  sideItem: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 10,
    height: 40,
    paddingInline: 10,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill },
    color: app.fg,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    cursor: 'pointer',
    textAlign: 'left'
  },
  sideItemOn: { backgroundColor: appAppearance.clockTabOn },
  sideSym: { color: colors.orange },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, position: 'relative' },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.lg,
    paddingInline: space.xl,
    paddingBottom: space.xs
  },
  actions: { display: 'flex', alignItems: 'center', columnGap: 10 },
  round: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: app.fg,
    cursor: 'pointer'
  },
  editBtn: {
    height: 32,
    paddingInline: 14,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: app.fg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    cursor: 'pointer'
  },
  body: { flexGrow: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' },
  bodyNarrow: { paddingBottom: 96 },

  // ---------- floating tab bar (cover layout) ----------
  tabs: {
    position: 'absolute',
    left: '50%',
    bottom: 30,
    transform: 'translateX(-50%)',
    display: 'flex',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.tintDark,
    boxShadow: shadow.float,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 1,
    width: 70,
    height: 46,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.out
  },
  tabOn: { backgroundColor: appAppearance.clockTabOn, color: colors.orange },

  // ---------- list rows ----------
  list: { paddingInline: space.xl },
  row: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 10,
    minHeight: 56,
    paddingBlock: 6,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  rowLast: { borderBottomWidth: 0 },
  rowBtn: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 10,
    flexGrow: 1,
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    cursor: 'pointer'
  },
  cap: { color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  cap3: { color: app.label3, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  title: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold
  },

  // ---------- world clock ----------
  city: { display: 'flex', flexDirection: 'column', rowGap: 2, minWidth: 0, flexGrow: 1 },
  cityTime: {
    fontSize: typeScale.displayLg,
    lineHeight: 1,
    letterSpacing: tracking.title1,
    fontWeight: weight.thin,
    color: colors.white,
    fontVariantNumeric: 'tabular-nums'
  },
  period: { fontSize: typeScale.title3, lineHeight: leading.title3, color: app.label2, marginLeft: 4 },

  // ---------- alarms ----------
  alarmTime: {
    fontSize: typeScale.display,
    lineHeight: 1,
    letterSpacing: tracking.title1,
    fontWeight: weight.thin,
    fontVariantNumeric: 'tabular-nums'
  },
  dim: { opacity: 0.45 },
  minus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    flexShrink: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    color: colors.white,
    cursor: 'pointer'
  },

  // ---------- sheets ----------
  sheetWide: { width: 390 },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  sheetTitle: { fontSize: typeScale.headline, lineHeight: leading.headline, fontWeight: weight.semibold },
  sheetBtn: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    cursor: 'pointer'
  },
  sheetBtnBold: { fontWeight: weight.semibold },
  ghostBtn: { visibility: 'hidden', pointerEvents: 'none' },
  sheetBody: { maxHeight: 430, overflowY: 'auto', scrollbarWidth: 'none' },
  searchWrap: { padding: 10 },
  empty: { padding: 18, textAlign: 'center' },

  // ---------- wheel picker ----------
  wheels: { position: 'relative', display: 'flex', justifyContent: 'center', paddingBlock: 6 },
  wheel: {
    width: 62,
    height: 170,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    scrollSnapType: 'y mandatory',
    maskImage: appAppearance.clockWheelMask,
    WebkitMaskImage: appAppearance.clockWheelMask,
    borderWidth: 0,
    padding: 0,
    margin: 0,
    minWidth: 0
  },
  wheelWide: { width: 108 },
  wheelPad: { height: 68 },
  wheelItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    scrollSnapAlign: 'center',
    color: app.label3,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontVariantNumeric: 'tabular-nums'
  },
  wheelItemOn: { color: app.fg },
  wheelUnit: {
    alignSelf: 'center',
    paddingInline: 4,
    color: app.fg,
    fontSize: typeScale.body,
    lineHeight: leading.body
  },
  wheelHairline: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    height: 34,
    transform: 'translateY(-50%)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopStyle: 'solid',
    borderBottomStyle: 'solid',
    borderTopColor: app.separator,
    borderBottomColor: app.separator,
    pointerEvents: 'none'
  },

  // ---------- form rows inside sheets ----------
  formRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10,
    minHeight: 44,
    paddingInline: 14,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontSize: typeScale.body,
    lineHeight: leading.body,
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer'
  },
  formStatic: { cursor: 'default' },
  formValue: { display: 'flex', alignItems: 'center', columnGap: 6, color: app.label2 },
  dangerRow: { justifyContent: 'center', color: colors.red },

  // ---------- stopwatch ----------
  swFace: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 14,
    paddingTop: space.md,
    flexGrow: 1
  },
  swDigits: {
    fontSize: typeScale.displayXl,
    lineHeight: 1,
    letterSpacing: tracking.title1,
    fontWeight: weight.thin,
    color: colors.white,
    fontVariantNumeric: 'tabular-nums'
  },
  swLapNow: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    color: app.label2,
    fontVariantNumeric: 'tabular-nums'
  },
  swControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingInline: space.xl
  },
  swControlsWide: { maxWidth: 380 },
  swBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 84,
    height: 84,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    cursor: 'pointer'
  },
  swLap: { backgroundColor: appAppearance.clockLapFill, color: app.fg },
  swStart: { backgroundColor: appAppearance.clockStartFill, color: colors.green },
  swStop: { backgroundColor: appAppearance.clockStopFill, color: colors.red },
  dots: { display: 'flex', justifyContent: 'center', columnGap: 8, paddingBlock: 8 },
  dot: {
    width: 7,
    height: 7,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.clockLapFill,
    cursor: 'pointer'
  },
  dotOn: { backgroundColor: colors.white },
  lapRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    fontVariantNumeric: 'tabular-nums'
  },
  lapList: { width: '100%', paddingInline: space.xl },
  lapNum: { color: app.label2 },
  lapBest: { color: colors.green },
  lapWorst: { color: colors.red },

  // ---------- timers ----------
  timerGrid: { display: 'flex', flexWrap: 'wrap', gap: 14, paddingInline: space.xl, paddingBlock: space.sm },
  timerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 6,
    width: 210,
    height: 240,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: appAppearance.clockTabOn
  },
  timerLabel: { color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  timerBtns: { display: 'flex', columnGap: 10 },
  timerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 34,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.clockLapFill,
    color: app.fg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    cursor: 'pointer'
  },
  timerPause: { backgroundColor: appAppearance.clockStopFill, color: colors.orange },
  startBig: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.clockStartFill,
    color: colors.green,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    cursor: 'pointer'
  },
  pickerWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 4, paddingBlock: 4 },
  pickerRows: { width: '100%', maxWidth: 340, marginTop: 2, marginBottom: 12 },
  recentPlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.clockLapFill,
    color: colors.orange,
    cursor: 'pointer'
  },
  sectionHead: {
    paddingTop: space.md,
    paddingBottom: 4,
    paddingInline: space.xl,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    textTransform: 'uppercase',
    letterSpacing: tracking.caption2
  },

  // ---------- ringing overlay ----------
  ringing: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 4,
    backgroundColor: appAppearance.clockRingingScrim,
    zIndex: 10
  },
  ringingTime: {
    fontSize: typeScale.displayXl,
    lineHeight: 1,
    letterSpacing: tracking.title1,
    fontWeight: weight.thin,
    color: colors.white,
    fontVariantNumeric: 'tabular-nums'
  },
  ringingName: { color: app.label2, fontSize: typeScale.title3, lineHeight: leading.title3 },
  ringingBtns: { display: 'flex', columnGap: 18, marginTop: 30 },
  ringingBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 92,
    height: 92,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    cursor: 'pointer'
  },
  ringingStop: { backgroundColor: appAppearance.clockStopFill, color: colors.red },
  ringingSnooze: { backgroundColor: appAppearance.clockLapFill, color: app.fg },
  ringingGlyph: { color: colors.orange, marginBottom: 14 }
})
