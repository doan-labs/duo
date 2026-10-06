import {
  app,
  colors,
  easing,
  fonts,
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

const heroIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.97' },
  '100%': { opacity: 1, scale: '1' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 10px' },
  '100%': { opacity: 1, translate: '0 0' }
})
const badgePop = stylex.keyframes({
  '0%': { scale: '.8' },
  '70%': { scale: '1.08' },
  '100%': { scale: '1' }
})
const fadeIn = stylex.keyframes({ '0%': { opacity: 0 }, '100%': { opacity: 1 } })

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular,
    color: app.fg,
    backgroundColor: app.bg
  },
  /** App chrome below the sheets; goes inert while one is open. */
  appShell: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0, flexGrow: 1 },
  kicker: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    textTransform: 'uppercase'
  },
  title: {
    marginBlock: 0,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: space.xs, flexShrink: 0 },
  icon44: { minWidth: 44, minHeight: 44 },
  flipX: { transform: 'scaleX(-1)' },
  // The mute button carries a slash while sounds are off.
  muteBtn: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 0,
    borderRadius: radius.circle,
    padding: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    cursor: 'pointer'
  },
  muteOff: { color: app.label3 },
  muteSlash: {
    position: 'absolute',
    width: 24,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: 'currentColor',
    transform: 'rotate(-45deg)',
    pointerEvents: 'none'
  },
  pageTitle: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  // The inspector's nav row on the cover layout: a card-height tappable row.
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.sm,
    paddingInline: space.md,
    cursor: 'pointer',
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'start',
    ':hover': { backgroundColor: app.elevated },
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },
  navRowIcon: { color: app.link, display: 'inline-flex', flexShrink: 0 },
  navRowText: { display: 'flex', flexDirection: 'column', gap: space.xxs, flexGrow: 1, minWidth: 0 },
  navRowTitle: { fontSize: typeScale.footnote, lineHeight: leading.footnote, fontWeight: weight.semibold },
  navRowSub: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontVariantNumeric: 'tabular-nums'
  },
  navRowChev: { color: app.label3, display: 'inline-flex', flexShrink: 0 },
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: space.xxxl
  },
  stage: { display: 'flex', flexDirection: 'column', gap: space.md, paddingInline: space.lg },
  // The unfolded split: editor on the left, inspector on the right.
  stageWide: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { display: 'flex', flexDirection: 'column', gap: space.md, flexGrow: 1, minWidth: 0 },
  colSide: { display: 'flex', flexDirection: 'column', gap: space.md, width: 340, flexShrink: 0 },

  // The hero: the colour itself at card size, its hex code set in the ink that
  // contrasts it. Tapping copies the code.
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 148,
    borderWidth: 0,
    borderRadius: radius.xl,
    paddingBlock: space.lg,
    paddingInline: space.lg,
    cursor: 'pointer',
    fontFamily: fonts.system,
    animationName: { default: heroIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop,
    // The colour swap eases instead of snapping as sliders move; shared.press
    // supplies the press state and the background-colour ease.
    transitionTimingFunction: easing.out
  },
  heroFill: (css: string) => ({ backgroundColor: css }),
  heroHex: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  heroSub: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    opacity: 0.82,
    fontVariantNumeric: 'tabular-nums'
  },
  heroInk: (css: string) => ({ color: css }),

  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.rim,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    textTransform: 'uppercase'
  },
  sectionAction: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 0,
    paddingBlock: space.xxs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: app.link,
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    textTransform: 'uppercase',
    cursor: 'pointer',
    ':hover': { backgroundColor: app.fill3 },
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },

  // The code field row: one input that takes hex, rgb() or hsl().
  fieldRow: { display: 'flex', alignItems: 'flex-start', gap: space.sm },
  field: { flexGrow: 1, minWidth: 0 },
  fieldInput: { fontFamily: fonts.mono, minHeight: 44 },
  fieldHint: { color: app.label2, fontSize: typeScale.caption2, lineHeight: leading.caption2 },
  fieldErr: { color: colors.red, fontSize: typeScale.caption2, lineHeight: leading.caption2 },

  // The value chips: HEX / RGB / HSL readouts that copy on tap.
  chipRow: { display: 'flex', gap: space.xs },
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.xxs,
    borderWidth: 0,
    borderRadius: radius.md,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    backgroundColor: app.fill3,
    color: app.fg,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    cursor: 'pointer',
    textAlign: 'start',
    ':hover': { backgroundColor: app.fill2 }
  },
  chipLabel: { color: app.label2, fontFamily: fonts.system, fontWeight: weight.semibold },
  chipValue: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' },

  // Custom sliders: a labelled track with a sliding thumb, real slider role.
  sliderRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  sliderKey: {
    width: 18,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    textAlign: 'center',
    flexShrink: 0
  },
  // The interactive element carries the 44pt hit area; the painted track
  // inside it stays 28 so the control does not look inflated.
  sliderHit: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    minWidth: 0,
    height: 44,
    borderRadius: radius.pill,
    cursor: 'pointer',
    touchAction: 'none',
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },
  sliderTrack: {
    position: 'relative',
    width: '100%',
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    boxShadow: shadow.rim
  },
  trackBg: (img: string) => ({ backgroundImage: img }),
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    width: 22,
    height: 22,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    pointerEvents: 'none'
  },
  thumbAt: (pct: number) => ({ left: `${pct}%`, transform: 'translate(-50%,-50%)' }),
  sliderVal: {
    width: 40,
    color: app.label2,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    textAlign: 'end',
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums'
  },

  // The harmony kind chooser: a wrapping radio group of pill options.
  segRow: { display: 'flex', flexWrap: 'wrap', gap: space.xs },
  seg: {
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.md,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer',
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },
  segOn: {
    backgroundColor: { default: app.link, ':hover': app.link },
    color: colors.white,
    fontWeight: weight.semibold
  },

  // A strip of colours the harmony or ladder produced: one tall button each,
  // the current one ringed. Heights are layout, not spacing, so they type
  // them by hand.
  strip: { display: 'flex', gap: space.xs },
  stripSwatch: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 52,
    borderWidth: 0,
    borderRadius: radius.md,
    cursor: 'pointer',
    padding: 0,
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },
  paint: (css: string) => ({ backgroundColor: css }),
  stripOn: { outlineWidth: 3, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 },
  stripLabel: {
    position: 'absolute',
    bottom: space.xxs,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    pointerEvents: 'none'
  },
  stripCell: { position: 'relative' },

  // The contrast inspector.
  pairGrid: { display: 'flex', flexDirection: 'column', gap: space.sm },
  pairRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  pairLabel: {
    width: 58,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    textTransform: 'uppercase',
    flexShrink: 0
  },
  pairChips: { display: 'flex', gap: space.xxs, flexWrap: 'wrap', flexGrow: 1, minWidth: 0 },
  // A 44pt transparent hit area around the painted 26 disc: the button is the
  // reachability, the dot inside is the swatch.
  pairChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 0,
    borderRadius: radius.circle,
    padding: 0,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },
  pairDot: {
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    boxShadow: shadow.rim
  },
  pairChipOn: { outlineWidth: 2.5, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 },
  swapBtn: { flexShrink: 0 },

  ratioCard: { display: 'flex', alignItems: 'center', gap: space.md },
  ratioBig: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.display,
    lineHeight: 1,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  ratioColon: {
    color: app.label2,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontWeight: weight.semibold
  },
  ratioWrap: { display: 'flex', alignItems: 'baseline', gap: space.xxs },
  ratioVerdicts: { display: 'flex', flexDirection: 'column', gap: space.xs, flexGrow: 1, minWidth: 0 },
  ratioCaption: { color: app.label2, fontSize: typeScale.caption2, lineHeight: leading.caption2 },
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: space.xs,
    listStyleType: 'none',
    paddingInlineStart: 0,
    marginBlock: 0
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    borderRadius: radius.md,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.semibold,
    backgroundColor: app.fill3,
    color: app.label2
  },
  badgePass: { color: colors.green },
  badgeFail: { color: colors.red },
  badgeText: { color: app.fg, fontWeight: weight.medium },

  // The live preview: one honest card in the inspected pair's colours.
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    borderRadius: radius.lg,
    padding: space.lg,
    overflow: 'hidden'
  },
  previewTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.bold,
    marginBlock: 0
  },
  previewBody: { fontSize: typeScale.footnote, lineHeight: leading.footnote, letterSpacing: tracking.footnote },
  previewBtnRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  previewBtn: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.lg,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold
  },
  previewLink: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    textDecorationLine: 'underline'
  },
  previewCaption: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.72
  },
  pvFg: (css: string) => ({ color: css }),
  pvBg: (css: string) => ({ backgroundColor: css }),

  // Saved palettes.
  palRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.xs,
    paddingInline: space.xs,
    transitionProperty: 'background-color',
    transitionDuration: '.18s',
    ':hover': { backgroundColor: app.fill3 }
  },
  palInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.xxs },
  palName: {
    fontWeight: weight.semibold,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderWidth: 0,
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.xxs,
    marginInlineStart: -2,
    backgroundColor: 'transparent',
    color: app.fg,
    textAlign: 'start',
    cursor: 'pointer',
    fontFamily: fonts.system,
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 1 }
  },
  palMeta: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontVariantNumeric: 'tabular-nums'
  },
  palStrip: { display: 'flex', gap: space.xxs, flexWrap: 'wrap' },
  // Same reachability story as the pair chips: a 44pt transparent hit area
  // around the painted dot; the strip wraps when a palette is wide.
  palDotHit: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 0,
    borderRadius: radius.circle,
    padding: 0,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    ':focus-visible': { outlineWidth: 2, outlineStyle: 'solid', outlineColor: app.link, outlineOffset: 2 }
  },
  palDot: {
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    boxShadow: shadow.rim,
    pointerEvents: 'none'
  },
  palEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.lg,
    color: app.label2,
    textAlign: 'center',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote
  },
  palEmptyIcon: { color: app.label3 },

  // Sheets share the kit Sheet chrome; bodies stack actions full-width.
  sheetBody: { display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: {
    marginBlock: 0,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.bold
  },
  sheetHint: { marginBlock: 0, color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  sheetField: { width: '100%', boxSizing: 'border-box' },
  sheetStrip: { display: 'flex', gap: space.xs, borderRadius: radius.md, overflow: 'hidden' },
  sheetSwatch: { flexGrow: 1, flexBasis: 0, height: 36, minWidth: 0 },
  actionStack: { display: 'flex', flexDirection: 'column', gap: space.xs },
  hit44: { minHeight: 44, justifyContent: 'center' },
  btnDanger: { color: colors.white },

  // The footer clears the 22px home-bar zone on the cover.
  statusBar: { flexShrink: 0, paddingInline: space.lg, paddingBottom: `calc(${space.xxl} + ${space.sm})` },
  status: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 18,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    textAlign: 'center'
  },
  statusIn: {
    animationName: { default: fadeIn, [reduce]: 'none' },
    animationDuration: '.25s'
  },
  badgeIn: {
    display: 'inline-block',
    animationName: { default: badgePop, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop
  }
})
