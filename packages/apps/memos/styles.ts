import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const glow = stylex.keyframes({ '50%': { opacity: 0.55 } })

export const styles = stylex.create({
  deck: { paddingTop: 6, paddingInline: 10 },
  wave: { width: '100%', height: 78, display: 'block' },
  clock: { textAlign: 'center', fontSize: appAppearance.musicFontSize, opacity: 0.6, letterSpacing: 1 },
  rec: {
    width: 62,
    height: 62,
    paddingBlock: 0,
    paddingInline: 0,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: colors.white,
    display: 'grid',
    placeItems: 'center',
    marginTop: 6,
    marginInline: 'auto',
    cursor: 'pointer'
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: colors.redBright,
    transitionProperty: 'border-radius, width, height',
    transitionDuration: '.25s'
  },
  dotOn: {
    borderRadius: appAppearance.memosBorderRadius,
    width: 22,
    height: 22,
    animationName: glow,
    animationDuration: '1.4s',
    animationIterationCount: 'infinite'
  },
  note: { paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 10 },
  hdrSm: { fontSize: appAppearance.musicFontSize5, marginTop: 8 },
  grow: { flexGrow: 1 },
  name: { fontWeight: appAppearance.musicFontWeight2 },
  darkRow: {
    backgroundColor: appAppearance.memosBackgroundColor,
    borderBottomColor: appAppearance.musicBorderBottomColor
  }
})
