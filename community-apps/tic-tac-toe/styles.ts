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

export const BOARD_PAD = 10
export const BOARD_GAP = 8
const reduce = '@media (prefers-reduced-motion: reduce)'

// One-shot keyframes touch only scale/translate/opacity: a cell's position
// lives in transform-free layout and the win bar's angle in `rotate`, so an
// animated `transform` would teleport them for a frame.
const markPop = stylex.keyframes({
  '0%': { opacity: 0, scale: '.78' },
  '70%': { opacity: 1, scale: '1.06' },
  '100%': { opacity: 1, scale: '1' }
})
const boardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 12px', scale: '.96' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
// The win bar grows out of its first cell along its own axis: scale X runs in
// the element's local space, before the static `rotate` aims it.
const lineIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '0 1' },
  '40%': { opacity: 1 },
  '100%': { opacity: 1, scale: '1 1' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: '.92' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
// Round-end celebration: a pump-and-jitter so the board reads as rumbling,
// then sparkles that burst off the win bar. Every sparkle is rotated onto the
// line's axis, so the same keyframe throws them perpendicular either way.
const winPulse = stylex.keyframes({
  '0%': { scale: '1', translate: '0 0' },
  '30%': { scale: '1.05', translate: '-3px 0' },
  '55%': { scale: '.99', translate: '3px 1px' },
  '75%': { scale: '1.02', translate: '-1px 0' },
  '100%': { scale: '1', translate: '0 0' }
})
const drawPulse = stylex.keyframes({
  '0%': { scale: '1' },
  '45%': { scale: '1.02' },
  '100%': { scale: '1' }
})
const spark = stylex.keyframes({
  '0%': { opacity: 0, scale: '.4', translate: '0 0' },
  '35%': { opacity: 1, scale: '1.15' },
  '100%': { opacity: 0, scale: '.9', translate: '0 -30px' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.lg,
    // The home bar owns the bottom 22 px; everything clears it.
    paddingBottom: space.xxxl,
    paddingInline: space.xl,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    // A quiet cyan/orange haze over the graphite base: the two players' glow.
    backgroundImage:
      'radial-gradient(80% 50% at 18% 0%,rgba(60,211,254,.09),transparent 62%),radial-gradient(75% 50% at 82% 108%,rgba(255,147,48,.08),transparent 60%)',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  rootCover: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xxl, paddingInline: space.md },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    flexShrink: 0
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  kicker: {
    color: colors.cyanDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
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
  titleCover: { fontSize: typeScale.title1, lineHeight: leading.title1 },
  scores: { display: 'flex', gap: space.sm, flexShrink: 0 },
  chip: {
    position: 'relative',
    minWidth: 56,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  chipLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2
  },
  chipLabelX: { color: colors.cyanDark },
  chipLabelO: { color: colors.orangeDark },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    lineHeight: leading.title3,
    fontVariantNumeric: 'tabular-nums',
    minWidth: space.xl,
    textAlign: 'center'
  },
  status: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    flexShrink: 0
  },
  statusLive: { color: colors.grey3 },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: space.xl,
    flexShrink: 1
  },
  stageCover: { flexDirection: 'column', justifyContent: 'center', gap: space.md },
  // The board is a well punched into the cabinet: dark, inset, soft top catch.
  board: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
    gap: BOARD_GAP,
    padding: BOARD_PAD,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(0,0,0,.34)',
    backgroundImage: 'linear-gradient(180deg,rgba(0,0,0,.16),transparent 38%)',
    boxShadow:
      'inset 0 2px 14px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(255,255,255,.08),inset 0 -1px 0 rgba(255,255,255,.04)',
    flexShrink: 0,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  cell: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    borderRadius: radius.xl,
    color: colors.white,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    lineHeight: 1,
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.cyanDark}`, outlineOffset: 2 }
  },
  cellMark: {
    animationName: { default: markPop, [reduce]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  cellX: {
    color: colors.cyanDark,
    backgroundColor: 'rgba(60,211,254,.16)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.3),0 0 18px rgba(60,211,254,.22)'
  },
  cellO: {
    color: colors.orangeDark,
    backgroundColor: 'rgba(255,147,48,.16)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.3),0 0 18px rgba(255,147,48,.22)'
  },
  fitMark: (size: number) => ({ fontSize: `${Math.round(size * 0.52)}px` }),
  // The win bar: positioned by translate/rotate longhands so the reveal's
  // scale animates along the line, whichever angle the win lands on.
  line: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: radius.pill,
    transformOrigin: '0 50%',
    pointerEvents: 'none',
    animationName: { default: lineIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationDelay: '.1s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  lineX: { backgroundColor: colors.cyanDark, boxShadow: '0 0 16px rgba(60,211,254,.6)' },
  lineO: { backgroundColor: colors.orangeDark, boxShadow: '0 0 16px rgba(255,147,48,.6)' },
  // Finish animations replace the board-in entrance on the same element; by
  // then it has already played, so the swap is invisible.
  celebrate: {
    animationName: { default: winPulse, [reduce]: 'none' },
    animationDuration: '.55s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  celebrateDraw: {
    animationName: { default: drawPulse, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  spark: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    pointerEvents: 'none',
    animationName: { default: spark, [reduce]: 'none' },
    animationDuration: '.62s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  sparkX: { backgroundColor: colors.cyan, boxShadow: '0 0 10px rgba(60,211,254,.8)' },
  sparkO: { backgroundColor: colors.orange, boxShadow: '0 0 10px rgba(255,147,48,.8)' },
  // rotate aims the burst off the bar's axis; delay staggers the pop.
  fitSpark: (x: number, y: number, deg: number, delay: number) => ({
    left: `${x}px`,
    top: `${y}px`,
    rotate: `${deg}deg`,
    animationDelay: `${delay}s`
  }),
  fitLine: (width: number, height: number, x: number, y: number, deg: number) => ({
    width: `${width}px`,
    height: `${height}px`,
    translate: `${x}px ${y - height / 2}px`,
    rotate: `${deg}deg`
  }),
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    minWidth: 0,
    flexShrink: 0
  },
  railCover: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', gap: space.sm },
  controls: { display: 'flex', gap: space.sm, flexShrink: 0 },
  controlsWide: { flexDirection: 'column', alignItems: 'stretch' },
  primary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.lg,
    color: colors.grey6Dark,
    backgroundColor: { default: colors.cyanDark, ':hover': colors.cyan },
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  secondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.lg,
    color: colors.white,
    backgroundColor: { default: app.fill, ':hover': app.fill2 },
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  hint: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    textAlign: 'center',
    maxWidth: 170
  },
  // The result card floats clear of the home bar over the stage's bottom edge;
  // its own button replaces the controls it covers at game end.
  result: {
    position: 'absolute',
    insetInline: space.lg,
    bottom: space.xxxl,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: space.md,
    paddingInline: space.lg,
    borderRadius: radius.xxl,
    color: colors.white,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.32s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  resultCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  resultKicker: {
    color: colors.orangeDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  resultKickerWin: { color: colors.cyanDark },
  resultTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    letterSpacing: tracking.title3,
    lineHeight: leading.title3
  }
})
