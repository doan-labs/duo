import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local, not shared's: the StyleX compiler only follows keyframes imported from
// a `.stylex.ts` module, and uikit/styles.ts is not one.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

export const styles = stylex.create({
  acc: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: appAppearance.musicFontSize5,
    paddingBlock: 12,
    paddingInline: 12,
    minHeight: 88,
    backgroundColor: appAppearance.homeBackgroundColor,
    cursor: 'pointer',
    color: colors.white,
    transitionProperty: 'background-color, box-shadow, color',
    transitionDuration: '.3s, .35s, .3s'
  },
  accOn: { backgroundColor: colors.white, color: appAppearance.homeColor4 },
  glow: (g: string) => ({ boxShadow: `0 0 28px -2px ${g}` }),
  accTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  glyph: { fontSize: appAppearance.musicFontSize2 },
  fan: {
    animationName: spin,
    animationDuration: '1.1s',
    animationTimingFunction: appAppearance.musicTransitionTimingFunction,
    animationIterationCount: 'infinite'
  },
  t: { fontSize: appAppearance.musicFontSize6, fontWeight: appAppearance.musicFontWeight2, lineHeight: 1.2 },
  st: { fontSize: appAppearance.musicFontSize3, opacity: 0.6 },
  accs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))',
    gap: 10,
    paddingInline: 16,
    paddingBottom: 16
  },
  dialw: { position: 'relative', display: 'grid', placeItems: 'center', paddingTop: 8, paddingBottom: 18 },
  dialSvg: { width: 130, height: 130, transform: 'rotate(135deg)' },
  read: { position: 'absolute', fontSize: appAppearance.homeFontSize, fontWeight: appAppearance.homeFontWeight },
  center: { textAlign: 'center' },
  caption: { marginTop: -6 },
  hdr18: { fontSize: appAppearance.musicFontSize5 }
})
