import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    transitionTimingFunction: appAppearance.healthAnimationTimingFunction
  },
  height: (px: number) => ({ height: px }),
  // A tap only ever changes the translate and z-index; the transition does the rest.
  pass: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 158,
    borderRadius: appAppearance.messagesFontSize,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 15,
    cursor: 'pointer',
    boxShadow: appAppearance.walletBoxShadow,
    transitionProperty: 'transform',
    transitionDuration: '.45s',
    transitionTimingFunction: appAppearance.healthAnimationTimingFunction,
    display: 'flex',
    flexDirection: 'column'
  },
  look: (bg: string, fg: string) => ({ backgroundImage: bg, color: fg }),
  place: (y: number, z: number) => ({ transform: `translateY(${y}px)`, zIndex: z }),
  nm: { fontWeight: appAppearance.musicFontWeight2, fontSize: appAppearance.musicBorderRadius },
  kind: { fontSize: appAppearance.musicFontSize3, opacity: 0.65 },
  no: {
    marginTop: 'auto',
    fontWeight: appAppearance.musicFontWeight3,
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1,
    fontFamily: appAppearance.walletFontFamily,
    letterSpacing: 1.5
  },
  payWrap: { textAlign: 'center', paddingTop: 18, paddingBottom: 8 },
  payBtn: {
    backgroundColor: colors.white,
    color: colors.black,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 20,
    fontSize: appAppearance.musicBorderRadius
  },
  pay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: appAppearance.tvBackgroundColor,
    backdropFilter: 'blur(14px)',
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
  payHint: { fontSize: appAppearance.musicFontSize, opacity: 0.7 },
  payTitle: { fontSize: appAppearance.musicFontSize2, fontWeight: appAppearance.musicFontWeight2 },
  mono: {
    width: 74,
    height: 74,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: colors.white,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontSize: appAppearance.walletFontSize,
    fontWeight: appAppearance.musicFontWeight3,
    flexShrink: 0
  }
})
