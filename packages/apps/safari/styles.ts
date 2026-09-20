import {
  app,
  appAppearance,
  colors,
  easing,
  leading,
  radius,
  shadow,
  tracking,
  typeScale
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// The bookmark strip rides up out of the URL bar and back down into it.
const up = stylex.keyframes({ from: { transform: 'translateY(100%)', opacity: 0 } })
const down = stylex.keyframes({ to: { transform: 'translateY(100%)', opacity: 0 } })

export const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  // Cover: the chrome is a column on the right and the page keeps the rest.
  bodyRail: { flexDirection: 'row' },
  page: { position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },
  // The URL bar's parent: the bookmark strip slides up out of it without moving the page.
  foot: { position: 'relative', flexShrink: 0 },
  marks: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    overflowX: 'auto',
    backgroundColor: app.elevated,
    animationName: { default: up, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop
  },
  marksOut: {
    animationName: { default: down, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationFillMode: 'forwards'
  },
  mark: {
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    whiteSpace: 'nowrap',
    boxShadow: shadow.card,
    color: colors.black
  },
  // The tab switcher: Safari's grid of live page cards over the page, two across,
  // the open one ringed, a close dot top-left of each.
  grid: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    alignContent: 'start',
    gap: 12,
    padding: 12,
    overflowY: 'auto',
    backgroundColor: app.elevated
  },
  card: { position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 },
  cardPick: {
    display: 'block',
    padding: 0,
    aspectRatio: '3 / 4',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: { default: shadow.card, ':active': `0 0 0 2px ${colors.blue}` },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '.2s',
    transform: { default: 'scale(1)', ':active': 'scale(.97)' }
  },
  cardOn: { boxShadow: `0 0 0 2px ${colors.blue}` },
  // The card's page at a third: wide as three cards, drawn back to one, untouchable.
  peek: {
    width: '300%',
    height: '300%',
    borderWidth: 0,
    transform: 'scale(.3333)',
    transformOrigin: '0 0',
    pointerEvents: 'none'
  },
  cardClose: {
    position: 'absolute',
    top: 6,
    left: 6,
    display: 'grid',
    placeItems: 'center',
    width: 22,
    height: 22,
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.safariDot,
    color: colors.black,
    boxShadow: appAppearance.safariDotShadow
  },
  cardName: {
    paddingTop: 6,
    textAlign: 'center',
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: colors.black
  },
  url: {
    display: 'flex',
    gap: 8,
    paddingBlock: 8,
    paddingInline: 12,
    alignItems: 'center',
    backgroundColor: app.elevated,
    flexShrink: 0,
    color: colors.blue
  },
  input: {
    flexGrow: 1,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: 9,
    paddingInline: 12,
    backgroundColor: colors.white,
    boxShadow: shadow.card,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    textAlign: 'center',
    color: colors.black,
    outline: 0
  },
  bar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingInline: 20,
    paddingBottom: 10,
    backgroundColor: app.elevated,
    flexShrink: 0,
    color: colors.blue
  },
  // The camera column, 82 wide so its centre lands under the punch-hole (right
  // 24 + half the 34 ring). The stack above is 18 + hole 25 + time 21 + ring 45.
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 56,
    paddingTop: 141,
    paddingBottom: 16,
    backgroundColor: app.elevated,
    color: colors.black,
    flexShrink: 0
  },
  // Two glass pills of two circles each, as Apple's cover Safari: back and
  // bookmarks under the status stack, new tab and tabs at the bottom.
  railPill: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 3,
    borderRadius: radius.pill,
    boxShadow: appAppearance.safariPillEdge
  },
  railBtn: {
    width: 40,
    height: 40,
    padding: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.safariGlass,
    boxShadow: `${appAppearance.safariGlassEdge}, ${shadow.rim}`,
    transform: { default: 'scale(1)', ':active': 'scale(.9)' },
    transitionProperty: 'transform, opacity',
    transitionDuration: { default: '.22s', '@media (prefers-reduced-motion: reduce)': '0s' },
    transitionTimingFunction: easing.pop
  },
  railGap: { flexGrow: 1 },
  barBtn: {
    display: 'grid',
    placeItems: 'center',
    paddingBlock: 4,
    paddingInline: 10,
    opacity: { default: null, ':disabled': 0.3 }
  }
})
