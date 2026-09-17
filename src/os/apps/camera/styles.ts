import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

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
    backgroundImage:
      'linear-gradient(to right, transparent calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% + .5px), transparent calc(66.66% + .5px)), linear-gradient(to bottom, transparent calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% + .5px), transparent calc(66.66% + .5px))'
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
    borderRadius: 10,
    backgroundColor: colors.red,
    fontSize: 13,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums'
  },

  tog: {
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,.4)',
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
    borderRadius: 14,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
    color: colors.white,
    cursor: 'pointer'
  },
  modeBtnLand: { writingMode: 'vertical-rl', transform: 'rotate(180deg)' },
  modeOn: { color: colors.yellow, backgroundColor: 'rgba(255,255,255,.14)' },

  zl: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,.45)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: colors.yellow,
    cursor: 'pointer',
    flexShrink: 0
  },
  shutter: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: '50%',
    backgroundColor: colors.white,
    borderWidth: 4,
    borderStyle: 'solid',
    borderColor: colors.black,
    boxShadow: `0 0 0 3px ${colors.white}`,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, border-radius',
    transitionDuration: '.12s',
    transform: { default: null, ':active': 'scale(.9)' }
  },
  shutterVideo: { backgroundColor: colors.red },
  shutterRec: { backgroundColor: colors.red, borderRadius: 12, transform: 'scale(.6)' },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.12)',
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' }
})
