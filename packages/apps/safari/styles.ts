import {
  app,
  appAppearance,
  colors,
  easing,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const bookmarkRise = stylex.keyframes({ from: { transform: 'translateY(100%)', opacity: 0 } })
const bookmarkSink = stylex.keyframes({ to: { transform: 'translateY(100%)', opacity: 0 } })

// A press lands in the kit's .15 s and lets go on a spring. Eased at the
// release's pace both ways, a quick click lifts before the button has moved.
const PRESS = {
  transform: { default: 'scale(1)', ':active': motion.press },
  transitionDuration: {
    default: '.45s',
    ':active': motion.pressDuration,
    '@media (prefers-reduced-motion: reduce)': '0s'
  },
  transitionTimingFunction: { default: easing.spring, ':active': easing.out }
} as const

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
  fav: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 0,
    color: colors.black,
    ...PRESS,
    transitionProperty: 'transform'
  },
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
    // The card stays white under the overview's dark theme, so not app.label2.
    color: colors.grey
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
    ...PRESS,
    transitionProperty: 'transform'
  },
  // The inner display has no toolbar to close bookmarks from, so the page takes
  // the round close button an iOS 26 sheet carries at its top right.
  bookmarkClose: {
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    marginLeft: 'auto',
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: app.fill,
    color: app.label2,
    ...PRESS,
    transitionProperty: 'transform'
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
    color: colors.black,
    // A list row does not shrink under the finger: iOS greys it at once and
    // lets the grey fade when the finger lifts.
    backgroundColor: { default: 'transparent', ':active': app.fill },
    transitionProperty: 'background-color',
    transitionDuration: { default: '.3s', ':active': '0s' }
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
  // The kit's `Menu` is the sheet itself; what is left here is where it sits,
  // the glass it wears and the separators between Safari's rows.
  moreMenu: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 4,
    minWidth: 150,
    backgroundColor: appAppearance.safariMenu
  },
  // No hairline per row: iOS 26 rules only between groups, and the menu draws that.
  moreItem: { color: colors.black },
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
  // iOS 26 runs no toolbar under it on either display, so the row clears the
  // home indicator itself.
  foot: { position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 3, paddingBottom: 16, pointerEvents: 'none' },
  // The page menu rises from the address bar, so it lives in the foot with it.
  // A transparent scrim over the page takes the tap that dismisses it — the page
  // is a cross-origin frame and never reports a click of its own.
  pageScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 3 },
  pageMenu: { marginRight: 12, marginBottom: 6, marginLeft: 12, backgroundColor: appAppearance.safariMenu },
  // The more menu rises out of its round button at the right, as wide as its rows.
  menuRight: { width: 'fit-content', minWidth: 240, marginLeft: 'auto' },
  // Page Zoom: the frame is laid out at 100/z and drawn at z, which is what
  // WebKit's zoom does to a page: bigger type, same visible width, reflowed.
  zoom: (z: number) => ({
    width: `${100 / z}%`,
    height: `${100 / z}%`,
    transform: `scale(${z})`,
    transformOrigin: 'top left'
  }),
  // Apple's row: a round back button, the address pill, a round more button.
  footRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12
  },
  // The row wears the kit's dark theme, so the glyphs, the type and the
  // placeholder on the glass all read from `app` as they would in a dark app.
  footBtn: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    width: 44,
    height: 44,
    padding: 0,
    borderRadius: radius.circle,
    // The glass lights under the finger as well as giving, as iOS 26's does.
    backgroundColor: { default: appAppearance.safariBar, ':active': appAppearance.safariBarPress },
    boxShadow: `${shadow.card}, ${shadow.rim}`,
    backdropFilter: appAppearance.safariBarBlur,
    WebkitBackdropFilter: appAppearance.safariBarBlur,
    // A dead back button keeps its glass and greys only the chevron, as iOS does.
    color: { default: app.fg, ':disabled': app.label3 },
    pointerEvents: 'auto',
    opacity: 1,
    ...PRESS,
    transitionProperty: 'opacity, transform, background-color'
  },
  footBtnOff: { opacity: 0, transform: 'scale(.4)', pointerEvents: 'none' },
  url: {
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    gap: 6,
    minHeight: 44,
    paddingTop: 5,
    paddingRight: 8,
    paddingBottom: 5,
    paddingLeft: 8,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.safariBar,
    boxShadow: `${shadow.card}, ${shadow.rim}`,
    backdropFilter: appAppearance.safariBarBlur,
    WebkitBackdropFilter: appAppearance.safariBarBlur,
    color: app.fg,
    pointerEvents: 'auto',
    // The type and the height come down on the compositor, through a scale about
    // the bottom edge. The width cannot: a scale that took the pill down to a
    // host name would take the name with it. So the box narrows too, and the
    // buttons inside it collapse, which is the one thing here that relayouts.
    maxWidth: '100%',
    overflow: 'hidden',
    transformOrigin: 'bottom center',
    transform: 'translateY(0) scale(1)',
    willChange: 'transform',
    transitionProperty: 'transform, max-width',
    transitionDuration: { default: '.45s', '@media (prefers-reduced-motion: reduce)': '0s' },
    // The scale may spring past its mark; the width may not, or the pill dips
    // narrower than the name it is shrinking around and the type hits the edge.
    transitionTimingFunction: `${easing.spring}, ${easing.push}`
  },
  // Safari's compact bar is the host and nothing else. On the phone it is the
  // full pill at 72%, 32 pt tall with 13 pt type, sunk to sit just above the
  // home indicator, and only as wide as the name plus 18 pt either side.
  urlCompact: (width: number) => ({ transform: 'translateY(10px) scale(.72)', maxWidth: width }),
  // The buttons give up their box as well as their ink, so the pill closes over
  // the gap instead of holding two empty squares either side of the name.
  urlSideOff: { width: 0, paddingRight: 0, paddingLeft: 0, opacity: 0, transform: 'scale(.4)', pointerEvents: 'none' },
  // The page menu's glyph at the leading end, the reload arrow at the trailing.
  urlSide: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    width: 28,
    height: 28,
    paddingTop: 3,
    paddingRight: 3,
    paddingBottom: 3,
    paddingLeft: 3,
    opacity: { default: 1, ':focus-visible': 0.55 },
    ...PRESS,
    transitionProperty: 'opacity, transform, width, padding',
    // Only the glyph's scale springs; the box keeps push, or its width overshoots
    // and shoves the address sideways as the pill opens.
    transitionTimingFunction: {
      default: `${easing.push}, ${easing.spring}, ${easing.push}`,
      ':active': easing.out
    }
  },
  // No field inside the pill: the address sits straight on the glass.
  input: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingTop: 0,
    paddingRight: 8,
    paddingBottom: 0,
    paddingLeft: 8,
    backgroundColor: 'transparent',
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    textAlign: 'center',
    textOverflow: 'ellipsis',
    color: app.fg,
    outline: 0,
    '::placeholder': { color: app.label2 }
  },
  // The cover's pill shares its width with the camera column, which leaves the
  // host about 80 px: 17 px type truncates even localhost:3001 there.
  inputRail: {
    paddingRight: 0,
    paddingLeft: 0,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  // The tab overview, iOS 26's: live page cards on dark ground under the kit's
  // dark theme, a glass close dot top-right of each, the open one ringed when
  // there is more than one to tell it from.
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
    backgroundColor: app.surface
  },
  card: { position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 },
  cardPick: {
    display: 'block',
    padding: 0,
    aspectRatio: '3 / 4',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    ...PRESS,
    transitionProperty: 'transform'
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
    right: 6,
    display: 'grid',
    placeItems: 'center',
    width: 24,
    height: 24,
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.safariBar,
    backdropFilter: appAppearance.safariBarBlur,
    WebkitBackdropFilter: appAppearance.safariBarBlur,
    color: app.fg,
    ...PRESS,
    transitionProperty: 'transform'
  },
  cardName: {
    paddingTop: 6,
    textAlign: 'center',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: app.fg
  },
  // An empty private list is a page of its own, as on the phone.
  privateEmpty: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeContent: 'center',
    gap: 6,
    paddingInline: 32,
    textAlign: 'center',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  privateTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.fg
  },
  // In the overview the address bar's row holds a new tab button, the Private
  // and Tabs segments on one glass track, and a blue Done. The track's auto
  // margins hold the two buttons out at the ends.
  tabSegs: {
    display: 'flex',
    marginRight: 'auto',
    marginLeft: 'auto',
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.safariBar,
    boxShadow: `${shadow.card}, ${shadow.rim}`,
    backdropFilter: appAppearance.safariBarBlur,
    WebkitBackdropFilter: appAppearance.safariBarBlur,
    pointerEvents: 'auto'
  },
  tabSeg: {
    height: 38,
    // 12 either side keeps 17 px type inside the cover's row up to 99 tabs.
    paddingInline: 12,
    borderRadius: radius.pill,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap',
    color: app.label2,
    ...PRESS,
    transitionProperty: 'transform, background-color, color'
  },
  tabSegOn: { backgroundColor: app.fill, color: app.fg },
  done: { backgroundColor: colors.blue, color: colors.white },
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
    ...PRESS,
    transitionProperty: 'transform, opacity'
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
