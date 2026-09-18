import { appAppearance, colors, easing, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Apple's light map furniture: translucent panels over the tiles, controls in a
// glass stack down the right edge, and pins that carry their own label instead
// of a callout. Every surface is the same material — the sidebar and the card
// only differ in how opaque they are.
const glass = 'blur(30px) saturate(180%)'
/** Panel geometry the map also needs, to centre on what the panels leave visible. */
export const ASIDE = 202
export const CARD = 246
export const SHEET = 0.54
/** The shell's status stack runs over the map; every panel starts below it. */
const STATUS = 40
const grow = stylex.keyframes({ from: { opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' } })
const slide = stylex.keyframes({ from: { opacity: 0, transform: 'translateX(-12px)' } })
const raise = stylex.keyframes({ from: { transform: 'translateY(100%)' } })
const motion = '@media (prefers-reduced-motion: reduce)'

export const styles = stylex.create({
  root: {
    position: 'relative',
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: appAppearance.mapsLand,
    color: colors.black,
    fontFamily: fonts.system,
    fontSize: appAppearance.musicFontSize6,
    lineHeight: 1.3,
    userSelect: 'none'
  },

  // ---------- the map itself ----------

  surface: { position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none', cursor: 'grab' },
  dragging: { cursor: 'grabbing' },
  tile: { position: 'absolute', width: 256, height: 256, pointerEvents: 'none' },
  at: (x: number, y: number) => ({ left: x, top: y }),
  /** Map chrome, boxed into what the status stack, the panels and the sheet leave over. */
  chrome: { position: 'absolute', top: STATUS, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  pad: (left: number, bottom: number) => ({ left, bottom }),

  pin: {
    position: 'absolute',
    display: 'grid',
    placeItems: 'center',
    width: 21,
    height: 21,
    transform: 'translate(-50%,-50%)',
    borderRadius: appAppearance.weatherBorderRadius,
    color: colors.white,
    boxShadow: appAppearance.mapsPinShadow,
    cursor: 'pointer',
    animationName: { default: grow, [motion]: 'none' },
    animationDuration: '.2s'
  },
  marker: {
    width: 38,
    height: 38,
    borderRadius: appAppearance.mapsBorderRadius,
    boxShadow: appAppearance.mapsMarkerShadow,
    zIndex: 2,
    animationName: { default: grow, [motion]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.bounce
  },
  pinLabel: {
    position: 'absolute',
    top: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    fontSize: appAppearance.calendarFontSize4,
    fontWeight: appAppearance.musicFontWeight3,
    color: colors.black,
    textShadow: appAppearance.mapsLabelShadow,
    pointerEvents: 'none'
  },
  markerLabel: { top: 42, fontSize: appAppearance.calendarFontSize2, fontWeight: appAppearance.musicFontWeight2 },
  /** Imagery is dark, so labels and the scale flip to white on a dark halo. */
  onDark: { color: colors.white, textShadow: appAppearance.mapsLabelShadowDark },
  ruleDark: { borderColor: colors.white, opacity: 0.9 },
  transit: { backgroundColor: colors.blue },
  rail: { backgroundColor: colors.blue },
  medical: { backgroundColor: colors.pink },
  food: { backgroundColor: colors.orange },
  cafe: { backgroundColor: appAppearance.mapsBrown },
  shop: { backgroundColor: colors.orange },
  park: { backgroundColor: colors.green },
  museum: { backgroundColor: appAppearance.mapsBrown },
  cinema: { backgroundColor: colors.purple },
  landmark: { backgroundColor: colors.teal },
  address: { backgroundColor: colors.grey2 },

  me: {
    position: 'absolute',
    width: 13,
    height: 13,
    transform: 'translate(-50%,-50%)',
    borderRadius: appAppearance.weatherBorderRadius,
    backgroundColor: colors.blueBright,
    boxShadow: appAppearance.mapsDotShadow,
    pointerEvents: 'none',
    zIndex: 1
  },

  // ---------- map controls ----------

  controls: {
    position: 'absolute',
    top: 10,
    right: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    pointerEvents: 'auto'
  },
  /** Bare glass button; `alone` rounds it, a `stack` rounds a pair of them together. */
  control: {
    display: 'grid',
    placeItems: 'center',
    width: 28,
    height: 28,
    backgroundColor: { default: appAppearance.mapsControl, ':hover': colors.white },
    backdropFilter: glass,
    WebkitBackdropFilter: glass,
    color: appAppearance.appstoreColor,
    cursor: 'pointer',
    transitionProperty: 'background-color, transform',
    transitionDuration: '.15s',
    transform: { default: 'scale(1)', ':active': 'scale(.92)' }
  },
  alone: { borderRadius: appAppearance.musicBorderRadius4, boxShadow: appAppearance.mapsControlShadow },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: appAppearance.musicBorderRadius4,
    boxShadow: appAppearance.mapsControlShadow,
    overflow: 'hidden'
  },
  divider: { height: 1, backgroundColor: appAppearance.mapsHairline },
  on: { color: colors.blue },
  menu: {
    position: 'absolute',
    top: 44,
    right: 44,
    minWidth: 130,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: appAppearance.itunesBorderRadius,
    backgroundColor: appAppearance.mapsCard,
    backdropFilter: glass,
    WebkitBackdropFilter: glass,
    boxShadow: appAppearance.mapsShadow,
    pointerEvents: 'auto',
    zIndex: 3
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingInline: 10,
    paddingBlock: 6,
    fontSize: appAppearance.musicFontSize6,
    color: colors.black,
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.mapsHover }
  },
  check: { marginLeft: 'auto', color: colors.blue },

  scale: {
    position: 'absolute',
    top: 12,
    left: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: appAppearance.calendarFontSize4,
    color: appAppearance.appstoreColor,
    textShadow: appAppearance.mapsLabelShadow
  },
  ticks: { display: 'flex', justifyContent: 'space-between' },
  bar: (width: number) => ({ width }),
  rule: {
    height: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderStyle: 'solid',
    borderColor: appAppearance.appstoreColor,
    opacity: 0.55
  },
  legal: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    paddingInline: 5,
    paddingBlock: 2,
    borderRadius: appAppearance.musicBorderRadius2,
    fontSize: appAppearance.calendarFontSize4,
    color: colors.grey2,
    backgroundColor: appAppearance.mapsControl
  },

  // ---------- panels ----------

  /** Brings the sidebar back once it is hidden; sits where its toggle was. */
  reveal: { position: 'absolute', top: STATUS + 10, left: 10, zIndex: 2 },
  aside: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: ASIDE,
    flexShrink: 0,
    // Full height like the Mac's sidebar; only the content clears the status stack.
    paddingTop: STATUS,
    backgroundColor: appAppearance.mapsPanel,
    backdropFilter: glass,
    WebkitBackdropFilter: glass,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.mapsHairline
  },
  card: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: CARD,
    flexShrink: 0,
    paddingTop: STATUS,
    backgroundColor: appAppearance.mapsCard,
    backdropFilter: glass,
    WebkitBackdropFilter: glass,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.mapsHairline,
    boxShadow: appAppearance.mapsShadow,
    overflow: 'hidden',
    animationName: { default: slide, [motion]: 'none' },
    animationDuration: '.28s',
    animationTimingFunction: easing.pop
  },
  /** Folded: one sheet at the bottom holds whichever panel is showing. */
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '54%',
    borderTopLeftRadius: appAppearance.musicBorderRadius,
    borderTopRightRadius: appAppearance.musicBorderRadius,
    backgroundColor: appAppearance.mapsPanel,
    backdropFilter: glass,
    WebkitBackdropFilter: glass,
    boxShadow: appAppearance.mapsShadow,
    animationName: { default: raise, [motion]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.push
  },
  grab: {
    width: 36,
    height: 5,
    marginInline: 'auto',
    marginTop: 6,
    marginBottom: 2,
    flexShrink: 0,
    borderRadius: appAppearance.weatherBorderRadius,
    backgroundColor: colors.grey3
  },
  scroll: { flexGrow: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' },

  // ---------- sidebar ----------

  top: { display: 'flex', alignItems: 'center', gap: 6, paddingInline: 10, paddingTop: 10, paddingBottom: 8 },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexGrow: 1,
    minWidth: 0,
    height: 26,
    paddingInline: 7,
    borderRadius: appAppearance.musicBorderRadius4,
    backgroundColor: appAppearance.mapsField,
    color: colors.grey
  },
  input: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.black,
    fontSize: appAppearance.musicFontSize6,
    fontFamily: fonts.system,
    '::placeholder': { color: colors.grey }
  },
  ghost: {
    display: 'grid',
    placeItems: 'center',
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: appAppearance.musicBorderRadius4,
    color: colors.grey2,
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.mapsHover }
  },
  section: {
    paddingInline: 14,
    paddingTop: 10,
    paddingBottom: 3,
    fontSize: appAppearance.musicFontSize3,
    fontWeight: appAppearance.musicFontWeight2,
    color: colors.grey
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: 'calc(100% - 12px)',
    marginInline: 6,
    paddingInline: 8,
    paddingBlock: 6,
    borderRadius: appAppearance.musicBorderRadius4,
    color: colors.black,
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':hover': appAppearance.mapsHover }
  },
  rowOn: { backgroundColor: appAppearance.mapsSelected },
  badge: {
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: appAppearance.settingsBorderRadius,
    color: colors.white
  },
  lines: { minWidth: 0, display: 'flex', flexDirection: 'column' },
  clip: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  note: { fontSize: appAppearance.musicFontSize3, color: colors.grey },
  link: {
    display: 'block',
    marginInline: 14,
    marginTop: 4,
    marginBottom: 8,
    fontSize: appAppearance.musicFontSize6,
    color: colors.blue,
    textAlign: 'left',
    cursor: 'pointer'
  },
  empty: { paddingInline: 14, paddingTop: 16, fontSize: appAppearance.musicFontSize6, color: colors.grey },

  // ---------- place card ----------

  cardTop: { display: 'flex', alignItems: 'center', paddingInline: 10, paddingTop: 10 },
  cardClose: { marginLeft: 'auto' },
  round: {
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: { default: appAppearance.mapsField, ':hover': appAppearance.mapsHover },
    color: appAppearance.appstoreColor,
    cursor: 'pointer'
  },
  title: {
    paddingInline: 14,
    paddingTop: 6,
    fontSize: appAppearance.messagesFontSize,
    fontWeight: appAppearance.musicFontWeight,
    lineHeight: 1.15
  },
  kind: { paddingInline: 14, paddingTop: 2, fontSize: appAppearance.calendarFontSize2, color: colors.grey },
  go: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    marginInline: 14,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: appAppearance.weatherBorderRadius,
    backgroundColor: { default: colors.blueBright, ':hover': colors.blue },
    color: colors.white,
    fontSize: appAppearance.musicFontSize,
    fontWeight: appAppearance.musicFontWeight2,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.15s',
    transform: { default: 'scale(1)', ':active': 'scale(.97)' }
  },
  hdr: {
    display: 'flex',
    alignItems: 'baseline',
    paddingInline: 14,
    paddingBottom: 6,
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight
  },
  detail: {
    display: 'flex',
    gap: 10,
    paddingInline: 14,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.mapsHairline
  },
  label: { width: 52, flexShrink: 0, color: colors.grey2 },
  value: { minWidth: 0, display: 'flex', flexDirection: 'column', wordBreak: 'break-word' },
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 'calc(100% - 28px)',
    marginInline: 14,
    marginTop: 10,
    paddingInline: 10,
    paddingBlock: 8,
    borderRadius: appAppearance.musicBorderRadius4,
    backgroundColor: { default: appAppearance.mapsField, ':hover': appAppearance.mapsHover },
    color: colors.black,
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight3,
    textAlign: 'left',
    cursor: 'pointer'
  },
  actionGlyph: { color: colors.blue, display: 'flex' },
  gap: { height: 14 },
  tray: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    flexShrink: 0,
    paddingBlock: 9,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.mapsHairline,
    color: appAppearance.appstoreColor
  },
  starred: { color: colors.orange }
})
