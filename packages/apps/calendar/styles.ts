import {
  app,
  appAppearance,
  colors,
  easing,
  fonts,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

/**
 * The sheet's own rule, a third of the weight of the UIKit separator: seven of
 * these cross every week.
 *
 * The four zeroes are load-bearing. `border-style: solid` on its own gives every
 * side CSS's initial `border-width`, which is `medium` and computes to 3px: a
 * side collapses to nothing only when its *style* is `none`. So a cell asking
 * for one hairline down its left drew three fat ones on its other edges, and a
 * week boundary came out as the cell's 3px bottom, a 2px gap and the next week's
 * top: a double line. Spread this first, then name the one side that gets a width.
 */
const ZERO = { borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0 } as const
const RULE = { borderStyle: 'solid', borderColor: appAppearance.calendarGrid, ...ZERO } as const
/** The chrome around the sheet: the sidebar's edge, where a real separator belongs. */
const EDGE = { borderStyle: 'solid', borderColor: app.separator, ...ZERO } as const

// Paging a calendar moves the sheet the way you asked it to, so back and forward
// come in from the side they point at and a new view rises into place.
const fromLeft = stylex.keyframes({ from: { opacity: 0, transform: 'translateX(-22px)' } })
const fromRight = stylex.keyframes({ from: { opacity: 0, transform: 'translateX(22px)' } })
const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(8px)' } })
const slideIn = stylex.keyframes({ from: { opacity: 0, transform: 'translateX(-100%)' } })

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
  /** A block in Day and Week: the calendar's colour as a wash, with its own text on top, as iOS draws them. */
  soft: (c?: string) => ({ backgroundColor: `color-mix(in srgb, ${c} 35%, transparent)`, color: c }),
  // minmax(0,1fr): a long event title must not widen its day past the pane.
  cols: (n: number) => ({ gridTemplateColumns: `44px repeat(${n},minmax(0,1fr))` }),
  laneCols: (n: number) => ({ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }),
  span: (from: number, len: number) => ({ top: (from / 60) * 44, height: (len / 60) * 44 }),
  at: (min: number) => ({ top: (min / 60) * 44 }),
  // Paging a sheet slides it; arriving at a new view raises it.
  anim: { animationDuration: '.26s', animationTimingFunction: easing.pop, animationFillMode: 'both' },
  fromLeft: { animationName: fromLeft },
  fromRight: { animationName: fromRight },
  rise: { animationName: rise },
  // Sidebar
  side: {
    width: 210,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.calendarSidebar,
    ...EDGE,
    borderRightWidth: 1,
    animationName: slideIn,
    animationDuration: '.28s',
    animationTimingFunction: easing.pop
  },
  sideBar: { display: 'flex', justifyContent: 'flex-end', gap: 4, paddingTop: 8, paddingRight: 10, paddingBottom: 8 },
  sideList: { flexGrow: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', paddingInline: 10 },
  group: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    paddingTop: 14,
    paddingBottom: 4,
    paddingLeft: 8
  },
  cal: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    height: 28,
    paddingInline: 8,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover },
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    letterSpacing: tracking.subheadline,
    textAlign: 'left',
    transitionProperty: 'background-color',
    transitionDuration: '.15s',
    transitionTimingFunction: easing.out,
    cursor: 'pointer'
  },
  calName: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  /** A calendar that is off keeps its colour in the box and loses it in the name, as macOS greys it. */
  off: { color: app.label3 },
  inbox: { padding: 16, width: 220, textAlign: 'center' },
  // Apple's mini month is not a card. It has no box, no rule and no well: the
  // sidebar's own ground carries it and the air above the header is the whole
  // separation. A stroked rounded rect here is the single thing that reads as a
  // web widget instead of a sidebar.
  mini: { flexShrink: 0, paddingInline: 10, paddingTop: 6, paddingBottom: 14 },
  /** The gap under the month is one more row of the grid, no larger: Apple's stack is even top to bottom. */
  miniHdr: { display: 'flex', alignItems: 'center', paddingBottom: 2 },
  /** The month reads as a title, in the label's own white; only the chevrons are grey. */
  miniTitle: {
    flexGrow: 1,
    textAlign: 'center',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    color: colors.white
  },
  // Apple's cell is wider than it is tall, about 27 points of column to 24 of
  // row, and every number in it is book weight. Setting them semibold is what
  // made this thumbnail read as a table of data rather than a calendar.
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 6, textAlign: 'center' },
  miniWd: {
    height: 18,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.regular,
    color: app.label2
  },
  miniDay: {
    fontSize: typeScale.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.regular,
    fontFamily: fonts.system,
    // Tabular: a column of 1s must sit under a column of 28s, or the grid wobbles.
    fontVariantNumeric: 'tabular-nums',
    // Two thirds of the column, the proportion Apple gives the disc: any fatter
    // and today's red touches the days either side of it.
    width: 18,
    height: 18,
    padding: 0,
    borderWidth: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.circle,
    justifySelf: 'center',
    color: 'inherit',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover },
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'background-color, color, transform',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.pop,
    cursor: 'pointer'
  },
  /** A day the year grid leaves blank still holds its row, so twelve months line up. */
  miniGap: { height: 18 },
  /**
   * A day from the next month is as quiet as the weekday letter over it, not
   * quieter: Apple still expects you to read the 1st of October off this grid.
   * Declared above today, so the 20th keeps white on red in a month it spills into.
   */
  miniOut: { color: app.label2 },
  miniToday: { backgroundColor: colors.red, color: colors.white },
  miniPicked: { backgroundColor: app.fill },
  // Main pane
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topBar: {
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
  search: { flexGrow: 1, minWidth: 0, maxWidth: 280, height: 26 },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 16,
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
    // The ramp's own leading: without it the line box clips the p in September.
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.regular
  },
  titleSm: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
  nav: { display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 },
  todayBtn: {
    height: 24,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: { default: app.fill, ':hover': appAppearance.calendarHover },
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'background-color, transform',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop,
    cursor: 'pointer'
  },
  // Month. Apple's sheet is ruled both ways and shades the weekend; the rules are
  // faint enough that a multi-day bar reads as one bar straight over them.
  // The last week clears the home indicator the shell draws over the app.
  month: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: 14 },
  /** The weeks alone, so month-view.tsx can ask their height without the weekday row in it. */
  sheet: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  wds: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', flexShrink: 0, paddingBottom: 5 },
  wd: {
    textAlign: 'center',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2
  },
  wdOff: { color: app.label3 },
  week: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'repeat(7,1fr)',
    // The lanes come from styles.lanes: month-view.tsx counts how many the week
    // can hold. Dividing the week between a fixed number instead gave each lane
    // whatever was left over, which is a 38px slab on a tall sheet and an 11px
    // slot on a six-week one, and 11px cuts the descenders off its own title.
    gridTemplateRows: 'auto 1fr',
    rowGap: 1,
    paddingTop: 2,
    ...RULE,
    borderTopWidth: 1
  },
  /**
   * A lane is one line of caption text, never a share of the week: the events
   * sit under the number at the size Apple draws them and the day keeps the
   * rest as air. LANE in month-view.tsx is this height plus the row gap.
   */
  lanes: (n: number) => ({ gridTemplateRows: `auto repeat(${n},18px) 1fr` }),
  // On the cover a title would be four letters and an ellipsis, so the day keeps
  // its dots and opens on Day, the way iPhone draws a month: no column rules, no
  // weekend shading, the number centred in its week with its dots under it.
  weekSm: { gridTemplateRows: 'auto 12px', alignContent: 'center' },
  dots: { gridRow: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden' },
  colAt: (i: number) => ({ gridColumn: i + 1 }),
  slot: (col: number, span: number, row: number) => ({
    gridColumn: `${col + 1} / span ${span}`,
    gridRow: row
  }),
  /** The day itself, and the wash that marks it off or picks it. */
  cell: {
    gridRow: '1 / -1',
    transitionProperty: 'background-color',
    transitionDuration: '.2s',
    transitionTimingFunction: easing.out,
    cursor: 'default'
  },
  /** The rule down a day's left edge. The Mac sheet is ruled both ways; the phone's is not. */
  rule: { ...RULE, borderLeftWidth: 1 },
  weekend: { backgroundColor: appAppearance.calendarWeekend },
  /** macOS lifts the whole picked day, not just its number. */
  cellPicked: { backgroundColor: app.fill },
  num: {
    gridRow: 1,
    // Apple sets the month's numbers against the right edge of their day.
    justifySelf: 'end',
    marginInline: 5,
    minWidth: 20,
    height: 20,
    paddingInline: 5,
    display: 'grid',
    placeItems: 'center',
    whiteSpace: 'nowrap',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    borderRadius: radius.pill,
    transitionProperty: 'background-color, color',
    transitionDuration: '.2s',
    transitionTimingFunction: easing.pop
  },
  numOut: { color: app.label3 },
  /** The phone centres its numbers over the dots; only the Mac sheet hangs them right. */
  numMid: { justifySelf: 'center', marginInline: 0 },
  // Today is a disc, not a pill: a fixed square box with no padding to stretch it.
  disc: { width: 20, minWidth: 0, paddingInline: 0, borderRadius: radius.circle },
  today: { backgroundColor: colors.red, color: colors.white, fontWeight: weight.semibold },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    // No height of its own: the lane it lands in sets it, month and all-day row alike.
    marginInline: 3,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textAlign: 'left',
    overflow: 'hidden',
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'background-color, transform',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop,
    cursor: 'pointer'
  },
  /** All-day and multi-day: the calendar's colour carries the title, the way Apple bars them. */
  bar: { paddingInline: 6, borderRadius: radius.xs, color: colors.white, fontWeight: weight.medium },
  /** A timed event is its dot and its title; the time is in the day itself. */
  plain: {
    paddingInline: 3,
    borderRadius: radius.xs,
    backgroundColor: { default: 'transparent', ':hover': appAppearance.calendarHover }
  },
  more: { paddingInline: 3, color: app.label2, fontWeight: weight.medium },
  chipTitle: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  /** A hollow ring, the way Apple marks a timed event in the month sheet. */
  ring: (c?: string) => ({ borderColor: c }),
  ringDot: {
    width: 7,
    height: 7,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderStyle: 'solid',
    flexShrink: 0
  },
  dot: { width: 5, height: 5, borderRadius: radius.circle, flexShrink: 0 },
  // Day and Week
  tgHead: { display: 'grid', flexShrink: 0, ...RULE, borderBottomWidth: 1 },
  tgDay: {
    gridRow: 1,
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 5,
    ...RULE,
    borderLeftWidth: 1,
    borderBottomWidth: 1
  },
  tgNum: {
    minWidth: 22,
    height: 22,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.subheadline,
    fontWeight: weight.medium,
    borderRadius: radius.circle,
    transitionProperty: 'background-color, color',
    transitionDuration: '.2s',
    transitionTimingFunction: easing.pop
  },
  /** The gutter above the hours: no rule, so the head's hairline starts at the first day. */
  tgGutter: { gridRow: 1, gridColumn: 1, ...RULE, borderBottomWidth: 1 },
  allDayLabel: {
    gridRow: 2,
    gridColumn: 1,
    alignSelf: 'center',
    fontSize: typeScale.caption2,
    color: app.label2,
    textAlign: 'right',
    paddingRight: 6
  },
  /** The empty day behind the all-day lanes, there to carry the column rule and the weekend wash. */
  allDayCell: { gridRow: 2, ...RULE, borderLeftWidth: 1 },
  allDay: {
    gridRow: 2,
    display: 'grid',
    gridAutoRows: 16,
    rowGap: 1,
    minHeight: 22,
    paddingTop: 3,
    paddingBottom: 3
  },
  // No scrollbar: the head is a second grid, and a gutter here would knock the two out of line.
  tgScroll: { flexGrow: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 14 },
  tgBody: { position: 'relative', display: 'grid', height: 44 * 24 },
  hours: { position: 'relative' },
  // Pinned to its own line and centred on it, the way Apple hangs the hours.
  hour: {
    position: 'absolute',
    right: 6,
    fontSize: typeScale.caption2,
    color: app.label2,
    transform: 'translateY(-50%)'
  },
  col: {
    position: 'relative',
    ...RULE,
    borderLeftWidth: 1,
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
    // The solid edge in the calendar's own colour, the way a block is banded in Calendar.
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: 'currentColor',
    // A block is 44px for an hour and taller for a meeting. The 4px corner that
    // suits an 18px month chip is a square edge at that size; this is the step up.
    borderRadius: radius.sm,
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textAlign: 'left',
    overflow: 'hidden',
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'transform, filter',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop,
    filter: { default: null, ':hover': 'brightness(1.15)' },
    cursor: 'pointer'
  },
  /** Now, drawn the way Apple draws it: pale across the week, solid with a dot on today. */
  nowFaint: {
    position: 'absolute',
    left: 44,
    right: 0,
    height: 1,
    backgroundColor: `color-mix(in srgb, ${colors.red} 45%, transparent)`,
    pointerEvents: 'none'
  },
  nowPill: {
    position: 'absolute',
    left: 2,
    paddingInline: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    color: colors.white,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    transform: 'translateY(-50%)',
    pointerEvents: 'none'
  },
  now: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.red,
    pointerEvents: 'none',
    '::before': {
      content: '""',
      position: 'absolute',
      left: -3,
      top: -3,
      width: 7,
      height: 7,
      borderRadius: radius.circle,
      backgroundColor: colors.red
    }
  },
  // Year
  year: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
    gap: 16,
    paddingInline: 16,
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
    transitionProperty: 'color',
    transitionDuration: '.15s',
    transitionTimingFunction: easing.out,
    cursor: 'pointer'
  },
  // Search
  results: { flexGrow: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', paddingInline: 16, paddingTop: 4 },
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
    transitionProperty: 'background-color',
    transitionDuration: '.15s',
    transitionTimingFunction: easing.out,
    cursor: 'pointer'
  },
  // Event sheet
  form: { display: 'flex', flexDirection: 'column', gap: 10, padding: 16 },
  titleField: { fontSize: typeScale.body, fontWeight: weight.semibold, height: 32 },
  fieldLabel: { width: 60, color: colors.grey, flexShrink: 0 }
})

/** Back and forward come in from the side their arrow points at; anything else rises into place. */
export const enter = (dir: number) => (dir < 0 ? styles.fromLeft : dir > 0 ? styles.fromRight : styles.rise)
