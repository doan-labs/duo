import {
  appAppearance,
  easing,
  fonts,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

/** Gutter between two columns, which is also the distance one page turn travels. */
export const GAP = 52

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
  // The spine edge is the tighter pair of corners, the fore-edge the rounder one.
  cov: {
    aspectRatio: '2/3',
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: radius.xs,
    boxShadow: shadow.float,
    paddingBlock: 14,
    paddingInline: 12,
    fontFamily: fonts.serif,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: appAppearance.booksPaperInk,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  bg: (image: string) => ({ backgroundImage: image }),
  title: {
    marginTop: 8,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold
  },
  who: { fontSize: typeScale.caption2, lineHeight: leading.caption2, letterSpacing: tracking.caption2 },
  readHdr: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium
  },
  read: {
    position: 'absolute',
    inset: 0,
    backgroundColor: appAppearance.booksPaper,
    color: appAppearance.booksInk,
    overflow: 'hidden'
  },
  col: {
    position: 'absolute',
    top: 52,
    right: 26,
    bottom: 40,
    left: 26,
    columnGap: GAP,
    fontFamily: fonts.serif,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    textAlign: 'justify',
    transitionProperty: 'transform',
    transitionDuration: '.42s',
    transitionTimingFunction: easing.pop
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
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: appAppearance.booksInkMuted
  },
  tap: { position: 'absolute', top: 0, bottom: 0, width: '36%', cursor: 'pointer' },
  tapL: { left: 0 },
  tapR: { right: 0 }
})
