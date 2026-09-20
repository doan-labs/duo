import {
  app,
  appAppearance,
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

export const styles = stylex.create({
  /**
   * The whole store. The sidebar and the tab bar float over the pane rather than
   * taking a column and a strip out of it, so both read as panels resting on the
   * page, per decision 18's glass: a tint, a rim and a shadow, nothing drawn.
   */
  shell: { position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, minWidth: 0 },
  shellWide: { flexDirection: 'row' },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  /** Room for the panel that floats over this edge. */
  paneSide: { paddingLeft: 202 },
  paneTabs: { paddingBottom: 78 },

  /** Sidebar: search, the sections, and the catalog they all came from. */
  side: {
    position: 'absolute',
    zIndex: 2,
    // The shell reserves the app's top 40 px for the status stack. The panel runs
    // up under it and stops 8 px from the glass: the clock sits on the far right
    // of the inner display, so nothing collides, and the pane keeps its own clearance.
    top: -32,
    bottom: 8,
    left: 8,
    width: 186,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.float
  },
  sideList: { display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, overflowY: 'auto' },
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
  sideRowOn: { backgroundColor: app.fill, color: colors.blue, fontWeight: weight.semibold },
  sideLabel: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sideN: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2,
    fontVariantNumeric: 'tabular-nums'
  },
  sideFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingRight: 4,
    paddingLeft: 4,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator
  },
  sideFootIc: {
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    color: app.label2,
    backgroundColor: app.fill
  },
  sideFootDev: { backgroundColor: colors.orange, color: colors.white },
  sideFootText: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2
  },

  /** The cover's tab bar, floating clear of the home bar's bottom 22 px. */
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
    backgroundColor: app.surface,
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
  tabOn: { color: colors.blue },

  /** Search: in the sidebar when wide, under the title when not. */
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: app.fill,
    color: app.label2
  },
  searchTop: { flexGrow: 1, flexBasis: 200, maxWidth: 340 },
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

  /** Pane header. */
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
  title: { paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, marginRight: 'auto' },

  /** A round toolbar button: Refresh in the sidebar, Share on an app page. */
  round: {
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    color: colors.blue,
    backgroundColor: app.fill,
    cursor: 'pointer'
  },
  roundDev: { backgroundColor: colors.orange, color: colors.white },
  /** Trailing header action on an app page: flat, so it pairs with the kit's back chevron. */
  share: { marginLeft: 'auto', display: 'flex', alignItems: 'center', color: app.link },

  banner: {
    marginRight: 18,
    marginBottom: 14,
    marginLeft: 18,
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 12,
    borderRadius: radius.lg,
    backgroundColor: appAppearance.appstoreBanner,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  bannerDev: { backgroundColor: appAppearance.appstoreBannerDev, color: colors.blue },

  /** Discover: Today cards, the lead across the full width. */
  cards: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 18,
    paddingRight: 18,
    paddingBottom: 10,
    paddingLeft: 18
  },
  cardsWide: { gridTemplateColumns: '1fr 1fr' },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    color: colors.white,
    textAlign: 'left',
    boxShadow: shadow.card,
    // The blurred icon behind is a texture; a transform on this box keeps it clipped to the corners.
    transform: 'translateZ(0)'
  },
  cardLead: { gridColumn: '1 / -1', color: app.fg, backgroundColor: app.surface },
  /** The icon, blown up and blurred, is the card's artwork: its own palette, every time. */
  cardBlur: {
    position: 'absolute',
    top: '-30%',
    right: '-20%',
    bottom: '-30%',
    left: '-20%',
    width: '140%',
    height: '160%',
    objectFit: 'cover',
    filter: 'blur(48px) saturate(120%)',
    opacity: 0.85,
    pointerEvents: 'none'
  },
  cardShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: appAppearance.appstoreHeroShade,
    pointerEvents: 'none'
  },
  cardTop: {
    position: 'relative',
    // Cards in a row stretch to the tallest; the artwork takes the slack so every bar lines up.
    flexGrow: 1,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 20,
    width: '100%',
    minHeight: 152,
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 16,
    paddingLeft: 18,
    color: 'inherit'
  },
  cardTopLead: { minHeight: 196, alignItems: 'center' },
  cardText: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  kicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.bold,
    // The widest tracking on the scale: this line is uppercase and needs the air.
    letterSpacing: tracking.largeTitle,
    textTransform: 'uppercase',
    opacity: 0.8
  },
  cardName: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold
  },
  /** White over the blurred artwork, so it carries its own shadow. */
  cardNameArt: { textShadow: shadow.text },
  cardNameLead: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle
  },
  cardBlurb: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    opacity: 0.9,
    maxWidth: 360
  },
  cardBig: {
    width: 148,
    height: 148,
    borderRadius: radius.xxl,
    fontSize: typeScale.displayLg,
    lineHeight: 1,
    flexShrink: 0,
    boxShadow: shadow.float
  },
  /** On the cover the lead card is one column wide, so its icon gives the name room. */
  cardBigSm: { width: 92, height: 92, borderRadius: radius.xl, fontSize: typeScale.display },
  cardBar: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14
  },
  // No backdrop-filter here. The artwork behind is already a 48 px blur, so it buys
  // nothing, and a filtered child escapes the card's rounded clip: square bottom corners.
  cardBarArt: { backgroundColor: appAppearance.appstoreHeroBar },
  cardBarLead: {
    backgroundColor: app.fill3,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    flexShrink: 0,
    boxShadow: shadow.card
  },
  cardInfo: { flexGrow: 1, minWidth: 0 },
  cardTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  cardSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    opacity: 0.8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  /** A section heading, with the App Store's hairline above it. */
  head: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    marginRight: 18,
    marginBottom: 10,
    marginLeft: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator
  },
  /** The group opening a pane: no hairline under the title, but still air between the two. */
  headFirst: { borderTopWidth: 0, paddingTop: 10 },
  headText: { minWidth: 0 },
  headTitle: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold
  },
  headBlurb: {
    marginTop: 2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  headCount: {
    marginLeft: 'auto',
    textAlign: 'right',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },

  /** A lane's rows; two columns across when the box is wide. */
  group: { marginBottom: 6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr', columnGap: 28, paddingRight: 18, paddingLeft: 18 },
  gridWide: { gridTemplateColumns: '1fr 1fr' },

  /** App row. */
  item: {
    // A grid child sizes to min-content unless told not to, and the capsule would hang off the track.
    minWidth: 0,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  itemRow: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 9, paddingBottom: 9, textAlign: 'left' },
  itemTail: {
    paddingBottom: 10,
    paddingLeft: 72,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    flexShrink: 0,
    objectFit: 'cover',
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    fontWeight: weight.bold,
    boxShadow: shadow.card
  },
  iconArt: (image: string) => ({ backgroundImage: image }),
  info: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  name: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    color: app.fg,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  perms: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 3,
    gap: 5,
    color: app.label2,
    marginTop: 2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    overflow: 'hidden'
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    paddingTop: 1,
    paddingRight: 6,
    paddingBottom: 1,
    paddingLeft: 6,
    borderRadius: radius.sm,
    backgroundColor: app.fill,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  },
  tagDev: { backgroundColor: colors.orange, color: colors.white },

  /** The capsule and what it says about itself, side by side as the App Store has them. */
  action: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  pill: {
    minWidth: 68,
    paddingTop: 5,
    paddingRight: 14,
    paddingBottom: 5,
    paddingLeft: 14,
    borderRadius: radius.pill,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.bold,
    color: colors.blue,
    backgroundColor: app.fill,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: `${motion.pressDuration}, .2s, .2s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  pillFilled: { backgroundColor: colors.blue, color: colors.white },
  pillLight: { backgroundColor: appAppearance.appstorePillLight, color: colors.white },
  ring: (turn: number) => ({
    width: 28,
    height: 28,
    borderRadius: radius.circle,
    backgroundImage: `conic-gradient(${colors.blue} ${turn}turn, ${app.fill} 0)`,
    display: 'grid',
    placeItems: 'center',
    transitionProperty: 'background-image',
    transitionDuration: '.2s'
  }),
  ringHole: { width: 18, height: 18, borderRadius: radius.circle, backgroundColor: app.surface },
  ringStop: { position: 'absolute', width: 8, height: 8, borderRadius: radius.xs, backgroundColor: colors.blue },
  pct: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label2,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums'
  },

  /** Inline notices. */
  alert: {
    color: colors.red,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  note: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },

  /** App page. */
  pHead: {
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    paddingTop: 4,
    paddingRight: 18,
    paddingBottom: 20,
    paddingLeft: 18
  },
  pIcon: {
    width: 112,
    height: 112,
    borderRadius: radius.xxl,
    fontSize: typeScale.display,
    lineHeight: 1,
    boxShadow: shadow.float
  },
  pInfo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  pName: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold
  },
  pAuthor: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  pActions: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12 },

  /** The fact strip over the description: the App Store's ratings row, with what we know. */
  facts: {
    display: 'flex',
    marginRight: 18,
    marginBottom: 18,
    marginLeft: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopStyle: 'solid',
    borderBottomStyle: 'solid',
    borderTopColor: app.separator,
    borderBottomColor: app.separator,
    overflowX: 'auto',
    scrollbarWidth: 'none'
  },
  fact: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 92,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    borderRightWidth: { default: 1, ':last-child': 0 },
    borderRightStyle: 'solid',
    borderRightColor: app.separator,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4
  },
  factK: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.semibold,
    // Uppercase key line: the widest tracking on the scale, as with `kicker`.
    letterSpacing: tracking.largeTitle,
    color: app.label2,
    textTransform: 'uppercase'
  },
  factV: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    color: app.label2,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  factS: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label2
  },
  /** What the App Store calls the compatibility line: one device, both of its displays. */
  compat: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginRight: 18,
    marginBottom: 18,
    marginLeft: 18,
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  about: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 24,
    marginRight: 18,
    marginBottom: 6,
    marginLeft: 18
  },
  blurb: {
    flexGrow: 1,
    flexBasis: 240,
    marginTop: 0,
    marginBottom: 0,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.fg
  },
  links: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  linkName: {
    color: colors.blue,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: colors.blue,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },

  /** App Privacy, the card the App Store puts it in. */
  privacy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginRight: 18,
    marginBottom: 6,
    marginLeft: 18,
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    textAlign: 'center'
  },
  privacyGlyph: { color: colors.blue, display: 'grid', placeItems: 'center' },
  privacyTitle: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  privacyBody: {
    marginTop: 0,
    marginBottom: 0,
    maxWidth: 420,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  privacyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    width: '100%',
    marginTop: 8,
    textAlign: 'left'
  },
  privacyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },

  /** Standfirst under a pane title, where the section has no groups to head. */
  lede: {
    marginTop: -4,
    marginBottom: 16,
    paddingRight: 18,
    paddingLeft: 18,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2
  },
  /** Developer section: a card, since the pane's own background is the same as its rows. */
  card2: {
    boxShadow: shadow.card,
    borderRadius: radius.xl,
    marginRight: 18,
    marginLeft: 18,
    // A form stretched across the inner display is a form with nothing in it.
    maxWidth: 520
  },
  form: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingTop: 12, paddingBottom: 12 },
  formActions: { display: 'flex', alignItems: 'center', gap: 12 },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: radius.md,
    backgroundColor: app.fill,
    color: app.label2
  },
  permGlyph: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    backgroundColor: colors.blue,
    flexShrink: 0
  },
  permText: { fontSize: typeScale.subheadline, lineHeight: leading.subheadline, letterSpacing: tracking.subheadline },
  glyphGreen: { backgroundColor: colors.green },

  para: {
    paddingRight: 18,
    paddingLeft: 18,
    marginBottom: 18,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.fg
  },
  footnote: {
    paddingRight: 32,
    paddingLeft: 32,
    marginTop: space.lg,
    marginBottom: space.xl,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: app.label2,
    textAlign: 'center'
  },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 40 },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.grey3,
    borderTopColor: colors.blue
  },
  /** Buttons that only carry layout: no chrome of their own. */
  bare: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    color: 'inherit',
    fontFamily: fonts.system,
    textAlign: 'left',
    cursor: 'pointer'
  },
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  remove: {
    color: colors.red,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    cursor: 'pointer',
    width: '100%'
  },
  link: {
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  linkBlue: { color: colors.blue }
})
