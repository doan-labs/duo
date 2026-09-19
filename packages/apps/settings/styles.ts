import { app, appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

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
  wrap: { whiteSpace: 'normal', overflowWrap: 'anywhere' }
})
