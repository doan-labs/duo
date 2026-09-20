import {
  app,
  appAppearance,
  colors,
  easing,
  glass,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const bookmarkRise = stylex.keyframes({ from: { transform: 'translateY(100%)', opacity: 0 } })
const bookmarkSink = stylex.keyframes({ to: { transform: 'translateY(100%)', opacity: 0 } })

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  // Cover: the chrome is a column on the right and the page keeps the rest.
  bodyRail: { flexDirection: 'row' },
  page: { position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  scroll: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    WebkitOverflowScrolling: 'touch'
  },
  frame: { display: 'block', width: '100%', height: '100%', borderWidth: 0, flexShrink: 0 },
  // The start page a new tab opens on: favourites as a grid of tiles.
  start: { minHeight: '100%', padding: 16, backgroundColor: app.surface },
  startTitle: {
    paddingBottom: 12,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    color: colors.black
  },
  favs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 12 },
  fav: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, color: colors.black },
  favIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: app.fill,
    boxShadow: shadow.card,
    fontSize: typeScale.title2,
    fontWeight: weight.semibold
  },
  favName: {
    maxWidth: '100%',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  peekStart: {
    display: 'grid',
    placeItems: 'center',
    height: '100%',
    fontSize: typeScale.caption1,
    color: app.label2
  },
  bookmarkLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    minHeight: 0,
    backgroundColor: app.bg
  },
  bookmarksIn: {
    animationName: { default: bookmarkRise, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.pop
  },
  bookmarksOut: {
    animationName: { default: bookmarkSink, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'forwards'
  },
  bookmarks: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    overflowY: 'auto',
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 32,
    paddingLeft: 16,
    backgroundColor: app.bg,
    color: app.fg
  },
  bookmarkHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 16,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: colors.black
  },
  bookmarkHeaderButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    fontWeight: weight.semibold,
    color: colors.black
  },
  bookmarkHeaderBack: {
    display: 'grid',
    placeItems: 'center',
    width: 28,
    height: 28,
    marginLeft: -6,
    paddingTop: 4,
    paddingRight: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    color: app.link,
    transform: { default: 'scale(1)', ':active': 'scale(.9)' },
    transitionProperty: 'transform',
    transitionDuration: '.2s'
  },
  bookmarkSegments: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    alignItems: 'center',
    minHeight: 44,
    paddingTop: 2,
    paddingRight: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    borderRadius: radius.xl,
    backgroundColor: app.fill,
    color: colors.black
  },
  bookmarkSegment: {
    display: 'grid',
    placeItems: 'center',
    minHeight: 40,
    borderRadius: radius.xl,
    color: colors.black,
    transitionProperty: 'background-color, box-shadow, color',
    transitionDuration: '.2s'
  },
  bookmarkSegmentOn: { backgroundColor: app.control, boxShadow: shadow.card, color: colors.black },
  bookmarkSection: {
    paddingTop: 25,
    paddingBottom: 8,
    paddingLeft: 2,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: colors.black
  },
  bookmarkGroup: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  bookmarkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 64,
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 12,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    textAlign: 'left',
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: colors.black
  },
  bookmarkIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    flexShrink: 0
  },
  bookmarkIconStar: { backgroundColor: appAppearance.safariMarkTile, color: colors.blue },
  bookmarkIconFolder: { backgroundColor: appAppearance.safariMarkTile, color: colors.blue },
  bookmarkIconLink: { backgroundColor: app.fill3, color: app.link },
  bookmarkIconApple: {
    backgroundColor: app.fill3,
    color: app.label2,
    fontSize: typeScale.title3,
    lineHeight: 1,
    textAlign: 'center'
  },
  bookmarkCount: { marginLeft: 'auto', color: app.label2 },
  bookmarkLabel: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },
  bookmarkDetail: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2
  },
  moreMenu: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 150,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: appAppearance.safariMenu,
    boxShadow: shadow.float,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  moreItem: {
    paddingTop: 11,
    paddingRight: 14,
    paddingBottom: 11,
    paddingLeft: 14,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    textAlign: 'left',
    color: colors.black,
    transform: { default: 'scale(1)', ':active': 'scale(.97)' },
    transitionProperty: 'transform, background-color',
    transitionDuration: '.2s'
  },
  bookmarkEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 8,
    color: app.label2,
    fontSize: typeScale.body,
    lineHeight: leading.body
  },
  // The URL bar floats over the page, so the web content keeps its full height.
  foot: { position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 3, pointerEvents: 'none' },
  // The page menu rises from the address bar, so it lives in the foot with it.
  // A transparent scrim over the page takes the tap that dismisses it — the page
  // is a cross-origin frame and never reports a click of its own.
  pageScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 3 },
  pageMenu: {
    display: 'flex',
    flexDirection: 'column',
    marginRight: 12,
    marginBottom: 6,
    marginLeft: 12,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: appAppearance.safariMenu,
    boxShadow: shadow.float,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    pointerEvents: 'auto'
  },
  pageMenuItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pageMenuGone: { pointerEvents: 'none' },
  // No toolbar under it on the cover, so the pill clears the home indicator itself.
  footRail: { paddingBottom: 16 },
  url: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    marginRight: 12,
    marginBottom: 8,
    marginLeft: 12,
    paddingTop: 5,
    paddingRight: 8,
    paddingBottom: 5,
    paddingLeft: 8,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.safariBar,
    boxShadow: `${shadow.float}, ${appAppearance.safariBarSheen}`,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    color: colors.blue,
    pointerEvents: 'auto',
    // Compacting by width/height would relayout and re-blur the glass every
    // frame. A scale about the bottom edge lands on the same 72%-wide, 32-tall
    // pill on the compositor instead, so the transition never touches layout.
    transformOrigin: 'bottom center',
    transform: 'scale(1)',
    willChange: 'transform',
    transitionProperty: 'transform, background-color, box-shadow',
    transitionDuration: { default: '.3s', '@media (prefers-reduced-motion: reduce)': '0s' },
    transitionTimingFunction: easing.pop
  },
  urlCompact: {
    backgroundColor: appAppearance.safariBarCompact,
    boxShadow: shadow.card,
    transform: 'scale(.72)'
  },
  // Safari's compact bar carries the domain alone. The buttons fade rather than
  // unmount so they keep their box, and the name stays centred without a reflow.
  urlSideOff: { opacity: 0, pointerEvents: 'none' },
  inputCompact: { backgroundColor: 'transparent' },
  urlMenu: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 3,
    width: 26,
    height: 28,
    paddingTop: 5,
    paddingRight: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    color: colors.black,
    opacity: { default: 1, ':focus-visible': 0.55 },
    transform: { default: 'scale(1)', ':active': 'scale(.9)' },
    transitionProperty: 'opacity, transform',
    transitionDuration: '.2s'
  },
  menuLine: { display: 'block', width: 16, height: 2, borderRadius: radius.pill, backgroundColor: 'currentColor' },
  urlReload: {
    display: 'grid',
    placeItems: 'center',
    width: 28,
    height: 28,
    paddingTop: 3,
    paddingRight: 3,
    paddingBottom: 3,
    paddingLeft: 3,
    color: colors.black,
    transform: { default: 'scale(1)', ':active': 'scale(.9)' },
    transitionProperty: 'opacity, transform',
    transitionDuration: '.2s'
  },
  input: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingTop: 7,
    paddingRight: 8,
    paddingBottom: 7,
    paddingLeft: 8,
    backgroundColor: appAppearance.safariBarField,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    textAlign: 'center',
    color: colors.black,
    outline: 0,
    transitionProperty: 'background-color, color',
    transitionDuration: '.2s'
  },
  // The tab switcher: Safari's grid of live page cards over the page, two across,
  // the open one ringed, a close dot top-left of each.
  grid: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    // The card is a thumbnail, so it takes the width the glass can spare rather
    // than a share of it: two across the cover, four across the inner display,
    // and a lone tab stays a card instead of growing to half the screen.
    gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
    alignContent: 'start',
    gap: 12,
    paddingTop: 12,
    paddingRight: 12,
    // The URL bar floats over this, so the last row has to clear it.
    paddingBottom: 72,
    paddingLeft: 12,
    overflowY: 'auto',
    backgroundColor: app.elevated
  },
  card: { position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 },
  cardPick: {
    display: 'block',
    padding: 0,
    aspectRatio: '3 / 4',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: { default: shadow.card, ':active': `0 0 0 2px ${colors.blue}` },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '.2s',
    transform: { default: 'scale(1)', ':active': 'scale(.97)' }
  },
  cardOn: { boxShadow: `0 0 0 2px ${colors.blue}` },
  // The card's page at a third: wide as three cards, drawn back to one, untouchable.
  peek: {
    width: '300%',
    height: '300%',
    borderWidth: 0,
    transform: 'scale(.3333)',
    transformOrigin: '0 0',
    pointerEvents: 'none'
  },
  cardClose: {
    position: 'absolute',
    top: 6,
    left: 6,
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.safariDot,
    color: colors.black,
    boxShadow: appAppearance.safariDotShadow
  },
  cardName: {
    paddingTop: 6,
    textAlign: 'center',
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: colors.black
  },
  bar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingInline: 20,
    // The home indicator owns the bottom 22 px of the display; the buttons clear it.
    paddingBottom: 24,
    backgroundColor: app.elevated,
    flexShrink: 0,
    color: colors.blue
  },
  // The camera column, 82 wide so its centre lands under the punch-hole (right
  // 24 + half the 34 ring). The stack above is 18 + hole 25 + time 21 + ring 45.
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 56,
    paddingTop: 141,
    paddingBottom: 16,
    backgroundColor: app.elevated,
    color: colors.black,
    flexShrink: 0
  },
  // Two glass pills of two circles each, as Apple's cover Safari: back and
  // bookmarks under the status stack, new tab and tabs at the bottom.
  railPill: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 3,
    borderRadius: radius.pill,
    boxShadow: appAppearance.safariPillEdge
  },
  railBtn: {
    width: 40,
    height: 40,
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.safariGlass,
    boxShadow: `${appAppearance.safariGlassEdge}, ${shadow.rim}`,
    transform: { default: 'scale(1)', ':active': 'scale(.9)' },
    transitionProperty: 'transform, opacity',
    transitionDuration: { default: '.22s', '@media (prefers-reduced-motion: reduce)': '0s' },
    transitionTimingFunction: easing.pop
  },
  railGap: { flexGrow: 1 },
  barBtn: {
    display: 'grid',
    placeItems: 'center',
    paddingBlock: 4,
    paddingInline: 10,
    opacity: { default: null, ':disabled': 0.3 }
  }
})
