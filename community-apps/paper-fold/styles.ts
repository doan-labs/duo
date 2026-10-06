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
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: app.bg,
    color: app.fg,
    fontFamily: fonts.system,
    overflow: 'hidden',
    position: 'relative'
  },

  // ---------- split layout ----------
  split: {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    minHeight: 0
  },
  rail: {
    width: 284,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator,
    minHeight: 0
  },
  coach: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },

  // ---------- models list ----------
  listWrap: {
    paddingTop: space.sm,
    paddingBottom: space.lg,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg
  },
  modelIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.md,
    backgroundColor: app.fill3,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneChip: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    color: colors.green,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold
  },
  stepChip: {
    color: app.label2,
    fontSize: typeScale.caption1,
    fontWeight: weight.regular
  },
  subFlex: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs
  },

  // ---------- coach ----------
  stage: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden'
  },
  stepRail: {
    width: 168,
    flexShrink: 0,
    overflowY: 'auto',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    paddingLeft: space.sm,
    paddingRight: space.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    paddingLeft: space.xs,
    paddingRight: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlign: 'left',
    fontFamily: fonts.system,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.fg,
    cursor: 'pointer',
    flexShrink: 0
  },
  stepItemOn: {
    backgroundColor: app.fill3
  },
  stepThumb: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: app.surface,
    overflow: 'hidden'
  },
  stepItemLabel: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  stepNum: {
    color: app.label3,
    fontSize: typeScale.caption2,
    fontWeight: weight.regular,
    minWidth: 14,
    textAlign: 'right'
  },

  pane: {
    flexGrow: 1,
    minWidth: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    gap: space.md
  },
  paneNarrow: {
    paddingLeft: space.md,
    paddingRight: space.md
  },
  card: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: '1',
    backgroundColor: app.surface,
    borderRadius: radius.xl,
    boxShadow: shadow.card,
    padding: space.lg,
    flexShrink: 0
  },
  cardInner: {
    maxWidth: 300
  },
  stepTitle: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    textAlign: 'center'
  },
  stepText: {
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: app.fg,
    textAlign: 'center',
    maxWidth: 420
  },

  dots: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.xs
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.circle,
    backgroundColor: app.fill2
  },
  dotOn: {
    backgroundColor: app.fg
  },
  dotDone: {
    backgroundColor: colors.green
  },

  transport: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: 'auto',
    paddingTop: space.sm,
    width: '100%',
    maxWidth: 420,
    justifyContent: 'space-between'
  },
  transportMid: {
    color: app.label2,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    fontWeight: weight.medium
  },
  navBtn: {
    paddingTop: space.md,
    paddingBottom: space.md,
    minWidth: 108
  },

  // ---------- result ----------
  resultTitle: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    textAlign: 'center'
  },
  resultText: {
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    color: app.label2,
    textAlign: 'center',
    maxWidth: 380
  },
  resultBtns: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: space.sm
  },

  // ---------- header extras ----------
  hdrCenter: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    color: app.label2,
    fontSize: typeScale.footnote,
    fontWeight: weight.medium,
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  },
  hdrGrow: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  levelDots: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.xxs,
    alignItems: 'center'
  },
  levelDot: {
    width: 5,
    height: 5,
    borderRadius: radius.circle,
    backgroundColor: app.fill2
  },
  levelOn: {
    backgroundColor: colors.orange
  },

  appBody: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  coverList: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  coverScroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto'
  },
  rowOn: {
    backgroundColor: app.fill3
  },
  soundBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Transparent 44pt hit box; the glyph itself stays header-sized.
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.link,
    cursor: 'pointer',
    padding: 0
  },
  // 44pt hit box for the kit IconButton (which ships at 30x24).
  hdrTap: {
    width: 44,
    height: 44
  },
  // Back chevron: glyph keeps shared.bk's position, tap area reaches 44pt.
  bkTap: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'flex-start'
  },

  // ---------- legend sheet ----------
  sheetCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    paddingLeft: space.lg,
    paddingRight: space.lg
  },
  legendRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md
  },
  legendSample: {
    width: 56,
    height: 30,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: app.fill3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  legendText: {
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    color: app.fg
  },
  legendCap: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    color: app.label2
  },

  // ---------- placeholder ----------
  emptyWrap: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md
  }
})
