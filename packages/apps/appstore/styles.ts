import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  card: {
    marginRight: 16,
    marginBottom: 16,
    marginLeft: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: '0 8px 22px rgba(0,0,0,.13)',
    cursor: 'pointer'
  },
  top: {
    height: 170,
    paddingBlock: 16,
    paddingInline: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    color: colors.white
  },
  bg: (image: string) => ({ backgroundImage: image }),
  kicker: { fontSize: 11, fontWeight: 700, letterSpacing: 0.9, opacity: 0.85 },
  title: { fontSize: 24, fontWeight: 700, lineHeight: 1.15, marginTop: 4 },
  blurb: { paddingBlock: 13, paddingInline: 15, fontSize: 14, lineHeight: 1.45, color: '#3c3c43' },
  hdr18: { fontSize: 18 },
  icon: { width: 52, height: 52, borderRadius: 12, flexShrink: 0 },
  info: { flexGrow: 1, minWidth: 0 },
  name: { fontWeight: 600 },
  get: { position: 'relative', width: 66, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center' },
  ring: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: 'rgba(10,124,255,.22)',
    borderTopColor: colors.blueDark
  },
  open: { color: colors.blueDark }
})
