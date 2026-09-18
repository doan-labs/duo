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
  locIcon: { fontSize: appAppearance.podcastsFontSize },
  dz: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))',
    rowGap: 16,
    columnGap: 10,
    paddingTop: 10,
    paddingInline: 16,
    paddingBottom: 24
  },
  f: {
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
    fontSize: appAppearance.musicFontSize3,
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.92)' }
  },
  fIcon: { fontSize: appAppearance.filesFontSize, lineHeight: 1 },
  size: { fontSize: appAppearance.calendarFontSize4 },
  bigIcon: { fontSize: appAppearance.filesFontSize2 },
  count: { textAlign: 'center', paddingBlock: 6, paddingInline: 6 }
})
