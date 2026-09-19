import {
  app,
  appAppearance,
  colors,
  easing,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

export const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    backgroundImage: appAppearance.siriSky
  },
  grow: { flexGrow: 1 },
  orb: {
    position: 'relative',
    width: 112,
    height: 112,
    borderRadius: radius.circle,
    marginInline: 'auto',
    cursor: 'pointer',
    backgroundImage: appAppearance.siriOrb,
    boxShadow: appAppearance.siriOrbGlow,
    animationName: spin,
    animationDuration: '7s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite',
    transitionProperty: 'transform',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.bounce,
    // Two overlays turn a flat colour wheel into a sphere: a broad top-left
    // specular, then a tight highlight where a real glass ball would catch a lamp.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: radius.circle,
      backgroundImage: appAppearance.siriOrbSheen
    },
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: radius.circle,
      backgroundImage: appAppearance.siriOrbSpark
    }
  },
  said: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingInline: 22,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.regular,
    textAlign: 'center',
    minHeight: 64
  },
  out: { paddingBottom: 16 },
  ans: {
    marginInline: 18,
    borderRadius: radius.xl,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 17,
    backgroundColor: app.fill,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    animationName: rise,
    animationDuration: '.4s',
    animationFillMode: 'backwards'
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    paddingInline: 18
  },
  chip: { backgroundColor: app.fill, color: colors.white }
})
