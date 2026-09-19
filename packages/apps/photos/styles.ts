import {
  app,
  appAppearance,
  colors,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const wide = '@container (min-width: 600px)'

export const styles = stylex.create({
  root: {
    position: 'relative',
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    containerType: 'inline-size',
    backgroundColor: app.surface,
    color: app.fg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  // StyleX drops a property for a `null` condition instead of overriding it, so both values are explicit.
  wideOnly: { display: { default: 'none', [wide]: 'flex' } },
  narrowOnly: { display: { default: 'flex', [wide]: 'none' } },

  // ---- sidebar --------------------------------------------------------------
  side: {
    width: 180,
    height: '100%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.photosSidebar,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.photosSidebarBorder
  },
  overlay: { position: 'absolute', inset: 0, right: 'auto', zIndex: 3 },
  scrim: { position: 'absolute', inset: 0, zIndex: 2, backgroundColor: appAppearance.photosSelection },
  // The window runs under the status stack (`edge`), so each column pads its own top 40px.
  sideTop: {
    display: 'flex',
    justifyContent: 'flex-end',
    height: 80,
    paddingTop: 40,
    paddingInline: 10,
    alignItems: 'center'
  },
  sideScroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingInline: 10, paddingBottom: 12 },
  sideSection: {
    paddingTop: 12,
    paddingBottom: 3,
    paddingInline: 8,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    color: app.label2
  },
  sideRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    height: 26,
    paddingInline: 8,
    borderRadius: radius.xs,
    color: app.fg,
    textAlign: 'left',
    cursor: 'default'
  },
  sideRowOn: { backgroundColor: appAppearance.photosSelection },
  sideSym: { display: 'flex', width: 18, justifyContent: 'center', color: app.link },
  sideName: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  sideLock: { display: 'flex', marginLeft: 'auto', color: app.label2 },

  // ---- toolbar --------------------------------------------------------------
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  bar: { display: 'flex', alignItems: 'center', gap: 12, height: 92, paddingTop: 40, paddingInline: 10, flexShrink: 0 },
  heading: { flexShrink: 0, marginRight: 'auto' },
  title: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  subtitle: {
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    color: app.label2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  pill: {
    display: 'flex',
    flexShrink: 0,
    height: 22,
    borderRadius: radius.xs,
    backgroundColor: appAppearance.photosControl,
    overflow: 'hidden',
    marginLeft: 'auto'
  },
  pillBtn: {
    width: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: { default: app.fg, ':disabled': app.label3 },
    backgroundColor: { default: 'transparent', ':hover': appAppearance.photosSelection }
  },
  segments: {
    display: 'flex',
    alignSelf: 'center',
    padding: 1,
    height: 22,
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: radius.sm,
    backgroundColor: appAppearance.photosControl,
    flexShrink: 0
  },
  segment: {
    paddingInline: 8,
    borderRadius: radius.xs,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.medium,
    color: app.fg,
    whiteSpace: 'nowrap',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.15s'
  },
  segmentOn: { backgroundColor: app.control, boxShadow: shadow.card },
  actions: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  tool: {
    width: 28,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: radius.xs,
    color: { default: app.label2, ':disabled': app.label3 },
    backgroundColor: { default: 'transparent', ':hover': appAppearance.photosControl }
  },
  divider: { width: 1, height: 16, marginInline: 4, backgroundColor: appAppearance.photosSidebarBorder },
  searchRow: { display: 'flex', alignItems: 'center', gap: 8, paddingInline: 10, paddingBottom: 6, flexShrink: 0 },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexGrow: 1,
    height: 24,
    paddingInline: 6,
    borderRadius: radius.sm,
    backgroundColor: appAppearance.photosControl,
    color: app.label2
  },
  cancel: { color: app.link, fontSize: typeScale.footnote },
  searchIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: app.fg,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },

  // ---- grid -----------------------------------------------------------------
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingInline: 16, paddingTop: 4 },
  groupTitle: {
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold,
    paddingTop: 12,
    paddingBottom: 8,
    margin: 0
  },
  grid: { display: 'grid', gap: 8, marginBottom: 8 },
  cells: (min: number) => ({ gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))` }),
  cell: {
    position: 'relative',
    aspectRatio: 1,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    borderRadius: radius.xs,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    outlineOffset: 1,
    transitionProperty: 'outline-color',
    transitionDuration: '.15s'
  },
  cellOn: { outlineColor: app.link },
  // The frame takes the photo's shape so the favourite badge sits on the photo, not the square cell.
  frame: {
    position: 'relative',
    display: 'block',
    borderRadius: radius.xs,
    overflow: 'hidden'
  },
  ratio: (r: number) => ({ aspectRatio: r }),
  square: { width: '100%', height: '100%' },
  landscape: { width: '100%' },
  portrait: { height: '100%' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    display: 'flex',
    color: colors.white,
    filter: `drop-shadow(${shadow.text})`
  },
  count: {
    textAlign: 'center',
    paddingTop: 18,
    paddingBottom: 26,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },

  // ---- viewer ---------------------------------------------------------------
  viewer: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.photosViewer,
    color: colors.white
  },
  viewerBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    height: 84,
    paddingTop: 40,
    paddingInline: 12,
    flexShrink: 0
  },
  viewerTitle: { marginRight: 'auto', marginLeft: 6, fontWeight: weight.semibold },
  viewerImg: { flexGrow: 1, minHeight: 0, objectFit: 'contain', width: '100%', paddingBottom: 12 }
})
