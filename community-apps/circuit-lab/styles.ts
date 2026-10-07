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

// Signal colouring: HIGH is a warm amber, LOW a quiet graphite. Every lit
// element - wire, pin, bulb, switch track - reads from these two so state is
// visible at a glance without brightness tricks.
export const HIGH = colors.yellowDark
export const LOW = colors.grey3Dark
export const ACCENT = colors.cyanDark

const nodeIn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.72' },
  '70%': { opacity: 1, scale: '1.06' },
  '100%': { opacity: 1, scale: '1' }
})
const trayIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 16px', scale: '.96' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const edgeIn = stylex.keyframes({
  '0%': { strokeDashoffset: 1 },
  '100%': { strokeDashoffset: 0 }
})
// Lit wires carry a slow march of dashes so the signal reads as moving.
const march = stylex.keyframes({
  to: { strokeDashoffset: -32 }
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
    // A warm bench lamp above, a cool pool below the fold.
    backgroundImage: `radial-gradient(80% 42% at 22% 0%,color-mix(in srgb, ${colors.yellowDark} 9%, transparent),transparent 60%),radial-gradient(70% 40% at 82% 106%,color-mix(in srgb, ${colors.tealDark} 9%, transparent),transparent 62%)`,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline
  },
  rootCover: { gap: space.sm, paddingTop: space.sm, paddingInline: space.sm },
  shell: { display: 'flex', flexDirection: 'column', gap: space.md, flexGrow: 1, minHeight: 0 },
  shellCover: { gap: space.sm },
  flipX: { display: 'inline-flex', transform: 'scaleX(-1)' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.sm, flexShrink: 0 },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: colors.yellowDark,
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
  chips: { display: 'flex', alignItems: 'center', gap: space.xxs, flexShrink: 0 },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.pill,
    color: app.label2,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums'
  },
  stage: { flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: space.lg },
  stageCover: { flexDirection: 'column', gap: space.sm },
  // The board well: punched darker than the page, dotted like perfboard.
  canvas: {
    position: 'relative',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: `color-mix(in srgb, ${colors.grey6Dark} 55%, transparent)`,
    boxShadow: shadow.rim,
    touchAction: 'none',
    cursor: 'default'
  },
  canvasBusy: { cursor: 'grabbing' },
  dots: {
    backgroundImage: `radial-gradient(color-mix(in srgb, ${colors.white} 9%, transparent) 1px, transparent 1px)`
  },
  dotsAt: (x: number, y: number) => ({ backgroundPosition: `${x}px ${y}px`, backgroundSize: '22px 22px' }),
  world: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 },
  worldAt: (x: number, y: number, zoom: number) => ({ transform: `translate(${x}px,${y}px) scale(${zoom})` }),
  wiresSvg: { position: 'absolute', width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' },
  wireHit: { stroke: 'transparent', strokeWidth: 18, fill: 'none', pointerEvents: 'stroke', cursor: 'pointer' },
  wire: {
    fill: 'none',
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeDasharray: 1,
    animationName: { default: edgeIn, [reduce]: 'none' },
    animationDuration: '.4s',
    animationTimingFunction: easing.out
  },
  wireLow: { stroke: `color-mix(in srgb, ${colors.grey3} 34%, transparent)` },
  wireHigh: { stroke: `color-mix(in srgb, ${HIGH} 88%, transparent)` },
  wireSel: { stroke: ACCENT, strokeWidth: 3.5 },
  wireDead: { stroke: `color-mix(in srgb, ${colors.redDark} 70%, transparent)` },
  // A lit hop lands ~55ms after the part feeding it: the delay makes one
  // switch flick read as the signal travelling gate to gate instead of every
  // wire snapping at once.
  wireDelay: (ms: number) => ({ transitionProperty: 'stroke', transitionDuration: '.25s', transitionDelay: `${ms}ms` }),
  flowDelay: (ms: number) => ({ animationDelay: `${ms}ms` }),
  // The signal march rides on top of the wire, gated to the active copy.
  wireFlow: {
    fill: 'none',
    strokeWidth: 1.4,
    stroke: `color-mix(in srgb, ${colors.black} 55%, transparent)`,
    strokeDasharray: '4 12',
    animationName: { default: march, [reduce]: 'none' },
    animationDuration: '.9s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },
  ghostWire: {
    fill: 'none',
    strokeWidth: 2.5,
    strokeDasharray: '6 6',
    stroke: `color-mix(in srgb, ${ACCENT} 80%, transparent)`
  },
  nodeBox: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animationName: { default: nodeIn, [reduce]: 'none' },
    animationDuration: '.24s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  nodeAt: (x: number, y: number, w: number, h: number) => ({
    transform: `translate(${x - w / 2}px,${y - h / 2}px)`,
    width: w,
    height: h
  }),
  body: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    borderWidth: 0,
    borderRadius: radius.lg,
    color: colors.white,
    backgroundColor: { default: glass.tintDark, ':hover': `color-mix(in srgb, ${colors.white} 12%, transparent)` },
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    fontFamily: fonts.system,
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
    transitionProperty: 'transform,box-shadow,background-color,outline-color',
    transitionDuration: '.22s,.18s,.18s,.22s',
    transitionTimingFunction: easing.spring,
    outline: '2px solid transparent',
    outlineOffset: 2,
    ':focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 }
  },
  bodyDrag: { transitionDuration: '0s', cursor: 'grabbing' },
  bodySel: { outline: `2px solid color-mix(in srgb, ${ACCENT} 85%, transparent)`, outlineOffset: 2 },
  bodyDead: { outline: `2px solid color-mix(in srgb, ${colors.redDark} 75%, transparent)`, outlineOffset: 2 },
  gateLabel: {
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    color: app.label2
  },
  nodeLabel: {
    position: 'absolute',
    top: '100%',
    marginTop: space.xxs,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    color: app.label2,
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  },
  // The slide switch: a stubby iOS toggle with the letter beside it.
  switchTrack: {
    width: 34,
    height: 20,
    borderRadius: radius.pill,
    display: 'flex',
    alignItems: 'center',
    padding: space.xxs,
    boxSizing: 'border-box',
    transitionProperty: 'background-color',
    transitionDuration: '.22s',
    transitionTimingFunction: easing.out
  },
  switchOn: { backgroundColor: colors.greenDark },
  switchOff: { backgroundColor: `color-mix(in srgb, ${colors.grey3Dark} 80%, transparent)` },
  knob: {
    width: 16,
    height: 16,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    transitionProperty: 'transform',
    transitionDuration: '.24s',
    transitionTimingFunction: easing.spring
  },
  knobOn: { transform: 'translateX(12px)' },
  switchLetter: {
    fontSize: typeScale.caption1,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption1,
    fontFamily: fonts.mono
  },
  bulbCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    boxShadow: shadow.rim,
    transitionProperty: 'background-color,color',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.out
  },
  bulbOn: { backgroundColor: HIGH, color: colors.grey6Dark },
  bulbOff: { backgroundColor: `color-mix(in srgb, ${colors.grey5Dark} 85%, transparent)`, color: app.label3 },
  pin: {
    position: 'absolute',
    display: 'grid',
    placeItems: 'center',
    // Wide and short: a 26px circle would collide with the neighbouring input
    // pin on two-input gates (18.7px of spacing), so the target reaches
    // sideways into open canvas instead of vertically into the other pin.
    width: 34,
    height: 18,
    borderWidth: 0,
    borderRadius: radius.pill,
    padding: 0,
    backgroundColor: 'transparent',
    cursor: 'crosshair'
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: radius.circle,
    boxShadow: shadow.rim,
    transitionProperty: 'background-color,outline-color',
    transitionDuration: '.22s'
  },
  pinLow: { backgroundColor: `color-mix(in srgb, ${LOW} 55%, transparent)` },
  pinHigh: { backgroundColor: HIGH },
  pinArmed: { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
  pinCandidate: { outline: `1.5px dashed color-mix(in srgb, ${ACCENT} 55%, transparent)`, outlineOffset: 2 },
  pinBad: { outline: `1.5px dashed color-mix(in srgb, ${colors.redDark} 60%, transparent)`, outlineOffset: 2 },
  // left/top, not a transform: shared.press animates transform and would
  // override a translate() in the same stylex.props call, leaving every pin
  // parked at the node centre.
  pinAt: (x: number, y: number) => ({ left: x - 17, top: y - 9 }),
  banner: {
    position: 'absolute',
    top: space.sm,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '86%',
    paddingBlock: space.xs,
    paddingInline: space.md,
    borderRadius: radius.pill,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap',
    overflow: 'hidden'
  },
  bannerSolved: { color: colors.greenDark },
  bannerText: { overflow: 'hidden', textOverflow: 'ellipsis', color: app.label2 },
  bannerOk: { color: colors.greenDark, fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
  bannerMiss: { color: colors.orangeDark, fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
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
    minWidth: 48,
    minHeight: 40,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.xxs,
    paddingInline: space.xs,
    backgroundColor: { default: 'transparent', ':hover': app.fill, ':active': app.fill },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer'
  },
  iconBtn: {
    display: 'grid',
    placeItems: 'center',
    width: 40,
    height: 40,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: 'transparent', ':hover': app.fill, ':active': app.fill },
    color: colors.white,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.18s',
    ':disabled': { opacity: '.35', cursor: 'default' }
  },
  iconBtnLg: { width: 44, height: 44 },
  iconBtnTintOn: { color: colors.yellowDark },
  iconBtnMuted: { color: app.label3 },
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
  // The side panel on the inner display.
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    width: 300,
    flexShrink: 0,
    minHeight: 0,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  panelScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none'
  },
  section: { display: 'flex', flexDirection: 'column', gap: space.sm, minWidth: 0, flexShrink: 0 },
  fieldLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  meta: { color: app.label2, fontSize: typeScale.caption1, lineHeight: leading.caption1 },
  seg: {
    display: 'flex',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.md,
    backgroundColor: app.fill,
    flexShrink: 0
  },
  segBtn: {
    flex: 1,
    minWidth: 0,
    height: 40,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': app.fill2, ':active': app.fill2 },
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.medium,
    cursor: 'pointer',
    ':focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 1 }
  },
  segBtnOn: { backgroundColor: { default: app.control, ':hover': app.control }, boxShadow: shadow.card },
  paletteGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space.sm },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    height: 52,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: { default: app.fill, ':hover': app.fill2, ':active': app.fill2 },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    transitionProperty: 'opacity',
    transitionDuration: '.18s',
    ':disabled': { opacity: '.35', cursor: 'default' },
    ':focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 1 }
  },
  tileLock: { color: app.label3 },
  // The cover tray.
  tray: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: space.lg,
    maxHeight: '44%',
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
  trayBody: {
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm
  },
  rowBtns: { display: 'flex', gap: space.xs, flexWrap: 'wrap' },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    borderWidth: 0,
    borderRadius: radius.pill,
    minHeight: 44,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: { default: app.fill, ':hover': app.fill2, ':active': app.fill2 },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    transitionProperty: 'opacity',
    transitionDuration: '.18s',
    ':disabled': { opacity: '.35', cursor: 'default' },
    ':focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 1 }
  },
  btnAccent: { backgroundColor: { default: colors.yellowDark, ':hover': colors.yellow }, color: colors.grey6Dark },
  btnWarn: {
    backgroundColor: {
      default: `color-mix(in srgb, ${colors.redDark} 22%, transparent)`,
      ':hover': `color-mix(in srgb, ${colors.redDark} 32%, transparent)`
    },
    color: colors.redDark
  },
  list: { display: 'flex', flexDirection: 'column', gap: space.xs, minHeight: 0 },
  listRow: { display: 'flex', alignItems: 'center', gap: space.xs, minWidth: 0 },
  rowBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    minHeight: 44,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    backgroundColor: { default: 'transparent', ':hover': app.fill3, ':active': app.fill3 },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.medium,
    textAlign: 'start',
    cursor: 'pointer'
  },
  rowBtnOn: {
    backgroundColor: {
      default: `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
      ':hover': `color-mix(in srgb, ${ACCENT} 18%, transparent)`
    }
  },
  rowName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowMeta: { color: app.label2, fontSize: typeScale.caption2, flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  // Truth table.
  tableWrap: { overflow: 'auto', minHeight: 0, scrollbarWidth: 'none', borderRadius: radius.md },
  table: {
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    fontVariantNumeric: 'tabular-nums'
  },
  th: {
    position: 'sticky',
    top: 0,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    color: app.label2,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    textAlign: 'center',
    backgroundColor: `color-mix(in srgb, ${colors.grey6Dark} 92%, transparent)`
  },
  thOut: { color: colors.yellowDark, borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: app.separator },
  td: {
    paddingBlock: space.xs,
    paddingInline: space.sm,
    textAlign: 'center',
    color: app.label3,
    fontWeight: weight.medium
  },
  tdOn: { color: colors.white },
  tdOut: { borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: app.separator, color: colors.orangeDark },
  tdOutOn: { color: colors.yellowDark },
  trLive: { backgroundColor: `color-mix(in srgb, ${ACCENT} 14%, transparent)` },
  liveDot: { color: ACCENT, fontSize: typeScale.caption2 },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs, minWidth: 0 },
  sepH: { height: 1, alignSelf: 'stretch', backgroundColor: app.separator, marginBlock: space.xxs },
  grow: { flex: 1, minWidth: 0 },
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
  // Destructive confirm (kit Sheet content).
  confirmCard: { display: 'flex', flexDirection: 'column', gap: space.md, padding: space.lg },
  confirmTitle: {
    marginBlock: 0,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold
  },
  confirmSub: { color: app.label2, fontSize: typeScale.footnote, lineHeight: leading.footnote },
  confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: space.sm },
  // Aria-live announcer, visually hidden.
  announce: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clipPath: 'inset(50%)'
  }
})
