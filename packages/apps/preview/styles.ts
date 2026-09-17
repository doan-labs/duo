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
  emoji: { fontSize: 22 },
  grow: { flexGrow: 1 },
  name: { fontWeight: 500 },
  hdr17: { fontSize: 17 },
  viewerBody: { paddingTop: 14, paddingInline: 26, paddingBottom: 0, overflow: 'auto' },
  sheet: {
    backgroundColor: colors.white,
    color: '#111',
    aspectRatio: '1/1.3',
    borderRadius: 3,
    boxShadow: '0 10px 30px rgba(0,0,0,.28)',
    paddingTop: 22,
    paddingBottom: 22,
    paddingInline: 22,
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: 'cubic-bezier(.3,.9,.3,1)',
    transformOrigin: 'top center'
  },
  zoom: (z: number) => ({ transform: `scale(${z})` }),
  bg: (img: string) => ({ backgroundImage: img }),
  tint: { height: 5, width: '44%', borderRadius: 3 },
  title: {
    fontWeight: 700,
    fontSize: 17,
    lineHeight: 1.25,
    fontFamily: '"New York",Georgia,serif',
    marginTop: 12,
    marginBottom: 8
  },
  line: { height: 6, borderRadius: 3, marginBottom: 7 },
  lineFull: { backgroundColor: 'rgba(60,60,67,.14)', width: '100%' },
  lineShort: { backgroundColor: 'rgba(60,60,67,.08)', width: '58%' },
  figure: { height: 64, borderRadius: 6, marginTop: 12 },
  cap: { textAlign: 'center', paddingBlock: 10, paddingInline: 10 },
  pager: { display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: 20 }
})
