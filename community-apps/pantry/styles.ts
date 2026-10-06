// All chrome comes from the kit scales; `light`/`dark` app themes are applied
// to the root element by main.tsx, so `app.*` resolves to the live appearance.
// Tone colours (location tiles, badges) use the bright `*Dark` palette values,
// which stay legible on both appearances.
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

// Transform only: an opacity sweep on a glass card would blank its own
// backdrop blur for the whole run (the ancestor-of-glass trap).
const cardIn = stylex.keyframes({
  '0%': { transform: 'translateY(10px) scale(.98)' },
  '100%': { transform: 'translateY(0) scale(1)' }
})

const rowIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(6px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' }
})

const popIn = stylex.keyframes({
  '0%': { transform: 'scale(.7)' },
  '60%': { transform: 'scale(1.08)' },
  '100%': { transform: 'scale(1)' }
})

// Tone -> text/edge colour pair. Every badge spells its state in words, so the
// tint is an accent, never the only carrier of meaning.
export const toneText = stylex.create({
  red: { color: colors.redDark },
  orange: { color: colors.orangeDark },
  gold: { color: colors.yellowDark },
  cyan: { color: colors.cyanDark },
  indigo: { color: colors.indigoDark },
  green: { color: colors.greenDark },
  grey: { color: app.label2 }
})

export const toneEdge = stylex.create({
  red: { outlineColor: colors.redDark },
  orange: { outlineColor: colors.orangeDark },
  gold: { outlineColor: colors.yellowDark },
  cyan: { outlineColor: colors.cyanDark },
  indigo: { outlineColor: colors.indigoDark },
  green: { outlineColor: colors.greenDark },
  grey: { outlineColor: app.separator }
})

export const toneTile = stylex.create({
  red: { backgroundColor: colors.redDark },
  orange: { backgroundColor: colors.orangeDark },
  gold: { backgroundColor: colors.yellowDark },
  cyan: { backgroundColor: colors.cyanDark },
  indigo: { backgroundColor: colors.indigoDark },
  green: { backgroundColor: colors.greenDark },
  grey: { backgroundColor: colors.grey3Dark }
})

export const schemeLight = stylex.create({ scheme: { colorScheme: 'light' } })
export const schemeDark = stylex.create({ scheme: { colorScheme: 'dark' } })

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    paddingTop: space.xl,
    // The home bar owns the bottom 22 px; content clears it here.
    paddingBottom: `calc(${space.xxxl} + ${space.xxl})`,
    paddingInline: space.xl,
    color: app.fg,
    backgroundColor: app.bg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  rootCover: { gap: space.md, paddingTop: space.md, paddingInline: space.md },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    flexShrink: 0
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  kicker: {
    color: colors.orangeDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle,
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
  titleCover: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  muteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.md,
    color: app.fg,
    backgroundColor: app.fill3,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop
  },
  muteOff: { color: app.label3 },
  stage: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.35fr)',
    columnGap: space.lg,
    alignItems: 'start'
  },
  col: { display: 'flex', flexDirection: 'column', gap: space.lg, minWidth: 0 },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingBlock: space.lg,
    paddingInline: space.lg,
    borderRadius: radius.xl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  cardHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  cardTitleWrap: { display: 'flex', alignItems: 'center', gap: space.xs, minWidth: 0 },
  cardTitle: {
    marginBlock: 0,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  cardMeta: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1, flexShrink: 0 },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
    columnGap: space.sm,
    rowGap: space.sm
  },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  fieldRow: { display: 'flex', alignItems: 'flex-end', gap: space.sm },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    textTransform: 'uppercase'
  },
  optional: { color: app.label3, textTransform: 'none', fontWeight: weight.regular },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    height: `calc(${space.xxxl} + ${space.xs})`,
    borderWidth: 0,
    borderRadius: radius.md,
    paddingInline: space.md,
    color: app.fg,
    backgroundColor: app.fill3,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: app.link,
    outlineOffset: 1,
    colorScheme: 'inherit'
  },
  // The native date picker owns its own padding; the extra side room keeps the
  // calendar glyph clear of the field's rounded corner.
  inputDate: { paddingInline: space.sm, fontVariantNumeric: 'tabular-nums' },
  inputBad: { outlineStyle: 'solid', outlineWidth: 1, outlineColor: colors.redDark },
  selectWrap: { position: 'relative' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: space.xs },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.md,
    minHeight: `calc(${space.xxxl} + ${space.xs})`,
    boxSizing: 'border-box',
    color: app.fg,
    backgroundColor: app.fill3,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color,color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': app.link },
    outlineOffset: 1
  },
  chipOn: { backgroundColor: colors.orangeDark, color: colors.white },
  chipOnSoon: { backgroundColor: colors.redDark, color: colors.white },
  chipCount: { fontVariantNumeric: 'tabular-nums', opacity: 0.85 },
  segRow: { display: 'flex', alignItems: 'center', gap: space.xxs },
  seg: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xxs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    color: app.label2,
    backgroundColor: 'transparent',
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color,color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': app.link }
  },
  segOn: { color: app.fg, backgroundColor: app.fill3 },
  errorText: { marginBlock: 0, color: colors.redDark, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  formCol: { display: 'flex', flexDirection: 'column', gap: space.md },
  controlsRow: { display: 'flex', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  grow: { flexGrow: 1 },
  dangerText: { color: colors.redDark },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    height: `calc(${space.xxxl} + ${space.xs})`,
    borderRadius: radius.md,
    paddingInline: space.md,
    backgroundColor: app.fill3,
    outlineWidth: { default: 0, ':focus-within': 2 },
    outlineStyle: 'solid',
    outlineColor: app.link,
    outlineOffset: 1
  },
  searchIcon: { color: app.label3, display: 'inline-flex', flexShrink: 0 },
  searchInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    padding: 0,
    color: app.fg,
    backgroundColor: 'transparent',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    outlineWidth: 0
  },
  searchClear: {
    display: 'grid',
    placeItems: 'center',
    width: space.xl,
    height: space.xl,
    borderWidth: 0,
    borderRadius: radius.circle,
    padding: 0,
    color: app.label2,
    backgroundColor: { default: 'transparent', ':hover': app.fill2 },
    cursor: 'pointer',
    flexShrink: 0,
    touchAction: 'manipulation'
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    marginBlock: 0,
    paddingInline: 0,
    listStyle: 'none'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    paddingBlock: space.xxs,
    paddingInline: space.xxs,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 }
  },
  rowFlash: {
    animationName: { default: rowIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop
  },
  tile: {
    display: 'grid',
    placeItems: 'center',
    width: `calc(${space.xxxl} + ${space.xs})`,
    height: `calc(${space.xxxl} + ${space.xs})`,
    borderRadius: radius.sm,
    color: colors.grey6Dark,
    flexShrink: 0
  },
  tilePop: {
    animationName: { default: popIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.spring
  },
  rowBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingBlock: space.xs,
    paddingInline: space.xs,
    color: app.fg,
    backgroundColor: 'transparent',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    textAlign: 'start',
    cursor: 'pointer',
    borderRadius: radius.sm,
    touchAction: 'manipulation',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': app.link },
    outlineOffset: -1
  },
  rowNameWrap: { display: 'flex', alignItems: 'center', gap: space.xs, minWidth: 0 },
  rowName: {
    fontWeight: weight.medium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0
  },
  rowNameDone: { color: app.label3, textDecorationLine: 'line-through' },
  rowMeta: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xxs,
    borderRadius: radius.pill,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    backgroundColor: app.fill3,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.bold,
    outlineStyle: 'solid',
    outlineWidth: 1,
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  steppers: { display: 'flex', alignItems: 'center', gap: space.xxs, flexShrink: 0 },
  stepBtn: {
    display: 'grid',
    placeItems: 'center',
    width: `calc(${space.xxxl} + ${space.xs})`,
    height: `calc(${space.xxxl} + ${space.xs})`,
    borderWidth: 0,
    borderRadius: radius.circle,
    color: app.fg,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': app.link },
    outlineOffset: 1
  },
  stepBtnOff: { color: app.label3, backgroundColor: { default: 'transparent', ':hover': app.fill3 } },
  stepQty: {
    minWidth: `calc(${space.xxxl} * 2)`,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    color: app.fg
  },
  stepQtyOut: { color: app.label3 },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.lg,
    color: app.label2,
    textAlign: 'center'
  },
  emptyIcon: { color: app.label3 },
  emptyTitle: {
    marginBlock: 0,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.semibold
  },
  emptyBody: {
    marginBlock: 0,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    maxWidth: `calc(${space.xxxl} * 12)`
  },
  shopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    paddingBlock: space.xxs,
    paddingInline: space.xxs,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 }
  },
  shopCheck: { flexShrink: 0 },
  shopBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingBlock: space.xs,
    paddingInline: space.xs,
    color: app.fg,
    backgroundColor: 'transparent',
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    textAlign: 'start',
    cursor: 'pointer',
    borderRadius: radius.sm,
    touchAction: 'manipulation',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': app.link },
    outlineOffset: -1
  },
  shopNote: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  shopDel: {
    display: 'grid',
    placeItems: 'center',
    width: `calc(${space.xxxl} + ${space.xs})`,
    height: `calc(${space.xxxl} + ${space.xs})`,
    borderWidth: 0,
    borderRadius: radius.circle,
    color: { default: app.label3, ':hover': colors.redDark },
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    cursor: 'pointer',
    flexShrink: 0,
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color,color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': app.link }
  },
  clearBtn: {
    alignSelf: 'flex-start',
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.md,
    color: app.link,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop
  },
  notice: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1
  },
  noticeGood: { color: colors.greenDark },
  noticeWarn: { color: colors.redDark },
  sheetBody: { display: 'flex', flexDirection: 'column', gap: space.md },
  sheetActions: { display: 'flex', alignItems: 'center', gap: space.sm, justifyContent: 'flex-end' },
  dangerZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    borderRadius: radius.md,
    paddingBlock: space.md,
    paddingInline: space.md,
    backgroundColor: app.fill3,
    outlineStyle: 'solid',
    outlineWidth: 1,
    outlineColor: colors.redDark
  },
  dangerTitle: { marginBlock: 0, fontWeight: weight.semibold, color: colors.redDark, fontSize: typeScale.subheadline },
  dangerBody: { marginBlock: 0, color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  hint: { marginBlock: 0, color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  saved: {
    alignSelf: 'center',
    flexShrink: 0,
    color: app.label3,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  }
})
