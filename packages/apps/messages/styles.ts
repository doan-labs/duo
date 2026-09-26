import {
  app,
  appAppearance,
  colors,
  easing,
  fonts,
  leading,
  motion,
  radius,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local copies of the shared keyframes: StyleX only resolves imported
// keyframes from `.stylex.ts` modules, so the ones in uikit/styles.ts stay
// there for its own blocks.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

const bob = stylex.keyframes({
  '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
  '30%': { transform: 'translateY(-5px)', opacity: 1 }
})

export const styles = stylex.create({
  // ---------- layout ----------
  root: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: app.bg, color: app.fg },
  pane: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 },
  split: { display: 'flex', flexGrow: 1, minHeight: 0 },
  side: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  paneEmpty: { flexGrow: 1 },

  // ---------- inbox ----------
  hdrActs: { gap: space.sm },
  plain: { color: app.link, padding: 0, display: 'flex', alignItems: 'center' },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
    marginRight: space.lg,
    marginBottom: space.sm,
    marginLeft: space.lg,
    paddingInline: space.sm,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    color: app.label2,
    flexShrink: 0
  },
  searchIc: { display: 'flex', color: app.label2 },
  searchIn: { flexGrow: 1, minWidth: 0, height: '100%', backgroundColor: 'transparent', color: app.fg },
  searchX: {
    width: 18,
    height: 18,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill2,
    color: app.label2,
    flexShrink: 0
  },
  searchFoot: { paddingTop: space.sm, paddingBottom: space.lg, textAlign: 'center' },
  list: { paddingBottom: space.lg },
  rowWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  row: {
    display: 'flex',
    gap: 10,
    flexGrow: 1,
    minWidth: 0,
    textAlign: 'left',
    paddingTop: 11,
    paddingRight: 16,
    paddingBottom: 11,
    paddingLeft: 16,
    backgroundColor: { default: app.surface, ':active': app.fill3 },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: {
    display: 'block',
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  txP: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: app.label2,
    // Two lines of the preview and no more.
    maxHeight: `calc(${leading.footnote} * 2)`,
    overflow: 'hidden'
  },
  draftTag: { color: colors.redDark },
  trail: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  stamp: { flexShrink: 0 },
  unread: {
    width: 19,
    height: 19,
    borderRadius: radius.circle,
    backgroundColor: app.link,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    fontWeight: weight.medium
  },
  avatarSm: { width: 34, height: 34, fontSize: typeScale.callout, lineHeight: leading.callout },
  avatarRaw: { backgroundColor: app.fill2, color: app.label2 },
  bg: (image: string) => ({ backgroundImage: image }),
  minus: {
    width: 26,
    height: 26,
    flexShrink: 0,
    marginLeft: 10,
    display: 'grid',
    placeItems: 'center',
    color: colors.redDark,
    transform: { default: null, ':active': motion.press },
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration
  },
  deleteBtn: {
    flexShrink: 0,
    marginRight: 12,
    paddingTop: 7,
    paddingRight: 14,
    paddingBottom: 7,
    paddingLeft: 14,
    borderRadius: radius.md,
    backgroundColor: colors.redDark,
    color: colors.white,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  rowMenuPop: { position: 'absolute', right: 10, top: 26, width: 190, zIndex: 4 },

  // ---------- thread ----------
  hdr: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    justifyContent: 'center',
    position: 'relative'
  },
  bkAbs: { position: 'absolute', left: 16 },
  hdrWho: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontWeight: weight.semibold },
  hdrAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.circle,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    fontWeight: weight.medium
  },
  hdrBtns: { position: 'absolute', right: 14, display: 'flex', alignItems: 'center', gap: 12, color: app.link },
  hdrMenu: { position: 'absolute', right: 10, top: 44, width: 210, zIndex: 4 },
  flush: { paddingBottom: 0 },
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 4,
    paddingLeft: 12
  },
  burst: { display: 'flex', flexDirection: 'column' },
  stampLine: { alignSelf: 'center', paddingTop: 10, paddingBottom: 6 },
  // Full-width row the bubble self-aligns in; the copy menu anchors to it.
  bubWrap: { position: 'relative', display: 'flex', flexDirection: 'column' },
  bub: {
    maxWidth: '74%',
    paddingTop: 8,
    paddingRight: 13,
    paddingBottom: 8,
    paddingLeft: 13,
    borderRadius: radius.xxl,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.regular,
    fontFamily: fonts.system,
    textAlign: 'left',
    borderWidth: 0,
    alignSelf: 'flex-start',
    cursor: 'default',
    // Long words and addresses break instead of punching through the bubble.
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
    animationName: { default: pop, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.32s',
    animationTimingFunction: easing.spring
  },
  them: { backgroundColor: app.fill2, color: app.fg },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.blue,
    backgroundImage: appAppearance.messagesBubble,
    color: colors.white
  },
  /** A bubble that changes sender gets a little air before it. */
  turn: { marginTop: 8 },
  status: { alignSelf: 'flex-end', paddingTop: 3, paddingRight: 4 },
  typing: {
    display: 'flex',
    gap: 5,
    alignSelf: 'flex-start',
    paddingTop: 13,
    paddingRight: 15,
    paddingBottom: 13,
    paddingLeft: 15,
    borderRadius: radius.xxl,
    backgroundColor: app.fill2
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.messagesBubbleGrey,
    animationName: { default: bob, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.95s',
    animationIterationCount: 'infinite'
  },
  bubMenu: { position: 'absolute', left: 0, top: '100%', width: 150, zIndex: 4 },
  bubMenuMe: { left: 'auto', right: 0 },
  compose: {
    flexShrink: 0,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
    backgroundColor: appAppearance.messagesBar,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.messagesBarEdge
  },
  input: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: appAppearance.messagesBarEdge,
    borderRadius: radius.lg,
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 14,
    backgroundColor: app.surface,
    color: app.fg,
    outline: 0,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    resize: 'none',
    overflowY: 'auto',
    height: 36
  },
  send: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: app.link,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    transitionProperty: 'transform, opacity',
    transitionDuration: `${motion.pressDuration}, .2s`,
    opacity: { default: null, ':disabled': 0.3 },
    transform: { default: null, ':active': motion.press }
  },
  gone: { padding: space.xl, textAlign: 'center' },

  // ---------- new message ----------
  toRow: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  toLabel: { color: app.label2, fontWeight: weight.semibold },
  toField: { flexGrow: 1, minWidth: 0, height: 30 },
  noHits: { padding: space.xl, textAlign: 'center' }
})
