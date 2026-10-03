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

// One-shot keyframes may only touch scale, translate and opacity.
const cellIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.72' },
  '100%': { opacity: 1, scale: '1' }
})
const flagIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.6' },
  '60%': { opacity: 1, scale: '1.12' },
  '100%': { opacity: 1, scale: '1' }
})
const boardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 12px', scale: '.97' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 10px', scale: '.94' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const lineIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 6px' },
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
    // A cool amber pool up top and a deep red one low: the minefield's glow.
    backgroundImage: `radial-gradient(85% 55% at 50% 0%,color-mix(in srgb, ${colors.yellowDark} 8%, transparent),transparent 62%),radial-gradient(75% 50% at 50% 108%,color-mix(in srgb, ${colors.redDark} 6%, transparent),transparent 60%)`,
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
  // Cover: the scores drop under the wordmark instead of crowding it out.
  headerCover: { flexWrap: 'wrap', rowGap: space.xs },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: colors.yellowDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  titleCover: { fontSize: typeScale.title1, lineHeight: leading.title1, letterSpacing: tracking.title1 },
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
  chipLabelBest: { color: colors.yellowDark },
  // Cover chips share the header's second line; keep them short so the
  // wordmark, chips, board and controls all fit the cover height.
  chipCover: { minWidth: 44, paddingBlock: space.xxs, paddingInline: space.xs },
  chipValueCover: { fontSize: typeScale.headline, lineHeight: leading.headline },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    lineHeight: leading.title3,
    fontVariantNumeric: 'tabular-nums',
    minWidth: space.xl,
    textAlign: 'center'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl
  },
  stageCover: { flexDirection: 'column', gap: space.md },
  // The sunken field the cells sit in.
  well: {
    position: 'relative',
    display: 'grid',
    gap: space.xxs,
    padding: space.xs,
    borderRadius: radius.xxl,
    backgroundColor: `color-mix(in srgb, ${colors.black} 48%, ${colors.grey6Dark})`,
    boxShadow: `${shadow.rim},${shadow.float}`,
    flexShrink: 0,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: space.sm,
    width: '176px',
    flexShrink: 0
  },
  railCover: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', gap: space.sm },
  // The inert boundary while the discard Sheet is up: mirrors the column of
  // the root so the play surface lays out identically inside it.
  shell: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, position: 'relative' },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  // Segmented row for a dark well: a glass track, the selected segment raised
  // in a light pill so its label stays lit.
  segTrack: {
    display: 'flex',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    flexShrink: 0
  },
  segBtn: {
    flexGrow: 1,
    minWidth: 0,
    // The HIG's finger target applies to segments too: every option is 44 pt.
    minHeight: 44,
    height: '100%',
    paddingInline: space.sm,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: colors.grey3,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'color,background-color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.inOut,
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  segOn: {
    backgroundColor: glass.tint,
    // Selected reads as the interaction colour on the raised light pill.
    color: app.link,
    boxShadow: `${shadow.rim},${shadow.card}`
  },
  segFill: { flexGrow: 1 },
  segLabel: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  // Wide rail's difficulty picker: the grouped checkmark list iOS uses when a
  // horizontal segment would not fit the words. Rows keep the 44 pt target.
  pickPanel: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: radius.lg,
    backgroundColor: app.fill,
    overflow: 'hidden',
    flexShrink: 0
  },
  pickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingInline: space.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.regular,
    textAlign: 'start',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'color,background-color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.inOut,
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: -2 }
  },
  pickRowSep: { borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: app.separator },
  pickLabel: { fontWeight: weight.semibold },
  pickMeta: { marginLeft: 'auto', color: app.label2, fontSize: typeScale.caption2 },
  // The check slot stays reserved so the trailing meta does not jump rows.
  pickCheck: { color: app.link, width: '13px', flexShrink: 0, textAlign: 'center' },
  controls: { display: 'flex', gap: space.sm, flexShrink: 0, alignItems: 'stretch' },
  controlsWide: { flexDirection: 'column' },
  controlsCover: { width: '100%' },
  action: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    flexGrow: 1,
    // The HIG's finger target: 44 pt on the long edge.
    height: 44,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    color: colors.white,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  cell: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    borderRadius: radius.xs,
    padding: 0,
    color: colors.white,
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    touchAction: 'manipulation',
    transitionProperty: 'background-color',
    transitionDuration: '.18s',
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 1, zIndex: 1 }
  },
  cellHidden: {
    // Concealed cells read as raised tiles: a top-lit sheen that brightens
    // under the pointer and a quick shrink under the finger.
    backgroundColor: colors.grey4Dark,
    backgroundImage: {
      default: `linear-gradient(180deg,color-mix(in srgb, ${colors.white} 8%, transparent),transparent 55%)`,
      ':hover': `linear-gradient(180deg,color-mix(in srgb, ${colors.white} 15%, transparent),transparent 65%)`
    },
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  // A flag is unmistakable: the tile takes the flag's colour with it.
  cellFlagged: {
    backgroundColor: `color-mix(in srgb, ${colors.redDark} 22%, ${colors.grey4Dark})`,
    backgroundImage: `linear-gradient(180deg,color-mix(in srgb, ${colors.white} 9%, transparent),transparent 55%)`
  },
  cellOpen: {
    backgroundColor: `color-mix(in srgb, ${colors.black} 34%, transparent)`,
    cursor: 'default',
    animationName: { default: cellIn, [reduce]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  cellExploded: {
    backgroundColor: `color-mix(in srgb, ${colors.redDark} 55%, ${colors.grey6Dark})`
  },
  cellLocked: { cursor: 'default' },
  // The flood staggers by BFS depth from the tap and mines scatter on a loss;
  // both ride the same cellIn curve, so it is one delayed animation.
  waveDelay: (ms: number) => ({ animationDelay: `${ms}ms` }),
  digit: { display: 'block', pointerEvents: 'none' },
  glyph: { display: 'block', width: '72%', height: '72%', pointerEvents: 'none' },
  // Inside a button the glyph tracks the label size instead of the button's.
  glyphBtn: { width: '1.1em', height: '1.1em' },
  flagInk: { color: colors.redDark },
  flagOnCell: {
    animationName: { default: flagIn, [reduce]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  mineInk: { color: colors.grey2 },
  mineInkExploded: { color: colors.white },
  // A slash drawn over a flag that marked a safe cell, shown after a loss.
  wrongFlag: {
    position: 'relative',
    '::after': {
      content: '""',
      position: 'absolute',
      left: '18%',
      right: '18%',
      top: '50%',
      height: '1.5px',
      borderRadius: radius.pill,
      backgroundColor: colors.white,
      transform: 'rotate(45deg)'
    }
  },
  n1: { color: colors.blueDark },
  n2: { color: colors.greenDark },
  n3: { color: colors.redDark },
  n4: { color: colors.indigoDark },
  n5: { color: colors.orangeDark },
  n6: { color: colors.tealDark },
  n7: { color: colors.purpleDark },
  n8: { color: colors.grey2 },
  // The sunken board sits in a well; the measured square is injected at runtime.
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  fitGrid: (cols: number, rows: number) => ({
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`
  }),
  fitDigits: (px: number) => ({ fontSize: `${px}px` }),
  fitGlyph: (px: number) => ({ width: `${px}px`, height: `${px}px` }),
  hint: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    textAlign: 'center',
    flexShrink: 0
  },
  hintCover: { fontSize: typeScale.caption2, lineHeight: leading.caption2, letterSpacing: tracking.caption2 },
  hintOn: { color: colors.orangeDark, fontWeight: weight.semibold },
  statsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderRadius: radius.xl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  statsRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm
  },
  statsName: {
    color: app.label2,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  statsNameOn: { color: colors.yellowDark },
  statsValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  statsMeta: { color: app.label2, fontSize: typeScale.caption2, fontWeight: weight.medium },
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
  resultCover: { insetInline: space.sm, bottom: space.xxl, paddingInline: space.md },
  resultCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  resultKicker: {
    color: colors.redDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  resultKickerWin: { color: colors.greenDark },
  resultKickerConfirm: { color: colors.orangeDark },
  // The card's lines land one after another so the verdict reads in order.
  resultLine: {
    animationName: { default: lineIn, [reduce]: 'none' },
    animationDuration: '.28s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  resultDelay: (ms: number) => ({ animationDelay: `${ms}ms` }),
  bestBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingBlock: space.xxs,
    paddingInline: space.xs,
    borderRadius: radius.pill,
    backgroundColor: `color-mix(in srgb, ${colors.yellowDark} 22%, transparent)`,
    color: colors.yellowDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase',
    alignSelf: 'flex-start'
  },
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
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  // The one filled action per surface carries app.link, the interaction
  // colour; the warm yellow stays with brand and stats content.
  primary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: {
      default: app.link,
      ':hover': `color-mix(in srgb, ${app.link} 86%, ${colors.white})`
    },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    cursor: 'pointer',
    flexShrink: 0,
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  // The discard question lives in the kit Sheet; this lays out its contents:
  // copy on top, explicit Cancel and the labelled primary along the bottom.
  confirmCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingBlock: space.lg,
    paddingInline: space.lg
  },
  confirmActions: { display: 'flex', gap: space.sm, flexShrink: 0, flexWrap: 'wrap' }
})
