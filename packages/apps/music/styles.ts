import {
  app,
  appAppearance,
  easing,
  fonts,
  glass,
  layout,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// The Now Playing sheet's ride: the app's bottom edge, up on open and back
// down on close. App-scoped keyframes — a StyleX keyframe is resolved where it
// is written, so it lives with the styles that animate it.
const rise = stylex.keyframes({
  from: { transform: 'translateY(104%)' },
  to: { transform: 'translateY(0)' }
})
const drop = stylex.keyframes({
  from: { transform: 'translateY(0)' },
  to: { transform: 'translateY(104%)' }
})
// The art breathing out when playback pauses: the shrink the sheet's cover does.
const artIn = stylex.keyframes({
  from: { transform: 'scale(.94)', opacity: 0.6 },
  to: { transform: 'scale(1)', opacity: 1 }
})

export const styles = stylex.create({
  /**
   * The whole app. Sidebar, tab bar, search circle, mini player and the sheet
   * all float over the pane rather than taking strips out of it, so the pane
   * runs the full box and they read as panels resting on it.
   */
  shell: { position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, minWidth: 0 },
  shellWide: { flexDirection: 'row' },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  /**
   * Room for the panels that float over the edges. Wide pads left for the
   * sidebar; the cover pads bottom for the tab bar, and again for the mini
   * player once a track is up, so the last row clears both.
   */
  paneSide: { paddingLeft: 202 },
  paneScroll: { paddingBottom: 78 },
  paneScrollMini: { paddingBottom: 146 },
  /** Its own stacking context, so a pushed page slides over the shelves but under the floating chrome. */
  paneRoot: { isolation: 'isolate' },
  /**
   * A pushed page fills the pane and slides under the floating sidebar, so its
   * header's left controls would land under the glass. On the wide box the
   * page's body pads past the sidebar — the pane's own clearance — while the
   * artwork still runs the full width behind it.
   */
  pgPush: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  pgPushSide: { paddingLeft: 202 },
  top: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
    paddingRight: 18,
    paddingBottom: 4,
    paddingLeft: 18
  },

  /** A button drawn flat: the browser's chrome off, the look supplied by the caller. */
  bare: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    cursor: 'pointer'
  },

  // The floating sidebar, on the wide box only.

  /**
   * The panel runs up under the app's 40 px status reserve and stops 8 px from
   * the glass, the same clearance the App Store's sidebar keeps. The dark tint
   * is the glass recipe's own, so the panel stays legible over artwork.
   */
  side: {
    position: 'absolute',
    zIndex: 2,
    top: -32,
    bottom: 8,
    left: 8,
    width: 186,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 24,
    paddingRight: 8,
    paddingBottom: 12,
    paddingLeft: 8,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  sideSec: {
    paddingTop: 14,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 10,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label3
  },
  sideRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    cursor: 'pointer'
  },
  /** The selected section marks itself in the app's accent, not the system link blue. */
  sideRowOn: { backgroundColor: app.fill, color: appAppearance.musicAccent, fontWeight: weight.semibold },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  // The cover's floating chrome: the four-tab bar and the search circle beside it.

  tabs: {
    position: 'absolute',
    zIndex: 2,
    // Room for the search circle: the bar ends 10 px before it starts.
    right: 68,
    bottom: 26,
    left: 10,
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
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
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  tabOn: { color: appAppearance.musicAccent },
  searchOrb: {
    position: 'absolute',
    zIndex: 2,
    right: 10,
    bottom: 26,
    width: 46,
    height: 46,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.float,
    color: app.label2,
    cursor: 'pointer'
  },

  // The mini player.

  /**
   * The capsule floats over the pane's bottom edge on the cover, clearing the
   * tab bar, and parks at the pane's bottom-right on the wide box — the top
   * corners there belong to the status stack and the sidebar.
   */
  mini: {
    position: 'absolute',
    zIndex: 2,
    right: 10,
    bottom: 84,
    left: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 7,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 8,
    borderRadius: radius.xl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    color: app.fg,
    cursor: 'pointer',
    overflow: 'hidden'
  },
  miniWide: { right: 12, bottom: 12, left: 'auto', width: 296 },
  miniFace: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left'
  },
  miniArt: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    objectFit: 'cover',
    boxShadow: shadow.card,
    flexShrink: 0
  },
  miniMain: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
  miniName: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniBtn: { color: app.fg, padding: 4 },
  miniTrk: {
    position: 'absolute',
    right: 12,
    bottom: 4,
    left: 58,
    pointerEvents: 'none',
    height: 2,
    borderRadius: radius.xs,
    backgroundColor: appAppearance.musicFill,
    overflow: 'hidden'
  },
  miniFill: { display: 'block', height: '100%', backgroundColor: appAppearance.musicLabel, borderRadius: radius.xs },
  miniW: (width: string) => ({ width }),

  // The search field.

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
  searchTop: { marginRight: 18, marginBottom: 6, marginLeft: 18 },

  // Shelves and tiles.

  shelf: { marginTop: 6 },
  shelfHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingRight: 18,
    paddingBottom: 6,
    paddingLeft: 18
  },
  shelfTitle: {
    margin: 0,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.fg
  },
  shelfMore: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: appAppearance.musicAccent,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    cursor: 'pointer'
  },
  shelfRow: {
    display: 'flex',
    gap: 12,
    paddingRight: 18,
    paddingLeft: 18,
    overflowX: 'auto',
    scrollbarWidth: 'none'
  },
  /** A tile is a button-shaped column; `tileBig` is Top Picks' larger card. */
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 4,
    width: 148,
    flexShrink: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer'
  },
  tileBig: { width: 172 },
  tileArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    objectFit: 'cover',
    display: 'block',
    boxShadow: shadow.card
  },
  tileName: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  tileSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  /** The 2x2 a mix, station or artist shows when it has no single cover. */
  collage: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    boxShadow: shadow.card
  },
  collageImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },

  // Song rows.

  songWrap: { display: 'flex', flexDirection: 'column', paddingTop: 2, paddingBottom: 4 },
  song: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 7,
    paddingRight: 18,
    paddingBottom: 7,
    paddingLeft: 18,
    borderWidth: 0,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.musicHairline,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer'
  },
  /** The track number column doubles as the equalizer's place while it is the live one. */
  songIx: {
    width: 24,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: app.label2,
    fontSize: typeScale.footnote,
    fontVariantNumeric: 'tabular-nums'
  },
  songArt: { width: 42, height: 42, borderRadius: radius.sm, objectFit: 'cover', flexShrink: 0, overflow: 'hidden' },
  songMain: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
  songName: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  songLive: { color: appAppearance.musicAccent },
  songSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  songTime: {
    flexShrink: 0,
    color: app.label3,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontVariantNumeric: 'tabular-nums'
  },
  /** The publisher's own explicit mark, drawn as the small lozenge it ships as. */
  exp: {
    fontStyle: 'normal',
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    marginLeft: 6,
    paddingTop: 1,
    paddingRight: 5,
    paddingBottom: 1,
    paddingLeft: 5,
    borderRadius: radius.xs,
    backgroundColor: app.fill,
    color: app.label2
  },

  // The Play / Shuffle pair.

  pills: { display: 'flex', gap: 10, width: '100%', maxWidth: 340 },
  pill: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: app.fill,
    color: appAppearance.musicAccent,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },

  // A release's page head.

  alh: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 10,
    paddingLeft: 18
  },
  alhArt: {
    width: 'min(58%,232px)',
    aspectRatio: 1,
    borderRadius: radius.xl,
    objectFit: 'cover',
    boxShadow: shadow.float
  },
  alhCollage: { width: 'min(58%,200px)' },
  alhTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.fg,
    textAlign: 'center'
  },
  alhArtist: { color: appAppearance.musicAccent, fontSize: typeScale.subheadline },
  alhMeta: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    textTransform: 'uppercase'
  },
  tracks: { display: 'flex', flexDirection: 'column' },
  alhFoot: {
    paddingTop: 12,
    paddingRight: 18,
    paddingBottom: 8,
    paddingLeft: 18,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label3
  },

  // The featured card on New and the live card on Radio.

  heroWrap: { paddingTop: 4, paddingRight: 18, paddingBottom: 8, paddingLeft: 18 },
  hero: {
    position: 'relative',
    display: 'block',
    width: '100%',
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: app.surface,
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: shadow.card
  },
  heroImg: { display: 'block', width: '100%', aspectRatio: 1.6, objectFit: 'cover' },
  heroShade: {
    position: 'absolute',
    inset: 0,
    backgroundImage: appAppearance.musicShade
  },
  heroText: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    left: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  heroKicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label3,
    textTransform: 'uppercase'
  },
  heroTitle: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold,
    color: app.fg,
    textShadow: shadow.text
  },
  heroSub: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  heroChip: {
    alignSelf: 'flex-start',
    paddingTop: 3,
    paddingRight: 8,
    paddingBottom: 3,
    paddingLeft: 8,
    borderRadius: radius.sm,
    backgroundColor: appAppearance.musicAccent,
    color: app.fg,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    textTransform: 'uppercase'
  },
  /** Radio's live card: a surface row — the station's collage, its name and a play circle. */
  liveCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 12,
    borderWidth: 0,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: shadow.card
  },
  liveArt: { width: 84, flexShrink: 0 },
  liveMain: { display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 },
  liveTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.fg
  },
  liveGo: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.circle,
    backgroundColor: app.fill,
    color: app.fg,
    flexShrink: 0
  },

  // Browse-category tiles on Search.

  catGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 10,
    paddingTop: 2,
    paddingRight: 18,
    paddingBottom: 8,
    paddingLeft: 18
  },
  catTile: {
    position: 'relative',
    aspectRatio: 2,
    borderWidth: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer'
  },
  /** A category's colour is art(), the fixture's own gradient, so it is not a literal hue. */
  catBg: (image: string) => ({ backgroundImage: image }),
  catShade: { position: 'absolute', inset: 0, backgroundImage: appAppearance.musicShade },
  catName: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    color: appAppearance.musicLabel
  },

  // The album grid and the search result card.

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 14,
    paddingTop: 4,
    paddingRight: 18,
    paddingBottom: 8,
    paddingLeft: 18
  },
  topCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginRight: 18,
    marginBottom: 4,
    marginLeft: 18,
    padding: 12,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: shadow.card
  },
  topArt: { width: 72, height: 72, borderRadius: radius.sm, objectFit: 'cover', flexShrink: 0, overflow: 'hidden' },
  topName: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.fg
  },
  center: { paddingTop: 40 },
  libList: {
    display: 'flex',
    flexDirection: 'column',
    marginRight: 18,
    marginBottom: 4,
    marginLeft: 18,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    overflow: 'hidden'
  },
  libRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 10,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.musicHairline,
    backgroundColor: 'transparent',
    color: app.label2,
    fontFamily: fonts.system,
    cursor: 'pointer'
  },
  /** The list glyph's square: the accent's soft fill behind the accent mark. */
  libIc: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: appAppearance.musicAccentSoft,
    color: appAppearance.musicAccent,
    flexShrink: 0
  },
  libLabel: {
    flexGrow: 1,
    minWidth: 0,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    textAlign: 'left'
  },

  // Now Playing.

  /**
   * The sheet covers the app chrome and all — sidebar, tabs, mini player —
   * the way iOS pulls Now Playing over the app that owns it. The dark tint is
   * the glass recipe's own; the slide is the app's bottom edge.
   */
  np: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 44,
    paddingRight: 22,
    paddingBottom: 14,
    paddingLeft: 22,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    color: app.fg,
    animationName: rise,
    animationDuration: '.38s',
    animationTimingFunction: easing.push
  },
  npDown: { animationName: drop, animationTimingFunction: easing.inOut, animationFillMode: 'forwards' },
  npTop: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: 22 },
  npClose: { position: 'absolute', left: 14, top: 44, color: app.label2, padding: 4 },
  npFrom: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label3,
    textTransform: 'uppercase',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  /**
   * The face's middle: stacked on the cover, split on the inner display, where
   * the column cannot afford the art's height — iPad Now Playing puts the
   * artwork beside the controls for the same reason.
   */
  npBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0
  },
  npBodyWide: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  npRight: { display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1, minWidth: 0 },
  /** The artwork shrinks a step while paused, as the sheet's own does. */
  npArt: {
    height: 'min(48%,240px)',
    aspectRatio: 1,
    width: 'auto',
    maxWidth: 'min(56%,250px)',
    /**
     * Shrinks rather than overflowing the column: a short sheet (the cover's)
     * still has to clear the controls and footer below the art.
     */
    flexShrink: 1,
    minHeight: 128,
    marginTop: 2,
    marginRight: 'auto',
    marginBottom: 2,
    marginLeft: 'auto',
    borderRadius: radius.lg,
    objectFit: 'cover',
    boxShadow: shadow.float,
    animationName: artIn,
    animationDuration: '.34s',
    animationTimingFunction: easing.pop,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.push
  },
  npArtWide: { height: 'min(64%,240px)', marginRight: 0, marginLeft: 0 },
  npArtRest: { transform: 'scale(.92)', opacity: 0.85 },
  npMeta: { display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, minWidth: 0 },
  npTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  npSub: {
    alignSelf: 'flex-start',
    color: appAppearance.musicAccent,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  npScrub: { flexShrink: 0 },
  npTimes: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 4,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label3,
    fontVariantNumeric: 'tabular-nums'
  },
  npTrans: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    paddingTop: 2,
    paddingBottom: 2
  },
  npModeBtn: { position: 'relative', color: app.label2, padding: 6, display: 'flex', alignItems: 'center' },
  npModeOn: { color: appAppearance.musicAccent },
  /** The dot an on-state mode button carries under it. */
  npDot: {
    position: 'absolute',
    left: '50%',
    bottom: -2,
    width: 4,
    height: 4,
    marginLeft: -2,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.musicAccent
  },
  npSkip: { color: app.fg, padding: 8 },
  npPlay: { color: app.fg, padding: 6 },
  npVol: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, color: app.label3, paddingTop: 2 },
  npVolBar: { flexGrow: 1 },
  npFoot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    paddingTop: 6
  },
  npFootBtn: { color: app.label2, padding: 6, display: 'flex', alignItems: 'center' },
  npDim: { opacity: 0.4 },

  // The queue half of the sheet.

  npQueue: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  npQueueHead: {
    flexShrink: 0,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    color: app.fg,
    paddingBottom: 6
  },
  npQueueList: { flexGrow: 1, minHeight: 0, overflowY: 'auto', marginRight: -12, paddingRight: 4 },
  qRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 4,
    paddingLeft: 0,
    borderWidth: 0,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.musicHairline,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer'
  },
  qRowNow: { cursor: 'default' },
  /** The equalizer's slot, kept empty on queued rows so the column lines up. */
  qEq: { width: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', color: appAppearance.musicAccent },
  qArt: { width: 36, height: 36, borderRadius: radius.xs, objectFit: 'cover', flexShrink: 0 },
  qMain: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  qName: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    color: app.fg,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  qLive: { color: appAppearance.musicAccent },
  qSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  // The credits half of the sheet.

  cred: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 1,
    minHeight: 0,
    textAlign: 'center'
  },
  credArt: {
    width: 128,
    height: 128,
    borderRadius: radius.lg,
    objectFit: 'cover',
    boxShadow: shadow.float,
    marginBottom: 4
  },
  credTitle: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold,
    color: app.fg
  },
  credLine: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2
  },
  credDim: { color: app.label3, fontSize: typeScale.caption1 },
  credPlay: { marginTop: 10, paddingRight: 18, paddingLeft: 18 },

  // The scrubber and the equalizer.

  scrub: { width: '100%', paddingTop: 6, paddingBottom: 6, cursor: 'pointer' },
  scrubTrk: {
    display: 'block',
    height: 5,
    borderRadius: radius.xs,
    backgroundColor: appAppearance.musicFill,
    overflow: 'hidden'
  },
  scrubFill: {
    display: 'block',
    height: '100%',
    backgroundColor: appAppearance.musicFillStrong,
    borderRadius: radius.xs
  },
  scrubW: (width: number) => ({ width: `${width}%` }),
  eq: { display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 16 },
  eqH: (size: number) => ({ height: size }),
  bar: {
    width: 2.5,
    backgroundColor: 'currentColor',
    borderRadius: radius.xs,
    transitionProperty: 'height',
    transitionDuration: '.12s',
    transitionTimingFunction: easing.linear
  },
  barH: (height: string) => ({ height })
})
