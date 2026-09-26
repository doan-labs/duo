import {
  app,
  appAppearance,
  colors,
  easing,
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

const turn = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

export const styles = stylex.create({
  scs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 14,
    paddingInline: 16,
    paddingBottom: 20
  },
  /** Card shell: the button is the card; the menu button and state overlay float over it. */
  shell: { position: 'relative' },
  sc: {
    position: 'relative',
    width: '100%',
    borderRadius: radius.xl,
    paddingTop: 13,
    paddingRight: 13,
    paddingBottom: 13,
    paddingLeft: 13,
    minHeight: 92,
    color: colors.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    textAlign: 'left',
    overflow: 'hidden',
    transitionProperty: 'transform',
    transitionDuration: motion.pressDuration,
    transform: { default: null, ':active': motion.press }
  },
  bg: (img: string) => ({ backgroundImage: img }),
  glyph: { fontSize: typeScale.title2, lineHeight: leading.title2, letterSpacing: tracking.title2 },
  name: {
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold
  },
  /** The card's menu button, top right. */
  more: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    color: colors.white,
    zIndex: 2
  },
  /** The card's own pop-up menu, anchored under the more button. */
  menu: { position: 'absolute', top: 36, right: space.sm, minWidth: 140 },
  ok: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.shortcutsScrim,
    fontSize: typeScale.largeTitle,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  okOn: { opacity: 1 },
  fail: { color: colors.red },
  spin: {
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    borderWidth: 3,
    borderStyle: 'solid',
    borderColor: app.fill2,
    borderTopColor: colors.white,
    animationName: { default: turn, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.8s',
    animationTimingFunction: easing.linear,
    animationIterationCount: 'infinite'
  },
  hdrSm: { fontSize: typeScale.title3, lineHeight: leading.title3, letterSpacing: tracking.title3 },
  /** An automation row: the editor opener on the left, its switch on the right. */
  auto: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: app.surface,
    borderBottomWidth: { default: 1, ':last-child': 0 },
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  autoBtn: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingTop: 11,
    paddingRight: 0,
    paddingBottom: 11,
    paddingLeft: space.lg,
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: { default: 'transparent', ':active': app.fill3 },
    color: 'inherit'
  },
  autoTx: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flexGrow: 1 },
  autoSub: { color: app.label2 },
  autoOff: { opacity: 0.45 },
  autoSwitch: { paddingRight: space.lg, display: 'flex' },
  enabledRow: { paddingTop: 11, paddingBottom: 11, paddingLeft: space.lg },
  empty: {
    paddingTop: space.lg,
    paddingBottom: space.lg,
    paddingInline: space.lg,
    textAlign: 'center',
    color: app.label2
  },
  /** The header line: the large title and the New Shortcut button beside it. */
  headRow: { display: 'flex', alignItems: 'center', paddingRight: space.lg },
  hero: { flexGrow: 1 },
  histTitle: { display: 'flex', alignItems: 'center' },
  clear: {
    marginLeft: 'auto',
    marginRight: space.lg,
    color: app.link,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    cursor: 'pointer'
  },
  runMark: { paddingLeft: space.lg, width: 20, color: app.link },
  runTx: { paddingTop: 11, paddingBottom: 11, paddingLeft: space.sm },
  runTime: { marginLeft: 'auto', paddingRight: space.lg, flexShrink: 0 },
  // ---------- the editors ----------
  sheet: { width: 340, maxWidth: 'calc(100vw - 24px)', color: app.fg },
  edHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    paddingBottom: space.sm,
    paddingInline: space.lg,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: app.separator
  },
  edTitle: { fontWeight: weight.semibold },
  edBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    padding: space.lg,
    maxHeight: '65vh',
    overflowY: 'auto'
  },
  field: { display: 'flex', flexDirection: 'column', gap: space.xs },
  /** fieldset resets for the icon grid and the step list. */
  fieldset: { borderWidth: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, minInlineSize: 0 },
  legend: { paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, marginBottom: space.xs },
  label: { color: app.label2 },
  icons: { display: 'flex', flexWrap: 'wrap', gap: space.sm },
  iconPick: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    fontSize: typeScale.title3,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': app.fill3 },
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
    cursor: 'pointer',
    transitionProperty: 'transform, background-color, border-color',
    transitionDuration: `${motion.pressDuration}, .15s, .15s`,
    transform: { default: null, ':active': motion.press }
  },
  iconOn: { backgroundColor: app.fill2, borderColor: app.link },
  steps: { display: 'flex', flexDirection: 'column', gap: space.sm },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: app.fill3
  },
  stepSel: { flexGrow: 1, minWidth: 0 },
  danger: { color: colors.red },
  // ---------- the toast ----------
  toast: {
    position: 'absolute',
    left: '50%',
    bottom: space.xxl,
    transform: 'translateX(-50%)',
    paddingTop: space.sm,
    paddingRight: space.lg,
    paddingBottom: space.sm,
    paddingLeft: space.lg,
    borderRadius: radius.pill,
    backgroundColor: app.elevated,
    boxShadow: shadow.float,
    color: app.fg,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    whiteSpace: 'nowrap',
    zIndex: 8
  }
})
