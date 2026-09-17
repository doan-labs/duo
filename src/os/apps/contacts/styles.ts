import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

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
  mono: {
    borderRadius: '50%',
    backgroundColor: colors.grey3,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontWeight: 500,
    flexShrink: 0
  },
  monoSize: (px: number, font: number, bg: string) => ({ width: px, height: px, fontSize: font, backgroundImage: bg }),
  rowName: { fontWeight: 500 },
  hdr17: { fontSize: 17 },
  head: { display: 'grid', justifyItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
  name: { fontSize: 22, fontWeight: 600 },
  acts: { display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 12, paddingBottom: 16 },
  act: { display: 'grid', justifyItems: 'center', gap: 5, color: colors.blue, fontSize: 11 },
  actGlyph: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    backgroundColor: 'rgba(10,124,255,.12)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 19,
    transitionProperty: 'transform',
    transitionDuration: '.15s'
  },
  actDown: { transform: 'scale(.88)' },
  white: { backgroundColor: colors.white },
  blue: { color: colors.blue },
  red: { color: colors.red }
})
