import {
  app,
  colors,
  easing,
  fonts,
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

const padIn = stylex.keyframes({
  '0%': { transform: 'scale(.72)', opacity: 0.4 },
  '100%': { transform: 'scale(1)', opacity: 1 }
})
const liveBlink = stylex.keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.35 }
})
const riseIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(10px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' }
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
    paddingTop: space.xl,
    // The home bar owns the bottom 22 px; chrome floats clear of it.
    paddingBottom: space.xxxl,
    paddingInline: space.lg,
    color: app.fg,
    backgroundColor: app.bg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation'
  },
  rootWide: {
    flexDirection: 'row',
    gap: space.xxl,
    paddingTop: space.xxl,
    paddingInline: space.xxl
  },

  // The rail holds transport, tempo and loops on the unfolded display; on the
  // cover these same blocks stack full width in the column flow.
  rail: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    flexShrink: 0,
    flexBasis: '42%',
    minWidth: 0,
    minHeight: 0
  },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm, flexShrink: 0 },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: colors.pinkDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    fontWeight: weight.bold,
    letterSpacing: tracking.title1
  },
  titleCover: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  liveChip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption1,
    flexShrink: 0
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.circle,
    backgroundColor: colors.grey
  },
  liveDotOn: {
    backgroundColor: colors.pinkDark,
    animationName: { default: liveBlink, [reduce]: 'none' },
    animationDuration: '1s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },

  // Transport: play orb, tempo slider and the two utility buttons.
  transport: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flexShrink: 0,
    paddingBlock: space.xs,
    paddingInline: space.xxs
  },
  transportWide: { paddingBlock: space.sm },
  playButton: {
    width: 52,
    height: 52,
    borderWidth: 0,
    borderRadius: radius.circle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    backgroundColor: { default: app.link, ':hover': colors.blue },
    boxShadow: `${shadow.rim},${shadow.float}`,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  // The orb carries the one state cue beyond the glyph swap while running.
  playButtonOn: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: colors.white, outlineOffset: 2 },
  playGlyph: { transform: 'translateX(1px)', display: 'flex' },
  tempoBox: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs
  },
  tempoRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  tempoLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.largeTitle
  },
  tempoValue: {
    fontFamily: fonts.mono,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    color: app.fg
  },
  slider: {
    position: 'relative',
    height: 28,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    borderRadius: radius.sm,
    outlineStyle: 'solid',
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineColor: app.link,
    outlineOffset: 2
  },
  sliderTrack: {
    position: 'relative',
    height: 6,
    width: '100%',
    borderRadius: radius.pill,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    overflow: 'hidden'
  },
  sliderFill: (ratio: number) => ({
    position: 'absolute',
    inset: 0,
    borderRadius: radius.pill,
    backgroundColor: app.link,
    transformOrigin: 'left center',
    transform: `scaleX(${ratio})`
  }),
  sliderThumb: (ratio: number) => ({
    position: 'absolute',
    top: '50%',
    left: `${ratio * 100}%`,
    width: 18,
    height: 18,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop
  }),
  sliderThumbHot: { transform: 'translate(-50%, -50%) scale(1.2)' },
  utilRow: { display: 'flex', flexDirection: 'row', gap: space.sm, flexShrink: 0 },
  utilButton: {
    width: 44,
    height: 44,
    borderWidth: 0,
    borderRadius: radius.circle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: app.fg,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  utilAccent: { color: app.link },

  // The pads grid. Narrow (cover): tracks are columns and steps run down.
  // Wide: tracks are rows and steps run across.
  pads: {
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs
  },
  padHeader: { display: 'flex', flexDirection: 'row', gap: space.xs, flexShrink: 0 },
  padGutter: { width: 18, flexShrink: 0 },
  padLabelCol: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingBlock: space.xs,
    paddingInline: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption1,
    textAlign: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  padRows: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: space.xxs },
  padRow: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: space.xxs },
  padRowBeat: { marginTop: space.xs },
  padStep: {
    width: 18,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: app.label3,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption2
  },
  padStepBeat: { color: app.label2 },
  pad: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    cursor: 'pointer',
    paddingBlock: 0,
    paddingInline: 0,
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'transform, background-color',
    transitionDuration: '.12s',
    transitionTimingFunction: easing.pop
  },
  padBeat: { backgroundColor: { default: app.fill2, ':hover': app.fill } },
  // Unlit cells under the playhead lift one step of surface.
  padPlay: { backgroundColor: app.fill },
  // Lit cells pop as the playhead passes over them.
  padPlayLit: { transform: 'scale(1.12)' },
  // The playhead also reads as a four-colour underline, one hue per track,
  // so the current step is visible even on unlit cells.
  edgeKeys: { borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: colors.purpleDark },
  edgeHat: { borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: colors.yellowDark },
  edgeSnare: { borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: colors.orangeDark },
  edgeKick: { borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: colors.pinkDark },
  padLit: {
    animationName: { default: padIn, [reduce]: 'none' },
    animationDuration: '.18s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  padStepPlay: { color: colors.pinkDark },
  litKeys: { backgroundColor: colors.purpleDark },
  litHat: { backgroundColor: colors.yellowDark },
  litSnare: { backgroundColor: colors.orangeDark },
  litKick: { backgroundColor: colors.pinkDark },
  labelKeys: { color: colors.purpleDark },
  labelHat: { color: colors.yellowDark },
  labelSnare: { color: colors.orangeDark },
  labelKick: { color: colors.pinkDark },
  padMuted: { opacity: 0.35 },
  // Muted tracks strike their label through so the off state is not colour-only.
  labelMuted: { textDecorationLine: 'line-through' },
  // A track-colour accent tops each cover label so the column's hue reads even
  // before any pad is lit.
  accentKeys: { borderTopWidth: 2, borderTopStyle: 'solid', borderTopColor: colors.purpleDark },
  accentHat: { borderTopWidth: 2, borderTopStyle: 'solid', borderTopColor: colors.yellowDark },
  accentSnare: { borderTopWidth: 2, borderTopStyle: 'solid', borderTopColor: colors.orangeDark },
  accentKick: { borderTopWidth: 2, borderTopStyle: 'solid', borderTopColor: colors.pinkDark },
  labelDot: { width: 8, height: 8, borderRadius: radius.circle, flexShrink: 0 },
  dotKeys: { backgroundColor: colors.purpleDark },
  dotHat: { backgroundColor: colors.yellowDark },
  dotSnare: { backgroundColor: colors.orangeDark },
  dotKick: { backgroundColor: colors.pinkDark },

  // Wide arrangement: labels down the left, steps across.
  padRowWide: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.xs,
    flexGrow: 1,
    minHeight: 0
  },
  padLabelRow: {
    width: 64,
    flexShrink: 0,
    borderWidth: 0,
    paddingBlock: 0,
    paddingInline: space.sm,
    borderRadius: radius.sm,
    backgroundColor: app.fill3,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption1,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: space.xs
  },
  padCellsWide: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'row', gap: space.xxs },
  padCellBeat: { marginLeft: space.xs },

  // Loops: saved sketches. A horizontal chip strip on the cover, a list on the
  // rail when unfolded.
  loopsCover: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.sm,
    overflowX: 'auto',
    paddingBlock: space.xs,
    flexShrink: 0,
    scrollbarWidth: 'none'
  },
  loopsHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  },
  loopsTitle: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.largeTitle
  },
  loopsList: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs
  },
  loopChip: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    overflow: 'hidden'
  },
  loopChipOn: {
    backgroundColor: app.fill2,
    outlineWidth: 1.5,
    outlineStyle: 'solid',
    outlineColor: colors.pinkDark,
    outlineOffset: -1.5
  },
  loopLoad: {
    borderWidth: 0,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'baseline',
    gap: space.xs
  },
  loopMeta: { color: app.label2, fontSize: typeScale.caption2, fontFamily: fonts.mono },
  loopDel: {
    borderWidth: 0,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    marginRight: space.xxs,
    backgroundColor: 'transparent',
    color: { default: app.label3, ':hover': colors.redDark },
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: 1,
    cursor: 'pointer',
    borderRadius: radius.circle
  },
  loopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderRadius: radius.lg,
    backgroundColor: app.fill3,
    animationName: { default: riseIn, [reduce]: 'none' },
    animationDuration: '.25s',
    animationTimingFunction: easing.push,
    animationFillMode: 'backwards'
  },
  loopRowOn: {
    backgroundColor: app.fill2,
    outlineWidth: 1.5,
    outlineStyle: 'solid',
    outlineColor: colors.pinkDark,
    outlineOffset: -1.5
  },
  loopRowLoad: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingBlock: 0,
    paddingInline: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs
  },
  loopRowName: { fontSize: typeScale.subheadline, fontWeight: weight.semibold },
  loopRowMeta: { color: app.label2, fontSize: typeScale.caption1, fontFamily: fonts.mono },
  loopEmpty: {
    color: app.label3,
    fontSize: typeScale.caption1,
    textAlign: 'center',
    paddingBlock: space.lg
  },

  status: {
    flexShrink: 0,
    minHeight: 0,
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    textAlign: 'center'
  },
  statusRail: { textAlign: 'left', marginTop: 'auto' },
  statusWarn: { color: colors.orangeDark }
})
