import { Row, Screen, Section, Text, Title, VStack } from '@doan-labs/duo-uikit'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'

// Stocks: a watchlist with sparklines, and a detail page whose chart draws itself in.

import { poly, walk } from '@doan-labs/duo-fixtures'
import { Nav, Page, useNav } from '@doan-labs/duo-uikit/nav.tsx'
import { Num } from '@doan-labs/duo-uikit/num.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

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
        stroke={pts[pts.length - 1]! >= pts[0]! ? colors.greenBright : colors.redBright}
        {...stylex.props(animate && styles.draw)}
      />
    </svg>
  )
}

const pct = (t: string) => {
  const pts = walk(t, 34)
  return (pts[pts.length - 1]! - pts[0]!) / 12
}
const two = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const signed = { ...two, signDisplay: 'exceptZero' as const }

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
              <Text as="div" size="caption">
                {name}
              </Text>
            </div>
            <Spark t={t} w={64} ht={30} />
            <div {...stylex.props(styles.right)}>
              <div {...stylex.props(styles.price)}>
                <Num value={base} format={two} />
              </div>
              <div {...stylex.props(styles.chip, d < 0 && styles.dn)}>
                <Num value={d} format={signed} suffix="%" />
              </div>
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
    <VStack>
      <Title xstyle={[styles.hdr17]}>
        <button type="button" {...stylex.props(shared.bk)} onClick={back}>
          <Sym name="back" size={20} />
          Stocks
        </button>
      </Title>
      <Screen>
        <div {...stylex.props(styles.quote)}>
          <div {...stylex.props(styles.ticker)}>{t}</div>
          <Text as="div" size="caption">
            {name}
          </Text>
          <div {...stylex.props(styles.bigPrice)}>
            <Num value={base} format={two} />
          </div>
          <div {...stylex.props(styles.delta, d < 0 && styles.deltaDn)}>
            <Num value={(base * d) / 100} format={signed} /> (<Num value={d} format={two} suffix="%" />)
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
        <Section>
          {stats.map(([k, v]) => (
            <Row key={k} xstyle={[styles.darkRow]}>
              {k}
              <span {...stylex.props(shared.rowR, styles.white)}>
                <Num value={v} format={two} />
              </span>
            </Row>
          ))}
        </Section>
      </Screen>
    </VStack>
  )
}

export const Stocks = () => (
  <Nav>
    <Page
      title={
        <>
          Stocks
          <Title as="span" variant="accessory">
            {new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' })}
          </Title>
        </>
      }
    >
      <List />
    </Page>
  </Nav>
)
