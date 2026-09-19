import {
  appAppearance,
  colors,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  logo: { width: 26, height: 26 },
  sm: { opacity: 1 },
  player: { aspectRatio: '16/9', flexShrink: 0, backgroundColor: colors.black },
  vid: { display: 'flex', flexDirection: 'column', gap: 8, paddingBlock: 10, paddingInline: 12, cursor: 'pointer' },
  thumb: {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover',
    borderRadius: radius.lg,
    display: 'block'
  },
  t: {
    fontWeight: weight.semibold,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  c: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    color: appAppearance.youtubeMuted
  }
})
