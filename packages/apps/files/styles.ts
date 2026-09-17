import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  sec: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingInline: 16,
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.7,
    backgroundColor: colors.fillThin,
    color: colors.grey2,
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  locIcon: { fontSize: 20 },
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
    fontSize: 11,
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.92)' }
  },
  fIcon: { fontSize: 44, lineHeight: 1 },
  size: { fontSize: 10 },
  bigIcon: { fontSize: 64 },
  count: { textAlign: 'center', paddingBlock: 6, paddingInline: 6 }
})
