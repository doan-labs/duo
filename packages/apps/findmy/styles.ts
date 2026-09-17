import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
    borderRadius: '50%',
    backgroundColor: colors.blueBright,
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: '0 2px 8px rgba(0,0,0,.4)',
    zIndex: 2,
    '::before': {
      content: '""',
      position: 'absolute',
      inset: -6,
      borderRadius: '50%',
      backgroundColor: 'rgba(10,124,255,.35)',
      animationName: rip,
      animationDuration: '2.4s',
      animationTimingFunction: 'ease-out',
      animationIterationCount: 'infinite'
    }
  },
  white: { backgroundColor: colors.white },
  selected: { backgroundColor: '#eaf3ff' },
  devIc: (bg: string) => ({ backgroundImage: bg, width: 36, height: 36, borderRadius: 9 }),
  grow: { flexGrow: 1 },
  name: { fontWeight: 600 }
})
