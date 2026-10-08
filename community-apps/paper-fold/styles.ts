import {
  app,
  colors,
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

export const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: app.bg,
    color: app.fg,
    fontFamily: fonts.system,
    overflow: 'hidden',
    position: 'relative',
    // Programmatic focus landing pad only (fold restores focus here) - never
    // meant to show a ring; interactive children keep their own focus styles.
    outlineWidth: 0
  },

  // ---------- split layout ----------
  split: {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    minHeight: 0
  },
  rail: {
    width: 300,
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
  // The rail is 300 pt: the usual 16 pt list pad plus the Section's own 16 pt
  // margins would leave a caption-width label column that word-stacks. Halve
  // the wrap pad and let the group run to the rail inset.
  listWrapRail: {
    paddingLeft: space.sm,
    paddingRight: space.sm
  },
  sectionFlush: {
    marginLeft: 0,
    marginRight: 0
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
    // System green alone is ~2.2:1 on light rows; pulling it toward the label
    // colour keeps the status hue at reading contrast in both appearances.
    color: `color-mix(in srgb, ${colors.green}, ${app.fg} 45%)`,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold
  },
  stepChip: {
    color: app.label2,
    fontSize: typeScale.caption1,
    fontWeight: weight.regular
  },
  // Model names are one line too: a block box in the pair column gets its
  // width from the column, so nowrap + ellipsis truncates instead of wrapping.
  titleText: {
    display: 'block',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // One line of secondary text per row: the blurb truncates ahead of the
  // level dots instead of stacking a second line under the label.
  subFlex: {
    display: 'flex',
    alignItems: 'baseline',
    minWidth: 0
  },
  subText: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
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
    // 34px thumb + 2x sm padding keeps the tap target at/above 44pt.
    paddingTop: space.sm,
    paddingBottom: space.sm,
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
    backgroundColor: app.fill3,
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
    // A fill mat under the white diagram paper: app.surface made the sheet
    // and the stage the same colour, so the paper silhouette vanished.
    backgroundColor: app.fill3,
    borderRadius: radius.xl,
    boxShadow: shadow.card,
    padding: space.lg,
    // Shrinks below square rather than pushing the transport off-screen on a
    // short pane; the SVG letterboxes inside.
    flexShrink: 1,
    minHeight: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
  // Secondary status label in the header flow (was an absolute centre overlay,
  // which let it collide with a flexing title). In flow it gets its own bounds
  // plus the shared.hdr token gap, and can never overlap the title.
  hdrStatus: {
    color: app.label2,
    fontSize: typeScale.footnote,
    fontWeight: weight.medium,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    alignSelf: 'baseline'
  },
  hdrGrow: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    alignSelf: 'baseline'
  },
  levelDots: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.xxs,
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: space.xs
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
  // A Row rendered as a <button> shrinks to its content (UA fit-content) and
  // centres its text; pin it to the group width and left reading edge so the
  // label column, not the browser, decides the row's shape.
  rowTap: {
    width: '100%',
    textAlign: 'left',
    transitionProperty: 'background-color',
    transitionDuration: '.15s',
    backgroundColor: { default: app.surface, ':active': app.fill }
  },
  // shared.press/pill carry no reduced-motion override (platform gap, reported).
  // StyleX replaces a property's whole condition map on merge, so the :active
  // scale is restated here and flattened only inside the reduce branch; the
  // media rule sorts after the base rule and wins under reduced motion.
  pressCalm: {
    transform: {
      default: null,
      ':active': motion.press,
      '@media (prefers-reduced-motion: reduce)': {
        default: null,
        ':active': 'none'
      }
    }
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
