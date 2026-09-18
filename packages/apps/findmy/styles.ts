import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const rip = stylex.keyframes({ to: { transform: 'scale(2.3)', opacity: 0 } })

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  mapw: { position: 'relative', height: 230, flexShrink: 0, overflow: 'hidden' },
  pin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 18,
    height: 18,
    marginTop: -9,
    marginLeft: -9,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: colors.blueBright,
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: appAppearance.findmyBoxShadow,
    zIndex: 2,
    '::before': {
      content: '""',
      position: 'absolute',
      inset: -6,
      borderRadius: appAppearance.settingsBorderRadius,
      backgroundColor: appAppearance.findmyBackgroundColor,
      animationName: rip,
      animationDuration: '2.4s',
      animationTimingFunction: appAppearance.phoneAnimationTimingFunction,
      animationIterationCount: 'infinite'
    }
  },
  white: { backgroundColor: colors.white },
  selected: { backgroundColor: appAppearance.findmyBackgroundColor2 },
  devIc: (bg: string) => ({
    backgroundImage: bg,
    width: 36,
    height: 36,
    borderRadius: appAppearance.itunesBorderRadius
  }),
  grow: { flexGrow: 1 },
  name: { fontWeight: appAppearance.musicFontWeight2 }
})
