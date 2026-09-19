import {
  app,
  colors,
  easing,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    cursor: 'pointer'
  },
  // The emoji is art, not text: set solid at the largest display step.
  im: { height: 150, display: 'grid', placeItems: 'center', fontSize: typeScale.displayLg, lineHeight: 1 },
  tx: { paddingTop: 13, paddingBottom: 13, paddingInline: 15 },
  title: {
    fontWeight: weight.semibold,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  hint: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    marginTop: 2
  },
  more: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2,
    maxHeight: 0,
    marginTop: 0,
    overflow: 'hidden',
    transitionProperty: 'max-height, margin',
    transitionDuration: '.4s, .4s',
    transitionTimingFunction: easing.pop
  },
  moreOpen: { maxHeight: 160, marginTop: 8 }
})
