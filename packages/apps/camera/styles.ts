import {
  appAppearance,
  colors,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const RAIL = 156
/** The portrait frame clears the top bar, the zoom chips, the dial and the shutter row. */
const PORT_BOTTOM = 212

const blink = stylex.keyframes({ '50%': { opacity: 0.15 } })
const pulse = stylex.keyframes({ '50%': { transform: 'scale(1.06)' } })

export const styles = stylex.create({
  root: { paddingBottom: 0, overflow: 'hidden' },
  msg: { position: 'absolute', inset: 0, backgroundColor: colors.black },

  // The feed's box. Full-bleed by default; a cropped aspect sits centred on
  // black the way a real capture letterboxes on the panel.
  frame: { position: 'absolute', inset: 0, overflow: 'hidden' },
  // The aspect the user frames in, letterboxed on black: held wide the crop
  // takes the sides, held tall it drops the feed between the bars.
  frame43L: { top: 0, bottom: 0, left: '50%', right: 'auto', aspectRatio: '4 / 3', transform: 'translateX(-50%)' },
  frame43P: { left: 0, right: 0, top: '50%', bottom: 'auto', aspectRatio: '3 / 4', transform: 'translateY(-60%)' },
  frame169L: { left: 0, right: 0, top: '50%', bottom: 'auto', aspectRatio: '16 / 9', transform: 'translateY(-50%)' },
  frame169P: { left: 0, right: 0, top: '50%', bottom: 'auto', aspectRatio: '9 / 16', transform: 'translateY(-56%)' },
  frameSqL: { top: 0, bottom: 0, left: '50%', right: 'auto', aspectRatio: '1 / 1', transform: 'translateX(-50%)' },
  frameSqP: { left: 0, right: 0, top: '50%', bottom: 'auto', aspectRatio: '1 / 1', transform: 'translateY(-58%)' },

  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: 'center',
    transitionProperty: 'transform',
    transitionDuration: '.08s'
  },
  // The front camera previews mirrored, the way a mirror does; zoom is digital.
  zoom: (z: number, mirror: boolean) => ({ transform: `scale(${mirror ? -z : z}, ${z})` }),
  // The same look, exposure and night terms the still will bake in.
  fx: (css: string) => ({ filter: css || 'none' }),
  // Portrait's bokeh: a blurred copy underneath, the sharp one masked to the
  // subject's ellipse that grows as the f-stop closes.
  bokehMask: (rx: number, ry: number) => ({
    WebkitMaskImage: `radial-gradient(ellipse ${rx}% ${ry}% at 50% 44%, black 60%, transparent 78%)`,
    maskImage: `radial-gradient(ellipse ${rx}% ${ry}% at 50% 44%, black 60%, transparent 78%)`
  }),

  grid: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: appAppearance.cameraGrid
  },

  flash: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.white,
    opacity: 0,
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  // Retina flash on the front camera fires warm, the way iOS tints the panel.
  flashWarm: { backgroundColor: colors.orange },
  flashOn: { opacity: 1 },

  rectime: {
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    paddingTop: 3,
    paddingRight: 10,
    paddingBottom: 3,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraScrimStrong,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    color: colors.white
  },
  recdot: {
    width: 8,
    height: 8,
    borderRadius: radius.circle,
    backgroundColor: colors.red,
    animationName: blink,
    animationDuration: '1.6s',
    animationIterationCount: 'infinite'
  },

  tog: {
    position: 'relative',
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.circle,
    backgroundColor: appAppearance.cameraScrim,
    color: colors.white,
    cursor: 'pointer',
    flexShrink: 0
  },
  on: { color: colors.yellow },
  // The 'A' badge iOS pins to the bolt when flash is set to auto.
  flashA: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: typeScale.caption2,
    lineHeight: 1,
    fontWeight: weight.bold
  },
  chevron: {
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  chevronOpen: { transform: 'rotate(180deg)' },

  // Landscape: corners and the rail.
  corner: { position: 'absolute', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' },
  tl: { top: 14, left: 16 },
  tr: { top: 14, right: 16, flexDirection: 'row' },
  ml: { top: '50%', left: 16, transform: 'translateY(-50%)' },
  bl: { bottom: 14, left: 16 },
  rail: {
    position: 'absolute',
    top: 64,
    right: 0,
    bottom: 14,
    width: RAIL,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  railMid: { display: 'flex', alignItems: 'center', gap: 8, marginRight: 6 },

  // Portrait: a top bar and the stack under the feed.
  topBar: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topGroup: { display: 'flex', alignItems: 'center', gap: 10 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: PORT_BOTTOM,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    paddingBottom: 26
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingLeft: 30,
    paddingRight: 30
  },

  // The chevron's control strip, slid up between dial and feed.
  strip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingTop: 2
  },

  // The filters tray: a film strip of live thumbnails over the feed.
  tray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: PORT_BOTTOM,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    backgroundColor: appAppearance.cameraScrimStrong
  },
  trayRow: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    scrollbarWidth: 'none'
  },
  thumbBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    cursor: 'pointer',
    borderRadius: radius.sm
  },
  thumbCanvas: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: appAppearance.cameraChip },
  thumbOn: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: colors.yellow },
  thumbName: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: colors.white
  },
  thumbNameOn: { color: colors.yellow },

  dial: { display: 'flex', alignItems: 'center', gap: 4, touchAction: 'none' },
  // Stood up beside the shutter, read bottom to top like Apple's.
  dialLand: { flexDirection: 'column-reverse', gap: 1 },
  modeBtn: {
    paddingTop: 5,
    paddingRight: 10,
    paddingBottom: 5,
    paddingLeft: 10,
    borderRadius: radius.pill,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: colors.white,
    cursor: 'pointer'
  },
  modeBtnLand: { writingMode: 'vertical-rl', transform: 'rotate(180deg)' },
  modeOn: { color: colors.yellow, backgroundColor: appAppearance.cameraChip },

  zoomRow: { display: 'flex', gap: 6, touchAction: 'none' },
  // Stood up in the landscape rail, the way the iPad camera's strip runs.
  zoomRowLand: { flexDirection: 'column' },
  zl: {
    width: 34,
    height: 34,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.cameraScrimStrong,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    color: colors.white,
    cursor: 'pointer',
    flexShrink: 0
  },
  zlOn: { color: colors.yellow, backgroundColor: appAppearance.cameraScrim },
  // The value a scrub lands on between presets, floating over the strip.
  zPill: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: 2,
    paddingRight: 9,
    paddingBottom: 2,
    paddingLeft: 9,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraScrimStrong,
    color: colors.yellow,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    pointerEvents: 'none'
  },
  zPillPort: { bottom: PORT_BOTTOM + 96 },
  zPillLand: { bottom: 104 },

  // The white ring is a solid border sitting outside the black one, not a shadow.
  shutter: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderStyle: 'solid',
    borderColor: colors.black,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineColor: colors.white,
    cursor: 'pointer',
    touchAction: 'none',
    transitionProperty: 'transform, background-color, border-radius',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  shutterVideo: { backgroundColor: colors.red },
  // Time-lapse's shutter is a dashed ring around the red.
  shutterLapse: { outlineStyle: 'dashed' },
  shutterRec: { backgroundColor: colors.red, borderRadius: radius.lg, transform: 'scale(.6)' },
  // The white stills dot iOS shows beside the stop button while recording.
  stillDot: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderStyle: 'solid',
    borderColor: appAppearance.cameraChip,
    cursor: 'pointer',
    transform: { default: null, ':active': motion.press },
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },

  thumbWrap: { position: 'relative' },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: appAppearance.cameraChip,
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  burstBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingLeft: 4,
    paddingRight: 4,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    color: colors.black,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    pointerEvents: 'none'
  },

  // Night's chip sits with the toggles, moon and seconds inside.
  nightChip: {
    height: 36,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraScrim,
    color: colors.yellow,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    flexShrink: 0
  },

  // The tap-to-focus reticle and its sun slider beside it.
  focusMark: {
    position: 'absolute',
    width: 78,
    height: 78,
    transform: 'translate(-50%, -50%)',
    color: colors.yellow,
    pointerEvents: 'none',
    animationName: pulse,
    animationDuration: '.5s'
  },
  focusAt: (x: number, y: number) => ({ left: `${x}%`, top: `${y}%` }),
  evTrackV: {
    position: 'absolute',
    left: '100%',
    top: '50%',
    marginLeft: 14,
    width: 3,
    height: 78,
    transform: 'translateY(-50%)',
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraChip,
    pointerEvents: 'auto',
    cursor: 'pointer',
    touchAction: 'none'
  },
  evZero: {
    position: 'absolute',
    left: -3,
    right: -3,
    top: '50%',
    height: 1,
    backgroundColor: colors.white
  },
  evSun: { position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)', color: colors.yellow },
  evSunAt: (v: number) => ({ top: `${50 - v * 25}%` }),
  evReadout: {
    position: 'absolute',
    top: -26,
    left: '50%',
    transform: 'translateX(-50%)',
    paddingLeft: 7,
    paddingRight: 7,
    paddingTop: 2,
    paddingBottom: 2,
    borderRadius: radius.sm,
    backgroundColor: appAppearance.cameraScrimStrong,
    color: colors.yellow,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  },

  // The countdown's dim over the feed with the numeral iOS scales up each second.
  countWrap: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.cameraScrim,
    pointerEvents: 'none'
  },
  countNum: {
    fontSize: typeScale.displayXxl,
    lineHeight: 1,
    fontWeight: weight.thin,
    color: colors.white,
    animationName: pulse,
    animationDuration: '1s',
    animationIterationCount: 'infinite'
  },
  countHint: {
    position: 'absolute',
    bottom: '24%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    color: colors.yellow,
    whiteSpace: 'nowrap'
  },

  // The pano sweep: a centre line the sweep runs along, an arrow in a frame,
  // the progress fill and Apple's instruction.
  panoWrap: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  panoLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: colors.white,
    opacity: 0.6
  },
  panoBox: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 96,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.white,
    display: 'grid',
    placeItems: 'center',
    color: colors.white
  },
  panoBoxAt: (p: number) => ({ left: `${8 + p * 84}%` }),
  panoFill: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '50%',
    height: 2,
    transform: 'translateY(-1px)',
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraChip
  },
  panoFillAt: (p: number) => ({
    backgroundImage: `linear-gradient(to right, white ${p * 100}%, transparent ${p * 100}%)`
  }),
  panoHint: {
    position: 'absolute',
    top: '62%',
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: 4,
    paddingRight: 12,
    paddingBottom: 4,
    paddingLeft: 12,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraScrimStrong,
    color: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap'
  },

  // The LIVE badge sweeping the feed's top edge after a Live Photo lands.
  liveTag: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: 3,
    paddingRight: 9,
    paddingBottom: 3,
    paddingLeft: 9,
    borderRadius: radius.pill,
    backgroundColor: appAppearance.cameraScrimStrong,
    color: colors.white,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.bold,
    pointerEvents: 'none',
    textShadow: shadow.text
  },

  // While recording, a white dot offers stills beside the shutter, Apple's spot.
  stillPort: { position: 'absolute', right: 30, bottom: 40 },
  stillLand: { position: 'absolute', right: 62, bottom: 88 }
})
