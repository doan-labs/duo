import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { Liveline } from '../../../apps/stocks/chart.tsx'
import { useMedia } from '../media'
import { Segmented } from '../segmented'
import { useTheme } from '../theme'
import { color, font } from '../tokens.stylex'
import { diagram, Roll, Stat } from './diagram'

// A live chart in the post, streamed from Binance's public market data: Apple
// as its tokenized stock (AAPLB, which trades around the clock) and Bitcoin.
// History is the last six hours of five-minute klines; after that every trade
// arrives over the socket. LiveLine is the canvas the Stocks app draws with:
// the tip glides into every fresh price.

type Sym = 'AAPL' | 'BTC-USD'
type Point = { time: number; value: number }
type Candle = { t: number; o: number; h: number; l: number; c: number }
type Feed = {
  pts: Point[]
  value: number
  base?: number
  ping?: number
  vol?: number
  ticks: number
  candles: Candle[]
}
type Kline = [number, string, string, string, string, string, number]

const PAIR: Record<Sym, string> = { AAPL: 'AAPLBUSDT', 'BTC-USD': 'BTCUSDT' }
const KEEP = 4000
const CANDLES = 14
const WINDOWS: [string, number][] = [
  ['5m', 300],
  ['1h', 3600],
  ['6h', 21600]
]
const START: Record<Sym, number> = { AAPL: 3600, 'BTC-USD': 3600 }
const EMPTY: Feed = { pts: [], value: 0, ticks: 0, candles: [] }

const money = (v: number) => v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd = (v: number) => `$${v.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 })}`
const bar = (k: Kline): Candle => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })

/** Folds a live kline into the row: the open one updates in place, a new one pushes the oldest out. */
const fold = (row: Candle[], k: Candle) =>
  row.at(-1)?.t === k.t ? [...row.slice(0, -1), k] : [...row, k].slice(-CANDLES)

/** NYSE's regular session, 9:30 to 16:00 Eastern on weekdays. */
// ponytail: ignores exchange holidays; add a holiday list if a closed Monday ever reads "Market open".
function marketOpen(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value])
  )
  const m = Number(p.hour) * 60 + Number(p.minute)
  return p.weekday !== 'Sat' && p.weekday !== 'Sun' && m >= 570 && m < 960
}

function useFeed(sym: Sym): Feed {
  const [feed, setFeed] = useState<Feed>(EMPTY)
  useEffect(() => {
    let dead = false
    setFeed(EMPTY)
    const pair = PAIR[sym]
    void fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=5m&limit=72`)
      .then((r) => r.json())
      .then((rows: Kline[]) => {
        if (dead || !Array.isArray(rows)) return
        const now = Date.now()
        const k = rows[rows.length - 1]
        setFeed((f) => ({
          ...f,
          // The open kline closes in the future; its close so far is a price at now.
          pts: [...rows.map((r) => ({ time: Math.min(r[6], now) / 1000, value: Number(r[4]) })), ...f.pts],
          value: f.value || Number(k?.[4] ?? 0),
          candles: f.candles.reduce(fold, rows.slice(-CANDLES).map(bar))
        }))
      })
    // The socket's ticker only speaks when the day changes; a quiet market still has a day to show.
    void fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`)
      .then((r) => r.json())
      .then((t) => {
        if (dead || !t.openPrice) return
        setFeed((f) => ({ ...f, base: f.base ?? Number(t.openPrice), vol: f.vol ?? Number(t.quoteVolume) }))
      })
    const low = pair.toLowerCase()
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${low}@aggTrade/${low}@kline_5m/${low}@ticker`
    )
    ws.onmessage = (e) => {
      const { stream, data: d } = JSON.parse(e.data)
      // Every event carries the exchange's send time: the lag reads even between trades.
      const ping = Math.max(0, Date.now() - d.E)
      if (stream.endsWith('@aggTrade')) {
        const v = Number(d.p)
        setFeed((f) => ({
          ...f,
          pts: [...f.pts, { time: d.T / 1000, value: v }].slice(-KEEP),
          value: v,
          ticks: f.ticks + 1,
          ping
        }))
      } else if (stream.endsWith('@kline_5m')) {
        const k = d.k
        setFeed((f) => ({ ...f, ping, candles: fold(f.candles, { t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c }) }))
      } else {
        setFeed((f) => ({
          ...f,
          ping,
          base: Number(d.o),
          vol: Number(d.q),
          value: f.value || Number(d.c)
        }))
      }
    }
    return () => {
      dead = true
      ws.close()
    }
  }, [sym])
  return feed
}

/** Canvas needs a resolved colour; tokens are var(--…) strings. */
const ink = (token: string) => {
  const name = /var\((--[\w-]+)/.exec(token)?.[1]
  return (name && getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || token
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.mark)}>
      <path
        fill="currentColor"
        d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.61 1.09zm3.38-3.07c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.46 2.34-1.27 3.71 1.34.1 2.71-.69 3.56-1.7"
      />
    </svg>
  )
}

function BitcoinMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.mark)}>
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <text x="12" y="17" textAnchor="middle" {...stylex.props(styles.btc)}>
        ₿
      </text>
    </svg>
  )
}

const LABELS: Record<Sym, { mark: () => React.JSX.Element; name: string }> = {
  AAPL: { mark: AppleMark, name: 'Apple' },
  'BTC-USD': { mark: BitcoinMark, name: 'Bitcoin' }
}

function MoonMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.mark)}>
      <path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  )
}

const CW = 280
const CH = 40

/** The last five-minute candles, the open one breathing, with the time it has left. */
function Candles({ row }: { row: Candle[] }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const live = row.at(-1)
  let lo = Math.min(...row.map((k) => k.l))
  let hi = Math.max(...row.map((k) => k.h))
  // A quiet row still needs height: pad it to a few ticks either side.
  const pad = Math.max((hi - lo) * 0.12, lo * 0.00004)
  lo -= pad
  hi += pad
  const y = (v: number) => CH - ((v - lo) / (hi - lo)) * CH
  const step = CW / CANDLES
  const left = live ? Math.max(0, live.t + 300_000 - now) : 0
  return (
    <div {...stylex.props(diagram.stat, styles.wide)}>
      <dt {...stylex.props(diagram.statLabel, styles.candleHead)}>
        <span>5m candles</span>
        {live && (
          <span>
            {Math.floor(left / 60000)}:{String(Math.floor(left / 1000) % 60).padStart(2, '0')} left
          </span>
        )}
      </dt>
      <dd {...stylex.props(styles.candleWell)}>
        <svg
          viewBox={`0 0 ${CW} ${CH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          {...stylex.props(styles.candles)}
        >
          {live && <line x1={0} x2={CW} y1={y(live.c)} y2={y(live.c)} {...stylex.props(styles.last)} />}
          {row.map((k, i) => {
            const x = (i + CANDLES - row.length) * step + step / 2
            const top = y(Math.max(k.o, k.c))
            const tone = k.c >= k.o ? styles.rise : styles.fall
            return (
              <g key={k.t} {...stylex.props(tone, k === live && styles.breathe)}>
                <line x1={x} x2={x} y1={y(k.h)} y2={y(k.l)} {...stylex.props(styles.wick)} />
                <rect
                  x={x - step * 0.3}
                  y={top}
                  width={step * 0.6}
                  height={Math.max(1.5, y(Math.min(k.o, k.c)) - top)}
                  rx={1}
                />
              </g>
            )
          })}
        </svg>
      </dd>
    </div>
  )
}

export function StocksDiagram() {
  const [sym, setSym] = useState<Sym>('AAPL')
  const [win, setWin] = useState(START)
  const feed = useFeed(sym)
  const theme = useTheme()
  const system = useMedia('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme === 'system' && system)
  const [tone, setTone] = useState('')

  const change = feed.base ? feed.value - feed.base : 0
  const up = change >= 0
  // biome-ignore lint/correctness/useExhaustiveDependencies: the resolved colour changes with the theme class.
  useEffect(() => setTone(ink(up ? color.green : color.red)), [up, dark])
  const after = sym === 'AAPL' && !marketOpen()

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div {...stylex.props(styles.bar)}>
        <Segmented
          id="stocks-sym"
          label="Symbol"
          size="sm"
          options={(['AAPL', 'BTC-USD'] as const).map((s) => {
            const Mark = LABELS[s].mark
            return {
              value: s,
              label: LABELS[s].name,
              icon: (
                <span {...stylex.props(styles.opt)}>
                  <Mark />
                  {s === 'AAPL' ? 'AAPL' : 'BTC'}
                </span>
              )
            }
          })}
          value={sym}
          onChange={setSym}
        />
        <Segmented
          id="stocks-window"
          label="Window"
          size="sm"
          options={WINDOWS.map(([l, s]) => ({ value: String(s), label: l }))}
          value={String(win[sym])}
          onChange={(v) => setWin((w) => ({ ...w, [sym]: Number(v) }))}
        />
      </div>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.price)}>{feed.value ? <Roll text={money(feed.value)} /> : '-'}</span>
        {feed.base ? (
          <span {...stylex.props(styles.change, up ? styles.up : styles.down)}>
            {up ? '+' : ''}
            {money(change)} ({up ? '+' : ''}
            {((change / feed.base) * 100).toFixed(2)}%)
          </span>
        ) : null}
        {after && (
          <span {...stylex.props(styles.session)}>
            <MoonMark />
            After hours
          </span>
        )}
        {feed.ticks > 0 && (
          <span {...stylex.props(styles.when)}>
            <span key={feed.ticks} {...stylex.props(styles.dot)} />
            Live
          </span>
        )}
      </div>
      <div {...stylex.props(styles.chart)}>
        {tone && (
          <Liveline
            key={sym}
            data={feed.pts}
            value={feed.value}
            window={win[sym]}
            color={tone}
            theme={dark ? 'dark' : 'light'}
            grid={false}
            badgeVariant="minimal"
            momentum
            pulse
            loading={!feed.pts.length}
            formatValue={money}
            emptyText=""
          />
        )}
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Socket lag" value={feed.ping != null ? <Roll text={`${feed.ping} ms`} /> : '-'} />
        <Stat label="Volume 24h" value={feed.vol != null ? <Roll text={usd(feed.vol)} /> : '-'} />
        <Candles row={feed.candles} />
      </dl>
    </figure>
  )
}

const flash = stylex.keyframes({
  from: { transform: 'scale(1.8)', opacity: 0.4 },
  to: { transform: 'scale(1)', opacity: 1 }
})

const breathe = stylex.keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.45 }
})

const styles = stylex.create({
  session: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '8px',
    paddingRight: '9px',
    borderRadius: '999px',
    backgroundColor: color.orangeBg,
    color: color.orange,
    fontFamily: font.mono,
    fontSize: '12px'
  },
  wide: { gridColumn: 'span 2' },
  candleHead: { display: 'flex', justifyContent: 'space-between', gap: '8px', whiteSpace: 'nowrap' },
  candleWell: { margin: 0, marginTop: '6px' },
  candles: { display: 'block', width: '100%', height: '40px', overflow: 'visible' },
  wick: { stroke: 'currentColor', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' },
  rise: { color: color.green, fill: color.green },
  fall: { color: color.red, fill: color.red },
  breathe: {
    animationName: breathe,
    animationDuration: '1.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out'
  },
  last: { stroke: color.borderStrong, strokeWidth: 1, strokeDasharray: '3 3', vectorEffect: 'non-scaling-stroke' },
  bar: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' },
  opt: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  mark: { width: '14px', height: '14px', flexShrink: 0 },
  btc: { fontFamily: font.sans, fontSize: '15px', fontWeight: 700, fill: color.surface },
  head: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '12px', rowGap: '4px' },
  price: {
    fontFamily: font.display,
    fontSize: '34px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    color: color.text
  },
  change: { fontFamily: font.mono, fontSize: '14px', fontWeight: 500 },
  up: { color: color.green },
  down: { color: color.red },
  when: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: font.mono,
    fontSize: '13px',
    color: color.text3
  },
  // Every tick re-keys the dot, so it flashes once per message: the socket, seen.
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: color.green,
    animationName: flash,
    animationDuration: '0.5s',
    animationTimingFunction: 'ease-out'
  },
  chart: { height: '260px', marginTop: '12px' }
})
