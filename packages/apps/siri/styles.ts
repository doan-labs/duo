import { colors, easing } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(16px) scale(.94)' } })

export const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    backgroundImage: 'radial-gradient(120% 70% at 50% 110%,#2a1b4d,#000)'
  },
  grow: { flexGrow: 1 },
  orb: {
    position: 'relative',
    width: 112,
    height: 112,
    borderRadius: '50%',
    marginInline: 'auto',
    cursor: 'pointer',
    backgroundImage: 'conic-gradient(#0a84ff,#bf5af2,#ff375f,#ff9f0a,#30d158,#0a84ff)',
    boxShadow: '0 0 52px rgba(120,90,255,.6),inset -10px -14px 34px rgba(0,0,0,.45)',
    animationName: spin,
    animationDuration: '7s',
    animationTimingFunction: 'linear',
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
      borderRadius: '50%',
      backgroundImage: 'radial-gradient(70% 60% at 32% 26%,rgba(255,255,255,.6),rgba(255,255,255,0) 70%)'
    },
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      backgroundImage: 'radial-gradient(16% 14% at 34% 24%,rgba(255,255,255,.95),rgba(255,255,255,0) 100%)'
    }
  },
  said: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingInline: 22,
    fontSize: 22,
    fontWeight: 300,
    lineHeight: 1.35,
    textAlign: 'center',
    minHeight: 64
  },
  out: { paddingBottom: 16 },
  ans: {
    marginInline: 18,
    borderRadius: 18,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 17,
    backgroundColor: colors.fillThick,
    fontSize: 15,
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
  chip: { backgroundColor: 'rgba(255,255,255,.14)', color: colors.white }
})
