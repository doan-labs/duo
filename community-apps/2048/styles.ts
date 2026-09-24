import { app, colors, easing, fonts, glass, radius, shadow } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import type { StyleXStyles } from '@stylexjs/stylex'
import * as stylex from '@stylexjs/stylex'
import { SIZE } from './game.ts'

export const BOARD_PAD = 10
export const BOARD_GAP = 8
export const SLIDE_MS = 130
const reduce = '@media (prefers-reduced-motion: reduce)'

// The tile's position lives in `transform`, so one-shot keyframes may only ever
// touch `scale`/`translate`/`opacity` - animating `transform` would teleport
// the tile to the origin for a frame.
const tileSpawn = stylex.keyframes({
  '0%': { opacity: 0, scale: '.3' },
  '55%': { opacity: 1, scale: '1.08' },
  '100%': { opacity: 1, scale: '1' }
})
const tileMerge = stylex.keyframes({
  '0%': { scale: '1' },
  '40%': { scale: '1.16' },
  '100%': { scale: '1' }
})
const sheen = stylex.keyframes({
  '0%': { backgroundPosition: '0% 0' },
  '100%': { backgroundPosition: '200% 0' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: '.9' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const scrimIn = stylex.keyframes({ '0%': { opacity: 0 }, '100%': { opacity: 1 } })
const gainFloat = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 4px', scale: '.7' },
  '20%': { opacity: 1, scale: '1.05' },
  '70%': { opacity: 1 },
  '100%': { opacity: 0, translate: '0 -24px', scale: '1' }
})
const logoTip = stylex.keyframes({
  '0%,100%': { rotate: '-5deg' },
  '50%': { rotate: '-9deg' }
})

const goldFace = 'linear-gradient(150deg,#ffe08e,#ffb400)'

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    paddingTop: 18,
    paddingBottom: 32,
    paddingInline: 20,
    color: colors.white,
    backgroundColor: '#17171b',
    // A quiet warm haze over a deep graphite base: the arcade cabinet's glow.
    backgroundImage:
      'radial-gradient(85% 55% at 50% 0%,rgba(255,141,40,.08),transparent 62%),radial-gradient(70% 50% at 50% 108%,rgba(97,85,245,.07),transparent 60%)',
    fontFamily: fonts.system,
    fontSize: 14
  },
  rootCover: { gap: 10, paddingTop: 12, paddingBottom: 28, paddingInline: 12 },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexShrink: 0
  },
  brand: { display: 'flex', flexDirection: 'column', gap: 2 },
  kicker: { color: colors.orange, fontSize: 9, fontWeight: 700, letterSpacing: 2 },
  logo: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: 42,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: -1.5
  },
  logoCover: { fontSize: 32 },
  logoTile: {
    display: 'inline-block',
    marginLeft: 6,
    paddingBlock: 1,
    paddingInline: 7,
    borderRadius: radius.md,
    color: '#463300',
    backgroundImage: goldFace,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,.5),0 3px 10px rgba(255,170,0,.35)`,
    rotate: '-5deg',
    animationName: { default: logoTip, [reduce]: 'none' },
    animationDuration: '3.6s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  scores: { display: 'flex', gap: 8, flexShrink: 0 },
  chip: {
    position: 'relative',
    minWidth: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  chipLabel: { color: app.label2, fontSize: 8, fontWeight: 700, letterSpacing: 1.4 },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 20,
    textAlign: 'center'
  },
  gainWrap: { position: 'absolute', left: -8, right: -8, top: -16, textAlign: 'center', pointerEvents: 'none' },
  gain: {
    display: 'inline-block',
    color: '#ffd76a',
    fontFamily: fonts.rounded,
    fontSize: 11,
    fontWeight: 800,
    textShadow: shadow.text,
    animationName: { default: gainFloat, [reduce]: 'none' },
    animationDuration: '.55s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 18
  },
  stageCover: { flexDirection: 'column', gap: 12 },
  // The board is a well punched into the cabinet: dark, inset, soft top catch.
  board: {
    position: 'relative',
    padding: BOARD_PAD,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(0,0,0,.34)',
    backgroundImage: 'linear-gradient(180deg,rgba(0,0,0,.16),transparent 38%)',
    boxShadow:
      'inset 0 2px 14px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(255,255,255,.08),inset 0 -1px 0 rgba(255,255,255,.04)',
    touchAction: 'none',
    flexShrink: 0
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  cell: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,.055)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,.18)'
  },
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    fontFamily: fonts.rounded,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: -0.5,
    minWidth: 0,
    minHeight: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),inset 0 -1px 0 rgba(0,0,0,.1),0 2px 7px rgba(0,0,0,.3)',
    transitionProperty: 'transform',
    transitionDuration: `${SLIDE_MS}ms`,
    transitionTimingFunction: easing.push,
    willChange: 'transform'
  },
  ghost: { zIndex: 1 },
  tileSpawned: {
    animationName: { default: tileSpawn, [reduce]: 'none' },
    animationDuration: '.24s',
    animationDelay: `${SLIDE_MS - 40}ms`,
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  tileMerged: {
    animationName: { default: tileMerge, [reduce]: 'none' },
    animationDuration: '.26s',
    animationDelay: `${SLIDE_MS - 10}ms`,
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  rail: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 0 },
  railCover: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  railActions: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  tray: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,36px)',
    gridTemplateRows: 'repeat(2,36px)',
    gap: 2,
    padding: 6,
    borderRadius: radius.xxl,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  key: {
    borderWidth: 0,
    borderRadius: radius.pill,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    backgroundColor: { default: 'transparent', ':hover': 'rgba(255,255,255,.14)' },
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    gridRow: 2,
    transitionProperty: 'transform,background-color',
    transitionDuration: '.15s,.18s',
    transform: { default: 'scale(1)', ':active': 'scale(.86)' }
  },
  keyUp: { gridColumn: 2, gridRow: 1 },
  newGame: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: 9,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: { default: 'rgba(255,255,255,.1)', ':hover': 'rgba(255,255,255,.16)' },
    boxShadow: 'inset 0 0 0 .5px rgba(255,255,255,.16)',
    fontFamily: fonts.system,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform,background-color',
    transitionDuration: '.15s,.18s',
    transform: { default: 'scale(1)', ':active': 'scale(.94)' }
  },
  hint: { marginBlock: 0, color: app.label2, fontSize: 11, textAlign: 'center', maxWidth: 170, lineHeight: 1.35 },
  hintCover: { fontSize: 10, maxWidth: 96, textAlign: 'right' },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(14,14,18,.66)',
    backdropFilter: 'blur(8px) saturate(140%)',
    WebkitBackdropFilter: 'blur(8px) saturate(140%)',
    animationName: { default: scrimIn, [reduce]: 'none' },
    animationDuration: '.25s',
    animationFillMode: 'both'
  },
  overlayCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.38s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  overlayTitle: { fontFamily: fonts.rounded, fontSize: 30, fontWeight: 800, letterSpacing: -0.5 },
  overlaySub: { color: app.label2, fontSize: 12 },
  overlayButtons: { display: 'flex', gap: 8, marginTop: 10 },
  overlayBtn: {
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: 9,
    paddingInline: 15,
    color: colors.white,
    backgroundColor: { default: 'rgba(255,255,255,.12)', ':hover': 'rgba(255,255,255,.18)' },
    boxShadow: 'inset 0 0 0 .5px rgba(255,255,255,.18)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transitionProperty: 'transform,background-color',
    transitionDuration: '.15s,.18s',
    transform: { default: 'scale(1)', ':active': 'scale(.94)' }
  },
  overlayBtnGold: {
    color: '#463300',
    backgroundColor: { default: '#ffcf3f', ':hover': '#ffd95e' },
    boxShadow: '0 4px 14px rgba(255,180,0,.4)'
  },

  tile2: { backgroundImage: 'linear-gradient(155deg,#eceef3,#d4d6de)', color: '#3a3a3c' },
  tile4: { backgroundImage: 'linear-gradient(155deg,#ffeab0,#ffc53a)', color: '#57400a' },
  tile8: {
    backgroundImage: 'linear-gradient(155deg,#ffb262,#ff8d28)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)'
  },
  tile16: {
    backgroundImage: 'linear-gradient(155deg,#ff8f66,#ff5229)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)'
  },
  tile32: {
    backgroundImage: 'linear-gradient(155deg,#ff6a80,#ff2d55)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)'
  },
  tile64: {
    backgroundImage: 'linear-gradient(155deg,#ef6fe2,#c22ede)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(203,48,224,.4)'
  },
  tile128: {
    backgroundImage: 'linear-gradient(155deg,#9185ff,#6155f5)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(97,85,245,.45)'
  },
  tile256: {
    backgroundImage: 'linear-gradient(155deg,#55b3ff,#0088ff)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(0,136,255,.45)'
  },
  tile512: {
    backgroundImage: 'linear-gradient(155deg,#40d8e4,#00a7c4)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 24px rgba(0,195,208,.5)'
  },
  tile1024: {
    backgroundImage: 'linear-gradient(155deg,#5bdc8f,#2fae55)',
    color: colors.white,
    textShadow: '0 1px 2px rgba(0,0,0,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 26px rgba(52,199,89,.5)'
  },
  tile2048: {
    backgroundImage: 'linear-gradient(115deg,#ffb300 0%,#ffe9a8 28%,#ffb300 55%,#ffd76a 82%,#ffb300 100%)',
    backgroundSize: '220% 100%',
    color: '#463300',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6),0 2px 7px rgba(0,0,0,.3),0 0 30px rgba(255,190,40,.6)',
    animationName: { default: sheen, [reduce]: 'none' },
    animationDuration: '2.4s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  }
})

export function tileGeometry(row: number, column: number, size: number) {
  const step = (size - BOARD_PAD * 2 - BOARD_GAP * (SIZE - 1)) / SIZE
  return {
    x: BOARD_PAD + column * (step + BOARD_GAP),
    y: BOARD_PAD + row * (step + BOARD_GAP),
    size: step
  }
}

// Digit-aware type: the numeral fits the tile, not the other way around.
export function tileFont(value: number, size: number) {
  const digits = String(value).length
  const ratio = digits <= 2 ? 0.44 : digits === 3 ? 0.34 : 0.26
  return Math.round(size * ratio)
}

const TILE_STYLES: Record<number, StyleXStyles> = {
  2: styles.tile2,
  4: styles.tile4,
  8: styles.tile8,
  16: styles.tile16,
  32: styles.tile32,
  64: styles.tile64,
  128: styles.tile128,
  256: styles.tile256,
  512: styles.tile512,
  1024: styles.tile1024,
  2048: styles.tile2048
}

export function tileStyle(value: number) {
  return TILE_STYLES[value] ?? styles.tile2048
}
