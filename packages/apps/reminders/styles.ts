// Reminders' chrome. The wide layout floats a glass sidebar over a page-white
// pane; the cover pushes the same pages over the Lists overview. Everything
// here is tokens; the only dynamic values are a list's own tint.

import {
  app,
  colors,
  easing,
  fonts,
  glass,
  layout,
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

const popIn = stylex.keyframes({ from: { transform: 'scale(.4)', opacity: 0 } })
const slideSide = stylex.keyframes({ from: { transform: 'translateX(-112%)' } })
const slideSideBack = stylex.keyframes({ to: { transform: 'translateX(-112%)' } })
const dropIn = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(-8px) scale(.98)' } })

export const styles = stylex.create({
  // ---------- shell ----------
  split: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: app.bg
  },
  pane: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: app.surface
  },
  paneSide: { paddingLeft: 266 },
  paneRoot: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0
  },

  // ---------- sidebar ----------
  side: {
    position: 'absolute',
    zIndex: 2,
    top: -32,
    bottom: 8,
    left: 8,
    width: 250,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 26,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    borderRadius: layout.screenInnerPanel,
    backgroundColor: app.glass,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    transform: 'translateX(0)'
  },
  sideOut: {
    transform: 'translateX(-112%)',
    opacity: 0,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.push
  },
  sideIn: {
    animationName: { default: slideSide, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.push
  },
  sideOutAnim: {
    animationName: { default: slideSideBack, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.push,
    animationFillMode: 'forwards'
  },
  sideScroll: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    marginRight: -10,
    marginLeft: -10,
    paddingRight: 10,
    paddingLeft: 10
  },
  sideFind: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    height: 34,
    paddingRight: 12,
    paddingLeft: 12,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    flexShrink: 0
  },
  field: {
    appearance: 'none',
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    outline: { default: 'none', ':focus': 'none' },
    '::placeholder': { color: app.label3 },
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  sideSec: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 14,
    paddingRight: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    color: app.label2
  },
  sideAdd: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    color: app.link,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    cursor: 'pointer'
  },

  // ---------- tiles ----------
  tiles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  tile: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 12,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  tileNum: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    fontVariantNumeric: 'tabular-nums'
  },
  tileName: {
    marginTop: 7,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.medium,
    color: app.label2
  },
  tileOn: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: app.link
  },
  badge: (tint: string, size: number) => ({
    display: 'grid',
    placeItems: 'center',
    width: size,
    height: size,
    borderRadius: radius.circle,
    backgroundColor: tint,
    color: colors.white,
    flexShrink: 0
  }),

  // ---------- My Lists rows ----------
  lrow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 6,
    paddingLeft: 8,
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    textAlign: 'left',
    cursor: 'pointer'
  },
  lrowOn: { backgroundColor: app.fill, color: app.link, fontWeight: weight.semibold },
  lname: { flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lcount: { color: app.label2, fontVariantNumeric: 'tabular-nums' },
  lchev: { display: 'flex', color: app.label3 },
  minus: {
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    marginLeft: -4,
    borderRadius: radius.circle,
    backgroundColor: colors.red,
    color: colors.white,
    flexShrink: 0
  },

  // ---------- tags ----------
  tagWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 2, paddingRight: 6, paddingLeft: 6 },
  tag: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 4,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  tagOn: { backgroundColor: app.fill, color: app.link },

  // ---------- flat buttons ----------
  flat: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    borderRadius: radius.md,
    color: app.link,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    cursor: 'pointer'
  },
  sideFoot: {
    display: 'flex',
    flexShrink: 0,
    paddingRight: 2,
    paddingLeft: 2
  },

  // ---------- pane / list page ----------
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingLeft: space.lg
  },
  headBack: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: -8,
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    cursor: 'pointer'
  },
  headSide: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: space.lg },
  headBtn: {
    display: 'grid',
    placeItems: 'center',
    color: app.link,
    cursor: 'pointer'
  },
  destTitle: (tint: string) => ({
    display: 'block',
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingBottom: 2,
    paddingLeft: space.lg,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold,
    color: tint
  }),
  body: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 90
  },
  secHead: {
    paddingTop: 18,
    paddingRight: space.lg,
    paddingBottom: 5,
    paddingLeft: space.lg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    color: app.fg
  },
  sec: { display: 'flex', flexDirection: 'column' },
  rowsWrap: {
    display: 'grid',
    gridTemplateRows: '1fr',
    transitionProperty: 'grid-template-rows, opacity',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.pop
  },
  rowGone: { gridTemplateRows: '0fr', opacity: 0 },
  rowClip: { overflow: 'hidden', minHeight: 0 },

  // ---------- reminder row ----------
  rrow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 9,
    paddingRight: space.lg,
    paddingLeft: space.lg,
    backgroundColor: app.surface,
    textAlign: 'left',
    color: app.fg,
    transitionProperty: 'opacity, transform',
    transitionDuration: '.35s',
    transitionTimingFunction: easing.pop
  },
  rrowLeave: { opacity: 0, transform: 'translateX(28px)' },
  chk: (tint: string) => ({
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: 24,
    height: 24,
    marginTop: -1,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.grey3,
    color: tint,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'background-color, border-color',
    transitionDuration: '.2s'
  }),
  chkOn: (tint: string) => ({ backgroundColor: tint, borderColor: tint, color: colors.white }),
  tickIn: {
    animationName: { default: popIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.28s',
    animationTimingFunction: easing.spring
  },
  rbody: { display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0, paddingBottom: 9 },
  rline: { display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 },
  rtitle: {
    flexGrow: 1,
    minWidth: 0,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: app.fg,
    textAlign: 'left',
    cursor: 'text',
    transitionProperty: 'opacity',
    transitionDuration: '.2s'
  },
  pri: { fontWeight: weight.semibold, color: app.fg, flexShrink: 0 },
  tagText: { color: app.link },
  rmeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2
  },
  rmetaOver: { color: colors.red },
  rsubs: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: app.link,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    cursor: 'pointer'
  },
  rsub: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 34,
    paddingTop: 5,
    paddingBottom: 2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    color: app.fg
  },
  rflag: { display: 'flex', color: colors.orange, flexShrink: 0 },
  rinfo: {
    display: 'grid',
    placeItems: 'center',
    marginLeft: 'auto',
    color: app.label3,
    cursor: 'pointer',
    flexShrink: 0
  },
  rsep: {
    position: 'absolute',
    left: 50,
    right: 0,
    bottom: 0,
    height: 0,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  rdone: { opacity: 0.45 },
  redit: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    outline: 'none',
    '::placeholder': { color: app.label3 }
  },
  subChk: (tint: string) => ({
    display: 'grid',
    placeItems: 'center',
    width: 18,
    height: 18,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: tint,
    cursor: 'pointer',
    flexShrink: 0
  }),

  // ---------- new reminder / editor ----------
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: space.lg,
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.medium,
    cursor: 'pointer'
  },
  newBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    paddingTop: 6,
    paddingRight: space.lg,
    paddingBottom: 30,
    paddingLeft: space.lg,
    backgroundColor: app.bg,
    pointerEvents: 'none'
  },
  barBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 6,
    paddingLeft: 0,
    color: app.link,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    pointerEvents: 'auto'
  },
  editorTools: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 34,
    paddingBottom: 8
  },
  toolBtn: (on: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 4,
    paddingLeft: 8,
    borderRadius: radius.pill,
    backgroundColor: on ? app.fill : 'transparent',
    color: on ? app.link : app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer'
  }),
  toolWrap: { position: 'relative', display: 'flex' },
  headMenu: { position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 210 },
  toolMenu: { position: 'absolute', top: '100%', left: 0, zIndex: 5, minWidth: 170 },
  toolFlag: { color: colors.orange },
  dateField: {
    appearance: 'none',
    borderWidth: 0,
    borderRadius: radius.sm,
    paddingTop: 2,
    paddingBottom: 2,
    paddingRight: 6,
    paddingLeft: 6,
    backgroundColor: app.fill3,
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    colorScheme: 'inherit',
    outline: 'none'
  },
  menuPos: { position: 'fixed', zIndex: 5 },
  menuAt: (x: number, y: number) => ({ position: 'fixed', left: Math.min(x, 560), top: y, zIndex: 5, minWidth: 190 }),
  clearBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 18,
    height: 18,
    borderRadius: radius.circle,
    color: app.label2,
    cursor: 'pointer'
  },

  // ---------- search ----------
  searchHdr: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.lg,
    paddingLeft: space.lg,
    paddingBottom: space.sm
  },

  // ---------- cover lists page ----------
  listCard: { marginTop: 2, flexShrink: 0, backgroundColor: app.surface },
  listsBody: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 84,
    paddingRight: space.md,
    paddingLeft: space.md,
    gap: 2
  },
  listRowFlat: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingTop: 7,
    paddingRight: 4,
    paddingBottom: 7,
    paddingLeft: 4,
    color: app.fg,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    textAlign: 'left',
    cursor: 'pointer',
    position: 'relative'
  },
  flatSep: {
    position: 'absolute',
    left: 52,
    right: 0,
    bottom: 0,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  empty: { paddingTop: 60, paddingBottom: 60, textAlign: 'center' },
  menuBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    color: app.link,
    cursor: 'pointer'
  },

  // ---------- details ----------
  detHead: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
    paddingTop: space.sm,
    paddingRight: space.md,
    paddingLeft: space.md
  },
  detTitle: {
    flexGrow: 1,
    textAlign: 'center',
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  detDone: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 30,
    height: 30,
    borderRadius: radius.circle,
    backgroundColor: app.fill3,
    color: app.fg,
    fontSize: typeScale.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer'
  },
  detField: {
    appearance: 'none',
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 0,
    paddingLeft: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    outline: 'none',
    '::placeholder': { color: app.label3 }
  },
  detRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingTop: 10,
    paddingRight: space.lg,
    paddingBottom: 10,
    paddingLeft: space.lg,
    backgroundColor: app.surface,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    color: app.fg,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    textAlign: 'left',
    cursor: { default: 'pointer', ':disabled': 'default' }
  },
  detLabel: { flexGrow: 1, minWidth: 0 },
  detValue: { color: app.label2, flexShrink: 0 },
  detTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 9,
    paddingTop: 10,
    paddingRight: space.lg,
    paddingBottom: 10,
    paddingLeft: space.lg,
    backgroundColor: app.surface,
    borderRadius: radius.lg,
    marginTop: 10,
    marginRight: space.lg,
    marginLeft: space.lg
  },
  detIc: (tint: string) => ({
    display: 'grid',
    placeItems: 'center',
    width: 25,
    height: 25,
    borderRadius: radius.sm,
    backgroundColor: tint,
    color: colors.white,
    flexShrink: 0
  }),
  detGroup: { marginTop: 10, marginRight: space.lg, marginLeft: space.lg },
  detTagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
    paddingRight: space.lg,
    paddingBottom: 2,
    paddingLeft: space.lg,
    backgroundColor: app.surface
  },
  detMenu: { position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 180 },
  detSheet: {
    width: 360,
    maxHeight: 'calc(100vh - 60px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  detScroll: { overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: space.md },
  danger: { color: colors.red },
  delRow: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 11,
    paddingBottom: 11,
    backgroundColor: app.surface,
    color: colors.red,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    cursor: 'pointer'
  },

  // ---------- list editor sheet ----------
  sheetPad: { display: 'flex', flexDirection: 'column', gap: space.md, padding: space.lg },
  sheetBadgeRow: { display: 'flex', justifyContent: 'center', paddingTop: 4 },
  sheetHead: { display: 'flex', alignItems: 'center' },
  sheetName: {
    appearance: 'none',
    width: '100%',
    borderWidth: 0,
    borderRadius: radius.md,
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 12,
    backgroundColor: app.fill3,
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    textAlign: 'center',
    fontWeight: weight.medium,
    outline: 'none',
    '::placeholder': { color: app.label3 }
  },
  pickGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, justifyItems: 'center' },
  iconGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, justifyItems: 'center' },
  dot: (tint: string, on: boolean) => ({
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderRadius: radius.circle,
    backgroundColor: tint,
    cursor: 'pointer',
    outlineWidth: on ? 3 : 0,
    outlineStyle: 'solid',
    outlineColor: tint,
    outlineOffset: 2
  }),
  dotCheck: { color: colors.white },
  icBtn: (on: boolean) => ({
    display: 'grid',
    placeItems: 'center',
    width: 40,
    height: 40,
    borderRadius: radius.circle,
    backgroundColor: on ? app.fill : 'transparent',
    color: app.label2,
    cursor: 'pointer'
  }),
  sheetBtns: { display: 'flex', gap: 10 },
  segLabel: {
    paddingBottom: 4,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label2,
    fontWeight: weight.medium
  },
  animIn: {
    animationName: { default: dropIn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop
  }
})
