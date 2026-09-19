import { colors, leading, tracking, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  // Clock runs dark on its own black root, so the grouped row takes the dark
  // surface and separator greys directly rather than the light `app` defaults.
  row: { backgroundColor: colors.grey6Dark, borderBottomColor: colors.grey4Dark },
  time: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    color: colors.white
  }
})
