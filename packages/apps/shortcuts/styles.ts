import {
  appAppearance,
  colors,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  scs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 14,
    paddingInline: 16,
    paddingBottom: 20
  },
  sc: {
    position: 'relative',
    borderRadius: radius.xl,
    paddingTop: 13,
    paddingRight: 13,
    paddingBottom: 13,
    paddingLeft: 13,
    minHeight: 92,
    color: colors.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    textAlign: 'left',
    overflow: 'hidden',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  bg: (img: string) => ({ backgroundImage: img }),
  glyph: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  name: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  ok: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.shortcutsScrim,
    fontSize: typeScale.largeTitle,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  okOn: { opacity: 1 },
  hdrSm: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 }
})
