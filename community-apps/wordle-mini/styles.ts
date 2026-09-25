import { easing, fonts, leading, space, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Animation pacing shared with main.tsx: the win hop waits until the last
// tile's flip has turned over.
export const FLIP_MS = 520
export const FLIP_STAGGER_MS = 80
export const WIN_STAGGER_MS = 60

const reduce = '@media (prefers-reduced-motion: reduce)'

// Pixel cabinet palette: phosphor green and amber on a navy night, cyan and
// magenta marquee accents. Literal colours are the arcade art (2048 does the
// same); token scales still own type, weight, easing and spacing.
const night = '#070914'
const panel = '#0d1020'
const ink = '#05060f'
const frame = '#39406b'
const frameDim = '#262a40'
const text = '#e8ecff'
const textDim = '#5f6ea6'
const phosphor = '#2fd35f'
const amber = '#ffb000'
const cyan = '#31c8f0'
const magenta = '#db34f2'

// Chunky block bevels: a light edge top-left, a dark edge bottom-right, all
// hard offsets with no blur so every block reads as raised pixels.
const bevel = (light: string, dark: string) => `inset -2px -2px 0 0 ${dark},inset 2px 2px 0 0 ${light}`

// Typed letters keep the original pop.
export const tileReveal = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(.86)' },
  '70%': { opacity: 1, transform: 'scale(1.04)' },
  to: { opacity: 1, transform: 'scale(1)' }
})

// Tile faces, kept next to the keyframes that swap between them: a flip turns
// the tile edge-on, swaps the face at the 50% mark where nothing is visible,
// and lands on the state colour. One element per tile, no back-face markup.
// Every face shares one box-shadow shape so the flip interpolates the bevel
// instead of popping it.
const emptyFace = {
  backgroundColor: '#12152a',
  borderColor: '#313a5c',
  color: text,
  boxShadow: bevel('rgba(255,255,255,.08)', 'rgba(0,0,0,.45)'),
  textShadow: '2px 2px 0 rgba(0,0,0,.4)'
}
const correctFace = {
  backgroundColor: phosphor,
  borderColor: '#8affab',
  color: '#04300f',
  boxShadow: `${bevel('rgba(255,255,255,.4)', 'rgba(6,60,22,.55)')},0 3px 0 rgba(0,0,0,.4)`,
  textShadow: '1px 1px 0 rgba(255,255,255,.3)'
}
const presentFace = {
  backgroundColor: amber,
  borderColor: '#ffd766',
  color: '#3a2600',
  boxShadow: `${bevel('rgba(255,255,255,.4)', 'rgba(90,55,0,.5)')},0 3px 0 rgba(0,0,0,.4)`,
  textShadow: '1px 1px 0 rgba(255,255,255,.35)'
}
const absentFace = {
  backgroundColor: '#191c2e',
  borderColor: frameDim,
  color: '#4d5578',
  boxShadow: bevel('rgba(255,255,255,.05)', 'rgba(0,0,0,.5)'),
  textShadow: '2px 2px 0 rgba(0,0,0,.4)'
}

const flipCorrect = stylex.keyframes({
  '0%': { transform: 'rotateX(0deg)', ...emptyFace },
  '45%': { transform: 'rotateX(-89deg)', ...emptyFace },
  '55%': { transform: 'rotateX(-89deg)', ...correctFace },
  '100%': { transform: 'rotateX(0deg)', ...correctFace }
})
const flipPresent = stylex.keyframes({
  '0%': { transform: 'rotateX(0deg)', ...emptyFace },
  '45%': { transform: 'rotateX(-89deg)', ...emptyFace },
  '55%': { transform: 'rotateX(-89deg)', ...presentFace },
  '100%': { transform: 'rotateX(0deg)', ...presentFace }
})
const flipAbsent = stylex.keyframes({
  '0%': { transform: 'rotateX(0deg)', ...emptyFace },
  '45%': { transform: 'rotateX(-89deg)', ...emptyFace },
  '55%': { transform: 'rotateX(-89deg)', ...absentFace },
  '100%': { transform: 'rotateX(0deg)', ...absentFace }
})

const winBounce = stylex.keyframes({
  '0%': { transform: 'translateY(0)' },
  '30%': { transform: 'translateY(-10px)' },
  '55%': { transform: 'translateY(2px)' },
  '75%': { transform: 'translateY(-4px)' },
  '100%': { transform: 'translateY(0)' }
})

const scorePop = stylex.keyframes({
  from: { opacity: 0.4, transform: 'translateY(6px) scale(.9)' },
  '60%': { opacity: 1, transform: 'translateY(-2px) scale(1.12)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})

const hintIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(4px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
})

const caretBlink = stylex.keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0 },
  '100%': { opacity: 0 }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingTop: space.lg,
    paddingInline: space.lg,
    // The home bar owns the bottom 22 px; the keyboard floats clear of it.
    paddingBottom: space.xxxl,
    color: text,
    backgroundColor: night,
    // Cabinet glow: magenta marquee spill up top, cyan off the control deck.
    backgroundImage:
      'radial-gradient(70% 45% at 20% 0%,rgba(219,52,242,.09),transparent 60%),radial-gradient(75% 40% at 85% 105%,rgba(49,200,240,.08),transparent 55%)',
    fontFamily: fonts.mono,
    fontSize: typeScale.subheadline
  },
  rootCover: { gap: space.xs, paddingTop: space.sm, paddingInline: space.md },
  // Scanlines and the tube vignette sit over the whole app like a CRT face.
  scanlines: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    backgroundImage:
      'repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px),radial-gradient(115% 90% at 50% 50%,transparent 58%,rgba(0,0,0,.42) 100%)'
  },
  // The header is the cabinet marquee: a framed name plate with a hard drop.
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    flexShrink: 0,
    boxSizing: 'border-box',
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: frame,
    backgroundColor: panel,
    boxShadow: `0 4px 0 ${ink},inset 0 0 0 2px ${ink}`
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: space.sm },
  kicker: {
    color: cyan,
    fontSize: 9,
    fontWeight: weight.bold,
    letterSpacing: 2,
    textShadow: '1px 1px 0 rgba(0,0,0,.6)'
  },
  session: { color: magenta, fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.6 },
  title: {
    marginBlock: 0,
    fontFamily: fonts.mono,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    fontWeight: weight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadow: '3px 3px 0 rgba(0,0,0,.65),-1px -1px 0 rgba(255,255,255,.08)'
  },
  titleCover: { fontSize: typeScale.title1, lineHeight: leading.title1 },
  // The turns chip is the credit readout: amber digits in a dark LED frame.
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    minWidth: 52,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: frameDim,
    backgroundColor: ink,
    boxShadow: 'inset 0 2px 0 rgba(0,0,0,.6)'
  },
  chipLabel: { color: cyan, fontSize: 8, fontWeight: weight.bold, letterSpacing: 1.6 },
  chipValue: {
    fontFamily: fonts.mono,
    color: amber,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 0 6px rgba(255,176,0,.45)'
  },
  chipPop: {
    animationName: { default: scorePop, [reduce]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  hint: {
    marginBlock: 0,
    color: textDim,
    fontSize: typeScale.caption1,
    flexShrink: 0,
    animationName: { default: hintIn, [reduce]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  hintWon: { color: phosphor },
  hintLost: { color: amber },
  // A solid block cursor blinking after the hint, like a CRT prompt.
  caret: {
    display: 'inline-block',
    width: '.58em',
    height: '1em',
    marginLeft: '.3em',
    verticalAlign: 'text-bottom',
    backgroundColor: cyan,
    animationName: { default: caretBlink, [reduce]: 'none' },
    animationDuration: '1.06s',
    animationTimingFunction: 'steps(1,end)',
    animationIterationCount: 'infinite'
  },
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg
  },
  stageWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: space.lg
  },
  // The board is a dark screen sunk into the cabinet, dithered like old glass.
  board: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: frame,
    backgroundColor: '#05070f',
    backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,.025) 0% 25%,transparent 0% 50%)',
    backgroundSize: '4px 4px',
    boxShadow: `inset 0 4px 0 rgba(0,0,0,.55),0 4px 0 ${ink}`,
    flexShrink: 0
  },
  fitBoard: (pad: number) => ({ padding: `${pad}px`, gap: `${pad / 2}px` }),
  row: { display: 'flex', gap: 0, perspective: '500px' },
  fitRow: (gap: number) => ({ gap: `${gap}px` }),
  tile: {
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#313a5c',
    backgroundColor: '#12152a',
    // A single lit pixel centres every empty cell.
    backgroundImage: 'linear-gradient(#2e3352,#2e3352)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: '4px 4px',
    color: text,
    fontFamily: fonts.mono,
    fontWeight: weight.bold,
    transitionProperty: 'transform, background-color, border-color, color',
    transitionDuration: '.16s, .2s, .2s, .2s',
    transitionTimingFunction: easing.push
  },
  fitTile: (size: number, font: number) => ({
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${font}px`
  }),
  filled: {
    borderColor: '#7c86c0',
    backgroundColor: '#1a1f38',
    animationName: { default: tileReveal, [reduce]: 'none' },
    animationDuration: '.2s',
    animationTimingFunction: easing.push,
    animationFillMode: 'both'
  },
  flipCorrect: {
    animationName: { default: flipCorrect, [reduce]: 'none' },
    animationDuration: `${FLIP_MS}ms`,
    // Stepped timing chops the flip into a handful of frames, like a sprite.
    animationTimingFunction: 'steps(6)',
    animationFillMode: 'both'
  },
  flipPresent: {
    animationName: { default: flipPresent, [reduce]: 'none' },
    animationDuration: `${FLIP_MS}ms`,
    animationTimingFunction: 'steps(6)',
    animationFillMode: 'both'
  },
  flipAbsent: {
    animationName: { default: flipAbsent, [reduce]: 'none' },
    animationDuration: `${FLIP_MS}ms`,
    animationTimingFunction: 'steps(6)',
    animationFillMode: 'both'
  },
  flipDelay: (column: number) => ({ animationDelay: `${column * FLIP_STAGGER_MS}ms` }),
  winLetter: (delay: number) => ({
    display: 'inline-block',
    animationName: { default: winBounce, [reduce]: 'none' },
    animationDuration: '.5s',
    animationDelay: `${delay}ms`,
    animationTimingFunction: 'steps(6)',
    animationFillMode: 'both'
  }),
  correct: correctFace,
  present: presentFace,
  absent: absentFace,
  // The control deck: a solid panel, not glass, lifted off the night by one
  // hard drop shadow.
  keyboard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: frame,
    backgroundColor: panel,
    boxShadow: `0 4px 0 ${ink},inset 0 2px 0 rgba(255,255,255,.05)`
  },
  fitKeyboard: (pad: number, gap: number) => ({ padding: `${pad}px`, gap: `${gap}px` }),
  keyRow: { display: 'flex', gap: 0, justifyContent: 'center' },
  fitKeyRow: (gap: number) => ({ gap: `${gap}px` }),
  // Keys are chunky buttons: a lit top edge, a 3 px black base that the press
  // eats into until the key sits flush.
  key: {
    borderWidth: 0,
    borderRadius: 0,
    paddingBlock: 0,
    paddingInline: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: text,
    backgroundColor: { default: '#1c2138', ':hover': '#252b48' },
    boxShadow: {
      default: `inset 0 2px 0 #39406b,0 3px 0 ${ink}`,
      ':active': `inset 0 2px 0 #39406b,0 0 0 ${ink}`
    },
    fontFamily: fonts.mono,
    fontWeight: weight.bold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    textShadow: '2px 2px 0 rgba(0,0,0,.4)',
    transitionProperty: 'transform, background-color, color, box-shadow',
    transitionDuration: '.15s, .22s, .22s, .22s',
    transitionTimingFunction: easing.pop,
    transform: { default: 'translateY(0)', ':active': 'translateY(3px)' }
  },
  fitKey: (width: number, height: number, font: number) => ({
    width: `${width}px`,
    height: `${height}px`,
    fontSize: `${font}px`
  }),
  fitKeyWide: (width: number) => ({ width: `${width}px` }),
  // ENTER and delete wear the magenta marquee accent instead of deck grey.
  keyAction: {
    fontSize: typeScale.caption2,
    letterSpacing: 0.5,
    color: '#f0a9ff',
    backgroundColor: { default: '#33203f', ':hover': '#41284f' },
    boxShadow: {
      default: `inset 0 2px 0 #8b3aa8,0 3px 0 ${ink}`,
      ':active': `inset 0 2px 0 #8b3aa8,0 0 0 ${ink}`
    }
  },
  keyCorrect: {
    backgroundColor: phosphor,
    color: '#04300f',
    textShadow: '1px 1px 0 rgba(255,255,255,.3)',
    boxShadow: {
      default: 'inset 0 2px 0 #8affab,0 3px 0 #063c16',
      ':active': 'inset 0 2px 0 #8affab,0 0 0 #063c16'
    }
  },
  keyPresent: {
    backgroundColor: amber,
    color: '#3a2600',
    textShadow: '1px 1px 0 rgba(255,255,255,.35)',
    boxShadow: {
      default: 'inset 0 2px 0 #ffd766,0 3px 0 #5a3700',
      ':active': 'inset 0 2px 0 #ffd766,0 0 0 #5a3700'
    }
  },
  keyAbsent: {
    backgroundColor: '#12152a',
    color: '#3a4160',
    textShadow: 'none',
    boxShadow: {
      default: `inset 0 2px 0 ${frameDim},0 3px 0 ${ink}`,
      ':active': `inset 0 2px 0 ${frameDim},0 0 0 ${ink}`
    }
  }
})
