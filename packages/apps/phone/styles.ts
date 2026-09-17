import { colors, easing } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

// Local copies of shared's `pop` and `rip`: StyleX only resolves imported
// keyframes from `.stylex.ts` modules, so the ones in uikit/styles.ts stay
// there for its own blocks.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

const rip = stylex.keyframes({ to: { transform: 'scale(2.3)', opacity: 0 } })

export const styles = stylex.create({
  root: { paddingBottom: 0, display: 'flex', flexDirection: 'column' },
  panes: { flexGrow: 1, minHeight: 0, position: 'relative' },
  pane: { position: 'absolute', inset: 0, overflow: 'auto' },
  recents: { marginTop: 6 },
  dark: { backgroundColor: colors.darkElevated, borderBottomColor: '#2c2c2e', cursor: 'pointer' },
  name: { fontWeight: 600, color: colors.white },
  missed: { color: colors.redBright },
  keypad: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' },
  dial: {
    textAlign: 'center',
    fontSize: 36,
    fontWeight: 300,
    letterSpacing: 1,
    minHeight: 48,
    paddingTop: 10,
    paddingBottom: 10
  },
  // flex:none on both, or the column shrinks them when the keypad is taller than
  // the panel and the call button lands as a 76x36 ellipse.
  keys: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,76px)',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 4,
    paddingBottom: 14,
    flexShrink: 0
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: '50%',
    backgroundColor: { default: 'rgba(255,255,255,.12)', ':active': 'rgba(255,255,255,.4)' },
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    fontSize: 32,
    fontWeight: 300,
    lineHeight: 1,
    transitionProperty: 'background-color, transform',
    transitionDuration: '.12s',
    transform: { default: null, ':active': 'scale(.93)' }
  },
  keySub: { textDecoration: 'none', fontSize: 9, letterSpacing: 2, fontWeight: 600, opacity: 0.65, marginTop: 3 },
  grn: {
    width: 76,
    height: 76,
    flexShrink: 0,
    borderRadius: '50%',
    backgroundColor: colors.greenBright,
    display: 'grid',
    placeItems: 'center',
    marginInline: 'auto',
    fontSize: 30,
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.9)' }
  },
  red: { backgroundColor: colors.redBright },
  dialBtn: { marginBottom: 20, fontSize: 28 },
  hangUp: { marginTop: 26 },
  bar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingInline: 20,
    paddingBottom: 10,
    backgroundColor: colors.darkElevated,
    flexShrink: 0,
    color: colors.grey
  },
  barBtn: { display: 'grid', placeItems: 'center', paddingTop: 4, paddingInline: 10, paddingBottom: 4 },
  barOn: { color: colors.blueDark },
  call: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundImage: 'linear-gradient(#3a3a3c,#101012)',
    zIndex: 5,
    animationName: pop,
    animationDuration: '.4s',
    animationTimingFunction: easing.pop,
    transitionProperty: 'opacity, transform',
    transitionDuration: '.28s'
  },
  callOff: { opacity: 0, transform: 'scale(.94)' },
  av: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: '50%',
    backgroundColor: '#5a5a5e',
    display: 'grid',
    placeItems: 'center',
    fontSize: 40,
    fontWeight: 300,
    marginBottom: 10
  },
  rip: {
    position: 'absolute',
    inset: -4,
    borderRadius: '50%',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,.45)',
    animationName: rip,
    animationDuration: '2.2s',
    animationTimingFunction: 'ease-out',
    animationIterationCount: 'infinite'
  },
  who: { fontSize: 27, fontWeight: 500 },
  state: { opacity: 0.65, fontSize: 15, letterSpacing: 0.5 },
  ctl: { display: 'flex', gap: 22, marginTop: 26 },
  ctlBtn: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,.16)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 20
  }
})
