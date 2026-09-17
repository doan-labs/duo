import * as stylex from '@stylexjs/stylex'
import { colors } from '../../uikit/tokens.stylex.ts'

// Local, not shared's: the StyleX compiler only follows keyframes imported from
// a `.stylex.ts` module, and uikit/styles.ts is not one.
const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })

export const styles = stylex.create({
  tik: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBlock: 10,
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(255,255,255,.08)',
    cursor: 'pointer'
  },
  nm: { flexGrow: 1, minWidth: 0 },
  symbol: { fontSize: 16, fontWeight: 600, display: 'block' },
  right: { textAlign: 'right', width: 78 },
  price: { fontWeight: 600 },
  chip: {
    textAlign: 'center',
    paddingBlock: 2,
    paddingInline: 6,
    marginTop: 2,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.greenBright,
    flexShrink: 0
  },
  dn: { backgroundColor: colors.redBright },
  spark: { flexShrink: 0 },
  size: (w: number, ht: number) => ({ width: w, height: ht }),
  draw: {
    strokeDasharray: '2400',
    strokeDashoffset: '2400',
    animationName: draw,
    animationDuration: '1.2s',
    animationTimingFunction: 'cubic-bezier(.3,.9,.3,1)',
    animationFillMode: 'forwards'
  },
  hdr17: { fontSize: 17 },
  quote: { paddingInline: 18, paddingBottom: 6 },
  ticker: { fontSize: 28, fontWeight: 700 },
  bigPrice: { fontSize: 40, fontWeight: 300, marginTop: 10 },
  delta: { color: colors.greenBright, fontWeight: 600 },
  deltaDn: { color: colors.redBright },
  chart: { paddingBlock: 14, paddingInline: 12 },
  ranges: { display: 'flex', justifyContent: 'space-around', paddingInline: 12, paddingBottom: 16 },
  pillOn: { backgroundColor: colors.blueDark, color: colors.white },
  darkRow: { backgroundColor: 'rgba(255,255,255,.06)', borderBottomColor: 'rgba(255,255,255,.08)' },
  white: { color: colors.white }
})
