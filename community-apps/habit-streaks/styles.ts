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

const reduce = '@media (prefers-reduced-motion: reduce)'

// One-shot keyframes may only touch scale, translate and opacity.
const checkPop = stylex.keyframes({
  '0%': { opacity: 0, scale: '.72' },
  '70%': { opacity: 1, scale: '1.08' },
  '100%': { opacity: 1, scale: '1' }
})
const rowIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: '.97' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const streakPulse = stylex.keyframes({
  '0%': { scale: '1' },
  '40%': { scale: '1.24' },
  '100%': { scale: '1' }
})
const celebrate = stylex.keyframes({
  '0%': { scale: '1' },
  '30%': { scale: '1.12' },
  '60%': { scale: '.97' },
  '100%': { scale: '1' }
})
const bannerIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 -8px', scale: '.94' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.xxxl,
    paddingInline: space.xl,
    color: colors.white,
    backgroundColor: '#17171b',
    // A quiet green haze over a deep graphite base: the arcade cabinet's glow.
    backgroundImage:
      'radial-gradient(85% 55% at 50% 0%,rgba(48,209,88,.09),transparent 62%),radial-gradient(70% 50% at 50% 108%,rgba(97,85,245,.07),transparent 60%)',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  rootCover: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xxl, paddingInline: space.md },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: space.xxl
  },
  stageCover: { flexDirection: 'column', gap: space.md },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: space.lg,
    minWidth: 0,
    flexShrink: 0
  },
  railCover: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  kicker: {
    color: colors.greenDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: '2px',
    textTransform: 'uppercase'
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  titleCover: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  counterChip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    flexShrink: 0,
    alignSelf: 'flex-start'
  },
  counterChipCover: { alignSelf: 'flex-end' },
  counterDone: {
    animationName: { default: celebrate, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  counterLabel: { color: app.label2, fontSize: typeScale.caption2, fontWeight: weight.bold, letterSpacing: '1.4px' },
  counterValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    fontWeight: weight.bold,
    lineHeight: leading.title2,
    color: colors.greenDark,
    fontVariantNumeric: 'tabular-nums'
  },
  doneBanner: {
    color: colors.greenDark,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.semibold,
    animationName: { default: bannerIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  hint: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    flexShrink: 0
  },
  hintCover: { fontSize: typeScale.caption2, lineHeight: leading.caption2 },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    justifyContent: 'center',
    maxWidth: '420px',
    width: '100%'
  },
  listCover: { gap: space.xs, maxWidth: 'none' },
  habit: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    borderWidth: 0,
    borderRadius: radius.xl,
    paddingBlock: space.md,
    paddingInline: space.md,
    color: colors.white,
    backgroundColor: { default: 'rgba(255,255,255,.07)', ':hover': 'rgba(255,255,255,.11)' },
    boxShadow: 'inset 0 0 0 .5px rgba(255,255,255,.08)',
    textAlign: 'start',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.2s`,
    transitionTimingFunction: easing.push,
    transform: { default: 'scale(1)', ':active': motion.press },
    animationName: { default: rowIn, [reduce]: 'none' },
    animationDuration: '.36s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  habitDone: {
    backgroundColor: { default: 'rgba(48,209,88,.14)', ':hover': 'rgba(48,209,88,.18)' },
    boxShadow: 'inset 0 0 0 .5px rgba(48,209,88,.35)'
  },
  rowDelay1: { animationDelay: '.05s' },
  rowDelay2: { animationDelay: '.1s' },
  rowDelay3: { animationDelay: '.15s' },
  check: {
    display: 'grid',
    placeItems: 'center',
    width: '28px',
    height: '28px',
    flexShrink: 0,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: colors.grey2Dark,
    borderRadius: radius.circle,
    color: colors.black,
    fontSize: typeScale.subheadline,
    fontWeight: weight.bold,
    transitionProperty: 'background-color,border-color',
    transitionDuration: '.18s'
  },
  checkDone: {
    borderColor: colors.greenDark,
    backgroundColor: colors.greenDark,
    animationName: { default: checkPop, [reduce]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  habitCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs, flex: 1, minWidth: 0 },
  habitName: { fontSize: typeScale.subheadline, lineHeight: leading.subheadline, fontWeight: weight.semibold },
  habitNameCover: { fontSize: typeScale.footnote, lineHeight: leading.footnote },
  habitDetail: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  habitDetailCover: { fontSize: typeScale.caption2, lineHeight: leading.caption2, letterSpacing: tracking.caption2 },
  streak: {
    color: colors.greenDark,
    fontFamily: fonts.rounded,
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0
  },
  streakBump: {
    display: 'inline-block',
    animationName: { default: streakPulse, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  saved: {
    alignSelf: 'center',
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    flexShrink: 0
  }
})
