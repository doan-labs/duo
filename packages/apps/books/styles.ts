// Books on the Duo: a floating glass sidebar on the wide display, a floating
// tab bar on the cover, cover-first cells and shelves in the panes, and the
// reader's themed page, chrome and cards.

import {
  app,
  appAppearance,
  booksLeading,
  colors,
  easing,
  fonts,
  glass,
  layout,
  leading,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const SIZES = ['caption2', 'footnote', 'subheadline', 'callout', 'body', 'title3', 'title2'] as const
type SizeKey = (typeof SIZES)[number]

export const styles = stylex.create({
  /** Artwork seeded per call site. */
  bg: (image: string) => ({ backgroundImage: image }),
  root: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  fill: { position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  /** The panes' scrolling body. */
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: space.xxl
  },
  /** Room for the floating sidebar; content still runs under the glass. */
  paneSide: { paddingLeft: 232 },
  /** Room for the floating tab bar on the cover. */
  paneScroll: { paddingBottom: 96 },

  /** ---- cover ---- */
  cov: {
    position: 'relative',
    aspectRatio: '2/3',
    flexShrink: 0,
    borderRadius: radius.sm,
    overflow: 'hidden',
    boxShadow: `${appAppearance.booksSpine},${shadow.float}`,
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'none'
  },
  covW: (w: number | string) => ({ width: w }),
  covFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.sm,
    boxShadow: appAppearance.booksCoverFrame,
    pointerEvents: 'none'
  },
  covText: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexGrow: 1,
    paddingTop: 10,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    textAlign: 'center',
    alignItems: 'center',
    color: appAppearance.booksPaperInk,
    fontFamily: fonts.serif,
    pointerEvents: 'none'
  },
  covTexts: { paddingTop: 4, paddingRight: 4, paddingBottom: 3, paddingLeft: 7 },
  covTextm: { paddingTop: 8, paddingRight: 6, paddingBottom: 6, paddingLeft: 10 },
  covTextl: {},
  covTextxl: {},
  covTitle: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption1,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 4,
    overflow: 'hidden'
  },
  covTitles: { fontSize: typeScale.caption2, lineHeight: leading.caption2, WebkitLineClamp: 2 },
  covTitlem: { fontSize: typeScale.caption1 },
  covTitlel: { fontSize: typeScale.footnote, lineHeight: leading.footnote },
  covTitlexl: { fontSize: typeScale.headline, lineHeight: leading.headline, WebkitLineClamp: 3 },
  covAuthor: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.8,
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  covAuthorxl: { fontSize: typeScale.caption1, lineHeight: leading.caption1 },

  /** ---- chrome ---- */
  side: {
    position: 'absolute',
    zIndex: 2,
    top: -32,
    bottom: 8,
    left: 8,
    width: 216,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 24,
    paddingRight: 8,
    paddingBottom: 12,
    paddingLeft: 8,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: appAppearance.booksPanel,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, overflowY: 'auto', minHeight: 0 },
  sideCap: {
    paddingTop: 16,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 10,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.semibold,
    color: app.label3,
    textTransform: 'uppercase'
  },
  sideRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    textAlign: 'left',
    cursor: 'pointer'
  },
  sideRowOn: { backgroundColor: app.fill, color: appAppearance.booksAccent, fontWeight: weight.semibold },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideN: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2,
    fontVariantNumeric: 'tabular-nums'
  },
  sideNew: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: appAppearance.booksAccent,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    cursor: 'pointer',
    textAlign: 'left'
  },
  tabs: {
    position: 'absolute',
    zIndex: 2,
    right: 10,
    bottom: 26,
    left: 10,
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: radius.xxl,
    backgroundColor: appAppearance.booksPanel,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.float
  },
  tab: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: 'transparent',
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  tabOn: { color: appAppearance.booksAccent },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: app.label2
  },
  searchInput: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontFamily: fonts.system,
    '::placeholder': { color: app.label3 }
  },
  searchX: { display: 'flex', color: app.label3, cursor: 'pointer' },
  searchBox: { marginTop: 4, marginRight: 18, marginBottom: 6, marginLeft: 18 },

  /** ---- shared pane bits ---- */
  head: { display: 'flex', alignItems: 'center', gap: 10, paddingRight: 18, paddingLeft: 18 },
  headTitle: {
    marginTop: 0,
    marginBottom: 0,
    marginRight: 'auto',
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 2,
    paddingLeft: 18,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    color: app.fg
  },
  headSub: {
    marginTop: 0,
    paddingRight: 18,
    paddingBottom: 2,
    paddingLeft: 18,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  headAct: { position: 'relative' },
  headBtn: {
    display: 'flex',
    padding: 6,
    borderRadius: radius.pill,
    color: appAppearance.booksAccent,
    cursor: 'pointer'
  },
  sortMenu: { position: 'absolute', top: '100%', right: 0, minWidth: 190 },
  shelfBox: { marginTop: 16 },
  shelfTitle: {
    marginTop: 0,
    marginBottom: 8,
    paddingRight: 18,
    paddingLeft: 18,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.bold,
    color: app.fg
  },
  shelfRow: {
    display: 'flex',
    gap: 18,
    overflowX: 'auto',
    paddingTop: 4,
    paddingRight: 18,
    paddingBottom: 10,
    paddingLeft: 18,
    scrollbarWidth: 'none'
  },
  cell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
    minWidth: 0,
    textAlign: 'left',
    cursor: 'pointer',
    flexShrink: 0
  },
  cellCov: { position: 'relative' },
  cellTitle: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    color: app.fg,
    maxWidth: 118,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  cellAuthor: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label2,
    maxWidth: 118,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  cellMeta: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label3
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.booksAccent,
    color: colors.white,
    boxShadow: shadow.card
  },
  prog: {
    height: 3,
    width: 118,
    maxWidth: '100%',
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    overflow: 'hidden'
  },
  progFill: { display: 'block', height: '100%', borderRadius: radius.pill, backgroundColor: appAppearance.booksAccent },
  progW: (pct: number) => ({ width: `${pct}%` }),
  get: {
    paddingTop: 4,
    paddingRight: 12,
    paddingBottom: 4,
    paddingLeft: 12,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: appAppearance.booksAccent,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.bold,
    cursor: 'pointer'
  },
  getOn: { color: app.label2 },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 9,
    paddingRight: 22,
    paddingBottom: 9,
    paddingLeft: 22,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.booksAccent,
    color: colors.white,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },
  brow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 18,
    paddingLeft: 18,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    textAlign: 'left',
    cursor: 'pointer'
  },
  browText: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  browTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  browAuthor: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingTop: 60,
    paddingRight: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    textAlign: 'center'
  },
  emptyTitle: {
    margin: 0,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    fontWeight: weight.semibold,
    color: app.fg
  },
  emptySub: {
    margin: 0,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    color: app.label2
  },

  /** ---- home ---- */
  hero: {
    position: 'relative',
    marginTop: 10,
    marginRight: 18,
    marginBottom: 4,
    marginLeft: 18,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  heroIn: {
    display: 'flex',
    gap: 18,
    width: '100%',
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 64,
    paddingLeft: 18,
    textAlign: 'left',
    borderRadius: radius.xxl,
    cursor: 'pointer'
  },
  heroText: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' },
  heroKicker: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.semibold,
    color: appAppearance.booksAccent,
    textTransform: 'uppercase'
  },
  heroTitle: {
    fontFamily: fonts.serif,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    color: app.fg
  },
  heroAuthor: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2
  },
  heroMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label2
  },
  heroProg: { width: 120 },
  heroGo: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 7,
    paddingRight: 16,
    paddingBottom: 7,
    paddingLeft: 16,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.booksAccentSoft,
    color: appAppearance.booksAccent,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },

  /** ---- library grid ---- */
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
    columnGap: 18,
    rowGap: 22,
    paddingTop: 8,
    paddingRight: 18,
    paddingLeft: 18
  },

  /** ---- store ---- */
  shopHero: {
    position: 'relative',
    marginTop: 10,
    marginRight: 18,
    marginBottom: 4,
    marginLeft: 18,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    boxShadow: shadow.float,
    transform: 'translateZ(0)'
  },
  shopShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: appAppearance.booksShade
  },
  shopHeroIn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    gap: 18,
    width: '100%',
    paddingTop: 26,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    textAlign: 'left',
    cursor: 'pointer'
  },
  shopHeroText: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  shopKicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    textTransform: 'uppercase',
    color: colors.white,
    opacity: 0.85
  },
  shopTitle: {
    fontFamily: fonts.serif,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    color: colors.white
  },
  shopAuthor: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: colors.white,
    opacity: 0.85
  },
  shopGet: { position: 'absolute', right: 14, bottom: 14 },
  shopCell: { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', flexShrink: 0 },
  shopFoot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    paddingRight: 30,
    paddingLeft: 30,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label3,
    textAlign: 'center'
  },

  /** ---- search ---- */
  genreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
    paddingRight: 18,
    paddingLeft: 18
  },
  genre: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    borderRadius: radius.lg,
    backgroundColor: app.fill,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    textAlign: 'left'
  },
  genreN: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label2,
    fontVariantNumeric: 'tabular-nums'
  },
  hitList: { display: 'flex', flexDirection: 'column' },

  /** ---- audiobooks ---- */
  audioList: { display: 'flex', flexDirection: 'column' },
  audioRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingRight: 18,
    paddingBottom: 10,
    paddingLeft: 18,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  audioOpen: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexGrow: 1,
    minWidth: 0,
    textAlign: 'left',
    cursor: 'pointer'
  },
  audioLen: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label3
  },
  audioBar: {
    position: 'absolute',
    right: 18,
    bottom: 0,
    left: 82,
    height: 2,
    backgroundColor: app.fill
  },
  audioBarFill: { display: 'block', height: '100%', backgroundColor: appAppearance.booksAccent },
  audioPlay: {
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: appAppearance.booksAccent,
    cursor: 'pointer'
  },
  audioPlayOn: { backgroundColor: appAppearance.booksAccent, color: colors.white },
  nowBar: {
    position: 'absolute',
    zIndex: 2,
    right: 10,
    bottom: 88,
    left: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: radius.lg,
    backgroundColor: app.elevated,
    boxShadow: shadow.float
  },
  nowText: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  nowTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.semibold,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  nowSub: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  nowRate: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 4,
    paddingLeft: 8,
    borderRadius: radius.pill,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },

  /** ---- detail page ---- */
  det: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, backgroundColor: app.bg },
  detTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 10,
    position: 'relative'
  },
  detBack: {
    display: 'flex',
    padding: 6,
    borderRadius: radius.pill,
    color: appAppearance.booksAccent,
    cursor: 'pointer'
  },
  detTopTitle: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontWeight: weight.semibold,
    color: app.fg
  },
  detMenu: { position: 'absolute', top: '100%', right: 10, minWidth: 230 },
  detScroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 40 },
  detHero: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 18 },
  detTitle: {
    marginTop: 8,
    marginBottom: 0,
    paddingRight: 24,
    paddingLeft: 24,
    // align-items:center shrink-wraps this to max-content; cap it so the title wraps
    maxWidth: '100%',
    boxSizing: 'border-box',
    fontFamily: fonts.serif,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    color: app.fg,
    textAlign: 'center'
  },
  detAuthor: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    color: app.label2
  },
  detChips: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 },
  chip: {
    paddingTop: 4,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium
  },
  detProg: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label2
  },
  detBtns: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 },
  heart: {
    display: 'grid',
    placeItems: 'center',
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: appAppearance.booksAccent,
    cursor: 'pointer'
  },
  heartOn: { backgroundColor: appAppearance.booksAccentSoft, color: appAppearance.booksAccent },
  detSec: { marginTop: 8, paddingRight: 20, paddingLeft: 20 },
  about: {
    margin: 0,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.fg
  },
  detH: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.bold,
    color: app.fg
  },
  toc: {
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    overflow: 'hidden'
  },
  tocRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    width: '100%',
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    textAlign: 'left',
    cursor: 'pointer'
  },
  tocN: {
    flexShrink: 0,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label3,
    fontVariantNumeric: 'tabular-nums'
  },
  tocT: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    color: app.fg
  },
  info: {
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    overflow: 'hidden'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'baseline',
    paddingTop: 9,
    paddingRight: 14,
    paddingBottom: 9,
    paddingLeft: 14,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  infoK: { width: 110, flexShrink: 0, fontSize: typeScale.footnote, lineHeight: leading.footnote, color: app.label2 },
  infoV: { fontSize: typeScale.footnote, lineHeight: leading.footnote, color: app.fg },

  /** ---- reader ---- */
  theme: (t: { bg: string; ink: string; mute: string }) => ({ backgroundColor: t.bg, color: t.ink }),
  mute: (t: { bg: string; ink: string; mute: string }) => ({ color: t.mute }),
  read: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    position: 'relative'
  },
  readTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 6,
    paddingLeft: 10,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.28s',
    transitionTimingFunction: easing.out
  },
  readBtn: {
    display: 'flex',
    padding: 8,
    borderRadius: radius.pill,
    color: 'inherit',
    cursor: 'pointer',
    flexShrink: 0
  },
  readBtnOn: { color: appAppearance.booksAccent },
  readTitle: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    fontFamily: fonts.serif,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontStyle: 'italic'
  },
  chromeOffTop: { transform: 'translateY(-110%)', opacity: 0, pointerEvents: 'none' },
  readBox: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    userSelect: 'none',
    cursor: 'text'
  },
  readFlow: {
    position: 'absolute',
    top: 10,
    bottom: 14,
    left: 44,
    columnFill: 'auto',
    textAlign: 'justify',
    hyphens: 'auto',
    transitionProperty: 'transform',
    transitionDuration: { default: '.34s', '@media (prefers-reduced-motion: reduce)': '0s' },
    transitionTimingFunction: easing.out
  },
  flow: (pw: number, gap: number, cols: number) => ({
    width: pw * cols + gap * (cols - 1),
    columnWidth: pw,
    columnGap: gap
  }),
  shift: (x: number) => ({ transform: `translateX(${x}px)` }),
  type: (size: SizeKey, family: string) => ({
    fontSize: typeScale[size],
    lineHeight: booksLeading[size],
    fontFamily: family
  }),
  headType: (size: SizeKey) => ({
    fontSize: typeScale[size],
    lineHeight: booksLeading[size]
  }),
  para: { marginTop: 0, marginBottom: 0, marginRight: 0, marginLeft: 0, textIndent: '1.35em' },
  paraBold: { fontWeight: weight.semibold },
  chapHead: {
    marginTop: 0,
    marginRight: 0,
    marginBottom: 14,
    marginLeft: 0,
    paddingTop: 6,
    breakBefore: 'column',
    fontWeight: weight.semibold,
    textIndent: 0,
    letterSpacing: tracking.title3
  },
  chapHeadFirst: { breakBefore: 'auto' },
  readVert: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  readVertIn: {
    maxWidth: 660,
    marginRight: 'auto',
    marginLeft: 'auto',
    paddingTop: 12,
    paddingRight: 26,
    paddingBottom: 60,
    paddingLeft: 26,
    textAlign: 'justify',
    hyphens: 'auto'
  },
  readBot: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 8,
    paddingLeft: 16,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.28s',
    transitionTimingFunction: easing.out
  },
  chromeOffBot: { transform: 'translateY(110%)', opacity: 0, pointerEvents: 'none' },
  readPage: {
    flexShrink: 0,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontVariantNumeric: 'tabular-nums'
  },
  scrub: { flexGrow: 1, accentColor: appAppearance.booksAccent },

  /** reader cards (sheets + the appearance popover) */
  sheet: { width: 340, maxHeight: '72%', display: 'flex', flexDirection: 'column', padding: 0 },
  sheetTop: {
    paddingTop: 12,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    display: 'flex',
    justifyContent: 'center'
  },
  sheetList: { overflowY: 'auto', minHeight: 60 },
  sheetRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    width: '100%',
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    textAlign: 'left',
    cursor: 'pointer'
  },
  sheetT: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  sheetN: { flexShrink: 0, fontSize: typeScale.caption1, lineHeight: leading.caption1, color: app.label3 },
  sheetEmpty: {
    margin: 0,
    paddingTop: 16,
    paddingRight: 14,
    paddingBottom: 18,
    paddingLeft: 14,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    color: app.label2
  },
  findIn: {
    width: '100%',
    paddingTop: 7,
    paddingRight: 12,
    paddingBottom: 7,
    paddingLeft: 12,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: app.fill,
    color: app.fg,
    outline: 'none',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    fontFamily: fonts.system,
    '::placeholder': { color: app.label3 }
  },
  styleCard: {
    position: 'absolute',
    zIndex: 4,
    top: 46,
    right: 10,
    width: 290,
    maxHeight: 'calc(100% - 110px)',
    overflowY: 'auto',
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    borderRadius: radius.xxl,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  styleCap: {
    paddingTop: 4,
    paddingBottom: 6,
    paddingRight: 6,
    paddingLeft: 6,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    opacity: 0.6
  },
  styleRow: { display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4, paddingLeft: 4 },
  styleRowPad: { paddingTop: 6, paddingBottom: 4 },
  dot: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
    cursor: 'pointer'
  },
  dotBg: (bg: string, ink: string) => ({ backgroundColor: bg, color: ink }),
  dotOn: { borderColor: appAppearance.booksAccent },
  fontList: { display: 'flex', flexDirection: 'column', gap: 1 },
  fontRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    cursor: 'pointer',
    textAlign: 'left'
  },
  fontOn: { color: appAppearance.booksAccent },
  fontName: { flexGrow: 1, fontSize: typeScale.subheadline, lineHeight: leading.subheadline },
  fontFam: (family: string) => ({ fontFamily: family }),
  sizeBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    fontSize: typeScale.subheadline,
    fontWeight: weight.medium,
    cursor: { default: 'pointer', ':disabled': 'default' },
    opacity: { default: 1, ':disabled': 0.4 }
  },
  sizeTrack: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexGrow: 1 },
  sizeTick: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: app.fill3 },
  sizeTickOn: { backgroundColor: appAppearance.booksAccent },
  styleToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingRight: 6,
    paddingLeft: 6,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    cursor: 'pointer'
  },
  end: {
    breakBefore: 'column',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    textAlign: 'center',
    textIndent: 0
  },
  endTitle: {
    fontFamily: fonts.serif,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    fontWeight: weight.bold
  },
  endSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.largeTitle,
    textTransform: 'uppercase',
    opacity: 0.6
  },
  endLink: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    color: appAppearance.booksAccent,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },

  /** new-collection card */
  newShelf: { width: 300, padding: 0 },
  newShelfBody: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16 },
  newShelfTitle: {
    margin: 0,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    fontWeight: weight.semibold,
    color: app.fg
  }
})
