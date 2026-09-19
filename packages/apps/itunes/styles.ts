import {
  app,
  colors,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  bg: (img: string) => ({ backgroundImage: img }),
  shelf: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingTop: 2,
    paddingInline: 16,
    paddingBottom: 16,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  poster: {
    flexShrink: 0,
    width: 126,
    borderRadius: radius.lg,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  cover: { aspectRatio: 1, borderRadius: radius.md },
  posterTitle: {
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.semibold,
    paddingTop: 6,
    paddingInline: 2,
    paddingBottom: 0
  },
  posterArtist: { fontSize: typeScale.caption2, lineHeight: leading.caption2, paddingInline: 2 },
  hdr18: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
  rank: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 16,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  n: {
    width: 18,
    textAlign: 'center',
    color: colors.grey,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    flexShrink: 0
  },
  co: { width: 52, height: 52, borderRadius: radius.sm, flexShrink: 0 },
  grow: { flexGrow: 1, minWidth: 0 },
  song: {
    fontWeight: weight.semibold,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  buy: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingInline: 14,
    borderRadius: radius.pill,
    backgroundColor: app.fill,
    color: app.link,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.bold,
    flexShrink: 0,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: `.25s, .25s, ${motion.pressDuration}`,
    transform: { default: null, ':active': motion.press }
  },
  own: { backgroundColor: colors.green, color: colors.white },
  ring: {
    width: 22,
    height: 22,
    borderRadius: radius.circle,
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: app.fill,
    borderTopColor: colors.blueDark
  }
})
