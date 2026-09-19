import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { SIZE } from './game.ts'

export const BOARD_PAD = 7
export const BOARD_GAP = 6
export const SLIDE_MS = 120
const motion = '@media (prefers-reduced-motion: reduce)'

// Why only a spawn keyframe: merged tiles show no pop at all, they just
// arrive with the new value. Spawns fade in once at mount.
export const tileSpawn = stylex.keyframes({
  from: { opacity: 0, scale: '.6' },
  to: { opacity: 1, scale: '1' }
})

const messageIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(.98)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBlock: 14,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: colors.darkElevated,
    fontFamily: fonts.system,
    fontSize: 14
  },
  cover: { paddingBlock: 10, paddingInline: 10, gap: 6 },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexShrink: 0 },
  kicker: { color: colors.orange, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 42, lineHeight: 0.95, fontWeight: 800, letterSpacing: -2 },
  scores: { display: 'flex', gap: 6 },
  score: {
    minWidth: 52,
    paddingBlock: 6,
    paddingInline: 8,
    borderRadius: 8,
    color: colors.grey3,
    backgroundColor: colors.fillDark,
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 1
  },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: 12, flexShrink: 0 },
  board: {
    position: 'relative',
    paddingBlock: BOARD_PAD,
    paddingInline: BOARD_PAD,
    borderRadius: 14,
    backgroundColor: colors.fillDark,
    touchAction: 'none',
    overflow: 'hidden',
    flexShrink: 0
  },
  fitBoard: (size: number) => ({ width: `${size}px`, height: `${size}px`, alignSelf: 'center' }),
  cell: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 8,
    backgroundColor: colors.fillThin
  },
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    color: colors.white,
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1,
    minWidth: 0,
    minHeight: 0,
    transitionProperty: 'transform, background-color, color',
    transitionDuration: `${SLIDE_MS}ms, .18s, .18s`,
    transitionTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    willChange: 'transform'
  },
  tileSpawned: {
    animationName: { default: tileSpawn, [motion]: 'none' },
    animationDuration: '.18s',
    animationTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    animationFillMode: 'both'
  },
  compact: { fontSize: 18 },
  tileEmpty: { backgroundColor: colors.fillThin },
  tile2: { backgroundColor: colors.grey3, color: colors.darkElevated },
  tile4: { backgroundColor: colors.weatherSun, color: colors.darkElevated },
  tile8: { backgroundColor: colors.orange },
  tile16: { backgroundColor: colors.red },
  tile32: { backgroundColor: colors.pink },
  tile64: { backgroundColor: colors.purple },
  tile128: { backgroundColor: colors.indigo },
  tile256: { backgroundColor: colors.blue },
  tile512: { backgroundColor: colors.teal },
  tile1024: { backgroundColor: colors.green },
  tile2048: { backgroundColor: colors.yellow, color: colors.darkElevated },
  controls: { display: 'grid', justifyContent: 'center', gap: 6, flexShrink: 0 },
  fitControls: (size: number) => ({
    gridTemplateColumns: `repeat(3, ${size}px)`,
    gridTemplateRows: `repeat(2, ${size}px)`
  }),
  arrow: {
    borderWidth: 0,
    borderRadius: 12,
    color: colors.white,
    backgroundColor: colors.fillDark,
    fontSize: 23,
    cursor: 'pointer',
    touchAction: 'manipulation',
    paddingBlock: 0,
    paddingInline: 0,
    gridRow: 2,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.94)' }
  },
  fitArrow: (size: number) => ({ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(16, size * 0.6)}px` }),
  up: { gridColumn: 2, gridRow: 1 },
  newGame: {
    alignSelf: 'center',
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 8,
    paddingInline: 16,
    color: colors.white,
    backgroundColor: colors.orange,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
  },
  message: {
    position: 'absolute',
    insetInline: 12,
    bottom: 12,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBlock: 10,
    paddingInline: 14,
    borderRadius: 12,
    color: colors.white,
    backgroundColor: colors.fillDark,
    animationName: { default: messageIn, [motion]: 'none' },
    animationDuration: '.22s',
    animationTimingFunction: 'cubic-bezier(.23, 1, .32, 1)',
    animationFillMode: 'both'
  },
  continue: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 6,
    paddingInline: 10,
    color: colors.darkElevated,
    backgroundColor: colors.yellow,
    fontWeight: 700,
    cursor: 'pointer',
    transitionProperty: 'transform, background-color',
    transitionDuration: '.14s, .18s',
    transform: { default: 'scale(1)', ':active': 'scale(.96)' }
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

const TILE_STYLES = {
  0: styles.tileEmpty,
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
} as Record<number, typeof styles.tileEmpty>

export function tileStyle(value: number) {
  return TILE_STYLES[value] ?? styles.tile2048
}
