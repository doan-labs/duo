import { appAppearance, colors, easing } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.messagesBorderBottomColor,
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: { display: 'block', fontSize: appAppearance.musicFontSize, fontWeight: appAppearance.musicFontWeight2 },
  txP: {
    fontSize: appAppearance.musicFontSize6,
    color: colors.grey,
    lineHeight: 1.35,
    maxHeight: '2.7em',
    overflow: 'hidden'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: appAppearance.settingsBorderRadius,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: appAppearance.musicFontSize5,
    fontWeight: appAppearance.musicFontWeight3
  },
  bg: (image: string) => ({ backgroundImage: image }),
  hdr: { fontSize: appAppearance.messagesFontSize, justifyContent: 'center', position: 'relative' },
  bkAbs: { position: 'absolute', left: 16 },
  ft: { position: 'absolute', right: 16, color: colors.blueBright },
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
    borderRadius: appAppearance.musicFontSize2,
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1.34,
    alignSelf: 'flex-start',
    backgroundColor: colors.trackLight,
    color: colors.black,
    animationName: pop,
    animationDuration: '.32s',
    animationTimingFunction: easing.spring
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.blueBright,
    backgroundImage: appAppearance.messagesBackgroundImage,
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
    borderRadius: appAppearance.musicFontSize2,
    backgroundColor: colors.trackLight
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: appAppearance.messagesBackgroundColor,
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
    backgroundColor: appAppearance.messagesBackgroundColor2,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: appAppearance.messagesBorderTopColor
  },
  input: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: appAppearance.messagesBorderTopColor,
    borderRadius: appAppearance.messagesFontSize,
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 14,
    backgroundColor: colors.white,
    outline: 0,
    fontSize: appAppearance.musicFontSize
  },
  send: {
    width: 32,
    height: 32,
    borderRadius: appAppearance.settingsBorderRadius,
    backgroundColor: colors.blueBright,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.15s, .2s',
    opacity: { default: null, ':disabled': 0.3 },
    transform: { default: null, ':active': 'scale(.85)' }
  }
})
