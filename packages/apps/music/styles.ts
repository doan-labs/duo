import {
  appAppearance,
  easing,
  leading,
  motion,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  flush: { paddingBottom: 0 },
  np: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    paddingTop: 14,
    paddingRight: 26,
    paddingBottom: 14,
    paddingLeft: 26
  },
  /** Real cover art, so the card carries the artwork rather than the title over a gradient. */
  art: {
    borderRadius: radius.xl,
    boxShadow: shadow.float,
    aspectRatio: 1,
    display: 'block',
    objectFit: 'cover'
  },
  cover: { width: 'min(72%,260px)' },
  credit: { opacity: 0.6 },
  bg: (image: string) => ({ backgroundImage: image }),
  center: { textAlign: 'center' },
  title: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold
  },
  scrub: {
    width: '100%',
    height: 5,
    borderRadius: radius.xs,
    backgroundColor: appAppearance.musicFill,
    overflow: 'hidden',
    cursor: 'pointer'
  },
  fill: {
    display: 'block',
    height: '100%',
    backgroundColor: appAppearance.musicFillStrong,
    borderRadius: radius.xs
  },
  w: (width: string) => ({ width }),
  tr: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.55,
    marginTop: -8
  },
  pbtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
    fontSize: typeScale.largeTitle,
    lineHeight: 1
  },
  pb: {
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    opacity: 0.95,
    transform: { default: null, ':active': motion.press }
  },
  eq: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 20 },
  bar: {
    width: 3,
    backgroundColor: 'currentColor',
    borderRadius: radius.xs,
    transitionProperty: 'height',
    transitionDuration: '.12s',
    transitionTimingFunction: easing.linear
  },
  barH: (height: string) => ({ height }),
  hdr: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
  queue: { marginTop: 4 },
  qrow: {
    backgroundColor: appAppearance.musicFillFaint,
    borderBottomColor: appAppearance.musicHairline,
    cursor: 'pointer'
  },
  thumb: { width: 34, height: 34, borderRadius: radius.sm, flexShrink: 0, objectFit: 'cover' },
  name: { fontWeight: weight.medium },
  go: { fontSize: typeScale.footnote, lineHeight: leading.footnote, letterSpacing: tracking.footnote }
})
