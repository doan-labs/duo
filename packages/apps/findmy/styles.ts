import { appAppearance, colors, easing, radius, shadow, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    borderRadius: radius.circle,
    backgroundColor: colors.blue,
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: shadow.card,
    zIndex: 2,
    '::before': {
      content: '""',
      position: 'absolute',
      inset: -6,
      borderRadius: radius.circle,
      backgroundColor: appAppearance.findmyPulse,
      animationName: rip,
      animationDuration: '2.4s',
      animationTimingFunction: easing.out,
      animationIterationCount: 'infinite'
    }
  },
  white: { backgroundColor: colors.white },
  selected: { backgroundColor: appAppearance.findmyTint },
  devIc: (bg: string) => ({
    backgroundImage: bg,
    width: 36,
    height: 36,
    borderRadius: radius.md
  }),
  grow: { flexGrow: 1 },
  name: { fontWeight: weight.semibold }
})
