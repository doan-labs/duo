import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { paddingBottom: 0 },
  hdr: { color: appAppearance.youtubeBackgroundColor, backgroundColor: appAppearance.walletColor }
})
