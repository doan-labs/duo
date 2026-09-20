import {
  app,
  colors,
  fonts,
  glass,
  leading,
  radius,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  /** Sidebar beside detail on the unfolded display. Settings is an `edge` app, so each column pads its own band. */
  split: { display: 'flex', flexDirection: 'row', flexGrow: 1, minHeight: 0, backgroundColor: app.bg },
  /**
   * The pane beside it, and the whole app when folded. Its 40 px is the status
   * band an `edge` app owes itself, and it sits outside `Nav`: the pages inside
   * are absolute at `inset: 0`, which resolves against the padding box.
   */
  detail: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0, paddingTop: 40 },
  /** The selected pane leads with its own header card, so it takes the air a title bar would have. */
  pane: { paddingTop: space.xxl },

  /** The sidebar's material: one step darker than the grouped background it sits against. */
  side: {
    position: 'relative',
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
    paddingTop: 40,
    paddingRight: 10,
    // The search field floats over the end of the list rather than following it.
    paddingBottom: 56,
    paddingLeft: 10
  },
  /** The account block heads the sidebar: the avatar beside the name and what signing in would reach. */
  account: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: space.md,
    paddingTop: space.sm,
    paddingRight: space.sm,
    paddingBottom: 18,
    paddingLeft: space.sm,
    textAlign: 'left'
  },
  accountSub: { color: app.label2, marginTop: 1 },
  /** A sidebar destination. Selection is a rounded capsule, not a chevron. */
  dest: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    height: 44,
    paddingRight: space.sm,
    paddingLeft: space.sm,
    borderRadius: radius.xl,
    color: app.fg,
    textAlign: 'left'
  },
  /** Only the rows that open a pane; a switch or a read-only value is not a target. */
  destLink: { cursor: 'pointer' },
  destOn: { backgroundColor: app.fill },
  destName: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  destValue: { marginLeft: 'auto', flexShrink: 0, color: app.label2 },
  /** iPadOS parts the sidebar's groups with air instead of a rule. */
  destGap: { height: space.md, flexShrink: 0 },
  /** Frosted field pinned over the bottom of the list, as iPadOS 26 pins it. */
  find: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    left: 10,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    height: 36,
    paddingRight: space.md,
    paddingLeft: space.md,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.label2,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  findField: {
    appearance: 'none',
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    outline: { default: 'none', ':focus': 'none' },
    '::placeholder': { color: app.label3 },
    // The browser's own cancel glyph is not iOS's; the caret is the only affordance here.
    '::-webkit-search-cancel-button': { display: 'none' }
  },
  empty: { paddingTop: space.md, paddingRight: space.sm, paddingLeft: space.sm, color: app.label2 },

  /** The coloured square behind a row's glyph. */
  tint: (bg: string) => ({ backgroundColor: bg }),
  avatar: { width: 44, height: 44, borderRadius: radius.circle },
  /** The sign-in row is two lines tall, so it takes the account card's own padding. */
  accountRow: { paddingTop: 14, paddingBottom: 14 },
  /** A switch sits at the trailing edge with no detail text beside it. */
  sw: { marginLeft: 'auto' },
  /** A row that is a <button>: form controls shrink to fit, so the width is spelled out. */
  link: { width: '100%', textAlign: 'left', cursor: 'pointer' },

  /** iPadOS's grouped card, rounder than the kit's phone list. */
  card: { borderRadius: radius.xl },
  /**
   * Its row: 44 px whatever it carries, where the kit's 11 px padding makes 52
   * with a glyph in it, and the hairline inset to where the label starts rather
   * than run edge to edge. The last row of a card has none.
   */
  row: {
    position: 'relative',
    minHeight: 44,
    paddingTop: 7,
    paddingBottom: 7,
    borderBottomWidth: 0,
    '::after': {
      content: '""',
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: space.lg,
      height: 1,
      backgroundColor: { default: app.separator, ':last-child': 'transparent' }
    }
  },
  /** A glyph moves the label, and the hairline under it, past the square. */
  rowGlyph: { '::after': { left: 58 } },

  /** A pane's header: the big glyph, the pane's name and what it covers. */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    paddingTop: space.lg,
    paddingRight: space.lg,
    paddingBottom: 18,
    paddingLeft: space.lg,
    backgroundColor: app.surface
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    marginBottom: space.sm
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
  appIconBig: { width: 56, height: 56, borderRadius: radius.lg, objectFit: 'cover' },
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
