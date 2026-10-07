import { shared } from '@doan-labs/duo-uikit/styles.ts'
import {
  app,
  colors,
  easing,
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
// Keyframes ride transform and opacity only: a glass panel whose ancestor is
// mid-fade reads nothing behind it, so every entrance is a transform move.
const liftIn = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(14px) scale(.96)' } })
const popIn = stylex.keyframes({ from: { opacity: 0, transform: 'scale(.6)' } })
const confettiFall = stylex.keyframes({
  '0%': { transform: 'translateY(-12px) rotate(0deg)', opacity: 0 },
  '12%': { opacity: 1 },
  '100%': { transform: 'translateY(120px) rotate(240deg)', opacity: 0 }
})

export const styles = stylex.create({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: app.bg,
    color: app.fg,
    position: 'relative'
  },
  rootCover: {},
  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },
  brand: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  kicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase',
    fontWeight: weight.semibold,
    color: app.label3
  },
  title: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold,
    margin: 0
  },
  titleCover: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3
  },
  headerSide: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.sm },
  chip: {
    display: 'flex',
    alignItems: 'baseline',
    gap: space.xs,
    paddingTop: space.xs,
    paddingRight: space.md,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    color: app.label2
  },
  chipValue: { fontWeight: weight.semibold, color: app.fg, fontVariantNumeric: 'tabular-nums' },
  iconBtn: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: app.fill3,
    color: app.label2,
    cursor: 'pointer'
  },
  iconBtnOn: { backgroundColor: app.link, color: colors.white },
  iconBtnWarn: { backgroundColor: colors.red, color: colors.white },

  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    gap: space.lg,
    paddingTop: 0,
    paddingRight: space.lg,
    paddingBottom: space.xxl,
    paddingLeft: space.lg
  },
  stageCover: { flexDirection: 'column', gap: space.sm, paddingRight: space.md, paddingLeft: space.md },

  // The felt table the board sits on.
  boardWrap: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: app.surface,
    boxShadow: shadow.rim,
    touchAction: 'none',
    cursor: 'grab'
  },
  boardWrapPan: { cursor: 'grabbing' },
  boardWrapPlace: { cursor: 'crosshair' },
  boardSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },
  // Felt dots ride the pan the way mind-map's graph paper does: the desk
  // texture stays anchored to the table, not the window.
  dots: {
    backgroundImage: `radial-gradient(color-mix(in srgb, ${colors.white} 8%, transparent) 1px, transparent 1px)`,
    backgroundSize: '28px 28px'
  },

  zoomDock: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xs,
    paddingRight: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.xs,
    borderRadius: radius.pill,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  zoomBtn: {
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: 'transparent',
    color: colors.white,
    cursor: 'pointer'
  },
  zoomPct: {
    minWidth: 44,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer'
  },

  // The floating card for the piece awaiting a tap placement.
  heldCard: {
    position: 'absolute',
    left: '50%',
    bottom: space.lg,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.sm,
    paddingRight: space.sm,
    paddingBottom: space.sm,
    paddingLeft: space.md,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    color: colors.white,
    animationName: { default: liftIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop,
    zIndex: 5
  },
  heldThumb: { width: 52, height: 52, display: 'grid', placeItems: 'center' },
  heldText: { display: 'flex', flexDirection: 'column' },
  heldTitle: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  heldSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: `color-mix(in srgb, ${colors.white} 66%, transparent)`
  },
  heldCancel: {
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: `color-mix(in srgb, ${colors.white} 16%, transparent)`,
    color: colors.white,
    cursor: 'pointer'
  },

  // The tray: a rail on the inner display, a swapped pane on the cover.
  rail: {
    width: 236,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    minHeight: 0
  },
  railCover: { width: 'auto', flexGrow: 1, flexShrink: 1, minHeight: 0 },
  railHead: { display: 'flex', alignItems: 'center', gap: space.sm },
  railTitle: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.label2
  },
  railCount: { marginLeft: 'auto', color: app.label3, fontVariantNumeric: 'tabular-nums' },
  trayBox: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.rim,
    paddingTop: space.md,
    paddingRight: space.md,
    paddingBottom: space.md,
    paddingLeft: space.md,
    WebkitOverflowScrolling: 'touch'
  },
  trayGrid: { display: 'flex', flexWrap: 'wrap', gap: space.sm, alignContent: 'flex-start' },
  trayEmpty: {
    paddingTop: space.xl,
    paddingBottom: space.xl,
    textAlign: 'center',
    color: app.label3,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  pieceBtn: {
    width: 64,
    height: 64,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.18s'
  },
  pieceBtnHeld: { backgroundColor: `color-mix(in srgb, ${app.link} 26%, ${app.fill3})` },
  pieceBtnGhost: { opacity: 0.4 },
  segTrack: {
    display: 'inline-flex',
    gap: space.xxs,
    paddingTop: space.xxs,
    paddingRight: space.xxs,
    paddingBottom: space.xxs,
    paddingLeft: space.xxs,
    borderRadius: radius.md,
    backgroundColor: app.fill3
  },
  segFill: { display: 'flex', flexGrow: 1 },
  segBtn: {
    minHeight: 44,
    paddingTop: 0,
    paddingRight: space.sm,
    paddingBottom: 0,
    paddingLeft: space.sm,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer',
    flexGrow: 1
  },
  paneSegBtn: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  segOn: { backgroundColor: app.control, color: app.fg, boxShadow: shadow.card },
  iconHit: { width: 44, height: 44 },
  action: {
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingTop: 0,
    paddingRight: space.md,
    paddingBottom: 0,
    paddingLeft: space.md,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.fg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },
  actionAccent: { backgroundColor: app.link, color: colors.white },
  hint: {
    margin: 0,
    paddingBottom: space.xl,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label3,
    textAlign: 'center'
  },

  // Sheet contents: picker cards and the destructive confirm.
  sheetBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg
  },
  artRow: { display: 'flex', gap: space.sm },
  artCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: app.fill3,
    paddingTop: space.md,
    paddingRight: space.md,
    paddingBottom: space.md,
    paddingLeft: space.md,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    cursor: 'pointer',
    textAlign: 'left'
  },
  artCardOn: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: app.link,
    outlineOffset: -2
  },
  artThumb: { width: '100%', aspectRatio: '4 / 3', borderRadius: radius.sm, overflow: 'hidden', display: 'block' },
  artName: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.fg
  },
  artMeta: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label3
  },
  confirmCard: { display: 'flex', flexDirection: 'column', gap: space.md },
  confirmTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    margin: 0
  },
  confirmSub: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2,
    margin: 0
  },
  confirmActions: { display: 'flex', gap: space.sm, justifyContent: 'flex-end' },
  sheetBtn: { minHeight: 44 },

  // Completion veil over the board.
  veil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: `color-mix(in srgb, ${colors.black} 42%, transparent)`,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    zIndex: 6,
    borderWidth: 0,
    cursor: 'default'
  },
  veilCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xl,
    paddingRight: space.xl,
    paddingBottom: space.xl,
    paddingLeft: space.xl,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: popIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop
  },
  veilKicker: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    textTransform: 'uppercase',
    fontWeight: weight.bold,
    color: colors.yellowDark
  },
  veilTitle: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    color: colors.white
  },
  veilSub: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: `color-mix(in srgb, ${colors.white} 72%, transparent)`
  },
  veilActions: { display: 'flex', gap: space.sm, paddingTop: space.sm },
  veilBtn: {
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: 0,
    paddingRight: space.lg,
    paddingBottom: 0,
    paddingLeft: space.lg,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: `color-mix(in srgb, ${colors.white} 18%, transparent)`,
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },
  veilBtnAccent: { backgroundColor: app.link },
  confetti: {
    position: 'absolute',
    top: 0,
    width: 7,
    height: 7,
    borderRadius: radius.xs,
    animationName: { default: confettiFall, [reduce]: 'none' },
    animationDuration: '1.6s',
    animationTimingFunction: easing.out,
    animationIterationCount: 'infinite'
  },
  guideTag: {
    position: 'absolute',
    left: space.md,
    top: space.md,
    paddingTop: space.xs,
    paddingRight: space.sm,
    paddingBottom: space.xs,
    paddingLeft: space.sm,
    borderRadius: radius.pill,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.rim,
    color: colors.white,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    zIndex: 4
  },
  savedTag: { display: 'inline-flex', alignItems: 'center', gap: space.xs, color: app.label3 },
  segWrap: { paddingRight: space.md, paddingLeft: space.md, display: 'flex', flexShrink: 0 },
  // The piece riding the pointer mid-drag: floats above everything, never
  // receives the pointer itself.
  ghost: {
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 40,
    pointerEvents: 'none',
    opacity: 0.92,
    filter: 'none'
  },
  ghostAt: (x: number, y: number, px: number) => ({
    transform: `translate(${x - px / 2}px, ${y - px * 0.62}px)`,
    width: px,
    height: px
  }),
  confettiAt: (i: number) => ({
    left: `${6 + i * 7}%`,
    animationDelay: `${(i % 5) * 0.28}s`,
    backgroundColor: [colors.yellow, colors.blue, colors.red, colors.green, colors.purple][i % 5]
  }),
  danger: { backgroundColor: colors.red, color: colors.white },
  // shared.press has no reduced-motion variant (platform gap): keep the press
  // colour ease but flatten the scale so reduce truly means reduce.
  pressCalm: {
    transform: { [reduce]: { ':active': 'scale(1)' } }
  }
})

export const press = [shared.press, styles.pressCalm]
