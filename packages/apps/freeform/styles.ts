import {
  app,
  appAppearance,
  colors,
  glass,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    borderRadius: radius.xxl,
    backgroundColor: appAppearance.freeformPanel,
    boxShadow: shadow.float,
    zIndex: 3,
    backdropFilter: glass.blur
  },
  tool: {
    width: 26,
    height: 26,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: shadow.card,
    transitionProperty: 'transform',
    transitionDuration: '.18s'
  },
  tint: (c: string) => ({ backgroundColor: c }),
  on: { transform: 'scale(1.24)' },
  glyph: { display: 'grid', placeItems: 'center', color: colors.black },
  width: {
    backgroundColor: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.bold
  },
  undo: {
    backgroundColor: app.fill2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  clear: { backgroundColor: colors.red, color: colors.white }
})
