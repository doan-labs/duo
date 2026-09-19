import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const TOOL = {
  width: 30,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  borderRadius: appAppearance.settingsBorderRadius3,
  borderWidth: 0,
  backgroundColor: 'transparent',
  color: colors.white,
  cursor: 'pointer',
  padding: 0
} as const

export const styles = stylex.create({
  root: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: appAppearance.calendarPane,
    color: colors.white,
    fontSize: appAppearance.settingsFontSize,
    userSelect: 'none'
  },
  // Sidebar
  side: {
    width: 210,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.calendarSidebar,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.calendarGrid
  },
  sideBar: { display: 'flex', justifyContent: 'flex-end', gap: 4, paddingTop: 8, paddingRight: 10, paddingBottom: 8 },
  tool: TOOL,
  toolOn: { backgroundColor: appAppearance.calendarSegmentOn },
  plain: { width: 24 },
  sideList: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingInline: 10 },
  group: {
    color: colors.grey,
    fontSize: appAppearance.settingsFontSize2,
    fontWeight: appAppearance.settingsFontWeight,
    paddingTop: 12,
    paddingBottom: 6,
    paddingLeft: 10
  },
  cal: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 28,
    paddingInline: 10,
    borderRadius: appAppearance.settingsBorderRadius3,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover }
  },
  check: { width: 14, height: 14, margin: 0, cursor: 'pointer' },
  tint: (c: 'blue' | 'yellow') => ({ accentColor: c === 'blue' ? colors.blueDark : colors.yellow }),
  mini: {
    flexShrink: 0,
    marginInline: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.calendarGrid
  },
  miniHdr: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: 8,
    marginBottom: 8,
    fontWeight: appAppearance.settingsFontWeight,
    color: colors.grey
  },
  arrow: { ...TOOL, width: 20, height: 20, color: colors.grey },
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 6, textAlign: 'center' },
  miniWd: {
    fontSize: appAppearance.calendarFontSize4,
    fontWeight: appAppearance.settingsFontWeight,
    color: colors.grey
  },
  miniDay: {
    fontSize: appAppearance.calendarFontSize4,
    fontWeight: appAppearance.settingsFontWeight,
    width: 18,
    height: 18,
    display: 'grid',
    placeItems: 'center',
    borderRadius: appAppearance.settingsBorderRadius,
    justifySelf: 'center'
  },
  miniToday: { backgroundColor: colors.red, color: colors.white },
  // Main pane
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingRight: 14,
    paddingBottom: 6,
    paddingLeft: 14,
    flexShrink: 0
  },
  seg: {
    display: 'flex',
    padding: 2,
    borderRadius: appAppearance.settingsBorderRadius3,
    backgroundColor: appAppearance.calendarSegment
  },
  segBtn: {
    ...TOOL,
    width: 'auto',
    height: 22,
    paddingInline: 12,
    fontSize: appAppearance.settingsFontSize,
    fontFamily: 'inherit'
  },
  segOn: { backgroundColor: appAppearance.calendarSegmentOn, boxShadow: appAppearance.photosSegmentBoxShadow },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 30,
    flexShrink: 0
  },
  title: { margin: 0, fontSize: appAppearance.settingsFontSize5, fontWeight: appAppearance.calendarFontWeight },
  titleSm: { fontSize: appAppearance.podcastsFontSize },
  titleRowSm: { paddingLeft: 14 },
  nav: { display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 },
  navBtn: {
    ...TOOL,
    width: 24,
    height: 24,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.calendarSegment,
    fontFamily: 'inherit'
  },
  todayBtn: {
    width: 'auto',
    paddingInline: 12,
    borderRadius: appAppearance.settingsBorderRadius2,
    fontSize: appAppearance.settingsFontSize
  },
  wds: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7,1fr)',
    flexShrink: 0,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.calendarGrid
  },
  wd: {
    textAlign: 'right',
    paddingRight: 16,
    fontSize: appAppearance.settingsFontSize3,
    fontWeight: appAppearance.settingsFontWeight2
  },
  grid: {
    flexGrow: 1,
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(7,1fr)',
    gridTemplateRows: 'repeat(6,1fr)'
  },
  day: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingTop: 6,
    paddingRight: 10,
    borderRightWidth: { default: 1, ':nth-child(7n)': 0 },
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.calendarGrid,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.calendarGrid
  },
  weekend: { backgroundColor: appAppearance.calendarWeekend },
  num: {
    whiteSpace: 'nowrap',
    minWidth: 24,
    height: 24,
    paddingInline: 4,
    display: 'grid',
    placeItems: 'center',
    fontSize: appAppearance.settingsFontSize4,
    fontWeight: appAppearance.settingsFontWeight2,
    borderRadius: appAppearance.settingsBorderRadius2
  },
  dim: { color: colors.grey },
  today: { backgroundColor: colors.red, color: colors.white, fontWeight: appAppearance.settingsFontWeight },
  // Home-screen widget
  calWidget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.calendarBackgroundColor,
    color: colors.black
  },
  calDay: { color: colors.red, textTransform: 'uppercase', letterSpacing: 0.4 },
  calNum: {
    fontSize: appAppearance.calendarFontSize3,
    fontWeight: appAppearance.musicFontWeight2,
    lineHeight: 1.05,
    letterSpacing: -1
  },
  calEv: {
    marginTop: 'auto',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.orange,
    paddingLeft: 7,
    fontSize: appAppearance.calendarFontSize4,
    lineHeight: 1.35,
    fontWeight: appAppearance.musicFontWeight2
  },
  calSub: { fontWeight: appAppearance.calendarFontWeight, opacity: 0.55 }
})
