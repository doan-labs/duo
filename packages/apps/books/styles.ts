import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

/** Gutter between two columns, which is also the distance one page turn travels. */
export const GAP = 52

const SERIF = '"New York",Georgia,serif'

export const styles = stylex.create({
  shelf: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))',
    rowGap: 22,
    columnGap: 16,
    paddingTop: 8,
    paddingInline: 18,
    paddingBottom: 24
  },
  cov: {
    aspectRatio: '2/3',
    borderTopLeftRadius: appAppearance.booksBorderTopLeftRadius,
    borderTopRightRadius: appAppearance.itunesBorderRadius,
    borderBottomRightRadius: appAppearance.itunesBorderRadius,
    borderBottomLeftRadius: appAppearance.booksBorderTopLeftRadius,
    boxShadow: appAppearance.booksBoxShadow,
    paddingBlock: 14,
    paddingInline: 12,
    fontWeight: appAppearance.musicFontWeight2,
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.25,
    fontFamily: SERIF,
    color: appAppearance.booksColor,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  bg: (image: string) => ({ backgroundImage: image }),
  title: { fontSize: appAppearance.calendarFontSize2, fontWeight: appAppearance.musicFontWeight2, marginTop: 8 },
  who: { fontSize: appAppearance.musicFontSize3 },
  readHdr: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    fontSize: appAppearance.musicFontSize,
    fontWeight: appAppearance.musicFontWeight3
  },
  read: {
    position: 'absolute',
    inset: 0,
    backgroundColor: appAppearance.booksBackgroundColor,
    color: appAppearance.booksColor2,
    overflow: 'hidden'
  },
  col: {
    position: 'absolute',
    top: 52,
    right: 26,
    bottom: 40,
    left: 26,
    columnGap: GAP,
    fontSize: appAppearance.messagesFontSize,
    lineHeight: 1.62,
    fontFamily: SERIF,
    textAlign: 'justify',
    transitionProperty: 'transform',
    transitionDuration: '.42s',
    transitionTimingFunction: appAppearance.booksTransitionTimingFunction
  },
  colW: (w: number) => ({ columnWidth: w }),
  shift: (x: number) => ({ transform: `translateX(${x}px)` }),
  p: { marginBottom: 12 },
  pgn: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: appAppearance.musicFontSize3,
    color: appAppearance.booksColor3,
    letterSpacing: 0.5
  },
  tap: { position: 'absolute', top: 0, bottom: 0, width: '36%', cursor: 'pointer' },
  tapL: { left: 0 },
  tapR: { right: 0 }
})
