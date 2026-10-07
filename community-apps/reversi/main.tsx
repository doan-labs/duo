import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { admitted } from './admission.ts'
import { type Cue, cue, setMuted, unlockAudio } from './audio.ts'
import { chooseMoveAsync, LEVELS, type Level, THINK_MS } from './bot.ts'
import { type Color, cellName } from './engine.ts'
import {
  canUndo,
  countFinished,
  type Derived,
  derive,
  emptyTally,
  fitLayout,
  type Mode,
  type Prefs,
  parsePrefs,
  parseTally,
  type SavedGame,
  type Tally,
  tryPlace,
  tryReply,
  tryUndo
} from './game.ts'
import * as hydration from './hydration.ts'
import {
  type Guard,
  type NewPatch,
  offerPlan,
  openingSeed,
  recoverReads,
  replaceStep,
  settledRead,
  settleGame,
  storeGate
} from './hydration.ts'
import { styles } from './styles.ts'

// One storage key holds the whole match as a last-writer-wins document. Every
// mutation re-reads the settled document before writing and validates the
// input against it, so a display whose local copy lags the wire rejects stale
// placements instead of clobbering the other display's moves.
const ME = crypto.randomUUID()
const GAME_KEY = 'reversi-game'
const RECORD_KEY = 'reversi-record'
const PREFS_KEY = 'reversi-prefs'

// The platform's freshest visibility truth: os.view is replaced synchronously
// when the view event lands, while the React prop only moves when this frame
// renders - and a hidden frame may not render at all. Input is admitted once,
// synchronously, at its own handler through this check: nothing a hidden copy
// receives can schedule work, focus, sound or a timer, so a queued-while-hidden
// intent can never sneak in through a later activation. Bot steps and cues
// re-check it too, since work admitted while live can outlast the view that
// admitted it. Real keyboard input only ever reaches the visible, active view,
// but forced input on an occluded copy fails the same gate.
const liveActive = () => admitted(os.view)

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

/**
 * The recovery card for an unreadable game document: the only UI allowed to
 * overwrite corrupt bytes, and only on an explicit click. Busy reports the
 * serial queue honestly - while a job is in flight the buttons refuse a
 * second intent nobody could honor.
 */
function CorruptCard({
  busy,
  onStartFresh,
  onRetry
}: {
  busy: boolean
  onStartFresh: () => void
  onRetry: () => void
}) {
  return (
    <>
      <span {...stylex.props(styles.sheetTitle)}>The saved match could not be read</span>
      <span {...stylex.props(styles.sheetBody)}>
        The store answered with something this game cannot understand. Nothing is discarded unless you choose to start
        fresh.
      </span>
      <div {...stylex.props(styles.row)}>
        <button
          type="button"
          onClick={onStartFresh}
          disabled={busy}
          {...stylex.props(styles.btn, shared.press, styles.pressCalm)}
        >
          Start fresh
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          {...stylex.props(styles.btn, styles.btnPrimary, shared.press, styles.pressCalm)}
        >
          <Sym name="reload" size={13} />
          Retry
        </button>
      </div>
    </>
  )
}

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
  // Hydration authority: until a read answers - the mirror's hydrate or a
  // direct get - the store's contents are unknown, not empty. Only a real
  // answer may flip this, so an exhausted hydrate can never mint an opening
  // board, a zero tally, or default prefs as authority.
  const [recovered, setRecovered] = useState(false)
  // The store answered but the game document is unreadable: honest failure,
  // not an empty store. The ref mirrors the state so queued callbacks see
  // it before the next render commits.
  const [corrupt, setCorrupt] = useState(false)
  const corruptRef = useRef(false)
  const markCorrupt = useCallback((value: boolean) => {
    corruptRef.current = value
    setCorrupt(value)
  }, [])

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
  const mutedRef = useRef(prefs.muted)
  const [showLog, setShowLog] = useState(false)
  // Writes in flight on the serial queue: the board reports aria-busy and
  // dims while one settles, so a tap during the storage round-trip answers
  // with an explicit reject instead of dropping invisibly.
  const [pending, setPending] = useState(0)
  const pendingRef = useRef(0)

  gameRef.current = game
  focusRef.current = focusCell
  mutedRef.current = prefs.muted

  const d = useMemo<Derived | null>(() => (game ? derive(game.moves) : null), [game])
  const fit = useMemo(() => fitLayout(view, wide), [view, wide])

  // Undo/reset shrink the move list: suppress placement/flip animations so a
  // restoration never reads as a fresh move (this also covers foreign undos).
  const prevLen = useRef(0)
  const restored = (game?.moves.length ?? 0) < prevLen.current
  useEffect(() => {
    prevLen.current = game?.moves.length ?? 0
  }, [game?.moves.length])

  // Discs flipped by the last move cascade outward per direction run.
  const flipDelays = useMemo(() => {
    const map = new Map<number, number>()
    if (d?.last) for (const run of d.last.runs) run.forEach((cell, i) => map.set(cell, i * 60 + 40))
    return map
  }, [d])

  const play = useCallback((kind: Cue) => {
    if (!mutedRef.current && liveActive()) cue(kind)
  }, [])

  /** The raw wire value, or null when the store holds no game yet. */
  const readGameWire = useCallback((): Promise<string | null> => os.storage.get(GAME_KEY), [])

  // Settle a just-read wire document into local state: adopt what the store
  // carries - an equal-length alternate branch is still unseen work the board
  // must show before re-offering - or seed the canonical opening when the
  // answer was confirmed empty, even over a stale rendered match. Unknown or
  // corrupt reads never reach here. Queued callers validate against gameRef
  // before the state commit lands, so adoption publishes synchronously too.
  const settleStored = useCallback((stored: SavedGame | null) => {
    const local = gameRef.current
    const decision = hydration.adoptDecision(stored, local)
    if (decision === 'adopt' && stored) {
      setGame(stored)
      gameRef.current = stored
      setHover(null)
      return
    }
    if (decision === 'seed' && (local || !seeded.current)) {
      seeded.current = true
      const seed = openingSeed(ME)
      setGame(seed)
      gameRef.current = seed
      setHover(null)
    }
  }, [])

  // Adopt whatever the store currently carries before deciding anything. The
  // mirror (useKV) can lag a fold wake-up; this read does not. A successful
  // read is also the recovery path: it confirms the store after a failed
  // hydrate, seeds only when the empty answer is real, and re-opens the gate.
  // A corrupt document is neither authority nor empty - it is surfaced, not
  // adopted and not seeded over.
  const syncGame = useCallback(async (): Promise<SavedGame | null> => {
    const w = settleGame(await readGameWire(), ME)
    setRecovered(true)
    if (w.kind === 'corrupt') {
      markCorrupt(true)
      return null
    }
    markCorrupt(false)
    settleStored(w.kind === 'ok' ? w.game : null)
    return w.kind === 'ok' ? w.game : gameRef.current
  }, [readGameWire, settleStored, markCorrupt])

  /**
   * Every game write goes through here: sync to the wire, run the step on the
   * freshest document, write once, then verify nothing foreign landed during
   * our own write - if it did, the settled winner is adopted instead of
   * argued with.
   */
  // One tail on the serial queue: every job (write or read-through sync)
  // marks the board busy until it settles.
  const enqueue = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    pendingRef.current += 1
    setPending(pendingRef.current)
    const job = queueRef.current.then(work).finally(() => {
      pendingRef.current -= 1
      setPending(pendingRef.current)
    })
    // The chain must survive a failed job: later work queues on a settled
    // promise, while callers still get the real outcome on `job`.
    queueRef.current = job.then(
      () => {},
      () => {}
    )
    return job
  }, [])

  const enqueueGame = useCallback(
    (step: (base: SavedGame) => SavedGame | null): Promise<boolean> =>
      enqueue(async () => {
        const base = await syncGame()
        // Admission already happened at the handler. The only gate left is
        // validation against this fresh read: a rejected step never writes,
        // while an accepted one lands even if the copy folded during the
        // round-trip - admitted work finishes rather than silently dropping.
        if (!base) return false
        const next = step(base)
        if (!next) return false
        const settled = { ...next, by: ME }
        const wire = JSON.stringify(settled)
        await os.storage.set(GAME_KEY, wire)
        lastSeen.current = wire
        setGame(settled)
        gameRef.current = settled
        const after = await os.storage.get(GAME_KEY)
        if (after !== null && after !== wire) {
          // A foreign write raced ours: adopt the settled winner, or flag a
          // document the reader cannot understand instead of inventing one.
          const foreign = settleGame(after, ME)
          if (foreign.kind === 'corrupt') markCorrupt(true)
          else if (foreign.kind === 'ok') {
            const winner = foreign.game
            if (winner.id !== settled.id || !hydration.sameMoves(winner.moves, settled.moves)) {
              setGame(winner)
              gameRef.current = winner
            }
          }
        }
        return true
      }),
    [enqueue, syncGame, markCorrupt]
  )

  /** Read-through on the same queue: orders an activation sync before input. */
  const enqueueSync = useCallback((): Promise<SavedGame | null> => enqueue(syncGame), [enqueue, syncGame])

  const enqueueRecord = useCallback(
    (step: (base: Tally) => Tally): Promise<Tally> =>
      enqueue(async () => {
        const base = parseTally(await os.storage.get(RECORD_KEY))
        // The celebration (cue/haptic and the tally write) belongs to the
        // copy that is actually on screen; a hidden copy posts nothing.
        if (!liveActive()) return base
        const next = step(base)
        const wire = JSON.stringify(next)
        await os.storage.set(RECORD_KEY, wire)
        lastRecord.current = wire
        setRecord(next)
        return next
      }),
    [enqueue]
  )

  const enqueuePrefs = useCallback(
    (patch: Partial<Prefs>): Promise<Prefs | undefined> =>
      enqueue(async () => {
        const base = parsePrefs(await os.storage.get(PREFS_KEY))
        // Callers admit at the handler; the merge is unconditional so a pref
        // flipped the instant before a fold still lands on the wire.
        const next = { ...base, ...patch }
        const wire = JSON.stringify(next)
        await os.storage.set(PREFS_KEY, wire)
        lastPrefs.current = wire
        setPrefs(next)
        return next
      }).catch(() => undefined),
    [enqueue]
  )

  useEffect(() => {
    setMuted(prefs.muted)
  }, [prefs.muted])

  // Adopt whichever settled game the wire carries; ignore this copy's own
  // echo. `liveRaw` is the baseline the mirror last delivered while this copy
  // was settled: the first adoption after a fold wake-up syncs silently, and
  // only changes that land while we are actually live play their cue.
  useEffect(() => {
    // Anything but a real answer - 'hydrating' or 'error' - leaves the store
    // unknown: the board stays empty (load/error UI below) rather than
    // seeding an invented opening a later write could push over real progress.
    if (!settledRead(saved.status)) return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    const w = settleGame(raw, ME)
    if (w.kind === 'corrupt') {
      // An unreadable wire document is surfaced, never silently adopted as an
      // invented fallback.
      markCorrupt(true)
      return
    }
    markCorrupt(false)
    if (w.kind === 'empty') {
      // Only a confirmed-empty store seeds a shared opening; the first real
      // move publishes. settleStored applies the full decision: a stale
      // rendered match reseeds the canonical opening too.
      settleStored(null)
      return
    }
    const next = w.game
    const prev = gameRef.current
    if (next.by === ME) return
    setGame(next)
    gameRef.current = next
    setHover(null)
    if (liveRaw.current !== undefined) {
      // Sound what just changed on the peer display: a fresh match, a takeback,
      // or the disc that just landed. play() re-checks live visibility, so a
      // copy this render left behind still stays silent.
      if (next.id !== prev?.id || next.moves.length === 0) play('new')
      else if (next.moves.length < prev.moves.length) play('undo')
      else if (next.moves.length > prev.moves.length) play('flip')
    }
    liveRaw.current = raw
  }, [saved.value, saved.status, play, markCorrupt, settleStored])

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
    // An activation re-read doubles as store recovery after a failed hydrate:
    // a failed attempt settles this job and the error card stays for Retry.
    void enqueueSync().catch(() => {})
  }, [view.active, enqueueSync])

  useEffect(() => {
    if (!settledRead(stored.status)) return
    const raw = stored.value
    if (raw !== null && raw === lastRecord.current) return
    lastRecord.current = raw
    setRecord(parseTally(raw))
  }, [stored.value, stored.status])

  useEffect(() => {
    if (!settledRead(prefsKv.status)) return
    const raw = prefsKv.value
    if (raw !== null && raw === lastPrefs.current) return
    lastPrefs.current = raw
    setPrefs(parsePrefs(raw))
  }, [prefsKv.value, prefsKv.status])

  // The bot lives only on the active display. Its search is time-sliced so the
  // thread stays live, it is cancelled by any state change, and the reply is
  // applied through the serial writer so a stale snapshot can never write.
  useEffect(() => {
    // Scheduling and cleanup follow both view fields: the props re-run this
    // effect so a flip of either cancels the pending timer, and liveActive()
    // closes the gap where a stale prop still says live but os.view already
    // folded. The callback and the search probe re-check the live snapshot so
    // a stale prop cannot keep hidden bot work running, and the handoff to
    // the other display stays safe because the reply validates against the
    // settled wire document.
    if (!view.active || !view.visible || !liveActive() || corrupt) return
    if (!game || !d || d.over || game.mode !== 'solo' || d.toMove === game.you) return
    setThinking(true)
    let cancelled = false
    const timer = setTimeout(() => {
      const snapshot = gameRef.current
      if (!snapshot || snapshot.id !== game.id || snapshot.moves.length !== game.moves.length) {
        setThinking(false)
        return
      }
      // Live re-check before the search even starts: a fold during THINK_MS
      // leaves this copy hidden, and hidden copies never run bot work.
      if (!liveActive()) {
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
          // liveActive() inside the cancel probe aborts the search within one
          // work slice of a fold, even while this frame stops rendering.
          const pick = await chooseMoveAsync(dd.board, toMove, snapshot.level, () => cancelled || !liveActive())
          if (cancelled || !pick || !liveActive()) return
          const ok = await enqueueGame((base) => {
            const r = tryReply(base, snapshot, pick.at)
            return r.ok ? r.game : null
          }).catch(() => false)
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
  }, [game, d, corrupt, view.active, view.visible, play, enqueueGame])

  // One celebration per match, counted once in shared storage: the cue and
  // haptic fire only on the copy that actually posts the tally increment, so
  // a folded-in peer stays silent and replays never double-count.
  useEffect(() => {
    // Props and the live snapshot both gate: on re-activation this effect
    // re-runs even when game and tally were already settled while hidden, so
    // the celebration the folded copy could not post still lands here once.
    if (!view.active || !view.visible || !liveActive() || corrupt) return
    if (!game || !d?.over || celebrated.current === game.id) return
    if (!settledRead(stored.status)) return
    celebrated.current = game.id
    const winner = d.over.winner
    void enqueueRecord((tally) => {
      if (tally.lastGame === game.id) return tally
      if (liveActive()) navigator.vibrate?.(winner === 'draw' ? [40] : [40, 60, 40])
      play(winner === 'draw' ? 'draw' : game.mode === 'solo' && winner !== game.you ? 'lose' : 'win')
      return countFinished(tally, game.id, winner)
    }).catch(() => {
      // The tally write never landed: un-mark so a later activation retries.
      celebrated.current = null
    })
  }, [d, game, corrupt, view.active, view.visible, stored.status, play, enqueueRecord])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const askConfirm = useCallback((entry: Confirm) => {
    if (!liveActive()) return
    returnFocus.current = document.activeElement
    setConfirm(entry)
  }, [])

  // The Sheet closes on cancel (scrim, Escape, Cancel) and after the confirmed
  // action; either way the control that opened it takes focus back - but only
  // while this copy stays the visible one. A hidden copy's deferred restore
  // would steal focus from the display the user is actually looking at.
  const closeConfirm = useCallback(() => {
    if (!liveActive()) return
    setConfirm(null)
    const el = returnFocus.current
    returnFocus.current = null
    if (el instanceof HTMLElement) {
      let tries = 0
      const restore = () => {
        if (!liveActive() || !el.isConnected) return
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

  // Destructive swaps are functions rather than callbacks so newMatch and
  // requestNew can re-enter cleanly: every entry point (button tap, confirmed
  // Sheet run, re-ask after a refusal) captures a guard - the match id and
  // ply count the user actually saw - and the queued step writes only while
  // the freshest wire document still matches it.
  function newMatch(patch: NewPatch | undefined, guard: Guard) {
    if (!gameRef.current || !liveActive()) return
    void enqueueGame((base) => replaceStep(base, guard, patch, ME))
      .then((ok) => {
        if (ok) {
          play('new')
          setHover(null)
          setFocusCell(-1)
          return
        }
        // An unreadable wire cannot be argued with: the card offers Retry and
        // Start fresh instead of an endless re-ask.
        if (!corruptRef.current) reoffer(patch)
      })
      .catch(() => {
        // A failed write is not a refusal: the board simply keeps the match
        // the wire still holds - no re-ask, no silent swap.
      })
  }

  // A refusal means the wire moved past what was confirmed - newer unseen
  // progress or a different match entirely. Neither may be overwritten on a
  // stale answer, so the path asks again against the match now on screen;
  // the retry is always the user's own click, never an automatic clobber.
  function reoffer(patch: NewPatch | undefined) {
    const g = gameRef.current
    if (!g || !liveActive()) return
    askConfirm({
      title: 'The board changed while you decided',
      body: 'Starting over now replaces the latest match - confirm again to continue.',
      action: 'Replace',
      run: () => newMatch(patch, { id: g.id, moves: [...g.moves] })
    })
  }

  const confirmFor = (patch: NewPatch | undefined, g: SavedGame, guard: Guard): Confirm => {
    let title = 'Start a new game?'
    let action = 'New game'
    if (patch?.mode && patch.mode !== g.mode) {
      title = patch.mode === 'local' ? 'Switch to two players?' : 'Switch to solo?'
      action = 'Switch'
    } else if (patch?.you && patch.you !== g.you) {
      title = `Play as ${patch.you === 'b' ? 'Black' : 'White'}?`
      action = 'Start over'
    }
    return { title, body: 'The match in progress will be lost.', action, run: () => newMatch(patch, guard) }
  }

  // A match with entered progress is never wiped silently: destructive starts
  // go through the Sheet; a fresh or finished board swaps directly. Reads
  // gameRef so a re-offered intent always sees the newest adopted match, not
  // the render the gesture started from.
  function requestNew(patch?: NewPatch) {
    const g = gameRef.current
    if (!g || !liveActive()) return
    const guard: Guard = { id: g.id, moves: [...g.moves] }
    if (offerPlan(g) === 'confirm') askConfirm(confirmFor(patch, g, guard))
    else newMatch(patch, guard)
  }

  const place = useCallback(
    (at: number) => {
      if (!game || !d || d.over || thinking || !view.active) return
      if (!liveActive()) return
      if (pendingRef.current > 0) {
        // A write is still in flight: the board reads busy (aria-busy, dimmed
        // cells), so this tap answers honestly instead of queueing into a
        // stale-state rejection nobody can see.
        play('reject')
        navigator.vibrate?.(18)
        return
      }
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
      })
        .then((ok) => {
          if (!ok) {
            // The wire moved past the board this tap was aimed at: reject it,
            // never overwrite the foreign moves that landed meanwhile.
            play('reject')
            if (liveActive()) navigator.vibrate?.(18)
            return
          }
          play('flip')
          setFocusCell(at)
          setHover(null)
        })
        .catch(() => {
          // The write itself never landed: same honest reject as a stale tap.
          play('reject')
          if (liveActive()) navigator.vibrate?.(18)
        })
    },
    [game, d, thinking, view.active, play, enqueueGame]
  )

  const undo = useCallback(() => {
    if (!game || !d || !liveActive() || !canUndo(game, d, thinking) || pendingRef.current > 0) return
    const expected = game
    void enqueueGame((base) => {
      const r = tryUndo(base, expected)
      return r.ok ? r.game : null
    })
      .then((ok) => {
        if (!ok) return
        play('undo')
        setHover(null)
      })
      .catch(() => play('reject'))
  }, [game, d, thinking, play, enqueueGame])

  const setLevel = useCallback(
    (level: Level) => {
      if (!game || !liveActive() || level === game.level) return
      const expected = game
      void enqueueGame((base) => (base.id === expected.id ? { ...base, level } : null)).catch(() => {})
    },
    [game, enqueueGame]
  )

  const toggleMute = useCallback(() => {
    if (!liveActive()) return
    const next = !prefs.muted
    void enqueuePrefs({ muted: next })
    setMuted(next)
    if (!next) cue('place')
  }, [prefs.muted, enqueuePrefs])

  const toggleHints = useCallback(() => {
    if (!liveActive()) return
    void enqueuePrefs({ hints: !prefs.hints })
  }, [prefs.hints, enqueuePrefs])

  // Roving keyboard focus over the board grid; Enter/Space fire natively.
  const onBoardKey = (event: React.KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || !liveActive()) return
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
      toggleHints()
      return
    } else if (event.key === 'm') {
      toggleMute()
      return
    } else return
    event.preventDefault()
    setFocusCell(next)
    boardRef.current?.querySelector<HTMLElement>(`[data-cell="${next}"]`)?.focus()
  }

  const gameGate = storeGate(saved.status, recovered)

  // Recovery re-reads every key once, on the serial queue: each answer
  // confirms its own key, the game read re-opens the gate, and a confirmed
  // empty answer seeds the shared opening through the same authority path as
  // a first read - the canonical OPENING_ID seed, so two recovering copies
  // agree instead of forking random fallbacks. An unreadable document is
  // surfaced, not adopted. A failed batch adopts nothing and the error card
  // stays for the next attempt. Runs only while live.
  const recoverAll = useCallback(async () => {
    const reads = await recoverReads((k) => os.storage.get(k), {
      record: RECORD_KEY,
      prefs: PREFS_KEY,
      game: GAME_KEY
    })
    lastRecord.current = reads.record
    setRecord(parseTally(reads.record))
    lastPrefs.current = reads.prefs
    setPrefs(parsePrefs(reads.prefs))
    setRecovered(true)
    const w = settleGame(reads.game, ME)
    if (w.kind === 'corrupt') {
      markCorrupt(true)
      return
    }
    markCorrupt(false)
    settleStored(w.kind === 'ok' ? w.game : null)
  }, [settleStored, markCorrupt])

  const recover = useCallback(() => {
    if (!liveActive()) return
    void enqueue(recoverAll).catch(() => {})
  }, [enqueue, recoverAll])

  // The user's own wipe: the only path allowed to overwrite a document the
  // reader could not understand, and only on an explicit click. The reset is
  // authorized for the unreadable state the card was shown against, not
  // blindly - the queued job re-reads the wire first, seeds only when it is
  // still unreadable-or-empty, and recovers a healthy match a peer stored
  // after the card instead of destroying it. The shared opening identity
  // keeps both displays on one match afterwards.
  const startFresh = useCallback(() => {
    if (!liveActive()) return
    void enqueue(async () => {
      const w = hydration.settleGame(await os.storage.get(GAME_KEY), ME)
      if (w.kind === 'ok') {
        // A readable match reached the store after the card: adopt it and
        // clear the card - never clobber unseen progress on a stale reset.
        markCorrupt(false)
        setGame(w.game)
        gameRef.current = w.game
        return
      }
      const seed = { ...openingSeed(ME), by: ME }
      const wire = JSON.stringify(seed)
      await os.storage.set(GAME_KEY, wire)
      lastSeen.current = wire
      setRecovered(true)
      markCorrupt(false)
      setGame(seed)
      gameRef.current = seed
    }).catch(() => {})
  }, [enqueue, markCorrupt])

  if (!game || !d) {
    // The shell still renders while the store hydrates: useWide's observer
    // needs the element on the first commit. A failed hydrate is 'unknown',
    // never 'empty': the card says so honestly and offers a real re-read.
    // While the store is busy on the serial queue the buttons read busy
    // instead of accepting a second intent nobody could honor.
    return (
      <main ref={rootRef} {...stylex.props(dark, styles.root)} aria-busy={pending > 0}>
        <section {...stylex.props(styles.loadWrap)}>
          <div {...stylex.props(styles.card, styles.loadCard)}>
            {corrupt ? (
              <CorruptCard busy={pending > 0} onStartFresh={startFresh} onRetry={recover} />
            ) : gameGate === 'error' ? (
              <>
                <span {...stylex.props(styles.sheetTitle)}>Could not load your saved game</span>
                <span {...stylex.props(styles.sheetBody)}>
                  Your match and tally are kept safe - the store did not answer. Check the connection and try again.
                </span>
                <button
                  type="button"
                  onClick={recover}
                  disabled={pending > 0}
                  {...stylex.props(styles.btn, styles.btnPrimary, shared.press, styles.pressCalm)}
                >
                  <Sym name="reload" size={13} />
                  Retry
                </button>
              </>
            ) : (
              <>
                <span {...stylex.props(styles.sheetTitle)}>Loading saved game</span>
                <span aria-hidden="true" {...stylex.props(styles.thinkDots)}>
                  <i {...stylex.props(styles.thinkDot)} />
                  <i {...stylex.props(styles.thinkDot, styles.delay(140))} />
                  <i {...stylex.props(styles.thinkDot, styles.delay(280))} />
                </span>
              </>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (corrupt) {
    // Runtime corruption found after a match was already rendered takes the
    // whole surface too: the stale board must not keep posing as durable
    // authority. The match stays in state untouched and returns when a
    // healthy read recovers it.
    return (
      <main ref={rootRef} {...stylex.props(dark, styles.root)} aria-busy={pending > 0}>
        <section {...stylex.props(styles.loadWrap)}>
          <div {...stylex.props(styles.card, styles.loadCard)}>
            <CorruptCard busy={pending > 0} onStartFresh={startFresh} onRetry={recover} />
          </div>
        </section>
      </main>
    )
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
      : pending > 0
        ? 'Saving…'
        : tail?.kind === 'pass'
          ? `${sideLabel(game, tail.side)} ${sideLabel(game, tail.side) === 'You' ? 'have' : 'has'} no moves - ${sideLabel(game, d.toMove!)} to play`
          : solo
            ? 'Your move'
            : `${sideLabel(game, d.toMove!)} to move`

  const undoable = canUndo(game, d, thinking) && pending === 0
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
      <div {...stylex.props(styles.row, wide && styles.rowStack)}>
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
          onClick={toggleHints}
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

  // Finished-match card lives in flow: the rail on the inner display, the
  // cover scroll region on the cover - it never occludes the board.
  const result = d.over ? (
    <div role="status" {...stylex.props(styles.result)}>
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
      <div
        ref={boardRef}
        role="grid"
        aria-label="Reversi board"
        aria-busy={pending > 0}
        onKeyDown={onBoardKey}
        {...stylex.props(styles.grid, pending > 0 && styles.gridBusy)}
      >
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
              aria-disabled={!humanTurn || pending > 0 || !d.legal.has(i)}
              onClick={() => place(i)}
              onFocus={() => {
                if (liveActive()) setFocusCell(i)
              }}
              onPointerEnter={() => {
                if (liveActive()) setHover(i)
              }}
              onPointerLeave={() => {
                if (liveActive()) setHover((h) => (h === i ? null : h))
              }}
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
                    !restored && flipDelay !== undefined && (piece === 'b' ? styles.discFlipB : styles.discFlipW),
                    !restored && flipDelay !== undefined && styles.delay(flipDelay),
                    !restored && isLast && styles.discIn,
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
              {result}
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
              {result}
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
                  onClick={() => {
                    if (liveActive()) setShowLog((v) => !v)
                  }}
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
      </div>
      {confirmSheet}
    </main>
  )
}

// The kit Sheet owns focus, the scrim and a captured Escape, so the board and
// the shell's go-home shortcut stay inert behind the question; the app marks
// its content inert and loops Tab inside the card while it is open.
const trapTab = (event: React.KeyboardEvent<HTMLDialogElement>) => {
  if (event.key !== 'Tab' || !liveActive()) return
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
    // Live-gated: a hidden copy neither cancels its sheet nor swallows the
    // Escape the SDK still owes the go-home shortcut.
    if (event.key !== 'Escape' || !sheetCancel || !liveActive()) return
    event.preventDefault()
    event.stopImmediatePropagation()
    sheetCancel()
  },
  true
)

// A real gesture on the live display unlocks the AudioContext before any cue
// needs it; unlockAudio re-checks admission inside audio.ts for every caller.
const unlockOnGesture = () => {
  if (liveActive()) unlockAudio()
}
addEventListener('pointerdown', unlockOnGesture, { capture: true })
addEventListener('keydown', unlockOnGesture, { capture: true })

await os.connect()
createRoot(document.body).render(<Game />)
