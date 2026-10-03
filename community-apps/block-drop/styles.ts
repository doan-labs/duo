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

import type { Kind } from './game.ts'

const reduce = '@media (prefers-reduced-motion: reduce)'

/** The seven piece hues, all system colours: I O T S Z J L. */
export const TONE: Record<Kind, string> = {
  1: colors.cyanDark,
  2: colors.yellow,
  3: colors.purpleDark,
  4: colors.greenDark,
  5: colors.redDark,
  6: colors.indigoDark,
  7: colors.orangeDark
}

const pieceIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.72' },
  '70%': { opacity: 1, scale: '1.06' },
  '100%': { opacity: 1, scale: '1' }
})
const boardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 12px', scale: '.97' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
// A cleared row's flash: lit white, then gone - the cells it stood in are
// already off the field, so the bar only has to fade.
const flashOut = stylex.keyframes({
  '0%': { opacity: '.85' },
  '100%': { opacity: 0 }
})
// The points a clear just scored lift off the field and dissolve.
const flyUp = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(6px) scale(.85)' },
  '25%': { opacity: 1, transform: 'translateY(0) scale(1)' },
  '100%': { opacity: 0, transform: 'translateY(-38px) scale(1.04)' }
})
// A stack near the top breathes a faint red warning while the game runs.
const dangerPulse = stylex.keyframes({
  '0%,100%': { opacity: '.35' },
  '50%': { opacity: '.9' }
})
const readyPulse = stylex.keyframes({
  '0%,100%': { opacity: '.5' },
  '50%': { opacity: 1 }
})
const scorePop = stylex.keyframes({
  from: { opacity: 0.4, transform: 'translateY(6px) scale(.9)' },
  '60%': { opacity: 1, transform: 'translateY(-2px) scale(1.12)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const ghostIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 }
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
    paddingTop: space.md,
    // The home bar owns the bottom edge; controls stay clear of it.
    paddingBottom: space.xxl,
    paddingInline: space.md,
    color: colors.white,
    backgroundColor: colors.grey6Dark,
    // Arcade cabinet light: a cool indigo pool high, ember low. The hues echo
    // the two "home" pieces without fighting the seven on the field.
    backgroundImage: `radial-gradient(85% 50% at 15% 0%,color-mix(in srgb, ${colors.indigoDark} 12%, transparent),transparent 62%),radial-gradient(80% 45% at 85% 108%,color-mix(in srgb, ${colors.orangeDark} 9%, transparent),transparent 60%)`,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    userSelect: 'none'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
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
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.bold,
    letterSpacing: tracking.title2
  },
  headerSide: { display: 'flex', alignItems: 'center', gap: space.sm, flexShrink: 0 },
  chip: {
    minWidth: 52,
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
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: leading.headline,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center',
    animationName: { default: scorePop, [reduce]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  chipAccent: { color: colors.cyanDark },
  // Round glass buttons in the header: pause and restart.
  iconBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    borderWidth: 0,
    borderRadius: radius.circle,
    color: colors.white,
    backgroundColor: app.fill,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  // A pause mark drawn with two bars; a resume mark with a border triangle.
  pauseGlyph: { display: 'flex', gap: space.xxs, alignItems: 'center' },
  pauseBar: { width: 3, height: 12, borderRadius: 1, backgroundColor: 'currentColor' },
  playGlyph: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 9,
    borderTopStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'currentColor'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    flexShrink: 1
  },
  stageWide: { gap: space.xl },
  // The board well: punched into the cabinet, cells clipped by its corner.
  board: {
    position: 'relative',
    borderRadius: radius.xxl,
    backgroundColor: `color-mix(in srgb, ${colors.black} 45%, transparent)`,
    // The kit has no inset shadow, so the well reads punched in through a
    // darker top edge painted into the fill itself.
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.black} 40%, transparent),transparent 30%)`,
    flexShrink: 0,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both',
    touchAction: 'none'
  },
  fitBoard: (pad: number) => ({ padding: `${pad}px` }),
  grid: { position: 'relative', borderRadius: radius.lg, overflow: 'hidden' },
  // Faint graph paper the cells sit on - one background, not two hundred nodes.
  fitGrid: (w: number, h: number, cell: number) => ({
    width: `${w}px`,
    height: `${h}px`,
    backgroundImage: `linear-gradient(to right,color-mix(in srgb, ${colors.white} 5%, transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb, ${colors.white} 5%, transparent) 1px,transparent 1px)`,
    backgroundSize: `${cell}px ${cell}px`
  }),
  // The stack creeping into the top rows tints the well's mouth red.
  danger: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.redDark} 26%, transparent),transparent 45%)`,
    animationName: { default: dangerPulse, [reduce]: 'none' },
    animationDuration: '1.6s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  // One settled or falling block: a hue under a shared sheen, so every piece
  // reads as the same cast plastic. Size and corner land on the dynamic fn.
  cell: {
    position: 'absolute',
    backgroundImage: `linear-gradient(165deg,color-mix(in srgb, ${colors.white} 36%, transparent),color-mix(in srgb, ${colors.white} 6%, transparent) 34%,transparent 52%,color-mix(in srgb, ${colors.black} 30%, transparent) 100%)`,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: `color-mix(in srgb, ${colors.white} 40%, transparent)`
  },
  fitCell: (size: number, r: number) => ({ width: `${size}px`, height: `${size}px`, borderRadius: `${r}px` }),
  cellAt: (x: number, y: number, cell: number) => ({
    transform: `translate(${x * cell}px, ${y * cell}px)`
  }),
  cellFill: (base: string) => ({ backgroundColor: base }),
  // Falling cells settle into place; locked ones land with the same pop the
  // piece had, so a slide still slides but a spawn never drags across the well.
  cellFall: {
    transitionProperty: 'transform',
    transitionDuration: '.08s',
    transitionTimingFunction: easing.out,
    animationName: { default: pieceIn, [reduce]: 'none' },
    animationDuration: '.18s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  cellLock: {
    animationName: { default: pieceIn, [reduce]: 'none' },
    animationDuration: '.18s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  // The landing preview: an outline of the piece's hue, no fill.
  ghost: {
    position: 'absolute',
    borderStyle: 'solid',
    borderWidth: 1.5,
    animationName: { default: ghostIn, [reduce]: 'none' },
    animationDuration: '.15s'
  },
  ghostFill: (base: string) => ({
    backgroundColor: `color-mix(in srgb, ${base} 12%, transparent)`,
    borderColor: `color-mix(in srgb, ${base} 55%, transparent)`
  }),
  flash: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
    backgroundColor: `color-mix(in srgb, ${colors.white} 85%, transparent)`,
    animationName: { default: flashOut, [reduce]: 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.out,
    animationFillMode: 'forwards'
  },
  fitFlash: (y: number, cell: number) => ({ top: `${y * cell}px`, height: `${cell}px` }),
  fitFly: (y: number, cell: number) => ({ top: `${Math.max(0, y - 1) * cell}px` }),
  fly: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    pointerEvents: 'none',
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    fontSize: typeScale.headline,
    letterSpacing: tracking.headline,
    color: colors.yellow,
    textShadow: shadow.text,
    animationName: { default: flyUp, [reduce]: 'none' },
    animationDuration: '.8s',
    animationTimingFunction: easing.out,
    animationFillMode: 'forwards'
  },
  // Overlays sit inside the well so the rail keeps reading the run's state.
  veil: {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 0,
    borderRadius: radius.lg,
    cursor: 'pointer',
    color: colors.white,
    backgroundColor: `color-mix(in srgb, ${colors.black} 58%, transparent)`,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    fontFamily: fonts.system,
    paddingBlock: space.md,
    paddingInline: space.md
  },
  veilKicker: {
    fontSize: typeScale.caption1,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption1,
    textTransform: 'uppercase',
    color: colors.cyanDark
  },
  veilKickerOver: { color: colors.redDark },
  veilTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.bold,
    letterSpacing: tracking.title2,
    textAlign: 'center'
  },
  veilSub: {
    color: colors.grey3,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    textAlign: 'center',
    animationName: { default: readyPulse, [reduce]: 'none' },
    animationDuration: '1.6s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: space.md,
    flexShrink: 0,
    minHeight: 0
  },
  railWide: { alignItems: 'stretch' },
  railNarrow: { alignItems: 'center', gap: space.sm },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  panelNarrow: { paddingBlock: space.xs, paddingInline: space.xs, gap: space.xxs },
  // The hold box is a button: tap it to stash the falling piece.
  panelButton: {
    borderWidth: 0,
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: fonts.system,
    textAlign: 'start',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 },
    ':disabled': { cursor: 'default', transform: 'none' }
  },
  panelSpent: { opacity: '.45' },
  panelLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  minis: { display: 'flex', gap: space.xs, alignItems: 'center' },
  minisWide: { justifyContent: 'space-between' },
  mini: { position: 'relative', marginInline: 'auto' },
  fitMini: (w: number, h: number) => ({ width: `${w}px`, height: `${h}px` }),
  stats: { display: 'flex', flexDirection: 'column', gap: space.xs },
  statRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm
  },
  statLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: typeScale.callout,
    fontWeight: weight.semibold,
    lineHeight: leading.callout,
    fontVariantNumeric: 'tabular-nums'
  },
  statValueNarrow: { fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  statAccent: { color: colors.cyanDark },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: space.sm,
    flexShrink: 0
  },
  controlsWide: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: space.xs },
  ctrl: {
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: radius.lg,
    color: colors.white,
    backgroundColor: { default: app.fill, ':hover': app.fill2 },
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 },
    ':disabled': { opacity: '.4', cursor: 'default' }
  },
  fitCtrl: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  ctrlWide: { height: 40, width: '100%' },
  ctrlAccent: {
    color: colors.grey6Dark,
    backgroundColor: { default: colors.cyanDark, ':hover': colors.cyan }
  },
  hint: {
    marginBlock: 0,
    color: colors.grey3,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    textAlign: 'center',
    flexShrink: 0
  }
})
