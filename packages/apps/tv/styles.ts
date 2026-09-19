import {
  appAppearance,
  colors,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  hdr18: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
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
    borderRadius: radius.lg,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  im: {
    aspectRatio: '2/3',
    borderRadius: radius.lg,
    display: 'flex',
    alignItems: 'flex-end',
    paddingBlock: 10,
    paddingInline: 10,
    fontWeight: weight.bold,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    textShadow: shadow.text
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
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout
  },
  para: { marginBottom: 14 },
  close: {
    position: 'absolute',
    right: 12,
    top: 52,
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.tvScrim,
    display: 'grid',
    placeItems: 'center',
    zIndex: 5
  }
})
