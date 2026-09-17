import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

export const styles = stylex.create({
  row: { backgroundColor: colors.darkElevated, borderBottomColor: '#333' },
  time: { fontSize: 22, color: colors.white }
})
