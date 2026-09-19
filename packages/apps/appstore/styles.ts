import { app, appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  /** Header: large title left, source chip and refresh right. */
  top: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
    paddingRight: 16,
    paddingBottom: 6,
    paddingLeft: 16
  },
  topRight: { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    maxWidth: 150,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingTop: 4,
    paddingRight: 9,
    paddingBottom: 4,
    paddingLeft: 9,
    borderRadius: appAppearance.appstoreRadius10,
    fontSize: appAppearance.appstoreFontSize11,
    fontWeight: appAppearance.appstoreFontWeight600,
    color: colors.grey2,
    backgroundColor: colors.fill
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: appAppearance.appstoreRadius3,
    backgroundColor: colors.green,
    flexShrink: 0
  },
  chipDev: { backgroundColor: colors.orange, color: colors.white },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: appAppearance.appstoreRadius16,
    display: 'grid',
    placeItems: 'center',
    color: colors.blue,
    backgroundColor: colors.fill,
    cursor: 'pointer'
  },
  /** Search field. */
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginRight: 16,
    marginBottom: 14,
    marginLeft: 16,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
    borderRadius: appAppearance.appstoreRadius10,
    backgroundColor: colors.fill,
    color: colors.grey
  },
  searchInput: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 'none',
    backgroundColor: 'transparent',
    color: app.fg,
    fontSize: appAppearance.appstoreFontSize16,
    fontFamily: appAppearance.appstoreInheritedFontFamily,
    '::placeholder': { color: colors.grey }
  },
  /** Segmented control. */
  seg: {
    display: 'flex',
    marginRight: 16,
    marginBottom: 14,
    marginLeft: 16,
    paddingTop: 2,
    paddingRight: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    borderRadius: appAppearance.appstoreRadius9,
    backgroundColor: colors.fill
  },
  segBtn: {
    flexGrow: 1,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: appAppearance.appstoreRadius7,
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight600,
    color: app.fg,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.2s'
  },
  segOn: { backgroundColor: colors.white, boxShadow: appAppearance.appstoreSegmentShadow },
  /** Featured card. */
  hero: {
    display: 'block',
    width: 'calc(100% - 32px)',
    marginRight: 16,
    marginBottom: 24,
    marginLeft: 16,
    borderRadius: appAppearance.appstoreRadius18,
    overflow: 'hidden',
    color: colors.white,
    textAlign: 'left',
    boxShadow: appAppearance.appstoreHeroShadow,
    cursor: 'pointer',
    position: 'relative'
  },
  heroArt: (image: string) => ({ backgroundImage: image }),
  heroTop: {
    minHeight: 168,
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  kicker: {
    fontSize: appAppearance.appstoreFontSize11,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: 1.1,
    opacity: 0.85,
    textTransform: 'uppercase'
  },
  heroName: {
    fontSize: appAppearance.appstoreFontSize26,
    fontWeight: appAppearance.appstoreFontWeight800,
    lineHeight: 1.1,
    letterSpacing: -0.4,
    marginTop: 6
  },
  heroBlurb: { fontSize: appAppearance.appstoreFontSize14, opacity: 0.9, marginTop: 4 },
  heroBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    backgroundColor: appAppearance.appstoreHeroBarBackground,
    backdropFilter: 'blur(18px)'
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: appAppearance.appstoreRadius10,
    flexShrink: 0,
    boxShadow: appAppearance.appstoreHeroIconShadow
  },
  heroInfo: { flexGrow: 1, minWidth: 0 },
  heroTitle: { fontSize: appAppearance.appstoreFontSize15, fontWeight: appAppearance.appstoreFontWeight600 },
  heroSub: { fontSize: appAppearance.appstoreFontSize12, opacity: 0.8 },
  /** Section heading. */
  h: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingRight: 16,
    paddingLeft: 16,
    marginBottom: 8,
    fontSize: appAppearance.appstoreFontSize20,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: -0.3
  },
  hCount: {
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight500,
    color: colors.grey
  },
  /** App row. */
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 12,
    backgroundColor: colors.white,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: colors.separator,
    textAlign: 'left',
    width: '100%',
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '.2s',
    ':active': { backgroundColor: colors.groupedLight }
  },
  itemTail: {
    paddingTop: 0,
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 86,
    backgroundColor: colors.white,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: colors.separator,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: appAppearance.appstoreFontSize12,
    color: colors.grey2
  },
  icon: {
    width: 62,
    height: 62,
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
    fontSize: appAppearance.appstoreFontSize16,
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
    gap: 6,
    color: colors.grey,
    marginTop: 2,
    fontSize: appAppearance.appstoreFontSize11
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    paddingTop: 1,
    paddingRight: 6,
    paddingBottom: 1,
    paddingLeft: 6,
    borderRadius: appAppearance.appstoreRadius6,
    backgroundColor: colors.fill,
    color: colors.grey2,
    fontSize: appAppearance.appstoreFontSize10,
    fontWeight: appAppearance.appstoreFontWeight600
  },
  tagDev: { backgroundColor: colors.orange, color: colors.white },
  action: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 72 },
  /** GET / OPEN capsule. */
  pill: {
    minWidth: 72,
    paddingTop: 6,
    paddingRight: 14,
    paddingBottom: 6,
    paddingLeft: 14,
    borderRadius: appAppearance.appstoreRadius15,
    fontSize: appAppearance.appstoreFontSize14,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: 0.2,
    color: colors.blue,
    backgroundColor: colors.fill,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: '.15s, .2s, .2s',
    transform: { default: 'scale(1)', ':active': 'scale(.92)' }
  },
  pillFilled: { backgroundColor: colors.blue, color: colors.white },
  pillRed: { color: colors.red },
  plain: {
    color: colors.blue,
    fontSize: appAppearance.appstoreFontSize13,
    fontWeight: appAppearance.appstoreFontWeight600,
    cursor: 'pointer',
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: 'transparent'
  },
  plainRed: { color: colors.red },
  /** Download ring. */
  ring: (turn: number) => ({
    width: 28,
    height: 28,
    borderRadius: appAppearance.appstoreRadius14,
    backgroundImage: `conic-gradient(${colors.blue} ${turn}turn, ${colors.fill} 0)`,
    display: 'grid',
    placeItems: 'center',
    transitionProperty: 'background-image',
    transitionDuration: '.2s'
  }),
  ringHole: { width: 18, height: 18, borderRadius: appAppearance.appstoreRadius9, backgroundColor: colors.white },
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
  banner: {
    marginRight: 16,
    marginBottom: 14,
    marginLeft: 16,
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 12,
    borderRadius: appAppearance.appstoreRadius10,
    backgroundColor: appAppearance.appstoreBannerBackground,
    color: colors.grey2,
    fontSize: appAppearance.appstoreFontSize12,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  /** Detail page. */
  dHead: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 18,
    paddingLeft: 16
  },
  dIcon: {
    width: 112,
    height: 112,
    borderRadius: appAppearance.appstoreRadius26,
    fontSize: appAppearance.appstoreFontSize44,
    boxShadow: appAppearance.appstoreDetailIconShadow
  },
  dInfo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 112 },
  dName: {
    fontSize: appAppearance.appstoreFontSize22,
    fontWeight: appAppearance.appstoreFontWeight700,
    letterSpacing: -0.3,
    lineHeight: 1.15
  },
  dAuthor: { fontSize: appAppearance.appstoreFontSize14, color: colors.grey, marginTop: 2 },
  dActions: { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10 },
  facts: {
    display: 'flex',
    marginRight: 16,
    marginBottom: 20,
    marginLeft: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopStyle: 'solid',
    borderBottomStyle: 'solid',
    borderTopColor: colors.separator,
    borderBottomColor: colors.separator,
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
    borderRightColor: colors.separator,
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
  permRow: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 11, paddingBottom: 11 },
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
  /** Developer section. */
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
    backgroundColor: colors.groupedLight,
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
  grow: { flexGrow: 1 },
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
  heroBtn: { width: '100%', color: 'inherit', textAlign: 'left', alignItems: 'flex-start' },
  pillLight: { backgroundColor: appAppearance.appstorePillLightBackground, color: colors.white },
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
  glyphGreen: { backgroundColor: colors.green },
  noTop: { paddingTop: 0, marginTop: 0 }
})
