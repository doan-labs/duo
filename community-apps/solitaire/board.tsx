import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useLayoutEffect, useRef, useState } from 'react'
import { CardBack, CardFace } from './cards.tsx'
import { type Card, RANK_NAMES } from './game.ts'
import { styles } from './styles.ts'

const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'] as const
export const cardName = (card: Card) => `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`

/** Which pile a tap landed on. 's' is the stock, 'w' the waste's top card. */
export type Spot = 's' | 'w' | `f${number}` | `t${number}`

/** A lifted selection: waste top, a foundation top, or a tableau run from index i. */
export type Sel = { t: 'w' } | { t: 'f'; f: number } | { t: 't'; c: number; i: number }

export interface Fit {
  w: number
  h: number
  cardW: number
  cardH: number
  gapX: number
  rowGap: number
  tabY: number
  wasteStep: number
  font: number
}

/** Fit the classic seven-column table into the measured region. */
export function fitBoard(w: number, h: number): Fit {
  if (w <= 0 || h <= 0) return { w: 0, h: 0, cardW: 0, cardH: 0, gapX: 0, rowGap: 0, tabY: 0, wasteStep: 0, font: 0 }
  const gapX = Math.max(4, Math.min(14, w * 0.022))
  // Card width comes off the columns; the top row and a healthy fan cap it.
  let cardW = (w - gapX * 6) / 7
  cardW = Math.min(cardW, h * 0.31, 118)
  const cardH = cardW * 1.42
  const rowGap = Math.max(6, Math.min(16, h * 0.028))
  const tabY = cardH + rowGap
  const wasteStep = cardW * 0.34
  const font = Math.max(9, cardW * 0.3)
  return { w, h, cardW, cardH, gapX, rowGap, tabY, wasteStep, font }
}

// Pile x positions: stock 0, waste 1 (its draw-3 fan borrows column 2's space),
// foundations 3-6, tableau every column.
const colX = (fit: Fit, c: number) => c * (fit.cardW + fit.gapX)
const foundX = (fit: Fit, f: number) => (3 + f) * (fit.cardW + fit.gapX)

/** The y of a card in its column's fan: down cards sit tight, up cards spread. */
function cardPos(fit: Fit, col: Card[], index: number, spacing: { down: number; up: number }) {
  let y = fit.tabY
  for (let i = 0; i < index; i++) y += col[i]!.up ? spacing.up : spacing.down
  return y
}

/**
 * Per-column fan spacing: face-down cards sit tight, face-up runs spread so a
 * rank and pip always show; a column too tall for the board compresses its own
 * gaps rather than clipping under the toolbar.
 */
function columnSpacing(fit: Fit, col: Card[]): { down: number; up: number } {
  let down = Math.max(3, fit.cardH * 0.16)
  let up = Math.max(8, fit.cardH * 0.3)
  const d = col.filter((c) => !c.up).length
  const u = col.length - d
  const avail = fit.h - fit.tabY - fit.cardH
  if (avail <= 0) return { down: 2, up: 3 }
  const need = d * down + Math.max(0, u - 1) * up
  if (need <= avail) return { down, up }
  const scale = avail / need
  down = Math.max(2, down * scale)
  up = Math.max(3, up * scale)
  return { down, up }
}

export interface BoardProps {
  game: { stock: Card[]; waste: Card[]; foundations: Card[][]; tableau: Card[][] }
  sel: Sel | null
  /** Spot keys that are legal landings for the current selection. */
  hot: ReadonlySet<string>
  /** Element key of a rejected tap: it shakes once. */
  shake: string | null
  /** 0 while settled; bumped to a deal index base on a fresh deal. */
  dealing: boolean
  won: boolean
  onSpot: (spot: Spot) => void
  onCard: (id: number, spot: Spot, index: number) => void
  /** Double-tap on a card sends it to its best legal home. */
  onCardDouble: (id: number, spot: Spot, index: number) => void
}

export function Board({ game, sel, hot, shake, dealing, won, onSpot, onCard, onCardDouble }: BoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const fit = fitBoard(size.w, size.h)
  const focusables = useRef(new Map<string, HTMLElement>())
  const keepFocus = (key: string) => (el: HTMLElement | null) => {
    if (el) focusables.current.set(key, el)
    else focusables.current.delete(key)
  }

  // Arrows move between the focusable spots spatially: nearest neighbour on
  // the travel axis wins, with off-axis drift penalised.
  const nav = (event: React.KeyboardEvent<HTMLElement>, key: string) => {
    if (!event.key.startsWith('Arrow')) return
    const el = focusables.current.get(key)
    if (!el) return
    const from = el.getBoundingClientRect()
    const cx = from.left + from.width / 2
    const cy = from.top + from.height / 2
    let best: { el: HTMLElement; score: number } | null = null
    for (const [otherKey, other] of focusables.current) {
      if (otherKey === key) continue
      const rect = other.getBoundingClientRect()
      const ox = rect.left + rect.width / 2
      const oy = rect.top + rect.height / 2
      const dx = ox - cx
      const dy = oy - cy
      const dir = event.key
      const ok =
        (dir === 'ArrowLeft' && dx < -2) ||
        (dir === 'ArrowRight' && dx > 2) ||
        (dir === 'ArrowUp' && dy < -2) ||
        (dir === 'ArrowDown' && dy > 2)
      if (!ok) continue
      const offAxis = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx)
      const along = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dx) : Math.abs(dy)
      const score = offAxis * 2 + along
      if (!best || score < best.score) best = { el: other, score }
    }
    if (best) {
      event.preventDefault()
      best.el.focus()
    }
  }

  const selIds = new Set<number>()
  if (sel?.t === 'w') {
    const w = game.waste.at(-1)
    if (w) selIds.add(w.id)
  } else if (sel?.t === 'f') {
    const f = game.foundations[sel.f]?.at(-1)
    if (f) selIds.add(f.id)
  } else if (sel?.t === 't') {
    const col = game.tableau[sel.c]
    if (col) for (let i = sel.i; i < col.length; i++) selIds.add(col[i]!.id)
  }

  /** One live card: a positioned button with a 3D flip between face and back. */
  const place = (x: number, y: number, z: number) => styles.place(x, y, fit.cardW, fit.cardH, z)
  const cardEl = (
    card: Card,
    x: number,
    y: number,
    z: number,
    key: string,
    spot: Spot,
    index: number,
    dealAt: number,
    isHot = false,
    label?: string
  ) => {
    const picked = selIds.has(card.id)
    return (
      <button
        key={`${key}.${card.id}`}
        type="button"
        ref={keepFocus(key)}
        aria-label={label ?? cardName(card)}
        aria-pressed={picked}
        onClick={() => onCard(card.id, spot, index)}
        onDoubleClick={() => onCardDouble(card.id, spot, index)}
        onKeyDown={(e) => nav(e, key)}
        {...stylex.props(
          styles.card,
          styles.cardFont(fit.font),
          place(x, y, z + (picked ? 300 : 0)),
          isHot && styles.hotCard,
          dealing && styles.dealIn,
          dealing && styles.delayAt(dealAt),
          // The win bounces just the settled foundations, in suit order.
          won && spot.startsWith('f') && styles.hop,
          won && spot.startsWith('f') && styles.delayAt(120 + Number(spot.slice(1)) * 90),
          shake === key && styles.shake,
          picked && styles.selected,
          shared.press
        )}
      >
        <span {...stylex.props(styles.cardInner, !card.up && styles.cardInnerDown)}>
          <span {...stylex.props(styles.faceSide, styles.faceFront)}>
            <CardFace card={card} small={fit.cardW < 52} />
          </span>
          <span {...stylex.props(styles.faceSide, styles.faceBack)}>
            <CardBack />
          </span>
        </span>
      </button>
    )
  }

  const slotEl = (x: number, y: number, spot: Spot, label: string, mark?: React.ReactNode) => (
    <button
      key={spot}
      type="button"
      ref={keepFocus(spot)}
      aria-label={label}
      onClick={() => onSpot(spot)}
      onKeyDown={(e) => nav(e, spot)}
      {...stylex.props(
        styles.slot,
        place(x, y, 0),
        hot.has(spot) && styles.slotHot,
        shake === spot && styles.shake,
        shared.press
      )}
      tabIndex={-1}
    >
      {mark ? <span {...stylex.props(styles.slotMark)}>{mark}</span> : null}
    </button>
  )

  const out: React.ReactNode[] = []

  if (!fit.cardW) return <div ref={ref} {...stylex.props(styles.board)} />

  // Stock: a face-down stack, or an empty well that redeals the waste.
  // The top card's name stays out of the label - face-down is a secret.
  if (game.stock.length) {
    out.push(
      cardEl(
        { ...game.stock.at(-1)!, up: false },
        0,
        0,
        1,
        's',
        's',
        game.stock.length - 1,
        790,
        false,
        `Draw from the stock - ${game.stock.length} card${game.stock.length === 1 ? '' : 's'} left`
      )
    )
  } else {
    out.push(slotEl(0, 0, 's', game.waste.length ? 'Redeal the waste into the stock' : 'Stock empty', '↻'))
  }

  // Waste: a fan of the last three (or fewer) cards; only the top can be tapped.
  const wasteFan = Math.min(3, game.waste.length)
  for (let i = 0; i < wasteFan; i++) {
    const index = game.waste.length - wasteFan + i
    const card = game.waste[index]!
    const x = fit.cardW + fit.gapX + i * fit.wasteStep
    if (index === game.waste.length - 1) {
      out.push(cardEl(card, x, 0, 10 + i, 'w', 'w', index, 0))
    } else {
      out.push(
        <span
          key={card.id}
          aria-hidden="true"
          {...stylex.props(styles.faceSide, styles.faceFront, styles.cardFont(fit.font), place(x, 0, 10 + i))}
        >
          <CardFace card={card} small={fit.cardW < 52} />
        </span>
      )
    }
  }
  if (!game.waste.length) out.push(slotEl(fit.cardW + fit.gapX, 0, 'w', 'Waste empty'))

  // Foundations: an empty well per suit slot, or the pile's top card.
  for (let f = 0; f < 4; f++) {
    const pile = game.foundations[f]!
    const x = foundX(fit, f)
    if (!pile.length) {
      out.push(slotEl(x, 0, `f${f}`, `Foundation ${f + 1} - aces first`, <FoundationMark />))
      continue
    }
    const card = pile.at(-1)!
    out.push(cardEl(card, x, 0, 20, `f${f}`, `f${f}`, pile.length - 1, 0, hot.has(`f${f}`)))
  }

  // Tableau columns: a well under every column so an empty one still taps.
  for (let c = 0; c < 7; c++) {
    const col = game.tableau[c]!
    const x = colX(fit, c)
    out.push(slotEl(x, fit.tabY, `t${c}`, `Column ${c + 1}${col.length ? '' : ' - kings only'}`))
    const spacing = columnSpacing(fit, col)
    const colHot = hot.has(`t${c}`)
    for (let i = 0; i < col.length; i++) {
      const card = col[i]!
      const y = cardPos(fit, col, i, spacing)
      if (!card.up) {
        // A settled face-down card shows its back flat - the rotateY pair is
        // only for live cards mid-flip (a rotated faceSide shows its own back).
        out.push(
          <span key={card.id} aria-hidden="true" {...stylex.props(styles.cardDownStill, place(x, y, 30 + i))}>
            <CardBack />
          </span>
        )
        continue
      }
      out.push(
        cardEl(card, x, y, 30 + i * 2, `t${c}.${i}`, `t${c}`, i, (i * 7 + c) * 24, colHot && i === col.length - 1)
      )
    }
  }

  return (
    <div ref={ref} {...stylex.props(styles.board)} role="group" aria-label="Card table">
      {out}
    </div>
  )
}

// The empty foundation's quiet mark: an A waiting for its ace.
function FoundationMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.foundationMark)}>
      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="inherit">
        A
      </text>
    </svg>
  )
}
