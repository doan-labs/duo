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

const cardIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(10px) scale(.98)' },
  '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
})

export const tintBg = stylex.create({
  green: { backgroundColor: colors.greenDark },
  orange: { backgroundColor: colors.orangeDark },
  cyan: { backgroundColor: colors.cyanDark },
  yellow: { backgroundColor: colors.yellowDark },
  purple: { backgroundColor: colors.purpleDark },
  pink: { backgroundColor: colors.pinkDark },
  grey: { backgroundColor: colors.grey3Dark }
})

export const tintText = stylex.create({
  green: { color: colors.greenDark },
  orange: { color: colors.orangeDark },
  cyan: { color: colors.cyanDark },
  yellow: { color: colors.yellowDark },
  purple: { color: colors.purpleDark },
  pink: { color: colors.pinkDark },
  grey: { color: colors.grey2Dark }
})

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
    colorScheme: 'dark',
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
    gap: space.md,
    flexShrink: 0
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  kicker: {
    color: colors.greenDark,
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
  stage: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
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
  cardEditing: { outlineStyle: 'solid', outlineWidth: 1, outlineColor: colors.greenDark, outlineOffset: 1 },
  cardHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  cardTitle: {
    marginBlock: 0,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  cardMeta: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  editingBadge: {
    color: colors.greenDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  hero: { alignItems: 'flex-start', gap: space.xs },
  heroValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: space.xxs,
    fontFamily: fonts.rounded,
    fontSize: typeScale.displayLg,
    lineHeight: 1,
    fontWeight: weight.thin,
    fontVariantNumeric: 'tabular-nums'
  },
  heroValueCover: { fontSize: typeScale.display },
  heroSign: { color: app.label2, fontSize: typeScale.title2, fontWeight: weight.regular },
  heroSub: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  overText: { color: colors.redDark },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.xxs,
    paddingInline: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: glass.tintDark,
    boxShadow: shadow.rim,
    flexShrink: 0
  },
  navBtn: {
    display: 'grid',
    placeItems: 'center',
    width: `calc(${space.xl} + ${space.sm})`,
    height: `calc(${space.xl} + ${space.sm})`,
    borderWidth: 0,
    borderRadius: radius.pill,
    color: app.fg,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  navLabel: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  navToday: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.md,
    color: app.link,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.bold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop
  },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', columnGap: space.sm },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    textTransform: 'uppercase'
  },
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
  inputBad: { outlineStyle: 'solid', outlineWidth: 1, outlineColor: colors.redDark },
  amountBox: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    height: `calc(${space.xxxl} + ${space.xs})`,
    borderRadius: radius.md,
    paddingInline: space.md,
    backgroundColor: app.fill3
  },
  amountSign: { color: app.label2, fontSize: typeScale.footnote, fontWeight: weight.semibold },
  amountInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    padding: 0,
    color: app.fg,
    backgroundColor: 'transparent',
    fontFamily: fonts.mono,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    outlineWidth: 0
  },
  errorText: { marginBlock: 0, color: colors.redDark, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: space.xs },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
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
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  chipOn: { color: colors.grey6Dark },
  chipIcon: { display: 'inline-flex' },
  actions: { display: 'flex', alignItems: 'center', gap: space.sm },
  grow: { flexGrow: 1 },
  deleteBtn: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.md,
    color: colors.redDark,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop
  },
  bars: { display: 'flex', flexDirection: 'column', gap: space.md },
  barRow: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  barMeta: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  barLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.medium,
    minWidth: 0
  },
  barValue: { color: app.label2, fontSize: typeScale.caption1, fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
  track: {
    position: 'relative',
    height: space.md,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: app.fill2
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.pill,
    transitionProperty: 'width',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.push
  },
  barWidth: (pct: number) => ({ width: `${pct * 100}%` }),
  overFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.redDark },
  overSpan: (tick: number, base: number) => ({ left: `${tick * 100}%`, width: `${(base - tick) * 100}%` }),
  limitTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: space.xxs,
    backgroundColor: app.fg,
    transform: 'translateX(-50%)'
  },
  tickAt: (pct: number) => ({ left: `${pct * 100}%` }),
  days: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: space.xxs,
    height: `calc(${space.xxxl} * 2)`,
    minWidth: 0
  },
  dayCol: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', height: '100%' },
  dayBar: { width: '100%', borderRadius: radius.xs, backgroundColor: app.fill3 },
  dayEmpty: { height: space.xxs },
  dayFill: (pct: number) => ({
    height: `${Math.max(6, Math.round(pct * 100))}%`,
    backgroundColor: colors.greenDark
  }),
  dayToday: { backgroundColor: colors.mintDark },
  dayAxis: {
    display: 'flex',
    justifyContent: 'space-between',
    color: app.label3,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  limits: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  limitRow: { display: 'flex', alignItems: 'center', gap: space.sm, minWidth: 0, paddingBlock: space.xxs },
  limitIcon: {
    display: 'grid',
    placeItems: 'center',
    width: `calc(${space.xl} + ${space.xs})`,
    height: `calc(${space.xl} + ${space.xs})`,
    borderRadius: radius.sm,
    color: colors.grey6Dark,
    flexShrink: 0
  },
  limitBody: { display: 'flex', flexDirection: 'column', gap: space.xxs, flex: 1, minWidth: 0 },
  limitName: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  limitBox: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    width: `calc(${space.xxxl} * 3)`,
    borderRadius: radius.sm,
    paddingInline: space.xs,
    backgroundColor: app.fill3,
    flexShrink: 0
  },
  limitInput: {
    width: '100%',
    borderWidth: 0,
    paddingBlock: space.xs,
    paddingInline: 0,
    color: app.fg,
    backgroundColor: 'transparent',
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    outlineWidth: 0,
    textAlign: 'end'
  },
  ledgerCard: { flexGrow: 1 },
  txList: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    marginBlock: 0,
    paddingInline: 0,
    listStyle: 'none'
  },
  txRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: space.xxs,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 }
  },
  txRowEditing: { backgroundColor: app.fill3 },
  txEdit: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
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
    borderRadius: radius.md,
    touchAction: 'manipulation'
  },
  txIcon: {
    display: 'grid',
    placeItems: 'center',
    width: `calc(${space.xl} + ${space.sm})`,
    height: `calc(${space.xl} + ${space.sm})`,
    borderRadius: radius.sm,
    color: colors.grey6Dark,
    flexShrink: 0
  },
  txBody: { display: 'flex', flexDirection: 'column', gap: space.xxs, flex: 1, minWidth: 0 },
  txName: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.medium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  txSub: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  txAmount: {
    fontFamily: fonts.mono,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0
  },
  txDel: {
    display: 'grid',
    placeItems: 'center',
    alignSelf: 'center',
    width: `calc(${space.xl} + ${space.sm})`,
    height: `calc(${space.xl} + ${space.sm})`,
    borderWidth: 0,
    borderRadius: radius.pill,
    color: { default: app.label2, ':hover': colors.redDark },
    backgroundColor: { default: 'transparent', ':hover': app.fill },
    cursor: 'pointer',
    flexShrink: 0,
    marginRight: space.xs,
    touchAction: 'manipulation',
    transform: { default: 'scale(1)', ':active': motion.press },
    transitionProperty: 'transform,background-color,color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop
  },
  hint: { marginBlock: 0, color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  saved: {
    alignSelf: 'center',
    flexShrink: 0,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  }
})
