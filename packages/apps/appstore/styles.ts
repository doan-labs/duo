import { app, appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    borderRadius: appAppearance.appstoreRadius12,
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
    fontSize: appAppearance.appstoreFontSize15,
    fontFamily: appAppearance.appstoreInheritedFontFamily,
    '::placeholder': { color: colors.grey }
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: appAppearance.appstoreRadius17,
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
    borderRadius: appAppearance.appstoreRadius15,
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight600,
    color: app.fg,
    backgroundColor: app.fill,
    cursor: 'pointer'
  },
  chipOn: { color: colors.white, backgroundColor: app.fg },
  chipN: {
    fontSize: appAppearance.appstoreFontSize11,
    fontWeight: appAppearance.appstoreFontWeight600,
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
    borderRadius: appAppearance.appstoreRadius11,
    backgroundColor: app.fill
  },
  segBtn: {
    minWidth: 110,
    paddingTop: 5,
    paddingRight: 14,
    paddingBottom: 5,
    paddingLeft: 14,
    borderRadius: appAppearance.appstoreRadius9,
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight600,
    color: app.fg,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.2s'
  },
  segOn: { backgroundColor: app.surface, boxShadow: appAppearance.appstoreSegmentShadow },
  banner: {
    marginRight: 16,
    marginBottom: 14,
    marginLeft: 16,
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 12,
    borderRadius: appAppearance.appstoreRadius12,
    backgroundColor: appAppearance.appstoreBannerBackground,
    color: colors.grey2,
    fontSize: appAppearance.appstoreFontSize12,
    fontWeight: appAppearance.appstoreFontWeight500,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  bannerDev: { backgroundColor: appAppearance.appstoreBannerDevBackground, color: colors.blue },
  /** The Today card. */
  hero: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    marginRight: 16,
    marginBottom: 28,
    marginLeft: 16,
    borderRadius: appAppearance.appstoreRadius22,
    overflow: 'hidden',
    color: colors.white,
    textAlign: 'left',
    boxShadow: appAppearance.appstoreHeroShadow,
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
    fontSize: appAppearance.appstoreFontSize11,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85
  },
  heroName: {
    fontSize: appAppearance.appstoreFontSize32,
    fontWeight: appAppearance.appstoreFontWeight800,
    lineHeight: 1.05,
    letterSpacing: -0.6,
    textShadow: appAppearance.appstoreHeroTextShadow
  },
  heroBlurb: { fontSize: appAppearance.appstoreFontSize15, lineHeight: 1.4, opacity: 0.92, maxWidth: 420 },
  heroBig: {
    width: 128,
    height: 128,
    borderRadius: appAppearance.appstoreRadius30,
    fontSize: appAppearance.appstoreFontSize48,
    flexShrink: 0,
    boxShadow: appAppearance.appstoreHeroBigShadow,
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
    backgroundColor: appAppearance.appstoreHeroBarBackground,
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)'
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: appAppearance.appstoreRadius10,
    fontSize: appAppearance.appstoreFontSize18,
    flexShrink: 0,
    boxShadow: appAppearance.appstoreHeroIconShadow
  },
  heroInfo: { flexGrow: 1, minWidth: 0 },
  heroTitle: { fontSize: appAppearance.appstoreFontSize15, fontWeight: appAppearance.appstoreFontWeight600 },
  heroSub: { fontSize: appAppearance.appstoreFontSize12, opacity: 0.8 },
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
    fontSize: appAppearance.appstoreFontSize22,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: -0.4,
    lineHeight: 1.15
  },
  hBlurb: { fontSize: appAppearance.appstoreFontSize13, color: colors.grey, marginTop: 2 },
  hCount: {
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight500,
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
    fontSize: appAppearance.appstoreFontSize12,
    color: colors.grey2
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: appAppearance.appstoreRadius14,
    flexShrink: 0,
    objectFit: 'cover',
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: appAppearance.appstoreFontSize26,
    fontWeight: appAppearance.appstoreFontWeight700,
    boxShadow: appAppearance.appstoreIconShadow
  },
  iconArt: (image: string) => ({ backgroundImage: image }),
  info: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  name: {
    fontSize: appAppearance.appstoreFontSize15,
    fontWeight: appAppearance.appstoreFontWeight600,
    color: app.fg,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sub: {
    fontSize: appAppearance.appstoreFontSize12,
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
    fontSize: appAppearance.appstoreFontSize11,
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
    borderRadius: appAppearance.appstoreRadius6,
    backgroundColor: app.fill,
    color: colors.grey2,
    fontSize: appAppearance.appstoreFontSize10,
    fontWeight: appAppearance.appstoreFontWeight600
  },
  tagDev: { backgroundColor: colors.orange, color: colors.white },
  tagOfficial: { backgroundColor: appAppearance.appstoreOfficialBackground, color: colors.green },
  action: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 72 },
  /** GET / OPEN capsule. */
  pill: {
    minWidth: 72,
    paddingTop: 6,
    paddingRight: 14,
    paddingBottom: 6,
    paddingLeft: 14,
    borderRadius: appAppearance.appstoreRadius15,
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: 0.2,
    color: colors.blue,
    backgroundColor: app.fill,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: '.15s, .2s, .2s',
    transitionTimingFunction: appAppearance.appstoreEase,
    transform: { default: 'scale(1)', ':active': 'scale(.92)' }
  },
  pillFilled: { backgroundColor: colors.blue, color: colors.white },
  pillLight: { backgroundColor: appAppearance.appstorePillLightBackground, color: colors.white },
  /** Download ring. */
  ring: (turn: number) => ({
    width: 28,
    height: 28,
    borderRadius: appAppearance.appstoreRadius14,
    backgroundImage: `conic-gradient(${colors.blue} ${turn}turn, ${app.fill} 0)`,
    display: 'grid',
    placeItems: 'center',
    transitionProperty: 'background-image',
    transitionDuration: '.2s'
  }),
  ringHole: { width: 18, height: 18, borderRadius: appAppearance.appstoreRadius9, backgroundColor: app.surface },
  ringStop: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: appAppearance.appstoreRadius1_5,
    backgroundColor: colors.blue
  },
  pct: { fontSize: appAppearance.appstoreFontSize10, color: colors.grey, fontVariantNumeric: 'tabular-nums' },
  /** Inline notices. */
  alert: { color: colors.red, fontSize: appAppearance.appstoreFontSize12, lineHeight: 1.35 },
  note: { color: colors.grey2, fontSize: appAppearance.appstoreFontSize12, lineHeight: 1.35 },
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
    borderRadius: appAppearance.appstoreRadius28,
    fontSize: appAppearance.appstoreFontSize44,
    boxShadow: appAppearance.appstoreDetailIconShadow
  },
  dInfo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 118 },
  dName: {
    fontSize: appAppearance.appstoreFontSize24,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: -0.4,
    lineHeight: 1.15
  },
  dAuthor: { fontSize: appAppearance.appstoreFontSize14, color: colors.grey, marginTop: 2 },
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
    fontSize: appAppearance.appstoreFontSize10,
    fontWeight: appAppearance.appstoreFontWeight600,
    letterSpacing: 0.6,
    color: colors.grey,
    textTransform: 'uppercase'
  },
  factV: {
    fontSize: appAppearance.appstoreFontSize17,
    fontWeight: appAppearance.appstoreFontWeight600,
    color: colors.grey2,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  factS: { fontSize: appAppearance.appstoreFontSize11, color: colors.grey },
  para: {
    paddingRight: 16,
    paddingLeft: 16,
    marginBottom: 18,
    fontSize: appAppearance.appstoreFontSize14,
    lineHeight: 1.45,
    color: app.fg
  },
  permGlyph: {
    width: 30,
    height: 30,
    borderRadius: appAppearance.appstoreRadius7,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    backgroundColor: colors.blue,
    flexShrink: 0
  },
  permText: { fontSize: appAppearance.appstoreFontSize15 },
  /** Developer section: a card, since the shelf's own background is the same white as its rows. */
  card: { boxShadow: appAppearance.appstoreCardShadow },
  form: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingTop: 12, paddingBottom: 12 },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: appAppearance.appstoreRadius10,
    backgroundColor: app.fill,
    color: colors.grey
  },
  footnote: {
    paddingRight: 32,
    paddingLeft: 32,
    marginTop: -10,
    marginBottom: 24,
    fontSize: appAppearance.appstoreFontSize12,
    lineHeight: 1.4,
    color: colors.grey,
    textAlign: 'center'
  },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 40 },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: appAppearance.appstoreRadius9,
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
    fontFamily: appAppearance.appstoreInheritedFontFamily,
    textAlign: 'left',
    cursor: 'pointer'
  },
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  remove: {
    color: colors.red,
    fontSize: appAppearance.appstoreFontSize15,
    fontWeight: appAppearance.appstoreFontWeight500,
    cursor: 'pointer',
    width: '100%'
  },
  link: {
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    color: app.fg,
    fontSize: appAppearance.appstoreFontSize15
  },
  linkBlue: { color: colors.blue },
  glyphGreen: { backgroundColor: colors.green },
  noTop: { paddingTop: 0, marginTop: 0 }
})
