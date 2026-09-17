import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  // width/height are not optional: a canvas is a replaced element, and inset:0
  // leaves a replaced box at its intrinsic 300x150 instead of stretching.
  pad: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    backgroundColor: colors.white,
    touchAction: 'none',
    cursor: 'crosshair'
  },
  tools: {
    position: 'absolute',
    left: '50%',
    bottom: 18,
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 9,
    paddingBlock: 9,
    paddingInline: 13,
    borderRadius: 24,
    backgroundColor: 'rgba(250,250,252,.9)',
    boxShadow: '0 8px 22px rgba(0,0,0,.2)',
    zIndex: 3,
    backdropFilter: 'blur(14px)'
  },
  tool: {
    width: 26,
    height: 26,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: '50%',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: '0 1px 4px rgba(0,0,0,.3)',
    transitionProperty: 'transform',
    transitionDuration: '.18s'
  },
  tint: (c: string) => ({ backgroundColor: c }),
  on: { transform: 'scale(1.24)' },
  glyph: { display: 'grid', placeItems: 'center', color: colors.black },
  width: { backgroundColor: colors.white, fontSize: 13, fontWeight: 700 },
  undo: { backgroundColor: colors.trackLight, fontSize: 14 },
  clear: { backgroundColor: colors.red, color: colors.white }
})
