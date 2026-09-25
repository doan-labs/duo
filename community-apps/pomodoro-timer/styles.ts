import {
  app,
  colors,
  easing,
  fonts,
  glass,
  leading,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const reduce = '@media (prefers-reduced-motion: reduce)'

const cardIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(8px) scale(.98)' },
  '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const modeIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(-4px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' }
})
const readyPulse = stylex.keyframes({
  '0%,100%': { opacity: 0.45 },
  '50%': { opacity: 1 }
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
    // The home bar owns the bottom 22 px; the controls float clear of it.
    paddingBottom: space.xxxl,
    paddingInline: space.xl,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  rootCover: { gap: space.sm, paddingTop: space.md, paddingInline: space.lg },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexShrink: 0 },
  kicker: {
    color: colors.orangeDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  mode: {
    flexShrink: 0,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    color: colors.orangeDark,
    backgroundColor: glass.tintDark,
    boxShadow: `${shadow.rim},${shadow.float}`,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle,
    animationName: { default: modeIn, [reduce]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.push,
    animationFillMode: 'both'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg
  },
  stageWide: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl },
  timerCard: {
    width: '100%',
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingBlock: space.xxl,
    paddingInline: space.xl,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  phase: {
    color: colors.orangeDark,
    fontSize: typeScale.caption1,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  time: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.displayXl,
    lineHeight: 1,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  timeWide: { fontSize: typeScale.displayXxl },
  timeline: {
    width: '100%',
    height: space.lg,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    marginBlockStart: space.xs
  },
  timelineFill: (progress: number) => ({
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.orangeDark,
    transformOrigin: 'left center',
    transform: `scaleX(${progress / 100})`,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.35s, .2s',
    transitionTimingFunction: easing.push
  }),
  caption: { color: colors.grey3, fontSize: typeScale.caption1 },
  rail: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space.sm, flexShrink: 0 },
  controls: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  controlsWide: { flexDirection: 'column', alignItems: 'stretch' },
  actions: { display: 'flex', flexDirection: 'row', gap: space.sm },
  action: { flexGrow: 0 },
  actionWide: { flexGrow: 1 },
  primary: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.xl,
    color: colors.grey6Dark,
    backgroundColor: { default: colors.orangeDark, ':hover': colors.orange },
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    fontWeight: weight.bold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .18s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': 'scale(.96)' },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  secondary: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.lg,
    color: colors.white,
    backgroundColor: { default: app.fill3, ':hover': app.fill },
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s, .18s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': 'scale(.96)' },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: typeScale.caption2, textAlign: 'center', maxWidth: 220 },
  hintPulse: {
    animationName: { default: readyPulse, [reduce]: 'none' },
    animationDuration: '1.6s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  }
})
