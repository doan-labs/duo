import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useDisplay, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  dailyWord,
  fitLayout,
  type GameStatus,
  KEY_ROWS,
  keyboardState,
  MAX_GUESSES,
  parseSaved,
  parseSession,
  type TileState,
  tileState,
  today,
  WORD_LENGTH
} from './game.ts'
import { FLIP_MS, FLIP_STAGGER_MS, styles, WIN_STAGGER_MS } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// attempt - adopting it unconditionally is what converges the two displays,
// including the race where both seed an empty session at once.
const ME = crypto.randomUUID()
const ROW_KEYS = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4', 'row-5']
const COLUMN_KEYS = ['column-0', 'column-1', 'column-2', 'column-3', 'column-4']

const FLIP: Record<Exclude<TileState, 'empty'>, typeof styles.flipCorrect> = {
  correct: styles.flipCorrect,
  present: styles.flipPresent,
  absent: styles.flipAbsent
}

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const date = useMemo(today, [])
  const solution = useMemo(() => dailyWord(date), [date])
  const stored = useKV(os.storage, `wordle-${date}`)
  const session = useKV(os.session, 'attempt')
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState<GameStatus>('playing')
  const [shake, setShake] = useState(0)
  // Why these guards: guesses already settled before this copy mounted (from
  // storage or a folded-over session) render in their final face without the
  // flip or the win hop replaying.
  const baseGuesses = useRef(0)
  const [celebrate, setCelebrate] = useState<number | null>(null)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  const storageSeeded = useRef(false)
  const sessionAdopted = useRef(false)
  const latest = useRef({ guesses, current, status })
  latest.current = { guesses, current, status }
  const activeRow = useRef<HTMLDivElement | null>(null)
  const fit = fitLayout(view, wide)

  // Why the ref + stable callback: `useKV` returns a fresh `set` each render,
  // so keying `publish` on it would resubscribe the session effect on every
  // keystroke. The ref always points at the live KV mirror.
  const sessionRef = useRef(session)
  sessionRef.current = session
  const publish = useCallback(
    (nextGuesses: string[], nextCurrent: string, nextStatus: GameStatus) => {
      sessionRef.current.set(
        JSON.stringify({ by: ME, day: date, guesses: nextGuesses, current: nextCurrent, status: nextStatus })
      )
    },
    [date]
  )

  // Why adopt on the session key: the fold carries the in-progress attempt to
  // the other display. A write this copy did not make is the newer attempt;
  // own writes are already on screen and are ignored. The raw string is the
  // guard: the effect body must not re-fire on every render of a remote value
  // already on screen, or the setters below loop forever.
  useEffect(() => {
    if (session.status === 'hydrating' || session.status === 'saving') return
    const raw = session.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    const next = parseSession(raw)
    if (next && next.day === date) {
      if (next.by === ME) return
      sessionAdopted.current = true
      baseGuesses.current = next.guesses.length
      setGuesses(next.guesses)
      setCurrent(next.current)
      setStatus(next.status)
      return
    }
    // Empty or stale-day session: seed today's state, once storage has landed.
    // Nothing to share while this copy is empty - the other display restores
    // the same shared storage itself, and a blank publish would only race it.
    if (seeded.current || stored.status === 'hydrating') return
    seeded.current = true
    const { guesses: seedGuesses, current: seedCurrent, status: seedStatus } = latest.current
    if (seedGuesses.length || seedCurrent.length || seedStatus !== 'playing') {
      publish(seedGuesses, seedCurrent, seedStatus)
    }
  }, [session.value, session.status, stored.status, date, publish])

  // Why once: the daily storage key is the result of record for completed
  // guesses, read at mount. After that the session is the live source, so a
  // late storage refresh must not rewind adopted session state.
  useEffect(() => {
    if (stored.status === 'hydrating' || storageSeeded.current) return
    storageSeeded.current = true
    if (sessionAdopted.current) return
    const saved = parseSaved(stored.value)
    baseGuesses.current = saved.guesses.length
    setGuesses(saved.guesses)
    setStatus(saved.status)
  }, [stored.status, stored.value])

  useEffect(() => {
    if (!shake) return
    const el = activeRow.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { translate: '0 0' },
        { translate: '-7px 0', offset: 0.25 },
        { translate: '6px 0', offset: 0.55 },
        { translate: '-3px 0', offset: 0.8 },
        { translate: '0 0' }
      ],
      { duration: 240, easing: 'ease-out' }
    )
  }, [shake])

  const submit = () => {
    if (status !== 'playing') return
    if (current.length !== WORD_LENGTH) {
      setShake((value) => value + 1)
      return
    }
    const nextGuesses = [...guesses, current]
    const nextStatus: GameStatus = current === solution ? 'won' : nextGuesses.length >= MAX_GUESSES ? 'lost' : 'playing'
    setGuesses(nextGuesses)
    setCurrent('')
    setStatus(nextStatus)
    if (nextStatus === 'won') setCelebrate(nextGuesses.length - 1)
    publish(nextGuesses, '', nextStatus)
    stored.set(JSON.stringify({ guesses: nextGuesses, status: nextStatus }))
  }

  const press = (key: string) => {
    if (status !== 'playing') return
    if (key === 'ENTER') {
      submit()
      return
    }
    if (key === 'BACK') {
      if (!current.length) return
      const next = current.slice(0, -1)
      setCurrent(next)
      publish(guesses, next, status)
      return
    }
    if (current.length < WORD_LENGTH) {
      const next = current + key
      setCurrent(next)
      publish(guesses, next, status)
    }
  }

  const pressRef = useRef(press)
  pressRef.current = press
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toUpperCase()
      if (key === 'ENTER' || key === 'BACKSPACE') event.preventDefault()
      if (key === 'ENTER') pressRef.current('ENTER')
      else if (key === 'BACKSPACE') pressRef.current('BACK')
      else if (/^[A-Z]$/.test(key)) pressRef.current(key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const hint =
    status === 'won'
      ? 'Solved for today - come back tomorrow'
      : status === 'lost'
        ? `The word was ${solution}`
        : 'Guess the five-letter word'
  const winDelay = FLIP_MS + (WORD_LENGTH - 1) * FLIP_STAGGER_MS

  return (
    <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <div {...stylex.props(styles.brandRow)}>
            <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
            <span {...stylex.props(styles.session)}>DAILY WORD</span>
          </div>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Wordle Mini</h1>
        </div>
        <div {...stylex.props(styles.chip)}>
          <span {...stylex.props(styles.chipLabel)}>TURNS</span>
          <strong key={guesses.length} {...stylex.props(styles.chipValue, guesses.length > 0 && styles.chipPop)}>
            {guesses.length}/6
          </strong>
        </div>
      </header>
      <p
        key={hint}
        {...stylex.props(styles.hint, status === 'won' && styles.hintWon, status === 'lost' && styles.hintLost)}
      >
        {hint}
      </p>
      <section {...stylex.props(styles.stage, wide && styles.stageWide)}>
        <div role="grid" aria-label="Wordle guesses" {...stylex.props(styles.board, styles.fitBoard(fit.boardPad))}>
          {Array.from({ length: MAX_GUESSES }, (_, row) => {
            const submitted = row < guesses.length
            const word = submitted ? guesses[row]! : row === guesses.length ? current : ''
            // Why `revealing`: only a row submitted on this copy flips; rows
            // restored from storage or adopted off the session arrive settled.
            const revealing = submitted && row === guesses.length - 1 && row >= baseGuesses.current
            const celebrating = celebrate === row
            return (
              <div
                role="row"
                key={ROW_KEYS[row]}
                ref={row === guesses.length ? activeRow : undefined}
                {...stylex.props(styles.row, styles.fitRow(fit.tileGap))}
              >
                {Array.from({ length: WORD_LENGTH }, (_, column) => {
                  const state = submitted ? tileState(word, column, solution) : 'empty'
                  return (
                    <div
                      role="gridcell"
                      aria-label={word[column] ? word[column] : 'Empty'}
                      key={COLUMN_KEYS[column]}
                      {...stylex.props(
                        styles.tile,
                        styles.fitTile(fit.tile, fit.tileFont),
                        Boolean(word[column]) && !submitted && styles.filled,
                        state === 'correct' && styles.correct,
                        state === 'present' && styles.present,
                        state === 'absent' && styles.absent,
                        revealing && state !== 'empty' && FLIP[state],
                        revealing && state !== 'empty' && styles.flipDelay(column)
                      )}
                    >
                      <span
                        {...stylex.props(
                          celebrating && styles.winLetter(winDelay + WIN_STAGGER_MS + column * WIN_STAGGER_MS)
                        )}
                      >
                        {word[column] ?? ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div
          role="group"
          aria-label="On-screen keyboard"
          {...stylex.props(styles.keyboard, styles.fitKeyboard(fit.kbPad, fit.keyGap))}
        >
          {KEY_ROWS.map((row, index) => (
            <div key={row} {...stylex.props(styles.keyRow, styles.fitKeyRow(fit.keyGap))}>
              {index === 2 && (
                <button
                  type="button"
                  onClick={() => press('ENTER')}
                  {...stylex.props(styles.key, styles.fitKey(fit.actionW, fit.keyH, fit.keyFont), styles.keyAction)}
                >
                  ENTER
                </button>
              )}
              {Array.from(row).map((key) => {
                const state = keyboardState(key, guesses, solution)
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => press(key)}
                    {...stylex.props(
                      styles.key,
                      styles.fitKey(fit.keyW, fit.keyH, fit.keyFont),
                      state === 'correct' && styles.keyCorrect,
                      state === 'present' && styles.keyPresent,
                      state === 'absent' && styles.keyAbsent
                    )}
                  >
                    {key}
                  </button>
                )
              })}
              {index === 2 && (
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => press('BACK')}
                  {...stylex.props(styles.key, styles.fitKey(fit.actionW, fit.keyH, fit.keyFont), styles.keyAction)}
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Game />)
