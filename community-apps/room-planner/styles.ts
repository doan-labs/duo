import {
  app,
  colors,
  easing,
  fonts,
  glass,
  leading,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const reduce = '@media (prefers-reduced-motion: reduce)'

// Furniture hues: the catalogue indexes into this palette; fills stay soft so
// walls, labels and flags always outrank them on the plan.
export const HUES = [
  colors.indigo,
  colors.teal,
  colors.orange,
  colors.purple,
  colors.blue,
  colors.brown,
  colors.green,
  colors.pink
]
export const HUES_DARK = [
  colors.indigoDark,
  colors.tealDark,
  colors.orangeDark,
  colors.purpleDark,
  colors.blueDark,
  colors.brownDark,
  colors.greenDark,
  colors.pinkDark
]

const itemIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.7' },
  '70%': { opacity: 1, scale: '1.05' },
  '100%': { opacity: 1, scale: '1' }
})
const trayIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px' },
  '100%': { opacity: 1, translate: '0 0' }
})
const gapIn = stylex.keyframes({ '0%': { opacity: 0 }, '100%': { opacity: 1 } })

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.lg,
    // The home bar owns the bottom 22 px; chrome clears it.
    paddingBottom: space.xxxl,
    paddingInline: space.lg,
    color: app.fg,
    backgroundColor: app.bg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline
  },
  // The home bar owns the bottom 22 px on the cover too; the tray clears it.
  rootCover: { gap: space.sm, paddingTop: space.sm, paddingInline: space.sm, paddingBottom: space.xxxl },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexShrink: 0 },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.bold,
    letterSpacing: tracking.title2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  roomLine: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontVariantNumeric: 'tabular-nums'
  },
  headerSide: { display: 'flex', alignItems: 'center', gap: space.xxs, flexShrink: 0 },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    color: app.label2,
    backgroundColor: app.fill,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums'
  },
  chipWarn: { color: colors.red, backgroundColor: `color-mix(in srgb, ${colors.red} 14%, transparent)` },
  iconBtn: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: 32,
    height: 32,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': app.fill },
    color: app.fg,
    cursor: 'pointer',
    flexShrink: 0,
    ':disabled': { opacity: '.35', cursor: 'default' },
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  // The mute button's slash: drawn, not a second icon.
  muteSlash: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    transform: 'rotate(-45deg)'
  },
  stage: { flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: space.md },
  // The drafting table: a quiet well under the plan. Grid rides the pan
  // through background-position so the paper never floats over the desk.
  canvas: {
    position: 'relative',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: `color-mix(in srgb, ${app.fg} 5%, ${app.bg})`,
    boxShadow: shadow.rim,
    touchAction: 'none',
    cursor: 'grab'
  },
  canvasPanning: { cursor: 'grabbing' },
  world: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 },
  worldAt: (x: number, y: number, zoom: number) => ({ transform: `translate(${x}px,${y}px) scale(${zoom})` }),
  // The floor: a filled slab whose border is the wall line, walls drawn 8 cm
  // thick inside world units so they scale with the plan.
  floor: {
    position: 'absolute',
    backgroundColor: app.elevated,
    boxShadow: shadow.card,
    borderRadius: radius.xs
  },
  floorAt: (w: number, d: number) => ({
    width: w,
    height: d,
    borderWidth: 8,
    borderStyle: 'solid'
  }),
  floorGrid: (step: number) => ({
    backgroundImage: `linear-gradient(color-mix(in srgb, ${app.fg} 8%, transparent) 1px, transparent 1px),linear-gradient(90deg, color-mix(in srgb, ${app.fg} 8%, transparent) 1px, transparent 1px),linear-gradient(color-mix(in srgb, ${app.fg} 14%, transparent) 1px, transparent 1px),linear-gradient(90deg, color-mix(in srgb, ${app.fg} 14%, transparent) 1px, transparent 1px)`,
    backgroundSize: `${step}px ${step}px,${step}px ${step}px,100px 100px,100px 100px`
  }),
  wallColor: { borderColor: `color-mix(in srgb, ${app.fg} 62%, transparent)` },
  // Room dimension callouts float outside the walls; counter-scaled in
  // markup so they stay readable at every zoom.
  dimTop: {
    position: 'absolute',
    left: '50%',
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    borderRadius: radius.pill,
    color: app.label2,
    backgroundColor: `color-mix(in srgb, ${app.bg} 82%, transparent)`,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  },
  item: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    padding: 0,
    borderRadius: radius.xs,
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
    transitionProperty: { default: 'left,top,width,height,box-shadow,outline-color', [reduce]: 'none' },
    transitionDuration: '.22s',
    transitionTimingFunction: easing.spring,
    animationName: { default: itemIn, [reduce]: 'none' },
    animationDuration: '.26s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both',
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 2 }
  },
  itemDrag: { transitionProperty: 'none' },
  // Runtime-positioned pieces: values arrive as px strings via StyleX vars.
  itemAt: (l: number, t: number, w: number, h: number) => ({
    left: `${l}px`,
    top: `${t}px`,
    width: `${w}px`,
    height: `${h}px`
  }),
  calloutAt: (l: number, t: number, tf: string, origin: string) => ({
    left: `${l}px`,
    top: `${t}px`,
    transform: tf,
    transformOrigin: origin
  }),
  swatchAt: (hue: string) => ({ backgroundColor: hue }),
  flipIcon: { display: 'inline-flex', transform: 'scaleX(-1)' },
  contents: { display: 'contents' },
  itemFill: (hue: string) => ({
    backgroundColor: `color-mix(in srgb, ${hue} 30%, ${app.elevated})`,
    outlineWidth: 1.5,
    outlineStyle: 'solid',
    outlineColor: `color-mix(in srgb, ${hue} 75%, transparent)`
  }),
  // Layering: rugs draw under everything, the selection on top, flags above all.
  itemRug: { outlineStyle: 'dashed', opacity: 0.85 },
  zRug: { zIndex: 0 },
  zMid: { zIndex: 1 },
  zSel: { zIndex: 3, boxShadow: shadow.float, outlineWidth: 2.5 },
  zFlag: { zIndex: 4 },
  itemBad: {
    outlineWidth: 2.5,
    outlineColor: `color-mix(in srgb, ${colors.red} 90%, transparent)`,
    outlineStyle: 'dashed'
  },
  itemLabel: {
    color: app.fg,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    lineHeight: leading.footnote,
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '92%',
    pointerEvents: 'none'
  },
  itemSub: {
    display: 'block',
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.medium,
    fontVariantNumeric: 'tabular-nums',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // Wall-gap callouts on the selected item: one per side, readable at any zoom.
  gap: {
    position: 'absolute',
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    borderRadius: radius.pill,
    backgroundColor: `color-mix(in srgb, ${app.bg} 86%, transparent)`,
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    animationName: { default: gapIn, [reduce]: 'none' },
    animationDuration: '.18s'
  },
  gapBad: { color: colors.red },
  flag: {
    position: 'absolute',
    top: -space.sm,
    right: -space.sm,
    width: 18,
    height: 18,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.circle,
    backgroundColor: colors.red,
    color: colors.white,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    pointerEvents: 'none'
  },
  zoomDock: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    zIndex: 6,
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: glass.tint,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  zoomPct: {
    minWidth: 42,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xxs,
    paddingInline: space.xs,
    backgroundColor: { default: 'transparent', ':hover': app.fill },
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  hint: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    zIndex: 6,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    color: app.label2,
    backgroundColor: glass.tint,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.rim,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    pointerEvents: 'none'
  },
  // Inner-display inspector: one floating card of sections.
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    width: 280,
    flexShrink: 0,
    minHeight: 0,
    overflowY: 'auto',
    padding: space.md,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: `${shadow.rim},${shadow.float}`,
    scrollbarWidth: 'none'
  },
  section: { display: 'flex', flexDirection: 'column', gap: space.sm, minWidth: 0 },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  fieldRow: { display: 'flex', gap: space.xs, minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  meta: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  metaErr: { color: colors.red },
  sepH: { height: 1, alignSelf: 'stretch', backgroundColor: app.separator, marginBlock: space.xxs },
  paletteGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.xs },
  palItem: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    backgroundColor: { default: app.fill, ':hover': app.fill2 },
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    textAlign: 'start',
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  palName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  palDims: { display: 'block', color: app.label2, fontSize: typeScale.caption2, fontWeight: weight.medium },
  palSwatch: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: radius.sm,
    boxShadow: shadow.rim
  },
  rowBtns: { display: 'flex', gap: space.xs, flexWrap: 'wrap' },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    minHeight: 34,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: { default: app.fill, ':hover': app.fill2 },
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    ':disabled': { opacity: '.35', cursor: 'default' },
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  btnAccent: { backgroundColor: { default: app.link, ':hover': app.link }, color: colors.white },
  btnWarn: {
    backgroundColor: {
      default: `color-mix(in srgb, ${colors.red} 16%, transparent)`,
      ':hover': `color-mix(in srgb, ${colors.red} 26%, transparent)`
    },
    color: colors.red
  },
  btnGhost: { backgroundColor: 'transparent' },
  segTrack: {
    display: 'flex',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.md,
    backgroundColor: app.fill,
    alignSelf: 'stretch'
  },
  segBtn: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.xs,
    backgroundColor: 'transparent',
    color: app.label2,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  segOn: { backgroundColor: app.elevated, color: app.fg, boxShadow: shadow.card },
  chipRow: { display: 'flex', gap: space.xxs, flexWrap: 'wrap' },
  chipBtn: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    backgroundColor: { default: app.fill, ':hover': app.fill2 },
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  chipOn: { backgroundColor: { default: app.link, ':hover': app.link }, color: colors.white },
  gapGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: space.xs,
    borderWidth: 0,
    margin: 0,
    minInlineSize: 0,
    borderRadius: radius.lg,
    padding: space.sm,
    backgroundColor: app.fill
  },
  gapCell: { display: 'flex', flexDirection: 'column', gap: space.xxs },
  gapName: { color: app.label2, fontSize: typeScale.caption2, fontWeight: weight.medium },
  gapVal: { fontSize: typeScale.footnote, fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' },
  gapValBad: { color: colors.red },
  layoutList: { display: 'flex', flexDirection: 'column', gap: space.xxs, minHeight: 0 },
  layoutRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    width: '100%',
    minHeight: 38,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.medium,
    textAlign: 'start',
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${colors.blue}`, outlineOffset: 1 }
  },
  layoutOn: {
    backgroundColor: {
      default: `color-mix(in srgb, ${app.link} 13%, transparent)`,
      ':hover': `color-mix(in srgb, ${app.link} 18%, transparent)`
    }
  },
  layoutName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  layoutMeta: { color: app.label2, fontSize: typeScale.caption2, flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  // Cover tray: segmented panels above the home-bar clearance.
  tray: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: trayIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  trayBody: { maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'none', minHeight: 0 },
  confirm: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    minWidth: 0
  },
  confirmTitle: {
    marginBlock: 0,
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  confirmText: { marginBlock: 0, color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  confirmBtns: { display: 'flex', gap: space.xs, justifyContent: 'flex-end' },
  saved: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    flexShrink: 0
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.lg,
    color: app.label2,
    textAlign: 'center',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote
  }
})
