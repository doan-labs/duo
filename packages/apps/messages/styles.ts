import {
  app,
  appAppearance,
  colors,
  easing,
  leading,
  motion,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local copies of the shared keyframes: StyleX only resolves imports from
// `.stylex.ts` files inside `stylex.create`, so a keyframe from shared.ts
// cannot be referenced here.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

const bob = stylex.keyframes({
  '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
  '30%': { transform: 'translateY(-5px)', opacity: 1 }
})

export const styles = stylex.create({
  li: {
    display: 'flex',
    gap: 10,
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
  bg: (image: string) => ({ backgroundImage: image }),
  hdr: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    justifyContent: 'center',
    position: 'relative'
  },
  bkAbs: { position: 'absolute', left: 16 },
  ft: { position: 'absolute', right: 16, color: app.link },
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
    alignSelf: 'flex-start',
    backgroundColor: app.fill2,
    color: app.fg,
    animationName: pop,
    animationDuration: '.32s',
    animationTimingFunction: easing.spring
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.blue,
    backgroundImage: appAppearance.messagesBubble,
    color: colors.white
  },
  /** A bubble that changes sender gets a little air before it. */
  turn: { marginTop: 8 },
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
    animationName: bob,
    animationDuration: '.95s',
    animationIterationCount: 'infinite'
  },
  compose: {
    flexShrink: 0,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
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
    borderRadius: radius.pill,
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 14,
    backgroundColor: app.surface,
    color: app.fg,
    outline: 0,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body
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
  }
})
