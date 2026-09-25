// Stocks, rebuilt on live feeds. The iPadOS shape unfolded - a sidebar of
// symbols beside the detail pane - and the same destinations pushed folded.
// Quotes and headlines come from CNBC, daily history and symbol search from
// stockanalysis.com, crypto intraday from Coinbase; every number on screen is
// fetched, nothing is walked. The mirror copy never calls start(): it draws
// the same stores with no network and no timers.

import type { Os } from '@doan-labs/duo-sdk'
import { Button, Nav, Page, Text, Title, useNav, useWide } from '@doan-labs/duo-uikit'
import { Num } from '@doan-labs/duo-uikit/num.tsx'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { Chart, Live, Spark, tickFmt } from './chart.tsx'
import {
  follow,
  type Item,
  type Point,
  type Quote,
  RANGES,
  type StatKey,
  searchSymbols,
  select,
  start,
  unfollow,
  useHistory,
  useNews,
  useQuote,
  useSpark,
  useStore
} from './data.ts'
import { styles } from './styles.ts'

const two = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const signed = { ...two, signDisplay: 'exceptZero' as const }
const compact = { notation: 'compact' as const, maximumFractionDigits: 1 }

export function Stocks({ os }: { os: Os }) {
  const [root, wide] = useWide()
  const { items, viewing } = useStore()
  // biome-ignore lint/correctness/useExhaustiveDependencies: the arg applies once at open; later picks are the user's
  useEffect(() => {
    if (!os.mirror) start()
    if (os.arg) {
      const hit = items.find((v) => v.sym === os.arg)
      if (hit) select(hit)
    }
  }, [])
  return (
    <div ref={root} {...stylex.props(styles.split)}>
      {wide && <Side />}
      <div {...stylex.props(styles.detail)}>
        {wide ? (
          <div {...stylex.props(styles.detailScroll)}>
            <Detail key={viewing.sym} item={viewing} showNews live={!os.mirror} />
          </div>
        ) : (
          <Nav>
            <Home live={!os.mirror} />
          </Nav>
        )}
      </div>
    </div>
  )
}

// -- the sidebar ----------------------------------------------------------------

function Side() {
  const { items, viewing } = useStore()
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  return (
    <nav aria-label="Stocks" {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideScroll)}>
        <SearchBox query={query} setQuery={setQuery} side />
        {searching ? (
          <SearchResults query={query} onPick={select} side />
        ) : (
          <>
            <Text as="div" size="footnote" color="secondary" xstyle={[styles.secLabel, styles.secLabelSide]}>
              My Symbols
            </Text>
            {items.map((v) => (
              <SymbolRow key={v.sym} item={v} side on={v.sym === viewing.sym} onPick={select} />
            ))}
          </>
        )}
      </div>
    </nav>
  )
}

// -- the cover's list page --------------------------------------------------------

function Home({ live }: { live?: boolean }) {
  const { push } = useNav()
  const { items } = useStore()
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const open = (v: Item) => {
    select(v)
    push((back) => <DetailPage item={v} back={back} live={live} />)
  }
  return (
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
      <SearchBox query={query} setQuery={setQuery} />
      {searching ? (
        <SearchResults query={query} onPick={open} />
      ) : (
        <>
          {items.map((v) => (
            <SymbolRow key={v.sym} item={v} onPick={open} />
          ))}
          <Business />
        </>
      )}
    </Page>
  )
}

function DetailPage({ item, back, live }: { item: Item; back: () => void; live?: boolean }) {
  return (
    <Page title={item.sym} back={back}>
      <div {...stylex.props(styles.detailPad)}>
        <Detail item={item} live={live} />
      </div>
    </Page>
  )
}

// -- search -----------------------------------------------------------------------

function SearchBox({ query, setQuery, side }: { query: string; setQuery: (q: string) => void; side?: boolean }) {
  return (
    <div {...stylex.props(styles.searchWrap, side && styles.searchWrapSide)}>
      <span {...stylex.props(styles.searchBox)}>
        <Sym name="search" size={15} />
        <input
          type="text"
          placeholder="Search"
          value={query}
          aria-label="Search symbols"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
          {...stylex.props(styles.searchInput)}
        />
        {query !== '' && (
          <button
            type="button"
            aria-label="Clear search"
            {...stylex.props(styles.clearBtn)}
            onClick={() => setQuery('')}
          >
            <Sym name="close" size={14} />
          </button>
        )}
      </span>
      {query !== '' && (
        <button type="button" {...stylex.props(styles.cancel)} onClick={() => setQuery('')}>
          Cancel
        </button>
      )}
    </div>
  )
}

function SearchResults({ query, onPick, side }: { query: string; onPick: (v: Item) => void; side?: boolean }) {
  const { items } = useStore()
  const have = new Set(items.map((v) => v.sym))
  const [results, setResults] = useState<Item[] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    setPending(true)
    setError(undefined)
    const ac = new AbortController()
    const id = setTimeout(() => {
      void searchSymbols(query.trim(), ac.signal)
        .then((found) => {
          setResults(found)
          setPending(false)
        })
        .catch(() => {
          if (ac.signal.aborted) return
          setResults(null)
          setError('Search unavailable. Try again.')
          setPending(false)
        })
    }, 260)
    return () => {
      clearTimeout(id)
      ac.abort()
    }
  }, [query])
  if (pending && !results?.length) return <div {...stylex.props(styles.empty)}>Searching…</div>
  if (error) return <div {...stylex.props(styles.empty)}>{error}</div>
  if (!results?.length) return <div {...stylex.props(styles.empty)}>No results</div>
  return (
    <div>
      {results.map((v) => (
        <button
          key={v.sym}
          type="button"
          onClick={() => onPick(v)}
          {...stylex.props(styles.result, side && styles.resultSide, shared.press)}
        >
          <span {...stylex.props(styles.tickMain)}>
            <span {...stylex.props(typography.headline, styles.symbol)}>{v.sym}</span>
            <Text as="span" size="footnote" color="secondary" xstyle={styles.tickName}>
              {v.name}
            </Text>
          </span>
          <Sym name={have.has(v.sym) ? 'check' : 'plus'} size={16} />
        </button>
      ))}
    </div>
  )
}

// -- the watchlist row ------------------------------------------------------------

function SymbolRow({
  item,
  side,
  on,
  onPick
}: {
  item: Item
  side?: boolean
  on?: boolean
  onPick: (v: Item) => void
}) {
  const quote = useQuote(item.sym)
  const spark = useSpark(item)
  const q = quote.data
  const dn = (q?.chgPct ?? 0) < 0
  return (
    <button
      type="button"
      aria-current={on || undefined}
      onClick={() => onPick(item)}
      {...stylex.props(styles.tick, side && styles.tickSide, on && styles.tickOn, !side && shared.press)}
    >
      <span {...stylex.props(styles.tickMain)}>
        <span {...stylex.props(typography.headline, styles.symbol)}>{item.sym}</span>
        <Text as="span" size="footnote" color="secondary" xstyle={styles.tickName}>
          {q?.name || item.name || ' '}
        </Text>
      </span>
      {item.kind !== 'index' && <Spark pts={spark.data ?? []} w={56} ht={28} />}
      <span {...stylex.props(styles.right)}>
        <span {...stylex.props(typography.callout, styles.price)}>
          <Num value={q?.px} format={two} />
        </span>
        <span {...stylex.props(typography.footnote, styles.chip, dn && styles.dn)}>
          {q ? <Num value={q.chgPct} format={signed} suffix="%" /> : '—'}
        </span>
      </span>
    </button>
  )
}

// -- the detail pane ----------------------------------------------------------------

const extTone = (v: number) => (v < 0 ? styles.deltaDn : styles.delta)

/** The quote block, range pills, chart, stats grid and follow toggle. */
function Detail({ item, showNews, live }: { item: Item; showNews?: boolean; live?: boolean }) {
  const { items } = useStore()
  const inList = items.some((v) => v.sym === item.sym)
  const quote = useQuote(item.sym)
  const ranges = RANGES[item.kind]
  const [range, setRange] = useState(item.kind === 'crypto' ? '1D' : '1M')
  const { entry, pts } = useHistory(item, range)
  const q = quote.data
  const dn = (q?.chgPct ?? 0) < 0
  // Scrubbing the live chart borrows Apple's gesture: the big price and the
  // line under it show the hovered point's close and time instead.
  const [hover, setHover] = useState<Point | null>(null)
  const fmt = tickFmt(pts)
  return (
    <>
      <div {...stylex.props(styles.quoteTop)}>
        <span {...stylex.props(styles.tickMain)}>
          <span {...stylex.props(typography.title1)}>{item.sym}</span>
          <Text as="div" size="footnote" color="secondary" xstyle={styles.quoteName}>
            {q?.name || item.name}
          </Text>
        </span>
        <Button
          variant="tinted"
          onClick={() => {
            if (inList) unfollow(item.sym)
            else follow(item)
          }}
        >
          {inList ? 'Following' : '+ Follow'}
        </Button>
      </div>
      <div {...stylex.props(styles.bigPrice)}>
        <Num value={hover?.c ?? q?.px} format={two} />
      </div>
      <div {...stylex.props(typography.subheadline, styles.delta, dn && styles.deltaDn)}>
        {hover ? (
          <span {...stylex.props(styles.hoverDate)}>{fmt(hover.t)}</span>
        ) : q ? (
          <>
            <Num value={q.chg} format={signed} /> (<Num value={q.chgPct} format={two} suffix="%" />)
          </>
        ) : (
          (quote.error ?? ' ')
        )}
      </div>
      {q && <MarketLine q={q} />}
      {ranges.length > 0 && (
        <div {...stylex.props(styles.ranges)}>
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRange(r)
                setHover(null)
              }}
              {...stylex.props(styles.rangePill, typography.footnote, r === range && styles.pillOn)}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {ranges.length > 0 && (
        <div {...stylex.props(styles.chartWrap)} onPointerUp={() => setHover(null)}>
          {live ? (
            <Live pts={pts} px={q?.px} prev={q?.stats.prev} loading={entry.loading} onHover={setHover} />
          ) : (
            <Chart pts={pts} />
          )}
        </div>
      )}
      {ranges.length > 0 && (
        <Text as="div" size="caption1" xstyle={styles.chartFoot}>
          {entry.error ??
            (pts.length
              ? new Date(pts[pts.length - 1]!.t).toLocaleDateString('en', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : entry.loading
                ? 'Loading…'
                : ' ')}
        </Text>
      )}
      {ranges.length === 0 && (
        <Text as="div" size="footnote" color="secondary" xstyle={styles.chartFoot}>
          Historical data is not available for index symbols.
        </Text>
      )}
      <Stats q={q} />
      {showNews && <Business />}
    </>
  )
}

/** Extended-hours or market-state line, as the real app prints it. */
function MarketLine({ q }: { q: Quote }) {
  const ext = q.ext
  if ((q.status === 'POST_MKT' || q.status === 'CLOSED') && !ext)
    return (
      <Text as="div" size="footnote" xstyle={styles.mktLine}>
        Market Closed
      </Text>
    )
  if ((q.status === 'POST_MKT' || q.status === 'CLOSED') && ext)
    return (
      <Text as="div" size="footnote" xstyle={styles.mktLine}>
        Extended Hours: <Num value={ext.px} format={two} />{' '}
        <Text as="span" size="footnote" xstyle={extTone(ext.chgPct)}>
          <Num value={ext.chgPct} format={signed} suffix="%" />
        </Text>
        {ext.when ? ` · ${ext.when}` : ''}
      </Text>
    )
  if (q.status === 'PRE_MKT' && ext)
    return (
      <Text as="div" size="footnote" xstyle={styles.mktLine}>
        Pre-Market: <Num value={ext.px} format={two} />{' '}
        <Text as="span" size="footnote" xstyle={extTone(ext.chgPct)}>
          <Num value={ext.chgPct} format={signed} suffix="%" />
        </Text>
        {ext.when ? ` · ${ext.when}` : ''}
      </Text>
    )
  return null
}

const STAT_ROWS: [StatKey, string][] = [
  ['open', 'Open'],
  ['high', 'High'],
  ['low', 'Low'],
  ['prev', 'Prev Close'],
  ['vol', 'Vol'],
  ['avg', 'Avg Vol'],
  ['cap', 'Mkt Cap'],
  ['pe', 'P/E'],
  ['eps', 'EPS'],
  ['beta', 'Beta'],
  ['div', 'Div Yield'],
  ['hi52', '52W High'],
  ['lo52', '52W Low']
]

function Stats({ q }: { q?: Quote }) {
  const rows = STAT_ROWS.filter(([k]) => q?.stats[k] != null)
  if (!rows.length) return null
  return (
    <div {...stylex.props(styles.statGrid)}>
      {rows.map(([k, label]) => (
        <div key={k} {...stylex.props(styles.stat)}>
          <Text as="span" size="caption1" color="secondary" xstyle={styles.statLabel}>
            {label}
          </Text>
          <Text as="span" size="callout" weight="medium" xstyle={styles.statVal}>
            <Num
              value={q!.stats[k]}
              format={k === 'vol' || k === 'avg' || k === 'cap' ? compact : two}
              suffix={k === 'div' ? '%' : undefined}
            />
          </Text>
        </div>
      ))}
    </div>
  )
}

// -- the Business feed ----------------------------------------------------------------

const ago = (when: number) => {
  const m = Math.max(0, Math.round((Date.now() - when) / 60_000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function Business() {
  const news = useNews()
  const items = news.data ?? []
  if (!items.length && !news.data) {
    if (news.loading) return null
    if (news.error) {
      return (
        <>
          <SectionLabel>Business</SectionLabel>
          <div {...stylex.props(styles.empty)}>{news.error}</div>
        </>
      )
    }
    return null
  }
  return (
    <>
      <SectionLabel>Business</SectionLabel>
      {items.map((h, i) => (
        <a
          key={h.url}
          href={h.url}
          target="_blank"
          rel="noreferrer"
          {...stylex.props(styles.newsItem, i === 0 && styles.newsFirst)}
        >
          <Text as="span" size="subheadline" xstyle={styles.newsTitle}>
            {h.title}
          </Text>
          <Text as="span" size="caption1" xstyle={styles.newsMeta}>
            CNBC · {ago(h.when)}
          </Text>
        </a>
      ))}
    </>
  )
}

const SectionLabel = ({ children }: { children: string }) => (
  <Text as="div" size="footnote" color="secondary" xstyle={styles.secLabel}>
    {children}
  </Text>
)
