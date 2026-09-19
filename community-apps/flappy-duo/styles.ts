import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

const pulse = stylex.keyframes({ '0%': { opacity: 0.6 }, '50%': { opacity: 1 }, '100%': { opacity: 0.6 } })
const rise = stylex.keyframes({ from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } })
const drop = stylex.keyframes({ from: { transform: 'translateY(-140%)' }, to: { transform: 'translateY(0)' } })
const breathe = stylex.keyframes({
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.1)' },
  '100%': { transform: 'scale(1)' }
})
const turn = stylex.keyframes({ from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } })
const draw = stylex.keyframes({ from: { strokeDashoffset: 100 }, to: { strokeDashoffset: 0 } })
const popIn = stylex.keyframes({
  '0%': { transform: 'scale(.6)', opacity: 0 },
  '60%': { transform: 'scale(1.08)', opacity: 1 },
  '100%': { transform: 'scale(1)', opacity: 1 }
})
const fall = stylex.keyframes({ from: { transform: 'translateY(0)' }, to: { transform: 'translateY(110%)' } })
const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const fadeOut = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } })
const glow = stylex.keyframes({
  '0%': { opacity: 0.35, boxShadow: '0 0 6px 2px rgba(10,132,255,.35)' },
  '50%': { opacity: 1, boxShadow: '0 0 22px 8px rgba(10,132,255,.75)' },
  '100%': { opacity: 0.35, boxShadow: '0 0 6px 2px rgba(10,132,255,.35)' }
})

export const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    color: colors.white,
    backgroundColor: colors.black,
    fontFamily: fonts.system,
    fontSize: 14,
    userSelect: 'none',
    touchAction: 'manipulation',
    cursor: 'pointer'
  },
  // The platform reset hides `canvas` until the shell marks the body ready; this app owns its canvas.
  canvas: { position: 'absolute', top: 0, left: 0, display: 'block', opacity: 1, cursor: 'pointer' },
  size: (w: number, h: number) => ({ width: `${w}px`, height: `${h}px` }),
  hud: {
    position: 'absolute',
    top: 10,
    left: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 12,
    fontWeight: 700,
    textShadow: '0 1px 6px rgba(20,60,120,.5)',
    pointerEvents: 'none'
  },
  hudCover: { top: 6, left: 8, fontSize: 10 },
  hudDim: { opacity: 0.8, fontWeight: 500 },
  intro: {
    position: 'absolute',
    insetInline: 0,
    top: '10%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    textAlign: 'center',
    paddingInline: 16,
    pointerEvents: 'none',
    textShadow: '0 2px 12px rgba(20,60,120,.5)'
  },
  introCover: { top: '6%', gap: 3 },
  kicker: { fontSize: 10, fontWeight: 700, letterSpacing: 2, opacity: 0.9 },
  title: { marginBlock: 0, fontSize: 48, lineHeight: 1, fontWeight: 800, letterSpacing: -1.5 },
  titleCover: { fontSize: 30 },
  line: { marginBlock: 0, fontSize: 14, fontWeight: 600 },
  lineCover: { fontSize: 12 },
  best: { marginBlock: 0, fontSize: 12, fontWeight: 600, opacity: 0.95 },
  tap: {
    marginTop: 8,
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.25)',
    backdropFilter: 'blur(8px)',
    fontSize: 12,
    fontWeight: 700,
    textShadow: 'none',
    animationName: pulse,
    animationDuration: '1.4s',
    animationIterationCount: 'infinite'
  },
  alert: {
    position: 'absolute',
    insetInline: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    marginInline: 'auto',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingBlock: 16,
    paddingInline: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.88)',
    backdropFilter: 'blur(18px)',
    color: '#0b1a3a',
    textAlign: 'center',
    boxShadow: '0 16px 48px rgba(20,60,120,.35)'
  },
  alertCover: { insetInline: 8, gap: 4, paddingBlock: 10, paddingInline: 10, borderRadius: 16 },
  alertTitle: { fontSize: 17, fontWeight: 700 },
  roast: { marginBlock: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3 },
  fine: { marginBlock: 0, fontSize: 11, color: '#5b6b85' },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  stat: {
    minWidth: 62,
    paddingBlock: 6,
    paddingInline: 10,
    borderRadius: 10,
    color: '#5b6b85',
    backgroundColor: 'rgba(20,60,120,.08)',
    fontSize: 8,
    letterSpacing: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  value: { color: '#0b1a3a', fontSize: 18, fontWeight: 800, letterSpacing: 0 },
  medalValue: { fontSize: 12 },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  button: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 8,
    paddingInline: 14,
    color: colors.white,
    backgroundColor: colors.blueBright,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  },
  // ---- the pay sheet ----
  dim: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,.35)',
    animationName: fadeIn,
    animationDuration: '.3s',
    animationFillMode: 'both'
  },
  dimOut: { animationName: fadeOut, animationDuration: '.3s' },
  sheetOut: {
    animationName: fall,
    animationDuration: '.34s',
    animationTimingFunction: 'cubic-bezier(.4,0,.8,.4)',
    animationFillMode: 'forwards'
  },
  sheet: {
    position: 'absolute',
    insetInline: 0,
    bottom: 0,
    marginInline: 'auto',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBlock: 14,
    paddingInline: 18,
    paddingBottom: 22,
    borderStartStartRadius: 24,
    borderStartEndRadius: 24,
    backgroundColor: 'rgba(255,255,255,.96)',
    color: '#0b1a3a',
    fontSize: 13,
    boxShadow: '0 -12px 40px rgba(0,0,0,.25)',
    animationName: rise,
    animationDuration: '.42s',
    animationTimingFunction: 'cubic-bezier(.18,.9,.22,1.02)'
  },
  sheetCover: { fontSize: 11, gap: 4, paddingBlock: 8, paddingBottom: 12, paddingInline: 12 },
  sheetHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  payMark: { fontSize: 17, fontWeight: 600, letterSpacing: -0.3 },
  apple: { fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 400 },
  cancel: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: colors.blueBright,
    fontSize: 15,
    fontWeight: 400,
    cursor: 'pointer',
    fontFamily: fonts.system
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.18)'
  },
  card: {
    flexShrink: 0,
    width: 36,
    height: 24,
    borderRadius: 4,
    backgroundImage:
      'linear-gradient(115deg, rgba(255,140,200,.35), rgba(140,200,255,.35) 45%, rgba(255,230,140,.35) 80%), linear-gradient(135deg, #ffffff, #dcdce1 60%, #f2f2f5)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.12)'
  },
  cardText: { flex: 1, display: 'flex', flexDirection: 'column', fontSize: 12, lineHeight: 1.2, color: '#0b1a3a' },
  chev: { color: '#c7c7cc', fontSize: 22, lineHeight: 1 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 9,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.18)'
  },
  last: { borderBottomWidth: 0 },
  rowKey: { color: '#8a8a8e', fontSize: 11, fontWeight: 500, letterSpacing: 0.4 },
  rowValue: { fontSize: 12, fontWeight: 500 },
  faceId: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: '#0b1a3a',
    cursor: 'pointer',
    fontFamily: fonts.system
  },
  faceLabel: { fontSize: 13, fontWeight: 500 },
  sideHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#8a8a8e',
    animationName: pulse,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite'
  },
  glyph: {
    animationName: breathe,
    animationDuration: '1.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  spin: {
    animationName: turn,
    animationDuration: '.9s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  pop: {
    animationName: popIn,
    animationDuration: '.45s',
    animationTimingFunction: 'cubic-bezier(.2,.9,.3,1.3)',
    animationFillMode: 'both'
  },
  ring: {
    strokeDasharray: 100,
    animationName: draw,
    animationDuration: '.55s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both'
  },
  tick: {
    strokeDasharray: 100,
    animationName: draw,
    animationDuration: '.35s',
    animationDelay: '.4s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both'
  },
  still: { animationName: 'none' },
  // Sits where the frame's side button is: its cap spans 0.67 to 2.54 cm above the
  // hinge centre line, on an inner display 11.10 cm tall whose top is at 5.55 cm.
  sideGlow: {
    position: 'absolute',
    right: 0,
    top: '27.2%',
    width: 5,
    height: '16.8%',
    borderStartStartRadius: 6,
    borderEndStartRadius: 6,
    backgroundImage: 'linear-gradient(180deg, #5ac8fa, #0a84ff, #5ac8fa)',
    pointerEvents: 'none',
    animationName: glow,
    animationDuration: '1.3s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  // ---- the notification after paying ----
  notice: {
    position: 'absolute',
    top: 10,
    insetInline: 0,
    marginInline: 'auto',
    width: 'min(92%, 380px)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.94)',
    color: '#0b1a3a',
    fontSize: 13,
    boxShadow: '0 10px 30px rgba(20,60,120,.3)',
    animationName: drop,
    animationDuration: '.4s',
    animationTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
    pointerEvents: 'none'
  },
  noticeCover: { fontSize: 11, paddingBlock: 6, gap: 6 },
  noticeIcon: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 10,
    objectFit: 'cover'
  },
  noticeText: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 },
  noticeTime: { alignSelf: 'flex-start', fontSize: 11, color: '#8a95a8' }
})
