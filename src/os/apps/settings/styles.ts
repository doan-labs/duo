import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  tint: (bg: string) => ({ backgroundColor: bg }),
  avatar: { width: 44, height: 44, borderRadius: '50%' },
  name: { fontWeight: 600 }
})
