import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  scs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 14,
    paddingInline: 16,
    paddingBottom: 20
  },
  sc: {
    position: 'relative',
    borderRadius: appAppearance.messagesFontSize,
    paddingTop: 13,
    paddingRight: 13,
    paddingBottom: 13,
    paddingLeft: 13,
    minHeight: 92,
    color: colors.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    textAlign: 'left',
    overflow: 'hidden',
    transitionProperty: 'transform',
    transitionDuration: '.18s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  bg: (img: string) => ({ backgroundImage: img }),
  glyph: { fontSize: appAppearance.mailFontSize },
  name: { fontSize: appAppearance.musicBorderRadius, fontWeight: appAppearance.musicFontWeight2 },
  ok: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.cameraBackgroundColor3,
    fontSize: appAppearance.shortcutsFontSize,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  okOn: { opacity: 1 },
  hdrSm: { fontSize: appAppearance.musicFontSize5 }
})
