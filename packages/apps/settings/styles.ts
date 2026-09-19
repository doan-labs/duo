import { app, appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
  avatar: { width: 44, height: 44, borderRadius: appAppearance.settingsBorderRadius },
  /** The sign-in row is two lines tall, so it takes the account card's own padding. */
  account: { paddingTop: 14, paddingBottom: 14 },
  name: { fontWeight: appAppearance.settingsFontWeight },
  /** A switch sits at the trailing edge with no detail text beside it. */
  sw: { marginLeft: 'auto' },
  /** A row that is a <button>: form controls shrink to fit, so the width is spelled out. */
  link: { width: '100%', textAlign: 'left', cursor: 'pointer' },

  /** iOS's pane header: the big glyph, the pane's name and what it covers. */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 18,
    paddingRight: 16,
    paddingBottom: 18,
    paddingLeft: 16,
    backgroundColor: app.surface
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: appAppearance.settingsBorderRadius2,
    display: 'grid',
    placeItems: 'center',
    color: colors.white
  },
  heroTitle: { fontSize: appAppearance.settingsFontSize5, fontWeight: appAppearance.settingsFontWeight3 },
  heroText: { fontSize: appAppearance.settingsFontSize4, color: app.label2, lineHeight: 1.35 },

  /** Explanatory line under a group, in iOS's footnote grey. */
  note: {
    marginTop: -12,
    marginRight: 16,
    marginBottom: 20,
    marginLeft: 16,
    fontSize: appAppearance.settingsFontSize,
    color: app.label2,
    lineHeight: 1.35
  },
  /** Group heading above a section. */
  head: {
    marginRight: 16,
    marginBottom: 6,
    marginLeft: 16,
    fontSize: appAppearance.settingsFontSize,
    fontWeight: appAppearance.settingsFontWeight2,
    color: colors.grey2,
    textTransform: 'uppercase'
  },

  /** An app's release icon, at the size a grouped row gives it. */
  appIcon: { width: 30, height: 30, borderRadius: appAppearance.settingsBorderRadius3, objectFit: 'cover' },
  appIconBig: { width: 62, height: 62, borderRadius: appAppearance.settingsBorderRadius2, objectFit: 'cover' },
  /** No release icon yet: the first letter on the same square. */
  appLetter: {
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.fill,
    color: app.label2,
    fontSize: appAppearance.settingsFontSize3,
    fontWeight: appAppearance.settingsFontWeight
  },

  /** Destructive rows and the confirmation they open. */
  destructive: { color: colors.red, justifyContent: 'center', width: '100%', cursor: 'pointer' },
  action: { color: colors.blue, width: '100%', cursor: 'pointer' },
  /** A confirmation's two choices sit centred under each other, as iOS's do. */
  centred: { justifyContent: 'center' },
  busy: { opacity: 0.5, cursor: 'wait' },

  /** Storage: one bar, one segment per app plus the free remainder. */
  bar: {
    display: 'flex',
    height: 12,
    borderRadius: appAppearance.settingsBorderRadius4,
    overflow: 'hidden',
    backgroundColor: colors.fill,
    marginTop: 4,
    marginBottom: 10
  },
  seg: (bg: string, pct: number) => ({ backgroundColor: bg, width: `${pct}%` }),
  legend: { display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: appAppearance.settingsFontSize6, color: app.label2 },
  key: { display: 'flex', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: appAppearance.settingsBorderRadius, flexShrink: 0 },
  measure: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    backgroundColor: app.surface
  },

  /** The version line under an app's name on its own page. */
  sub: { fontSize: appAppearance.settingsFontSize, color: app.label2 },
  stack: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  wrap: { whiteSpace: 'normal', overflowWrap: 'anywhere' },

  /** The deletion sheet Flappy Duo puts up: the game's own Pay sheet, pinned over the page. */
  payDim: {
    position: 'absolute',
    insetInline: 0,
    height: '100%',
    zIndex: 6,
    backgroundColor: 'rgba(0,0,0,.35)',
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
    gap: 8,
    paddingBlock: 14,
    paddingInline: 18,
    paddingBottom: 22,
    borderStartStartRadius: 24,
    borderStartEndRadius: 24,
    backgroundColor: 'rgba(255,255,255,.96)',
    color: '#0b1a3a',
    fontSize: 13,
    boxShadow: '0 -12px 40px rgba(0,0,0,.25)',
    animationName: rise,
    animationDuration: '.42s',
    animationTimingFunction: 'cubic-bezier(.18,.9,.22,1.02)'
  },
  payHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  payMark: { fontSize: 17, fontWeight: 600, letterSpacing: -0.3 },
  payCancel: { color: colors.blueBright, fontSize: 15, cursor: 'pointer' },
  payCardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.18)'
  },
  payCard: {
    flexShrink: 0,
    width: 36,
    height: 24,
    borderRadius: 4,
    backgroundImage:
      'linear-gradient(115deg, rgba(255,140,200,.35), rgba(140,200,255,.35) 45%, rgba(255,230,140,.35) 80%), linear-gradient(135deg, #ffffff, #dcdce1 60%, #f2f2f5)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.12)'
  },
  payCardText: { flex: 1, display: 'flex', flexDirection: 'column', fontSize: 12, lineHeight: 1.2 },
  payChev: { color: '#c7c7cc', fontSize: 22, lineHeight: 1 },
  payRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 9,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.18)'
  },
  payLast: { borderBottomWidth: 0 },
  payKey: { color: '#8a8a8e', fontSize: 11, fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' },
  payValue: { fontSize: 12, fontWeight: 500 },
  payFace: {
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: '#0b1a3a',
    cursor: 'pointer',
    width: '100%'
  },
  payLabel: { fontSize: 13, fontWeight: 500 },
  payHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#8a8a8e',
    animationName: pulse,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite'
  },
  payStill: { animationName: 'none' },
  payGlyph: {
    animationName: breathe,
    animationDuration: '1.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  paySpin: {
    animationName: turn,
    animationDuration: '.9s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  payPop: {
    animationName: popIn,
    animationDuration: '.45s',
    animationTimingFunction: 'cubic-bezier(.2,.9,.3,1.3)',
    animationFillMode: 'both'
  },
  payRing: {
    strokeDasharray: 100,
    animationName: draw,
    animationDuration: '.55s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both'
  },
  payTick: {
    strokeDasharray: 100,
    animationName: draw,
    animationDuration: '.35s',
    animationDelay: '.4s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both'
  }
})
