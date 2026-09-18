import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })

export const styles = stylex.create({
  date: { paddingInline: 16, paddingBottom: 12 },
  chev: { marginLeft: 'auto', color: colors.grey3, fontWeight: appAppearance.calendarFontWeight },
  line: { width: '100%', height: 70, marginTop: 6 },
  draw: {
    strokeDasharray: 2400,
    strokeDashoffset: 2400,
    animationName: draw,
    animationDuration: '1.2s',
    animationTimingFunction: appAppearance.healthAnimationTimingFunction,
    animationFillMode: 'forwards'
  }
})
