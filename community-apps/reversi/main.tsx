import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue, setMuted, unlockAudio } from './audio.ts'
import { chooseMoveAsync, LEVELS, type Level, THINK_MS } from './bot.ts'
import { type Color, cellName } from './engine.ts'
import {
  adoptGame,
  canUndo,
  countFinished,
  type Derived,
  derive,
  emptyTally,
  fitLayout,
  type Mode,
  newGame,
  OPENING_ID,
  type Prefs,
  parsePrefs,
  parseTally,
  type SavedGame,
  type Tally,
  tryPlace,
  tryReply,
  tryUndo
} from './game.ts'
import { styles } from './styles.ts'

// One storage key holds the whole match as a last-writer-wins document. Every
// mutation re-reads the settled document before writing and validates the
// input against it, so a display whose local copy lags the wire rejects stale
// placements instead of clobbering the other display's moves.
const ME = crypto.randomUUID()
const GAME_KEY = 'reversi-game'
const RECORD_KEY = 'reversi-record'
const PREFS_KEY = 'reversi-prefs'

const MODES: { id: Mode; label: string }[] = [
  { id: 'solo', label: 'Solo' },
  { id: 'local', label: 'Two players' }
]
const SIDES: { id: Color; label: string }[] = [
  { id: 'b', label: 'Black' },
  { id: 'w', label: 'White' }
]

const sideLabel = (game: SavedGame, side: Color): string =>
  game.mode === 'solo' ? (side === game.you ? 'You' : 'Bot') : side === 'b' ? 'Black' : 'White'

type Confirm = { title: string; body: string; action: string; run: () => void }

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>(600)
  const saved = useKV(os.storage, GAME_KEY)
  const stored = useKV(os.storage, RECORD_KEY)
  const prefsKv = useKV(os.storage, PREFS_KEY)

  const [game, setGame] = useState<SavedGame | null>(null)
  const [record, setRecord] = useState<Tally>(emptyTally())
  const [prefs, setPrefs] = useState<Prefs>({ hints: true, muted: false })
  const [thinking, setThinking] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [focusCell, setFocusCell] = useState(-1)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const lastSeen = useRef<string | null | undefined>(undefined)
  const lastRecord = useRef<string | null | undefined>(undefined)
  const lastPrefs = useRef<string | null | undefined>(undefined)
  const liveRaw = useRef<string | null | undefined>(undefined)
  const seeded = useRef(false)
  const celebrated = useRef<string | null>(null)
  const returnFocus = useRef<Element | null>(null)
  const gameRef = useRef<SavedGame | null>(null)
  const focusRef = useRef(-1)
  const boardRef = useRef<HTMLDivElement>(null)
  const shownRef = useRef<Confirm | null>(null)
  // One serial writer queue per copy: reads and writes never interleave with
  // each other, and each step validates the input against the freshest wire
  // document before it is allowed to write.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const wasActive = useRef(view.active)
  const activeRef = useRef(view.active)
  const mutedRef = useRef(prefs.muted)
  const [showLog, setShowLog] = useState(false)

  gameRef.current = game
  focusRef.current = focusCell
  activeRef.current = view.active
  mutedRef.current = prefs.muted

  const d = useMemo<Derived | null>(() => (game ? derive(game.moves) : null), [game])
  const fit = useMemo(() => fitLayout(view, wide), [view, wide])

  // Discs flipped by the last move cascade outward per direction run.
  const flipDelays = useMemo(() => {
    const map = new Map<number, number>()
    if (d?.last) for (const run of d.last.runs) run.forEach((cell, i) => map.set(cell, i * 60 + 40))
    return map
  }, [d])

  const play = useCallback((kind: Cue) => {
    if (!mutedRef.current && activeRef.current) cue(kind)
  }, [])

  /** The settled wire document, or null when the store holds no game yet. */
  const readStoredGame = useCallback(async (): Promise<SavedGame | null> => {
    const raw = await os.storage.get(GAME_KEY)
    return raw === null ? null : adoptGame(raw, ME)
  }, [])

  // Adopt whatever the store currently carries before deciding anything. The
  // mirror (useKV) can lag a fold wake-up; this read does not.
  const syncGame = useCallback(async (): Promise<SavedGame | null> => {
    const stored = await readStoredGame()
    const local = gameRef.current
    if (
      stored &&
      (!local ||
        stored.id !== local.id ||
        stored.moves.length !== local.moves.length ||
        stored.mode !== local.mode ||
        stored.level !== local.level ||
        stored.you !== local.you)
    ) {
      setGame(stored)
      setHover(null)
    }
    return stored ?? local
  }, [readStoredGame])

  /**
   * Every game write goes through here: sync to the wire, run the step on the
   * freshest document, write once, then verify nothing foreign landed during
   * our own write - if it did, the settled winner is adopted instead of
   * argued with.
   */
  const enqueueGame = useCallback(
    (step: (base: SavedGame) => SavedGame | null): Promise<boolean> => {
      const job = queueRef.current.then(async () => {
        const base = await syncGame()
        if (!base) return false
        const next = step(base)
        if (!next) return false
        const settled = { ...next, by: ME }
        const wire = JSON.stringify(settled)
        await os.storage.set(GAME_KEY, wire)
        lastSeen.current = wire
        setGame(settled)
        const after = await os.storage.get(GAME_KEY)
        if (after !== null && after !== wire) {
          const winner = adoptGame(after, ME)
          if (winner.id !== settled.id || winner.moves.length !== settled.moves.length) setGame(winner)
        }
        return true
      })
      queueRef.current = job
      return job
    },
    [syncGame]
  )

  /** Read-through on the same queue: orders an activation sync before input. */
  const enqueueSync = useCallback((): Promise<SavedGame | null> => {
    const job = queueRef.current.then(syncGame)
    queueRef.current = job
    return job
  }, [syncGame])

  const enqueueRecord = useCallback((step: (base: Tally) => Tally): Promise<Tally> => {
    const job = queueRef.current.then(async () => {
      const base = parseTally(await os.storage.get(RECORD_KEY))
      const next = step(base)
      const wire = JSON.stringify(next)
      await os.storage.set(RECORD_KEY, wire)
      lastRecord.current = wire
      setRecord(next)
      return next
    })
    queueRef.current = job
    return job
  }, [])

  const enqueuePrefs = useCallback((patch: Partial<Prefs>): Promise<Prefs> => {
    const job = queueRef.current.then(async () => {
      const base = parsePrefs(await os.storage.get(PREFS_KEY))
      const next = { ...base, ...patch }
      const wire = JSON.stringify(next)
      await os.storage.set(PREFS_KEY, wire)
      lastPrefs.current = wire
      setPrefs(next)
      return next
    })
    queueRef.current = job
    return job
  }, [])

  useEffect(() => {
    setMuted(prefs.muted)
  }, [prefs.muted])

  // Adopt whichever settled game the wire carries; ignore this copy's own
  // echo. `liveRaw` is the baseline the mirror last delivered while this copy
  // was settled: the first adoption after a fold wake-up syncs silently, and
  // only changes that land while we are actually live play their cue.
  useEffect(() => {
    if (saved.status === 'hydrating') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // A fresh store seeds a shared opening; the first real move publishes.
      if (!seeded.current) {
        seeded.current = true
        setGame({ ...newGame(ME, 'solo', 'Medium', 'b'), id: OPENING_ID })
      }
      return
    }
    const prev = gameRef.current
    const next = adoptGame(raw, ME)
    if (next.by === ME) return
    setGame(next)
    setHover(null)
    if (liveRaw.current !== undefined && view.active && !prefs.muted) {
      // Sound what just changed on the peer display: a fresh match, a takeback,
      // or the disc that just landed.
      if (next.id !== prev?.id || next.moves.length === 0) cue('new')
      else if (next.moves.length < prev.moves.length) cue('undo')
      else if (next.moves.length > prev.moves.length) cue('flip')
    }
    liveRaw.current = raw
  }, [saved.value, saved.status, view.active, prefs.muted])

  // Becoming visible settles this copy to the wire BEFORE any input can land:
  // the sync runs first on the serial queue, so a tap fired during a fold
  // wake-up still validates against the freshest shared document.
  useEffect(() => {
    if (!view.active) {
      liveRaw.current = undefined
      wasActive.current = false
      return
    }
    if (wasActive.current) return
    wasActive.current = true
    void enqueueSync()
  }, [view.active, enqueueSync])

  useEffect(() => {
    if (stored.status === 'hydrating') return
    const raw = stored.value
    if (raw !== null && raw === lastRecord.current) return
    lastRecord.current = raw
    setRecord(parseTally(raw))
  }, [stored.value, stored.status])

  useEffect(() => {
    if (prefsKv.status === 'hydrating') return
    const raw = prefsKv.value
    if (raw !== null && raw === lastPrefs.current) return
    lastPrefs.current = raw
    setPrefs(parsePrefs(raw))
  }, [prefsKv.value, prefsKv.status])

  // The bot lives only on the active display. Its search is time-sliced so the
  // thread stays live, it is cancelled by any state change, and the reply is
  // applied through the serial writer so a stale snapshot can never write.
  useEffect(() => {
    if (!view.active || !game || !d || d.over || game.mode !== 'solo' || d.toMove === game.you) return
    setThinking(true)
    let cancelled = false
    const timer = setTimeout(() => {
      const snapshot = gameRef.current
      if (!snapshot || snapshot.id !== game.id || snapshot.moves.length !== game.moves.length) {
        setThinking(false)
        return
      }
      const dd = derive(snapshot.moves)
      const toMove = dd.toMove
      if (dd.over || !toMove || toMove === snapshot.you) {
        setThinking(false)
        return
      }
      void (async () => {
        try {
          const pick = await chooseMoveAsync(dd.board, toMove, snapshot.level, () => cancelled)
          if (cancelled || !pick) return
          const ok = await enqueueGame((base) => {
            const r = tryReply(base, snapshot, pick.at)
            return r.ok ? r.game : null
          })
          if (ok) play('flip')
        } finally {
          if (!cancelled) setThinking(false)
        }
      })()
    }, THINK_MS[game.level])
    return () => {
      cancelled = true
      clearTimeout(timer)
      setThinking(false)
    }
  }, [game, d, view.active, play, enqueueGame])

  // One celebration per match, counted once in shared storage: the cue and
  // haptic fire only on the copy that actually posts the tally increment, so
  // a folded-in peer stays silent and replays never double-count.
  useEffect(() => {
    if (!view.active || !game || !d?.over || celebrated.current === game.id) return
    if (stored.status !== 'ready' && stored.status !== 'saving') return
    celebrated.current = game.id
    const winner = d.over.winner
    void enqueueRecord((tally) => {
      if (tally.lastGame === game.id) return tally
      if (activeRef.current) navigator.vibrate?.(winner === 'draw' ? [40] : [40, 60, 40])
      play(winner === 'draw' ? 'draw' : game.mode === 'solo' && winner !== game.you ? 'lose' : 'win')
      return countFinished(tally, game.id, winner)
    })
  }, [d, game, view.active, stored.status, play, enqueueRecord])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const askConfirm = useCallback((entry: Confirm) => {
    returnFocus.current = document.activeElement
    setConfirm(entry)
  }, [])

  // The Sheet closes on cancel (scrim, Escape, Cancel) and after the confirmed
  // action; either way the control that opened it takes focus back - but only
  // while this copy stays the visible one. A hidden copy's deferred restore
  // would steal focus from the display the user is actually looking at.
  const closeConfirm = useCallback(() => {
    setConfirm(null)
    const el = returnFocus.current
    returnFocus.current = null
    if (el instanceof HTMLElement) {
      let tries = 0
      const restore = () => {
        if (!activeRef.current || !el.isConnected) return
        el.focus()
        if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
      }
      requestAnimationFrame(restore)
    }
  }, [])

  // The pre-connect Escape guard gets the live cancel only while a sheet is up.
  useEffect(() => {
    sheetCancel = confirm ? closeConfirm : null
  }, [confirm, closeConfirm])

  const newMatch = useCallback(
    (patch?: { mode?: Mode; you?: Color }) => {
      if (!game) return
      const next = newGame(ME, patch?.mode ?? game.mode, game.level, patch?.you ?? game.you)
      void enqueueGame(() => next).then((ok) => {
        if (!ok) return
        play('new')
        setHover(null)
        setFocusCell(-1)
      })
    },
    [game, play, enqueueGame]
  )

  // A match with entered progress is never wiped silently: destructive starts
  // go through the Sheet; a fresh or finished board swaps directly.
  const requestNew = useCallback(
    (patch?: { mode?: Mode; you?: Color }) => {
      if (!game || !d) return
      const live = d.plies > 0 && !d.over
      if (!live) {
        newMatch(patch)
        return
      }
      let title = 'Start a new game?'
      let action = 'New game'
      if (patch?.mode && patch.mode !== game.mode) {
        title = patch.mode === 'local' ? 'Switch to two players?' : 'Switch to solo?'
        action = 'Switch'
      } else if (patch?.you && patch.you !== game.you) {
        title = `Play as ${patch.you === 'b' ? 'Black' : 'White'}?`
        action = 'Start over'
      }
      askConfirm({
        title,
        body: 'The match in progress will be lost.',
        action,
        run: () => newMatch(patch)
      })
    },
    [game, d, askConfirm, newMatch]
  )

  const place = useCallback(
    (at: number) => {
      if (!game || !d || d.over || thinking || !view.active) return
      if (game.mode === 'solo' && d.toMove !== game.you) {
        play('reject')
        return
      }
      if (!d.legal.has(at)) {
        play('reject')
        navigator.vibrate?.(18)
        return
      }
      const expected = game
      void enqueueGame((base) => {
        const r = tryPlace(base, expected, at)
        return r.ok ? r.game : null
      }).then((ok) => {
        if (!ok) {
          // The wire moved past the board this tap was aimed at: reject it,
          // never overwrite the foreign moves that landed meanwhile.
          play('reject')
          if (activeRef.current) navigator.vibrate?.(18)
          return
        }
        play('flip')
        setFocusCell(at)
        setHover(null)
      })
    },
    [game, d, thinking, view.active, play, enqueueGame]
  )

  const undo = useCallback(() => {
    if (!game || !d || !canUndo(game, d, thinking)) return
    const expected = game
    void enqueueGame((base) => {
      const r = tryUndo(base, expected)
      return r.ok ? r.game : null
    }).then((ok) => {
      if (!ok) return
      play('undo')
      setHover(null)
    })
  }, [game, d, thinking, play, enqueueGame])

  const setLevel = useCallback(
    (level: Level) => {
      if (!game || level === game.level) return
      const expected = game
      void enqueueGame((base) => (base.id === expected.id ? { ...base, level } : null))
    },
    [game, enqueueGame]
  )

  const toggleMute = useCallback(() => {
    if (!view.active) return
    const next = !prefs.muted
    void enqueuePrefs({ muted: next })
    setMuted(next)
    if (!next) cue('place')
  }, [prefs.muted, enqueuePrefs, view.active])

  // Roving keyboard focus over the board grid; Enter/Space fire natively.
  const onBoardKey = (event: React.KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
    const cur = focusRef.current
    let next = cur
    if (event.key === 'ArrowLeft' && cur % 8 !== 0) next = cur - 1
    else if (event.key === 'ArrowRight' && cur % 8 !== 7) next = cur + 1
    else if (event.key === 'ArrowUp' && cur >= 8) next = cur - 8
    else if (event.key === 'ArrowDown' && cur < 56) next = cur + 8
    else if (event.key === 'u') {
      undo()
      return
    } else if (event.key === 'n') {
      requestNew()
      return
    } else if (event.key === 'h') {
      void enqueuePrefs({ hints: !prefs.hints })
      return
    } else if (event.key === 'm') {
      toggleMute()
      return
    } else return
    event.preventDefault()
    setFocusCell(next)
    boardRef.current?.querySelector<HTMLElement>(`[data-cell="${next}"]`)?.focus()
  }

  if (!game || !d) {
    // The shell still renders while the store hydrates: useWide's observer
    // needs the element on the first commit.
    return <main ref={rootRef} {...stylex.props(dark, styles.root)} />
  }

  const solo = game.mode === 'solo'
  const botTurn = solo && !d.over && d.toMove !== game.you
  const humanTurn = !d.over && view.active && (!solo || d.toMove === game.you)
  const tail = d.log.at(-1)

  // Roving tab stop: until a cell has focus the first legal move carries the
  // tab stop, so Tab always reaches the board - fresh, reset, undo, fold.
  const roving = focusCell >= 0 ? focusCell : humanTurn ? (d.legal.keys().next().value ?? 0) : 0

  const statusText = d.over
    ? d.over.winner === 'draw'
      ? `Draw - ${d.scores.b} to ${d.scores.w}`
      : solo
        ? `${d.over.winner === game.you ? 'You win' : 'Bot wins'} ${Math.max(d.scores.b, d.scores.w)} to ${Math.min(d.scores.b, d.scores.w)}`
        : `${d.over.winner === 'b' ? 'Black' : 'White'} wins ${Math.max(d.scores.b, d.scores.w)} to ${Math.min(d.scores.b, d.scores.w)}`
    : thinking || botTurn
      ? 'Bot is thinking'
      : tail?.kind === 'pass'
        ? `${sideLabel(game, tail.side)} ${sideLabel(game, tail.side) === 'You' ? 'have' : 'has'} no moves - ${sideLabel(game, d.toMove!)} to play`
        : solo
          ? 'Your move'
          : `${sideLabel(game, d.toMove!)} to move`

  const undoable = canUndo(game, d, thinking)
  const hoveredFlips = hover !== null ? (d.legal.get(hover) ?? null) : null

  const chip = (side: Color) => (
    <span {...stylex.props(styles.chip, d.toMove === side && !d.over && styles.chipTurn)}>
      <i {...stylex.props(styles.discGlyph, side === 'b' ? styles.discB : styles.discW)} aria-hidden="true" />
      {side === 'b' ? d.scores.b : d.scores.w}
    </span>
  )

  const controls = (
    <div {...stylex.props(styles.controls)}>
      <div role="radiogroup" aria-label="Mode" {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.segTrack)}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={game.mode === m.id}
              onClick={() => requestNew({ mode: m.id })}
              {...stylex.props(styles.segBtn, game.mode === m.id && styles.segOn, shared.press, styles.pressCalm)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {solo ? (
          <div role="radiogroup" aria-label="Difficulty" {...stylex.props(styles.segTrack)}>
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={game.level === level}
                onClick={() => setLevel(level)}
                {...stylex.props(styles.segBtn, game.level === level && styles.segOn, shared.press, styles.pressCalm)}
              >
                {level}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {solo ? (
        <div role="radiogroup" aria-label="You play" {...stylex.props(styles.row)}>
          <div {...stylex.props(styles.segTrack)}>
            {SIDES.map((side) => (
              <button
                key={side.id}
                type="button"
                role="radio"
                aria-checked={game.you === side.id}
                onClick={() => requestNew({ you: side.id })}
                {...stylex.props(styles.segBtn, game.you === side.id && styles.segOn, shared.press, styles.pressCalm)}
              >
                {side.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div {...stylex.props(styles.row)}>
        <button
          type="button"
          onClick={() => requestNew()}
          {...stylex.props(styles.btn, styles.btnPrimary, shared.press, styles.pressCalm)}
        >
          <Sym name="reload" size={13} />
          New game
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!undoable}
          {...stylex.props(styles.btn, styles.btnGhost, shared.press, styles.pressCalm)}
        >
          <Sym name="undo" size={13} />
          Undo
        </button>
        <button
          type="button"
          aria-pressed={prefs.hints}
          onClick={() => void enqueuePrefs({ hints: !prefs.hints })}
          {...stylex.props(styles.btn, styles.btnGhost, shared.press, styles.pressCalm)}
        >
          <Sym name={prefs.hints ? 'eye' : 'eyeSlash'} size={13} />
          Hints
        </button>
      </div>
    </div>
  )

  const logList = (
    <div role="log" aria-label="Move history" aria-live="off" {...stylex.props(styles.log)}>
      {d.log.length === 0 ? (
        <div {...stylex.props(styles.logRow)}>No moves yet</div>
      ) : (
        [...d.log].reverse().map((entry, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the log only appends
          <div key={d.log.length - 1 - i} {...stylex.props(styles.logRow, i === 0 && styles.logNew)}>
            {entry.kind === 'pass' ? (
              <span>{sideLabel(game, entry.side)} passes - no moves</span>
            ) : (
              <>
                <i
                  {...stylex.props(styles.discGlyph, entry.side === 'b' ? styles.discB : styles.discW)}
                  aria-hidden="true"
                />
                <span>
                  {sideLabel(game, entry.side)} {entry.name}
                </span>
                <span>flips {entry.flips}</span>
              </>
            )}
          </div>
        ))
      )}
    </div>
  )

  const tallyCard = (
    <div {...stylex.props(styles.card)}>
      <span {...stylex.props(styles.cardKicker)}>Match tally</span>
      <div {...stylex.props(styles.tally)}>
        <span {...stylex.props(styles.tallyItem)}>
          <i {...stylex.props(styles.discGlyph, styles.discB)} aria-hidden="true" /> {record.black}
        </span>
        <span {...stylex.props(styles.tallyItem)}>
          <i {...stylex.props(styles.discGlyph, styles.discW)} aria-hidden="true" /> {record.white}
        </span>
        <span {...stylex.props(styles.tallyItem)}>Draws {record.draws}</span>
      </div>
    </div>
  )

  const result = d.over ? (
    <div role="status" {...stylex.props(styles.result, !wide && styles.resultCover)}>
      <span {...stylex.props(styles.cardKicker)}>Game over</span>
      <strong {...stylex.props(styles.resultTitle)}>
        {d.over.winner === 'draw'
          ? 'A perfect split'
          : solo
            ? d.over.winner === game.you
              ? 'You win'
              : 'Bot wins'
            : `${d.over.winner === 'b' ? 'Black' : 'White'} wins`}
      </strong>
      <span {...stylex.props(styles.sheetBody)}>
        {d.scores.b} black - {d.scores.w} white
      </span>
      <button
        type="button"
        onClick={() => requestNew()}
        {...stylex.props(styles.btn, styles.btnPrimary, shared.press, styles.pressCalm)}
      >
        <Sym name="reload" size={13} />
        Play again
      </button>
    </div>
  ) : null

  const boardEl = (
    <div {...stylex.props(styles.board, styles.fitBoard(fit.board))}>
      <div ref={boardRef} role="grid" aria-label="Reversi board" onKeyDown={onBoardKey} {...stylex.props(styles.grid)}>
        {d.board.map((piece, i) => {
          const legalHere = humanTurn && prefs.hints && d.legal.has(i)
          const isLast = d.last?.at === i
          const flipDelay = flipDelays.get(i)
          const willFlip = !!piece && !!hoveredFlips && hoveredFlips.includes(i)
          const label = piece
            ? `${cellName(i)}, ${piece === 'b' ? 'black' : 'white'} disc`
            : d.legal.has(i) && humanTurn
              ? `${cellName(i)}, legal move, flips ${d.legal.get(i)!.length}`
              : `${cellName(i)}, empty`
          return (
            <button
              key={cellName(i)}
              type="button"
              data-cell={i}
              role="gridcell"
              tabIndex={roving === i ? 0 : -1}
              aria-label={label}
              aria-disabled={!humanTurn || !d.legal.has(i)}
              onClick={() => place(i)}
              onFocus={() => setFocusCell(i)}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              {...stylex.props(
                styles.cell,
                (i + Math.floor(i / 8)) % 2 === 0 && styles.cellAlt,
                isLast && styles.cellLast,
                shared.press,
                styles.pressCalm
              )}
            >
              {piece ? (
                <i
                  aria-hidden="true"
                  {...stylex.props(
                    styles.disc,
                    piece === 'b' ? styles.discB : styles.discW,
                    flipDelay !== undefined && (piece === 'b' ? styles.discFlipB : styles.discFlipW),
                    flipDelay !== undefined && styles.delay(flipDelay),
                    isLast && styles.discIn,
                    willFlip && styles.discWillFlip
                  )}
                />
              ) : null}
              {!piece && hover === i && humanTurn && d.legal.has(i) ? (
                <i
                  aria-hidden="true"
                  {...stylex.props(styles.discGhost, d.toMove === 'b' ? styles.discB : styles.discW)}
                />
              ) : null}
              {legalHere ? <i aria-hidden="true" {...stylex.props(styles.hint, solo && styles.hintYou)} /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )

  const statusEl = (
    <p aria-live="polite" {...stylex.props(styles.status)}>
      {thinking || botTurn ? (
        <>
          Bot is thinking
          <span aria-hidden="true" {...stylex.props(styles.thinkDots)}>
            <i {...stylex.props(styles.thinkDot)} />
            <i {...stylex.props(styles.thinkDot, styles.delay(140))} />
            <i {...stylex.props(styles.thinkDot, styles.delay(280))} />
          </span>
        </>
      ) : (
        statusText
      )}
    </p>
  )

  // The Sheet stays mounted for its close animation after confirm clears, so
  // the last question keeps rendering (inert, so its buttons cannot act) until
  // it unmounts rather than the card emptying mid-fade. The ref is written
  // during render - an effect would leave the previous question visible.
  if (confirm) shownRef.current = confirm
  const shown = shownRef.current

  const confirmSheet = (
    <Sheet
      open={confirm !== null}
      onClose={closeConfirm}
      aria-label={shown?.title ?? 'Confirm'}
      aria-modal="true"
      onKeyDown={trapTab}
    >
      {shown ? (
        <div inert={confirm === null} {...stylex.props(styles.sheetCard)}>
          <span {...stylex.props(styles.sheetTitle)}>{shown.title}</span>
          <span {...stylex.props(styles.sheetBody)}>{shown.body}</span>
          <div {...stylex.props(styles.sheetRow)}>
            <button
              type="button"
              onClick={closeConfirm}
              {...stylex.props(styles.btn, styles.btnGhost, shared.press, styles.pressCalm)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                shown.run()
                closeConfirm()
              }}
              {...stylex.props(styles.btn, styles.btnPrimary, shared.press, styles.pressCalm)}
            >
              {shown.action}
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root)}>
      {/* inert lifts the play surface out of focus and hit-testing while the
          confirmation Sheet is open; the Sheet stays outside this subtree. */}
      <div inert={confirm !== null} {...stylex.props(styles.stage)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.brand)}>
            <span {...stylex.props(styles.kicker)}>Duo Arcade</span>
            <h1 {...stylex.props(styles.title)}>Reversi</h1>
          </div>
          <div {...stylex.props(styles.chips)}>
            {chip('b')}
            {chip('w')}
            <button
              type="button"
              aria-label={prefs.muted ? 'Unmute sounds' : 'Mute sounds'}
              aria-pressed={prefs.muted}
              onClick={toggleMute}
              {...stylex.props(styles.iconBtn, shared.press, styles.pressCalm)}
            >
              <Sym name="volume" size={15} />
              {prefs.muted ? <i aria-hidden="true" {...stylex.props(styles.muteSlash)} /> : null}
            </button>
          </div>
        </header>
        {wide ? (
          <section {...stylex.props(styles.stage, styles.stageWide)}>
            <div {...stylex.props(styles.boardCol)}>
              {statusEl}
              {boardEl}
            </div>
            <div {...stylex.props(styles.rail)}>
              {tallyCard}
              <div {...stylex.props(styles.card)}>
                <span {...stylex.props(styles.cardKicker)}>Game</span>
                {controls}
              </div>
              <div {...stylex.props(styles.card, styles.movesCard)}>
                <span {...stylex.props(styles.cardKicker)}>Moves</span>
                {logList}
              </div>
            </div>
          </section>
        ) : (
          <section {...stylex.props(styles.stage)}>
            {statusEl}
            {boardEl}
            {/* The board keeps the full cover width; everything else lives in
                a scroll region below it so nothing is lost on the small pane. */}
            <div {...stylex.props(styles.coverScroll)}>
              {controls}
              <div {...stylex.props(styles.card)}>
                <div {...stylex.props(styles.tally)}>
                  <span {...stylex.props(styles.tallyItem)}>
                    <i {...stylex.props(styles.discGlyph, styles.discB)} aria-hidden="true" /> {record.black}
                  </span>
                  <span {...stylex.props(styles.tallyItem)}>
                    <i {...stylex.props(styles.discGlyph, styles.discW)} aria-hidden="true" /> {record.white}
                  </span>
                  <span {...stylex.props(styles.tallyItem)}>Draws {record.draws}</span>
                </div>
                <button
                  type="button"
                  aria-expanded={showLog}
                  onClick={() => setShowLog((v) => !v)}
                  {...stylex.props(styles.movesToggle, shared.press, styles.pressCalm)}
                >
                  <span>Moves</span>
                  <span {...stylex.props(styles.cardKicker)}>
                    {d.log.length} {showLog ? 'hide' : 'show'}
                  </span>
                </button>
                {showLog ? logList : null}
              </div>
            </div>
          </section>
        )}
        {result}
      </div>
      {confirmSheet}
    </main>
  )
}

// The kit Sheet owns focus, the scrim and a captured Escape, so the board and
// the shell's go-home shortcut stay inert behind the question; the app marks
// its content inert and loops Tab inside the card while it is open.
const trapTab = (event: React.KeyboardEvent<HTMLDialogElement>) => {
  if (event.key !== 'Tab') return
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button, [href], [tabindex]')].filter(
    (el) => el.tabIndex >= 0
  )
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (
    event.shiftKey
      ? active === event.currentTarget || active === first
      : active === event.currentTarget || active === last
  ) {
    event.preventDefault()
    ;(event.shiftKey ? last : first)?.focus()
  }
}

// Registered before os.connect() so it fires ahead of the SDK's Escape-to-home
// forward: while a confirmation Sheet is open, Escape cancels it inside the
// app; at all other times the event passes through and still goes home.
let sheetCancel: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !sheetCancel) return
    event.preventDefault()
    event.stopImmediatePropagation()
    sheetCancel()
  },
  true
)

// A real gesture unlocks the AudioContext before any cue needs it.
addEventListener('pointerdown', () => unlockAudio(), { capture: true })
addEventListener('keydown', () => unlockAudio(), { capture: true })

await os.connect()
createRoot(document.body).render(<Game />)
