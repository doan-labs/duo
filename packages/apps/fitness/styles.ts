import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    fontSize: appAppearance.calendarFontSize2,
    paddingTop: 2,
    paddingBottom: 10
  },
  legendVal: { display: 'block', fontSize: appAppearance.calendarFontSize, fontWeight: appAppearance.musicFontWeight2 },
  dim: { opacity: 0.6 },
  tint: (c: string) => ({ color: c }),
  hdrSm: { fontSize: appAppearance.musicFontSize5 },
  workout: { display: 'flex', gap: 12, alignItems: 'center' },
  emoji: { fontSize: appAppearance.calculatorFontSize },
  name: { fontWeight: appAppearance.musicFontWeight2 },
  chev: { marginLeft: 'auto', color: colors.grey }
})
