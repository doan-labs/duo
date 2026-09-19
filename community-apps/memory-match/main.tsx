import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

const SYMBOLS = ['🍎', '🌙', '⭐', '🌈', '🎵', '🚀']
type Card = { id: number; symbol: string }

function createDeck() {
  const cards = [...SYMBOLS, ...SYMBOLS].map((symbol, index) => ({ id: index, symbol }))
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = cards[index]!
    cards[index] = cards[swap]!
    cards[swap] = current
  }
  return cards
}

function Game() {
  const view = useDisplay()
  const cover = view.display === 'cover'
  const [deck, setDeck] = useState(createDeck)
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const fitWidth = Math.max(
    0,
    Math.floor(
      Math.min((view.width || 740) - (cover ? 20 : 36), (((view.height || 480) - (cover ? 118 : 144)) * 4) / 3)
    )
  )
  const fitHeight = Math.floor((fitWidth * 3) / 4)
  const finished = matched.length === deck.length

  useEffect(() => {
    if (flipped.length !== 2) return
    const timer = window.setTimeout(() => {
      const first = deck[flipped[0]!]!
      const second = deck[flipped[1]!]!
      if (first.symbol === second.symbol) setMatched((current) => [...current, flipped[0]!, flipped[1]!])
      setFlipped([])
    }, 650)
    return () => window.clearTimeout(timer)
  }, [deck, flipped])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const flip = (index: number) => {
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return
    const next = [...flipped, index]
    setFlipped(next)
    if (next.length === 2) setMoves((current) => current + 1)
  }

  const reset = () => {
    setDeck(createDeck())
    setFlipped([])
    setMatched([])
    setMoves(0)
  }

  return (
    <main data-display={view.display} {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.title)}>Memory Match</h1>
        </div>
        <span {...stylex.props(styles.moves)}>MOVES {moves}</span>
      </header>
      <p {...stylex.props(styles.hint)}>{finished ? 'Board cleared' : 'Find the matching pairs'}</p>
      <div role="grid" aria-label="Memory cards" {...stylex.props(styles.board, styles.fitBoard(fitWidth, fitHeight))}>
        {deck.map((card, index) => {
          const open = flipped.includes(index) || matched.includes(index)
          return (
            <button
              type="button"
              role="gridcell"
              aria-label={open ? card.symbol : 'Hidden card'}
              key={card.id}
              onClick={() => flip(index)}
              {...stylex.props(styles.card, open && styles.cardOpen, matched.includes(index) && styles.cardMatched)}
            >
              {open ? card.symbol : '?'}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={reset} {...stylex.props(styles.reset)}>
        New game
      </button>
    </main>
  )
}

const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 9,
    paddingBlock: 16,
    paddingInline: 18,
    color: colors.white,
    backgroundColor: colors.darkElevated,
    fontFamily: fonts.system
  },
  cover: { gap: 5, paddingBlock: 9, paddingInline: 10 },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    flexShrink: 0
  },
  kicker: { color: colors.purple, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 },
  title: { marginBlock: 0, fontSize: 32, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1 },
  moves: { color: colors.grey3, fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  hint: { marginBlock: 0, color: colors.grey3, fontSize: 12, flexShrink: 0 },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
    gap: 6,
    flexShrink: 0
  },
  fitBoard: (width: number, height: number) => ({ width: String(width) + 'px', height: String(height) + 'px' }),
  card: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 0,
    minHeight: 0,
    borderWidth: 0,
    borderRadius: 10,
    color: colors.white,
    backgroundColor: colors.fillDark,
    fontSize: 26,
    cursor: 'pointer'
  },
  cardOpen: { backgroundColor: colors.fillThin },
  cardMatched: { color: colors.greenBright, backgroundColor: colors.darkElevated2 },
  reset: {
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 9,
    paddingInline: 18,
    color: colors.darkElevated,
    backgroundColor: colors.purple,
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0
  }
})

createRoot(document.body).render(<Game />)
