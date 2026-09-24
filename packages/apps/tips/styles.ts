import { app, colors, radius, shadow, space, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  /** Sidebar beside detail on the unfolded display. Tips is not an `edge` app, so nothing pads a status band. */
  split: { display: 'flex', flexDirection: 'row', flexGrow: 1, minHeight: 0, backgroundColor: app.bg },
  detail: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0 },

  /** The large title heads the sidebar scroll, padded to sit on the destinations' axis. */
  sideTitle: { paddingLeft: space.sm },
  /** The sidebar's material: one step darker than the grouped background it sits against. */
  side: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: 'clamp(232px, 34%, 300px)',
    minHeight: 0,
    backgroundColor: app.fill3
  },
  sideScroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingTop: space.lg,
    paddingRight: space.md,
    paddingBottom: space.xxl,
    paddingLeft: space.md
  },
  /** A sidebar destination. Selection is a rounded capsule, not a chevron. */
  dest: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    minHeight: 44,
    paddingTop: space.xs,
    paddingRight: space.sm,
    paddingBottom: space.xs,
    paddingLeft: space.sm,
    borderRadius: radius.xl,
    color: app.fg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  destOn: { backgroundColor: app.fill },
  destName: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  destN: { marginLeft: 'auto', flexShrink: 0, color: app.label2 },
  /** Air between the Saved row and the collections, as iPadOS parts sidebar groups. */
  destGap: { height: space.md, flexShrink: 0 },
  /** The small gradient square a collection carries into its sidebar row. */
  destArt: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    flexShrink: 0
  },

  /** The root's own header: a large title with the saved-tips button at the trailing edge. */
  homeHdr: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    paddingRight: space.lg
  },
  hdrBtn: { marginLeft: 'auto', color: app.link },

  /** Everything on the root below the header lines up on the same inset. */
  inset: { paddingRight: space.lg, paddingLeft: space.lg },
  /** Grouped-list caption above a section, over `typography.footnote`. */
  label: {
    marginTop: space.lg,
    marginBottom: space.sm,
    color: app.label2,
    textTransform: 'uppercase'
  },

  /** A collection's gradient: the artwork every surface of this app draws from. */
  art: (img: string) => ({ backgroundImage: img }),

  /** The Tip of the Day card: gradient, the glyph up top, the title low on the left. */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: 200,
    borderRadius: radius.xl,
    overflow: 'hidden',
    color: colors.white,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg,
    textAlign: 'left',
    cursor: 'pointer'
  },
  heroGlyph: { flexGrow: 1, display: 'grid', placeItems: 'center' },
  heroText: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  heroSub: { color: colors.white, opacity: 0.85 },

  /** The two-column grid of collections. */
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: space.md
  },
  card: { minWidth: 0, textAlign: 'left', cursor: 'pointer', color: app.fg },
  cardArt: {
    aspectRatio: 1.35,
    borderRadius: radius.xl,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    boxShadow: shadow.card
  },
  cardText: { display: 'flex', flexDirection: 'column', minWidth: 0, paddingTop: space.sm, paddingBottom: space.xs },

  /** A row that is a <button>: form controls shrink to fit, so the width is spelled out. */
  rowBtn: { width: '100%', textAlign: 'left', cursor: 'pointer' },
  /** The saved row's tinted square: the tip's own collection gradient at row-icon size. */
  rowArt: { color: colors.white },
  /** The nudge under "Saved" when nothing is saved yet. */
  savedHint: { marginTop: 0, color: app.label2 },

  /** The collection page's banner and blurb. */
  banner: {
    display: 'grid',
    placeItems: 'center',
    height: 140,
    marginRight: space.lg,
    marginLeft: space.lg,
    borderRadius: radius.xl,
    color: colors.white
  },
  blurb: { marginTop: space.md, color: app.label2 },
  /** A tip card in the collection list: white card, gradient band on top. */
  tip: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginBottom: space.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    textAlign: 'left',
    cursor: 'pointer',
    color: app.fg
  },
  tipBand: { display: 'grid', placeItems: 'center', height: 110, color: colors.white },
  tipText: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    minWidth: 0,
    paddingTop: space.md,
    paddingRight: space.lg,
    paddingBottom: space.md,
    paddingLeft: space.lg
  },
  list: { paddingBottom: space.sm },

  /** The tip page's art panel. */
  tipHero: {
    display: 'grid',
    placeItems: 'center',
    height: 220,
    marginTop: space.lg,
    marginRight: space.lg,
    marginBottom: space.lg,
    marginLeft: space.lg,
    borderRadius: radius.xl,
    color: colors.white
  },
  tipTitle: { marginTop: 0 },
  para: { marginTop: space.md, color: app.fg },
  /** The numbered circle a step row leads with. */
  step: {
    width: 22,
    height: 22,
    borderRadius: radius.circle,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: app.fill,
    color: app.fg,
    fontWeight: weight.semibold,
    flexShrink: 0
  },
  /** Previous / bookmark / Next, spread under the content as iOS lays them out. */
  pager: {
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg
  },
  mark: { color: app.label2 },
  markOn: { color: app.link },

  /** The empty Saved page, centred. */
  empty: {
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: space.sm,
    textAlign: 'center',
    color: app.label3
  },
  emptyText: { display: 'flex', flexDirection: 'column', gap: space.xxs, color: app.label2 }
})
