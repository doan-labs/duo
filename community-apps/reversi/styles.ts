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

/** A single token-painted disc: near-black or felt-white with a rim to sit on. */
const DISC_B = `color-mix(in srgb, ${colors.black} 82%, ${colors.grey6Dark})`
const DISC_W = `color-mix(in srgb, ${colors.white} 94%, ${colors.grey6})`

// Flip illusion on one element: edge-on at the midpoint is where the colour
// swaps, so reduced-motion still lands on the right static colour.
const flipToBlack = stylex.keyframes({
  '0%': { transform: 'rotateY(0deg)', backgroundColor: DISC_W },
  '45%': { transform: 'rotateY(90deg)', backgroundColor: DISC_W },
  '55%': { transform: 'rotateY(90deg)', backgroundColor: DISC_B },
  '100%': { transform: 'rotateY(180deg)', backgroundColor: DISC_B }
})
const flipToWhite = stylex.keyframes({
  '0%': { transform: 'rotateY(0deg)', backgroundColor: DISC_B },
  '45%': { transform: 'rotateY(90deg)', backgroundColor: DISC_B },
  '55%': { transform: 'rotateY(90deg)', backgroundColor: DISC_W },
  '100%': { transform: 'rotateY(180deg)', backgroundColor: DISC_W }
})
const discIn = stylex.keyframes({
  '0%': { transform: 'scale(0.2)', opacity: 0 },
  '60%': { transform: 'scale(1.08)', opacity: 1 },
  '100%': { transform: 'scale(1)', opacity: 1 }
})
const ghostPulse = stylex.keyframes({
  '0%, 100%': { transform: 'scale(0.92)' },
  '50%': { transform: 'scale(1)' }
})
const thinkPulse = stylex.keyframes({
  '0%, 100%': { transform: 'scale(1)', opacity: 0.55 },
  '50%': { transform: 'scale(1.35)', opacity: 1 }
})
const boardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 10px', scale: 0.985 },
  '100%': { opacity: 1, translate: '0 0', scale: 1 }
})
const statusIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 6px' },
  '100%': { opacity: 1, translate: '0 0' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: 0.97 },
  '100%': { opacity: 1, translate: '0 0', scale: 1 }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    color: colors.white,
    fontFamily: fonts.system,
    backgroundColor: colors.grey6Dark,
    backgroundImage:
      `radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, ${colors.greenDark} 26%, transparent) 0%, transparent 55%),` +
      `radial-gradient(90% 70% at 85% 110%, color-mix(in srgb, ${colors.greenDark} 18%, transparent) 0%, transparent 60%)`
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: space.sm
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  kicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: colors.green,
    textTransform: 'uppercase'
  },
  title: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontWeight: weight.bold
  },
  chips: { display: 'flex', alignItems: 'center', gap: space.sm },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    borderRadius: radius.pill,
    fontFamily: fonts.rounded,
    fontSize: typeScale.subheadline,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    backgroundColor: glass.tintDark,
    boxShadow: `${shadow.rim}, ${shadow.float}`,
    // Always-on state ring, colour-faded so the turn indicator crossfades.
    outlineStyle: 'solid',
    outlineWidth: space.xxs,
    outlineOffset: space.xxs,
    outlineColor: 'transparent',
    transitionProperty: { default: 'outline-color', [reduce]: 'none' },
    transitionDuration: '.3s',
    transitionTimingFunction: easing.out
  },
  chipTurn: { outlineColor: `color-mix(in srgb, ${colors.green} 70%, transparent)` },
  discGlyph: {
    width: '11px',
    height: '11px',
    borderRadius: radius.circle,
    boxShadow: shadow.rim
  },
  iconBtn: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: '44px',
    height: '44px',
    borderRadius: radius.circle,
    color: colors.white,
    backgroundColor: app.fill,
    transitionProperty: { default: 'background-color, transform', [reduce]: 'none' },
    transitionDuration: '.25s',
    transitionTimingFunction: easing.out
  },
  muteSlash: {
    position: 'absolute',
    width: '20px',
    height: '2px',
    borderRadius: radius.pill,
    backgroundColor: colors.orange,
    transform: 'rotate(-45deg)',
    pointerEvents: 'none'
  },
  stage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    width: '100%',
    flexGrow: 1,
    minHeight: 0
  },
  stageWide: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: space.xl },
  boardCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space.xs, minWidth: 0 },
  board: {
    padding: space.xs,
    borderRadius: radius.xl,
    backgroundColor: `color-mix(in srgb, ${colors.greenDark} 46%, ${colors.black})`,
    boxShadow: `${shadow.rim}, ${shadow.float}`,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.out
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: space.xxs },
  cell: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    // Zero padding keeps the content box square: percentage-sized discs stay
    // circles instead of stretching into ovals on the UA button padding.
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    aspectRatio: '1',
    borderRadius: radius.xs,
    backgroundColor: `color-mix(in srgb, ${colors.greenDark} 34%, ${colors.grey6Dark})`,
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: space.xxs,
      outlineOffset: space.xxs,
      outlineColor: colors.green
    }
  },
  cellAlt: { backgroundColor: `color-mix(in srgb, ${colors.greenDark} 40%, ${colors.grey6Dark})` },
  cellLast: {
    outlineStyle: 'solid',
    outlineWidth: space.xxs,
    outlineOffset: `calc(0px - ${space.xxs})`,
    outlineColor: `color-mix(in srgb, ${colors.green} 65%, transparent)`
  },
  disc: {
    width: '82%',
    aspectRatio: '1',
    borderRadius: radius.circle,
    boxShadow: `${shadow.rim}, ${shadow.card}`,
    pointerEvents: 'none'
  },
  discB: { backgroundColor: DISC_B },
  discW: { backgroundColor: DISC_W },
  discFlipB: {
    animationName: { default: flipToBlack, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.inOut,
    animationFillMode: 'backwards'
  },
  discFlipW: {
    animationName: { default: flipToWhite, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.inOut,
    animationFillMode: 'backwards'
  },
  discIn: {
    animationName: { default: discIn, [reduce]: 'none' },
    animationDuration: '.35s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  discGhost: {
    position: 'absolute',
    width: '82%',
    aspectRatio: '1',
    borderRadius: radius.circle,
    opacity: 0.42,
    animationName: { default: ghostPulse, [reduce]: 'none' },
    animationDuration: '1.1s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite',
    pointerEvents: 'none'
  },
  discWillFlip: {
    outlineStyle: 'solid',
    outlineWidth: space.xxs,
    outlineOffset: 0,
    outlineColor: `color-mix(in srgb, ${colors.green} 85%, transparent)`,
    opacity: 0.75
  },
  hint: {
    width: '26%',
    height: '26%',
    borderRadius: radius.circle,
    backgroundColor: `color-mix(in srgb, ${colors.white} 55%, transparent)`,
    boxShadow: shadow.rim,
    pointerEvents: 'none'
  },
  hintYou: { backgroundColor: `color-mix(in srgb, ${colors.green} 80%, transparent)` },
  status: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: '20px',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.medium,
    color: app.label2,
    textAlign: 'center',
    animationName: { default: statusIn, [reduce]: 'none' },
    animationDuration: '.25s',
    animationTimingFunction: easing.out
  },
  thinkDots: { display: 'inline-flex', gap: space.xxs },
  thinkDot: {
    width: '4px',
    height: '4px',
    borderRadius: radius.circle,
    backgroundColor: colors.green,
    animationName: { default: thinkPulse, [reduce]: 'none' },
    animationDuration: '.9s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '100%',
    alignItems: 'center'
  },
  // Cover: everything below the board scrolls inside this region, so the
  // board keeps the full width and controls, tally and moves stay reachable.
  coverScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '100%',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    paddingBottom: space.xs
  },
  movesToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: '44px',
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    paddingRight: space.md,
    borderRadius: radius.md,
    fontSize: typeScale.subheadline,
    fontWeight: weight.semibold,
    color: colors.white,
    backgroundColor: app.fill,
    ':focus-visible': { outlineStyle: 'solid', outlineWidth: space.xxs, outlineColor: colors.green }
  },
  segTrack: {
    display: 'flex',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    boxShadow: shadow.rim
  },
  segBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    paddingRight: space.md,
    borderRadius: radius.pill,
    fontSize: typeScale.subheadline,
    fontWeight: weight.semibold,
    color: app.label2,
    ':focus-visible': { outlineStyle: 'solid', outlineWidth: space.xxs, outlineColor: colors.green }
  },
  segOn: { backgroundColor: `color-mix(in srgb, ${colors.greenDark} 70%, ${colors.grey5Dark})`, color: colors.white },
  row: { display: 'flex', gap: space.sm, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: '44px',
    paddingTop: space.sm,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    borderRadius: radius.pill,
    fontSize: typeScale.subheadline,
    fontWeight: weight.semibold,
    color: colors.white,
    ':focus-visible': { outlineStyle: 'solid', outlineWidth: space.xxs, outlineColor: colors.green },
    ':disabled': { opacity: 0.45 }
  },
  btnPrimary: {
    backgroundColor: `color-mix(in srgb, ${colors.greenDark} 78%, ${colors.black})`,
    boxShadow: shadow.card
  },
  btnGhost: { backgroundColor: app.fill, boxShadow: shadow.rim },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '268px',
    flexShrink: 0,
    alignSelf: 'stretch',
    minHeight: 0
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: `color-mix(in srgb, ${glass.tintDark} 70%, transparent)`,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim}, ${shadow.float}`
  },
  cardKicker: {
    fontSize: typeScale.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    color: app.label3
  },
  // The moves card owns the rail's leftover height and scrolls inside itself
  // so a long match can never push the layout past the display edge.
  movesCard: { flexGrow: 1, minHeight: 0, overflow: 'hidden' },
  tally: { display: 'flex', gap: space.sm, alignItems: 'center', fontSize: typeScale.subheadline },
  tallyItem: { display: 'flex', alignItems: 'center', gap: space.xxs, fontVariantNumeric: 'tabular-nums' },
  log: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    overflowY: 'auto',
    flexGrow: 1,
    minHeight: 0,
    scrollbarWidth: 'none'
  },
  logRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xxs,
    paddingBottom: space.xxs,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    borderRadius: radius.xs,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    color: app.label2,
    fontVariantNumeric: 'tabular-nums'
  },
  logNew: {
    color: colors.white,
    animationName: { default: statusIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.out
  },
  // The end-of-match card overlays the board's lower edge instead of growing
  // the document: each display is a fixed viewport and nothing may scroll.
  result: {
    position: 'absolute',
    insetInline: space.lg,
    bottom: space.xxxl,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: `color-mix(in srgb, ${glass.tintDark} 78%, transparent)`,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim}, ${shadow.float}`,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.spring
  },
  resultCover: { insetInline: space.sm, bottom: space.xxxl, padding: space.md },
  resultTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    fontWeight: weight.bold,
    lineHeight: leading.title2
  },
  sheetCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.xl,
    backgroundColor: `color-mix(in srgb, ${colors.grey5Dark} 88%, ${colors.black})`,
    boxShadow: `${shadow.rim}, ${shadow.float}`,
    width: '300px',
    color: colors.white
  },
  sheetTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: leading.headline
  },
  sheetBody: { fontSize: typeScale.subheadline, lineHeight: leading.subheadline, color: app.label2 },
  sheetRow: { display: 'flex', gap: space.xs, justifyContent: 'flex-end', paddingTop: space.xs },
  delay: (ms: number) => ({ animationDelay: `${ms}ms` }),
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px` })
})
