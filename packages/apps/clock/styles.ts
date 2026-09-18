import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  row: { backgroundColor: colors.darkElevated, borderBottomColor: appAppearance.calculatorBackgroundColor },
  time: { fontSize: appAppearance.mailFontSize, color: colors.white }
})
