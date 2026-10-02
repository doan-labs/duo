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
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
    flexShrink: 0,
    paddingTop: space.xl,
    paddingRight: space.xl,
    paddingBottom: space.sm,
    paddingLeft: space.xl
  },
  docName: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    textAlign: 'start',
    transitionProperty: 'transform, color',
    transitionDuration: motion.pressDuration,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  docNameText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  docCaret: {
    flexShrink: 0,
    color: app.label3,
    display: 'grid',
    placeItems: 'center'
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
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    flexGrow: 1,
    overflowY: 'auto',
    paddingTop: space.xs,
    paddingRight: space.xl,
    paddingBottom: `calc(${space.xxxl} + ${space.xl})`,
    paddingLeft: space.xl
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
    position: 'relative',
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
    outlineColor: app.link,
    outlineOffset: 2
  },
  boardGrid: (size: number) => ({
    gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
    gap: space.xxs
  }),
  boardEmpty: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
    color: app.label3
  },
  boardEmptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.lg,
    paddingInline: space.xl,
    borderRadius: radius.lg,
    backgroundColor: app.surface
  },
  boardEmptyTitle: {
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.medium
  },
  boardEmptyHint: {
    color: app.label3,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  cell: {
    minWidth: 0,
    minHeight: 0,
    padding: 0,
    borderWidth: 0,
    backgroundColor: app.fill3,
    transitionProperty: 'background-color',
    transitionDuration: motion.pressDuration,
    transitionTimingFunction: easing.pop
  },
  cellPaint: (color: string) => ({
    backgroundColor: color
  }),
  cellFocus: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: app.link,
    outlineOffset: -2
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    flexWrap: 'wrap'
  },
  toolCluster: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.md,
    backgroundColor: app.fill
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
  sectionEdit: {
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: app.link,
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    fontWeight: weight.medium,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: 'scale(1)', ':active': motion.press }
  },
  palette: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm
  },
  swatch: {
    width: 44,
    height: 44,
    padding: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderRadius: radius.md,
    cursor: 'pointer',
    flexShrink: 0,
    transitionProperty: 'transform, outline-color',
    transitionDuration: { default: motion.pressDuration, [reduce]: '0s' },
    transitionTimingFunction: easing.pop
  },
  swatchOn: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: app.link,
    outlineOffset: 2,
    transform: 'scale(1.1)'
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
  previewDetailWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
    overflow: 'hidden'
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
  actionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs
  },
  actionDanger: {
    color: colors.redDark
  },
  sheetField: {
    width: '100%'
  },
  galleryEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.xxl,
    paddingInline: space.lg,
    textAlign: 'center',
    color: app.label2,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  galleryEmptyIcon: {
    color: app.label3
  },
  galleryItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: app.surface,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  galleryOpenRow: {
    flexGrow: 1,
    minWidth: 0,
    borderBottomWidth: 0
  },
  galleryFoot: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: space.sm,
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg
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
    outlineColor: app.link,
    outlineOffset: 1
  },
  slotRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm
  },
  slotChip: {
    width: 44,
    height: 44,
    padding: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderRadius: radius.sm,
    cursor: 'pointer',
    transitionProperty: 'transform, outline-color',
    transitionDuration: { default: motion.pressDuration, [reduce]: '0s' },
    transitionTimingFunction: easing.pop
  }
})
