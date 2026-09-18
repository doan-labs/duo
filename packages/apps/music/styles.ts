import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    borderRadius: appAppearance.musicBorderRadius,
    boxShadow: appAppearance.musicBoxShadow,
    aspectRatio: 1,
    display: 'grid',
    placeItems: 'end start',
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    fontWeight: appAppearance.musicFontWeight,
    color: appAppearance.musicColor,
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1.2,
    textShadow: appAppearance.musicTextShadow
  },
  cover: { width: 'min(72%,260px)' },
  bg: (image: string) => ({ backgroundImage: image }),
  center: { textAlign: 'center' },
  title: { fontSize: appAppearance.musicFontSize2, fontWeight: appAppearance.musicFontWeight2 },
  scrub: {
    width: '100%',
    height: 5,
    borderRadius: appAppearance.musicBorderRadius2,
    backgroundColor: appAppearance.musicBackgroundColor,
    overflow: 'hidden',
    cursor: 'pointer'
  },
  fill: {
    display: 'block',
    height: '100%',
    backgroundColor: appAppearance.musicBackgroundColor2,
    borderRadius: appAppearance.musicBorderRadius2
  },
  w: (width: string) => ({ width }),
  tr: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: appAppearance.musicFontSize3,
    opacity: 0.55,
    marginTop: -8
  },
  pbtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
    fontSize: appAppearance.musicFontSize4
  },
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
    borderRadius: appAppearance.musicBorderRadius3,
    transitionProperty: 'height',
    transitionDuration: '.12s',
    transitionTimingFunction: appAppearance.musicTransitionTimingFunction
  },
  barH: (height: string) => ({ height }),
  hdr: { fontSize: appAppearance.musicFontSize5 },
  queue: { marginTop: 4 },
  qrow: {
    backgroundColor: appAppearance.musicBackgroundColor3,
    borderBottomColor: appAppearance.musicBorderBottomColor,
    cursor: 'pointer'
  },
  thumb: { width: 34, height: 34, borderRadius: appAppearance.musicBorderRadius4, flexShrink: 0 },
  name: { fontWeight: appAppearance.musicFontWeight3 },
  go: { fontSize: appAppearance.musicFontSize6 }
})
