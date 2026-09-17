import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
  cell: { paddingTop: 8, paddingBottom: 8, fontSize: 16 },
  wd: { fontSize: 12, color: colors.grey, fontWeight: 600 },
  today: {
    backgroundColor: colors.red,
    color: colors.white,
    borderRadius: '50%',
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
  tag: { width: 4, height: 36, borderRadius: 2, backgroundColor: colors.orange },
  title: { fontWeight: 600 },
  // `cal` above is the month grid, so the widget's own shell takes the longer name.
  calWidget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255,255,255,.78)',
    color: colors.black
  },
  calDay: { color: colors.red, textTransform: 'uppercase', letterSpacing: 0.4 },
  calNum: { fontSize: 31, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1 },
  calEv: {
    marginTop: 'auto',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.orange,
    paddingLeft: 7,
    fontSize: 10,
    lineHeight: 1.35,
    fontWeight: 600
  },
  calSub: { fontWeight: 400, opacity: 0.55 }
})
