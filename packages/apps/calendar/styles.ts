import {
  app,
  appAppearance,
  colors,
  fonts,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const HAIRLINE = { borderStyle: 'solid', borderColor: app.separator } as const

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
  /** A hidden calendar keeps its colour as a ring rather than a fill, the way iOS marks one off. */
  ring: (c?: string) => ({ backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'solid', borderColor: c }),
  /** A block in Day and Week: the calendar's colour as a wash, with its own text on top, as iOS draws them. */
  soft: (c?: string) => ({ backgroundColor: `color-mix(in srgb, ${c} 35%, transparent)`, color: c }),
  // minmax(0,1fr): a long event title must not widen its day past the pane.
  cols: (n: number) => ({ gridTemplateColumns: `44px repeat(${n},minmax(0,1fr))` }),
  laneCols: (n: number) => ({ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }),
  spanCols: (n: number) => ({ gridColumn: `2 / span ${n}` }),
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
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    paddingTop: 14,
    paddingBottom: 4,
    paddingLeft: 10
  },
  cal: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 30,
    paddingInline: 10,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover },
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    letterSpacing: tracking.subheadline,
    textAlign: 'left',
    cursor: 'pointer'
  },
  /** The calendar's colour, filled when it is showing and hollow when it is not, as iOS lists them. */
  calDot: { width: 10, height: 10, borderRadius: radius.circle, flexShrink: 0 },
  calName: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  calCheck: { display: 'flex', color: app.link },
  off: { color: app.label3 },
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
  // Month. A sheet ruled week by week, not a spreadsheet: only the week hairline
  // is drawn, so a multi-day event can run across the days it covers as one bar.
  // The last week clears the home indicator the shell draws over the app.
  month: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: 14 },
  wds: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', flexShrink: 0, paddingBottom: 6 },
  wd: {
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2
  },
  week: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'repeat(7,1fr)',
    // The number row, then the lanes month-view.tsx packs events into.
    gridTemplateRows: 'auto repeat(3,15px)',
    columnGap: 2,
    rowGap: 1,
    paddingTop: 3,
    borderTopWidth: 1,
    ...HAIRLINE
  },
  // On the cover a title would be four letters and an ellipsis, so the day keeps
  // its dots and opens on Day, the way iPhone draws a month.
  weekSm: { gridTemplateRows: 'auto 12px' },
  dots: { gridRow: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' },
  colAt: (i: number) => ({ gridColumn: i + 1 }),
  slot: (col: number, span: number, row: number) => ({
    gridColumn: `${col + 1} / span ${span}`,
    gridRow: row
  }),
  cell: { gridRow: '1 / -1', cursor: 'default' },
  num: {
    gridRow: 1,
    justifySelf: 'center',
    minWidth: 22,
    height: 22,
    paddingInline: 6,
    display: 'grid',
    placeItems: 'center',
    whiteSpace: 'nowrap',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    borderRadius: radius.pill
  },
  numOut: { color: app.label3 },
  // Today and the picked day are discs, not pills: fixed square box, no padding to stretch it.
  disc: { width: 22, minWidth: 0, paddingInline: 0, borderRadius: radius.circle },
  today: { backgroundColor: colors.red, color: colors.white, fontWeight: weight.semibold },
  picked: { backgroundColor: app.fill },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    height: 15,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textAlign: 'left',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  /** All-day and multi-day: the calendar's colour carries the title, the way Apple bars them. */
  bar: { paddingInline: 6, borderRadius: radius.xs, color: colors.white, fontWeight: weight.medium },
  /** A timed event is its dot and its title; the time is in the day itself. */
  plain: {
    paddingInline: 2,
    borderRadius: radius.xs,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover }
  },
  more: { paddingInline: 6, color: app.label2, backgroundColor: appAppearance.calendarPane },
  chipTitle: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dot: { width: 5, height: 5, borderRadius: radius.circle, flexShrink: 0 },
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
  allDay: {
    minHeight: 20,
    display: 'grid',
    gridAutoRows: 15,
    columnGap: 2,
    rowGap: 1,
    paddingInline: 2,
    paddingBottom: 2
  },
  tgScroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 14 },
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
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textAlign: 'left',
    overflow: 'hidden',
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
    gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
    gap: 16,
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
