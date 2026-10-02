import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, Segmented, Sym, type SymProps, useDisplay, usePresence, useWide } from '@doan-labs/duo-uikit'
import { dark, light } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { conflicts, findHint, type Grid } from './engine.ts'
import {
  adoptGame,
  boardOf,
  digitCount,
  EMPTY_TALLY,
  elapsedMs,
  erase,
  type GameState,
  givenAt,
  isSolved,
  jot,
  MODE_LABEL,
  MODE_NAME,
  MODES,
  type Mode,
  newGame,
  parseSaved,
  play,
  relatedTo,
  restart,
  reveal,
  type Saved,
  select,
  setPencil,
  today,
  undo
} from './game.ts'
import { styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// game - adopting it unconditionally is what converges the two displays.
const ME = crypto.randomUUID()
const DAY = today()
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8]

const cellName = (i: number) => `row ${Math.floor(i / 9) + 1} column ${(i % 9) + 1}`

/** The slots document carries `last` so a relaunch resumes the mode being played. */
const packSaved = (slots: Saved['slots'], stats: Saved['stats'], last: Mode) => JSON.stringify({ slots, stats, last })

const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const firstOpen = (board: Grid) => {
  const i = board.findIndex((v) => !v)
  return i < 0 ? 0 : i
}

function Sudoku() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const live = useKV(os.session, 'sudoku-live')
  const saved = useKV(os.storage, 'sudoku-save')

  const [game, setGame] = useState<GameState | null>(null)
  const [stats, setStats] = useState(EMPTY_TALLY)
  const [slots, setSlots] = useState<Saved['slots']>({})
  const [darkMode, setDarkMode] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // Armed is the two-tap confirmation for destructive tools: the first tap
  // turns the button red and asks again; the second runs it.
  const [armed, setArmed] = useState<string | null>(null)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lastSeen = useRef<string | null>(null)
  const storageLanded = useRef(false)
  const sessionAdopted = useRef(false)
  const published = useRef(false)
  const latest = useRef({ game, stats, slots })
  latest.current = { game, stats, slots }
  const liveRef = useRef(live)
  liveRef.current = live
  const savedRef = useRef(saved)
  savedRef.current = saved

  // Every chrome row is measured, not guessed: underestimating one lets the
  // centered board lap onto the segmented control and clip the status line.
  const fit = useMemo(() => {
    const padX = wide ? 40 : 16
    const top = wide ? 16 : 8
    const header = wide ? 58 : 78 // the cover keeps its own mode row under the title
    const status = wide ? 22 : 18
    const bottom = 24 // the home bar owns the bottom edge on both displays
    const gaps = 24
    const railW = wide ? 324 : 0 // rail width plus the stage gap
    const railH = wide ? 0 : 106 // cover pad row plus tools row plus stage gap
    const w = view.width || (wide ? 778 : 387)
    const h = view.height || (wide ? 503 : 563)
    const free = h - top - header - status - bottom - gaps - railH
    const board = Math.max(190, Math.floor(Math.min(free, w - padX - railW)))
    const cell = board / 9
    return { board, digit: Math.round(cell * 0.55), note: Math.max(10, Math.round(cell * 0.32)) }
  }, [view.width, view.height, wide])

  // Why storage seeds once: the durable slots are the record of earlier games,
  // read at mount. After that the session is the live source, so a late
  // storage refresh must not rewind adopted state.
  useEffect(() => {
    if (saved.status === 'hydrating' || storageLanded.current) return
    storageLanded.current = true
    const doc = parseSaved(saved.value)
    setSlots(doc.slots)
    setStats(doc.stats)
    if (sessionAdopted.current) return
    const daily = doc.slots.daily?.day === DAY ? doc.slots.daily : undefined
    const slot = doc.last === 'daily' ? daily : doc.slots[doc.last]
    setGame(slot ?? daily ?? newGame(ME, doc.last))
  }, [saved.status, saved.value])

  // Why adopt on the session key: the fold carries the in-progress game to the
  // other display. A write this copy did not make is the newer game; own
  // writes are already on screen and are ignored. The raw string is the guard:
  // re-firing on a remote value already on screen would loop forever.
  useEffect(() => {
    if (live.status === 'hydrating' || live.status === 'saving') return
    const raw = live.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    let next: GameState | null = null
    try {
      next = adoptGame(raw ? JSON.parse(raw) : null)
    } catch {
      next = null
    }
    if (next) {
      if (next.by === ME) return
      sessionAdopted.current = true
      // A foreign daily from an earlier date is a dead puzzle, not a save.
      setGame(next.mode === 'daily' && next.day !== DAY ? newGame(ME, 'daily') : next)
      return
    }
    // An empty session: seed it once this copy has a game to share.
    if (published.current || !latest.current.game) return
    published.current = true
    liveRef.current.set(JSON.stringify(latest.current.game))
  }, [live.status, live.value])

  /**
   * Every mutation flows through here so the live session key and the durable
   * slots document stay in lockstep. `fresh` counts a dealt puzzle once in the
   * played tally; a solve freezes the clock and updates the mode's best time.
   */
  const commit = useCallback((next: GameState, fresh = false) => {
    const wire = { ...next, by: ME }
    const cur = latest.current
    let statsNext = cur.stats
    if (fresh || (next.endedAt && !cur.game?.endedAt && cur.game?.id === next.id)) {
      const solved = next.endedAt && cur.game?.id === next.id ? cur.stats.solved + 1 : cur.stats.solved
      const bestMs = { ...cur.stats.bestMs }
      if (next.endedAt && cur.game?.id === next.id) {
        const ms = next.endedAt - next.startedAt
        if (!bestMs[next.mode] || ms < bestMs[next.mode]) bestMs[next.mode] = ms
      }
      statsNext = { played: cur.stats.played + (fresh ? 1 : 0), solved, bestMs }
    }
    const slotsNext = { ...cur.slots, [wire.mode]: wire }
    setGame(wire)
    setStats(statsNext)
    setSlots(slotsNext)
    liveRef.current.set(JSON.stringify(wire))
    savedRef.current.set(packSaved(slotsNext, statsNext, wire.mode))
    // Any real move disarms a pending destructive confirm.
    if (armTimer.current) window.clearTimeout(armTimer.current)
    setArmed(null)
  }, [])

  /**
   * Switch modes: stash the current board in its slot, then resume the target
   * slot or deal a fresh puzzle. A saved daily from another day is stale and
   * gets regenerated for today.
   */
  const deal = useCallback(
    (mode: Mode) => {
      const cur = latest.current
      const stash = cur.game ? { ...cur.slots, [cur.game.mode]: cur.game } : { ...cur.slots }
      const slot = mode === 'daily' ? (stash.daily?.day === DAY ? stash.daily : undefined) : stash[mode]
      // Only a live slot is worth resuming: a finished board in the slot would
      // just reappear already solved, so it falls through to a fresh deal.
      if (slot && !slot.endedAt) {
        setSlots(stash)
        commit(slot)
      } else {
        const fresh = newGame(ME, mode)
        setSlots(stash)
        commit(fresh, true)
      }
    },
    [commit]
  )

  // Why the interval only re-renders: the clock derives from timestamps on the
  // shared state, so the running second copy never owns a countdown (same
  // reasoning as pomodoro-timer).
  useEffect(() => {
    if (!game || game.endedAt !== null) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [game])

  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const press = useCallback(
    (key: string) => {
      const g = latest.current.game
      if (!g) return
      if (key === 'ERASE') {
        if (g.sel !== null) commit(erase(g, g.sel))
        return
      }
      if (key === 'UNDO') return commit(undo(g))
      if (key === 'PENCIL') return commit(setPencil(g, !g.pencil))
      const d = Number(key)
      if (!d || g.sel === null) return
      commit(g.pencil ? jot(g, g.sel, d) : play(g, g.sel, d))
    },
    [commit]
  )

  // Keeps the solved card mounted through its short exit animation. The hook
  // stays above the loading early-return like every other hook.
  const solvedCard = usePresence(!!game && isSolved(game), 200)

  // Why keys move the selection instead of typing blind: hardware arrow keys
  // navigate the board, digits play or jot against the selected cell.
  const pressRef = useRef(press)
  pressRef.current = press
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const g = latest.current.game
      if (!g) return
      const k = event.key
      if (/^[1-9]$/.test(k)) pressRef.current(k)
      else if (k === 'Backspace' || k === 'Delete') {
        event.preventDefault()
        pressRef.current('ERASE')
      } else if (k === 'z') pressRef.current('UNDO')
      else if (k === 'n') pressRef.current('PENCIL')
      else if (k.startsWith('Arrow')) {
        event.preventDefault()
        const sel = g.sel ?? firstOpen(boardOf(g))
        const dr = k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0
        const dc = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0
        const r = Math.min(8, Math.max(0, Math.floor(sel / 9) + dr))
        const c = Math.min(8, Math.max(0, (sel % 9) + dc))
        commit(select(g, r * 9 + c))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commit])

  if (!game) {
    return (
      <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root)} aria-busy="true">
        <div {...stylex.props(styles.loading)}>Sudoku</div>
      </main>
    )
  }

  const board = boardOf(game)
  const clashes = conflicts(board)
  const related = game.sel !== null ? relatedTo(game.sel) : null
  const selDigit = game.sel !== null ? board[game.sel]! : 0
  const solved = isSolved(game)
  const left = board.reduce((n, v) => n + (v ? 0 : 1), 0)
  const best = stats.bestMs[game.mode]

  const hint = () => {
    const found = findHint(board, [...game.solution].map(Number), game.sel)
    if (!found) return
    setNote(`Hint: ${cellName(found.cell)} - ${found.reason}`)
    commit(reveal(select(game, found.cell), found.cell))
    window.setTimeout(() => setNote(null), 6000)
  }

  const padTap = (d: number) => {
    const g = latest.current.game
    if (!g || g.sel === null || solved) return
    commit(g.pencil ? jot(g, g.sel, d) : play(g, g.sel, d))
  }

  const statusText =
    saved.status === 'hydrating'
      ? 'Loading saved progress...'
      : saved.status === 'error'
        ? 'Progress may not save offline'
        : armed
          ? 'Tap again to confirm'
          : solved
            ? `Solved in ${formatTime(elapsedMs(game, now))}${game.hints ? `, ${game.hints} hints` : ''}`
            : `${left} to go${game.pencil ? ' - pencil on' : ''}${clashes.size ? ' - conflict' : ''}`

  /** First tap arms a destructive tool; the second within a few seconds runs it. */
  const arm = (key: string, run: () => void) => {
    if (armed === key) {
      if (armTimer.current) window.clearTimeout(armTimer.current)
      setArmed(null)
      run()
      return
    }
    if (armTimer.current) window.clearTimeout(armTimer.current)
    setArmed(key)
    armTimer.current = window.setTimeout(() => setArmed(null), 3000)
  }

  type Tool = {
    key: string
    label: string
    icon: SymProps['name']
    disabled: boolean
    on: () => void
    active?: boolean
    danger?: boolean
  }
  const tools: Tool[] = [
    { key: 'notes', label: 'Notes', icon: 'compose', disabled: solved, on: () => press('PENCIL'), active: game.pencil },
    { key: 'erase', label: 'Erase', icon: 'trash', disabled: solved, on: () => press('ERASE') },
    { key: 'undo', label: 'Undo', icon: 'undo', disabled: !game.undo.length, on: () => press('UNDO') },
    { key: 'hint', label: 'Hint', icon: 'bolt', disabled: solved, on: hint },
    {
      key: 'restart',
      label: 'Restart',
      icon: 'reload',
      disabled: false,
      danger: true,
      on: () => arm('restart', () => commit(restart(game)))
    },
    // Daily is one fixed puzzle a day: "new" there is restart, so it drops out.
    ...(game.mode === 'daily'
      ? []
      : [
          {
            key: 'new',
            label: 'New',
            icon: 'plus' as const,
            disabled: false,
            danger: true,
            on: () => arm('new', () => commit(newGame(ME, game.mode), true))
          }
        ])
  ]

  return (
    <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>{MODE_NAME[game.mode]}</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Sudoku</h1>
        </div>
        {wide && (
          <div {...stylex.props(styles.headerMode)}>
            <Segmented
              options={MODES.map((m) => MODE_LABEL[m])}
              value={MODE_LABEL[game.mode]}
              onChange={(label) => {
                const next = MODES.find((m) => MODE_LABEL[m] === label)
                if (next && next !== game.mode) deal(next)
              }}
              aria-label="Game mode"
            />
          </div>
        )}
        <div {...stylex.props(styles.chip)} aria-live="off">
          <span {...stylex.props(styles.chipLabel)}>{solved ? 'Solved' : 'Time'}</span>
          <span {...stylex.props(styles.chipValue)}>{formatTime(elapsedMs(game, now))}</span>
        </div>
      </header>

      {!wide && (
        <div {...stylex.props(styles.bar)}>
          <Segmented
            options={MODES.map((m) => MODE_LABEL[m])}
            value={MODE_LABEL[game.mode]}
            onChange={(label) => {
              const next = MODES.find((m) => MODE_LABEL[m] === label)
              if (next && next !== game.mode) deal(next)
            }}
            aria-label="Game mode"
          />
        </div>
      )}

      <section {...stylex.props(styles.stage, !wide && styles.stageCover)}>
        <div {...stylex.props(styles.boardWrap)}>
          <fieldset aria-label="Sudoku board" {...stylex.props(styles.board, styles.boardSize(fit.board))}>
            {INDEXES.map((box) => (
              <div key={box} {...stylex.props(styles.box)}>
                {INDEXES.map((inner) => {
                  const i = Math.floor(box / 3) * 27 + (box % 3) * 3 + Math.floor(inner / 3) * 9 + (inner % 3)
                  const v = board[i]!
                  const given = givenAt(game, i)
                  const bad = clashes.has(i)
                  const sel = game.sel === i
                  const kin = !sel && related?.has(i)
                  const same = !sel && !!selDigit && v === selDigit
                  const label = `${cellName(i)}, ${v ? `${given ? 'given' : 'entered'} ${v}` : 'empty'}${bad ? ', conflict' : ''}`
                  return (
                    <button
                      key={inner}
                      type="button"
                      aria-label={label}
                      tabIndex={sel || (game.sel === null && i === firstOpen(board)) ? 0 : -1}
                      onClick={() => {
                        if (!sel) commit(select(game, i))
                      }}
                      {...stylex.props(
                        styles.cell,
                        styles.cellFont(fit.digit),
                        kin && styles.cellRelated,
                        same && styles.cellSame,
                        sel && styles.cellSelected,
                        given ? styles.cellGiven : styles.cellEntry,
                        bad && (given ? styles.cellGivenWrong : styles.cellWrong)
                      )}
                    >
                      {v ? (
                        <span key={`${i}-${v}`} {...stylex.props(styles.digit)}>
                          {v}
                        </span>
                      ) : (
                        game.notes[i] && (
                          <span aria-hidden="true" {...stylex.props(styles.notes, styles.cellFont(fit.note))}>
                            {DIGITS.map((d) => (
                              <span key={d} {...stylex.props(styles.note)}>
                                {game.notes[i]!.includes(String(d)) ? d : ''}
                              </span>
                            ))}
                          </span>
                        )
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </fieldset>
          {solvedCard.mounted && (
            <div {...stylex.props(styles.solvedCard, solvedCard.closing && styles.solvedCardOut)} role="status">
              <div {...stylex.props(styles.solvedInner)}>
                <span {...stylex.props(styles.solvedBadge)}>
                  <Sym name="check" size={26} />
                </span>
                <h2 {...stylex.props(styles.solvedTitle)}>Solved</h2>
                <p {...stylex.props(styles.solvedSub)}>
                  {MODE_NAME[game.mode]} in {formatTime(elapsedMs(game, now))}
                  {game.hints ? `, ${game.hints} hint${game.hints === 1 ? '' : 's'}` : ''}
                  {best ? ` - best ${formatTime(best)}` : ''}
                </p>
                <div {...stylex.props(styles.solvedActions)}>
                  {game.mode === 'daily' ? (
                    <Button variant="tinted" onClick={() => deal('easy')}>
                      Play an easy game
                    </Button>
                  ) : (
                    <Button variant="tinted" onClick={() => commit(newGame(ME, game.mode), true)}>
                      New {MODE_LABEL[game.mode]} game
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div {...stylex.props(wide ? styles.rail : styles.railCover)}>
          <div {...stylex.props(styles.pad, !wide && styles.padCover)}>
            {DIGITS.map((d) => {
              const leftD = 9 - digitCount(game, d)
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!leftD || solved}
                  aria-label={`Digit ${d}${leftD ? `, ${leftD} left` : ', complete'}`}
                  onClick={() => padTap(d)}
                  {...stylex.props(styles.padKey, !wide && styles.padKeyCover, game.pencil && styles.padKeyPencil)}
                >
                  {d}
                  <span {...stylex.props(styles.padLeft, !wide && styles.padKeyCoverLeft)}>{leftD}</span>
                </button>
              )
            })}
          </div>

          <div {...stylex.props(styles.tools, !wide && styles.toolsCover)}>
            {tools.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-label={armed === t.key ? `${t.label}? Tap again to confirm` : t.label}
                aria-pressed={t.key === 'notes' ? game.pencil : armed === t.key ? true : undefined}
                disabled={t.disabled}
                onClick={t.on}
                {...stylex.props(
                  styles.tool,
                  wide ? styles.toolWide : styles.toolCover,
                  t.active && styles.toolActive,
                  armed === t.key && styles.toolArmed
                )}
              >
                <Sym name={t.icon} size={15} />
                {armed === t.key ? 'Sure?' : t.label}
              </button>
            ))}
          </div>

          {wide && (
            <div {...stylex.props(styles.stats)}>
              <div {...stylex.props(styles.statRow)}>
                <span {...stylex.props(styles.statLabel)}>To go</span>
                <span {...stylex.props(styles.statValue)}>{left}</span>
              </div>
              <div {...stylex.props(styles.statRow)}>
                <span {...stylex.props(styles.statLabel)}>Hints used</span>
                <span {...stylex.props(styles.statValue)}>{game.hints}</span>
              </div>
              <div {...stylex.props(styles.statRow)}>
                <span {...stylex.props(styles.statLabel)}>Best {MODE_LABEL[game.mode]}</span>
                <span {...stylex.props(styles.statValue)}>{best ? formatTime(best) : '-'}</span>
              </div>
              <div {...stylex.props(styles.statRow)}>
                <span {...stylex.props(styles.statLabel)}>Puzzles solved</span>
                <span {...stylex.props(styles.statValue)}>{stats.solved}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <p {...stylex.props(styles.status, !wide && styles.statusCover)} aria-live="polite">
        {note ?? statusText}
      </p>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Sudoku />)
