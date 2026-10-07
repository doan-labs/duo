import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue } from './audio.ts'
import { Board, cardName, type Sel, type Spot } from './board.tsx'
import {
  adoptGame,
  apply,
  autoMoves,
  buildGame,
  canApply,
  type Deal,
  type Game,
  hint,
  isBlocked,
  MODES,
  type Mode,
  type Move,
  mergeStats,
  newGame,
  normalizeStats,
  recordPlay,
  recordWin,
  type Stats,
  serializeGame
} from './game.ts'
import { styles } from './styles.ts'

// Why a writer id: both displays share one storage key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled game - adopting it unconditionally is what converges the two
// displays, including the race where both seed a fresh deal at once.
const ME = crypto.randomUUID()

/** The running match: the deal's seed plus every legal move, and its replay. */
type Table = Deal & { game: Game }

const freshTable = (mode: Mode): Table => {
  const seed = Math.floor(Math.random() * 0xffffffff)
  return { mode, seed, log: [], game: newGame(seed, mode) }
}

const parseJson = (raw: string | null): unknown => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const readStats = (raw: string | null): Stats => normalizeStats(parseJson(raw))
const readMuted = (raw: string | null): boolean => {
  const v = parseJson(raw)
  return !!(v && typeof v === 'object' && (v as { muted?: unknown }).muted === true)
}

/** Map a card tap to its selection: only face-up tops and tableau runs lift. */
const selForTap = (game: Game, spot: Spot, index: number): Sel | null => {
  if (spot === 'w') return game.waste.length ? { t: 'w' } : null
  if (spot.startsWith('f')) {
    const f = Number(spot.slice(1))
    return game.foundations[f]!.length ? { t: 'f', f } : null
  }
  if (spot.startsWith('t')) {
    const c = Number(spot.slice(1))
    const card = game.tableau[c]![index]
    return card?.up ? { t: 't', c, i: index } : null
  }
  return null
}

/** The card or run a selection lifted, for the status line. */
const selName = (game: Game, s: Sel): string => {
  if (s.t === 'w') return cardName(game.waste.at(-1)!)
  if (s.t === 'f') return cardName(game.foundations[s.f]!.at(-1)!)
  return cardName(game.tableau[s.c]![s.i]!)
}

const selNote = (game: Game, s: Sel): string => {
  if (s.t === 't') {
    const n = game.tableau[s.c]!.length - s.i
    if (n > 1) return `${n} cards from ${selName(game, s)} lifted - tap a lit spot.`
  }
  return `${selName(game, s)} lifted - tap a lit spot.`
}

/** Every legal landing for the lifted selection, as spot keys the board lights. */
const hotSpots = (game: Game, sel: Sel | null): Set<string> => {
  const hot = new Set<string>()
  if (!sel) return hot
  if (sel.t === 'w') {
    if (game.waste.length) {
      for (let f = 0; f < 4; f++) if (canApply(game, { t: 'wf', f })) hot.add(`f${f}`)
      for (let c = 0; c < 7; c++) if (canApply(game, { t: 'wt', c })) hot.add(`t${c}`)
    }
  } else if (sel.t === 'f') {
    for (let c = 0; c < 7; c++) if (canApply(game, { t: 'ft', f: sel.f, c })) hot.add(`t${c}`)
  } else {
    const run = game.tableau[sel.c]!.slice(sel.i)
    if (run.length === 1) for (let f = 0; f < 4; f++) if (canApply(game, { t: 'tf', c: sel.c, f })) hot.add(`f${f}`)
    for (let d = 0; d < 7; d++)
      if (d !== sel.c && canApply(game, { t: 'tt', c: sel.c, d, n: run.length })) hot.add(`t${d}`)
  }
  return hot
}

/** The move a lifted selection would make on a tapped destination, or null. */
const dropMove = (game: Game, sel: Sel, target: Spot): { move: Move; note: string } | null => {
  const tries: Move[] = []
  if (sel.t === 'w') {
    if (target.startsWith('f')) tries.push({ t: 'wf', f: Number(target.slice(1)) })
    if (target.startsWith('t')) tries.push({ t: 'wt', c: Number(target.slice(1)) })
  } else if (sel.t === 'f') {
    if (target.startsWith('t')) tries.push({ t: 'ft', f: sel.f, c: Number(target.slice(1)) })
  } else {
    const n = game.tableau[sel.c]!.length - sel.i
    if (target.startsWith('f')) tries.push({ t: 'tf', c: sel.c, f: Number(target.slice(1)) })
    if (target.startsWith('t')) {
      const d = Number(target.slice(1))
      if (d !== sel.c) tries.push({ t: 'tt', c: sel.c, d, n })
    }
  }
  for (const m of tries) {
    if (canApply(game, m)) {
      const where = target.startsWith('f')
        ? `foundation ${Number(target.slice(1)) + 1}`
        : `column ${Number(target.slice(1)) + 1}`
      return { move: m, note: `${selName(game, sel)} to ${where}.` }
    }
  }
  return null
}

/** The candidate homes a double-tap tries, foundation first then tableau. */
const smartMoves = (game: Game, s: Sel): Move[] => {
  const tries: Move[] = []
  if (s.t === 'w') {
    for (let f = 0; f < 4; f++) tries.push({ t: 'wf', f })
    for (let c = 0; c < 7; c++) tries.push({ t: 'wt', c })
  } else if (s.t === 'f') {
    for (let c = 0; c < 7; c++) tries.push({ t: 'ft', f: s.f, c })
  } else {
    const n = game.tableau[s.c]!.length - s.i
    if (n === 1) for (let f = 0; f < 4; f++) tries.push({ t: 'tf', c: s.c, f })
    for (let d = 0; d < 7; d++) if (d !== s.c) tries.push({ t: 'tt', c: s.c, d, n })
  }
  return tries
}

// APG radiogroup keyboard contract shared by the pickers: one tab stop on the
// checked option, and arrows (Home/End too) move the check and focus together,
// wrapping at the ends.
function useRadioNav(count: number, current: number, pick: (index: number) => void) {
  const refs = useRef<Array<HTMLElement | null>>([])
  const onKeyDown = (event: React.KeyboardEvent) => {
    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % count
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current + count - 1) % count
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = count - 1
    else return
    event.preventDefault()
    pick(next)
    refs.current[next]?.focus()
  }
  const refAt = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el
  }
  return { onKeyDown, refAt }
}

// The kit Segmented is a light-surface control; this is the same radiogroup
// contract drawn for the dark felt (as the other arcade apps do).
function Seg({
  aria,
  options,
  value,
  onChange
}: {
  aria: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}) {
  const nav = useRadioNav(options.length, options.indexOf(value), (index) => onChange(options[index]!))
  return (
    <div role="radiogroup" aria-label={aria} onKeyDown={nav.onKeyDown} {...stylex.props(styles.segTrack)}>
      {options.map((o, i) => (
        <button
          key={o}
          ref={nav.refAt(i)}
          type="button"
          role="radio"
          aria-checked={o === value}
          tabIndex={o === value ? 0 : -1}
          onClick={() => onChange(o)}
          {...stylex.props(styles.segBtn, o === value && styles.segOn, styles.press)}
        >
          <span {...stylex.props(styles.segLabel)}>{o}</span>
        </button>
      ))}
    </div>
  )
}

function Solitaire() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const initial = useRef<Table | null>(null)
  if (!initial.current) initial.current = freshTable('draw1')
  const [table, setTable] = useState<Table>(initial.current)
  const [sel, setSel] = useState<Sel | null>(null)
  const [shake, setShake] = useState<string | null>(null)
  const [status, setStatus] = useState('Tap a card, then tap where it goes.')
  // A queued new deal: the one in front of the player is about to be thrown
  // away, so it asks first. Null means play normally.
  const [pending, setPending] = useState<{ mode: Mode; label: string } | null>(null)
  const returnFocus = useRef<Element | null>(null)
  // The Sheet stays mounted for its close animation after pending clears, so
  // the last question keeps rendering (inert) until it unmounts.
  const lastPending = useRef<{ mode: Mode; label: string } | null>(null)
  if (pending) lastPending.current = pending
  const shown = pending ?? lastPending.current
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  // The deal wave only replays for the copy that dealt it; a remote new deal
  // arrives already settled.
  const [dealing, setDealing] = useState(false)
  const autoTimer = useRef<number | null>(null)
  // A sweep the hidden copy dropped: the shared deal record carries an `auto`
  // flag, so whichever copy next owns the screen can finish it from truth.
  const resumeAuto = useRef(false)
  // The pre-win best at the moment this session won this seed: only then is
  // 'new best' honest - equal moves do not reannounce, and neither does a
  // relaunched won game (this ref is empty there).
  const winMark = useRef<{ seed: number; prevBest: number | null } | null>(null)
  const activeRef = useRef(view.active)
  activeRef.current = view.active

  // Durable stores: the match (deal plus every move) and the sound flag
  // survive a relaunch; stats sit apart so a corrupt board never costs them.
  const saved = useKV(os.storage, 'game')
  const statsRaw = useKV(os.storage, 'stats')
  const prefs = useKV(os.storage, 'prefs')
  const stats = readStats(statsRaw.value)
  const muted = readMuted(prefs.value)
  // Interval ticks and tap handlers need the live value, not the closure's
  // copy - a fold can hand the record to the other display and back faster
  // than one render cycle.
  const tableRef = useRef(table)
  tableRef.current = table
  const statsRef = useRef(stats)
  statsRef.current = stats
  const savedValRef = useRef(saved.value)
  savedValRef.current = saved.value
  // Set when the store proved the mirror behind (a foreign record adopted via
  // read-before-write). While set, mirror values are not trusted as writes:
  // only a value matching the adopted record (mirror caught up) or a new
  // foreign delivery through the channel clears it.
  const mirrorBehind = useRef(false)
  // Whether the rail's contents overflow its scrollport: only then does the
  // bottom fade appear - a fitted rail gets no fake affordance.
  const railScrollRef = useRef<HTMLDivElement>(null)
  const railBodyRef = useRef<HTMLDivElement>(null)
  const [railScrolls, setRailScrolls] = useState(false)
  useLayoutEffect(() => {
    // The rail only exists once `wide` settles true; on the inner display the
    // first commit is still the narrow layout, so this must re-run when it
    // lands or the observer never arms and the fade can never appear.
    const el = railScrollRef.current
    const body = railBodyRef.current
    if (!wide || !el || !body) {
      setRailScrolls(false)
      return
    }
    const check = () => setRailScrolls(el.scrollHeight - el.clientHeight > 4)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    ro.observe(body)
    return () => ro.disconnect()
  }, [wide])

  const stopAuto = useCallback(() => {
    if (autoTimer.current !== null) {
      window.clearInterval(autoTimer.current)
      autoTimer.current = null
    }
  }, [])

  // doAuto is declared below the sites that need to fire a resume; a ref
  // hands them the current copy without reordering the component.
  const doAutoRef = useRef<(quiet?: boolean) => void>(() => {})
  const tryResume = useCallback(() => {
    if (activeRef.current && resumeAuto.current && autoTimer.current === null) {
      resumeAuto.current = false
      doAutoRef.current(true)
    }
  }, [])

  const play = useCallback(
    (kind: Cue) => {
      // Only the copy the player is looking at makes sound.
      if (muted || !activeRef.current) return
      cue(kind)
    },
    [muted]
  )

  const publish = useCallback(
    (next: Table) => {
      setTable(next)
      tableRef.current = next
      // auto:true tells the other display a sweep is in flight here, so a fold
      // mid-Auto hands it off instead of silently dropping the timer.
      const raw = JSON.stringify(serializeGame(ME, next, autoTimer.current !== null))
      // The store, not the mirror, is the authority: a foreign write this copy
      // has not been notified of yet still wins. Read before writing so a
      // superseded deal is adopted rather than silently overwritten.
      void os.storage
        .get('game')
        .then((cur) => {
          if (cur && cur !== lastSeen.current) {
            const foreign = adoptGame(cur)
            if (foreign && foreign.by !== ME) {
              mirrorBehind.current = true
              lastSeen.current = cur
              const t = { ...foreign.deal, game: foreign.game }
              setTable(t)
              tableRef.current = t
              setSel(null)
              setPending(null)
              stopAuto()
              resumeAuto.current = foreign.auto === true
              tryResume()
              // The mirror still serves the superseded record and will
              // re-deliver it as a fresh foreign write - after a relaunch it
              // even parses foreign (a new ME) - which would bounce the table
              // straight back. Settle the adopted record so it converges.
              void saved.set(cur)
              setStatus('Game restored - the other screen moved first.')
              return
            }
          }
          // Queued behind an adoption this write is stale intent: the live
          // table has already moved on, so only the publish that still owns
          // it commits.
          if (tableRef.current !== next) return
          lastSeen.current = raw
          void saved.set(raw)
        })
        .catch(() => {
          if (tableRef.current !== next) return
          lastSeen.current = raw
          void saved.set(raw)
        })
    },
    [saved, stopAuto, tryResume]
  )

  // The shared record must never regress to an older base. When the other
  // display wrote a deal this copy has not adopted yet - the gap between a
  // fold, the KV echo and the next render is where taps land - adopt it
  // synchronously before any move, undo or Auto tick computes its write.
  const freshBase = useCallback((): { table: Table; foreign: boolean } => {
    const raw = savedValRef.current
    if (raw === lastSeen.current) mirrorBehind.current = false
    if (!mirrorBehind.current && raw && raw !== lastSeen.current) {
      const next = adoptGame(raw)
      if (next && next.by !== ME) {
        lastSeen.current = raw
        const t = { ...next.deal, game: next.game }
        setTable(t)
        tableRef.current = t
        setSel(null)
        setPending(null)
        // A newer record supersedes a local sweep: drop the timer here and
        // let the record's auto flag resume whoever owns the screen.
        stopAuto()
        resumeAuto.current = next.auto === true
        tryResume()
        return { table: t, foreign: true }
      }
    }
    return { table: tableRef.current, foreign: false }
  }, [stopAuto, tryResume])

  // Why adopt on the storage key: the fold carries the running match to the
  // other display. A write this copy did not make is the newer settled deal;
  // the raw string is the guard so the effect never re-fires on its own echo.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) {
      mirrorBehind.current = false
      return
    }
    // While the mirror is behind the store, a value that does not parse to a
    // foreign record - the stale deal it keeps serving, or our own optimistic
    // echo - is not a write and must not re-stamp lastSeen. Only a genuinely
    // different foreign record is a live delivery worth adopting.
    if (mirrorBehind.current) {
      const maybe = raw ? adoptGame(raw) : null
      if (!maybe || maybe.by === ME) return
    }
    mirrorBehind.current = false
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current) {
        seeded.current = true
        publish(initial.current!)
      }
      return
    }
    const next = adoptGame(raw)
    if (!next || next.by === ME) return
    const t = { ...next.deal, game: next.game }
    setTable(t)
    tableRef.current = t
    setSel(null)
    setPending(null)
    stopAuto()
    // The other copy was mid-sweep when this one took the display: pick it up.
    // A record without the flag also clears any stale resume request.
    resumeAuto.current = next.auto === true
    tryResume()
    // A foreign record arriving through the channel means the mirror is live
    // again; the per-tap mirror check is trustworthy once more.
    mirrorBehind.current = false
    setStatus('Game restored.')
  }, [saved.value, saved.status, saved, publish, stopAuto, tryResume])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const commitStats = useCallback(
    (next: Stats) => {
      // Both copies write this key; merge with the freshest shared value so a
      // commit on a stale base unions deals instead of erasing the other
      // display's increments. Read the store, not the mirror, for the base.
      const write = (base: Stats) => {
        const merged = mergeStats(base, next)
        void statsRaw.set(JSON.stringify({ v: 1, by: ME, ...merged }))
      }
      void os.storage
        .get('stats')
        .then((cur) => write(readStats(cur)))
        .catch(() => write(readStats(statsRaw.value)))
    },
    [statsRaw]
  )

  const clearShake = useRef<number | null>(null)
  const reject = useCallback(
    (key: string, note: string) => {
      if (clearShake.current !== null) window.clearTimeout(clearShake.current)
      setShake(key)
      clearShake.current = window.setTimeout(() => setShake(null), 340)
      setStatus(note)
      play('reject')
    },
    [play]
  )

  /** Apply a legal move: the log grows by one entry and the match republishes. */
  const doMove = useCallback(
    (m: Move, note?: string) => {
      const base = freshBase()
      const { game: prev, mode, seed, log } = base.table
      // A foreign base means the table under the tap was already superseded:
      // the shape may be legal there but names different cards, so the tap
      // is rejected and the restored deal is what the user now sees.
      if (base.foreign) {
        reject('board', 'Game restored - the other screen moved first.')
        return false
      }
      if (!canApply(prev, m)) {
        reject('board', 'That move is not legal here.')
        return false
      }
      const { game: next, revealed } = apply(prev, m)
      const log2 = [...log, m]
      publish({ mode, seed, log: log2, game: next })
      // A deal counts once, on the first move that actually lands on it.
      const played = recordPlay(stats, mode, seed)
      if (next.status === 'won') {
        winMark.current = { seed, prevBest: stats[mode].best }
        const after = recordWin(played, mode, seed, log2.length)
        if (after !== stats) commitStats(after)
        setStatus(`You cleared the table in ${log2.length} moves.`)
        play('win')
        setSel(null)
        return true
      }
      if (played !== stats) commitStats(played)
      const sounds: Cue[] = []
      if (m.t === 'draw') sounds.push('draw')
      else if (m.t === 'redeal') sounds.push('redeal')
      else if (m.t === 'wf' || m.t === 'tf') sounds.push('foundation')
      else sounds.push('place')
      if (revealed) sounds.push('reveal')
      for (const s of sounds) play(s)
      if (note) setStatus(note)
      setSel(null)
      return true
    },
    [publish, play, reject, commitStats, stats, freshBase]
  )

  /** The undo step: the log loses its last move and the deal replays cleanly. */
  const undo = useCallback(() => {
    const base = freshBase()
    if (base.foreign) {
      // Undo takes back a move on the shared deal - but the shared deal just
      // changed hands, so the last move is no longer this copy's to take.
      reject('board', 'Game restored - the other screen moved first.')
      return
    }
    const { mode, seed, log } = base.table
    if (!log.length) return
    const log2 = log.slice(0, -1)
    const game = buildGame(mode, seed, log2)
    if (!game) return
    publish({ mode, seed, log: log2, game })
    setSel(null)
    stopAuto()
    setStatus('Undid the last move.')
    play('undo')
  }, [publish, play, stopAuto, freshBase, reject])

  const restart = useCallback(
    (mode: Mode = tableRef.current.mode) => {
      const next = freshTable(mode)
      setPending(null)
      setSel(null)
      stopAuto()
      resumeAuto.current = false // a fresh deal supersedes any sweep handoff
      setDealing(true)
      window.setTimeout(() => setDealing(false), 1400)
      // No stat yet: an untouched replacement deal was never played.
      publish(next)
      setStatus(`New ${MODES.find((m) => m.id === mode)!.label.toLowerCase()} game dealt.`)
      play('deal')
    },
    [publish, play, stopAuto]
  )

  const ended = table.game.status === 'won'
  const hasProgress = table.log.length > 0
  const requestNew = useCallback(
    (mode: Mode = table.mode) => {
      if (ended || !hasProgress) {
        restart(mode)
        return
      }
      returnFocus.current = document.activeElement
      setPending({ mode, label: MODES.find((m) => m.id === mode)!.label })
    },
    [ended, hasProgress, table.mode, restart]
  )

  const requestMode = useCallback(
    (mode: Mode) => {
      if (mode === table.mode) return
      requestNew(mode)
    },
    [table.mode, requestNew]
  )

  const game = table.game
  const moves = table.log.length
  const hot = hotSpots(game, ended ? null : sel)

  /** A stock tap draws, or flips the waste back once the stock ran out. */
  const tapStock = useCallback(() => {
    if (ended) return
    const n = game.stock.length ? Math.min(game.mode === 'draw3' ? 3 : 1, game.stock.length) : game.waste.length
    if (game.stock.length) {
      doMove({ t: 'draw' }, `Drew ${n} card${n === 1 ? '' : 's'}.`)
    } else if (game.waste.length) {
      doMove({ t: 'redeal' }, 'Waste flipped back to the stock.')
    } else {
      setStatus('Nothing left to draw.')
    }
  }, [game, ended, doMove])

  const onCard = useCallback(
    (_id: number, spot: Spot, index: number) => {
      if (ended) return
      stopAuto()
      if (spot === 's') {
        tapStock()
        return
      }
      // With a selection up, the tap names a destination.
      if (sel) {
        const sameSel = selForTap(game, spot, index)
        const same =
          sameSel &&
          ((sameSel.t === 'w' && sel.t === 'w') ||
            (sameSel.t === 'f' && sel.t === 'f' && sameSel.f === sel.f) ||
            (sameSel.t === 't' && sel.t === 't' && sameSel.c === sel.c && sameSel.i === sel.i))
        if (same) {
          setSel(null)
          setStatus('Card set back down.')
          return
        }
        const landing = dropMove(game, sel, spot)
        if (landing) {
          doMove(landing.move, landing.note)
          return
        }
        const key = spot.startsWith('t') ? `${spot}.${index}` : spot
        reject(key, 'Cannot place it there - try a lit spot.')
        return
      }
      const s = selForTap(game, spot, index)
      if (s) {
        setSel(s)
        setStatus(selNote(game, s))
        play('pickup')
      }
    },
    [sel, game, ended, tapStock, stopAuto, play, reject, doMove]
  )

  const onSpot = useCallback(
    (spot: Spot) => {
      if (ended) return
      stopAuto()
      if (spot === 's') {
        tapStock()
        return
      }
      if (!sel) {
        setStatus(
          spot === 'w'
            ? 'The waste is empty.'
            : spot.startsWith('f')
              ? 'Foundations build up from aces.'
              : 'Lift a card first.'
        )
        return
      }
      const landing = dropMove(game, sel, spot)
      if (landing) {
        doMove(landing.move, landing.note)
        return
      }
      reject(spot, 'Cannot place it there - try a lit spot.')
    },
    [sel, game, ended, tapStock, stopAuto, doMove, reject]
  )

  /** Double-tap sends a card to its best home: foundation first, then tableau. */
  const onCardDouble = useCallback(
    (_id: number, spot: Spot, index: number) => {
      if (ended) return
      const s = selForTap(game, spot, index)
      if (!s) return
      for (const m of smartMoves(game, s)) {
        if (canApply(game, m)) {
          const where =
            m.t === 'wf' || m.t === 'tf'
              ? `foundation ${m.f + 1}`
              : m.t === 'tt'
                ? `column ${m.d + 1}`
                : m.t === 'wt' || m.t === 'ft'
                  ? `column ${m.c + 1}`
                  : 'the table'
          doMove(m, `${selName(game, s)} to ${where}.`)
          return
        }
      }
      const key = spot.startsWith('t') ? `${spot}.${index}` : spot
      reject(key, 'No home for that card yet.')
    },
    [game, ended, doMove, reject]
  )

  /** An honest hint: the best move's cards lift and its landing lights. */
  const doHint = useCallback(() => {
    if (ended) return
    const h = hint(game)
    if (!h) {
      setStatus('No moves left - undo, or start a new game.')
      play('reject')
      return
    }
    const s: Sel | null =
      h.move.t === 'wf' || h.move.t === 'wt'
        ? { t: 'w' }
        : h.move.t === 'ft'
          ? { t: 'f', f: h.move.f }
          : h.move.t === 'tf'
            ? { t: 't', c: h.move.c, i: game.tableau[h.move.c]!.length - 1 }
            : h.move.t === 'tt'
              ? { t: 't', c: h.move.c, i: game.tableau[h.move.c]!.length - h.move.n }
              : null
    if (s) setSel(s)
    setStatus(h.text.endsWith('.') ? h.text : `${h.text}.`)
    play('pickup')
  }, [game, ended, play])

  /** Auto-finish: the engine sweeps waste and tops to foundations, one hop a beat. */
  const doAuto = useCallback(
    (quiet = false) => {
      // Derive the sweep from the live deal, not this render's snapshot: a resume
      // can fire in the same commit an adoption landed, when `game` still shows
      // the pre-adoption table and would compute zero steps.
      const live = tableRef.current
      if (live.game.status !== 'playing' || autoTimer.current !== null || !activeRef.current) return
      const steps = autoMoves(live.game)
      if (!steps.length) {
        // A resumed handoff that finds nothing left just ends quietly; only a
        // manual press reports the empty sweep.
        if (!quiet) setStatus('Nothing can move home by itself yet.')
        return
      }
      setStatus('Sending eligible cards home...')
      let i = 0
      autoTimer.current = window.setInterval(() => {
        if (!activeRef.current) return
        const m = steps[i]
        if (!m) {
          stopAuto()
          return
        }
        i++
        // The live table state, not the captured snapshot: each tick re-reads
        // it, and a foreign write mid-sweep wins - this copy adopts, drops the
        // timer, and lets the record's auto flag resume whoever holds the screen.
        const base = freshBase()
        if (base.foreign) {
          stopAuto()
          setStatus('Game restored.')
          return
        }
        const current = base.table
        if (!canApply(current.game, m)) {
          stopAuto()
          return
        }
        const { game: next } = apply(current.game, m)
        const nextTable = { ...current, log: [...current.log, m], game: next }
        // Count the deal on its first landed move; count the win once per seed.
        let nextStats = recordPlay(statsRef.current, next.mode, nextTable.seed)
        if (next.status === 'won') {
          winMark.current = { seed: nextTable.seed, prevBest: statsRef.current[next.mode].best }
          nextStats = recordWin(nextStats, next.mode, nextTable.seed, nextTable.log.length)
        }
        if (next.status === 'won' || i >= steps.length) {
          // Clear the interval before publishing so the record's auto flag is
          // honest: a stored auto:true would wake another copy's sweep forever.
          stopAuto()
        }
        publish(nextTable)
        if (nextStats !== statsRef.current) commitStats(nextStats)
        if (next.status === 'won') {
          setStatus(`You cleared the table in ${nextTable.log.length} moves.`)
          play('win')
        } else {
          play('foundation')
          setStatus(`Auto-finish: ${nextTable.log.length} moves.`)
        }
      }, 110)
    },
    [stopAuto, publish, play, commitStats, freshBase]
  )
  doAutoRef.current = doAuto

  // DESIGN2: a hidden copy runs no timer at all. Going hidden mid-sweep clears
  // the interval and flags a resume; becoming visible again (or adopting a
  // foreign deal whose record still says auto) restarts the sweep from the
  // shared truth - never a no-op loop ticking where nobody can see it.
  useEffect(() => {
    if (!view.active) {
      if (autoTimer.current !== null) {
        resumeAuto.current = true
        stopAuto()
      }
      return
    }
    tryResume()
  }, [view.active, tryResume, stopAuto])

  const toggleMute = useCallback(() => {
    void prefs.set(JSON.stringify({ v: 1, by: ME, muted: !muted }))
    if (muted) play('pickup')
  }, [prefs, muted, play])

  const closeConfirm = useCallback(() => {
    setPending(null)
    const el = returnFocus.current
    returnFocus.current = null
    // The trigger sits inside the inert subtree until the close commits, so
    // retry across frames until inert lifts and it takes focus again. A copy
    // that loses the display between frames must not steal focus back.
    if (el instanceof HTMLElement) {
      let tries = 0
      const restore = () => {
        if (!el.isConnected || !activeRef.current) return
        el.focus()
        if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
      }
      requestAnimationFrame(restore)
    }
  }, [])

  // Hands the pre-connect Escape guard the live cancel callback only while a
  // confirmation is actually open.
  useEffect(() => {
    confirmClose = pending ? closeConfirm : null
  }, [pending, closeConfirm])

  // R/N restarts through the same confirm as the button; U undoes, H hints,
  // Space draws when nothing in the table owns focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return
      if (pending) return
      if (event.key === 'r' || event.key === 'R' || event.key === 'n' || event.key === 'N') requestNew()
      else if (event.key === 'u' || event.key === 'U') undo()
      else if (event.key === 'h' || event.key === 'H') doHint()
      else if (event.key === ' ') {
        const el = document.activeElement
        if (el instanceof HTMLElement && el.closest('button,[role="radio"],dialog')) return
        event.preventDefault()
        tapStock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, requestNew, undo, doHint, tapStock])

  const blocked = !ended && isBlocked(game)
  const best = stats[table.mode].best
  // 'new best' only when this session's win on this seed beat the previous one;
  // a restored or relaunched won game has no winMark, and equal is not a record.
  const newBest =
    ended &&
    winMark.current?.seed === table.seed &&
    (winMark.current.prevBest === null || moves < winMark.current.prevBest)
  const hydrated = saved.status !== 'hydrating'

  const chips = (
    <div {...stylex.props(styles.scores)}>
      <div {...stylex.props(styles.chip)}>
        <span {...stylex.props(styles.chipLabel)}>MOVES</span>
        <strong key={moves} {...stylex.props(styles.chipValue, shared.swap)}>
          {moves}
        </strong>
      </div>
      <div {...stylex.props(styles.chip)}>
        <span {...stylex.props(styles.chipLabel)}>BEST</span>
        <strong key={best ?? 'none'} {...stylex.props(styles.chipValue, shared.swap)}>
          {best === null ? '-' : best}
        </strong>
      </div>
    </div>
  )

  const pickNav = useRadioNav(
    MODES.length,
    MODES.findIndex((m) => m.id === table.mode),
    (index) => requestMode(MODES[index]!.id)
  )

  const controls = (
    <>
      {wide ? (
        <div role="radiogroup" aria-label="Draw mode" onKeyDown={pickNav.onKeyDown} {...stylex.props(styles.pickPanel)}>
          {MODES.map((m, i) => (
            <button
              key={m.id}
              ref={pickNav.refAt(i)}
              type="button"
              role="radio"
              aria-checked={m.id === table.mode}
              tabIndex={m.id === table.mode ? 0 : -1}
              onClick={() => requestMode(m.id)}
              {...stylex.props(styles.pickRow, i > 0 && styles.pickRowSep, styles.press)}
            >
              <span {...stylex.props(styles.pickLabel)}>{m.label}</span>
              <span {...stylex.props(styles.pickMeta)}>{m.id === 'draw1' ? 'relaxed' : 'classic'}</span>
              <span {...stylex.props(styles.pickCheck)}>
                {m.id === table.mode ? <Sym name="tick" size={11} /> : null}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Seg
          aria="Draw mode"
          options={MODES.map((m) => m.label)}
          value={MODES.find((m) => m.id === table.mode)!.label}
          onChange={(label) => requestMode(MODES.find((m) => m.label === label)!.id)}
        />
      )}
      <div {...stylex.props(styles.toolbar, wide && styles.toolbarWide)}>
        <button
          type="button"
          onClick={undo}
          disabled={!table.log.length}
          aria-label="Undo the last move"
          {...stylex.props(
            styles.tool,
            wide && styles.toolWide,
            !table.log.length && styles.toolDisabled,
            styles.press
          )}
        >
          <Sym name="undo" size={wide ? 15 : 13} />
          Undo
        </button>
        <button
          type="button"
          onClick={doHint}
          aria-label="Show a hint"
          {...stylex.props(styles.tool, wide && styles.toolWide, styles.press)}
        >
          <Sym name="star" size={wide ? 15 : 13} />
          Hint
        </button>
        <button
          type="button"
          onClick={() => doAuto()}
          disabled={ended}
          aria-label="Auto-play every card that can go home"
          {...stylex.props(styles.tool, wide && styles.toolWide, ended && styles.toolDisabled, styles.press)}
        >
          <Sym name="bolt" size={wide ? 15 : 13} />
          Auto
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute card sounds' : 'Mute card sounds'}
          {...stylex.props(styles.tool, wide && styles.toolWide, muted && styles.toolOn, styles.press)}
        >
          <span {...stylex.props(styles.muteWrap)}>
            <Sym name="volume" size={wide ? 15 : 13} />
            {muted ? <i {...stylex.props(styles.muteSlash)} /> : null}
          </span>
          {muted ? 'Muted' : 'Sound'}
        </button>
        <button
          type="button"
          onClick={() => requestNew()}
          aria-label="Start a new game"
          {...stylex.props(styles.tool, wide && styles.toolWide, styles.press)}
        >
          <Sym name="reload" size={wide ? 15 : 13} />
          New
        </button>
      </div>
    </>
  )

  const statsCard = (
    <div {...stylex.props(styles.statsCard)}>
      <span {...stylex.props(styles.fieldLabel)}>Personal bests</span>
      {MODES.map((m) => {
        const st = stats[m.id]
        return (
          <div key={m.id} {...stylex.props(styles.statsRow)}>
            <span {...stylex.props(styles.statsName, m.id === table.mode && styles.statsNameOn)}>{m.label}</span>
            <span {...stylex.props(styles.statsValue)}>
              {st.best === null ? '-' : st.best}{' '}
              <span {...stylex.props(styles.statsMeta)}>
                {st.wins} of {st.plays}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )

  const hintText =
    saved.status === 'error' || statsRaw.status === 'error' || prefs.status === 'error'
      ? 'Progress may not be saved'
      : saved.status === 'saving'
        ? 'Saving...'
        : blocked
          ? 'No moves left - undo, or start a new game'
          : status

  const boardEl = hydrated ? (
    <Board
      game={game}
      sel={sel}
      hot={hot}
      shake={shake}
      dealing={dealing}
      won={ended}
      active={view.active}
      onSpot={onSpot}
      onCard={onCard}
      onCardDouble={onCardDouble}
    />
  ) : (
    <div {...stylex.props(styles.board)}>
      <span {...stylex.props(styles.slotMark)}>Resuming the table...</span>
    </div>
  )

  const result = ended ? (
    <div role="status" {...stylex.props(styles.result)}>
      <div {...stylex.props(styles.resultCopy)}>
        <span {...stylex.props(styles.resultKicker, styles.resultLine)}>Table cleared</span>
        <strong {...stylex.props(styles.resultTitle, styles.resultLine, styles.resultDelay(60))}>You won.</strong>
        <span {...stylex.props(styles.resultSub, styles.resultLine, styles.resultDelay(120))}>
          {MODES.find((m) => m.id === table.mode)!.label} in {moves} moves
          {newBest ? ' - new best' : best === null ? '' : ` - best ${best}`}
        </span>
      </div>
      <div {...stylex.props(styles.resultActions)}>
        <button type="button" onClick={() => restart()} {...stylex.props(styles.primary, styles.press)}>
          <Sym name="reload" size={13} />
          New game
        </button>
        {/* The card floats over the narrow toolbar, so undo lives here too. */}
        <button type="button" onClick={undo} {...stylex.props(styles.action, styles.press)}>
          <Sym name="undo" size={13} />
          Take back
        </button>
      </div>
    </div>
  ) : null

  // Replace a deal only through an explicit answer while it still has moves.
  // The kit Sheet owns focus, the scrim and a captured Escape, so the table
  // and the shell's go-home shortcut stay inert behind the question.
  const trapTab = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button, [href], [tabindex]')].filter(
      (el) => el.tabIndex >= 0
    )
    if (!items.length) return
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement
    if (
      event.shiftKey
        ? active === event.currentTarget || active === first
        : active === event.currentTarget || active === last
    ) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
  }
  const confirm = (
    <Sheet
      open={pending !== null}
      onClose={closeConfirm}
      aria-label="Start a new game?"
      aria-modal="true"
      onKeyDown={trapTab}
    >
      {shown ? (
        <div inert={pending === null} {...stylex.props(styles.confirmCard)}>
          <div {...stylex.props(styles.resultCopy)}>
            <span {...stylex.props(styles.resultKicker)}>New game</span>
            <strong {...stylex.props(styles.resultTitle)}>Abandon this deal?</strong>
            <span {...stylex.props(styles.resultSub)}>
              {shown.mode === table.mode
                ? `A fresh ${shown.label.toLowerCase()} deal replaces this one; ${moves} move${moves === 1 ? '' : 's'} will be lost.`
                : `Switch to ${shown.label}? ${moves} move${moves === 1 ? '' : 's'} will be lost.`}
            </span>
          </div>
          <div {...stylex.props(styles.confirmActions)}>
            <button type="button" onClick={closeConfirm} {...stylex.props(styles.action, styles.press)}>
              Keep playing
            </button>
            <button
              type="button"
              onClick={() => {
                restart(shown.mode)
                closeConfirm()
              }}
              {...stylex.props(styles.primary, styles.press)}
            >
              {shown.mode === table.mode ? 'New game' : `Start ${shown.label}`}
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root)}>
      {/* inert lifts the whole play surface out of focus and hit-testing while
          the confirm Sheet is open; the Sheet stays outside this subtree. */}
      <div inert={pending !== null} {...stylex.props(styles.shell)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.brand)}>
            <span {...stylex.props(styles.kicker)}>Duo Arcade</span>
            <h1 {...stylex.props(styles.title)}>Solitaire</h1>
          </div>
          {chips}
        </header>
        {wide ? (
          <section {...stylex.props(styles.stage)}>
            {boardEl}
            <div {...stylex.props(styles.rail)}>
              {/* The scroll region holds controls and stats; when they fit they
                  centre, when they do not they scroll - never over the header
                  or the home bar, and a fade at the scroll edge says there is
                  more below. The status line stays pinned below. */}
              <div {...stylex.props(styles.railWrap)}>
                <div ref={railScrollRef} {...stylex.props(styles.railScroll)}>
                  <div ref={railBodyRef} {...stylex.props(styles.railBody)}>
                    {controls}
                    {statsCard}
                  </div>
                </div>
                {railScrolls ? <div aria-hidden="true" {...stylex.props(styles.railFade)} /> : null}
              </div>
              <p aria-live="polite" {...stylex.props(styles.status, styles.statusWide, blocked && styles.statusWarn)}>
                {hintText}
              </p>
            </div>
          </section>
        ) : (
          <>
            {boardEl}
            {controls}
            <p aria-live="polite" {...stylex.props(styles.status, blocked && styles.statusWarn)}>
              {hintText}
            </p>
          </>
        )}
        {result}
      </div>
      {confirm}
    </main>
  )
}

// Registered before os.connect() so it fires ahead of the SDK's Escape-to-home
// forward: while a confirmation Sheet is open, Escape cancels it inside the
// app; at all other times the event passes through and still goes home.
let confirmClose: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !confirmClose) return
    event.preventDefault()
    event.stopImmediatePropagation()
    confirmClose()
  },
  true
)

await os.connect()
createRoot(document.body).render(<Solitaire />)
