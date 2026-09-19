import {
  appAppearance,
  colors,
  easing,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local, not shared's: the StyleX compiler only follows keyframes imported from
// a `.stylex.ts` module, and uikit/styles.ts is not one.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

export const styles = stylex.create({
  acc: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: radius.xl,
    paddingBlock: 12,
    paddingInline: 12,
    minHeight: 88,
    backgroundColor: appAppearance.homeFill,
    cursor: 'pointer',
    color: colors.white,
    transitionProperty: 'background-color, box-shadow, color',
    transitionDuration: '.3s, .35s, .3s'
  },
  accOn: { backgroundColor: colors.white, color: appAppearance.homeInk },
  glow: (g: string) => ({ boxShadow: `0 0 28px -2px ${g}` }),
  accTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  glyph: { fontSize: typeScale.body, lineHeight: leading.body, letterSpacing: tracking.body },
  fan: {
    animationName: spin,
    animationDuration: '1.1s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },
  t: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  st: { fontSize: typeScale.caption2, lineHeight: leading.caption2, letterSpacing: tracking.caption2, opacity: 0.6 },
  accs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))',
    gap: 10,
    paddingInline: 16,
    paddingBottom: 16
  },
  dialw: { position: 'relative', display: 'grid', placeItems: 'center', paddingTop: 8, paddingBottom: 18 },
  dialSvg: { width: 130, height: 130, transform: 'rotate(135deg)' },
  // The temperature is an oversized numeral: solid leading, thin weight.
  read: { position: 'absolute', fontSize: typeScale.display, lineHeight: 1, fontWeight: weight.thin },
  center: { textAlign: 'center' },
  caption: { marginTop: -6 },
  hdr18: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 }
})
