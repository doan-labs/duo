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
