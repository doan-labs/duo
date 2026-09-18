import { appAppearance } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  body: { paddingTop: 20 },
  title: {
    textAlign: 'center',
    fontSize: appAppearance.podcastsFontSize,
    fontWeight: appAppearance.musicFontWeight2,
    paddingBottom: 18
  },
  // iOS centres the icons rather than filling the width.
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    rowGap: 24,
    columnGap: 8,
    paddingTop: 10,
    paddingInline: 16,
    paddingBottom: 24,
    maxWidth: 400,
    marginInline: 'auto'
  },
  f: {
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
    fontSize: appAppearance.musicFontSize3,
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.92)' }
  },
  riseFast: { animationDuration: '.45s' },
  icon: { width: 52, height: 52 }
})
