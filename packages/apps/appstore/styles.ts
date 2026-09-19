import { app, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const EASE = 'cubic-bezier(.22,.9,.26,1)'

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
    borderRadius: 12,
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
    fontSize: 15,
    fontFamily: 'inherit',
    '::placeholder': { color: colors.grey }
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    borderRadius: 15,
    fontSize: 13,
    fontWeight: 600,
    color: app.fg,
    backgroundColor: app.fill,
    cursor: 'pointer'
  },
  chipOn: { color: colors.white, backgroundColor: app.fg },
  chipN: { fontSize: 11, fontWeight: 600, opacity: 0.6, fontVariantNumeric: 'tabular-nums' },
  /** Apps / Updates, a compact segment. */
  seg: {
    display: 'inline-flex',
    paddingTop: 2,
    paddingRight: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    borderRadius: 11,
    backgroundColor: app.fill
  },
  segBtn: {
    minWidth: 110,
    paddingTop: 5,
    paddingRight: 14,
    paddingBottom: 5,
    paddingLeft: 14,
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 600,
    color: app.fg,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.2s'
  },
  segOn: { backgroundColor: app.surface, boxShadow: '0 1px 4px rgba(0,0,0,.12)' },
  banner: {
    marginRight: 16,
    marginBottom: 14,
    marginLeft: 16,
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,159,10,.16)',
    color: colors.grey2,
    fontSize: 12,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  bannerDev: { backgroundColor: 'rgba(0,122,255,.1)', color: colors.blue },
  /** The Today card. */
  hero: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    marginRight: 16,
    marginBottom: 28,
    marginLeft: 16,
    borderRadius: 22,
    overflow: 'hidden',
    color: colors.white,
    textAlign: 'left',
    boxShadow: '0 14px 36px rgba(0,0,0,.2)',
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
    backgroundImage: 'linear-gradient(180deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,.1) 45%,rgba(0,0,0,.5) 100%)',
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
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85
  },
  heroName: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: -0.6,
    textShadow: '0 2px 12px rgba(0,0,0,.25)'
  },
  heroBlurb: { fontSize: 15, lineHeight: 1.4, opacity: 0.92, maxWidth: 420 },
  heroBig: {
    width: 128,
    height: 128,
    borderRadius: 30,
    fontSize: 48,
    flexShrink: 0,
    boxShadow: '0 18px 40px rgba(0,0,0,.35)',
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
    backgroundColor: 'rgba(0,0,0,.26)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)'
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    fontSize: 18,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,.3)'
  },
  heroInfo: { flexGrow: 1, minWidth: 0 },
  heroTitle: { fontSize: 15, fontWeight: 600 },
  heroSub: { fontSize: 12, opacity: 0.8 },
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
  hTitle: { fontSize: 22, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.15 },
  hBlurb: { fontSize: 13, color: colors.grey, marginTop: 2 },
  hCount: { fontSize: 13, fontWeight: 500, color: colors.grey, whiteSpace: 'nowrap', paddingBottom: 3 },
  /** Columns of rows that page sideways and snap. */
  rail: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    paddingRight: 16,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x mandatory',
    scrollPaddingLeft: 16,
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch'
  },
  page: {
    flexShrink: 0,
    width: 'calc(100% - 44px)',
    scrollSnapAlign: 'start',
    display: 'flex',
    flexDirection: 'column'
  },
  pageWide: { width: 'calc(50% - 23px)' },
  pageFirst: { marginLeft: 16 },
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
    fontSize: 12,
    color: colors.grey2
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 14,
    flexShrink: 0,
    objectFit: 'cover',
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: 26,
    fontWeight: 700,
    boxShadow: '0 1px 3px rgba(0,0,0,.12)'
  },
  iconArt: (image: string) => ({ backgroundImage: image }),
  info: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: app.fg,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sub: { fontSize: 12, color: colors.grey, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  perms: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: colors.grey,
    marginTop: 2,
    fontSize: 11,
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
    borderRadius: 6,
    backgroundColor: app.fill,
    color: colors.grey2,
    fontSize: 10,
    fontWeight: 600
  },
  tagDev: { backgroundColor: colors.orange, color: colors.white },
  tagOfficial: { backgroundColor: 'rgba(52,199,89,.14)', color: colors.green },
  action: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 72 },
  /** GET / OPEN capsule. */
  pill: {
    minWidth: 72,
    paddingTop: 6,
    paddingRight: 14,
    paddingBottom: 6,
    paddingLeft: 14,
    borderRadius: 15,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: colors.blue,
    backgroundColor: app.fill,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, color',
    transitionDuration: '.15s, .2s, .2s',
    transitionTimingFunction: EASE,
    transform: { default: 'scale(1)', ':active': 'scale(.92)' }
  },
  pillFilled: { backgroundColor: colors.blue, color: colors.white },
  pillLight: { backgroundColor: 'rgba(255,255,255,.25)', color: colors.white },
  plain: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: 'transparent'
  },
  /** Download ring. */
  ring: (turn: number) => ({
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundImage: `conic-gradient(${colors.blue} ${turn}turn, ${app.fill} 0)`,
    display: 'grid',
    placeItems: 'center',
    transitionProperty: 'background-image',
    transitionDuration: '.2s'
  }),
  ringHole: { width: 18, height: 18, borderRadius: 9, backgroundColor: app.surface },
  ringStop: { position: 'absolute', width: 8, height: 8, borderRadius: 1.5, backgroundColor: colors.blue },
  pct: { fontSize: 10, color: colors.grey, fontVariantNumeric: 'tabular-nums' },
  /** Inline notices. */
  alert: { color: colors.red, fontSize: 12, lineHeight: 1.35 },
  note: { color: colors.grey2, fontSize: 12, lineHeight: 1.35 },
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
  dIcon: { width: 118, height: 118, borderRadius: 28, fontSize: 44, boxShadow: '0 10px 28px rgba(0,0,0,.18)' },
  dInfo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 118 },
  dName: { fontSize: 24, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.15 },
  dAuthor: { fontSize: 14, color: colors.grey, marginTop: 2 },
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
  factK: { fontSize: 10, fontWeight: 600, letterSpacing: 0.6, color: colors.grey, textTransform: 'uppercase' },
  factV: { fontSize: 17, fontWeight: 600, color: colors.grey2, display: 'flex', alignItems: 'center', gap: 5 },
  factS: { fontSize: 11, color: colors.grey },
  para: { paddingRight: 16, paddingLeft: 16, marginBottom: 18, fontSize: 14, lineHeight: 1.45, color: app.fg },
  permGlyph: {
    width: 30,
    height: 30,
    borderRadius: 7,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    backgroundColor: colors.blue,
    flexShrink: 0
  },
  permText: { fontSize: 15 },
  /** Developer section: a card, since the shelf's own background is the same white as its rows. */
  card: { boxShadow: '0 0 0 1px rgba(0,0,0,.06), 0 6px 20px rgba(0,0,0,.06)' },
  form: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingTop: 12, paddingBottom: 12 },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: 10,
    backgroundColor: app.fill,
    color: colors.grey
  },
  footnote: {
    paddingRight: 32,
    paddingLeft: 32,
    marginTop: -10,
    marginBottom: 24,
    fontSize: 12,
    lineHeight: 1.4,
    color: colors.grey,
    textAlign: 'center'
  },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 40 },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontFamily: 'inherit',
    textAlign: 'left',
    cursor: 'pointer'
  },
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  remove: { color: colors.red, fontSize: 15, fontWeight: 500, cursor: 'pointer', width: '100%' },
  link: { cursor: 'pointer', width: '100%', textAlign: 'left', color: app.fg, fontSize: 15 },
  glyphGreen: { backgroundColor: colors.green },
  noTop: { paddingTop: 0, marginTop: 0 }
})
