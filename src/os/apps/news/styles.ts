import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

export const styles = stylex.create({
  hdrMd: { fontSize: 17 },
  hdr18: { fontSize: 18 },
  openBtn: { marginLeft: 'auto', color: colors.blueDark, fontSize: 15, fontWeight: 500 },
  lead: {
    marginInline: 16,
    marginBottom: 14,
    borderRadius: 16,
    paddingBlock: 16,
    paddingInline: 16,
    color: colors.white,
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(0,0,0,.22)'
  },
  kicker: { fontSize: 11, fontWeight: 700, letterSpacing: 0.8, opacity: 0.8 },
  leadTitle: { fontSize: 21, fontWeight: 700, lineHeight: 1.25, marginTop: 6 },
  leadMeta: { fontSize: 12, opacity: 0.8, marginTop: 8 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingInline: 16,
    paddingBottom: 11,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)',
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  title: { display: 'block', fontSize: 15, fontWeight: 600 },
  meta: { fontSize: 13, color: colors.grey, lineHeight: 1.35, maxHeight: '2.7em', overflow: 'hidden' },
  thumb: { width: 56, height: 56, borderRadius: 9, flexShrink: 0 },
  tint: (bg: string) => ({ backgroundImage: bg }),
  pad20: { paddingBlock: 20, paddingInline: 20 },
  hero: { height: 130, marginInline: 16, marginBottom: 14, borderRadius: 14 },
  head: { paddingInline: 18, paddingBottom: 14 },
  storyTitle: { fontSize: 23, fontWeight: 700, lineHeight: 1.24 },
  mt8: { marginTop: 8 },
  cmt: {
    paddingBlock: 10,
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.12)',
    fontSize: 14,
    lineHeight: 1.45
  },
  cmtAuthor: { display: 'block', fontSize: 12, color: colors.grey, marginBottom: 3 }
})
