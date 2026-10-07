// All chrome values come from the kit tokens: spacing on the space ramp, type
// on the Dynamic Type steps, radii/shadows/blur/easing from their scales, and
// every colour a dynamic `app.*` or `colors.*` token. The one bespoke material
// is the inspector pane, which uses the decision-18 glass recipe.

import { animations } from '@doan-labs/duo-uikit/styles.ts'
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

// A stop arriving on the timeline: rises into its slot.
const riseIn = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(10px) scale(.98)' } })
// The "now" dot breathes once on reveal so the running day reads live.
const dotIn = stylex.keyframes({ from: { transform: 'scale(.4)', opacity: 0 } })
const pulse = stylex.keyframes({ '50%': { transform: 'scale(1.45)', opacity: 0.55 } })

export const styles = stylex.create({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: app.bg,
    color: app.fg,
    fontFamily: fonts.system
  },
  stage: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  // -- trips list -------------------------------------------------------------
  listPad: { paddingTop: space.sm, paddingRight: space.lg, paddingBottom: space.xxl, paddingLeft: space.lg },
  tripCard: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg,
    marginBottom: space.md,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    textAlign: 'start',
    cursor: 'pointer'
  },
  tripIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    flexShrink: 0
  },
  tripTint: (hue: string) => ({ backgroundColor: hue }),
  tripMain: { minWidth: 0, flexGrow: 1 },
  tripName: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  tripSub: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  badge: {
    flexShrink: 0,
    paddingTop: space.xxs,
    paddingRight: space.sm,
    paddingBottom: space.xxs,
    paddingLeft: space.sm,
    borderRadius: radius.pill,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.medium
  },
  badgeLive: { color: colors.white, backgroundColor: colors.green },
  badgeCalm: { color: app.label2, backgroundColor: app.fill3 },
  // -- day chips ---------------------------------------------------------------
  chipRow: {
    display: 'flex',
    gap: space.xs,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    overflowX: 'auto',
    scrollbarWidth: 'none',
    flexShrink: 0
  },
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    minHeight: 44,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: 'inherit',
    fontFamily: fonts.system,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'background-color, color',
    transitionDuration: '.18s'
  },
  chipOn: { backgroundColor: app.link, color: colors.white },
  chipDay: { fontSize: typeScale.footnote, lineHeight: leading.footnote, fontWeight: weight.semibold },
  chipDate: { fontSize: typeScale.caption2, lineHeight: leading.caption2, opacity: 0.75 },
  // -- tabs ---------------------------------------------------------------------
  tabsWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.lg,
    paddingLeft: space.lg,
    paddingBottom: space.sm,
    flexShrink: 0
  },
  /* The tab strip mirrors the kit segmented control but with 44pt hit targets
   * and focus-following arrows; the raised segment uses the control token,
   * no shadow, per the design rules. */
  segTrack: {
    display: 'flex',
    flexGrow: 1,
    minWidth: 0,
    paddingTop: space.xxs,
    paddingBottom: space.xxs,
    paddingLeft: space.xxs,
    paddingRight: space.xxs,
    borderRadius: radius.md,
    backgroundColor: app.fill
  },
  segBtn: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.regular,
    whiteSpace: 'nowrap',
    cursor: 'pointer'
  },
  segOn: { backgroundColor: app.control, fontWeight: weight.medium },
  segAction: {
    flexShrink: 0,
    minHeight: 44,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    fontSize: typeScale.footnote
  },
  // -- timeline ------------------------------------------------------------------
  tl: {
    listStyleType: 'none',
    margin: 0,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.xxl,
    paddingLeft: space.lg
  },
  tlRow: {
    display: 'grid',
    gridTemplateColumns: '46px 18px 1fr',
    alignItems: 'stretch',
    animationName: { default: riseIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.out,
    animationFillMode: 'backwards'
  },
  tlTime: {
    paddingTop: space.md,
    paddingRight: space.xs,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.medium,
    color: app.label2,
    textAlign: 'end',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums'
  },
  tlRail: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  tlLineTop: { width: 1, height: space.lg, backgroundColor: app.separator },
  tlLine: { width: 1, flexGrow: 1, backgroundColor: app.separator },
  tlDot: {
    width: 9,
    height: 9,
    marginTop: space.xxs,
    marginBottom: space.xxs,
    borderRadius: radius.circle,
    backgroundColor: app.label3,
    animationName: { default: dotIn, [reduce]: 'none' },
    animationDuration: '.35s',
    animationTimingFunction: easing.spring,
    flexShrink: 0
  },
  tlDotToday: {
    backgroundColor: app.link,
    animationName: { default: pulse, [reduce]: 'none' },
    animationIterationCount: 2,
    animationDuration: '.8s'
  },
  tlCard: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minWidth: 0,
    minHeight: 44,
    marginBottom: space.sm,
    marginLeft: space.xs,
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingBottom: space.sm,
    paddingLeft: space.md,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    textAlign: 'start',
    cursor: 'pointer',
    // Reorder FLIP: main.tsx sets transform inline during the move.
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '.26s',
    transitionTimingFunction: easing.spring
  },
  tlTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.medium,
    overflowWrap: 'break-word'
  },
  tlSub: { fontSize: typeScale.caption1, lineHeight: leading.caption1, color: app.label2, overflowWrap: 'break-word' },
  arrangeCol: { display: 'flex', flexDirection: 'column', gap: space.xxs, alignSelf: 'center', flexShrink: 0 },
  // -- shared rows ----------------------------------------------------------------
  hit: {
    minWidth: 44,
    minHeight: 44,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    marginTop: `-${space.sm}`,
    marginBottom: `-${space.sm}`,
    marginRight: `-${space.md}`
  },
  hitStart: {
    minWidth: 44,
    minHeight: 44,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    marginLeft: `-${space.md}`
  },
  // The arrange steppers and the pack checkbox keep their small glyphs but
  // gain a 44pt hit ring pulled tight by negative margins.
  stepHit: { minWidth: 44, minHeight: 44 },
  packCheck: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 44,
    minHeight: 44,
    marginTop: `-${space.xs}`,
    marginBottom: `-${space.xs}`,
    marginLeft: `-${space.md}`,
    borderRadius: radius.sm,
    cursor: 'pointer',
    flexShrink: 0
  },
  addRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    width: '100%',
    minHeight: 44,
    marginBottom: space.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: app.separator,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
    color: app.link,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    cursor: 'pointer'
  },
  // -- packing --------------------------------------------------------------------
  packHead: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg
  },
  progress: { flexGrow: 1, height: 6, borderRadius: radius.pill, backgroundColor: app.fill3, overflow: 'hidden' },
  progressFill: (part: number) => ({
    height: '100%',
    width: `${Math.min(100, Math.round(part * 100))}%`,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
    transitionProperty: 'width',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.out
  }),
  packList: {
    listStyleType: 'none',
    margin: 0,
    paddingTop: 0,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },
  packRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingTop: space.xs,
    paddingRight: space.md,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    marginBottom: space.xs,
    borderRadius: radius.md,
    backgroundColor: app.surface,
    animationName: { default: riseIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.out
  },
  packLabel: {
    flexGrow: 1,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    overflowWrap: 'break-word'
  },
  packDone: { color: app.label3, textDecorationLine: 'line-through' },
  packAdd: {
    display: 'flex',
    gap: space.sm,
    alignItems: 'center',
    paddingRight: space.lg,
    paddingBottom: space.xxl,
    paddingLeft: space.lg
  },
  grow: { flexGrow: 1, minWidth: 0 },
  // -- travel -----------------------------------------------------------------------
  sectionTitle: {
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    color: app.label2,
    textTransform: 'uppercase',
    letterSpacing: tracking.caption2
  },
  legIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    flexShrink: 0
  },
  // -- detail / inspector --------------------------------------------------------------
  rail: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    marginTop: space.sm,
    marginRight: space.lg,
    marginBottom: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    overflow: 'hidden'
  },
  railBody: { flexGrow: 1, minHeight: 0, overflow: 'auto', padding: space.lg },
  detailHero: { display: 'flex', flexDirection: 'column', gap: space.xs, paddingBottom: space.md },
  detailTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    overflowWrap: 'break-word'
  },
  metaRow: { display: 'flex', alignItems: 'baseline', gap: space.md, paddingTop: space.sm },
  metaKey: { width: 72, flexShrink: 0, fontSize: typeScale.footnote, color: app.label3 },
  metaVal: { flexGrow: 1, fontSize: typeScale.subheadline, overflowWrap: 'break-word' },
  actionRow: { display: 'flex', gap: space.sm, width: '100%', marginTop: space.lg },
  notesBox: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap'
  },
  // -- status footer --------------------------------------------------------------------
  status: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingTop: space.xs,
    paddingBottom: space.xxl,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    color: app.label3
  },
  // -- toast -------------------------------------------------------------------------------
  toast: {
    position: 'absolute',
    bottom: space.xxl,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    maxWidth: 'min(88vw, 22rem)',
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    borderRadius: radius.pill,
    backgroundColor: app.elevated,
    boxShadow: shadow.float,
    fontSize: typeScale.footnote,
    zIndex: 30
  },
  // The deleted row's label can be arbitrarily long: the toast clamps to the
  // viewport, the label ellipsizes, and Undo never shrinks offscreen.
  toastText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 },
  toastBtn: { color: app.link, fontWeight: weight.semibold, fontSize: typeScale.footnote, flexShrink: 0 },
  iconFix: { flexShrink: 0 },
  // -- sheets ---------------------------------------------------------------------------------
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg
  },
  sheetTitle: { fontSize: typeScale.headline, lineHeight: leading.headline, fontWeight: weight.semibold },
  sheetBody: { display: 'flex', flexDirection: 'column', gap: space.sm, padding: space.lg, paddingTop: space.xs },
  // Fields share a row two across at most; on the 320px sheet a third wraps
  // to its own line instead of clipping.
  field: { display: 'flex', flexDirection: 'column', gap: space.xxs, flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  fieldLabel: { fontSize: typeScale.caption1, lineHeight: leading.caption1, color: app.label2 },
  fieldRow: { display: 'flex', gap: space.sm, flexWrap: 'wrap' },
  // Single-line controls inside fields fill the column and meet the 44pt bar.
  fieldCtl: { width: '100%', minWidth: 0, minHeight: 44 },
  errorText: { fontSize: typeScale.footnote, lineHeight: leading.footnote, color: colors.red },
  kindChips: { display: 'flex', flexWrap: 'wrap', gap: space.xs },
  kindChip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    minHeight: 44,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    cursor: 'pointer'
  },
  kindChipOn: { backgroundColor: app.link, color: colors.white },
  confirm: { display: 'flex', flexDirection: 'column', gap: space.sm, padding: space.lg },
  confirmTitle: { fontSize: typeScale.headline, lineHeight: leading.headline, fontWeight: weight.semibold },
  confirmBody: { fontSize: typeScale.subheadline, lineHeight: leading.subheadline, color: app.label2 },
  // -- inner split ------------------------------------------------------------------------------
  split: { display: 'flex', flexGrow: 1, minHeight: 0, gap: space.sm },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  railHead: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    paddingRight: space.md,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  railTitle: {
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    color: app.label2,
    textTransform: 'uppercase',
    letterSpacing: tracking.caption2
  },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.sm, paddingTop: space.md },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: app.fill3
  },
  statNum: { fontSize: typeScale.title3, fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' },
  statKey: { fontSize: typeScale.caption2, color: app.label2 },
  // -- misc pieces added with the screens ------------------------------------------
  menuWrap: { position: 'relative', height: 0, zIndex: 40 },
  menuPos: { position: 'absolute', top: space.xxs, right: space.lg },
  mutedIcon: { color: app.label3 },
  tlCardWrap: { display: 'block', minWidth: 0 },
  tlCardFlat: { cursor: 'default' },
  tlLineHide: { visibility: 'hidden' },
  entityList: { margin: 0, padding: 0, listStyleType: 'none' },
  entityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingTop: space.xs,
    paddingRight: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  entityMain: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    flexGrow: 1,
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    textAlign: 'start',
    cursor: 'pointer',
    borderRadius: radius.sm
  },
  dangerText: { color: colors.red },
  dangerFill: { backgroundColor: colors.red, color: colors.white },
  // Save / Cancel / Delete and the destructive row meet the 44pt bar.
  actionBtn: { minHeight: 44, flexGrow: 1 },
  // Standalone buttons (Add, Clear, placeholder CTAs) keep their look at 44pt.
  minTall: { minHeight: 44 },
  // A long trip name must not stretch the header select past the viewport;
  // the accessory row may shrink, the icon hits may not.
  hdrText: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 },
  hdrAcc: { minWidth: 0, flexShrink: 1 },
  selectCap: { maxWidth: '12rem', minWidth: 0, flexShrink: 1 },
  dateInput: {
    height: 44,
    width: '100%',
    paddingInline: space.sm,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: app.fill,
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    colorScheme: 'inherit',
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.blue,
    outlineOffset: 1
  },
  detailPad: { padding: space.lg },
  detailPage: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: app.bg }
})

export { animations }
