import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { Num, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { adoptDeck, type Card, createDeck, fitBoard, SYMBOLS, serializeDeck } from './game.ts'
import { BOARD_GAP, BOARD_PAD, faceStyle, styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is usually the newer
// settled board - adopting it is what converges the two displays, including
// the race where both seed an empty session at once.
const ME = crypto.randomUUID()
// `at` orders writes: an occluded display's timers can be throttled long
// enough to republish after the other display already moved on, and the
// shared store is last-writer-wins, so the wire value needs a clock.
// Both app copies run in the shell page, so they share one Date.now().
type SavedGame = { by: string; at: number; deck: string[]; flipped: number[]; matched: number[]; moves: number }

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  // Why a ref-held seed deck: the session may hydrate with a board the other
  // display dealt; this copy's shuffle is only ever the fallback it publishes.
  const initial = useRef<Card[] | null>(null)
  if (!initial.current) initial.current = createDeck()
  const [deck, setDeck] = useState<Card[]>(initial.current)
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const lastWriteAt = useRef(0)
  const fit = fitBoard(view, wide)
  const cell = Math.max(1, Math.floor((fit.width - BOARD_PAD * 2 - BOARD_GAP * 3) / 4))
  const finished = matched.length === deck.length
  const miss = flipped.length === 2 && deck[flipped[0]!]!.symbol !== deck[flipped[1]!]!.symbol

  const saved = useKV(os.session, 'board')
  const best = useJSON<number | null>(os.storage, 'best', null)

  const publish = useCallback(
    (cards: Card[], open: number[], done: number[], count: number) => {
      const at = Date.now()
      lastWriteAt.current = at
      const game: SavedGame = { by: ME, at, deck: serializeDeck(cards), flipped: open, matched: done, moves: count }
      saved.set(JSON.stringify(game))
    },
    [saved]
  )

  // Why adopt on the session key: the fold carries the running game to the
  // other display. A write this copy did not make is the new board; own
  // writes are already on screen and are ignored. The raw string is the
  // guard: the effect must not re-fire on every render of a remote value
  // already on screen, or the setDeck below loops forever.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current) {
        seeded.current = true
        publish(initial.current!, [], [], 0)
      }
      return
    }
    const next = JSON.parse(raw) as SavedGame
    if (next.by === ME) return
    // A write older than the newest local write is a throttled replay of a
    // settled board; adopting it would resurrect flipped/matched/moves the
    // player already moved past.
    if (next.at < lastWriteAt.current) return
    lastWriteAt.current = next.at
    setDeck(adoptDeck(next.deck))
    setFlipped(next.flipped)
    setMatched(next.matched)
    setMoves(next.moves)
  }, [saved.value, saved.status, publish])

  // The reveal window is part of the shared state, so an adopting copy that
  // lands mid-pair resolves it the same way and the boards stay identical.
  useEffect(() => {
    if (flipped.length !== 2) return
    const timer = window.setTimeout(() => {
      const first = deck[flipped[0]!]!
      const second = deck[flipped[1]!]!
      const nextMatched = first.symbol === second.symbol ? [...matched, flipped[0]!, flipped[1]!] : matched
      setFlipped([])
      setMatched(nextMatched)
      if (nextMatched.length === deck.length && (best.value === null || moves < best.value)) {
        best.set(moves)
        setNewBest(true)
      }
      publish(deck, [], nextMatched, moves)
    }, 650)
    return () => window.clearTimeout(timer)
  }, [deck, flipped, matched, moves, best, publish])

  const flip = (index: number) => {
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return
    const next = [...flipped, index]
    const count = next.length === 2 ? moves + 1 : moves
    setFlipped(next)
    setMoves(count)
    publish(deck, next, matched, count)
  }

  const reset = () => {
    const fresh = createDeck()
    setDeck(fresh)
    setFlipped([])
    setMatched([])
    setMoves(0)
    setNewBest(false)
    publish(fresh, [], [], 0)
  }

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const hint = finished ? `Cleared in ${moves} moves` : 'Find the matching pairs'

  return (
    <main ref={rootRef} data-display={view.display} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.logo, !wide && styles.logoCover)}>
            Memory
            <span {...stylex.props(styles.logoTile)}>Match</span>
          </h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel)}>BEST</span>
            <strong {...stylex.props(styles.chipValue)}>
              <Num value={best.value ?? undefined} />
            </strong>
          </div>
        </div>
      </header>
      {!wide && <p {...stylex.props(styles.hint)}>{hint}</p>}
      <section {...stylex.props(styles.stage, !wide && styles.stageCover)}>
        <div {...stylex.props(styles.board, styles.fitBoard(fit.width, fit.height), finished && styles.boardWin)}>
          {deck.map((card, index) => {
            const open = flipped.includes(index) || matched.includes(index)
            const done = matched.includes(index)
            return (
              <button
                type="button"
                aria-label={open ? card.symbol : 'Hidden card'}
                key={card.id}
                onClick={() => flip(index)}
                {...stylex.props(
                  styles.card,
                  styles.cardFont(Math.round(cell * 0.42)),
                  open && !done && styles.cardOpen,
                  done && styles.cardMatched,
                  done && faceStyle(card.symbol),
                  miss && flipped.includes(index) && styles.cardMiss,
                  finished && styles.cardCelebrate,
                  finished && styles.stagger(index)
                )}
              >
                {open ? card.symbol : '◆'}
              </button>
            )
          })}
        </div>
        <aside {...stylex.props(styles.rail, !wide && styles.railCover)}>
          <div {...stylex.props(styles.railStats, !wide && styles.railStatsCover)}>
            <div {...stylex.props(styles.stat)}>
              <span {...stylex.props(styles.statLabel)}>MOVES</span>
              <strong {...stylex.props(styles.statValue)}>
                <Num value={moves} />
              </strong>
            </div>
            <div {...stylex.props(styles.stat)}>
              <span {...stylex.props(styles.statLabel)}>PAIRS</span>
              <div {...stylex.props(styles.pips)}>
                {SYMBOLS.map((symbol, pip) => (
                  <span key={symbol} {...stylex.props(styles.pip, pip < matched.length / 2 && styles.pipOn)} />
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={reset} {...stylex.props(styles.newGame)}>
            <Sym name="reload" size={13} />
            New game
          </button>
          {finished && newBest && <span {...stylex.props(styles.bestTag)}>NEW BEST</span>}
          {wide && <p {...stylex.props(styles.hint)}>{hint}</p>}
        </aside>
      </section>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Game />)
