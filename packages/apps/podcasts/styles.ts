import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  root: { paddingBottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: colors.groupedLight },
  shelf: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingTop: 2,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  poster: {
    flexShrink: 0,
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  im: {
    aspectRatio: 1,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.2,
    textShadow: '0 2px 8px rgba(0,0,0,.5)'
  },
  posterSub: { paddingTop: 6, paddingRight: 2, paddingBottom: 6, paddingLeft: 2 },
  bg: (image: string) => ({ backgroundImage: image }),
  hdr: { fontSize: 18 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingRight: 16,
    paddingBottom: 11,
    paddingLeft: 16,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)',
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  thumb: { width: 52, height: 52, borderRadius: 9, flexShrink: 0 },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: { display: 'block', fontSize: 15, fontWeight: 600 },
  txP: { fontSize: 13, color: colors.grey, lineHeight: 1.35, maxHeight: '2.7em', overflow: 'hidden' },
  mini: {
    position: 'relative',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 9,
    paddingRight: 14,
    paddingBottom: 9,
    paddingLeft: 14,
    backgroundColor: 'rgba(28,28,30,.92)',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(255,255,255,.1)',
    color: colors.white
  },
  art: { width: 40, height: 40, borderRadius: 7, aspectRatio: 1 },
  title: {
    fontWeight: 600,
    fontSize: 14,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  play: { fontSize: 20 },
  scrub: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,.2)',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  fill: { display: 'block', height: '100%', backgroundColor: 'rgba(255,255,255,.85)', borderRadius: 3 },
  w: (width: string) => ({ width })
})
