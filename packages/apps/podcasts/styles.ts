import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    borderRadius: appAppearance.calendarFontSize2,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  im: {
    aspectRatio: 1,
    borderRadius: appAppearance.calendarFontSize2,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    fontWeight: appAppearance.musicFontWeight,
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.2,
    textShadow: appAppearance.tvTextShadow
  },
  posterSub: { paddingTop: 6, paddingRight: 2, paddingBottom: 6, paddingLeft: 2 },
  bg: (image: string) => ({ backgroundImage: image }),
  hdr: { fontSize: appAppearance.musicFontSize5 },
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
    borderBottomColor: appAppearance.messagesBorderBottomColor,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  thumb: { width: 52, height: 52, borderRadius: appAppearance.itunesBorderRadius, flexShrink: 0 },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: { display: 'block', fontSize: appAppearance.musicFontSize, fontWeight: appAppearance.musicFontWeight2 },
  txP: {
    fontSize: appAppearance.musicFontSize6,
    color: colors.grey,
    lineHeight: 1.35,
    maxHeight: '2.7em',
    overflow: 'hidden'
  },
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
    backgroundColor: appAppearance.podcastsBackgroundColor,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.podcastsBorderTopColor,
    color: colors.white
  },
  art: { width: 40, height: 40, borderRadius: appAppearance.podcastsBorderRadius, aspectRatio: 1 },
  title: {
    fontWeight: appAppearance.musicFontWeight2,
    fontSize: appAppearance.musicBorderRadius,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  play: { fontSize: appAppearance.podcastsFontSize },
  scrub: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
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
  w: (width: string) => ({ width })
})
