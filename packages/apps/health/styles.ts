import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })

export const styles = stylex.create({
  date: { paddingInline: 16, paddingBottom: 12 },
  chev: { marginLeft: 'auto', color: colors.grey3, fontWeight: 400 },
  line: { width: '100%', height: 70, marginTop: 6 },
  draw: {
    strokeDasharray: 2400,
    strokeDashoffset: 2400,
    animationName: draw,
    animationDuration: '1.2s',
    animationTimingFunction: 'cubic-bezier(.3,.9,.3,1)',
    animationFillMode: 'forwards'
  }
})
