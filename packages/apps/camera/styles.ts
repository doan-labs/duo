import {
  appAppearance,
  colors,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const RAIL = 156

export const styles = stylex.create({
  root: { paddingBottom: 0, overflow: 'hidden' },
  msg: { position: 'absolute', inset: 0, backgroundColor: colors.black },
  // The feed's box. Full-bleed by default; 4:3 sits centred on black like a
  // real 4:3 capture on a wider panel.
  frame: { position: 'absolute', inset: 0, overflow: 'hidden' },
  framePort: { bottom: 212 },
  frameFourLand: { left: '50%', width: 'auto', height: '100%', aspectRatio: '4 / 3', transform: 'translateX(-50%)' },
  frameFourPort: {
    top: '50%',
    bottom: 'auto',
    height: 'auto',
    width: '100%',
    aspectRatio: '3 / 4',
    transform: 'translateY(-60%)'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: 'center',
    transitionProperty: 'transform',
    transitionDuration: '.08s'
  },
  // The front camera previews mirrored, the way a mirror does.
  zoom: (z: number, mirror: boolean) => ({ transform: `scale(${mirror ? -z : z}, ${z})` }),
  filtered: { filter: 'sepia(.35) contrast(1.1)' },
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
  flashOn: { opacity: 1 },
  rectime: {
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: 3,
    paddingRight: 10,
    paddingBottom: 3,
    paddingLeft: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums'
  },

  tog: {
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

  // Landscape: corners and the rail.
  corner: { position: 'absolute', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
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
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 212,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
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

  dial: { display: 'flex', alignItems: 'center', gap: 6 },
  // Stood up beside the shutter, read bottom to top like Apple's.
  dialLand: { flexDirection: 'column-reverse', gap: 2 },
  modeBtn: {
    paddingTop: 5,
    paddingRight: 11,
    paddingBottom: 5,
    paddingLeft: 11,
    borderRadius: radius.pill,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    color: colors.white,
    cursor: 'pointer'
  },
  modeBtnLand: { writingMode: 'vertical-rl', transform: 'rotate(180deg)' },
  modeOn: { color: colors.yellow, backgroundColor: appAppearance.cameraChip },

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
    color: colors.yellow,
    cursor: 'pointer',
    flexShrink: 0
  },
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
    transitionProperty: 'transform, background-color, border-radius',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  shutterVideo: { backgroundColor: colors.red },
  shutterRec: { backgroundColor: colors.red, borderRadius: radius.lg, transform: 'scale(.6)' },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: appAppearance.cameraChip,
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' }
})
