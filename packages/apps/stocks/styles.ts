import { app, colors, easing, radius, space, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local, not shared's: the StyleX compiler only follows keyframes imported from
// a `.stylex.ts` module, and uikit/styles.ts is not one.
const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })

export const styles = stylex.create({
  tik: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBlock: 10,
    paddingInline: space.lg,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    cursor: 'pointer'
  },
  nm: { flexGrow: 1, minWidth: 0 },
  symbol: { fontWeight: weight.semibold, display: 'block' },
  right: { textAlign: 'right', width: 78 },
  price: { fontWeight: weight.semibold },
  /** The percent chip: the delta's own colour, footnote numerals. */
  chip: {
    textAlign: 'center',
    paddingBlock: space.xxs,
    paddingInline: 6,
    marginTop: space.xxs,
    borderRadius: radius.sm,
    fontWeight: weight.semibold,
    color: colors.white,
    backgroundColor: colors.greenDark,
    flexShrink: 0
  },
  dn: { backgroundColor: colors.redDark },
  spark: { flexShrink: 0 },
  size: (w: number, ht: number) => ({ width: w, height: ht }),
  draw: {
    strokeDasharray: '2400',
    strokeDashoffset: '2400',
    animationName: draw,
    animationDuration: '1.2s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'forwards'
  },
  quote: { paddingInline: 18, paddingBottom: 6 },
  bigPrice: { marginTop: 10 },
  delta: { color: colors.greenDark, fontWeight: weight.semibold },
  deltaDn: { color: colors.redDark },
  chart: { paddingBlock: 14, paddingInline: space.md },
  ranges: { display: 'flex', justifyContent: 'space-around', paddingInline: space.md, paddingBottom: space.lg },
  pillOn: { backgroundColor: app.link, color: colors.white },
  /** A stat's value reads at full strength, not as the row's trailing detail. */
  value: { color: app.fg }
})
