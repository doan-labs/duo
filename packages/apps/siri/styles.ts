import { appAppearance, colors, easing } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

export const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    backgroundImage: appAppearance.siriBackgroundImage
  },
  grow: { flexGrow: 1 },
  orb: {
    position: 'relative',
    width: 112,
    height: 112,
    borderRadius: appAppearance.settingsBorderRadius,
    marginInline: 'auto',
    cursor: 'pointer',
    backgroundImage: appAppearance.siriBackgroundImage2,
    boxShadow: appAppearance.siriBoxShadow,
    animationName: spin,
    animationDuration: '7s',
    animationTimingFunction: appAppearance.musicTransitionTimingFunction,
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
      borderRadius: appAppearance.settingsBorderRadius,
      backgroundImage: appAppearance.siriBackgroundImage3
    },
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: appAppearance.settingsBorderRadius,
      backgroundImage: appAppearance.siriBackgroundImage4
    }
  },
  said: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingInline: 22,
    fontSize: appAppearance.mailFontSize,
    fontWeight: appAppearance.homeFontWeight,
    lineHeight: 1.35,
    textAlign: 'center',
    minHeight: 64
  },
  out: { paddingBottom: 16 },
  ans: {
    marginInline: 18,
    borderRadius: appAppearance.musicFontSize5,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 17,
    backgroundColor: colors.fillThick,
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1.45,
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
  chip: { backgroundColor: appAppearance.cameraBackgroundColor2, color: colors.white }
})
