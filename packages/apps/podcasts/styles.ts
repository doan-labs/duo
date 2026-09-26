import {
  app,
  appAppearance,
  colors,
  motion,
  radius,
  shadow,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  /** The app root: a column so the mini player can pin under the scrolling pane. */
  root: { paddingBottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: app.bg },
  column: {
    position: 'relative',
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  pane: { flexGrow: 1, flexBasis: 0, minHeight: 0 },
  headRow: {
    display: 'flex',
    alignItems: 'center',
    paddingRight: space.lg,
    paddingBottom: space.xs
  },
  hero: { flexGrow: 1 },
  tabs: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.md
  },
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
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    borderRadius: radius.lg,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** The show's name sits on its artwork, so it carries the text shadow. */
  im: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: radius.lg,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    color: colors.white,
    fontWeight: weight.bold,
    textShadow: shadow.text
  },
  posterSub: {
    paddingTop: 6,
    paddingRight: space.xxs,
    paddingBottom: 6,
    paddingLeft: space.xxs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  /** A show name as a tappable heading. */
  showLink: {
    color: 'inherit',
    textAlign: 'left',
    borderRadius: radius.xs,
    transitionProperty: 'opacity',
    transitionDuration: motion.pressDuration,
    opacity: { default: 1, ':active': 0.55 }
  },
  bg: (image: string) => ({ backgroundImage: image, backgroundSize: 'cover' }),
  art: (size: number) => ({
    width: size,
    height: size,
    borderRadius: radius.md,
    flexShrink: 0
  }),
  li: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    paddingTop: 11,
    paddingRight: space.lg,
    paddingBottom: 11,
    paddingLeft: space.lg,
    backgroundColor: { default: app.surface, ':active': app.fill3 },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  thumb: { flexShrink: 0 },
  chev: { color: app.label3, alignSelf: 'center', display: 'flex' },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: {
    display: 'block',
    fontWeight: weight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  /** The episode currently on the deck is tinted in the list. */
  live: { color: colors.purple },
  txP: { color: app.label2, maxHeight: '2.7em', overflow: 'hidden' },
  /** Show and episode pages: the hero block over the metadata. */
  showHead: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    textAlign: 'center'
  },
  showArt: { borderRadius: radius.lg, boxShadow: shadow.card, marginBottom: space.xs },
  showName: {
    fontSize: typeScale.title2,
    fontWeight: weight.bold,
    overflowWrap: 'break-word'
  },
  subBtn: { marginTop: space.sm },
  showDesc: {
    paddingTop: 0,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg
  },
  epHead: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingTop: space.xs,
    paddingRight: space.lg,
    paddingBottom: 0,
    paddingLeft: space.lg,
    textAlign: 'center'
  },
  epTitle: {
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    overflowWrap: 'break-word'
  },
  /** The episode's show name doubles as the link to its page. */
  epShow: {
    color: colors.purple,
    fontSize: typeScale.subheadline,
    opacity: { default: 1, ':active': 0.55 }
  },
  epBtns: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: space.sm,
    paddingBottom: space.sm
  },
  playAll: { display: 'flex', justifyContent: 'center', paddingTop: space.md, paddingBottom: space.xl },
  empty: {
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg,
    color: app.label2,
    fontSize: typeScale.footnote
  },
  /** Search: the field lives inside a capsule carrying the leading loupe. */
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    marginLeft: space.lg,
    marginRight: space.lg,
    marginBottom: space.md,
    paddingLeft: space.sm,
    paddingRight: space.xs,
    paddingTop: space.xxs,
    paddingBottom: space.xxs,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: app.label2
  },
  searchIn: { flexGrow: 1, backgroundColor: 'transparent', height: 26 },
  /** Up Next rows: a tappable load target with a trailing remove button. */
  qRow: {
    display: 'flex',
    alignItems: 'center',
    paddingRight: space.sm,
    backgroundColor: app.surface,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  qBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexGrow: 1,
    minWidth: 0,
    textAlign: 'left',
    paddingTop: 9,
    paddingRight: 0,
    paddingBottom: 9,
    paddingLeft: space.lg
  },
  /** The mini player is its own dark bar under a light app. */
  mini: {
    position: 'relative',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: 9,
    paddingRight: 10,
    paddingBottom: 9,
    paddingLeft: 10,
    backgroundColor: appAppearance.podcastsBar,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.podcastsBarEdge,
    color: colors.white
  },
  miniFace: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    textAlign: 'left',
    borderRadius: radius.sm,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  miniArt: { width: 40, height: 40, borderRadius: radius.sm, flexShrink: 0 },
  miniMain: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  miniName: {
    fontSize: typeScale.subheadline,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniSub: {
    fontSize: typeScale.caption1,
    opacity: 0.62,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    color: colors.white,
    borderRadius: radius.circle,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** The hairline along the bar's bottom edge: how far into the episode it is. */
  scrub: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: appAppearance.podcastsTrack,
    overflow: 'hidden'
  },
  fill: { display: 'block', height: '100%', backgroundColor: colors.white, borderRadius: radius.xs },
  w: (width: string) => ({ width }),
  /** Now Playing: the sheet over the whole app. */
  np: {
    position: 'absolute',
    inset: 0,
    zIndex: 12,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg
  },
  npTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.xs,
    paddingRight: space.xs,
    paddingTop: space.xxs,
    paddingBottom: space.xxs
  },
  npClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    color: app.label2,
    borderRadius: radius.circle,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  npFrom: { color: app.label2 },
  npBody: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    paddingLeft: space.xl,
    paddingRight: space.xl,
    paddingBottom: space.md
  },
  // Height-bound, not width-bound: the wide pane is only ~500 px tall, so a
  // percentage of it keeps the art square and leaves the transport on glass.
  npArt: {
    height: '32%',
    aspectRatio: 1,
    flexShrink: 0,
    borderRadius: radius.lg,
    boxShadow: shadow.float,
    display: 'flex',
    alignItems: 'flex-end',
    paddingTop: space.sm,
    paddingRight: space.sm,
    paddingBottom: space.sm,
    paddingLeft: space.sm,
    marginBottom: space.md,
    color: colors.white,
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: { default: 'ease-out', '@media (prefers-reduced-motion: reduce)': 'linear' }
  },
  /** Paused, the artwork shrinks a touch - the iOS cue that the tape has stopped. */
  npArtRest: { transform: 'scale(.92)' },
  npArtTx: { fontWeight: weight.bold, fontSize: typeScale.title3, textShadow: shadow.text },
  npTitle: {
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    textAlign: 'center',
    overflowWrap: 'break-word'
  },
  npShow: { color: app.label2 },
  seek: { width: '100%', marginTop: space.lg, accentColor: colors.purple },
  npTimes: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    color: app.label2,
    fontSize: typeScale.caption1,
    fontVariantNumeric: 'tabular-nums'
  },
  npTrans: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.xxs
  },
  npPlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    color: app.fg,
    borderRadius: radius.circle,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  npSkip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    color: app.fg,
    borderRadius: radius.circle,
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  /** The toast pill floats over whatever pane is up. */
  toast: {
    position: 'absolute',
    left: '50%',
    bottom: space.xxl,
    transform: 'translateX(-50%)',
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    borderRadius: radius.pill,
    backgroundColor: app.elevated,
    boxShadow: shadow.float,
    fontSize: typeScale.subheadline,
    fontWeight: weight.medium,
    whiteSpace: 'nowrap',
    zIndex: 14
  }
})
