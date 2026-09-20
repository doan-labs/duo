import { app, colors, radius, space, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

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
  }
})
