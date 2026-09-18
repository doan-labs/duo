import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
  mono: {
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: colors.grey3,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontWeight: appAppearance.musicFontWeight3,
    flexShrink: 0
  },
  monoSize: (px: number, font: number, bg: string) => ({ width: px, height: px, fontSize: font, backgroundImage: bg }),
  rowName: { fontWeight: appAppearance.musicFontWeight3 },
  hdr17: { fontSize: appAppearance.messagesFontSize },
  head: { display: 'grid', justifyItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
  name: { fontSize: appAppearance.mailFontSize, fontWeight: appAppearance.musicFontWeight2 },
  acts: { display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 12, paddingBottom: 16 },
  act: { display: 'grid', justifyItems: 'center', gap: 5, color: colors.blue, fontSize: appAppearance.musicFontSize3 },
  actGlyph: {
    width: 46,
    height: 46,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.contactsBackgroundColor,
    display: 'grid',
    placeItems: 'center',
    fontSize: appAppearance.musicFontSize2,
    transitionProperty: 'transform',
    transitionDuration: '.15s'
  },
  actDown: { transform: 'scale(.88)' },
  white: { backgroundColor: colors.white },
  blue: { color: colors.blue },
  red: { color: colors.red }
})
