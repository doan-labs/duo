import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Board, fitLayout } from './board.tsx'
import {
  adoptGame,
  chord,
  EMPTY_STATS,
  elapsedSeconds,
  formatClock,
  type Game,
  minesLeft,
  newGame,
  normalizeStats,
  PRESETS,
  type PresetId,
  presetById,
  recordPlay,
  recordWin,
  reveal,
  type Stats,
  serializeGame,
  toggleFlag
} from './game.ts'
import { styles } from './styles.ts'

// Why a writer id: both displays share one storage key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled game - adopting it unconditionally is what converges the two
// displays, including the race where both seed a fresh board at once.
const ME = crypto.randomUUID()

// The kit Segmented is a light-surface control; this is the same radiogroup
// contract drawn for a dark well (as the other arcade apps do).
function Seg({
  aria,
  options,
  value,
  onChange,
  stacked,
  fill
}: {
  aria: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  /** Stack segments vertically; the rail is too narrow for a three-wide row. */
  stacked?: boolean
  /** Grow the track to share a row's width with its sibling control. */
  fill?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={aria}
      {...stylex.props(styles.segTrack, stacked && styles.segRail, fill && styles.segFill)}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          {...stylex.props(styles.segBtn, o === value && styles.segOn)}
        >
          <span {...stylex.props(styles.segLabel)}>{o}</span>
        </button>
      ))}
    </div>
  )
}

function Minesweeper() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const initial = useRef<Game | null>(null)
  if (!initial.current) initial.current = newGame(presetById('easy'))
  const [game, setGame] = useState<Game>(initial.current)
  const [focus, setFocus] = useState(0)
  const focusRef = useRef(0)
  focusRef.current = focus
  // The last reveal tap, for the board's staggered flood: this display's own
  // motion cue, never persisted, so the mirror copy never replays it.
  const [wave, setWave] = useState<{ index: number; stamp: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  const fit = fitLayout(view, wide)

  // 'game' is durable storage: a mid-game fold AND a relaunch both resume the
  // same board. 'flag' lives on the session store: mode is per-session UI
  // state, shared across the two displays but reset on a fresh launch.
  const saved = useKV(os.storage, 'game')
  const stats = useJSON<Stats>(os.storage, 'stats', EMPTY_STATS)
  const flag = useKV(os.session, 'flag')
  const flagMode = flag.value === '1'
  const statsValue = normalizeStats(stats.value)

  const publish = useCallback(
    (next: Game) => {
      setGame(next)
      void saved.set(JSON.stringify(serializeGame(ME, next)))
    },
    [saved]
  )

  // Why adopt on the storage key: the fold carries the running game to the
  // other display. A write this copy did not make is the new settled board;
  // own writes are already on screen and are ignored. The raw string is the
  // guard: the effect body must not re-fire on every render of a remote value
  // already on screen.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
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
    setGame(next.game)
    setFocus((current) => Math.min(current, next.game.cells.length - 1))
  }, [saved.value, saved.status, saved, publish])

  // Why timestamps, not ticks: the clock derives from startedAt/endedAt held in
  // the shared game record, so both displays render the same elapsed time.
  // The interval only re-renders this copy and only runs while this display is
  // the visible one - the hidden mirror runs no timer at all.
  useEffect(() => {
    if (!view.visible || game.status !== 'playing' || game.startedAt === null) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [view.visible, game.status, game.startedAt])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const commit = useCallback(
    (next: Game) => {
      if (next === game) return
      publish(next)
      let nextStats = statsValue
      if (game.status === 'ready' && next.status === 'playing') nextStats = recordPlay(nextStats, next.preset)
      if (next.status === 'won' && game.status !== 'won') {
        nextStats = recordWin(nextStats, next.preset, elapsedSeconds(next, next.endedAt ?? Date.now()))
      }
      if (nextStats !== statsValue) stats.set(nextStats)
    },
    [game, publish, stats, statsValue]
  )

  const flagAt = useCallback((index: number) => commit(toggleFlag(game, index)), [commit, game])
  const tap = useCallback(
    (index: number) => {
      if (game.status === 'won' || game.status === 'lost') return
      if (flagMode) {
        flagAt(index)
        return
      }
      const cell = game.cells[index]!
      commit(cell.state === 'open' ? chord(game, index, Date.now()) : reveal(game, index, Date.now()))
      setWave({ index, stamp: Date.now() })
    },
    [commit, flagMode, flagAt, game]
  )

  const restart = useCallback(
    (presetId: PresetId = game.preset) => {
      const next = newGame(presetById(presetId))
      setFocus(0)
      publish(next)
    },
    [game.preset, publish]
  )

  const toggleFlagMode = useCallback(() => flag.set(flagMode ? '0' : '1'), [flag, flagMode])

  // Arrow keys drive a roving focus over the cells; F flags it, G toggles flag
  // mode, Enter/Space activate the focused cell natively, R/N restart.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const { cols, rows } = game
      if (event.key.startsWith('Arrow')) {
        const current = focusRef.current
        let next = current
        if (event.key === 'ArrowLeft' && current % cols !== 0) next = current - 1
        else if (event.key === 'ArrowRight' && current % cols !== cols - 1) next = current + 1
        else if (event.key === 'ArrowUp' && current - cols >= 0) next = current - cols
        else if (event.key === 'ArrowDown' && current + cols < cols * rows) next = current + cols
        if (next !== current) {
          event.preventDefault()
          setFocus(next)
          const el = rootRef.current?.querySelector(`[data-index="${next}"]`)
          if (el instanceof HTMLElement) el.focus()
        }
        return
      }
      if (event.key === 'f' || event.key === 'F') flagAt(focusRef.current)
      else if (event.key === 'g' || event.key === 'G') toggleFlagMode()
      else if (event.key === 'r' || event.key === 'R' || event.key === 'n' || event.key === 'N') restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, flagAt, toggleFlagMode, restart, rootRef])

  const ended = game.status === 'won' || game.status === 'lost'
  const seconds = elapsedSeconds(game, now)
  const preset = presetById(game.preset)
  const board = game.preset
  const best = statsValue[board].best
  const hydrated = saved.status !== 'hydrating'
  const newBest = game.status === 'won' && best !== null && elapsedSeconds(game, game.endedAt ?? now) <= best

  const chips = (
    <div {...stylex.props(styles.scores)}>
      <div {...stylex.props(styles.chip, !wide && styles.chipCover)}>
        <span {...stylex.props(styles.chipLabel)}>MINES</span>
        <strong key={minesLeft(game)} {...stylex.props(styles.chipValue, !wide && styles.chipValueCover, shared.swap)}>
          {minesLeft(game)}
        </strong>
      </div>
      <div {...stylex.props(styles.chip, !wide && styles.chipCover)}>
        <span {...stylex.props(styles.chipLabel)}>TIME</span>
        <strong {...stylex.props(styles.chipValue, !wide && styles.chipValueCover)}>{formatClock(seconds)}</strong>
      </div>
      <div {...stylex.props(styles.chip, !wide && styles.chipCover)}>
        <span {...stylex.props(styles.chipLabel, styles.chipLabelBest)}>BEST</span>
        <strong key={best ?? 'none'} {...stylex.props(styles.chipValue, !wide && styles.chipValueCover, shared.swap)}>
          {best === null ? '-' : formatClock(best)}
        </strong>
      </div>
    </div>
  )

  const controls = (
    <>
      <Seg
        aria="Difficulty"
        options={PRESETS.map((p) => p.label)}
        value={preset.label}
        onChange={(label) => restart(PRESETS.find((p) => p.label === label)!.id)}
        stacked={wide}
      />
      <div {...stylex.props(styles.controls, wide ? styles.controlsWide : styles.controlsCover)}>
        <Seg
          aria="Tap mode"
          options={['Reveal', 'Flag']}
          value={flagMode ? 'Flag' : 'Reveal'}
          onChange={(mode) => {
            if ((mode === 'Flag') !== flagMode) toggleFlagMode()
          }}
          fill={!wide}
        />
        <button type="button" onClick={() => restart()} {...stylex.props(styles.action)}>
          <Sym name="reload" size={13} />
          New game
        </button>
      </div>
    </>
  )

  const statsCard = (
    <div {...stylex.props(styles.statsCard)}>
      <span {...stylex.props(styles.fieldLabel)}>Personal bests</span>
      {PRESETS.map((p) => {
        const s = statsValue[p.id]
        return (
          <div key={p.id} {...stylex.props(styles.statsRow)}>
            <span {...stylex.props(styles.statsName, p.id === board && styles.statsNameOn)}>
              {p.label} {p.cols}x{p.rows}
            </span>
            <span {...stylex.props(styles.statsValue)}>
              {s.best === null ? '-' : formatClock(s.best)}{' '}
              <span {...stylex.props(styles.statsMeta)}>
                {s.wins} of {s.plays}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )

  const hintText =
    saved.status === 'error' || stats.status === 'error'
      ? 'Progress may not be saved'
      : saved.status === 'saving' || stats.status === 'saving'
        ? 'Saving...'
        : flagMode
          ? 'Flag mode: every tap marks a mine'
          : 'Tap to reveal. Long-press or right-click to flag.'

  const boardEl = hydrated ? (
    <Board
      game={game}
      size={fit.board}
      focus={focus}
      ended={ended}
      wave={wave}
      onTap={tap}
      onFlag={flagAt}
      onFocus={setFocus}
    />
  ) : (
    <div {...stylex.props(styles.well, styles.fitBoard(fit.board))}>
      <span {...stylex.props(styles.hint)}>Resuming board...</span>
    </div>
  )

  const result =
    game.status === 'lost' ? (
      <div role="status" {...stylex.props(styles.result, !wide && styles.resultCover)}>
        <div {...stylex.props(styles.resultCopy)}>
          <span {...stylex.props(styles.resultKicker, styles.resultLine)}>Mine hit</span>
          <strong {...stylex.props(styles.resultTitle, styles.resultLine, styles.resultDelay(60))}>
            Boom. Game over.
          </strong>
          <span {...stylex.props(styles.resultSub, styles.resultLine, styles.resultDelay(120))}>
            {preset.label} board - {formatClock(seconds)} in
          </span>
        </div>
        <button type="button" onClick={() => restart()} {...stylex.props(styles.primary)}>
          <Sym name="reload" size={13} />
          Try again
        </button>
      </div>
    ) : game.status === 'won' ? (
      <div role="status" {...stylex.props(styles.result, !wide && styles.resultCover)}>
        <div {...stylex.props(styles.resultCopy)}>
          <span {...stylex.props(styles.resultKicker, styles.resultKickerWin, styles.resultLine)}>Cleared</span>
          <strong {...stylex.props(styles.resultTitle, styles.resultLine, styles.resultDelay(60))}>
            Board cleared.
          </strong>
          {newBest ? (
            <span {...stylex.props(styles.bestBadge, styles.resultLine, styles.resultDelay(120))}>New best</span>
          ) : null}
          <span {...stylex.props(styles.resultSub, styles.resultLine, styles.resultDelay(160))}>
            {preset.label} in {formatClock(seconds)}
            {newBest ? '' : best === null ? '' : ` - best ${formatClock(best)}`}
          </span>
        </div>
        <button type="button" onClick={() => restart()} {...stylex.props(styles.primary)}>
          <Sym name="reload" size={13} />
          New game
        </button>
      </div>
    ) : null

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header, !wide && styles.headerCover)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Duo Arcade</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Minesweeper</h1>
        </div>
        {chips}
      </header>
      {wide ? (
        <section {...stylex.props(styles.stage)}>
          {boardEl}
          <div {...stylex.props(styles.rail)}>
            {controls}
            {statsCard}
            <p {...stylex.props(styles.hint, flagMode && styles.hintOn)}>{hintText}</p>
          </div>
        </section>
      ) : (
        <section {...stylex.props(styles.stage, styles.stageCover)}>
          {boardEl}
          <div {...stylex.props(styles.rail, styles.railCover)}>{controls}</div>
          <p {...stylex.props(styles.hint, styles.hintCover, flagMode && styles.hintOn)}>{hintText}</p>
        </section>
      )}
      {result}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Minesweeper />)
