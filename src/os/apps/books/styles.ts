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
    borderTopLeftRadius: 4,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    borderBottomLeftRadius: 4,
    boxShadow: '0 10px 22px rgba(0,0,0,.3),inset 7px 0 12px -6px rgba(0,0,0,.45)',
    paddingBlock: 14,
    paddingInline: 12,
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.25,
    fontFamily: SERIF,
    color: '#fff9f0',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  bg: (image: string) => ({ backgroundImage: image }),
  title: { fontSize: 12, fontWeight: 600, marginTop: 8 },
  who: { fontSize: 11 },
  readHdr: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, fontSize: 15, fontWeight: 500 },
  read: { position: 'absolute', inset: 0, backgroundColor: '#f6f1e6', color: '#241f18', overflow: 'hidden' },
  col: {
    position: 'absolute',
    top: 52,
    right: 26,
    bottom: 40,
    left: 26,
    columnGap: GAP,
    fontSize: 17,
    lineHeight: 1.62,
    fontFamily: SERIF,
    textAlign: 'justify',
    transitionProperty: 'transform',
    transitionDuration: '.42s',
    transitionTimingFunction: 'cubic-bezier(.3,.85,.3,1)'
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
    fontSize: 11,
    color: '#8a7f6d',
    letterSpacing: 0.5
  },
  tap: { position: 'absolute', top: 0, bottom: 0, width: '36%', cursor: 'pointer' },
  tapL: { left: 0 },
  tapR: { right: 0 }
})
