import {
  app,
  colors,
  fonts,
  leading,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    // clip, not hidden: a hidden box can still be scrolled by focus or scrollIntoView, which slides
    // the whole app up under the status bar.
    overflow: 'clip',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    // The home bar owns the bottom 22 px; everything clears it.
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    paddingInline: space.lg,
    backgroundColor: app.bg,
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body
  },
  rootWide: { paddingTop: space.xl, paddingInline: space.xl },
  split: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)',
    gap: space.xl
  },
  pane: { minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: space.md, flex: 1 },

  header: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md, flexShrink: 0 },
  title: {
    marginBlock: 0,
    fontSize: typeScale.largeTitle,
    lineHeight: leading.largeTitle,
    letterSpacing: tracking.largeTitle,
    fontWeight: weight.bold
  },
  // The language is one pill that opens a menu: seven names do not fit the cover's width, and a row
  // that scrolls sideways hides the last ones from anyone without a touch screen.
  langBox: { position: 'relative', flexShrink: 0 },
  langBtn: {
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.link,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.blue,
    outlineOffset: 1
  },
  // The menu draws no scrim of its own, so a tap anywhere else lands on this transparent layer first.
  catcher: {
    position: 'fixed',
    inset: 0,
    zIndex: 2,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    cursor: 'default'
  },
  langMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: space.xs,
    minWidth: 200,
    fontSize: typeScale.body
  },

  pills: { display: 'flex', flexWrap: 'wrap', gap: space.sm, flexShrink: 0 },
  pill: {
    minHeight: 32,
    paddingInline: space.md,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: app.fill3,
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    cursor: 'pointer',
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.blue,
    outlineOffset: 1
  },
  pillOn: { backgroundColor: app.link, color: colors.white, fontWeight: weight.semibold },

  search: {
    flexShrink: 0,
    height: 36,
    paddingInline: space.md,
    borderRadius: radius.pill,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline
  },

  list: {
    flex: 1,
    minHeight: 0,
    marginBlock: 0,
    padding: 0,
    listStyleType: 'none',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm
  },
  row: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: space.md,
    paddingInline: space.lg,
    borderWidth: 0,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    color: app.fg,
    fontFamily: fonts.system,
    textAlign: 'start',
    cursor: 'pointer',
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.blue,
    // Drawn inside the row: the list scrolls, so an outline outside it would be clipped by the list.
    outlineOffset: -2
  },
  rowOn: { backgroundColor: app.link, color: colors.white, outlineColor: colors.white },
  rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: space.xxs },
  rowEn: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    fontWeight: weight.medium
  },
  rowTo: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    color: app.label2,
    overflowWrap: 'anywhere'
  },
  rowToOn: { color: colors.white, opacity: 0.85 },
  rowStar: { flexShrink: 0, color: colors.yellow, display: 'grid', placeItems: 'center' },
  empty: {
    margin: 0,
    paddingBlock: space.xxl,
    paddingInline: space.lg,
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },

  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexShrink: 0 },
  barTitle: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    textTransform: 'uppercase'
  },
  barTitleWide: { textAlign: 'start' },
  barBtn: {
    width: 44,
    height: 44,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: app.fill3,
    color: app.fg,
    cursor: 'pointer',
    opacity: { default: 1, ':disabled': 0.35 },
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.blue,
    outlineOffset: 1
  },
  starOn: { color: colors.yellow },

  card: {
    flex: 1,
    minHeight: 0,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: space.lg,
    paddingBlock: space.xl,
    paddingInline: space.xl,
    borderRadius: radius.xxl,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    overflowY: 'auto',
    // Focus lands here when a phrase opens so a screen reader announces it; it is not a control.
    // The style must be solid: an `auto` outline ignores its width and still draws.
    outlineStyle: 'solid',
    outlineWidth: 0
  },
  // The phrase is what a stranger reads at arm's length: heavy, solid and set as large as its longest word allows.
  phrase: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    lineHeight: 1,
    textWrap: 'balance',
    overflowWrap: 'break-word'
  },
  xl: { fontSize: typeScale.displayXl },
  lg: { fontSize: typeScale.displayLg },
  md: { fontSize: typeScale.display },
  sm: { fontSize: typeScale.largeTitle, lineHeight: leading.largeTitle, letterSpacing: tracking.largeTitle },
  xs: { fontSize: typeScale.title1, lineHeight: leading.title1, letterSpacing: tracking.title1 },
  xxs: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  say: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3
  },
  said: {
    marginBlock: 0,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator,
    color: app.fg,
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout
  },
  saidLabel: { color: app.label2 },

  steps: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexShrink: 0 },
  stepsText: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  placeholder: {
    flex: 1,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    padding: space.xl
  }
})
