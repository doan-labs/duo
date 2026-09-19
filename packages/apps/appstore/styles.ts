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
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  /** Header: title, search and Refresh on one line; the search wraps under the title on the cover. */
  top: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    paddingRight: 16,
    paddingBottom: 8,
    paddingLeft: 16
  },
  title: { paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, marginRight: 'auto' },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flexGrow: 1,
    flexBasis: 220,
    maxWidth: 360,
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
    borderRadius: radius.lg,
    backgroundColor: app.fill,
    color: colors.grey
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
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    color: colors.blue,
    backgroundColor: app.fill,
    cursor: 'pointer'
  },
  iconBtnDev: { backgroundColor: colors.orange, color: colors.white },
  /** The filter line: Apps / Updates, then the lane chips. */
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingRight: 16,
    paddingLeft: 16,
    marginBottom: 16
  },
  chips: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    paddingRight: 11,
    paddingBottom: 6,
    paddingLeft: 12,
    borderRadius: radius.pill,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.fg,
    backgroundColor: app.fill,
    cursor: 'pointer'
  },
  chipOn: { color: colors.white, backgroundColor: app.fg },
  chipN: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    opacity: 0.6,
    fontVariantNumeric: 'tabular-nums'
  },
  /** Apps / Updates, a compact segment. */
  seg: {
    display: 'inline-flex',
    paddingTop: 2,
    paddingRight: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    borderRadius: radius.lg,
    backgroundColor: app.fill
  },
  segBtn: {
    minWidth: 110,
    paddingTop: 5,
    paddingRight: 14,
    paddingBottom: 5,
    paddingLeft: 14,
    borderRadius: radius.md,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.fg,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.2s'
  },
  segOn: { backgroundColor: app.surface, boxShadow: shadow.card },
  banner: {
    marginRight: 16,
    marginBottom: 14,
    marginLeft: 16,
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
  /** The Today card. */
  hero: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    marginRight: 16,
    marginBottom: 28,
    marginLeft: 16,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    color: colors.white,
    textAlign: 'left',
    boxShadow: shadow.float,
    cursor: 'pointer',
    // The blurred icon behind is a texture; a transform on this box keeps it clipped to the corners.
    transform: 'translateZ(0)'
  },
  heroArt: (image: string) => ({ backgroundImage: image }),
  /** The icon, blown up and blurred, is the card's artwork: its own palette, every time. */
  heroBlur: {
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
  heroShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: appAppearance.appstoreHeroShade,
    pointerEvents: 'none'
  },
  heroTop: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 20,
    width: '100%',
    minHeight: 176,
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 18,
    paddingLeft: 20,
    color: 'inherit'
  },
  heroTopWide: { minHeight: 212 },
  heroText: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  kicker: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    fontWeight: weight.bold,
    // The widest tracking on the scale: this line is uppercase and needs the air.
    letterSpacing: tracking.largeTitle,
    textTransform: 'uppercase',
    opacity: 0.85
  },
  heroName: {
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    textShadow: shadow.text
  },
  heroBlurb: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    opacity: 0.92,
    maxWidth: 420
  },
  heroBig: {
    width: 128,
    height: 128,
    borderRadius: radius.xxl,
    fontSize: typeScale.display,
    lineHeight: 1,
    flexShrink: 0,
    boxShadow: shadow.float,
    transform: 'rotate(-4deg)'
  },
  heroBar: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    backgroundColor: appAppearance.appstoreHeroBar,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    flexShrink: 0,
    boxShadow: shadow.card
  },
  heroInfo: { flexGrow: 1, minWidth: 0 },
  heroTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  heroSub: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    opacity: 0.8
  },
  /** A lane. */
  group: { marginBottom: 26 },
  h: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingRight: 16,
    paddingLeft: 16,
    marginBottom: 10
  },
  hTitle: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold
  },
  hBlurb: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: colors.grey,
    marginTop: 2
  },
  hCount: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    color: colors.grey,
    whiteSpace: 'nowrap',
    paddingBottom: 3
  },
  /** The lane's rows; two columns across when the box is wide. */
  grid: { display: 'grid', gridTemplateColumns: '1fr', columnGap: 28, paddingRight: 16, paddingLeft: 16 },
  gridWide: { gridTemplateColumns: '1fr 1fr' },
  /** App row. */
  item: {
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 9,
    paddingBottom: 9,
    textAlign: 'left'
  },
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
    color: colors.grey,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  perms: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: colors.grey,
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
  tagOfficial: { backgroundColor: appAppearance.appstoreOfficial, color: colors.green },
  action: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 72 },
  /** GET / OPEN capsule. */
  pill: {
    minWidth: 72,
    paddingTop: 6,
    paddingRight: 14,
    paddingBottom: 6,
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
  /** Download ring. */
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
  ringStop: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.blue
  },
  pct: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: colors.grey,
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
  /** Detail page. */
  dHead: {
    display: 'flex',
    gap: 18,
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 20,
    paddingLeft: 16
  },
  dIcon: {
    width: 118,
    height: 118,
    borderRadius: radius.xxl,
    fontSize: typeScale.display,
    lineHeight: 1,
    boxShadow: shadow.float
  },
  dInfo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 118 },
  dName: {
    fontSize: typeScale.title1,
    lineHeight: leading.title1,
    letterSpacing: tracking.title1,
    fontWeight: weight.bold
  },
  dAuthor: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: colors.grey,
    marginTop: 2
  },
  dActions: { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10 },
  facts: {
    display: 'flex',
    marginRight: 16,
    marginBottom: 22,
    marginLeft: 16,
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
    minWidth: 96,
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
    color: colors.grey,
    textTransform: 'uppercase'
  },
  factV: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
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
    color: colors.grey
  },
  para: {
    paddingRight: 16,
    paddingLeft: 16,
    marginBottom: 18,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.fg
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
  permText: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  /** Developer section: a card, since the shelf's own background is the same white as its rows. */
  card: { boxShadow: shadow.card },
  form: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingTop: 12, paddingBottom: 12 },
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
    color: colors.grey
  },
  footnote: {
    paddingRight: 32,
    paddingLeft: 32,
    marginTop: -10,
    marginBottom: 24,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: colors.grey,
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
  linkBlue: { color: colors.blue },
  glyphGreen: { backgroundColor: colors.green },
  noTop: { paddingTop: 0, marginTop: 0 }
})
