// Live market data. Stocks is a baked app, so the SDK client's storage is out
// of reach; both displays' copies run in the same document, so a module store
// plus localStorage is the shared state. Sources are the free, CORS-open
// feeds verified for this app: CNBC quotes and RSS, stockanalysis.com daily
// history and symbol search, Coinbase candles for crypto intraday. The mirror
// copy never calls start(): no network, no timer, it draws the same stores.

import { useEffect, useSyncExternalStore } from 'react'

export type Kind = 'equity' | 'etf' | 'index' | 'crypto'
export type Item = { sym: string; cnbc: string; kind: Kind; coinbase?: string; name: string }
export type Point = { t: number; c: number }
export type Headline = { title: string; url: string; when: number }
export type Quote = {
  px: number
  chg: number
  chgPct: number
  name: string
  exch: string
  cur: string
  /** REG_MKT, PRE_MKT, POST_MKT or CLOSED, as CNBC reports it. */
  status: string
  /** Pre- or post-market print, present while the main session is closed. */
  ext?: { px: number; chg: number; chgPct: number; when: string }
  stats: Record<StatKey, number | undefined>
}
export type StatKey =
  | 'open'
  | 'high'
  | 'low'
  | 'prev'
  | 'vol'
  | 'avg'
  | 'cap'
  | 'pe'
  | 'eps'
  | 'beta'
  | 'div'
  | 'hi52'
  | 'lo52'
export type Entry<T> = { data?: T; loading: boolean; error?: string; fetched?: number }

export const RANGES: Record<Kind, string[]> = {
  equity: ['1W', '1M', '3M', '6M', '1Y', '5Y', 'All'],
  etf: ['1W', '1M', '3M', '6M', '1Y', '5Y', 'All'],
  crypto: ['1D', '1W', '1M', '3M', '6M', '1Y'],
  // CNBC carries index quotes but no free history feed does, so index rows are
  // quote only: an honest blank beats a fabricated line.
  index: []
}

const DAYS: Record<string, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 31,
  '3M': 93,
  '6M': 186,
  '1Y': 366,
  '5Y': 1830,
  '10Y': 3660
}
/** Coinbase candle granularity per range, seconds. 300 candles per fetch is the API cap. */
const CANDLES: Record<string, number> = { '1D': 3600, '1W': 3600, '1M': 21600, '3M': 21600, '6M': 86400, '1Y': 86400 }

const QUOTE_TTL = 25_000
const SPARK_TTL = 600_000
const HIST_TTL = 600_000
const NEWS_TTL = 900_000

const item = (sym: string, kind: Kind, name = ''): Item => ({
  sym,
  cnbc: sym,
  kind,
  name,
  ...(kind === 'crypto' ? { cnbc: `${sym.split('-')[0]}.CM=`, coinbase: sym } : {})
})

const DEFAULTS: Item[] = [
  item('AAPL', 'equity'),
  item('MSFT', 'equity'),
  item('NVDA', 'equity'),
  item('GOOGL', 'equity'),
  item('AMZN', 'equity'),
  item('META', 'equity'),
  item('TSLA', 'equity'),
  item('SPY', 'etf'),
  item('QQQ', 'etf'),
  item('BTC-USD', 'crypto'),
  item('ETH-USD', 'crypto'),
  item('.SPX', 'index'),
  item('.DJI', 'index'),
  item('.IXIC', 'index')
]

// -- shared state -------------------------------------------------------------

// `items` is the watchlist; `viewing` is the symbol in the detail pane. The
// real app shows any searched symbol's detail without following it, so the
// pane is not limited to list members.
type Store = { items: Item[]; viewing: Item }
const KEY = 'duo.stocks.v1'
const KINDS: Kind[] = ['equity', 'etf', 'index', 'crypto']

const isItem = (v: Item) => typeof v?.sym === 'string' && typeof v.cnbc === 'string' && KINDS.includes(v.kind)

function read(raw: string | null): Store {
  try {
    const s = JSON.parse(raw || 'null')
    if (s && Array.isArray(s.items) && s.items.length && s.items.every(isItem)) {
      const viewing = isItem(s.viewing) ? s.viewing : s.items[0]
      return { items: s.items, viewing }
    }
  } catch {
    /* A blocked storage area still allows a session. */
  }
  return { items: DEFAULTS, viewing: DEFAULTS[0]! }
}

let store = read(typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY))
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* Same tolerance as the initial read. */
  }
}
const update = (patch: Partial<Store>) => {
  store = { ...store, ...patch }
  save()
  emit()
}

export const useStore = () => useSyncExternalStore(subscribe, () => store)
export function select(v: Item) {
  if (store.viewing.sym !== v.sym) update({ viewing: v })
}
export function follow(candidate: Item) {
  update({
    items: store.items.some((v) => v.sym === candidate.sym) ? store.items : [...store.items, candidate],
    viewing: candidate
  })
  void spark(candidate)
  void refreshQuotes()
}
export function unfollow(sym: string) {
  if (store.items.length > 1) update({ items: store.items.filter((v) => v.sym !== sym) })
}

// -- caches --------------------------------------------------------------------

const quotes = new Map<string, Entry<Quote>>()
const sparks = new Map<string, Entry<Point[]>>()
const hists = new Map<string, Entry<Point[]>>()
let news: Entry<Headline[]> = { loading: false }
const pending = new Set<string>()
const empty: Entry<never> = { loading: true }
const stale = (entry: Entry<unknown>, ttl: number) => !entry.fetched || Date.now() - entry.fetched > ttl

export const useQuote = (sym: string) => useSyncExternalStore(subscribe, () => quotes.get(sym) || empty)
export const useSpark = (v: Item | undefined) => {
  const entry = useSyncExternalStore(subscribe, () => (v ? sparks.get(v.sym) || empty : empty))
  useEffect(() => {
    if (v) void spark(v)
  }, [v])
  return entry
}
export const useNews = () => useSyncExternalStore(subscribe, () => news)

const num = (value: unknown): number | undefined => {
  const n = Number.parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

// -- CNBC quotes ---------------------------------------------------------------

type Raw = Record<string, string | undefined> & { code: number; ExtendedMktQuote?: Record<string, string> }

const parseQuote = (q: Raw): Quote | null => {
  const px = num(q.last)
  if (px == null) return null
  const ext = q.ExtendedMktQuote
  return {
    px,
    chg: num(q.change) ?? 0,
    chgPct: num(q.change_pct) ?? 0,
    name: q.name || '',
    exch: q.exchange || '',
    cur: q.currencyCode || 'USD',
    status: q.curmktstatus || 'REG_MKT',
    ext: ext
      ? {
          px: num(ext.last) ?? px,
          chg: num(ext.change) ?? 0,
          chgPct: num(ext.change_pct) ?? 0,
          when: ext.last_timedate || ''
        }
      : undefined,
    stats: {
      open: num(q.open),
      high: num(q.high),
      low: num(q.low),
      prev: num(q.previous_day_closing),
      vol: num(q.volume),
      avg: num(q.tendayavgvol),
      cap: num(q.mktcap),
      pe: num(q.pe),
      eps: num(q.eps),
      beta: num(q.beta),
      div: num(q.dividendyield),
      hi52: num(q.yrhiprice),
      lo52: num(q.yrloprice)
    }
  }
}

const QUOTE_URL = (list: string[]) =>
  `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${encodeURIComponent(list.join('|'))}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json`

async function refreshQuotes() {
  const seen = new Map<string, Item>()
  for (const v of [...store.items, store.viewing]) if (!seen.has(v.sym)) seen.set(v.sym, v)
  const due = [...seen.values()].filter((v) => stale(quotes.get(v.sym) || empty, QUOTE_TTL))
  if (!due.length || pending.has('quotes')) return
  pending.add('quotes')
  for (const v of due) quotes.set(v.sym, { ...quotes.get(v.sym), loading: true })
  emit()
  try {
    for (let i = 0; i < due.length; i += 20) {
      const chunk = due.slice(i, i + 20)
      const response = await fetch(QUOTE_URL(chunk.map((v) => v.cnbc)), {
        credentials: 'omit',
        signal: AbortSignal.timeout(15000)
      })
      if (!response.ok) throw new Error('Quote service unavailable')
      const body = await response.json()
      const rows: Raw[] = body?.FormattedQuoteResult?.FormattedQuote ?? []
      for (const v of chunk) {
        const row = rows.find((r) => r.symbol === v.cnbc)
        const quote = row && row.code === 0 ? parseQuote(row) : null
        if (quote) {
          if (!v.name && quote.name) updateItem(v.sym, { name: quote.name })
          quotes.set(v.sym, { data: quote, loading: false, fetched: Date.now() })
        } else {
          quotes.set(v.sym, { ...quotes.get(v.sym), loading: false, error: 'Symbol not found' })
        }
      }
    }
  } catch {
    for (const v of due)
      quotes.set(v.sym, {
        ...quotes.get(v.sym),
        loading: false,
        error: 'Unable to update quotes. Check your connection.'
      })
  } finally {
    pending.delete('quotes')
    emit()
  }
}

function updateItem(sym: string, patch: Partial<Item>) {
  update({ items: store.items.map((v) => (v.sym === sym ? { ...v, ...patch } : v)) })
}

// -- history -------------------------------------------------------------------

const SA_BASE = 'https://api.stockanalysis.com/api/symbol'
const saKind = (kind: Kind) => (kind === 'etf' ? 'e' : 's')

/** The closing series a sparkline draws: three months of daily closes. */
async function spark(v: Item) {
  if (v.kind === 'index') {
    sparks.set(v.sym, { loading: false })
    return
  }
  const prior = sparks.get(v.sym)
  if (pending.has(`sp:${v.sym}`) || (prior && !stale(prior, SPARK_TTL))) return
  pending.add(`sp:${v.sym}`)
  sparks.set(v.sym, { ...prior, loading: true, error: undefined })
  emit()
  try {
    const pts = v.kind === 'crypto' ? await candlePoints(v, 86400, 90) : await dailyPoints(v, '3M')
    sparks.set(v.sym, { data: pts, loading: false, fetched: Date.now() })
  } catch {
    sparks.set(v.sym, { ...prior, loading: false, error: 'Chart unavailable' })
  } finally {
    pending.delete(`sp:${v.sym}`)
    emit()
  }
}

async function dailyPoints(v: Item, range: string): Promise<Point[]> {
  const response = await fetch(`${SA_BASE}/${saKind(v.kind)}/${v.sym}/history?range=${range}&period=Daily`, {
    credentials: 'omit',
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error('History unavailable')
  const body = await response.json()
  const rows = body?.data
  if (!Array.isArray(rows)) throw new Error('History unavailable')
  return rows.map((r: { t: string; c: number }) => ({ t: Date.parse(r.t), c: r.c })).filter((p) => Number.isFinite(p.c))
}

async function fullSeries(v: Item): Promise<Point[]> {
  const response = await fetch(`${SA_BASE}/${saKind(v.kind)}/${v.sym}/history?type=chart`, {
    credentials: 'omit',
    signal: AbortSignal.timeout(20000)
  })
  if (!response.ok) throw new Error('History unavailable')
  const body = await response.json()
  const rows = body?.data
  if (!Array.isArray(rows) || !rows.length) throw new Error('History unavailable')
  return (rows as [number, number][]).map(([t, c]) => ({ t, c })).filter((p) => Number.isFinite(p.c))
}

/** Coinbase candles come newest-first; flip them and slice to the range. */
async function candlePoints(v: Item, granularity: number, days?: number): Promise<Point[]> {
  const pair = v.coinbase ?? `${v.sym}-USD`
  const response = await fetch(
    `https://api.exchange.coinbase.com/products/${encodeURIComponent(pair)}/candles?granularity=${granularity}`,
    {
      credentials: 'omit',
      signal: AbortSignal.timeout(15000)
    }
  )
  if (!response.ok) throw new Error('History unavailable')
  const rows = await response.json()
  if (!Array.isArray(rows) || !rows.length) throw new Error('History unavailable')
  let pts = (rows as [number, number, number, number, number, number][])
    .map(([t, , , , c]) => ({ t: t * 1000, c }))
    .sort((a, b) => a.t - b.t)
  if (days) pts = slice(pts, days)
  return pts
}

const slice = (pts: Point[], days: number) => {
  const cut = (pts[pts.length - 1]?.t ?? 0) - days * 86_400_000
  const i = pts.findIndex((p) => p.t >= cut)
  return i < 0 ? pts : pts.slice(i)
}

function historyKey(v: Item, range: string) {
  return v.kind === 'crypto' ? `${v.sym}|${range}` : `${v.sym}|full`
}

async function history(v: Item, range: string) {
  const key = historyKey(v, range)
  const prior = hists.get(key)
  if (pending.has(key) || (prior && !stale(prior, HIST_TTL))) return
  pending.add(key)
  hists.set(key, { ...prior, loading: true, error: undefined })
  emit()
  try {
    const pts = v.kind === 'crypto' ? await candlePoints(v, CANDLES[range] ?? 86400, DAYS[range]) : await fullSeries(v)
    hists.set(key, { data: pts, loading: false, fetched: Date.now() })
  } catch {
    hists.set(key, { ...prior, loading: false, error: 'Chart unavailable' })
  } finally {
    pending.delete(key)
    emit()
  }
}

export function useHistory(v: Item | undefined, range: string): { entry: Entry<Point[]>; pts: Point[] } {
  const entry = useSyncExternalStore(subscribe, () => (v ? hists.get(historyKey(v, range)) || empty : empty))
  useEffect(() => {
    if (v && RANGES[v.kind].includes(range)) void history(v, range)
  }, [v, range])
  const pts = !v
    ? []
    : v.kind === 'crypto' || range === 'All'
      ? (entry.data ?? [])
      : slice(entry.data ?? [], DAYS[range] ?? 366)
  return { entry, pts }
}

// -- news ----------------------------------------------------------------------

async function refreshNews() {
  if (pending.has('news') || !stale(news, NEWS_TTL)) return
  pending.add('news')
  news = { ...news, loading: true }
  emit()
  try {
    const response = await fetch('https://www.cnbc.com/id/10000664/device/rss/rss.html', {
      credentials: 'omit',
      signal: AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new Error('News unavailable')
    const doc = new DOMParser().parseFromString(await response.text(), 'text/xml')
    const items = [...doc.querySelectorAll('item')]
      .map((el) => ({
        title: el.querySelector('title')?.textContent?.trim() || '',
        url: el.querySelector('link')?.textContent?.trim() || '',
        when: Date.parse(el.querySelector('pubDate')?.textContent || '')
      }))
      .filter((h) => h.title && h.url)
      .slice(0, 12)
    if (!items.length) throw new Error('News unavailable')
    news = { data: items, loading: false, fetched: Date.now() }
  } catch {
    news = { ...news, loading: false, error: 'Unable to update headlines.' }
  } finally {
    pending.delete('news')
    emit()
  }
}

// -- search --------------------------------------------------------------------

export async function searchSymbols(query: string, signal: AbortSignal): Promise<Item[]> {
  const response = await fetch(`https://api.stockanalysis.com/api/search?q=${encodeURIComponent(query)}`, {
    credentials: 'omit',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)])
  })
  if (!response.ok) throw new Error('Search unavailable')
  const body = await response.json()
  const rows = Array.isArray(body?.data) ? body.data : []
  return rows
    .filter(
      (r: { s?: string; t?: string; n?: string }) =>
        (r.t === 's' || r.t === 'e') && typeof r.s === 'string' && !r.s.includes('/') && r.s.length < 12
    )
    .slice(0, 12)
    .map((r: { s: string; t: string; n: string }) => item(r.s, r.t === 'e' ? 'etf' : 'equity', r.n || ''))
}

/** CNBC spells some tickers differently from the listing (BRK.B vs BRKB). */
async function resolveCnbc(v: Item): Promise<Item> {
  const check = async (cnbc: string) => {
    try {
      const response = await fetch(QUOTE_URL([cnbc]), { credentials: 'omit', signal: AbortSignal.timeout(12000) })
      if (!response.ok) return false
      const rows: Raw[] = (await response.json())?.FormattedQuoteResult?.FormattedQuote ?? []
      return rows.some((r) => r.code === 0)
    } catch {
      return false
    }
  }
  if (await check(v.cnbc)) return v
  const stripped = v.cnbc.replace(/[^A-Z0-9]/g, '')
  if (stripped !== v.cnbc && (await check(stripped))) return { ...v, cnbc: stripped }
  return v
}

export async function followSearch(candidate: Item) {
  const v = await resolveCnbc(candidate)
  follow(v)
}

// -- pump ----------------------------------------------------------------------

let started = false
export function start() {
  if (started) return
  started = true
  const tick = () => {
    if (document.visibilityState === 'hidden') return
    void refreshQuotes()
    const seen = new Set<string>()
    for (const v of [...store.items, store.viewing]) {
      if (seen.has(v.sym)) continue
      seen.add(v.sym)
      void spark(v)
    }
    void refreshNews()
  }
  document.addEventListener('visibilitychange', tick)
  setInterval(tick, 30_000)
  tick()
}
