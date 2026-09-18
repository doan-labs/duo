import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  tint: (bg: string) => ({ backgroundColor: bg }),
  avatar: { width: 44, height: 44, borderRadius: appAppearance.settingsBorderRadius },
  name: { fontWeight: appAppearance.musicFontWeight2 }
})
