import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  np: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    paddingTop: 14,
    paddingRight: 26,
    paddingBottom: 14,
    paddingLeft: 26
  },
  art: {
    borderRadius: 14,
    boxShadow: '0 16px 40px rgba(0,0,0,.55)',
    aspectRatio: 1,
    display: 'grid',
    placeItems: 'end start',
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,.92)',
    fontSize: 15,
    lineHeight: 1.2,
    textShadow: '0 1px 6px rgba(0,0,0,.4)'
  },
  cover: { width: 'min(72%,260px)' },
  bg: (image: string) => ({ backgroundImage: image }),
  center: { textAlign: 'center' },
  title: { fontSize: 19, fontWeight: 600 },
  scrub: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,.2)',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  fill: { display: 'block', height: '100%', backgroundColor: 'rgba(255,255,255,.85)', borderRadius: 3 },
  w: (width: string) => ({ width }),
  tr: { display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, opacity: 0.55, marginTop: -8 },
  pbtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34, fontSize: 30 },
  pb: {
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    opacity: 0.95,
    transform: { default: null, ':active': 'scale(.85)' }
  },
  eq: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 20 },
  bar: {
    width: 3,
    backgroundColor: 'currentColor',
    borderRadius: 2,
    transitionProperty: 'height',
    transitionDuration: '.12s',
    transitionTimingFunction: 'linear'
  },
  barH: (height: string) => ({ height }),
  hdr: { fontSize: 18 },
  queue: { marginTop: 4 },
  qrow: {
    backgroundColor: 'rgba(255,255,255,.06)',
    borderBottomColor: 'rgba(255,255,255,.08)',
    cursor: 'pointer'
  },
  thumb: { width: 34, height: 34, borderRadius: 6, flexShrink: 0 },
  name: { fontWeight: 500 },
  go: { fontSize: 13 }
})
