import { colors, leading, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    paddingTop: 2,
    paddingBottom: 10
  },
  legendVal: {
    display: 'block',
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    fontWeight: weight.semibold
  },
  dim: { opacity: 0.6 },
  tint: (c: string) => ({ color: c }),
  hdrSm: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
  workout: { display: 'flex', gap: 12, alignItems: 'center' },
  // The workout glyph is an emoji, so it is sized like a title, not like text.
  emoji: { fontSize: typeScale.title1, lineHeight: 1 },
  name: { fontWeight: weight.semibold },
  chev: { marginLeft: 'auto', color: colors.grey }
})
