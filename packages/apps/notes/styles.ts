import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  cols: {
    position: 'relative',
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: colors.black,
    color: colors.white
  },
  gold: { color: colors.yellow, opacity: 1 },
  flat: { display: 'flex', padding: 0 },
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 22 },
  list: {
    width: 208,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.musicBorderBottomColor
  },
  listHdr: { display: 'flex', alignItems: 'center', paddingInline: 12, paddingTop: 4, paddingBottom: 6, flexShrink: 0 },
  listTitle: { fontSize: appAppearance.musicFontSize, fontWeight: appAppearance.musicFontWeight },
  listCount: { fontSize: appAppearance.musicFontSize3 },
  push: { marginLeft: 'auto' },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginInline: 10,
    marginBottom: 6,
    paddingInline: 8,
    height: 28,
    borderRadius: appAppearance.itunesBorderRadius,
    backgroundColor: appAppearance.podcastsBorderTopColor,
    color: colors.grey,
    flexShrink: 0
  },
  searchIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: appAppearance.musicFontSize6
  },
  round: {
    width: 27,
    height: 27,
    borderRadius: appAppearance.settingsBorderRadius,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.podcastsBorderTopColor,
    color: colors.white,
    flexShrink: 0
  }
})
