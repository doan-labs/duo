import {
  app,
  colors,
  easing,
  fonts,
  leading,
  motion,
  radius,
  shadow,
  space,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const reduce = '@media (prefers-reduced-motion: reduce)'

const boardIn = stylex.keyframes({
  from: { opacity: 0, scale: '.98', translate: `0 ${space.md}` },
  to: { opacity: 1, scale: '1', translate: '0 0' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.xl,
    paddingRight: space.xl,
    paddingBottom: `calc(${space.xxxl} + ${space.xl})`,
    paddingLeft: space.xl,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.regular,
    color: app.fg,
    backgroundColor: app.bg
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    flexShrink: 0
  },
  brand: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs
  },
  kicker: {
    color: colors.cyanDark,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  },
  docName: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    textAlign: 'start'
  },
  docNameText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dirty: {
    flexShrink: 0,
    width: space.sm,
    height: space.sm,
    borderRadius: radius.circle,
    backgroundColor: colors.orangeDark
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 0
  },
  stage: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    flexGrow: 1
  },
  stageWide: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
    columnGap: space.xxl,
    alignItems: 'start'
  },
  canvasCol: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md
  },
  boardWrap: {
    padding: space.sm,
    borderRadius: radius.xl,
    backgroundColor: app.surface,
    boxShadow: shadow.card,
    animationName: { default: boardIn, [reduce]: 'none' },
    animationDuration: motion.pressDuration,
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  board: {
    display: 'grid',
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: app.separator,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: 'crosshair',
    outlineWidth: { default: 0, ':focus-visible': 2 },
    outlineStyle: 'solid',
    outlineColor: colors.cyanDark,
    outlineOffset: 2
  },
  boardGrid: (size: number) => ({
    gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
    gap: space.xxs
  }),
  cell: {
    minWidth: 0,
    minHeight: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: app.fill3
  },
  cellPaint: (color: string) => ({
    backgroundColor: color
  }),
  cellFocus: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: colors.cyanDark,
    outlineOffset: -2
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    flexWrap: 'wrap'
  },
  toolActions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs
  },
  redoFlip: {
    transform: 'scaleX(-1)'
  },
  section: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium
  },
  palette: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm
  },
  swatch: {
    width: 28,
    height: 28,
    padding: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderRadius: radius.sm,
    cursor: 'pointer',
    flexShrink: 0
  },
  swatchOn: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: colors.cyanDark,
    outlineOffset: 1
  },
  swatchAdd: {
    display: 'grid',
    placeItems: 'center',
    color: app.label2,
    backgroundColor: app.fill3
  },
  rail: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md
  },
  previewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: space.sm,
    paddingInline: space.md,
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    boxShadow: shadow.card
  },
  mosaic: {
    flexShrink: 0,
    display: 'grid',
    width: `calc(${space.xxxl} * 2)`,
    aspectRatio: '1 / 1',
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: app.fill2
  },
  mosaicGrid: (size: number) => ({
    gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`
  }),
  mosaicCell: {
    minWidth: 0,
    minHeight: 0,
    backgroundColor: 'transparent'
  },
  previewMeta: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs
  },
  previewLabel: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold
  },
  previewDetail: {
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium
  },
  previewSub: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  status: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    flexShrink: 0
  },
  sheetBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingBlock: space.lg,
    paddingInline: space.lg
  },
  sheetTitle: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold
  },
  sheetHint: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  sheetActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: space.sm
  },
  sheetField: {
    width: '100%'
  },
  galleryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    maxHeight: 320,
    overflowY: 'auto'
  },
  galleryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xs,
    borderRadius: radius.md
  },
  galleryOpen: {
    minWidth: 0,
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xs,
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    textAlign: 'start',
    cursor: 'pointer'
  },
  galleryThumb: {
    flexShrink: 0,
    display: 'grid',
    width: 44,
    aspectRatio: '1 / 1',
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: app.fill2
  },
  galleryMeta: {
    minWidth: 0,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  galleryName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium
  },
  galleryDetail: {
    color: app.label2,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2
  },
  galleryEmpty: {
    marginBlock: 0,
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    textAlign: 'center',
    paddingBlock: space.md
  },
  catalogGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: space.sm
  },
  catalogSwatch: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    padding: space.xs,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    cursor: 'pointer'
  },
  catalogChip: {
    width: '100%',
    height: 28,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderRadius: radius.xs
  },
  catalogOn: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: colors.cyanDark,
    outlineOffset: 1
  },
  slotRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm
  },
  slotChip: {
    width: 32,
    height: 32,
    padding: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderRadius: radius.sm,
    cursor: 'pointer'
  }
})
