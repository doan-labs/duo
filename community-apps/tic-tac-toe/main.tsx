import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  adoptBoard,
  type Board,
  CELL_KEYS,
  emptyBoard,
  fitLayout,
  isDraw,
  type Mark,
  parseScores,
  type SavedBoard,
  type Scores,
  SIZE,
  serializeBoard,
  type WinLine,
  winLine
} from './game.ts'
import { BOARD_GAP, BOARD_PAD, styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled board - adopting it unconditionally is what converges the two
// displays, including the race where both seed an empty session at once.
const ME = crypto.randomUUID()
type SavedGame = { by: string; board: SavedBoard; turn: Mark; scores: Scores; round: number }

// Bar geometry for the win line: a beam from just past the first cell's centre
// to just past the last, so the stroke overshoots the marks it connects.
function cellCentre(index: number, board: number) {
  const cell = (board - BOARD_PAD * 2 - BOARD_GAP * (SIZE - 1)) / SIZE
  const row = Math.floor(index / SIZE)
  const column = index % SIZE
  return {
    x: BOARD_PAD + column * (cell + BOARD_GAP) + cell / 2,
    y: BOARD_PAD + row * (cell + BOARD_GAP) + cell / 2,
    cell
  }
}

function lineGeometry(line: WinLine, board: number) {
  const a = cellCentre(line[0], board)
  const c = cellCentre(line[2], board)
  const dx = c.x - a.x
  const dy = c.y - a.y
  const dist = Math.hypot(dx, dy)
  const overshoot = a.cell * 0.34
  const height = Math.max(4, Math.round(a.cell * 0.09))
  return {
    width: dist + overshoot * 2,
    height,
    x: a.x - (dx / dist) * overshoot,
    y: a.y - (dy / dist) * overshoot,
    deg: (Math.atan2(dy, dx) * 180) / Math.PI
  }
}

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const saved = useKV(os.session, 'match')
  const stored = useKV(os.storage, 'match-scores')
  const [board, setBoard] = useState<Board>(emptyBoard)
  const [turn, setTurn] = useState<Mark>('X')
  const [round, setRound] = useState(0)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const fit = fitLayout(view, wide)

  const line = winLine(board)
  const result = line ? board[line[0]]! : null
  const draw = isDraw(board)
  const finished = Boolean(result || draw)
  const scores = parseScores(stored.value)

  const publish = useCallback(
    (nextBoard: Board, nextTurn: Mark, nextScores: Scores, nextRound: number) => {
      saved.set(
        JSON.stringify({
          by: ME,
          board: serializeBoard(nextBoard),
          turn: nextTurn,
          scores: nextScores,
          round: nextRound
        })
      )
    },
    [saved]
  )

  // Why adopt on the session key: the fold carries the running match to the
  // other display. A write this copy did not make is the new settled match;
  // own writes are already on screen and are ignored. The raw string is the
  // guard: the effect body must not re-fire on every render of a remote value
  // already on screen, or the setBoard below loops forever.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // Seed only after the tally hydrates: a fresh copy publishing zeroed
      // scores would otherwise have the other display repair its real tally
      // away through the adopt path below.
      if (!seeded.current && stored.status !== 'hydrating') {
        seeded.current = true
        publish(emptyBoard(), 'X', parseScores(stored.value), 0)
      }
      return
    }
    const next = JSON.parse(raw) as SavedGame
    if (next.by === ME) return
    setBoard(adoptBoard(next.board))
    setTurn(next.turn)
    setRound(next.round)
    if (next.scores.X !== scores.X || next.scores.O !== scores.O) {
      void stored.set(JSON.stringify(next.scores))
    }
  }, [saved.value, saved.status, publish, stored.status, stored.value, stored.set, scores])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const play = (index: number) => {
    if (board[index] || finished) return
    const next = [...board]
    next[index] = turn
    const nextLine = winLine(next)
    const over = Boolean(nextLine) || next.every(Boolean)
    const nextTurn = over ? turn : turn === 'X' ? 'O' : 'X'
    const nextScores = nextLine ? { ...scores, [turn]: scores[turn] + 1 } : scores
    setBoard(next)
    setTurn(nextTurn)
    if (nextLine) void stored.set(JSON.stringify(nextScores))
    publish(next, nextTurn, nextScores, round)
  }

  const resetRound = (nextScores = scores) => {
    const nextRound = round + 1
    setBoard(emptyBoard())
    setTurn('X')
    setRound(nextRound)
    publish(emptyBoard(), 'X', nextScores, nextRound)
  }

  const resetScores = () => {
    const nextScores: Scores = { X: 0, O: 0 }
    void stored.set(JSON.stringify(nextScores))
    resetRound(nextScores)
  }

  const markFont = Math.round(((fit.board - BOARD_PAD * 2 - BOARD_GAP * (SIZE - 1)) / SIZE) * 0.52)
  const beam = line ? lineGeometry(line, fit.board) : null

  return (
    <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Duo Arcade</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Tic-Tac-Toe</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipLabelX)}>X</span>
            <strong {...stylex.props(styles.chipValue)}>{scores.X}</strong>
          </div>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipLabelO)}>O</span>
            <strong {...stylex.props(styles.chipValue)}>{scores.O}</strong>
          </div>
        </div>
      </header>
      <p aria-live="polite" {...stylex.props(styles.status, !finished && styles.statusLive)}>
        {result ? `${result} wins the round` : draw ? 'Draw game' : `${turn} to move`}
      </p>
      <section {...stylex.props(styles.stage, !wide && styles.stageCover)}>
        <div
          key={round}
          role="grid"
          aria-label="Tic-Tac-Toe board"
          {...stylex.props(styles.board, styles.fitBoard(fit.board))}
        >
          {board.map((mark, index) => (
            <button
              key={mark ? `${round}-${CELL_KEYS[index]}` : CELL_KEYS[index]}
              type="button"
              aria-label={`Cell ${CELL_KEYS[index]}, ${mark ?? 'empty'}`}
              onClick={() => play(index)}
              {...stylex.props(
                styles.cell,
                styles.fitMark(markFont),
                mark && styles.cellMark,
                mark === 'X' && styles.cellX,
                mark === 'O' && styles.cellO
              )}
            >
              {mark}
            </button>
          ))}
          {beam && (
            <div
              aria-hidden="true"
              {...stylex.props(
                styles.line,
                styles.fitLine(beam.width, beam.height, beam.x, beam.y, beam.deg),
                result === 'X' ? styles.lineX : styles.lineO
              )}
            />
          )}
        </div>
        <aside {...stylex.props(styles.rail, !wide && styles.railCover)}>
          <div role="group" aria-label="Game controls" {...stylex.props(styles.controls, wide && styles.controlsWide)}>
            <button type="button" onClick={() => resetRound()} {...stylex.props(styles.primary)}>
              <Sym name="reload" size={13} />
              New round
            </button>
            <button type="button" onClick={resetScores} {...stylex.props(styles.secondary)}>
              Reset wins
            </button>
          </div>
          {wide && <p {...stylex.props(styles.hint)}>Two players, one board. X opens every round.</p>}
        </aside>
      </section>
      {finished && (
        <section {...stylex.props(styles.result)}>
          <div {...stylex.props(styles.resultCopy)}>
            <span {...stylex.props(styles.resultKicker, result && styles.resultKickerWin)}>
              {result ? 'Round over' : 'Draw game'}
            </span>
            <strong {...stylex.props(styles.resultTitle)}>
              {result ? `${result} wins the round` : 'Nobody takes it'}
            </strong>
          </div>
          <button type="button" onClick={() => resetRound()} {...stylex.props(styles.primary)}>
            <Sym name="reload" size={13} />
            {result ? 'New round' : 'Play again'}
          </button>
        </section>
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Game />)
