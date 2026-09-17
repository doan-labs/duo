import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

export const styles = stylex.create({
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    fontSize: 12,
    paddingTop: 2,
    paddingBottom: 10
  },
  legendVal: { display: 'block', fontSize: 16, fontWeight: 600 },
  dim: { opacity: 0.6 },
  tint: (c: string) => ({ color: c }),
  hdrSm: { fontSize: 18 },
  workout: { display: 'flex', gap: 12, alignItems: 'center' },
  emoji: { fontSize: 26 },
  name: { fontWeight: 600 },
  chev: { marginLeft: 'auto', color: colors.grey }
})
