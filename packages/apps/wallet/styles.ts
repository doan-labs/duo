import {
  appAppearance,
  colors,
  easing,
  fonts,
  glass,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

export const styles = stylex.create({
  cards: {
    position: 'relative',
    marginTop: 6,
    marginInline: 'auto',
    marginBottom: 0,
    maxWidth: 340,
    transitionProperty: 'height',
    transitionDuration: '.45s',
    transitionTimingFunction: easing.pop
  },
  height: (px: number) => ({ height: px }),
  // A tap only ever changes the translate and z-index; the transition does the rest.
  pass: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 158,
    borderRadius: radius.xl,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 15,
    cursor: 'pointer',
    boxShadow: shadow.float,
    transitionProperty: 'transform',
    transitionDuration: '.45s',
    transitionTimingFunction: easing.pop,
    display: 'flex',
    flexDirection: 'column'
  },
  look: (bg: string, fg: string) => ({ backgroundImage: bg, color: fg }),
  place: (y: number, z: number) => ({ transform: `translateY(${y}px)`, zIndex: z }),
  nm: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  kind: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.65
  },
  // The card number is the one place a fixed-pitch face belongs: the groups line
  // up across the stack however the digits fall.
  no: {
    marginTop: 'auto',
    fontFamily: fonts.mono,
    fontSize: typeScale.subheadline,
    lineHeight: 1,
    fontWeight: weight.medium
  },
  payWrap: { textAlign: 'center', paddingTop: 18, paddingBottom: 8 },
  payBtn: {
    backgroundColor: colors.white,
    color: colors.black,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 20,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  pay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: appAppearance.walletScrim,
    backdropFilter: glass.blur,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 6,
    color: colors.white,
    animationName: pop,
    animationDuration: '.35s'
  },
  payHint: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    opacity: 0.7
  },
  payTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold
  },
  mono: {
    width: 74,
    height: 74,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.largeTitle,
    lineHeight: 1,
    fontWeight: weight.medium,
    flexShrink: 0
  }
})
