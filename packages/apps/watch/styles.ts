import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  face: {
    width: 132,
    height: 162,
    borderRadius: appAppearance.watchBorderRadius,
    backgroundColor: colors.black,
    boxShadow: appAppearance.watchBoxShadow,
    marginTop: 14,
    marginInline: 'auto',
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    color: colors.white
  },
  date: {
    fontSize: appAppearance.musicFontSize3,
    color: colors.orange,
    fontWeight: appAppearance.musicFontWeight2,
    letterSpacing: 0.6
  },
  time: {
    fontWeight: appAppearance.musicFontWeight2,
    fontSize: appAppearance.musicFontSize4,
    lineHeight: 1,
    fontFamily: appAppearance.watchFontFamily,
    letterSpacing: -1
  },
  mini: { transform: 'scale(.42)', marginBlock: -26 },
  center: { textAlign: 'center' },
  name: { fontWeight: appAppearance.musicFontWeight2 },
  hdrSm: { fontSize: appAppearance.musicFontSize5, marginTop: 10 },
  darkRow: {
    backgroundColor: appAppearance.memosBackgroundColor,
    borderBottomColor: appAppearance.musicBorderBottomColor
  }
})
