// Wallet's chrome, rebuilt as Reminders on iPad: the floating glass sidebar
// unfolded (decision 18: a tint, a rim, a shadow), smart-group tiles over a
// "My Passes" grouped list, the card-stack fan kept as the app's second root,
// and the pay sheet rising over a dimmed stack.

import {
  app,
  appAppearance,
  colors,
  easing,
  fonts,
  glass,
  layout,
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

const riseUp = stylex.keyframes({ from: { transform: 'translateY(24px)', opacity: 0 } })
const tick = stylex.keyframes({
  from: { transform: 'scale(.4)', opacity: 0 },
  '60%': { transform: 'scale(1.12)', opacity: 1 },
  to: { transform: 'scale(1)', opacity: 1 }
})

export const styles = stylex.create({
  /** Whole app: sidebar floats over the pane, the pane runs under it. */
  split: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: app.bg
  },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  /** The pane keeps its text clear of the panel; everything else may pass under the glass. */
  paneSide: { paddingLeft: 202 },
  paneRoot: { isolation: 'isolate' },

  /** Floating glass sidebar, sized and rounded like the Store's. */
  side: {
    position: 'absolute',
    zIndex: 2,
    top: -32,
    bottom: 8,
    left: 8,
    width: 186,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 24,
    paddingRight: 8,
    paddingBottom: 12,
    paddingLeft: 8,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  sideFind: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    height: 34,
    paddingRight: 12,
    paddingLeft: 12,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    flexShrink: 0
  },
  sideField: {
    appearance: 'none',
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    outline: { default: 'none', ':focus': 'none' },
    '::placeholder': { color: app.label3 },
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  sideSec: {
    paddingTop: 12,
    paddingRight: 10,
    paddingBottom: 3,
    paddingLeft: 10,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label3
  },
  sideRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    textAlign: 'left',
    cursor: 'pointer'
  },
  sideRowOn: { backgroundColor: app.fill, color: app.link, fontWeight: weight.semibold },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideTint: { display: 'grid', placeItems: 'center', width: 20, flexShrink: 0 },
  /** A row's tinted glyph colour, set by the pass's face accent. */
  tint: (c: string) => ({ color: c }),
  sideCount: { color: app.label3, fontWeight: weight.regular, fontVariantNumeric: 'tabular-nums' },
  /** The "+ New Pass" row pinned to the sidebar's foot, link blue like Reminders. */
  sideFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    width: '100%',
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.link,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    textAlign: 'left',
    cursor: 'pointer'
  },

  /** A page's own chrome: back chevron, the big title, actions at the trailing edge. */
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  headSide: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.sm },
  /** Reminders' detail titles take the list's accent colour. */
  title: (c: string) => ({
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    color: c
  }),
  body: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 12,
    position: 'relative'
  },
  col: { width: '100%', maxWidth: 660, marginRight: 'auto', marginLeft: 'auto' },

  /** The smart-group tiles: two columns like Reminders, icon circle top-left. */
  tiles: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  tilesWide: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  tileIc: (c: string) => ({
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    backgroundColor: c,
    color: colors.white,
    flexShrink: 0
  }),
  tileNum: {
    marginTop: 'auto',
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  tileLabel: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    color: app.label2
  },

  /** "My Passes" header over the grouped rows; Reminders sets it small-caps grey. */
  sec: {
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: 6,
    paddingLeft: space.lg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.label3
  },
  /** The pass's coloured circle at a row's leading edge. */
  dot: (c: string, size: number) => ({
    display: 'grid',
    placeItems: 'center',
    width: size,
    height: size,
    borderRadius: radius.circle,
    backgroundColor: c,
    color: colors.white,
    flexShrink: 0
  }),
  linkRow: { width: '100%', textAlign: 'left', cursor: 'pointer' },
  empty: { paddingTop: 40, paddingBottom: 40, textAlign: 'center' },

  /** Reminders' bottom action bar: link-blue, outside the scroll. */
  bar: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 6,
    paddingRight: space.lg,
    paddingBottom: 14,
    paddingLeft: space.lg
  },
  barBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.medium,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  barRight: { marginLeft: 'auto' },

  /** The card face: one gradient plate reused by the fan, the hero and the pay sheet. */
  face: (bg: string, w: number) => ({
    position: 'relative',
    width: w,
    aspectRatio: '1.586',
    borderRadius: radius.xl,
    backgroundImage: bg,
    boxShadow: shadow.float,
    overflow: 'hidden',
    flexShrink: 0
  }),
  faceMark: { position: 'absolute', top: 14, left: 14, opacity: 0.9 },
  faceBig: { position: 'absolute', right: -18, bottom: -26, opacity: 0.16 },
  faceName: {
    position: 'absolute',
    left: 14,
    bottom: 30,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  faceNum: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  faceInk: { color: colors.white },
  faceInkDark: { color: colors.grey6Dark },

  /** Detail hero: the face centred, its detail line under it. */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg
  },
  heroSub: { color: app.label2 },

  /** The stack: cards fanned, the top one the live selection. */
  fan: { position: 'relative', flexGrow: 1, minHeight: 0 },
  fanCard: (bg: string) => ({
    position: 'absolute',
    left: '50%',
    top: 10,
    width: 240,
    aspectRatio: '1.586',
    borderRadius: radius.xl,
    backgroundImage: bg,
    boxShadow: shadow.float,
    marginLeft: -120,
    transitionProperty: 'transform',
    transitionDuration: '.45s',
    transitionTimingFunction: easing.pop,
    cursor: 'pointer'
  }),
  /** Where a card sits in the fan: depth steps down, the front one full size. */
  fanShift: (i: number, top: boolean) => ({ transform: `translateY(${i * 48}px) scale(${top ? 1 : 0.92})` }),
  fanHint: {
    position: 'absolute',
    right: 0,
    bottom: 18,
    left: 0,
    textAlign: 'center',
    color: app.label2
  },

  /** The pay sheet: a dimmed stack, the card rising, the NFC hint under it. */
  pay: {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    paddingBottom: 34,
    backgroundColor: appAppearance.walletScrim
  },
  payCard: {
    animationName: { default: riseUp, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'backwards'
  },
  payHint: { color: colors.white, fontWeight: weight.semibold },
  paySub: { color: colors.grey4 },
  payDone: {
    display: 'grid',
    placeItems: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.circle,
    backgroundColor: colors.green,
    color: colors.white,
    animationName: { default: tick, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.45s',
    animationTimingFunction: easing.spring
  },

  /** Sheet internals. */
  sheetPad: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: { paddingBottom: space.xs },
  sheetBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: space.sm },

  /** The delete row's label, centred and red. */
  delLabel: { width: '100%', textAlign: 'center', color: colors.red }
})
