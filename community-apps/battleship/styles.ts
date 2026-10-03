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

export const BOARD_PAD = 8
export const GRID_GAP = 4
const reduce = '@media (prefers-reduced-motion: reduce)'

// One-shot keyframes touch only scale/translate/opacity so an animated
// transform never teleports a cell whose position lives in layout.
const boardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 12px', scale: '.96' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const pegIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.4' },
  '60%': { opacity: 1, scale: '1.25' },
  '100%': { opacity: 1, scale: '1' }
})
const ringIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.6' },
  '100%': { opacity: 1, scale: '1' }
})
const hullIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.7' },
  '70%': { opacity: 1, scale: '1.05' },
  '100%': { opacity: 1, scale: '1' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: '.92' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
// Victory rumble: a pump and jitter so the winning board reads as celebrating.
const winPulse = stylex.keyframes({
  '0%': { scale: '1', translate: '0 0' },
  '30%': { scale: '1.04', translate: '-3px 0' },
  '55%': { scale: '.99', translate: '3px 1px' },
  '75%': { scale: '1.02', translate: '-1px 0' },
  '100%': { scale: '1', translate: '0 0' }
})
const loseSink = stylex.keyframes({
  '0%': { scale: '1' },
  '45%': { scale: '1.015' },
  '100%': { scale: '1' }
})
// The ranging alarm breathes twice, then holds: an alert, not a siren.
const lastShotPulse = stylex.keyframes({
  '0%,100%': { opacity: '.55' },
  '50%': { opacity: '1' }
})
const thinkDot = stylex.keyframes({
  '0%,100%': { opacity: '.25' },
  '40%': { opacity: '1' }
})
// Turn hand-off: the status line slides in on each change, cueing whose move
// it is without blocking the grid.
const statusIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 4px' },
  '100%': { opacity: 1, translate: '0 0' }
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
    // Open-sea light: a cold cyan pool up top, enemy embers low astern.
    backgroundImage: `radial-gradient(80% 50% at 18% 0%,color-mix(in srgb, ${colors.cyanDark} 9%, transparent),transparent 62%),radial-gradient(75% 50% at 82% 108%,color-mix(in srgb, ${colors.orangeDark} 8%, transparent),transparent 60%)`,
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
  chipYou: { color: colors.cyanDark },
  chipBot: { color: colors.orangeDark },
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
    minHeight: space.xl,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    flexShrink: 0
  },
  statusLive: { color: colors.grey3 },
  statusBad: { color: colors.orangeDark },
  statusWin: { color: colors.cyanDark, fontWeight: weight.semibold },
  statusLose: { color: colors.redDark, fontWeight: weight.semibold },
  // The status text itself swaps on every turn/phase change, keyed in markup.
  statusSwap: {
    display: 'inline-block',
    minWidth: 0,
    flexShrink: 1,
    animationName: { default: statusIn, [reduce]: 'none' },
    animationDuration: '.26s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  thinkDots: { display: 'inline-flex', gap: space.xxs, paddingInlineStart: space.xxs },
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
    gap: space.lg,
    flexShrink: 1
  },
  stageCover: { flexDirection: 'column', justifyContent: 'flex-start', gap: space.md },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    minWidth: 0,
    flexShrink: 0
  },
  panelHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingInline: space.xxs
  },
  panelTitle: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  panelTitleYou: { color: colors.cyanDark },
  panelTitleEnemy: { color: colors.orangeDark },
  panelMeta: {
    color: app.label3,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption2,
    fontVariantNumeric: 'tabular-nums'
  },
  // The board well: punched into the hull, darker at the top edge so the ocean
  // reads as sunk into the cabinet.
  board: {
    position: 'relative',
    padding: BOARD_PAD,
    borderRadius: radius.xxl,
    backgroundColor: `color-mix(in srgb, ${colors.black} 36%, transparent)`,
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.black} 42%, transparent),transparent 38%)`,
    flexShrink: 0,
    transitionProperty: 'box-shadow',
    transitionDuration: '.28s',
    transitionTimingFunction: easing.inOut,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  // The actionable well glows in its side's hue: where your next move belongs.
  boardPlace: {
    boxShadow: `0 0 0 1.5px color-mix(in srgb, ${colors.cyanDark} 55%, transparent),0 0 26px color-mix(in srgb, ${colors.cyanDark} 20%, transparent)`
  },
  boardFire: {
    boxShadow: `0 0 0 1.5px color-mix(in srgb, ${colors.orangeDark} 60%, transparent),0 0 26px color-mix(in srgb, ${colors.orangeDark} 22%, transparent)`
  },
  // Stagger the second well's entrance so the two boards cascade, not pop.
  boardDelay: { animationDelay: '.06s' },
  grid: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(10, minmax(0, 1fr))',
    gap: GRID_GAP,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  // Overlay pieces are measured in JS from the board box; the template keeps
  // the length out of the literal table.
  box: (left: number, top: number, width: number, height: number) => ({
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }),
  sea: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: radius.xs,
    backgroundColor: `color-mix(in srgb, ${colors.cyanDark} 5%, transparent)`,
    fontFamily: fonts.system,
    cursor: 'default',
    touchAction: 'manipulation'
  },
  // Two quiet tones break the ocean into a grid without a literal line.
  seaAlt: { backgroundColor: `color-mix(in srgb, ${colors.cyanDark} 9%, transparent)` },
  // Enemy water runs warm: the two boards read apart before a label is read.
  seaEnemy: { backgroundColor: `color-mix(in srgb, ${colors.orangeDark} 5%, transparent)` },
  seaAltEnemy: { backgroundColor: `color-mix(in srgb, ${colors.orangeDark} 9%, transparent)` },
  seaFire: {
    cursor: 'crosshair',
    ':hover': { backgroundColor: `color-mix(in srgb, ${colors.orangeDark} 24%, transparent)` }
  },
  seaPlace: {
    cursor: 'pointer',
    ':hover': { backgroundColor: `color-mix(in srgb, ${colors.cyanDark} 18%, transparent)` }
  },
  coord: {
    position: 'absolute',
    fontSize: typeScale.caption2,
    fontStyle: 'normal',
    fontWeight: weight.bold,
    pointerEvents: 'none'
  },
  // Files live on the top row (top-right corner) and ranks on the left column
  // (top-left), so the A1 corner pairs two single glyphs horizontally and the
  // two-glyph "10" gets A10 to itself.
  coordFile: { right: space.xxs, top: 0 },
  coordRank: { left: space.xxs, top: 0 },
  coordInk: { color: `color-mix(in srgb, ${colors.cyanDark} 58%, transparent)` },
  coordInkEnemy: { color: `color-mix(in srgb, ${colors.orangeDark} 62%, transparent)` },
  // Overlay layer: hulls, pegs, the last-shot ring and the placing ghost all
  // paint above the sea cells and never intercept a tap.
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none'
  },
  // A hull is one rounded bar spanning its cells, with a top catch-light and a
  // soft contact shadow so it reads as sitting on the water, not pasted on.
  hull: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.grey2} 78%, transparent),color-mix(in srgb, ${colors.grey3Dark} 88%, transparent))`,
    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${colors.white} 26%, transparent),0 2px 6px color-mix(in srgb, ${colors.black} 45%, transparent)`,
    animationName: { default: hullIn, [reduce]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  hullPickup: {
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.cyanDark} 55%, transparent),color-mix(in srgb, ${colors.cyanDark} 30%, transparent))`
  },
  hullSunk: {
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.redDark} 34%, transparent),color-mix(in srgb, ${colors.grey4Dark} 82%, transparent))`,
    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${colors.white} 10%, transparent),0 1px 3px color-mix(in srgb, ${colors.black} 50%, transparent)`
  },
  // A kill on the targeting grid: the enemy hull only surfaces once sunk.
  hullEnemy: {
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.redDark} 52%, transparent),color-mix(in srgb, ${colors.redDark} 30%, transparent))`,
    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${colors.white} 16%, transparent),0 2px 6px color-mix(in srgb, ${colors.black} 45%, transparent)`
  },
  // The placing ghost follows the pointer under the live hull outline.
  ghost: {
    position: 'absolute',
    borderRadius: radius.pill,
    boxSizing: 'border-box',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: `color-mix(in srgb, ${colors.cyanDark} 65%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${colors.cyanDark} 14%, transparent)`
  },
  ghostBad: {
    borderColor: `color-mix(in srgb, ${colors.redDark} 75%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${colors.redDark} 16%, transparent)`
  },
  peg: {
    position: 'absolute',
    borderRadius: radius.circle,
    animationName: { default: pegIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  pegMiss: {
    backgroundColor: `color-mix(in srgb, ${colors.grey3} 88%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.white} 30%, transparent),0 1px 2px color-mix(in srgb, ${colors.black} 40%, transparent)`
  },
  pegHit: {
    backgroundColor: colors.orangeDark,
    boxShadow: `0 0 10px color-mix(in srgb, ${colors.orangeDark} 75%, transparent)`
  },
  lastRing: {
    position: 'absolute',
    borderRadius: radius.sm,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderWidth: 2,
    animationName: { default: ringIn, [reduce]: 'none' },
    animationDuration: '.26s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  lastRingYou: { borderColor: `color-mix(in srgb, ${colors.cyanDark} 80%, transparent)` },
  lastRingBot: { borderColor: `color-mix(in srgb, ${colors.orangeDark} 80%, transparent)` },
  celebrate: {
    animationName: { default: winPulse, [reduce]: 'none' },
    animationDuration: '.55s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  sink: {
    animationName: { default: loseSink, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  breathe: {
    animationName: { default: lastShotPulse, [reduce]: 'none' },
    animationDuration: '1.2s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  // Centered over the target board before deployment: the sea is charted,
  // there is just nothing to shoot yet.
  fog: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption1,
    textTransform: 'uppercase',
    pointerEvents: 'none'
  },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: space.md,
    minWidth: 190,
    maxWidth: 250,
    flexShrink: 1,
    minHeight: 0,
    // The rail spans the stage height so the log absorbs whatever is left.
    alignSelf: 'stretch',
    overflowY: 'auto',
    scrollbarWidth: 'none'
  },
  controls: { display: 'flex', flexWrap: 'wrap', gap: space.sm, flexShrink: 0 },
  controlsWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  grow: { flexGrow: 1, flexBasis: '44%' },
  controlsCover: { flexDirection: 'row', alignItems: 'center', width: '100%' },
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
  // Segmented row for a dark well: a glass track, the selected segment raised
  // in a light-grey pill so its label stays lit (the kit Segmented is a
  // light-surface control, so this app draws the same contract in dark).
  segTrack: {
    display: 'inline-flex',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    flexShrink: 0
  },
  segBtn: {
    flexGrow: 1,
    minWidth: 0,
    height: space.xxxl,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: colors.grey3,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'color,background-color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.inOut,
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  segOn: {
    backgroundColor: glass.tint,
    color: colors.white,
    boxShadow: `${shadow.rim},${shadow.card}`
  },
  // The selected segment keeps the owning side's hue so the cover switch reads
  // at a glance.
  segOnYou: { color: colors.cyanDark },
  segOnEnemy: { color: colors.orangeDark },
  segLabel: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  segGrow: { flexGrow: 1 },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  // Fleet status: two hull rosters on one glass card, yours over theirs.
  fleetCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  shipRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minWidth: 0
  },
  shipName: {
    color: colors.grey3,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.medium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  shipSunkName: { color: app.label3, textDecoration: 'line-through' },
  pips: { display: 'flex', gap: space.xxs, flexShrink: 0 },
  pip: {
    width: 6,
    height: 6,
    borderRadius: radius.circle,
    backgroundColor: `color-mix(in srgb, ${colors.grey2} 45%, transparent)`
  },
  pipHitYou: { backgroundColor: colors.orangeDark },
  pipHitEnemy: { backgroundColor: colors.cyanDark },
  fleetDivider: {
    height: 1,
    marginBlock: space.xxs,
    flexShrink: 0,
    backgroundColor: `color-mix(in srgb, ${colors.white} 10%, transparent)`
  },
  // The shot log: a glass column on the inner display, a single-line strip on
  // the cover. scrollbar-width none keeps it reading as chrome, not a pane.
  log: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    minHeight: 0,
    flexGrow: 1,
    maxHeight: 170,
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
  logCover: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    maxHeight: 'none',
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexShrink: 0
  },
  logRow: { display: 'flex', alignItems: 'baseline', gap: space.xs, flexShrink: 0 },
  logNum: {
    color: app.label3,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    minWidth: space.lg,
    textAlign: 'end'
  },
  logText: {
    color: colors.grey3,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    whiteSpace: 'nowrap'
  },
  logYou: { color: colors.cyanDark },
  logBot: { color: colors.orangeDark },
  logSunk: { color: colors.redDark },
  logNew: { fontWeight: weight.bold },
  logEmpty: {
    color: app.label3,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1
  },
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
  resultCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
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
  },
  resultSub: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1
  }
})
