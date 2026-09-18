import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.musicBorderBottomColor,
    cursor: 'pointer'
  },
  nm: { flexGrow: 1, minWidth: 0 },
  symbol: { fontSize: appAppearance.calendarFontSize, fontWeight: appAppearance.musicFontWeight2, display: 'block' },
  right: { textAlign: 'right', width: 78 },
  price: { fontWeight: appAppearance.musicFontWeight2 },
  chip: {
    textAlign: 'center',
    paddingBlock: 2,
    paddingInline: 6,
    marginTop: 2,
    borderRadius: appAppearance.musicBorderRadius4,
    fontSize: appAppearance.calendarFontSize2,
    fontWeight: appAppearance.musicFontWeight2,
    color: colors.white,
    backgroundColor: colors.greenBright,
    flexShrink: 0
  },
  dn: { backgroundColor: colors.redBright },
  spark: { flexShrink: 0 },
  size: (w: number, ht: number) => ({ width: w, height: ht }),
  draw: {
    strokeDasharray: '2400',
    strokeDashoffset: '2400',
    animationName: draw,
    animationDuration: '1.2s',
    animationTimingFunction: appAppearance.healthAnimationTimingFunction,
    animationFillMode: 'forwards'
  },
  hdr17: { fontSize: appAppearance.messagesFontSize },
  quote: { paddingInline: 18, paddingBottom: 6 },
  ticker: { fontSize: appAppearance.stocksFontSize, fontWeight: appAppearance.musicFontWeight },
  bigPrice: { fontSize: appAppearance.calculatorBorderRadius, fontWeight: appAppearance.homeFontWeight, marginTop: 10 },
  delta: { color: colors.greenBright, fontWeight: appAppearance.musicFontWeight2 },
  deltaDn: { color: colors.redBright },
  chart: { paddingBlock: 14, paddingInline: 12 },
  ranges: { display: 'flex', justifyContent: 'space-around', paddingInline: 12, paddingBottom: 16 },
  pillOn: { backgroundColor: colors.blueDark, color: colors.white },
  darkRow: {
    backgroundColor: appAppearance.musicBackgroundColor3,
    borderBottomColor: appAppearance.musicBorderBottomColor
  },
  white: { color: colors.white }
})
