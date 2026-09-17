import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  bg: (img: string) => ({ backgroundImage: img }),
  shelf: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingTop: 2,
    paddingInline: 16,
    paddingBottom: 16,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  poster: {
    flexShrink: 0,
    width: 126,
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  cover: { aspectRatio: 1, borderRadius: 9 },
  posterTitle: { fontSize: 12, fontWeight: 600, paddingTop: 6, paddingInline: 2, paddingBottom: 0 },
  posterArtist: { fontSize: 11, paddingInline: 2 },
  hdr18: { fontSize: 18 },
  rank: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 16,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)'
  },
  n: { width: 18, textAlign: 'center', color: colors.grey, fontSize: 13, flexShrink: 0 },
  co: { width: 52, height: 52, borderRadius: 8, flexShrink: 0 },
  grow: { flexGrow: 1, minWidth: 0 },
  song: { fontWeight: 600, fontSize: 14 },
  buy: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingInline: 14,
    borderRadius: 13,
    backgroundColor: colors.fill,
    color: colors.blue,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: '.25s, .25s, .15s',
    transform: { default: null, ':active': 'scale(.9)' }
  },
  own: { backgroundColor: colors.green, color: colors.white },
  ring: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: 'rgba(10,124,255,.22)',
    borderTopColor: colors.blueDark
  }
})
