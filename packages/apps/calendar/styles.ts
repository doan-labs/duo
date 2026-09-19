import {
  appAppearance,
  colors,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  root: { backgroundColor: colors.white, color: colors.black },
  hdr: { color: colors.red },
  cal: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7,1fr)',
    textAlign: 'center',
    paddingInline: 12,
    rowGap: 6,
    columnGap: 0
  },
  cell: {
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout
  },
  wd: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: colors.grey,
    fontWeight: weight.semibold
  },
  today: {
    backgroundColor: colors.red,
    color: colors.white,
    borderRadius: radius.circle,
    width: 38,
    height: 38,
    display: 'grid',
    placeItems: 'center',
    margin: 'auto',
    paddingTop: 0,
    paddingBottom: 0
  },
  events: { marginTop: 24 },
  event: { backgroundColor: colors.grey6 },
  tag: { width: 4, height: 36, borderRadius: radius.xs, backgroundColor: colors.orange },
  title: { fontWeight: weight.semibold },
  // `cal` above is the month grid, so the widget's own shell takes the longer name.
  calWidget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.calendarPaper,
    color: colors.black
  },
  calDay: { color: colors.red, textTransform: 'uppercase', letterSpacing: tracking.caption2 },
  // The date is a numeral, so it is set solid rather than on the ramp's leading.
  calNum: {
    fontSize: typeScale.largeTitle,
    fontWeight: weight.semibold,
    lineHeight: 1,
    letterSpacing: tracking.largeTitle
  },
  calEv: {
    marginTop: 'auto',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.orange,
    paddingLeft: 7,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  },
  calSub: { fontWeight: weight.regular, opacity: 0.55 }
})
