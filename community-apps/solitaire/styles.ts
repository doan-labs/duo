import {
  app,
  colors,
  easing,
  fonts,
  glass,
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

// One-shot keyframes only touch transform and opacity.
const dealIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 14px', scale: '.9' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const cardIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 10px', scale: '.95' },
  '100%': { opacity: 1, translate: '0 0', scale: '1' }
})
const lineIn = stylex.keyframes({
  '0%': { opacity: 0, translate: '0 6px' },
  '100%': { opacity: 1, translate: '0 0' }
})
const shakeX = stylex.keyframes({
  '0%,100%': { translate: '0 0' },
  '25%': { translate: '-4px 0' },
  '55%': { translate: '4px 0' },
  '80%': { translate: '-2px 0' }
})
const winHop = stylex.keyframes({
  '0%,100%': { translate: '0 0' },
  '40%': { translate: '0 -14%' }
})
const slotPulse = stylex.keyframes({
  '0%,100%': { opacity: 0.35 },
  '50%': { opacity: 0.9 }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingTop: space.md,
    // The home bar owns the bottom 22 px; everything clears it.
    paddingBottom: space.xxl,
    paddingInline: space.md,
    color: colors.white,
    // The felt: a deep green table, lit from the top edge like the real baize.
    backgroundColor: `color-mix(in srgb, ${colors.green} 26%, ${colors.black})`,
    backgroundImage: `radial-gradient(120% 60% at 50% -8%,color-mix(in srgb, ${colors.green} 34%, transparent),transparent 62%),radial-gradient(80% 44% at 50% 112%,color-mix(in srgb, ${colors.tealDark} 14%, transparent),transparent 65%)`,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    flexShrink: 0,
    minHeight: 44
  },
  brand: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  kicker: {
    color: colors.greenDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  },
  title: {
    marginBlock: 0,
    fontFamily: fonts.rounded,
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    fontWeight: weight.bold,
    letterSpacing: tracking.title2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  scores: { display: 'flex', gap: space.xs, flexShrink: 0 },
  chip: {
    minWidth: 46,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    paddingBlock: space.xxs,
    paddingInline: space.xs,
    borderRadius: radius.lg,
    backgroundColor: `color-mix(in srgb, ${colors.black} 30%, transparent)`,
    boxShadow: shadow.rim
  },
  chipLabel: {
    color: `color-mix(in srgb, ${colors.white} 55%, transparent)`,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2
  },
  chipValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.headline,
    fontWeight: weight.bold,
    lineHeight: leading.headline,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center'
  },
  // The board: one measured region; cards position absolutely inside it.
  // Positions come from the measured fit, so this is a dynamic entry.
  place: (x: number, y: number, w: number, h: number, z: number) => ({
    left: x,
    top: y,
    width: w,
    height: h,
    zIndex: z
  }),
  board: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
    perspective: '700px'
  },
  // A pile's empty landing spot: a quiet well that also takes taps.
  slot: {
    position: 'absolute',
    borderWidth: 0,
    padding: 0,
    borderRadius: radius.sm,
    backgroundColor: `color-mix(in srgb, ${colors.black} 18%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.white} 14%, transparent)`,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'box-shadow,background-color',
    transitionDuration: '.18s',
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  slotMark: { color: `color-mix(in srgb, ${colors.white} 30%, transparent)` },
  slotHot: {
    backgroundColor: `color-mix(in srgb, ${colors.green} 30%, ${colors.black} 30%)`,
    boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${colors.white} 45%, transparent)`,
    animationName: { default: slotPulse, [reduce]: 'none' },
    animationDuration: '1.2s',
    animationTimingFunction: easing.inOut,
    animationIterationCount: 'infinite'
  },
  // One playing card: the shell positions it; the inner face flips.
  card: {
    position: 'absolute',
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transformStyle: 'preserve-3d',
    transitionProperty: 'transform',
    transitionDuration: '.3s',
    transitionTimingFunction: easing.pop,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    ':focus-visible': { zIndex: 4000 }
  },
  // The deal wave's per-card stagger, set from the deal index at render time.
  delayAt: (ms: number) => ({ animationDelay: `${ms}ms` }),
  cardInner: {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    transitionProperty: 'transform',
    transitionDuration: '.34s',
    transitionTimingFunction: easing.pop
  },
  cardInnerDown: { transform: 'rotateY(180deg)' },
  faceSide: {
    position: 'absolute',
    inset: 0,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden'
  },
  faceFront: {
    backgroundColor: colors.white,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.black} 12%, transparent),${shadow.card}`
  },
  faceBack: {
    transform: 'rotateY(180deg)',
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.white} 16%, transparent),${shadow.card}`
  },
  // A settled face-down card: flat back art with the same chrome, no flip rig.
  cardDownStill: {
    position: 'absolute',
    borderRadius: radius.sm,
    overflow: 'hidden',
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.white} 16%, transparent),${shadow.card}`
  },
  // The lifted selected run: a blue ring around every card it covers.
  selected: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: app.link,
    outlineOffset: 2,
    borderRadius: radius.sm
  },
  foundationMark: { width: '55%', aspectRatio: '1' },
  // A legal destination breathing under the selected run.
  hotCard: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: `color-mix(in srgb, ${colors.green} 80%, ${colors.white})`,
    outlineOffset: 2,
    borderRadius: radius.sm
  },
  shake: {
    animationName: { default: shakeX, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.inOut
  },
  dealIn: {
    animationName: { default: dealIn, [reduce]: 'none' },
    animationDuration: '.3s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'backwards'
  },
  hop: {
    animationName: { default: winHop, [reduce]: 'none' },
    animationDuration: '.6s',
    animationTimingFunction: easing.inOut
  },
  // Face contents (cards.tsx draws into these).
  face: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    color: colors.grey6Dark
  },
  corner: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xxs,
    width: '22%',
    lineHeight: 1
  },
  cornerTop: { top: '4%', left: '5%' },
  cornerBottom: { bottom: '4%', right: '5%', transform: 'rotate(180deg)' },
  cornerRank: {
    fontFamily: fonts.rounded,
    fontWeight: weight.bold,
    letterSpacing: tracking.title2
  },
  // Corner type scales with the card: the board passes the card's px size in.
  cardFont: (font: number) => ({ fontSize: font }),
  cornerSuit: { display: 'block', width: '72%', aspectRatio: '1' },
  suitGlyph: { display: 'block', width: '100%', height: '100%' },
  // The suit's ink: black or red from the kit ramp, passed per card.
  suitInk: (color: string) => ({ color }),
  suitGrow: {},
  acePip: {
    position: 'absolute',
    top: '26%',
    left: '26%',
    width: '48%',
    aspectRatio: '1',
    display: 'block'
  },
  soloPip: {
    position: 'absolute',
    top: '31%',
    left: '31%',
    width: '38%',
    aspectRatio: '1',
    display: 'block'
  },
  court: {
    position: 'absolute',
    top: '18%',
    left: '16%',
    width: '68%',
    aspectRatio: '1',
    display: 'block'
  },
  courtArt: { display: 'block', width: '100%', height: '100%' },
  pipGrid: { position: 'absolute', inset: 0, display: 'block' },
  pip: { position: 'absolute', width: '17%', aspectRatio: '1', display: 'block' },
  pipAt: (x: number, y: number) => ({
    // The 3x4 field sits inside the corners' free space.
    left: `${26 + x * 24}%`,
    top: `${16 + y * 22.4}%`
  }),
  pipFlip: { transform: 'rotate(180deg)' },
  back: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    borderRadius: radius.sm,
    backgroundColor: `color-mix(in srgb, ${colors.indigoDark} 58%, ${colors.black})`,
    backgroundImage: `repeating-linear-gradient(45deg,color-mix(in srgb, ${colors.white} 7%, transparent) 0 2px,transparent 2px 9px),repeating-linear-gradient(-45deg,color-mix(in srgb, ${colors.white} 7%, transparent) 0 2px,transparent 2px 9px)`,
    overflow: 'hidden'
  },
  backFrame: {
    position: 'absolute',
    inset: '7%',
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.xs,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.white} 24%, transparent)`
  },
  backMark: { width: '46%', height: '46%' },
  // The toolbar: five labelled actions the same on both displays.
  toolbar: { display: 'flex', gap: space.xs, flexShrink: 0 },
  toolbarWide: { flexDirection: 'column' },
  tool: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.xs,
    paddingInline: space.xxs,
    color: colors.white,
    backgroundColor: {
      default: `color-mix(in srgb, ${colors.black} 24%, transparent)`,
      ':hover': `color-mix(in srgb, ${colors.black} 34%, transparent)`
    },
    boxShadow: shadow.rim,
    fontFamily: fonts.system,
    fontSize: typeScale.caption2,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption2,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color,color',
    transitionDuration: `${motion.pressDuration},.18s,.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  toolWide: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingInline: space.md,
    gap: space.sm,
    fontSize: typeScale.footnote,
    letterSpacing: tracking.footnote
  },
  toolDisabled: { opacity: 0.42, cursor: 'default' },
  toolOn: { color: colors.yellowDark },
  // The muted speaker: a diagonal off-bar over the volume glyph.
  muteWrap: { position: 'relative', display: 'inline-flex' },
  muteSlash: {
    position: 'absolute',
    top: '50%',
    left: '-15%',
    width: '130%',
    height: '2px',
    borderRadius: radius.pill,
    backgroundColor: 'currentColor',
    transform: 'translateY(-50%) rotate(-35deg)',
    pointerEvents: 'none'
  },
  // The Draw 1 / Draw 3 rules switch: same radiogroup contract as the kit's Segmented.
  segTrack: {
    display: 'flex',
    gap: space.xxs,
    padding: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: `color-mix(in srgb, ${colors.black} 26%, transparent)`,
    flexShrink: 0
  },
  segBtn: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 44,
    height: '100%',
    paddingInline: space.sm,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: `color-mix(in srgb, ${colors.white} 62%, transparent)`,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    overflow: 'hidden',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'color,background-color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.inOut,
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  segOn: {
    backgroundColor: colors.white,
    color: `color-mix(in srgb, ${colors.green} 52%, ${colors.black})`,
    boxShadow: shadow.card
  },
  segLabel: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  status: {
    marginBlock: 0,
    color: `color-mix(in srgb, ${colors.white} 62%, transparent)`,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1,
    textAlign: 'center',
    minHeight: 18,
    flexShrink: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  statusWide: { textAlign: 'start' },
  statusWarn: { color: colors.yellowDark, fontWeight: weight.semibold },
  statusAlert: { color: colors.orangeDark, fontWeight: weight.semibold },
  // The win card: floats over the table like Minesweeper's result card.
  result: {
    position: 'absolute',
    insetInline: space.md,
    bottom: space.xxxl,
    zIndex: 6000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: space.md,
    paddingInline: space.lg,
    borderRadius: radius.xxl,
    color: colors.white,
    backgroundColor: glass.tintDark,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim},${shadow.float}`,
    animationName: { default: cardIn, [reduce]: 'none' },
    animationDuration: '.32s',
    animationTimingFunction: easing.bounce,
    animationFillMode: 'both'
  },
  resultCopy: { display: 'flex', flexDirection: 'column', gap: space.xxs, minWidth: 0 },
  resultKicker: {
    color: colors.yellowDark,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  resultLine: {
    animationName: { default: lineIn, [reduce]: 'none' },
    animationDuration: '.28s',
    animationTimingFunction: easing.pop,
    animationFillMode: 'both'
  },
  resultDelay: (ms: number) => ({ animationDelay: `${ms}ms` }),
  resultTitle: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.title3,
    fontWeight: weight.bold,
    letterSpacing: tracking.title3,
    lineHeight: leading.title3
  },
  resultSub: {
    color: app.label2,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    letterSpacing: tracking.caption1
  },
  primary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: {
      default: app.link,
      ':hover': `color-mix(in srgb, ${app.link} 86%, ${colors.white})`
    },
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.bold,
    cursor: 'pointer',
    flexShrink: 0,
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  action: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    flexGrow: 1,
    minHeight: 44,
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    color: colors.white,
    backgroundColor: { default: app.fill3, ':hover': app.fill2 },
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'transform,background-color',
    transitionDuration: `${motion.pressDuration},.18s`,
    transitionTimingFunction: easing.pop,
    transform: { default: 'scale(1)', ':active': motion.press },
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: 2 }
  },
  // The mode radio list the wide rail uses, same as Minesweeper's picker.
  pickPanel: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: radius.lg,
    backgroundColor: `color-mix(in srgb, ${colors.black} 26%, transparent)`,
    overflow: 'hidden',
    flexShrink: 0
  },
  pickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingInline: space.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.footnote,
    fontWeight: weight.regular,
    textAlign: 'start',
    cursor: 'pointer',
    touchAction: 'manipulation',
    transitionProperty: 'color,background-color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.inOut,
    ':focus-visible': { outline: `2px solid ${colors.white}`, outlineOffset: -2 }
  },
  pickRowSep: {
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: `color-mix(in srgb, ${colors.white} 12%, transparent)`
  },
  pickLabel: { fontWeight: weight.semibold },
  pickMeta: {
    marginLeft: 'auto',
    color: `color-mix(in srgb, ${colors.white} 55%, transparent)`,
    fontSize: typeScale.caption2
  },
  pickCheck: { color: colors.yellowDark, width: '13px', flexShrink: 0, textAlign: 'center' },
  statsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderRadius: radius.xl,
    backgroundColor: `color-mix(in srgb, ${colors.black} 26%, transparent)`,
    boxShadow: shadow.rim
  },
  statsRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  statsName: {
    color: `color-mix(in srgb, ${colors.white} 62%, transparent)`,
    fontSize: typeScale.caption1,
    fontWeight: weight.semibold,
    letterSpacing: tracking.caption1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  statsNameOn: { color: colors.yellowDark },
  statsValue: {
    fontFamily: fonts.rounded,
    fontSize: typeScale.footnote,
    fontWeight: weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  statsMeta: {
    color: `color-mix(in srgb, ${colors.white} 50%, transparent)`,
    fontSize: typeScale.caption2,
    fontWeight: weight.medium
  },
  fieldLabel: {
    color: `color-mix(in srgb, ${colors.white} 55%, transparent)`,
    fontSize: typeScale.caption2,
    fontWeight: weight.bold,
    letterSpacing: tracking.caption2,
    textTransform: 'uppercase'
  },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '196px',
    flexShrink: 0,
    justifyContent: 'center'
  },
  stage: { flexGrow: 1, minHeight: 0, minWidth: 0, display: 'flex', gap: space.lg, alignItems: 'stretch' },
  shell: { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, gap: space.sm, position: 'relative' },
  confirmCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingBlock: space.lg,
    paddingInline: space.lg
  },
  confirmActions: { display: 'flex', gap: space.sm, flexShrink: 0, flexWrap: 'wrap' }
})
