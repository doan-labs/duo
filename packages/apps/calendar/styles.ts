import { app, appAppearance, colors, fonts, radius, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const HAIRLINE = { borderStyle: 'solid', borderColor: appAppearance.calendarGrid } as const

export const styles = stylex.create({
  root: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: appAppearance.calendarPane,
    color: colors.white,
    fontSize: typeScale.footnote,
    userSelect: 'none'
  },
  dim: { color: colors.grey },
  red: { color: colors.red },
  grow: { flexGrow: 1, minWidth: 0 },
  tint: (c?: string) => ({ backgroundColor: c }),
  ring: (c?: string) => ({ borderColor: c }),
  cols: (n: number) => ({ gridTemplateColumns: `44px repeat(${n},1fr)` }),
  span: (from: number, len: number) => ({ top: (from / 60) * 44, height: (len / 60) * 44 }),
  at: (min: number) => ({ top: (min / 60) * 44 }),
  // Sidebar
  side: {
    width: 210,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.calendarSidebar,
    borderRightWidth: 1,
    ...HAIRLINE
  },
  sideBar: { display: 'flex', justifyContent: 'flex-end', gap: 4, paddingTop: 8, paddingRight: 10, paddingBottom: 8 },
  sideList: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingInline: 10 },
  group: {
    color: colors.grey,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
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
    borderRadius: radius.sm,
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover }
  },
  inbox: { padding: 16, width: 220, textAlign: 'center' },
  mini: { flexShrink: 0, marginInline: 10, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, ...HAIRLINE },
  miniHdr: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontWeight: weight.semibold,
    color: colors.grey
  },
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 6, textAlign: 'center' },
  miniWd: {
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    color: colors.grey
  },
  miniDay: {
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    fontFamily: fonts.system,
    width: 18,
    height: 18,
    padding: 0,
    borderWidth: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.circle,
    justifySelf: 'center',
    color: 'inherit',
    backgroundColor: 'transparent',
    cursor: 'pointer'
  },
  miniToday: { backgroundColor: colors.red, color: colors.white },
  miniPicked: { backgroundColor: app.fill },
  // Main pane
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topBar: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 6,
    paddingRight: 14,
    paddingBottom: 6,
    paddingLeft: 14,
    flexShrink: 0
  },
  barSide: { display: 'flex', alignItems: 'center', gap: 4, flexBasis: 0, flexGrow: 1 },
  barEnd: { justifyContent: 'flex-end' },
  search: { position: 'absolute', right: 44, top: 6, width: 160, height: 24 },
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
  titleRowSm: { paddingLeft: 14 },
  title: {
    margin: 0,
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: typeScale.title1,
    fontWeight: weight.regular
  },
  titleSm: { fontSize: typeScale.title3 },
  nav: { display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 },
  todayBtn: {
    height: 24,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: app.fill,
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    cursor: 'pointer'
  },
  // Month
  wds: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7,1fr)',
    flexShrink: 0,
    paddingBottom: 6,
    borderBottomWidth: 1,
    ...HAIRLINE
  },
  wd: {
    textAlign: 'right',
    paddingRight: 16,
    fontSize: typeScale.subheadline,
    fontWeight: weight.medium
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
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 2,
    minHeight: 0,
    overflow: 'hidden',
    paddingTop: 6,
    paddingRight: 4,
    paddingLeft: 4,
    borderRightWidth: { default: 1, ':nth-child(7n)': 0 },
    borderBottomWidth: 1,
    ...HAIRLINE,
    cursor: 'default'
  },
  weekend: { backgroundColor: appAppearance.calendarWeekend },
  num: {
    alignSelf: 'flex-end',
    whiteSpace: 'nowrap',
    minWidth: 24,
    maxWidth: '100%',
    height: 24,
    marginRight: 2,
    paddingInline: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.body,
    fontWeight: weight.medium,
    borderRadius: radius.lg
  },
  today: { backgroundColor: colors.red, color: colors.white, fontWeight: weight.semibold },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    height: 18,
    paddingInline: 4,
    borderWidth: 0,
    borderRadius: radius.xs,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover },
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    textAlign: 'left',
    cursor: 'pointer',
    flexShrink: 0
  },
  chipAllDay: { color: colors.white, fontWeight: weight.medium },
  chipTitle: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: 'transparent',
    flexShrink: 0
  },
  // Day and Week
  tgHead: { display: 'grid', flexShrink: 0, borderBottomWidth: 1, ...HAIRLINE },
  tgDay: { display: 'flex', alignItems: 'center', gap: 6, paddingInline: 8, paddingBottom: 4 },
  tgNum: {
    minWidth: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.body,
    fontWeight: weight.medium,
    borderRadius: radius.lg
  },
  allDayLabel: { fontSize: typeScale.caption2, color: colors.grey, textAlign: 'right', paddingRight: 4 },
  allDay: { minHeight: 20, display: 'flex', flexDirection: 'column', gap: 2, paddingInline: 2, paddingBottom: 2 },
  tgScroll: { flexGrow: 1, minHeight: 0, overflow: 'auto' },
  tgBody: { display: 'grid', height: 44 * 24 },
  hours: { position: 'relative' },
  hour: {
    display: 'block',
    height: 44,
    paddingRight: 6,
    textAlign: 'right',
    fontSize: typeScale.caption2,
    color: colors.grey,
    transform: 'translateY(-6px)'
  },
  col: {
    position: 'relative',
    borderLeftWidth: 1,
    ...HAIRLINE,
    backgroundImage: appAppearance.calendarHourLines,
    backgroundSize: '100% 44px',
    cursor: 'default'
  },
  block: {
    position: 'absolute',
    left: 2,
    right: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
    paddingTop: 3,
    paddingInline: 6,
    borderWidth: 0,
    borderRadius: radius.xs,
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    textAlign: 'left',
    overflow: 'hidden',
    opacity: 0.9,
    cursor: 'pointer'
  },
  now: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.red,
    pointerEvents: 'none',
    '::before': {
      content: '""',
      position: 'absolute',
      left: -4,
      top: -3,
      width: 8,
      height: 8,
      borderRadius: radius.circle,
      backgroundColor: colors.red
    }
  },
  // Year
  year: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
    gap: 20,
    paddingInline: 30,
    paddingBottom: 20
  },
  yMonth: { display: 'flex', flexDirection: 'column', gap: 6 },
  yTitle: {
    alignSelf: 'flex-start',
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },
  // Search
  results: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingInline: 30, paddingTop: 4 },
  result: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 32,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover },
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    textAlign: 'left',
    cursor: 'pointer'
  },
  // Event sheet
  form: { display: 'flex', flexDirection: 'column', gap: 10, padding: 16 },
  titleField: { fontSize: typeScale.body, fontWeight: weight.semibold, height: 32 },
  fieldLabel: { width: 60, color: colors.grey, flexShrink: 0 }
})
