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

export const BOARD_PAD = 6
const reduce = '@media (prefers-reduced-motion: reduce)'

const pieceIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.6' },
  '70%': { opacity: 1, scale: '1.08' },
  '100%': { opacity: 1, scale: '1' }
})
const boardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 12px', scale: '.97' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: '.92' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const sheetIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.86' },
  '100%': { opacity: 1, scale: '1' }
})
// The check glow breathes twice, then holds: an alarm, not a siren.
const checkPulse = stylex.keyframes({
  '0%': { backgroundColor: 'rgba(255,69,58,.2)' },
  '45%': { backgroundColor: 'rgba(255,69,58,.62)' },
  '100%': { backgroundColor: 'rgba(255,69,58,.4)' }
})
const thinkDot = stylex.keyframes({
  '0%,100%': { opacity: '.25' },
  '40%': { opacity: '1' }
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
    // Felt-table light: a cool cyan pool up top, a warm amber one low.
    backgroundImage:
      'radial-gradient(80% 50% at 20% 0%,rgba(60,211,254,.09),transparent 62%),radial-gradient(75% 50% at 80% 108%,rgba(255,169,77,.08),transparent 60%)',
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
    minWidth: 54,
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
  chipYou: { color: colors.cyanDark },
  chipBot: { color: colors.orangeDark },
  chipDraw: { color: app.label2 },
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
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    color: colors.grey3,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    flexShrink: 0
  },
  statusCheck: { color: colors.redDark, fontWeight: weight.semibold },
  thinkDots: { display: 'inline-flex', gap: 2, paddingInlineStart: 2 },
  thinkDot: {
    width: 4,
    height: 4,
    borderRadius: radius.circle,
    backgroundColor: colors.orangeDark,
    animationName: { default: thinkDot, [reduce]: 'none' },
    animationDuration: '1s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  thinkDotB: { animationDelay: '.15s' },
  thinkDotC: { animationDelay: '.3s' },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: space.xl,
    flexShrink: 1
  },
  stageCover: { flexDirection: 'column', justifyContent: 'flex-start', gap: space.md },
  // The board well: punched into the cabinet, with the squares clipped by the
  // inner corner so the field reads as one piece.
  board: {
    position: 'relative',
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
  grid: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  fitGrid: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  square: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    paddingBlock: 0,
    paddingInline: 0,
    cursor: 'pointer',
    touchAction: 'manipulation',
    fontFamily: fonts.system
  },
  // Ivory and slate: the classic two-tone field, on the grey scale.
  light: { backgroundColor: colors.grey5 },
  dark: { backgroundColor: colors.grey4Dark },
  selected: {
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(60,211,254,.3)',
      boxShadow: 'inset 0 0 0 2.5px rgba(60,211,254,.9)'
    }
  },
  lastMove: {
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(60,211,254,.2)'
    }
  },
  checked: {
    animationName: { default: checkPulse, [reduce]: 'none' },
    animationDuration: '.9s',
    animationTimingFunction: easing.inOut,
    animationFillMode: 'forwards'
  },
  dot: {
    position: 'absolute',
    width: '26%',
    height: '26%',
    borderRadius: radius.circle,
    backgroundColor: 'rgba(20,20,24,.3)',
    pointerEvents: 'none'
  },
  ring: {
    position: 'absolute',
    inset: '4%',
    borderRadius: radius.circle,
    boxShadow: 'inset 0 0 0 3px rgba(20,20,24,.3)',
    pointerEvents: 'none'
  },
  piece: {
    fontFamily: fonts.system,
    lineHeight: 1,
    userSelect: 'none',
    animationName: { default: pieceIn, [reduce]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  fitPiece: (size: number) => ({ fontSize: `${size}px` }),
  pieceW: {
    color: colors.white,
    textShadow: '0 0 2px rgba(10,10,14,.85),0 2px 3px rgba(0,0,0,.45)'
  },
  pieceB: {
    color: colors.black,
    textShadow: '0 0 2.5px rgba(235,235,240,.5),0 2px 3px rgba(0,0,0,.5)'
  },
  coord: {
    position: 'absolute',
    fontSize: typeScale.caption2,
    fontStyle: 'normal',
    fontWeight: weight.bold,
    pointerEvents: 'none'
  },
  coordFile: { right: 3, bottom: 1 },
  coordRank: { left: 3, top: 1 },
  // Coordinates print in the opposite square's ink, like a real board's edge.
  coordOnLight: { color: 'rgba(28,28,32,.55)' },
  coordOnDark: { color: 'rgba(235,235,240,.5)' },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: space.md,
    minWidth: 0,
    width: 200,
    flexShrink: 0
  },
  railCover: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', alignItems: 'center', gap: space.sm },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  fieldCover: { flexShrink: 0 },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  // Segmented row for a dark well: a glass track, the selected segment raised
  // in a light-grey pill so its label stays lit. Unselected keeps the dim
  // label the field labels use.
  segTrack: {
    display: 'inline-flex',
    gap: 2,
    padding: 2,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    flexShrink: 0
  },
  segBtn: {
    height: 24,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: colors.grey3,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    transitionProperty: 'color,background-color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.inOut,
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  segOn: {
    backgroundColor: glass.tint,
    color: colors.white,
    boxShadow: '0 1px 4px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.18)'
  },
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
    transitionProperty: 'transform,background-color,opacity',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':disabled': { opacity: '.4', cursor: 'default' },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  // The scoresheet: a glass column on the inner display, a single-line strip on
  // the cover. scrollbar-width none keeps it reading as chrome, not a pane.
  moves: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    minHeight: 0,
    maxHeight: 190,
    overflowY: 'auto',
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    scrollbarWidth: 'none'
  },
  movesCover: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    maxHeight: 'none',
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden'
  },
  moveRow: { display: 'flex', gap: space.xs, flexShrink: 0 },
  moveNum: {
    color: app.label2,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    minWidth: space.lg,
    textAlign: 'end'
  },
  moveSan: {
    color: colors.grey3,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    minWidth: '4ch'
  },
  moveSanNew: { color: colors.cyanDark, fontWeight: weight.bold },
  // The promotion picker floats over the board, centred on the file the pawn
  // reached so the choice reads in place.
  promo: {
    position: 'absolute',
    display: 'flex',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: sheetIn, [reduce]: 'none' },
    animationDuration: '.26s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both',
    zIndex: 3
  },
  fitPromo: (x: number, y: number) => ({ left: `${x}px`, top: `${y}px` }),
  promoButton: {
    display: 'grid',
    placeItems: 'center',
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    cursor: 'pointer',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  fitSquare: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
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
  resultKickerDraw: { color: app.label2 },
  resultTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    letterSpacing: tracking.title3,
    lineHeight: leading.title3
  }
})
