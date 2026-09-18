import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  sec: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingInline: 16,
    fontWeight: appAppearance.musicFontWeight,
    fontSize: appAppearance.calendarFontSize2,
    lineHeight: 1.7,
    backgroundColor: colors.fillThin,
    color: colors.grey2,
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  emoji: { fontSize: appAppearance.mailFontSize },
  grow: { flexGrow: 1 },
  name: { fontWeight: appAppearance.musicFontWeight3 },
  hdr17: { fontSize: appAppearance.messagesFontSize },
  viewerBody: { paddingTop: 14, paddingInline: 26, paddingBottom: 0, overflow: 'auto' },
  sheet: {
    backgroundColor: colors.white,
    color: appAppearance.homeColor4,
    aspectRatio: '1/1.3',
    borderRadius: appAppearance.musicBorderRadius2,
    boxShadow: appAppearance.previewBoxShadow,
    paddingTop: 22,
    paddingBottom: 22,
    paddingInline: 22,
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: appAppearance.healthAnimationTimingFunction,
    transformOrigin: 'top center'
  },
  zoom: (z: number) => ({ transform: `scale(${z})` }),
  bg: (img: string) => ({ backgroundImage: img }),
  tint: { height: 5, width: '44%', borderRadius: appAppearance.musicBorderRadius2 },
  title: {
    fontWeight: appAppearance.musicFontWeight,
    fontSize: appAppearance.messagesFontSize,
    lineHeight: 1.25,
    fontFamily: appAppearance.previewFontFamily,
    marginTop: 12,
    marginBottom: 8
  },
  line: { height: 6, borderRadius: appAppearance.musicBorderRadius2, marginBottom: 7 },
  lineFull: { backgroundColor: appAppearance.messagesBorderBottomColor, width: '100%' },
  lineShort: { backgroundColor: appAppearance.previewBackgroundColor, width: '58%' },
  figure: { height: 64, borderRadius: appAppearance.musicBorderRadius4, marginTop: 12 },
  cap: { textAlign: 'center', paddingBlock: 10, paddingInline: 10 },
  pager: { display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: 20 }
})
