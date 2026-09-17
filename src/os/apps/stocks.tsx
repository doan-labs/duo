// Stocks: a watchlist with sparklines, and a detail page whose chart draws itself in.
import * as stylex from '@stylexjs/stylex'
import { Nav, Page, useNav } from '../uikit/nav.tsx'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { colors } from '../uikit/tokens.stylex.ts'
import { poly, walk } from './shared.ts'

// Local, not shared's: the StyleX compiler only follows keyframes imported from
// a `.stylex.ts` module, and uikit/styles.ts is not one.
const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })

const TICKERS: [string, string, number][] = [
  ['AAPL', 'Apple Inc.', 231.4],
  ['NVDA', 'NVIDIA Corp.', 118.9],
  ['TSM', 'Taiwan Semi.', 182.6],
  ['MSFT', 'Microsoft', 421.7],
  ['ADBE', 'Adobe Inc.', 512.3],
  ['SONY', 'Sony Group', 88.2],
  ['^GSPC', 'S&P 500', 5738.2]
]

const RANGES = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

// Deterministic walks, not a quote feed: every free real-time quote API needs
// a key, and this only has to move convincingly.
const Spark = ({ t, w, ht, animate = false }: { t: string; w: number; ht: number; animate?: boolean }) => {
  const pts = walk(t, 34)
  return (
    <svg viewBox={`0 0 ${w} ${ht}`} {...stylex.props(styles.spark, styles.size(w, ht))}>
      <path
        d={poly(pts, w, ht)}
        fill="none"
        strokeWidth={1.8}
        strokeLinejoin="round"
        stroke={pts[pts.length - 1]! >= pts[0]! ? '#31d158' : '#ff453a'}
        {...stylex.props(animate && styles.draw)}
      />
    </svg>
  )
}

const pct = (t: string) => {
  const pts = walk(t, 34)
  return (pts[pts.length - 1]! - pts[0]!) / 12
}
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`

const List = () => {
  const { push } = useNav()
  return (
    <div>
      {TICKERS.map(([t, name, base]) => {
        const d = pct(t)
        return (
          <div
            key={t}
            {...stylex.props(styles.tik)}
            onClick={() => push((back) => <Detail t={t} name={name} base={base} d={d} back={back} />)}
          >
            <div {...stylex.props(styles.nm)}>
              <b {...stylex.props(styles.symbol)}>{t}</b>
              <div {...stylex.props(shared.sub)}>{name}</div>
            </div>
            <Spark t={t} w={64} ht={30} />
            <div {...stylex.props(styles.right)}>
              <div {...stylex.props(styles.price)}>{base.toFixed(2)}</div>
              <div {...stylex.props(styles.chip, d < 0 && styles.dn)}>{signed(d)}%</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Detail = ({ t, name, base, d, back }: { t: string; name: string; base: number; d: number; back: () => void }) => {
  const stats: [string, number][] = [
    ['Open', base * 0.994],
    ['High', base * 1.012],
    ['Low', base * 0.981],
    ['Vol', 41.2],
    ['Mkt Cap', base * 15.6],
    ['P/E', 29.4]
  ]
  return (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.hdr, styles.hdr17)}>
        <button type="button" {...stylex.props(shared.bk)} onClick={back}>
          <Sym name="back" size={20} />
          Stocks
        </button>
      </div>
      <div {...stylex.props(shared.body)}>
        <div {...stylex.props(styles.quote)}>
          <div {...stylex.props(styles.ticker)}>{t}</div>
          <div {...stylex.props(shared.sub)}>{name}</div>
          <div {...stylex.props(styles.bigPrice)}>{base.toFixed(2)}</div>
          <div {...stylex.props(styles.delta, d < 0 && styles.deltaDn)}>
            {signed((base * d) / 100)} ({d.toFixed(2)}%)
          </div>
        </div>
        <div {...stylex.props(styles.chart)}>
          <Spark t={t} w={340} ht={150} animate />
        </div>
        <div {...stylex.props(styles.ranges)}>
          {RANGES.map((r, i) => (
            <span key={r} {...stylex.props(shared.pill, i === 2 && styles.pillOn)}>
              {r}
            </span>
          ))}
        </div>
        <div {...stylex.props(shared.grp)}>
          {stats.map(([k, v]) => (
            <div key={k} {...stylex.props(shared.row, styles.darkRow)}>
              {k}
              <span {...stylex.props(shared.rowR, styles.white)}>{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const Stocks = () => (
  <Nav>
    <Page
      title={
        <>
          Stocks
          <span {...stylex.props(shared.hdrSm)}>
            {new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' })}
          </span>
        </>
      }
    >
      <List />
    </Page>
  </Nav>
)

const styles = stylex.create({
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
