import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: '0 6px 18px rgba(0,0,0,.1)',
    cursor: 'pointer'
  },
  im: { height: 150, display: 'grid', placeItems: 'center', fontSize: 52 },
  tx: { paddingTop: 13, paddingBottom: 13, paddingInline: 15 },
  title: { fontWeight: 600, fontSize: 15 },
  hint: { fontSize: 12, marginTop: 2 },
  more: {
    fontSize: 14,
    lineHeight: 1.5,
    color: '#3c3c43',
    maxHeight: 0,
    marginTop: 0,
    overflow: 'hidden',
    transitionProperty: 'max-height, margin',
    transitionDuration: '.4s, .4s',
    transitionTimingFunction: 'cubic-bezier(.3,.9,.3,1), ease'
  },
  moreOpen: { maxHeight: 160, marginTop: 8 }
})
