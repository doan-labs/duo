import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  bg: (img: string) => ({ backgroundImage: img }),
  lede: { paddingInline: 16, paddingBottom: 14 },
  // One column on the cover display, two on the inner — a 430 px card is a card,
  // a 760 px one is a banner.
  cols: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
    rowGap: 0,
    columnGap: 14,
    paddingInline: 16
  },
  tip: {
    marginBottom: 14,
    borderRadius: appAppearance.musicFontSize5,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: appAppearance.tipsBoxShadow,
    cursor: 'pointer'
  },
  im: { height: 150, display: 'grid', placeItems: 'center', fontSize: appAppearance.notesFontSize },
  tx: { paddingTop: 13, paddingBottom: 13, paddingInline: 15 },
  title: { fontWeight: appAppearance.musicFontWeight2, fontSize: appAppearance.musicFontSize },
  hint: { fontSize: appAppearance.calendarFontSize2, marginTop: 2 },
  more: {
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.5,
    color: appAppearance.appstoreColor,
    maxHeight: 0,
    marginTop: 0,
    overflow: 'hidden',
    transitionProperty: 'max-height, margin',
    transitionDuration: '.4s, .4s',
    transitionTimingFunction: appAppearance.tipsTransitionTimingFunction
  },
  moreOpen: { maxHeight: 160, marginTop: 8 }
})
