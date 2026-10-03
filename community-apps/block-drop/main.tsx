// Block Drop: a falling-block game as a double-copy app. The whole game lives
// in one session key, last-writer-wins, so the display that is not driving
// still draws the same field - and only the active copy's interval moves it.
// A copy ignores writes it made itself; anything else is the settled state and
// gets adopted outright, which is what carries a mid-flight game across a fold.
import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { type Cue, cue } from './audio.ts'
import { Mini, type Nudge, Playfield } from './board.tsx'
import {
  adoptGame,
  fitLayout,
  type Game,
  gravity,
  hardDrop,
  hold,
  intervalFor,
  NEXT_COUNT,
  newGame,
  parseSave,
  rotate,
  shift,
  softDrop
} from './game.ts'
import { styles } from './styles.ts'

const ME = crypto.randomUUID()
const SESSION_KEY = 'blockdrop-game'
const SAVE_KEY = 'blockdrop-save'

/** The sound a transition makes, or null when it is silent. */
function announce(prev: Game, next: Game): Cue | null {
  if (next.status === 'over' && prev.status !== 'over') return 'over'
  if (next.cleared.length === 4) return 'tetris'
  if (next.cleared.length > 0) return 'clear'
  if (next.level > prev.level) return 'level'
  if (next.drops > prev.drops) return 'lock'
  if (next.hold !== prev.hold || next.holdFree !== prev.holdFree) return 'hold'
  if (next.piece && prev.piece && next.piece.r !== prev.piece.r) return 'rotate'
  return null
}

/** 'ready' wraps the first touch into the first move, so any input starts. */
const started = (g: Game): Game => (g.status === 'ready' ? { ...g, status: 'playing' } : g)

function BlockDrop() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>(560)
  const saved = useKV(os.session, SESSION_KEY)
  const stored = useKV(os.storage, SAVE_KEY)
  const [game, setGame] = useState<Game | null>(null)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const firstAdopt = useRef(true)
  const lastSaved = useRef('')
  const gameRef = useRef<Game | null>(null)
  gameRef.current = game
  const activeRef = useRef(view.active)
  activeRef.current = view.active
  const wasActive = useRef(view.active)
  const cover = view.display === 'cover'
  const fit = fitLayout(view, wide)
  const save = parseSave(stored.value)
  const best = Math.max(save.best, game?.score ?? 0)

  // Writes stamp this copy and tick up, land locally, then cross the store to
  // the other display. The raw string is the guard against re-firing on an
  // unchanged value.
  const publish = useCallback((next: Game) => {
    const stamped = { ...next, by: ME, tick: next.tick + 1 }
    setGame(stamped)
    void os.session.set(SESSION_KEY, JSON.stringify(stamped))
  }, [])

  const commit = useCallback(
    (prev: Game, next: Game) => {
      if (next === prev) return
      const tone = announce(prev, next)
      publish(next)
      if (tone && activeRef.current) cue(tone)
    },
    [publish]
  )

  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    let parsed: unknown = null
    try {
      if (raw) parsed = JSON.parse(raw)
    } catch {}
    if (!parsed) {
      // Seed only after the tally hydrates: a copy publishing before it would
      // let a peer repair its real save away. A restored run resumes paused -
      // never mid-fall on a display the player is not looking at yet.
      if (!seeded.current && stored.status !== 'hydrating') {
        seeded.current = true
        const restored = save.game
        publish(restored ? { ...restored, status: restored.status === 'over' ? 'over' : 'paused' } : newGame(ME))
      }
      return
    }
    const next = adoptGame(parsed, ME)
    if (next.by === ME) return
    const prev = gameRef.current
    setGame(next)
    // The first adopt is silent: those moves already happened wherever the
    // session left them. After that, a landed change cues the active glass -
    // the writer never sees its own publish on this path.
    if (!firstAdopt.current && view.active && prev) {
      const tone = announce(prev, next)
      if (tone) cue(tone)
    }
    firstAdopt.current = false
  }, [saved.value, saved.status, stored.status, publish, view.active, save.game])

  // One timer, on the active display only: gravity is a session write, so the
  // folded-out copy's interval would double the fall if it ever ran.
  const playing = game?.status === 'playing'
  const level = game?.level ?? 1
  useEffect(() => {
    if (!playing || !view.active) return
    const timer = setInterval(() => {
      const g = gameRef.current
      if (g?.status !== 'playing' || !activeRef.current) return
      const next = gravity(g)
      if (next !== g) commit(g, next)
    }, intervalFor(level))
    return () => clearInterval(timer)
  }, [playing, level, view.active, commit])

  // Losing the active glass mid-run pauses instead of dropping pieces into a
  // display nobody can see: fold, park, tab-hide all land here.
  useEffect(() => {
    const wasDriving = wasActive.current
    wasActive.current = view.active
    const g = gameRef.current
    if (wasDriving && !view.active && g && g.status === 'playing' && g.by === ME) {
      publish({ ...g, status: 'paused' })
    }
  }, [view.active, publish])

  // A parked app's box collapses while its JS keeps running; treat collapse as
  // losing the display even if the view flag lags the fold.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let had = false
    const ro = new ResizeObserver(([e]) => {
      const size = e!.contentRect.height
      if (size > 4) had = true
      if (!had || size > 4) return
      const g = gameRef.current
      if (g && g.status === 'playing' && g.by === ME) publish({ ...g, status: 'paused' })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [rootRef, publish])

  useEffect(() => {
    const onVis = () => {
      const g = gameRef.current
      if (document.hidden && g && g.status === 'playing' && g.by === ME) {
        publish({ ...g, status: 'paused' })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [publish])

  // The durable checkpoint: locks, status flips and a new best are worth
  // writing; single gravity steps are not - a crash mid-fall resumes at the
  // last lock, which is already seconds old. The sig skips re-saving a state
  // that is already on disk, which also keeps our own write from echoing back
  // in as another save.
  useEffect(() => {
    const g = game
    if (!g || !view.active || stored.status === 'hydrating') return
    const keep = g.status === 'over' ? { ...g, status: 'paused' as const } : g
    const prev = parseSave(stored.value)
    const sig = JSON.stringify([
      keep.board,
      keep.status,
      keep.score,
      keep.lines,
      keep.level,
      keep.hold,
      keep.holdFree,
      keep.queue
    ])
    if (sig === lastSaved.current) return
    lastSaved.current = sig
    void os.storage.set(SAVE_KEY, JSON.stringify({ best: Math.max(prev.best, g.score), game: keep }))
  }, [game, view.active, stored.status, stored.value])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const nudge = useCallback(
    (n: Nudge | 'ccw' | 'hold' | 'pause' | 'start') => {
      const g = gameRef.current
      if (!g || g.status === 'over') return
      // Pause is a toggle on the real status - it never starts a ready game.
      if (n === 'pause') {
        const next =
          g.status === 'playing'
            ? { ...g, status: 'paused' as const }
            : g.status === 'paused'
              ? { ...g, status: 'playing' as const }
              : g
        if (next !== g) publish(next)
        return
      }
      const s = started(g)
      const next =
        n === 'start'
          ? s
          : n === 'left'
            ? shift(s, -1)
            : n === 'right'
              ? shift(s, 1)
              : n === 'rotate'
                ? rotate(s, 1)
                : n === 'ccw'
                  ? rotate(s, -1)
                  : n === 'soft'
                    ? softDrop(s)
                    : n === 'hard'
                      ? hardDrop(s)
                      : hold(s)
      // A hard drop that landed gets its thump instead of the plain lock tick.
      const tone = n === 'hard' && next.drops > g.drops ? 'hard' : announce(g, next)
      if (next !== g) {
        publish(next)
        if (tone && activeRef.current) cue(tone)
      }
    },
    [publish]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Held movement keys get auto-repeat; every other key fires once per press.
      const repeats = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown'
      if (e.repeat && !repeats) return
      const g = gameRef.current
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          nudge('left')
          break
        case 'ArrowRight':
        case 'd':
          nudge('right')
          break
        case 'ArrowDown':
        case 's':
          nudge('soft')
          break
        case 'ArrowUp':
        case 'w':
        case 'x':
          nudge('rotate')
          break
        case 'z':
          nudge('ccw')
          break
        case ' ':
          nudge('hard')
          break
        case 'c':
        case 'Shift':
          nudge('hold')
          break
        case 'p':
        case 'Escape':
          nudge('pause')
          break
        case 'Enter':
          if (g?.status === 'over') publish(newGame(ME))
          else if (g?.status === 'ready' || g?.status === 'paused') nudge('start')
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nudge, publish])

  // The ref'd shell renders even while the game seeds: useWide's observer needs
  // the element on the first commit or it throws before ready can post.
  if (!game) return <main ref={rootRef} {...stylex.props(dark, styles.root)} />

  const veil =
    game.status === 'ready'
      ? {
          kicker: 'Duo Arcade',
          title: 'Block Drop',
          sub: cover ? 'Tap to begin' : 'Tap, or press any key, to begin',
          action: () => nudge('start')
        }
      : game.status === 'paused'
        ? {
            kicker: 'Held',
            title: 'Paused',
            sub: cover ? 'Tap to resume' : 'Tap, or press P, to resume',
            action: () => nudge('pause')
          }
        : game.status === 'over'
          ? {
              kicker: 'Top out',
              title: `Score ${game.score.toLocaleString()}`,
              sub: game.score >= best && game.score > 0 ? 'New best - tap to play again' : 'Tap to play again',
              action: () => publish(newGame(ME))
            }
          : null

  const ctrl = (n: Nudge | 'hold', icon: ReactNode, label: string, accent = false) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      onClick={() => nudge(n)}
      disabled={game.status === 'over'}
      {...stylex.props(styles.ctrl, accent && styles.ctrlAccent, wide ? styles.ctrlWide : styles.fitCtrl(fit.ctrl))}
    >
      {icon}
    </button>
  )

  const rail = (
    <aside {...stylex.props(styles.rail, wide ? styles.railWide : styles.railNarrow)}>
      <button
        type="button"
        aria-label={
          game.hold === null ? 'Hold: empty. Tap to stash the falling piece' : `Hold: ${game.hold} piece. Tap to swap`
        }
        disabled={!game.holdFree || !playing}
        onClick={() => nudge('hold')}
        {...stylex.props(
          styles.panel,
          styles.panelButton,
          !wide && styles.panelNarrow,
          (!game.holdFree || !playing) && styles.panelSpent
        )}
      >
        <span {...stylex.props(styles.panelLabel)}>Hold</span>
        <Mini kind={game.hold} cell={fit.mini} />
      </button>
      <div {...stylex.props(styles.panel, !wide && styles.panelNarrow)}>
        <span {...stylex.props(styles.panelLabel)}>Next</span>
        <div {...stylex.props(styles.minis, wide && styles.minisWide)}>
          {game.queue.slice(0, wide ? NEXT_COUNT : 2).map((k, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the queue is positional
            <Mini key={i} kind={k} cell={fit.mini} />
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.panel, !wide && styles.panelNarrow)}>
        <div {...stylex.props(styles.stats)}>
          <span {...stylex.props(styles.statRow)}>
            <span {...stylex.props(styles.statLabel)}>Score</span>
            <b {...stylex.props(styles.statValue, styles.statAccent, !wide && styles.statValueNarrow)}>
              {game.score.toLocaleString()}
            </b>
          </span>
          <span {...stylex.props(styles.statRow)}>
            <span {...stylex.props(styles.statLabel)}>Lines</span>
            <b {...stylex.props(styles.statValue, !wide && styles.statValueNarrow)}>{game.lines}</b>
          </span>
          <span {...stylex.props(styles.statRow)}>
            <span {...stylex.props(styles.statLabel)}>Level</span>
            <b {...stylex.props(styles.statValue, !wide && styles.statValueNarrow)}>{game.level}</b>
          </span>
          <span {...stylex.props(styles.statRow)}>
            <span {...stylex.props(styles.statLabel)}>Best</span>
            <b {...stylex.props(styles.statValue, !wide && styles.statValueNarrow)}>{best.toLocaleString()}</b>
          </span>
        </div>
      </div>
      {wide && (
        <div role="group" aria-label="Game controls" {...stylex.props(styles.controls, styles.controlsWide)}>
          {ctrl('left', <Sym name="back" size={15} />, 'Move left')}
          {ctrl('soft', <Sym name="down" size={15} />, 'Soft drop')}
          {ctrl('right', <Sym name="forward" size={15} />, 'Move right')}
          {ctrl('rotate', <Sym name="flip" size={15} />, 'Rotate')}
          {ctrl('hard', <Sym name="saved" size={15} />, 'Hard drop', true)}
          {ctrl('hold', <Sym name="stack" size={15} />, 'Hold piece')}
        </div>
      )}
    </aside>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Duo Arcade</span>
          <h1 {...stylex.props(styles.title)}>Block Drop</h1>
        </div>
        <div {...stylex.props(styles.headerSide)}>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel)}>Score</span>
            <strong key={game.score} {...stylex.props(styles.chipValue)}>
              {game.score.toLocaleString()}
            </strong>
          </div>
          <button
            type="button"
            aria-label={game.status === 'playing' ? 'Pause' : game.status === 'paused' ? 'Resume' : 'Start'}
            disabled={game.status === 'over'}
            onClick={() =>
              game.status === 'over' ? undefined : game.status === 'ready' ? nudge('start') : nudge('pause')
            }
            {...stylex.props(styles.iconBtn)}
          >
            {game.status === 'paused' || game.status === 'ready' ? (
              <i aria-hidden="true" {...stylex.props(styles.playGlyph)} />
            ) : (
              <i aria-hidden="true" {...stylex.props(styles.pauseGlyph)}>
                <i {...stylex.props(styles.pauseBar)} />
                <i {...stylex.props(styles.pauseBar)} />
              </i>
            )}
          </button>
          <button
            type="button"
            aria-label="New game"
            onClick={() => publish(newGame(ME))}
            {...stylex.props(styles.iconBtn)}
          >
            <Sym name="reload" size={15} />
          </button>
        </div>
      </header>
      <section {...stylex.props(styles.stage, wide && styles.stageWide)}>
        <Playfield game={game} cell={fit.cell} pad={fit.pad} onNudge={(n) => nudge(n)}>
          {veil && (
            <button
              type="button"
              onClick={veil.action}
              // The veil is the gesture - it must not also arm the board's drag.
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              {...stylex.props(styles.veil)}
            >
              <span {...stylex.props(styles.veilKicker, game.status === 'over' && styles.veilKickerOver)}>
                {veil.kicker}
              </span>
              <strong {...stylex.props(styles.veilTitle)}>{veil.title}</strong>
              <span {...stylex.props(styles.veilSub)}>{veil.sub}</span>
            </button>
          )}
        </Playfield>
        {rail}
      </section>
      {!wide && (
        <nav role="group" aria-label="Touch controls" {...stylex.props(styles.controls)}>
          {ctrl('left', <Sym name="back" size={17} />, 'Move left')}
          {ctrl('soft', <Sym name="down" size={17} />, 'Soft drop')}
          {ctrl('right', <Sym name="forward" size={17} />, 'Move right')}
          {ctrl('rotate', <Sym name="flip" size={17} />, 'Rotate')}
          {ctrl('hard', <Sym name="saved" size={17} />, 'Hard drop', true)}
        </nav>
      )}
      <p {...stylex.props(styles.hint)}>
        {cover
          ? 'Tap the field to spin - drag to move - flick down to drop'
          : 'Arrows move - Up or X spins - Z counter-spins - Space drops - C holds - P pauses'}
      </p>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<BlockDrop />)
