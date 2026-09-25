import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { cue } from './audio.ts'
import { chooseMove, LEVELS, type Level } from './bot.ts'
import {
  colorOf,
  file,
  fromLAN,
  inCheck,
  kingSquare,
  legalMoves,
  rank,
  square,
  squareName,
  toLAN,
  toSAN
} from './engine.ts'
import { adoptGame, derive, fitLayout, newGame, parseRecord, type SavedGame } from './game.ts'
import { BOARD_PAD, styles } from './styles.ts'

// Both displays share one session key whose store is last-writer-wins, so a
// value not written by this copy is always the newer settled game - adopting
// it unconditionally is what converges the two displays, including the race
// where both seed a fresh session at once.
const ME = crypto.randomUUID()

// The filled glyph set for both colours; the side shows through the piece
// styles. Full names are for aria labels and the promotion picker.
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const PIECE_NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const pieceName = (p: string) => PIECE_NAMES[p.toLowerCase()] ?? 'piece'
const SIDES = ['White', 'Black'] as const

// The last move's endpoints for the highlight: 'e2e4' -> [12, 28].
function lastMoveEnds(lan: string): [number, number] | null {
  if (lan.length < 4) return null
  const from = 'abcdefgh'.indexOf(lan[0]!) + (Number(lan[1]) - 1) * 8
  const to = 'abcdefgh'.indexOf(lan[2]!) + (Number(lan[3]) - 1) * 8
  return from >= 0 && to >= 0 ? [from, to] : null
}

const moveCue = (san: string) => cue(san.includes('+') ? 'check' : san.includes('x') ? 'capture' : 'move')

type Finished = Exclude<ReturnType<typeof derive>['status'], { state: 'playing' }>

// The kit Segmented is a light-surface control: its selected pill is white
// with inherited ink, which turns invisible on this app's dark felt. This
// segment row is the same radiogroup contract drawn for a dark well.
function Seg<T extends string>({
  options,
  value,
  onChange
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" {...stylex.props(styles.segTrack)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          {...stylex.props(styles.segBtn, o === value && styles.segOn)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
function resultCopy(status: Finished, you: 'w' | 'b') {
  if (status.state === 'checkmate')
    return status.loser === you
      ? { kicker: 'Checkmate', title: 'The bot wins', tone: 'lose' as const }
      : { kicker: 'Checkmate', title: 'You win', tone: 'win' as const }
  if (status.state === 'stalemate') return { kicker: 'Stalemate', title: 'Draw game', tone: 'draw' as const }
  const reason =
    status.reason === 'fifty'
      ? 'Fifty-move rule'
      : status.reason === 'material'
        ? 'Insufficient material'
        : 'Threefold repetition'
  return { kicker: reason, title: 'Draw game', tone: 'draw' as const }
}

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const saved = useKV(os.session, 'chess-game')
  const stored = useKV(os.storage, 'chess-record')
  const [game, setGame] = useState<SavedGame | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null)
  const [thinking, setThinking] = useState(false)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const firstAdopt = useRef(true)
  const celebrated = useRef<string | null>(null)
  const fit = fitLayout(view, wide)
  const record = parseRecord(stored.value)
  const derived = useMemo(() => (game ? derive(game.moves) : null), [game])
  const pos = derived?.pos ?? null
  const status = derived?.status ?? { state: 'playing' as const }
  const sans = derived?.sans ?? []
  const finished = status.state !== 'playing'
  const targets = useMemo(
    () =>
      selected === null || !pos
        ? new Set<number>()
        : new Set(
            legalMoves(pos)
              .filter((m) => m.from === selected)
              .map((m) => m.to)
          ),
    [selected, pos]
  )

  // Writes go straight to the stable session KV so `publish` can hold a stable
  // identity; the store's own mirror is what brings the value back through
  // `saved.value` on this display and the other one.
  const publish = useCallback((next: SavedGame) => {
    setGame(next)
    void os.session.set('chess-game', JSON.stringify(next))
  }, [])

  // Why adopt on the session key: the fold carries the running game to the
  // other display. A write this copy did not make is the new settled game;
  // own writes are already on screen and are ignored. The raw string is the
  // guard against re-firing on an unchanged value.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // Seed only after the tally hydrates: a fresh copy publishing before it
      // would otherwise let a peer repair its real record away.
      if (!seeded.current && stored.status !== 'hydrating') {
        seeded.current = true
        publish(newGame(ME, 'w', 'Club'))
      }
      return
    }
    const next = adoptGame(JSON.parse(raw), ME)
    if (next.by === ME) return
    setSelected(null)
    setPending(null)
    setThinking(false)
    setGame(next)
    // The move that just landed gets its cue - a capture knocks, a check
    // alerts, a quiet move ticks. The first adopt is silent: those moves
    // already happened wherever the session left them.
    if (!firstAdopt.current && view.active) {
      const d = derive(next.moves)
      if (d.status.state === 'playing' && d.sans.length) moveCue(d.sans.at(-1)!)
    }
    firstAdopt.current = false
  }, [saved.value, saved.status, publish, stored.status, view.active])

  // One celebration per game: the glass being looked at plays the jingle and
  // writes the tally, so the two views never double either. The record's
  // lastGame dedupe covers the fold-during-mate race.
  useEffect(() => {
    if (!finished || !game || celebrated.current === game.id) return
    celebrated.current = game.id
    if (!view.active) return
    const copy = resultCopy(status, game.you)
    cue(copy.tone)
    if (copy.tone !== 'draw') navigator.vibrate?.([50, 40, 80])
    if (record.lastGame !== game.id) {
      const next = { ...record, lastGame: game.id }
      if (status.state === 'checkmate') {
        if (status.loser === game.you) next.bot++
        else next.you++
      } else next.draws++
      void stored.set(JSON.stringify(next))
    }
  }, [finished, game, status, view.active, record, stored])

  // The bot lives in the active view only: the second copy draws everything
  // and starts nothing, so the reply is computed once, then shared. A short
  // beat before thinking makes the reply read as a reply, not a glitch.
  useEffect(() => {
    if (!game || !pos || status.state !== 'playing' || pos.turn === game.you || !view.active) return
    setThinking(true)
    const timer = setTimeout(() => {
      const result = chooseMove(pos, game.level)
      setThinking(false)
      if (result) {
        // The reply's own cue plays here - the writer display never sees its
        // own publish on the adopt path.
        const san = toSAN(pos, result.move)
        if (!san.includes('#')) moveCue(san)
        publish({ ...game, by: ME, moves: [...game.moves, toLAN(result.move)] })
      }
    }, 320)
    return () => {
      clearTimeout(timer)
      setThinking(false)
    }
  }, [game, pos, status.state, view.active, publish])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // The ref'd shell renders even while the game seeds: useWide's observer needs
  // the element on the first commit or it throws before ready can post.
  if (!game || !pos) return <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)} />

  const checkedKing = inCheck(pos) ? kingSquare(pos.board, pos.turn) : -1
  const last = game.moves.length ? lastMoveEnds(game.moves.at(-1)!) : null
  const cell = (fit.board - BOARD_PAD * 2) / 8
  const rows = game.you === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]
  const cols = game.you === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  // Display coordinates: row 0 is the top edge of the board.
  const rowOf = (sq: number) => (game.you === 'w' ? 7 - rank(sq) : rank(sq))
  const colOf = (sq: number) => (game.you === 'w' ? file(sq) : 7 - file(sq))
  // Undo rolls back to the player's turn: two plies after the bot answered,
  // one while the bot has yet to - except an un-answerable opener.
  const canUndo =
    !thinking &&
    (pos.turn === game.you
      ? game.moves.length >= 2
      : game.moves.length >= 1 && (game.you === 'w' || game.moves.length > 1))

  const statusText = finished
    ? resultCopy(status, game.you).title
    : pos.turn === game.you
      ? inCheck(pos)
        ? 'Check - your move'
        : 'Your move'
      : null
  const pickerW = 4 * cell + 4 * 3 + 8
  const promoAt = pending
    ? {
        x: Math.max(
          0,
          Math.min(fit.board - BOARD_PAD * 2 - pickerW, colOf(pending.to) * cell + cell / 2 - pickerW / 2)
        ),
        y: Math.max(0, Math.min(fit.board - BOARD_PAD * 2 - cell, rowOf(pending.to) * cell))
      }
    : null

  const copy = finished ? resultCopy(status, game.you) : null

  const movesList =
    sans.length === 0 ? (
      <span {...stylex.props(styles.moveSan)}>No moves yet</span>
    ) : (
      Array.from({ length: Math.ceil(sans.length / 2) }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the scoresheet only appends
        <div key={i} {...stylex.props(styles.moveRow)}>
          <span {...stylex.props(styles.moveNum)}>{i + 1}.</span>
          <span {...stylex.props(styles.moveSan, i * 2 === sans.length - 1 && styles.moveSanNew)}>{sans[i * 2]}</span>
          <span {...stylex.props(styles.moveSan, i * 2 + 1 === sans.length - 1 && styles.moveSanNew)}>
            {sans[i * 2 + 1]}
          </span>
        </div>
      ))
    )

  const newGameBtn = (
    <button
      type="button"
      onClick={() => {
        setSelected(null)
        setPending(null)
        publish(newGame(ME, game.you, game.level))
      }}
      {...stylex.props(styles.primary)}
    >
      <Sym name="reload" size={13} />
      New game
    </button>
  )

  return (
    <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Duo Arcade</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Chess</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipYou)}>You</span>
            <strong {...stylex.props(styles.chipValue)}>{record.you}</strong>
          </div>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipDraw)}>Draw</span>
            <strong {...stylex.props(styles.chipValue)}>{record.draws}</strong>
          </div>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipBot)}>Bot</span>
            <strong {...stylex.props(styles.chipValue)}>{record.bot}</strong>
          </div>
        </div>
      </header>
      <p aria-live="polite" {...stylex.props(styles.status, inCheck(pos) && !finished && styles.statusCheck)}>
        {statusText ?? (
          <>
            Bot is thinking
            <span aria-hidden="true" {...stylex.props(styles.thinkDots)}>
              <i {...stylex.props(styles.thinkDot)} />
              <i {...stylex.props(styles.thinkDot, styles.thinkDotB)} />
              <i {...stylex.props(styles.thinkDot, styles.thinkDotC)} />
            </span>
          </>
        )}
      </p>
      <section {...stylex.props(styles.stage, !wide && styles.stageCover)}>
        <div {...stylex.props(styles.board, styles.fitBoard(fit.board))}>
          <div
            role="grid"
            aria-label="Chess board"
            {...stylex.props(styles.grid, styles.fitGrid(fit.board - BOARD_PAD * 2))}
          >
            {rows.map((r) =>
              cols.map((f) => {
                const sq = square(f, r)
                const piece = pos.board[sq]
                const isLight = (f + r) % 2 === 1
                const isLast = last !== null && (sq === last[0] || sq === last[1])
                return (
                  <button
                    key={sq}
                    type="button"
                    aria-label={`${squareName(sq)}${piece ? `, ${colorOf(piece) === 'w' ? 'white' : 'black'} ${pieceName(piece)}` : ', empty'}`}
                    onClick={() => {
                      setPending(null)
                      tap(sq)
                    }}
                    {...stylex.props(
                      styles.square,
                      isLight ? styles.light : styles.dark,
                      selected === sq && styles.selected,
                      isLast && styles.lastMove,
                      sq === checkedKing && styles.checked
                    )}
                  >
                    {targets.has(sq) && <i {...stylex.props(piece ? styles.ring : styles.dot)} />}
                    {piece && (
                      <span
                        key={piece}
                        {...stylex.props(
                          styles.piece,
                          styles.fitPiece(cell * 0.74),
                          colorOf(piece) === 'w' ? styles.pieceW : styles.pieceB
                        )}
                      >
                        {GLYPH[piece.toLowerCase()]}
                      </span>
                    )}
                    {rowOf(sq) === 7 && (
                      <i
                        {...stylex.props(
                          styles.coord,
                          styles.coordFile,
                          isLight ? styles.coordOnLight : styles.coordOnDark
                        )}
                      >
                        {'abcdefgh'[f]}
                      </i>
                    )}
                    {colOf(sq) === 0 && (
                      <i
                        {...stylex.props(
                          styles.coord,
                          styles.coordRank,
                          isLight ? styles.coordOnLight : styles.coordOnDark
                        )}
                      >
                        {r + 1}
                      </i>
                    )}
                  </button>
                )
              })
            )}
            {pending && promoAt && (
              <div {...stylex.props(styles.promo, styles.fitPromo(promoAt.x, promoAt.y))}>
                {(['q', 'r', 'b', 'n'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={`Promote to ${pieceName(p)}`}
                    onClick={() => {
                      setPending(null)
                      setSelected(null)
                      playMove(`${squareName(pending.from)}${squareName(pending.to)}${p}`)
                    }}
                    {...stylex.props(styles.promoButton, styles.fitSquare(cell))}
                  >
                    <span
                      {...stylex.props(
                        styles.piece,
                        styles.fitPiece(cell * 0.68),
                        game.you === 'w' ? styles.pieceW : styles.pieceB
                      )}
                    >
                      {GLYPH[p]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <aside {...stylex.props(styles.rail, !wide && styles.railCover)}>
          <div {...stylex.props(styles.field, !wide && styles.fieldCover)}>
            <span {...stylex.props(styles.fieldLabel)}>Level</span>
            <Seg options={LEVELS} value={game.level} onChange={(level) => publish({ ...game, by: ME, level })} />
          </div>
          <div {...stylex.props(styles.field, !wide && styles.fieldCover)}>
            <span {...stylex.props(styles.fieldLabel)}>You play</span>
            <Seg
              options={SIDES}
              value={game.you === 'w' ? 'White' : 'Black'}
              onChange={(side) => {
                const you = side === 'White' ? 'w' : 'b'
                if (you !== game.you) publish(newGame(ME, you, game.level))
              }}
            />
          </div>
          <div role="group" aria-label="Game controls" {...stylex.props(styles.controls, wide && styles.controlsWide)}>
            {newGameBtn}
            <button type="button" onClick={undo} disabled={!canUndo} {...stylex.props(styles.secondary)}>
              <Sym name="back" size={13} />
              Undo
            </button>
          </div>
          <div {...stylex.props(styles.moves, !wide && styles.movesCover)}>{movesList}</div>
        </aside>
      </section>
      {finished && copy && (
        <section {...stylex.props(styles.result)}>
          <div {...stylex.props(styles.resultCopy)}>
            <span
              {...stylex.props(
                styles.resultKicker,
                copy.tone === 'win' && styles.resultKickerWin,
                copy.tone === 'draw' && styles.resultKickerDraw
              )}
            >
              {copy.kicker}
            </span>
            <strong {...stylex.props(styles.resultTitle)}>{copy.title}</strong>
          </div>
          {newGameBtn}
        </section>
      )}
    </main>
  )

  function tap(sq: number) {
    if (!game || !pos || finished || thinking || pos.turn !== game.you) return
    const piece = pos.board[sq]
    if (selected !== null) {
      const options = legalMoves(pos).filter((m) => m.from === selected && m.to === sq)
      if (options.length) {
        if (options.some((m) => m.promo)) setPending({ from: selected, to: sq })
        else playMove(toLAN(options[0]!))
        setSelected(null)
        return
      }
    }
    setSelected(piece && colorOf(piece) === game.you ? sq : null)
  }

  function playMove(lan: string) {
    if (!game || !pos) return
    const move = fromLAN(pos, lan)
    if (!move) return
    const san = toSAN(pos, move)
    // A '#'-ending move lets the result card's cue do the talking.
    if (!san.includes('#')) moveCue(san)
    publish({ ...game, by: ME, moves: [...game.moves, lan] })
    setSelected(null)
  }

  function undo() {
    if (!game || !pos || !game.moves.length || thinking) return
    // Pop plies until it is the player's turn again - two after a finished
    // pair, one while the bot has not yet answered.
    let n = 0
    let turn = pos!.turn
    while (turn !== game.you && n < game.moves.length) {
      n++
      turn = turn === 'w' ? 'b' : 'w'
    }
    if (n === 0) n = Math.min(2, game.moves.length)
    setSelected(null)
    setPending(null)
    publish({ ...game, by: ME, moves: game.moves.slice(0, game.moves.length - n) })
  }
}

await os.connect()
createRoot(document.body).render(<Game />)
