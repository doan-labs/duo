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
  /** Wide layout: deck browser rail beside the live pane. */
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex'
  },
  rail: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
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
  gradeTone: (tone: string) => ({
    backgroundColor: `color-mix(in srgb, ${tone} 14%, ${app.surface})`,
    color: tone
  }),
  gradeHint: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.regular,
    opacity: 0.85
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
