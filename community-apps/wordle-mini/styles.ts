import {
  app,
  colors,
  easing,
  fonts,
  glass,
  leading,
  motion,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Animation pacing shared with main.tsx: the win hop waits until the last
// tile's flip has turned over.
export const FLIP_MS = 520
export const FLIP_STAGGER_MS = 80
export const WIN_STAGGER_MS = 60

const reduce = '@media (prefers-reduced-motion: reduce)'

// Typed letters keep the original pop.
export const tileReveal = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.86)' },
  '70%': { opacity: 1, transform: 'scale(1.04)' },
  to: { opacity: 1, transform: 'scale(1)' }
})

// Tile faces, kept next to the keyframes that swap between them: a flip turns
// the tile edge-on, swaps the face at the 50% mark where nothing is visible,
// and lands on the state colour. One element per tile, no back-face markup.
const emptyFace = {
  backgroundColor: 'rgba(255,255,255,.055)',
  backgroundImage: 'none',
  borderColor: app.fill,
  color: colors.white
}
const correctFace = {
  backgroundColor: colors.greenDark,
  backgroundImage: 'linear-gradient(155deg,#5bdc8f,#2fae55)',
  borderColor: 'transparent',
  color: colors.white
}
const presentFace = {
  backgroundColor: '#e2a007',
  backgroundImage: 'linear-gradient(155deg,#ffd76a,#e2a007)',
  borderColor: 'transparent',
  color: '#463300'
}
const absentFace = {
  backgroundColor: colors.grey4Dark,
  backgroundImage: 'none',
  borderColor: 'transparent',
  color: colors.grey3
}

const flipCorrect = stylex.keyframes({
  '0%': { transform: 'rotateX(0deg)', ...emptyFace },
  '45%': { transform: 'rotateX(-89deg)', ...emptyFace },
  '55%': { transform: 'rotateX(-89deg)', ...correctFace },
  '100%': { transform: 'rotateX(0deg)', ...correctFace }
})
const flipPresent = stylex.keyframes({
  '0%': { transform: 'rotateX(0deg)', ...emptyFace },
  '45%': { transform: 'rotateX(-89deg)', ...emptyFace },
  '55%': { transform: 'rotateX(-89deg)', ...presentFace },
  '100%': { transform: 'rotateX(0deg)', ...presentFace }
})
const flipAbsent = stylex.keyframes({
  '0%': { transform: 'rotateX(0deg)', ...emptyFace },
  '45%': { transform: 'rotateX(-89deg)', ...emptyFace },
  '55%': { transform: 'rotateX(-89deg)', ...absentFace },
  '100%': { transform: 'rotateX(0deg)', ...absentFace }
})

const winBounce = stylex.keyframes({
  '0%': { transform: 'translateY(0)' },
  '30%': { transform: 'translateY(-10px)' },
  '55%': { transform: 'translateY(2px)' },
  '75%': { transform: 'translateY(-4px)' },
  '100%': { transform: 'translateY(0)' }
})

const scorePop = stylex.keyframes({
  from: { opacity: 0.4, transform: 'translateY(6px) scale(.9)' },
  '60%': { opacity: 1, transform: 'translateY(-2px) scale(1.12)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})

const hintIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(4px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingTop: space.lg,
    paddingInline: space.lg,
    // The home bar owns the bottom 22 px; the keyboard floats clear of it.
    paddingBottom: space.xxxl,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    // The cabinet's glow: a cool green haze up top, warm amber at the floor.
    backgroundImage:
      'radial-gradient(85% 55% at 50% 0%,rgba(48,209,88,.07),transparent 62%),radial-gradient(70% 50% at 50% 108%,rgba(255,190,40,.05),transparent 60%)',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  rootCover: { gap: space.xs, paddingTop: space.sm, paddingInline: space.md },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    flexShrink: 0
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: weight.bold, letterSpacing: 1.5 },
  session: { color: colors.grey, fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.2 },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.title1
  },
  titleCover: { fontSize: typeScale.title1, lineHeight: leading.title1 },
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    minWidth: 52,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  chipLabel: { color: 'rgba(255,255,255,.55)', fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.4 },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums'
  },
  chipPop: {
    animationName: { default: scorePop, [reduce]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  hint: {
    marginBlock: 0,
    color: 'rgba(255,255,255,.55)',
    fontSize: typeScale.caption1,
    flexShrink: 0,
    animationName: { default: hintIn, [reduce]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  hintWon: { color: colors.greenDark },
  hintLost: { color: colors.orange },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg
  },
  stageWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: space.lg
  },
  // The board is a well punched into the cabinet: dark, inset, soft top catch.
  board: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(0,0,0,.34)',
    backgroundImage: 'linear-gradient(180deg,rgba(0,0,0,.16),transparent 38%)',
    boxShadow:
      'inset 0 2px 14px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(255,255,255,.08),inset 0 -1px 0 rgba(255,255,255,.04)',
    flexShrink: 0
  },
  fitBoard: (pad: number) => ({ padding: `${pad}px`, gap: `${pad / 2}px` }),
  row: { display: 'flex', gap: 0, perspective: '500px' },
  fitRow: (gap: number) => ({ gap: `${gap}px` }),
  tile: {
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderRadius: radius.sm,
    color: colors.white,
    backgroundColor: 'rgba(255,255,255,.055)',
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    transitionProperty: 'transform, background-color, border-color, color',
    transitionDuration: '.16s, .2s, .2s, .2s',
    transitionTimingFunction: easing.push
  },
  fitTile: (size: number, font: number) => ({
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${font}px`
  }),
  filled: {
    borderColor: colors.grey,
    animationName: { default: tileReveal, [reduce]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.push,
    animationFillMode: 'both'
  },
  flipCorrect: {
    animationName: { default: flipCorrect, [reduce]: 'none' },
    animationDuration: `${FLIP_MS}ms`,
    animationTimingFunction: easing.inOut,
    animationFillMode: 'both'
  },
  flipPresent: {
    animationName: { default: flipPresent, [reduce]: 'none' },
    animationDuration: `${FLIP_MS}ms`,
    animationTimingFunction: easing.inOut,
    animationFillMode: 'both'
  },
  flipAbsent: {
    animationName: { default: flipAbsent, [reduce]: 'none' },
    animationDuration: `${FLIP_MS}ms`,
    animationTimingFunction: easing.inOut,
    animationFillMode: 'both'
  },
  flipDelay: (column: number) => ({ animationDelay: `${column * FLIP_STAGGER_MS}ms` }),
  winLetter: (delay: number) => ({
    display: 'inline-block',
    animationName: { default: winBounce, [reduce]: 'none' },
    animationDuration: '.5s',
    animationDelay: `${delay}ms`,
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  }),
  correct: { ...correctFace, boxShadow: '0 0 16px rgba(48,209,88,.35)' },
  present: { ...presentFace, boxShadow: '0 0 14px rgba(255,190,40,.3)' },
  absent: absentFace,
  keyboard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  fitKeyboard: (pad: number, gap: number) => ({ padding: `${pad}px`, gap: `${gap}px` }),
  keyRow: { display: 'flex', gap: 0, justifyContent: 'center' },
  fitKeyRow: (gap: number) => ({ gap: `${gap}px` }),
  key: {
    borderWidth: 0,
    borderRadius: radius.sm,
    paddingBlock: 0,
    paddingInline: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    backgroundColor: { default: 'rgba(255,255,255,.14)', ':hover': 'rgba(255,255,255,.2)' },
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14),0 1px 3px rgba(0,0,0,.3)',
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform, background-color, color, box-shadow',
    transitionDuration: '.15s, .22s, .22s, .22s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  fitKey: (width: number, height: number, font: number) => ({
    width: `${width}px`,
    height: `${height}px`,
    fontSize: `${font}px`
  }),
  fitKeyWide: (width: number) => ({ width: `${width}px` }),
  keyAction: {
    fontSize: typeScale.caption2,
    letterSpacing: 0.5
  },
  keyCorrect: { ...correctFace, boxShadow: '0 0 12px rgba(48,209,88,.3)' },
  keyPresent: { ...presentFace, boxShadow: '0 0 12px rgba(255,190,40,.25)' },
  keyAbsent: {
    backgroundColor: 'rgba(255,255,255,.05)',
    color: 'rgba(255,255,255,.32)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)'
  }
})
