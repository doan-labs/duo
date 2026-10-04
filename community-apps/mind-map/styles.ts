import {
  app,
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

const reduce = '@media (prefers-reduced-motion: reduce)'

// The node's tint palette: one hue per slot, matched between the dot on the
// card and the edge back to its parent. Edge strokes keep the hue at ~60%
// over the canvas so the tree reads without shouting.
export const HUES = [
  colors.cyanDark,
  colors.indigoDark,
  colors.greenDark,
  colors.orangeDark,
  colors.pinkDark,
  colors.tealDark
]

const nodeIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.72' },
  '70%': { opacity: 1, scale: '1.06' },
  '100%': { opacity: 1, scale: '1' }
})
const trayIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 16px', scale: '.96' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const sheetIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.94' },
  '100%': { opacity: 1, scale: '1' }
})
const fadeIn = stylex.keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 }
})
// A new branch traces itself in: pathLength is set to 1 in markup so the
// dash math is trivial, and the static style is visible so nothing vanishes
// when the draw ends.
const edgeIn = stylex.keyframes({
  '0%': { strokeDashoffset: 1 },
  '100%': { strokeDashoffset: 0 }
})

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
    color: colors.white,
    backgroundColor: colors.black,
    // A violet pool above, a cyan one below: the drafting table at night.
    backgroundImage: `radial-gradient(75% 45% at 24% 0%,color-mix(in srgb, ${colors.indigoDark} 14%, transparent),transparent 62%),radial-gradient(70% 45% at 78% 106%,color-mix(in srgb, ${colors.cyanDark} 10%, transparent),transparent 60%)`,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline
  },
  rootCover: { gap: space.sm, paddingTop: space.sm, paddingInline: space.sm },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, flexShrink: 0 },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: colors.indigoDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: tracking.largeTitle
  },
  titleCover: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  countChip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    color: app.label2,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: space.lg
  },
  stageCover: { flexDirection: 'column', gap: space.sm },
  // The drawing well: punched in a touch darker than the page, dotted like
  // graph paper. The dots ride the pan through backgroundPosition so the
  // canvas never reads as floating over a fixed desk.
  canvas: {
    position: 'relative',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: `color-mix(in srgb, ${colors.grey6Dark} 55%, transparent)`,
    boxShadow: `inset 0 1px 3px color-mix(in srgb, ${colors.black} 40%, transparent)`,
    touchAction: 'none',
    cursor: 'grab'
  },
  canvasPanning: { cursor: 'grabbing' },
  dots: {
    backgroundImage: `radial-gradient(color-mix(in srgb, ${colors.white} 9%, transparent) 1px, transparent 1px)`,
    backgroundSize: '36px 36px'
  },
  dotsAt: (x: number, y: number) => ({ backgroundPosition: `${x}px ${y}px` }),
  // The world sits on a zero-size point at the canvas centre; every child
  // positions itself from there, so pan is a translate and zoom is a scale.
  world: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 },
  worldAt: (x: number, y: number, zoom: number) => ({ transform: `translate(${x}px,${y}px) scale(${zoom})` }),
  // A 1px viewport, not 0: a zero-size svg is paint-culled even with overflow
  // visible, while 1px keeps the origin at world (0,0) and still spills children.
  edges: { position: 'absolute', width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' },
  // StyleX drops `fill` (not a styleable property), so paths carry fill="none"
  // as an attribute: without it the open curves fill black into the dark canvas.
  edge: {
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeDasharray: 1,
    animationName: { default: edgeIn, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.out
  },
  edgeTone: (i: number) => ({ stroke: `color-mix(in srgb, ${HUES[i % HUES.length]} 84%, transparent)` }),
  // The branch feeding the selected node: thicker and at full hue strength so
  // the selection reads structurally, not only as a ring on the pill.
  edgeSel: (i: number) => ({ strokeWidth: 3.5, stroke: HUES[i % HUES.length] }),
  node: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '220px',
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.lg,
    color: colors.white,
    backgroundColor: { default: glass.tintDark, ':hover': `color-mix(in srgb, ${colors.white} 12%, transparent)` },
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.semibold,
    textAlign: 'start',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
    animationName: { default: nodeIn, [reduce]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both',
    // A node moved by the other display glides to its spot; the transform is
    // suppressed on the locally dragged node or it would trail the finger.
    transitionProperty: 'transform,box-shadow,background-color',
    transitionDuration: '.22s,.18s,.18s',
    transitionTimingFunction: easing.spring,
    ':focus-visible': { outline: `2px solid ${colors.cyanDark}`, outlineOffset: 2 }
  },
  nodeDrag: { transitionDuration: '0s' },
  nodeCover: { maxWidth: '150px', paddingBlock: space.xs, paddingInline: space.sm, fontSize: typeScale.caption1 },
  nodeRoot: {
    // Outlines are used for rings here, not box-shadow: section 3 allows only
    // the four shadow tokens, and an outline is the legal way to add a frame
    // that does not cost the glass rim or the float lift.
    outline: `1.5px solid color-mix(in srgb, ${colors.indigoDark} 70%, transparent)`
  },
  nodeSel: {
    backgroundColor: {
      default: `color-mix(in srgb, ${colors.cyanDark} 18%, transparent)`,
      ':hover': `color-mix(in srgb, ${colors.cyanDark} 24%, transparent)`
    },
    // A lifted cyan ring: the offset parks it just off the pill so the
    // selection reads at a glance even beside the full-strength parent edge.
    outline: `2px solid color-mix(in srgb, ${colors.cyanDark} 85%, transparent)`,
    outlineOffset: 1.5
  },
  nodeAt: (x: number, y: number) => ({ transform: `translate(${x}px,${y}px) translate(-50%,-50%)` }),
  // A plain block: -webkit-box's min-content collapses to one character inside
  // flex rows, which wrapped every node a letter per line.
  nodeText: {
    display: 'block',
    maxHeight: '3.9em',
    overflow: 'hidden',
    overflowWrap: 'break-word'
  },
  dot: { width: 10, height: 10, borderRadius: radius.circle, flexShrink: 0, boxShadow: shadow.rim },
  dotTone: (i: number) => ({ backgroundColor: HUES[i % HUES.length] }),
  zoomDock: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  zoomPct: {
    minWidth: 40,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xxs,
    paddingInline: space.xs,
    backgroundColor: { default: 'transparent', ':hover': app.fill },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  iconBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': app.fill },
    color: colors.white,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform,background-color,opacity',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':disabled': { opacity: '.35', cursor: 'default' }
  },
  iconBtnTint: {
    width: 'auto',
    paddingInline: space.sm,
    gap: space.xxs,
    display: 'flex',
    alignItems: 'center',
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold
  },
  // The cover tray's buttons get HIG-comfortable targets, roomier than the
  // dock's: 44pt square icons, same height on the labelled pills.
  iconBtnLg: { width: 44, height: 44, flexShrink: 0 },
  iconBtnLgH: { height: 44 },
  hint: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    zIndex: 2,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    color: app.label2,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.rim,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    pointerEvents: 'none'
  },
  // The editing panel on the inner display: one floating card, sections inside.
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    width: 268,
    flexShrink: 0,
    minHeight: 0,
    overflowY: 'auto',
    padding: space.md,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
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
  meta: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  palette: { display: 'flex', gap: space.xs, flexWrap: 'wrap', borderWidth: 0, padding: 0, margin: 0, minWidth: 0 },
  swatch: {
    width: 22,
    height: 22,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.circle,
    cursor: 'pointer',
    boxShadow: shadow.rim,
    transitionProperty: 'transform,box-shadow',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press, ':hover': 'scale(1.12)' }
  },
  swatchOn: { boxShadow: `0 0 0 2px ${colors.black},0 0 0 3.5px color-mix(in srgb, ${colors.white} 80%, transparent)` },
  rowBtns: { display: 'flex', gap: space.xs, flexWrap: 'wrap' },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: { default: app.fill, ':hover': app.fill2 },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    transitionProperty: 'transform,background-color,opacity',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':disabled': { opacity: '.35', cursor: 'default' }
  },
  btnAccent: { backgroundColor: { default: colors.cyanDark, ':hover': colors.cyan }, color: colors.grey6Dark },
  btnWarn: {
    backgroundColor: {
      default: `color-mix(in srgb, ${colors.redDark} 22%, transparent)`,
      ':hover': `color-mix(in srgb, ${colors.redDark} 32%, transparent)`
    },
    color: colors.redDark
  },
  mapList: { display: 'flex', flexDirection: 'column', gap: space.xxs, minHeight: 0 },
  mapRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    width: '100%',
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.medium,
    textAlign: 'start',
    cursor: 'pointer',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  mapRowOn: {
    backgroundColor: {
      default: `color-mix(in srgb, ${colors.cyanDark} 14%, transparent)`,
      ':hover': `color-mix(in srgb, ${colors.cyanDark} 18%, transparent)`
    }
  },
  mapName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  mapMeta: { color: app.label2, fontSize: typeScale.caption2, flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  // The cover keeps one floating tray at the bottom: navigation on the first
  // row, the selected node's tools on the second, its palette on the third.
  tray: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: trayIn, [reduce]: 'none' },
    animationDuration: '.34s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  trayRow: { display: 'flex', alignItems: 'center', gap: space.xs, minWidth: 0 },
  trayField: { flex: 1, minWidth: 0 },
  sep: { width: 1, alignSelf: 'stretch', backgroundColor: app.separator, marginBlock: space.xxs },
  // A hairline between the panel's sections so the tools read as groups.
  sepH: { height: 1, alignSelf: 'stretch', backgroundColor: app.separator, marginBlock: space.xxs },
  grow: { flex: 1, minWidth: 0 },
  // The maps sheet on the cover: a scrim and a card, same list as the panel.
  scrim: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: space.sm,
    paddingBottom: space.xxl,
    borderWidth: 0,
    boxSizing: 'border-box',
    backgroundColor: `color-mix(in srgb, ${colors.black} 45%, transparent)`,
    cursor: 'default',
    animationName: { default: fadeIn, [reduce]: 'none' },
    animationDuration: '.2s'
  },
  // A transparent full-area button behind the sheet: tapping outside the card
  // dismisses it without faking interactivity on a static element.
  scrimTap: {
    position: 'absolute',
    inset: 0,
    borderWidth: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    cursor: 'default'
  },
  sheet: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '100%',
    maxHeight: '78%',
    overflowY: 'auto',
    padding: space.md,
    borderRadius: radius.xxl,
    backgroundColor: colors.grey6Dark,
    boxShadow: `${shadow.rim},${shadow.float}`,
    scrollbarWidth: 'none',
    animationName: { default: sheetIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  sheetHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  saved: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    flexShrink: 0
  }
})
