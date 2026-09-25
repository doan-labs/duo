import {
  app,
  colors,
  fonts,
  leading,
  radius,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  /** Sidebar beside detail on the unfolded display, the iPadOS split. */
  split: { display: 'flex', flexDirection: 'row', flexGrow: 1, minHeight: 0, minWidth: 0, backgroundColor: app.bg },
  side: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: 'clamp(272px, 36%, 332px)',
    minHeight: 0,
    backgroundColor: app.fill3
  },
  sideScroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingTop: space.md,
    paddingRight: space.sm,
    paddingBottom: space.xxl,
    paddingLeft: space.sm
  },
  detail: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  /** The pushed detail page's inner inset, matching the list's margins. */
  detailPad: { paddingRight: space.lg, paddingLeft: space.lg },
  detailScroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingRight: space.xl,
    paddingBottom: space.xxl,
    paddingLeft: space.xl
  },

  /** The search pill above both layouts' symbol lists. */
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg
  },
  searchWrapSide: { paddingRight: space.sm, paddingLeft: space.sm },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    minWidth: 0,
    gap: space.xs,
    height: 36,
    paddingRight: space.sm,
    paddingLeft: space.sm,
    borderRadius: radius.md,
    backgroundColor: app.fill2,
    color: app.label2
  },
  searchInput: {
    flexGrow: 1,
    minWidth: 0,
    height: '100%',
    borderWidth: 0,
    outlineWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body
  },
  clearBtn: { display: 'flex', color: app.label3, cursor: 'pointer', flexShrink: 0 },
  cancel: { color: app.link, flexShrink: 0, cursor: 'pointer' },

  /** "My Symbols" and "Business" group captions. */
  secLabel: {
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    color: app.label2,
    textTransform: 'uppercase'
  },
  secLabelSide: { paddingRight: space.sm, paddingLeft: space.sm },

  /** A watchlist row. */
  tick: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    minHeight: 60,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  /** Sidebar's rounded-selection variant, no hairlines. */
  tickSide: {
    minHeight: 56,
    paddingRight: space.sm,
    paddingLeft: space.sm,
    borderBottomWidth: 0,
    borderRadius: radius.xl
  },
  tickOn: { backgroundColor: app.fill },
  tickMain: { flexGrow: 1, minWidth: 0 },
  symbol: { display: 'block', fontWeight: weight.semibold },
  tickName: {
    display: 'block',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    color: app.label2
  },
  /** Text/Num render inline spans; a column keeps price over chip. */
  right: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0
  },
  price: { fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' },
  /** The percent chip: the delta's own colour, footnote numerals. */
  chip: {
    display: 'inline-block',
    minWidth: 52,
    textAlign: 'center',
    paddingTop: space.xxs,
    paddingRight: space.xs,
    paddingBottom: space.xxs,
    paddingLeft: space.xs,
    marginTop: space.xxs,
    borderRadius: radius.sm,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    color: colors.white,
    backgroundColor: colors.greenDark,
    flexShrink: 0
  },
  dn: { backgroundColor: colors.redDark },
  spark: { flexShrink: 0 },
  size: (w: number, ht: number) => ({ width: w, height: ht }),

  /** The detail pane's quote block. */
  quoteTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.md
  },
  quoteName: { display: 'block', color: app.label2 },
  bigPrice: {
    fontSize: typeScale.display,
    lineHeight: 1,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    marginTop: space.xs
  },
  delta: { color: colors.greenDark, fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' },
  deltaDn: { color: colors.redDark },
  mktLine: { marginTop: space.xxs, color: app.label2 },

  /** The range pills under the chart. */
  ranges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.xxs,
    paddingTop: space.sm,
    paddingBottom: space.sm
  },
  rangePill: {
    paddingTop: space.xxs,
    paddingRight: space.sm,
    paddingBottom: space.xxs,
    paddingLeft: space.sm,
    borderRadius: radius.pill,
    color: app.label2,
    cursor: 'pointer'
  },
  pillOn: { backgroundColor: app.fill, color: app.fg },

  chartWrap: { height: 220, paddingTop: space.xs, paddingBottom: space.xs },
  chartSvg: { display: 'block', width: '100%', height: '100%' },
  chartFoot: { color: app.label3, paddingBottom: space.md },

  /** The stats grid: label over value, the way iPadOS spreads it. */
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
    columnGap: space.lg,
    rowGap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.lg
  },
  stat: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  statLabel: { color: app.label2 },
  statVal: { fontVariantNumeric: 'tabular-nums' },

  /** A headline row in the Business feed. */
  newsItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    width: '100%',
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  newsFirst: { borderTopWidth: 0 },
  newsTitle: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    fontWeight: weight.semibold
  },
  newsMeta: { color: app.label3 },

  /** A search result row: symbol, name, add control. */
  result: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    minHeight: 52,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  resultSide: { paddingRight: space.sm, paddingLeft: space.sm, borderBottomWidth: 0, borderRadius: radius.xl },

  /** Loading, error and empty states, centred like shared.ph. */
  empty: {
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: space.xs,
    paddingTop: space.xxl,
    paddingBottom: space.xxl,
    textAlign: 'center',
    color: app.label3
  }
})
