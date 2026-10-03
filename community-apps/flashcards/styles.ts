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

/** The answer face turning over like the card was flipped on the table. */
const turn = stylex.keyframes({
  from: { opacity: 0.35, transform: 'perspective(700px) rotateY(-68deg)' },
  '55%': { opacity: 1 },
  to: { opacity: 1, transform: 'perspective(700px) rotateY(0deg)' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.regular,
    color: app.fg,
    backgroundColor: app.bg
  },
  /** Wide layout: the pane breathes around a floating deck rail and the live detail. */
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    gap: space.md,
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingBottom: space.md,
    paddingLeft: space.md
  },
  /**
   * Decision 18's sidebar: an inset floating panel, rounded on all corners and
   * held off every edge - never a full-height slab with a hairline.
   */
  rail: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: radius.xxl,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  railHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.sm,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    flexShrink: 0
  },
  railTitle: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold
  },
  railSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingInline: space.lg,
    paddingBottom: space.sm,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    flexShrink: 0
  },
  railList: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    listStyleType: 'none',
    margin: 0,
    paddingInline: space.sm,
    paddingBottom: space.sm
  },
  /** A sidebar row: transparent at rest, a flat fill on hover, fill when selected. */
  railRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    paddingTop: space.sm,
    paddingRight: space.sm,
    paddingBottom: space.sm,
    paddingLeft: space.sm,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    textAlign: 'left',
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  railRowOn: {
    backgroundColor: app.fill
  },
  railText: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs
  },
  railLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  railSub: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular
  },
  railDetail: {
    flexShrink: 0,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  railChevron: {
    display: 'flex',
    flexShrink: 0,
    color: app.label3
  },
  railEmpty: {
    paddingTop: space.lg,
    paddingInline: space.sm,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.md,
    textAlign: 'center',
    color: app.label2
  },
  detail: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  /** Header line under the fixed title: truthful counts, secondary. */
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    paddingInline: space.lg,
    paddingBottom: space.xs,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  /** The due count as a chip: link tint when there is work, quiet fill when not. */
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    borderRadius: radius.pill,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold
  },
  chipDue: {
    backgroundColor: `color-mix(in srgb, ${colors.orange} 18%, transparent)`,
    color: colors.orange
  },
  chipQuiet: {
    backgroundColor: app.fill,
    color: app.label2
  },
  /** Coloured glyph square leading a deck row; the hue rotates per deck. */
  deckIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    flexShrink: 0
  },
  deckTint: (hue: string) => ({ backgroundColor: hue }),
  /**
   * Buttons sized to their box. Blink keeps <button> shrink-to-fit even under
   * display:flex, so an actionable row must claim the full track itself or it
   * renders as a detached mini card.
   */
  actionRow: {
    width: '100%'
  },
  /** One-line clamp for card fronts and deck names inside rows. */
  clamp: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0
  },
  /** Review: the "3 left / 1 reviewed" line above the card. */
  progress: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingInline: space.lg,
    paddingBottom: space.xs,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium
  },
  /** The honest fraction of the session already graded. */
  progressTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: app.fill2,
    overflow: 'hidden',
    marginInline: space.lg,
    marginBottom: space.sm
  },
  progressFill: (part: number) => ({
    height: '100%',
    width: `${Math.round(part * 100)}%`,
    borderRadius: radius.pill,
    backgroundColor: colors.blue,
    transitionProperty: 'width',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.out
  }),
  /** The flashcard itself: a tall surface that reads as paper. */
  cardFace: {
    flexGrow: 1,
    minHeight: 170,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'safe center',
    gap: space.md,
    marginInline: space.lg,
    marginBottom: space.md,
    paddingBlock: space.xl,
    paddingInline: space.xl,
    borderWidth: 0,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    color: app.fg,
    textAlign: 'center',
    cursor: 'pointer',
    overflowY: 'auto',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** Revealed/finished faces are not buttons: no pointer, no press. */
  cardStill: {
    cursor: 'default',
    transform: 'none'
  },
  /** The reveal and the completion face enter by turning the card over. */
  cardReveal: {
    animationName: { default: turn, [reduce]: 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  cardFront: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },
  /** After the flip the question shrinks to a recap; the answer owns the face. */
  cardRecap: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },
  cardDivider: {
    width: 72,
    height: 1,
    flexShrink: 0,
    borderWidth: 0,
    backgroundColor: app.separator
  },
  cardBack: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.regular,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },
  cardHint: {
    color: app.label3,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  /** The three grade buttons: equal thirds, tinted by verdict. Rendered as a fieldset. */
  gradeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: space.sm,
    minWidth: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    paddingInline: space.lg,
    paddingBottom: space.sm
  },
  gradeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.sm,
    paddingInline: space.xs,
    borderWidth: 0,
    borderRadius: radius.lg,
    cursor: 'pointer',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  /** The tone marks the fill only; the label and interval read in text greys. */
  gradeTone: (tone: string) => ({
    backgroundColor: `color-mix(in srgb, ${tone} 14%, ${app.surface})`,
    color: app.fg
  }),
  gradeHint: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.regular
  },
  /** The caption under the grades explaining what the intervals mean. */
  gradeCaption: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: app.label3,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  /** Single CTA under the card, spanning the grade grid's full width. */
  finishBtn: {
    gridColumn: '1 / -1'
  },
  /** Overview stat card reuses the card face but hugs its content. */
  overviewCard: {
    flexGrow: 0,
    minHeight: 140
  },
  /** The completion check pops once the card settles. */
  finishCheck: {
    display: 'inline-flex',
    color: colors.green
  },
  /** Review's finish sheet: the card flips to a summary. */
  doneCount: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.display,
    lineHeight: 1,
    fontWeight: weight.thin
  },
  /** Editor sheet interior: the kit card is a bare surface; the form owns its padding. */
  editor: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    padding: space.lg
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium
  },
  editorActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs
  },
  /**
   * The kit's IconButton and Back affordance measure 30x24 and ~20x24: under the
   * HIG's 44x44 target. These app-level patches grow their hit boxes - the kit
   * itself stays untouched. Negative margins keep the header from stretching.
   */
  hit: {
    minWidth: 44,
    minHeight: 44
  },
  hitBtn: {
    minHeight: 44
  },
  backBtn: {
    width: 44,
    height: 44,
    marginTop: -space.md,
    marginRight: -space.xs,
    marginBottom: -space.md,
    marginLeft: -space.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.link,
    cursor: 'pointer',
    flexShrink: 0,
    borderRadius: radius.md,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .2s`,
    transform: { default: null, ':active': motion.press }
  },
  /** Confirmation sheet body, reusing the editor's padded column. */
  confirm: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.lg
  },
  /** The same body inside the editor's own card, which carries the padding. */
  confirmInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm
  },
  /** Everything but the sheets: what `inert` silences while a confirm is up. */
  appBody: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0
  },
  confirmText: {
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  /** Destructive confirm action: filled red like iOS's Delete button. */
  dangerFill: {
    backgroundColor: colors.red,
    color: colors.white
  },
  danger: {
    color: colors.red
  },
  /** Footer status line: visible storage state, lifted clear of the home bar. */
  status: {
    flexShrink: 0,
    textAlign: 'center',
    paddingTop: space.xs,
    paddingBottom: space.xxl,
    color: app.label3,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  }
})
