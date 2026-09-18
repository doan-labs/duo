import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  hdr18: { fontSize: appAppearance.musicFontSize5 },
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
    width: 132,
    borderRadius: appAppearance.calendarFontSize2,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  im: {
    aspectRatio: '2/3',
    borderRadius: appAppearance.calendarFontSize2,
    display: 'flex',
    alignItems: 'flex-end',
    paddingBlock: 10,
    paddingInline: 10,
    fontWeight: appAppearance.musicFontWeight,
    fontSize: appAppearance.musicBorderRadius,
    lineHeight: 1.2,
    textShadow: appAppearance.tvTextShadow
  },
  tint: (bg: string) => ({ backgroundImage: bg }),
  stage: { position: 'absolute', inset: 0, backgroundColor: colors.black, zIndex: 4 },
  fill: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  player: { aspectRatio: '16/9', flexShrink: 0, backgroundColor: colors.black },
  meta: { paddingInline: 16, paddingBottom: 12 },
  artTxt: {
    paddingTop: 4,
    paddingInline: 18,
    paddingBottom: 24,
    fontSize: appAppearance.calendarFontSize,
    lineHeight: 1.55
  },
  para: { marginBottom: 14 },
  close: {
    position: 'absolute',
    right: 12,
    top: 52,
    width: 32,
    height: 32,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.tvBackgroundColor,
    display: 'grid',
    placeItems: 'center',
    zIndex: 5
  }
})
