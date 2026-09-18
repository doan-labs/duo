import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  hdrMd: { fontSize: appAppearance.messagesFontSize },
  hdr18: { fontSize: appAppearance.musicFontSize5 },
  openBtn: {
    marginLeft: 'auto',
    color: colors.blueDark,
    fontSize: appAppearance.musicFontSize,
    fontWeight: appAppearance.musicFontWeight3
  },
  lead: {
    marginInline: 16,
    marginBottom: 14,
    borderRadius: appAppearance.calendarFontSize,
    paddingBlock: 16,
    paddingInline: 16,
    color: colors.white,
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    cursor: 'pointer',
    boxShadow: appAppearance.newsBoxShadow
  },
  kicker: {
    fontSize: appAppearance.musicFontSize3,
    fontWeight: appAppearance.musicFontWeight,
    letterSpacing: 0.8,
    opacity: 0.8
  },
  leadTitle: {
    fontSize: appAppearance.newsFontSize,
    fontWeight: appAppearance.musicFontWeight,
    lineHeight: 1.25,
    marginTop: 6
  },
  leadMeta: { fontSize: appAppearance.calendarFontSize2, opacity: 0.8, marginTop: 8 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingInline: 16,
    paddingBottom: 11,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.messagesBorderBottomColor,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  title: { display: 'block', fontSize: appAppearance.musicFontSize, fontWeight: appAppearance.musicFontWeight2 },
  meta: {
    fontSize: appAppearance.musicFontSize6,
    color: colors.grey,
    lineHeight: 1.35,
    maxHeight: '2.7em',
    overflow: 'hidden'
  },
  thumb: { width: 56, height: 56, borderRadius: appAppearance.itunesBorderRadius, flexShrink: 0 },
  tint: (bg: string) => ({ backgroundImage: bg }),
  pad20: { paddingBlock: 20, paddingInline: 20 },
  hero: { height: 130, marginInline: 16, marginBottom: 14, borderRadius: appAppearance.musicBorderRadius },
  head: { paddingInline: 18, paddingBottom: 14 },
  storyTitle: { fontSize: appAppearance.newsFontSize2, fontWeight: appAppearance.musicFontWeight, lineHeight: 1.24 },
  mt8: { marginTop: 8 },
  cmt: {
    paddingBlock: 10,
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.newsBorderBottomColor,
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.45
  },
  cmtAuthor: { display: 'block', fontSize: appAppearance.calendarFontSize2, color: colors.grey, marginBottom: 3 }
})
