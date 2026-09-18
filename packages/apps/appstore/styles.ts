import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  card: {
    marginRight: 16,
    marginBottom: 16,
    marginLeft: 16,
    borderRadius: appAppearance.musicFontSize5,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: appAppearance.appstoreBoxShadow,
    cursor: 'pointer'
  },
  top: {
    height: 170,
    paddingBlock: 16,
    paddingInline: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    color: colors.white
  },
  bg: (image: string) => ({ backgroundImage: image }),
  kicker: {
    fontSize: appAppearance.musicFontSize3,
    fontWeight: appAppearance.musicFontWeight,
    letterSpacing: 0.9,
    opacity: 0.85
  },
  title: {
    fontSize: appAppearance.appstoreFontSize,
    fontWeight: appAppearance.musicFontWeight,
    lineHeight: 1.15,
    marginTop: 4
  },
  blurb: {
    paddingBlock: 13,
    paddingInline: 15,
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.45,
    color: appAppearance.appstoreColor
  },
  hdr18: { fontSize: appAppearance.musicFontSize5 },
  icon: { width: 52, height: 52, borderRadius: appAppearance.calendarFontSize2, flexShrink: 0 },
  info: { flexGrow: 1, minWidth: 0 },
  name: { fontWeight: appAppearance.musicFontWeight2 },
  get: { position: 'relative', width: 66, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center' },
  ring: {
    width: 22,
    height: 22,
    borderRadius: appAppearance.settingsBorderRadius,
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: appAppearance.appstoreBorderColor,
    borderTopColor: colors.blueDark
  },
  open: { color: colors.blueDark }
})
