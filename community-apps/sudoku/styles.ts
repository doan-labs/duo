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

// Selected-cell wash and related-cell tint are the interaction colour over the
// themed surface, so the same styles carry both themes.

const cellIn = stylex.keyframes({
  from: { transform: 'scale(.8)', opacity: 0 },
  to: { transform: 'scale(1)', opacity: 1 }
})

// Transform-only on the solved card: animating opacity over the glass blur
// makes the card draw see-through while the animation runs (decision 18 trap).
const cardIn = stylex.keyframes({
  from: { transform: 'scale(.94) translateY(10px)' },
  to: { transform: 'scale(1) translateY(0)' }
})

const cardOut = stylex.keyframes({
  to: { transform: 'scale(.96) translateY(6px)', opacity: 0 }
})

const badgeIn = stylex.keyframes({
  from: { transform: 'scale(.3)' },
  to: { transform: 'scale(1)' }
})

// A wrong entry gets one small shake: feedback that the digit is illegal,
// without looping or stealing focus.
const cellShake = stylex.keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '25%': { transform: 'translateX(-2px)' },
  '50%': { transform: 'translateX(2px)' },
  '75%': { transform: 'translateX(-1px)' }
})

export const styles = stylex.create({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    paddingInline: space.xl,
    color: app.fg,
    backgroundColor: app.bg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    overflow: 'hidden',
    userSelect: 'none'
  },
  // The home bar owns the bottom 22 px; cover content clears it entirely.
  rootCover: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.xxl, paddingInline: space.sm },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, flexShrink: 0 },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  kicker: {
    color: app.link,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
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
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.rim,
    flexShrink: 0
  },
  chipLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2
  },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.semibold,
    lineHeight: leading.headline,
    fontVariantNumeric: 'tabular-nums',
    minWidth: space.xxl,
    textAlign: 'center'
  },
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexShrink: 0 },
  headerMode: { display: 'flex', flexGrow: 1, justifyContent: 'center', minWidth: 0 },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl
  },
  stageCover: { flexDirection: 'column', gap: space.sm },
  boardWrap: { position: 'relative', flexShrink: 0 },
  boardSize: (px: number) => ({ width: px, height: px }),
  cellFont: (px: number) => ({ fontSize: px }),
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.lg,
    backgroundColor: app.separator,
    boxShadow: shadow.rim
  },
  box: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: 1,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: app.separator
  },
  cell: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    padding: 0,
    backgroundColor: app.surface,
    color: app.fg,
    fontFamily: fonts.rounded,
    fontWeight: weight.regular,
    cursor: 'pointer',
    // shared.select's rhythm: state colours ease instead of snapping.
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.22s',
    transitionTimingFunction: easing.out
  },
  cellRelated: { backgroundColor: `color-mix(in srgb, ${app.surface} 82%, ${app.link})` },
  cellSame: { backgroundColor: `color-mix(in srgb, ${app.surface} 72%, ${app.link})` },
  cellSelected: {
    backgroundColor: `color-mix(in srgb, ${app.surface} 55%, ${app.link})`,
    boxShadow: `inset 0 0 0 2px ${app.link}`,
    zIndex: 1
  },
  cellGiven: { color: app.fg, fontWeight: weight.semibold },
  cellEntry: { color: app.link },
  cellWrong: {
    color: colors.red,
    backgroundColor: `color-mix(in srgb, ${app.surface} 80%, ${colors.red})`,
    animationName: { default: cellShake, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.out
  },
  cellGivenWrong: { color: colors.red },
  digit: {
    animationName: { default: cellIn, [reduce]: 'none' },
    animationDuration: '.18s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  notes: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    color: app.label2,
    fontFamily: fonts.system,
    fontWeight: weight.regular,
    pointerEvents: 'none'
  },
  note: { display: 'grid', placeItems: 'center', lineHeight: 1 },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    width: 300,
    flexShrink: 0,
    alignSelf: 'center'
  },
  railCover: { display: 'contents' },
  pad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: space.sm
  },
  padCover: {
    gridTemplateColumns: 'repeat(9, 1fr)',
    gap: space.xxs,
    width: '100%'
  },
  padKey: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    height: 46,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: app.surface,
    color: app.link,
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    boxShadow: shadow.rim,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.out,
    transform: { default: 'none', ':active': motion.press },
    opacity: { default: 1, ':disabled': 0.32 }
  },
  padKeyCover: { height: 44 },
  padKeyPencil: {
    // Pencil mode must be obvious on the pad itself, not just on the toggle:
    // the next tap jots a note instead of committing a digit.
    backgroundColor: `color-mix(in srgb, ${app.surface} 70%, ${app.link})`
  },
  padLeft: { fontSize: typeScale.caption2, fontFamily: fonts.system, fontWeight: weight.medium, color: app.label2 },
  padKeyCoverLeft: { display: 'none' },
  tools: { display: 'flex', flexWrap: 'wrap', gap: space.xs },
  toolsCover: { width: '100%', flexWrap: 'nowrap' },
  toolWide: { flexBasis: '30%', flexGrow: 1 },
  tool: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    height: 48,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: app.surface,
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    fontWeight: weight.medium,
    cursor: 'pointer',
    boxShadow: shadow.rim,
    flex: '1 1 0',
    minWidth: 0,
    transitionProperty: 'transform, color, background-color, box-shadow',
    transitionDuration: `${motion.pressDuration}, .2s, .2s, .2s`,
    transitionTimingFunction: easing.out,
    transform: { default: 'none', ':active': motion.press },
    opacity: { default: 1, ':disabled': 0.35 }
  },
  toolCover: { height: 46 },
  toolActive: { color: app.link, boxShadow: `${shadow.rim},inset 0 0 0 1.5px ${app.link}` },
  // An armed destructive action asks once more, in red like iOS destructive
  // controls, before it runs.
  toolArmed: {
    color: colors.red,
    boxShadow: `${shadow.rim},inset 0 0 0 1.5px ${colors.red}`
  },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: space.xs },
  statRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.sm,
    paddingInline: space.xs,
    borderRadius: radius.md,
    backgroundColor: app.surface,
    boxShadow: shadow.rim,
    minWidth: 0
  },
  statLabel: { color: app.label2, fontSize: typeScale.caption2 },
  statValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  status: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.footnote,
    textAlign: 'center',
    flexShrink: 0,
    minHeight: leading.footnote
  },
  statusCover: { fontSize: typeScale.caption1 },
  // Decision 18's glass recipe: blur + tint + rim + float, xl corner on the
  // card floating over the board, motion on transform only.
  solvedCard: {
    position: 'absolute',
    inset: space.xxs,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.xl,
    backgroundColor: `color-mix(in srgb, ${app.surface} 72%, transparent)`,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    zIndex: 2,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  solvedCardOut: {
    animationName: { default: cardOut, [reduce]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.out,
    animationFillMode: 'forwards'
  },
  solvedInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space.sm, padding: space.lg },
  solvedBadge: {
    display: 'grid',
    placeItems: 'center',
    width: 52,
    height: 52,
    borderRadius: radius.circle,
    backgroundColor: `color-mix(in srgb, ${colors.green} 22%, transparent)`,
    color: colors.green,
    animationName: { default: badgeIn, [reduce]: 'none' },
    animationDuration: '.4s',
    animationDelay: '.12s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  solvedTitle: { marginBlock: 0, fontFamily: fonts.rounded, fontSize: typeScale.title2, fontWeight: weight.bold },
  solvedSub: { color: app.label2, fontSize: typeScale.footnote },
  solvedActions: { display: 'flex', gap: space.sm },
  loading: {
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: app.label3,
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.semibold
  }
})
