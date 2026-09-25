// Apple News for the Duo: the sidebar and tab bar float as glass panels, the
// feed is hairline-separated rows, and the article reads as a serif column.
import {
  app,
  appAppearance,
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

const shimmer = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.45 }
})

export const styles = stylex.create({
  /** A story or topic's generated artwork, seeded per call site. */
  bgImg: (image: string) => ({ backgroundImage: image }),
  /** The app root: fills the root div in main.tsx, hosts the width measure. */
  root: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  /** Everything inside the push layer's page box. */
  fill: { position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  /** The feed's scrolling body: the large title scrolls away with the stories. */
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: space.xxl },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, minWidth: 0 },
  /** Room for the floating sidebar; rows still run under the glass. */
  paneSide: { paddingLeft: 232 },
  /** Room for the floating tab bar on the cover. */
  paneScroll: { paddingBottom: 92 },

  /**
   * Sidebar: the search field, the channels, and the followed topics. It runs
   * up under the 40 px the shell reserves for the status stack, so its glass
   * reads as part of the screen edge.
   */
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
    backgroundColor: appAppearance.newsPanel,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, overflowY: 'auto', minHeight: 0 },
  sideCap: {
    paddingTop: 14,
    paddingRight: 10,
    paddingBottom: 3,
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
  sideRowOn: { backgroundColor: app.fill, color: appAppearance.newsAccent, fontWeight: weight.semibold },
  sideMark: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.bold
  },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideN: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2,
    fontVariantNumeric: 'tabular-nums'
  },
  /** Where the stories come from, as a lifted card on the glass. */
  sideFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
    borderRadius: radius.pill,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  sideFootText: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  sideFootName: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    color: app.fg
  },
  sideFootSub: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label2
  },
  sideFootGo: { display: 'flex', flexShrink: 0, color: appAppearance.newsAccent, cursor: 'pointer' },

  /** The cover's answer to the sidebar, floating clear of the home bar. */
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
    backgroundColor: appAppearance.newsPanel,
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
  tabOn: { color: appAppearance.newsAccent },

  /** The search capsule, in the sidebar when wide and inside Search when not. */
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
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontFamily: fonts.system,
    '::placeholder': { color: app.label3 }
  },

  /** Pane header inside the scroll: 'Today' left, the date or a follow chip right. */
  head: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 0,
    paddingLeft: 18
  },
  headTitle: {
    marginTop: 0,
    marginBottom: 0,
    marginRight: 'auto',
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    color: app.fg
  },
  headSide: { flexShrink: 0, paddingBottom: 6, color: app.label2 },
  headSub: {
    paddingTop: 0,
    paddingRight: 18,
    paddingBottom: 2,
    paddingLeft: 18,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },

  /** A section heading between groups of stories. */
  head2: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    marginRight: 18,
    marginBottom: 2,
    marginLeft: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.newsHairline
  },
  head2First: { borderTopWidth: 0, paddingTop: 12 },
  head2Title: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    color: app.fg
  },
  head2Sub: {
    marginLeft: 'auto',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },

  /** Today's lead: the artwork is the card, its text sits on the bottom scrim. */
  hero: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    minHeight: 300,
    marginTop: 12,
    marginRight: 18,
    marginBottom: 8,
    marginLeft: 18,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    color: colors.white,
    textAlign: 'left',
    boxShadow: shadow.float,
    cursor: 'pointer',
    transform: 'translateZ(0)'
  },
  heroSm: { minHeight: 200 },
  heroArt: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  heroShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: appAppearance.newsShade
  },
  heroText: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 18,
    paddingLeft: 20
  },
  kicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    textTransform: 'uppercase',
    opacity: 0.85,
    textShadow: shadow.text
  },
  heroTitle: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    textShadow: shadow.text
  },
  heroTitleSm: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3
  },
  heroMeta: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    opacity: 0.92,
    textShadow: shadow.text
  },

  /** Story rows: one column on the cover, two beside the sidebar. */
  grid: { display: 'grid', gridTemplateColumns: '1fr', columnGap: 28, paddingRight: 18, paddingLeft: 18 },
  gridWide: { gridTemplateColumns: '1fr 1fr' },
  row: {
    minWidth: 0,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.newsHairline
  },
  rowIn: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    paddingTop: 11,
    paddingBottom: 11,
    textAlign: 'left',
    borderRadius: radius.md,
    cursor: 'pointer'
  },
  rowText: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  rowTitle: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    color: app.fg,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden'
  },
  rowMeta: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  thumb: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: radius.lg,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.bold,
    boxShadow: shadow.card
  },
  thumbSm: { width: 56, height: 56 },

  /** Skeleton rows while a feed is in the air. */
  sk: {
    animationName: { default: shimmer, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '1s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite',
    animationDirection: 'alternate'
  },
  skHero: {
    marginTop: 12,
    marginRight: 18,
    marginBottom: 8,
    marginLeft: 18,
    minHeight: 300,
    borderRadius: radius.xxl,
    backgroundColor: app.fill3
  },
  skThumb: { width: 64, height: 64, flexShrink: 0, borderRadius: radius.lg, backgroundColor: app.fill3 },
  skLine: { height: 13, borderRadius: radius.sm, backgroundColor: app.fill3 },
  skLineS: { height: 10, width: '55%', borderRadius: radius.sm, backgroundColor: app.fill3 },
  skPad: { marginTop: 8 },

  /** The follow chip beside a topic's title. */
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    paddingTop: 6,
    paddingRight: 13,
    paddingBottom: 6,
    paddingLeft: 13,
    borderRadius: radius.pill,
    backgroundColor: { default: appAppearance.newsAccentSoft, ':hover': app.fill },
    color: appAppearance.newsAccent,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },

  /** The article, pushed over the whole app. */
  artTop: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 10
  },
  artBack: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    color: appAppearance.newsAccent,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    cursor: 'pointer'
  },
  artActs: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, color: appAppearance.newsAccent },
  artAct: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
  artHero: { flexShrink: 0, minHeight: 190 },
  artHeroSm: { minHeight: 130 },
  artWrap: { flexGrow: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 40 },
  artBody: { width: '100%', maxWidth: 680, marginLeft: 'auto', marginRight: 'auto', paddingRight: 18, paddingLeft: 18 },
  artKick: {
    marginTop: 20,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.semibold,
    color: appAppearance.newsAccent,
    textTransform: 'uppercase'
  },
  artTitle: {
    marginTop: 8,
    fontFamily: fonts.serif,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold,
    color: app.fg
  },
  artMeta: {
    marginTop: 10,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  artBy: { fontWeight: weight.semibold, color: app.fg },
  artActions: {
    marginTop: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.newsHairline,
    display: 'flex',
    gap: 10
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 7,
    paddingRight: 14,
    paddingBottom: 7,
    paddingLeft: 14,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },
  pillAccent: { backgroundColor: appAppearance.newsAccentSoft, color: appAppearance.newsAccent },
  artText: {
    marginTop: 16,
    fontFamily: fonts.serif,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    color: app.fg,
    whiteSpace: 'pre-line'
  },
  disc: { marginTop: 22 },
  discHead: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.newsHairline
  },
  discTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.bold,
    color: app.fg
  },
  discN: { fontSize: typeScale.footnote, lineHeight: leading.footnote, color: app.label2 },
  cmt: {
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.newsHairline
  },
  cmtHead: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  cmtBy: { fontWeight: weight.semibold, color: app.fg },
  cmtAgo: { color: app.label3 },
  cmtText: {
    marginTop: 4,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.fg
  },
  cmtKids: {
    marginTop: 6,
    marginLeft: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: appAppearance.newsHairline
  },

  /** Following / Saved / History / Search panes. */
  grp: { marginRight: 18, marginBottom: 4, marginLeft: 18 },
  grpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.newsHairline,
    textAlign: 'left',
    cursor: 'pointer'
  },
  grpOpen: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexGrow: 1,
    minWidth: 0,
    textAlign: 'left',
    cursor: 'pointer'
  },
  grpMark: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    fontWeight: weight.bold
  },
  grpLabel: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    color: app.fg
  },
  grpAct: { display: 'flex', flexShrink: 0, color: app.label3 },
  grpActOn: { color: appAppearance.newsAccent },
  searchBox: { marginTop: 8, marginRight: 18, marginBottom: 4, marginLeft: 18 }
})
