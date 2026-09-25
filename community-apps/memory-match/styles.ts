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
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import type { StyleXStyles } from '@stylexjs/stylex'
import * as stylex from '@stylexjs/stylex'

export const BOARD_PAD = 8
export const BOARD_GAP = 8

const reduce = '@media (prefers-reduced-motion: reduce)'

// The cabinet's own palette: a deep graphite shell under a violet haze, with a
// neon face per pair. Token scales own space, radius, type, weight, easing and
// shadow; these hues are the game's identity, the way 2048 owns its tiles.
const cabinet = '#17171b'
const haze =
  'radial-gradient(85% 55% at 50% 0%,rgba(219,52,242,.09),transparent 62%),radial-gradient(70% 50% at 50% 108%,rgba(97,85,245,.08),transparent 60%)'
const well = 'rgba(0,0,0,.34)'
const wellShade =
  'inset 0 2px 14px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(255,255,255,.08),inset 0 -1px 0 rgba(255,255,255,.04)'
const cardBack = 'linear-gradient(160deg,#2b2b34,#1e1e25)'
const cardBackLit = 'linear-gradient(160deg,#34343f,#26262e)'
const cardFace = 'linear-gradient(160deg,#fbfbfe,#dcdde6)'
const cardRim = 'inset 0 1px 0 rgba(255,255,255,.1),0 2px 6px rgba(0,0,0,.28)'
// Why the :hover twin: the face-down card lights up on hover, and StyleX keeps
// a condition unless it is overridden, so every revealed face must hold its own
// gradient on hover or a matched card would flash the dark back.
const faceApple = 'linear-gradient(155deg,#ff8f66,#ff2d55)'
const faceMoon = 'linear-gradient(155deg,#9185ff,#6155f5)'
const faceStar = 'linear-gradient(155deg,#ffeab0,#ffc53a)'
const faceRainbow = 'linear-gradient(155deg,#ef6fe2,#c22ede)'
const faceNote = 'linear-gradient(155deg,#40d8e4,#00a7c4)'
const faceRocket = 'linear-gradient(155deg,#ffb262,#ff8d28)'
// The tracking scale has no wide-tracked step; the kickers and the logo carry
// their own tracking the way the arcade print always has.
const trackKicker = '1.4px'
const trackLogo = '-0.5px'

const cardReveal = stylex.keyframes({
  '0%': { opacity: 0.4, transform: 'perspective(500px) rotateY(-80deg) scale(.94)' },
  '60%': { opacity: 1, transform: 'perspective(500px) rotateY(10deg) scale(1.02)' },
  '100%': { opacity: 1, transform: 'perspective(500px) rotateY(0) scale(1)' }
})
const matchPulse = stylex.keyframes({
  '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
  '40%': { transform: 'scale(1.14)', filter: 'brightness(1.25)' },
  '100%': { transform: 'scale(1)', filter: 'brightness(1)' }
})
const missShake = stylex.keyframes({
  '0%,100%': { transform: 'translateX(0)' },
  '20%': { transform: 'translateX(-6px)' },
  '45%': { transform: 'translateX(5px)' },
  '70%': { transform: 'translateX(-3px)' }
})
const celebratePop = stylex.keyframes({
  '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
  '45%': { transform: 'scale(1.12) rotate(-3deg)', filter: 'brightness(1.3)' },
  '100%': { transform: 'scale(1)', filter: 'brightness(1)' }
})
const tagIn = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(6px) scale(.9)' },
  '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const boardGlow = stylex.keyframes({
  '0%,100%': { boxShadow: `${wellShade},0 0 0 rgba(255,204,0,0)` },
  '50%': { boxShadow: `${wellShade},0 0 38px rgba(255,204,0,.28)` }
})
const logoTip = stylex.keyframes({
  '0%,100%': { rotate: '-5deg' },
  '50%': { rotate: '-9deg' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingTop: space.lg,
    // The home bar owns the bottom 22 px; this pad keeps New game clear of it.
    paddingBottom: space.xxxl,
    paddingInline: space.xl,
    color: colors.white,
    backgroundColor: cabinet,
    backgroundImage: haze,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  rootCover: { gap: space.xs, paddingTop: space.md, paddingInline: space.lg },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    flexShrink: 0
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: colors.purpleDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: trackKicker
  },
  logo: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.largeTitle,
    lineHeight: 1,
    fontWeight: weight.bold,
    letterSpacing: trackLogo,
    whiteSpace: 'nowrap'
  },
  logoCover: { fontSize: typeScale.title1 },
  logoTile: {
    display: 'inline-block',
    marginLeft: space.xs,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    borderRadius: radius.md,
    color: '#3d003d',
    backgroundImage: 'linear-gradient(150deg,#f18bff,#cb30e0)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5),0 3px 12px rgba(219,52,242,.4)',
    rotate: '-5deg',
    animationName: { default: logoTip, [reduce]: 'none' },
    animationDuration: '3.6s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  scores: { display: 'flex', gap: space.sm, flexShrink: 0 },
  chip: {
    position: 'relative',
    minWidth: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  chipLabel: { color: app.label2, fontSize: typeScale.caption2, fontWeight: weight.bold, letterSpacing: trackKicker },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    minWidth: space.xl,
    textAlign: 'center'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: space.lg
  },
  stageCover: { flexDirection: 'column', gap: space.md },
  // The board is a well punched into the cabinet: dark, inset, soft top catch.
  board: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
    gap: BOARD_GAP,
    padding: BOARD_PAD,
    borderRadius: radius.xxl,
    backgroundColor: well,
    backgroundImage: 'linear-gradient(180deg,rgba(0,0,0,.16),transparent 38%)',
    boxShadow: wellShade,
    flexShrink: 0
  },
  boardWin: {
    animationName: { default: boardGlow, [reduce]: 'none' },
    animationDuration: '1.6s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  fitBoard: (width: number, height: number) => ({ width: `${width}px`, height: `${height}px` }),
  card: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    borderRadius: radius.lg,
    color: 'rgba(255,255,255,.3)',
    backgroundImage: { default: cardBack, ':hover': cardBackLit },
    boxShadow: cardRim,
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    transitionProperty: 'transform, background-color, box-shadow',
    transitionDuration: `${motion.pressDuration}, .2s, .3s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.purpleDark}`, outlineOffset: 3 }
  },
  cardOpen: {
    color: colors.grey6Dark,
    backgroundImage: { default: cardFace, ':hover': cardFace },
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7),0 2px 8px rgba(0,0,0,.35)',
    animationName: { default: cardReveal, [reduce]: 'none' },
    animationDuration: '.28s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  // A missed pair shakes while it is still face-up, before the hide.
  cardMiss: {
    animationName: { default: missShake, [reduce]: 'none' },
    animationDuration: '.3s',
    animationDelay: '.1s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  cardMatched: {
    animationName: { default: matchPulse, [reduce]: 'none' },
    animationDuration: '.44s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  cardCelebrate: {
    animationName: { default: celebratePop, [reduce]: 'none' },
    animationDuration: '.5s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  // The cleared board waves once across the grid, one beat per card.
  stagger: (index: number) => ({ animationDelay: `${index * 45}ms` }),
  cardFont: (px: number) => ({ fontSize: `${px}px` }),
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: space.md,
    minWidth: 0,
    flexShrink: 0
  },
  railCover: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  railStats: { display: 'flex', flexDirection: 'column', gap: space.sm },
  railStatsCover: { flexDirection: 'row', gap: space.sm },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    minWidth: 60,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderRadius: radius.lg,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`
  },
  statLabel: { color: app.label2, fontSize: typeScale.caption2, fontWeight: weight.bold, letterSpacing: trackKicker },
  statValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center'
  },
  pips: { display: 'flex', justifyContent: 'center', gap: space.xs, paddingBlock: space.xxs },
  pip: {
    width: space.sm,
    height: space.sm,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(255,255,255,.14)'
  },
  pipOn: { backgroundColor: colors.purpleDark, boxShadow: '0 0 8px rgba(219,52,242,.55)' },
  newGame: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderWidth: 0,
    borderRadius: radius.pill,
    paddingBlock: space.sm,
    paddingInline: space.lg,
    color: colors.white,
    backgroundColor: { default: 'rgba(255,255,255,.1)', ':hover': 'rgba(255,255,255,.16)' },
    boxShadow: 'inset 0 0 0 .5px rgba(255,255,255,.16)',
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: `${motion.pressDuration}, .18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 3 }
  },
  hint: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.caption1,
    textAlign: 'center',
    lineHeight: leading.caption1
  },
  bestTag: {
    alignSelf: 'center',
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    borderRadius: radius.pill,
    color: '#463300',
    backgroundImage: 'linear-gradient(150deg,#ffe08e,#ffb400)',
    boxShadow: '0 3px 10px rgba(255,170,0,.35)',
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: trackKicker,
    animationName: { default: tagIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  // Face gradients, one per pair, the way 2048 paints its tile values.
  faceApple: {
    backgroundImage: { default: faceApple, ':hover': faceApple },
    color: colors.white,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 20px rgba(255,45,85,.45)'
  },
  faceMoon: {
    backgroundImage: { default: faceMoon, ':hover': faceMoon },
    color: colors.white,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(97,85,245,.45)'
  },
  faceStar: {
    backgroundImage: { default: faceStar, ':hover': faceStar },
    color: '#57400a',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(255,180,0,.45)'
  },
  faceRainbow: {
    backgroundImage: { default: faceRainbow, ':hover': faceRainbow },
    color: colors.white,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(203,48,224,.4)'
  },
  faceNote: {
    backgroundImage: { default: faceNote, ':hover': faceNote },
    color: colors.white,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 24px rgba(0,195,208,.5)'
  },
  faceRocket: {
    backgroundImage: { default: faceRocket, ':hover': faceRocket },
    color: colors.white,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.38),0 2px 7px rgba(0,0,0,.3),0 0 22px rgba(255,141,40,.45)'
  }
})

const FACE_STYLES: Record<string, StyleXStyles> = {
  '🍎': styles.faceApple,
  '🌙': styles.faceMoon,
  '⭐': styles.faceStar,
  '🌈': styles.faceRainbow,
  '🎵': styles.faceNote,
  '🚀': styles.faceRocket
}

export function faceStyle(symbol: string) {
  return FACE_STYLES[symbol] ?? null
}
