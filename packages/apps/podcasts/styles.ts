import {
  app,
  appAppearance,
  colors,
  motion,
  radius,
  shadow,
  space,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  root: { paddingBottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: app.bg },
  shelf: {
    display: 'flex',
    gap: space.md,
    overflowX: 'auto',
    paddingTop: space.xxs,
    paddingRight: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  poster: {
    flexShrink: 0,
    width: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** The show's name sits on its artwork, so it carries the text shadow. */
  im: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    fontWeight: weight.bold,
    textShadow: shadow.text
  },
  posterSub: { paddingTop: 6, paddingRight: space.xxs, paddingBottom: 6, paddingLeft: space.xxs },
  bg: (image: string) => ({ backgroundImage: image }),
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingRight: space.lg,
    paddingBottom: 11,
    paddingLeft: space.lg,
    backgroundColor: { default: app.surface, ':active': app.fill3 },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  thumb: { width: 52, height: 52, borderRadius: radius.md, flexShrink: 0 },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: { display: 'block', fontWeight: weight.semibold },
  txP: { color: app.label2, maxHeight: '2.7em', overflow: 'hidden' },
  /** The mini player is its own dark bar under a light app. */
  mini: {
    position: 'relative',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingTop: 9,
    paddingRight: 14,
    paddingBottom: 9,
    paddingLeft: 14,
    backgroundColor: appAppearance.podcastsBar,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.podcastsBarEdge,
    color: colors.white
  },
  art: { width: 40, height: 40, borderRadius: radius.sm, aspectRatio: 1 },
  title: {
    fontWeight: weight.semibold,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  scrub: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: appAppearance.podcastsTrack,
    overflow: 'hidden',
    cursor: 'pointer'
  },
  fill: { display: 'block', height: '100%', backgroundColor: colors.white, borderRadius: radius.xs },
  w: (width: string) => ({ width })
})
