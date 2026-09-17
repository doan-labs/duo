import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  face: {
    width: 132,
    height: 162,
    borderRadius: 38,
    backgroundColor: colors.black,
    boxShadow: '0 0 0 5px #6e6e73,0 16px 34px rgba(0,0,0,.45)',
    marginTop: 14,
    marginInline: 'auto',
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    color: colors.white
  },
  date: { fontSize: 11, color: colors.orange, fontWeight: 600, letterSpacing: 0.6 },
  time: { fontWeight: 600, fontSize: 30, lineHeight: 1, fontFamily: '-apple-system,system-ui', letterSpacing: -1 },
  mini: { transform: 'scale(.42)', marginBlock: -26 },
  center: { textAlign: 'center' },
  name: { fontWeight: 600 },
  hdrSm: { fontSize: 18, marginTop: 10 },
  darkRow: { backgroundColor: 'rgba(255,255,255,.07)', borderBottomColor: 'rgba(255,255,255,.08)' }
})
