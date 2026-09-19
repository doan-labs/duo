import {
  app,
  appAppearance,
  colors,
  easing,
  radius,
  shadow,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// The Flappy Duo deletion sheet copies the game's own Pay sheet, keyframes included;
// StyleX only resolves keyframes defined in the file that uses them.
const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const rise = stylex.keyframes({ from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } })
const pulse = stylex.keyframes({ '0%': { opacity: 0.6 }, '50%': { opacity: 1 }, '100%': { opacity: 0.6 } })
const breathe = stylex.keyframes({
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.1)' },
  '100%': { transform: 'scale(1)' }
})
const turn = stylex.keyframes({ from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } })
const draw = stylex.keyframes({ from: { strokeDashoffset: 100 }, to: { strokeDashoffset: 0 } })
const popIn = stylex.keyframes({
  '0%': { transform: 'scale(.6)', opacity: 0 },
  '60%': { transform: 'scale(1.08)', opacity: 1 },
  '100%': { transform: 'scale(1)', opacity: 1 }
})

export const styles = stylex.create({
  /** The coloured square behind a row's glyph. */
  tint: (bg: string) => ({ backgroundColor: bg }),
  avatar: { width: 44, height: 44, borderRadius: radius.circle },
  /** The sign-in row is two lines tall, so it takes the account card's own padding. */
  account: { paddingTop: 14, paddingBottom: 14 },
  /** A switch sits at the trailing edge with no detail text beside it. */
  sw: { marginLeft: 'auto' },
  /** A row that is a <button>: form controls shrink to fit, so the width is spelled out. */
  link: { width: '100%', textAlign: 'left', cursor: 'pointer' },

  /** iOS's pane header: the big glyph, the pane's name and what it covers. */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingTop: 18,
    paddingRight: space.lg,
    paddingBottom: 18,
    paddingLeft: space.lg,
    backgroundColor: app.surface
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    display: 'grid',
    placeItems: 'center',
    color: colors.white
  },
  /** The line under a pane's title; the type itself is `typography.body`. */
  heroText: { color: app.label2 },

  /** Explanatory line under a group: `shared.sub` carries the footnote grey. */
  note: { marginTop: -12, marginRight: space.lg, marginBottom: space.xl, marginLeft: space.lg },
  /** Group heading above a section, over `typography.footnote`. */
  head: {
    marginRight: space.lg,
    marginBottom: 6,
    marginLeft: space.lg,
    fontWeight: weight.medium,
    color: app.label2,
    textTransform: 'uppercase'
  },

  /** An app's release icon, at the size a grouped row gives it. */
  appIcon: { width: 30, height: 30, borderRadius: radius.sm, objectFit: 'cover' },
  appIconBig: { width: 62, height: 62, borderRadius: radius.lg, objectFit: 'cover' },
  /** No release icon yet: the first letter on the same square. */
  appLetter: {
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill,
    color: app.label2,
    fontWeight: weight.semibold
  },

  /** Destructive rows and the confirmation they open. */
  destructive: { color: colors.red, justifyContent: 'center', width: '100%', cursor: 'pointer' },
  action: { color: app.link, width: '100%', cursor: 'pointer' },
  /** A confirmation's two choices sit centred under each other, as iOS's do. */
  centred: { justifyContent: 'center' },
  busy: { opacity: 0.5, cursor: 'wait' },

  /** Storage: one bar, one segment per app plus the free remainder. */
  bar: {
    display: 'flex',
    height: 12,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: app.fill,
    marginTop: space.xs,
    marginBottom: 10
  },
  seg: (bg: string, pct: number) => ({ backgroundColor: bg, width: `${pct}%` }),
  legend: { display: 'flex', flexWrap: 'wrap', gap: space.md, color: app.label2 },
  key: { display: 'flex', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: radius.circle, flexShrink: 0 },
  measure: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg,
    backgroundColor: app.surface
  },

  /** The deletion sheet Flappy Duo puts up: the game's own Pay sheet, pinned over the page. */
  payDim: {
    position: 'absolute',
    insetInline: 0,
    height: '100%',
    zIndex: 6,
    backgroundColor: appAppearance.settingsScrim,
    animationName: fadeIn,
    animationDuration: '.3s'
  },
  payTop: (y: number) => ({ top: y }),
  paySheet: {
    position: 'absolute',
    insetInline: 0,
    bottom: 0,
    marginInline: 'auto',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingBlock: 14,
    paddingInline: 18,
    paddingBottom: 22,
    borderStartStartRadius: radius.xxl,
    borderStartEndRadius: radius.xxl,
    backgroundColor: appAppearance.settingsPaySheet,
    color: appAppearance.settingsPayInk,
    boxShadow: shadow.float,
    animationName: rise,
    animationDuration: '.42s',
    animationTimingFunction: easing.pop
  },
  payHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: space.xs },
  payCancel: { color: colors.blue, cursor: 'pointer' },
  payCardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  payCard: {
    flexShrink: 0,
    width: 36,
    height: 24,
    borderRadius: radius.xs,
    backgroundImage: appAppearance.settingsPayCard,
    boxShadow: shadow.card,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: app.separator,
    outlineOffset: -1
  },
  payCardText: { flex: 1, display: 'flex', flexDirection: 'column' },
  payChev: { color: colors.grey3, fontSize: typeScale.title2, lineHeight: 1 },
  payRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: 9,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  payLast: { borderBottomWidth: 0 },
  payKey: { color: colors.grey, fontWeight: weight.medium, textTransform: 'uppercase' },
  payValue: { fontWeight: weight.medium },
  payFace: {
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    color: appAppearance.settingsPayInk,
    cursor: 'pointer',
    width: '100%'
  },
  payLabel: { fontWeight: weight.medium },
  payHint: {
    marginTop: space.xxs,
    color: colors.grey,
    animationName: pulse,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite'
  },
  payStill: { animationName: 'none' },
  /** The sheet's own glyphs: Duo Pay's blue, and the grey ring the spinner runs over. */
  payInk: { stroke: colors.blue },
  payTrack: { stroke: colors.grey4 },
  payGlyph: {
    animationName: breathe,
    animationDuration: '1.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: easing.inOut
  },
  paySpin: {
    animationName: turn,
    animationDuration: '.9s',
    animationIterationCount: 'infinite',
    animationTimingFunction: easing.linear
  },
  payPop: {
    animationName: popIn,
    animationDuration: '.45s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'both'
  },
  payRing: {
    strokeDasharray: 100,
    animationName: draw,
    animationDuration: '.55s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  },
  payTick: {
    strokeDasharray: 100,
    animationName: draw,
    animationDuration: '.35s',
    animationDelay: '.4s',
    animationTimingFunction: easing.out,
    animationFillMode: 'both'
  }
})
