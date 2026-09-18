import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
    borderRadius: appAppearance.appstoreFontSize,
    backgroundColor: appAppearance.freeformBackgroundColor,
    boxShadow: appAppearance.freeformBoxShadow,
    zIndex: 3,
    backdropFilter: 'blur(14px)'
  },
  tool: {
    width: 26,
    height: 26,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: appAppearance.settingsBorderRadius,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.white,
    boxShadow: appAppearance.freeformBoxShadow2,
    transitionProperty: 'transform',
    transitionDuration: '.18s'
  },
  tint: (c: string) => ({ backgroundColor: c }),
  on: { transform: 'scale(1.24)' },
  glyph: { display: 'grid', placeItems: 'center', color: colors.black },
  width: {
    backgroundColor: colors.white,
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight
  },
  undo: { backgroundColor: colors.trackLight, fontSize: appAppearance.musicBorderRadius },
  clear: { backgroundColor: colors.red, color: colors.white }
})
