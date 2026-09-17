import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

export const styles = stylex.create({
  scs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 14,
    paddingInline: 16,
    paddingBottom: 20
  },
  sc: {
    position: 'relative',
    borderRadius: 17,
    paddingTop: 13,
    paddingRight: 13,
    paddingBottom: 13,
    paddingLeft: 13,
    minHeight: 92,
    color: colors.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    textAlign: 'left',
    overflow: 'hidden',
    transitionProperty: 'transform',
    transitionDuration: '.18s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  bg: (img: string) => ({ backgroundImage: img }),
  glyph: { fontSize: 22 },
  name: { fontSize: 14, fontWeight: 600 },
  ok: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(0,0,0,.45)',
    fontSize: 34,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  okOn: { opacity: 1 },
  hdrSm: { fontSize: 18 }
})
