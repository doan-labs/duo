import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
  cell: { paddingTop: 8, paddingBottom: 8, fontSize: appAppearance.calendarFontSize },
  wd: { fontSize: appAppearance.calendarFontSize2, color: colors.grey, fontWeight: appAppearance.musicFontWeight2 },
  today: {
    backgroundColor: colors.red,
    color: colors.white,
    borderRadius: appAppearance.settingsBorderRadius,
    width: 38,
    height: 38,
    display: 'grid',
    placeItems: 'center',
    margin: 'auto',
    paddingTop: 0,
    paddingBottom: 0
  },
  events: { marginTop: 24 },
  event: { backgroundColor: colors.groupedLight },
  tag: { width: 4, height: 36, borderRadius: appAppearance.musicBorderRadius3, backgroundColor: colors.orange },
  title: { fontWeight: appAppearance.musicFontWeight2 },
  // `cal` above is the month grid, so the widget's own shell takes the longer name.
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
