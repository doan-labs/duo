import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
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
    backgroundColor: colors.white,
    color: colors.black,
    fontSize: appAppearance.photosFontSize
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
    backgroundColor: appAppearance.photosSidebarBackgroundColor,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: appAppearance.photosSidebarBorderColor
  },
  overlay: { position: 'absolute', inset: 0, right: 'auto', zIndex: 3 },
  scrim: { position: 'absolute', inset: 0, zIndex: 2, backgroundColor: appAppearance.photosSelectionBackgroundColor },
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
    fontSize: appAppearance.photosFontSize2,
    fontWeight: appAppearance.photosFontWeight,
    color: colors.grey
  },
  sideRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    height: 26,
    paddingInline: 8,
    borderRadius: appAppearance.photosBorderRadius,
    color: colors.black,
    textAlign: 'left',
    cursor: 'default'
  },
  sideRowOn: { backgroundColor: appAppearance.photosSelectionBackgroundColor },
  sideSym: { display: 'flex', width: 18, justifyContent: 'center', color: colors.blueBright },
  sideName: { minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  sideLock: { display: 'flex', marginLeft: 'auto', color: colors.grey },

  // ---- toolbar --------------------------------------------------------------
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  bar: { display: 'flex', alignItems: 'center', gap: 12, height: 92, paddingTop: 40, paddingInline: 10, flexShrink: 0 },
  heading: { flexShrink: 0, marginRight: 'auto', lineHeight: 1.2 },
  title: { fontSize: appAppearance.photosFontSize3, fontWeight: appAppearance.photosFontWeight },
  subtitle: {
    fontSize: appAppearance.photosFontSize2,
    color: colors.grey,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  pill: {
    display: 'flex',
    flexShrink: 0,
    height: 22,
    borderRadius: appAppearance.photosBorderRadius,
    backgroundColor: appAppearance.photosControlBackgroundColor,
    overflow: 'hidden',
    marginLeft: 'auto'
  },
  pillBtn: {
    width: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: { default: colors.black, ':disabled': colors.grey3 },
    backgroundColor: { default: 'transparent', ':hover': appAppearance.photosSelectionBackgroundColor }
  },
  segments: {
    display: 'flex',
    alignSelf: 'center',
    padding: 1,
    height: 22,
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: appAppearance.photosBorderRadius2,
    backgroundColor: appAppearance.photosControlBackgroundColor,
    flexShrink: 0
  },
  segment: {
    paddingInline: 8,
    borderRadius: appAppearance.photosBorderRadius,
    fontSize: appAppearance.photosFontSize2,
    fontWeight: appAppearance.photosFontWeight2,
    color: colors.black,
    whiteSpace: 'nowrap',
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '.15s'
  },
  segmentOn: { backgroundColor: colors.white, boxShadow: appAppearance.photosSegmentBoxShadow },
  actions: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  tool: {
    width: 28,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: appAppearance.photosBorderRadius,
    color: { default: colors.grey2, ':disabled': colors.grey3 },
    backgroundColor: { default: 'transparent', ':hover': appAppearance.photosControlBackgroundColor }
  },
  divider: { width: 1, height: 16, marginInline: 4, backgroundColor: appAppearance.photosSidebarBorderColor },
  searchRow: { display: 'flex', alignItems: 'center', gap: 8, paddingInline: 10, paddingBottom: 6, flexShrink: 0 },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexGrow: 1,
    height: 24,
    paddingInline: 6,
    borderRadius: appAppearance.photosBorderRadius2,
    backgroundColor: appAppearance.photosControlBackgroundColor,
    color: colors.grey
  },
  cancel: { color: colors.blueBright, fontSize: appAppearance.photosFontSize },
  searchIn: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.black,
    fontSize: appAppearance.photosFontSize
  },

  // ---- grid -----------------------------------------------------------------
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingInline: 16, paddingTop: 4 },
  groupTitle: {
    fontSize: appAppearance.photosFontSize3,
    fontWeight: appAppearance.photosFontWeight,
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
    borderRadius: appAppearance.photosBorderRadius3,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    outlineOffset: 1,
    transitionProperty: 'outline-color',
    transitionDuration: '.15s'
  },
  cellOn: { outlineColor: colors.blueBright },
  // The frame takes the photo's shape so the favourite badge sits on the photo, not the square cell.
  frame: {
    position: 'relative',
    display: 'block',
    borderRadius: appAppearance.photosBorderRadius3,
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
    filter: `drop-shadow(${appAppearance.photosBadgeTextShadow})`
  },
  count: {
    textAlign: 'center',
    paddingTop: 18,
    paddingBottom: 26,
    fontSize: appAppearance.photosFontSize,
    fontWeight: appAppearance.photosFontWeight
  },

  // ---- viewer ---------------------------------------------------------------
  viewer: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: appAppearance.photosViewerBackgroundColor,
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
  viewerTitle: { marginRight: 'auto', marginLeft: 6, fontWeight: appAppearance.photosFontWeight },
  viewerImg: { flexGrow: 1, minHeight: 0, objectFit: 'contain', width: '100%', paddingBottom: 12 }
})
