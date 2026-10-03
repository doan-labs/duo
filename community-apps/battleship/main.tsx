import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { cue } from './audio.ts'
import { chooseShot } from './bot.ts'
import {
  adoptGame,
  canPlace,
  cellName,
  clipRun,
  type Derived,
  derive,
  type Fleet,
  fitLayout,
  newGame,
  type Orientation,
  parseRecord,
  type RecentMatch,
  type SavedGame,
  SHIPS,
  SIZE,
  shipCells,
  type Tally
} from './game.ts'
import { GRID_GAP, styles } from './styles.ts'

// Two running copies share this app; the wire value is tagged with the writer
// so a copy can adopt foreign state and ignore its own echo. The copy that is
// not facing the player still draws everything but starts nothing: the bot,
// the cues and the tally write all gate on `view.active`.
const ME = crypto.randomUUID()
const BOT_DELAY = 620
const GAME_KEY = 'battleship-game'
const RECORD_KEY = 'battleship-record'

// The overlay layer anchors to the grid itself, so board padding stays out
// of this math.
const cellSize = (board: number) => (board - GRID_GAP * (SIZE - 1)) / SIZE

function cellBox(board: number, at: number, inset = 0) {
  const cell = cellSize(board)
  const pad = cell * inset
  return {
    left: (at % SIZE) * (cell + GRID_GAP) + pad,
    top: Math.floor(at / SIZE) * (cell + GRID_GAP) + pad,
    width: cell - pad * 2,
    height: cell - pad * 2
  }
}

// A hull capsule spans its cells and the seams between them; the inset slims
// it so water shows along the edges.
function hullBox(board: number, cells: number[], inset = 0.18) {
  const cell = cellSize(board)
  const pad = cell * inset
  const rows = cells.map((c) => Math.floor(c / SIZE))
  const cols = cells.map((c) => c % SIZE)
  const r0 = Math.min(...rows)
  const r1 = Math.max(...rows)
  const c0 = Math.min(...cols)
  const c1 = Math.max(...cols)
  return {
    left: c0 * (cell + GRID_GAP) + pad,
    top: r0 * (cell + GRID_GAP) + pad,
    width: (c1 - c0 + 1) * cell + (c1 - c0) * GRID_GAP - pad * 2,
    height: (r1 - r0 + 1) * cell + (r1 - r0) * GRID_GAP - pad * 2
  }
}

type OceanProps = {
  board: number
  mode: 'fire' | 'place' | 'off'
  onPick?: (at: number) => void
  onHover?: (at: number | null) => void
  overlay?: ReactNode
  pulse?: 'win' | 'lose' | null
}

/** One 10x10 sea. Cells stay buttons for focus and hit-testing even when the
 * board is only a readout. */
function Ocean({ board, mode, onPick, onHover, overlay, pulse }: OceanProps) {
  const cells = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const at = r * SIZE + c
      cells.push(
        <button
          key={at}
          type="button"
          aria-label={cellName(at)}
          disabled={mode === 'off'}
          onClick={() => onPick?.(at)}
          onPointerEnter={() => onHover?.(at)}
          {...stylex.props(
            styles.sea,
            (r + c) % 2 === 1 && styles.seaAlt,
            mode === 'fire' && styles.seaLive,
            mode === 'place' && styles.seaPlace
          )}
        >
          {r === 0 && <i {...stylex.props(styles.coord, styles.coordFile, styles.coordInk)}>{'ABCDEFGHIJ'[c]}</i>}
          {c === 0 && <i {...stylex.props(styles.coord, styles.coordRank, styles.coordInk)}>{r + 1}</i>}
        </button>
      )
    }
  }
  return (
    <div {...stylex.props(styles.board, pulse === 'win' && styles.celebrate, pulse === 'lose' && styles.sink)}>
      <div {...stylex.props(styles.grid, styles.fitBoard(board))} onPointerLeave={() => onHover?.(null)}>
        {cells}
        <div {...stylex.props(styles.overlay)}>{overlay}</div>
      </div>
    </div>
  )
}

function Peg({ board, at, hit }: { board: number; at: number; hit: boolean }) {
  const b = cellBox(board, at, hit ? 0.26 : 0.34)
  return (
    <i
      {...stylex.props(styles.peg, hit ? styles.pegHit : styles.pegMiss, styles.box(b.left, b.top, b.width, b.height))}
    />
  )
}

function Hull({
  board,
  cells,
  sunk,
  enemy,
  pickup
}: {
  board: number
  cells: number[]
  sunk?: boolean
  enemy?: boolean
  pickup?: boolean
}) {
  const b = hullBox(board, cells)
  return (
    <i
      {...stylex.props(
        styles.hull,
        sunk && (enemy ? styles.hullEnemy : styles.hullSunk),
        pickup && styles.hullPickup,
        styles.box(b.left, b.top, b.width, b.height)
      )}
    />
  )
}

function LastShot({ board, at, side }: { board: number; at: number; side: 'you' | 'bot' }) {
  const b = cellBox(board, at, 0.03)
  return (
    <i
      {...stylex.props(
        styles.lastRing,
        styles.breathe,
        side === 'you' ? styles.lastRingYou : styles.lastRingBot,
        styles.box(b.left, b.top, b.width, b.height)
      )}
    />
  )
}

function Ghost({ board, cells, ok }: { board: number; cells: number[]; ok: boolean }) {
  const b = hullBox(board, cells)
  return <i {...stylex.props(styles.ghost, !ok && styles.ghostBad, styles.box(b.left, b.top, b.width, b.height))} />
}

function Seg({
  value,
  onChange,
  options,
  fill
}: {
  value: string
  onChange: (v: 'target' | 'fleet') => void
  options: ReadonlyArray<readonly [string, 'target' | 'fleet']>
  fill?: boolean
}) {
  return (
    <div role="radiogroup" {...stylex.props(styles.segTrack, fill && styles.segGrow)}>
      {options.map(([label, v]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          {...stylex.props(styles.segBtn, value === v && styles.segOn)}
        >
          <span {...stylex.props(styles.segLabel)}>{label}</span>
        </button>
      ))}
    </div>
  )
}

function ShipRow({
  name,
  cells,
  hits,
  sunk,
  ink
}: {
  name: string
  cells: number[]
  hits: Set<number>
  sunk: boolean
  ink: 'you' | 'enemy'
}) {
  return (
    <div {...stylex.props(styles.shipRow)}>
      <span {...stylex.props(styles.shipName, sunk && styles.shipSunkName)}>{name}</span>
      <span {...stylex.props(styles.pips)}>
        {cells.map((c) => (
          <i
            key={c}
            {...stylex.props(styles.pip, hits.has(c) && (ink === 'you' ? styles.pipHitYou : styles.pipHitEnemy))}
          />
        ))}
      </span>
    </div>
  )
}

function FleetCard({ game, d }: { game: SavedGame; d: Derived }) {
  const enemyCells = new Map<number, number>()
  game.enemy.forEach((cells, i) => cells.forEach((c) => enemyCells.set(c, i)))
  return (
    <div {...stylex.props(styles.fleetCard)}>
      <span {...stylex.props(styles.fieldLabel)}>Your fleet</span>
      {SHIPS.map((ship, i) => (
        <ShipRow
          key={ship.id}
          name={ship.name}
          cells={game.fleet[i] ?? Array<number>(ship.size).fill(-1)}
          hits={d.botHits}
          sunk={d.sunkYou.has(i)}
          ink="you"
        />
      ))}
      <i {...stylex.props(styles.fleetDivider)} />
      <span {...stylex.props(styles.fieldLabel)}>Enemy fleet</span>
      {SHIPS.map((ship, i) => (
        <ShipRow
          key={ship.id}
          name={ship.name}
          cells={game.enemy[i] ?? []}
          hits={d.yourHits}
          sunk={d.sunkEnemy.has(i)}
          ink="enemy"
        />
      ))}
    </div>
  )
}

function Log({ d, cover }: { d: Derived; cover: boolean }) {
  return (
    <div role="log" {...stylex.props(styles.log, cover && styles.logCover)} aria-label="Shot history">
      {d.log.length === 0 && <span {...stylex.props(styles.logEmpty)}>no shots yet</span>}
      {[...d.log].reverse().map((entry) => (
        <span key={entry.n} {...stylex.props(styles.logRow, entry.n === d.log.length && styles.logNew)}>
          <span {...stylex.props(styles.logNum)}>{entry.n}</span>
          <span {...stylex.props(styles.logText, entry.by === 'you' ? styles.logYou : styles.logBot)}>
            {entry.by === 'you' ? 'You' : 'Bot'} {cellName(entry.at)} {entry.result}
            {entry.ship ? ` ${entry.ship}` : ''}
          </span>
        </span>
      ))}
    </div>
  )
}

function statusFor(d: Derived, game: SavedGame, dir: Orientation) {
  if (d.phase === 'placing') {
    const idx = game.fleet.indexOf(null)
    const ship = SHIPS[idx]!
    return {
      text: `Place the ${ship.name} - ${ship.size} cells ${dir === 'h' ? 'across' : 'down'}. Tap a placed hull to pick it up.`,
      kind: 'live' as const
    }
  }
  if (d.phase === 'battle') {
    return d.turn === 'you'
      ? { text: 'Your shot - pick open water on the enemy grid', kind: 'live' as const }
      : { text: 'Enemy is ranging on your fleet', kind: 'bot' as const }
  }
  return d.phase === 'won'
    ? { text: 'Victory - the enemy fleet is on the bottom', kind: 'win' as const }
    : { text: 'Defeat - your fleet is sunk', kind: 'lose' as const }
}

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>(600)
  const saved = useKV(os.storage, GAME_KEY)
  const stored = useKV(os.storage, RECORD_KEY)
  const [game, setGame] = useState<SavedGame | null>(null)
  const [record, setRecord] = useState<Tally | null>(null)
  const [dir, setDir] = useState<Orientation>('h')
  const [hover, setHover] = useState<number | null>(null)
  const [focus, setFocus] = useState<'target' | 'fleet'>('fleet')
  // undefined sentinels: an empty store reports null, which must still seed.
  const lastGame = useRef<string | null | undefined>(undefined)
  const lastRecord = useRef<string | null | undefined>(undefined)
  const heard = useRef(-1)

  const publish = useCallback((next: SavedGame) => {
    setGame(next)
    void os.storage.set(GAME_KEY, JSON.stringify({ ...next, by: ME }))
  }, [])
  const publishRecord = useCallback((next: Tally) => {
    setRecord(next)
    void os.storage.set(RECORD_KEY, JSON.stringify(next))
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Adoption: foreign writes replace local state wholesale; our own echo is
  // skipped by the writer tag.
  useEffect(() => {
    if (saved.status === 'hydrating') return
    const raw = saved.value ?? null
    if (raw === lastGame.current) return
    lastGame.current = raw
    if (raw === null) {
      setGame(newGame(ME))
      return
    }
    const next = adoptGame(raw, ME)
    if (next.by === ME) return
    setGame(next)
  }, [saved.status, saved.value])

  useEffect(() => {
    if (stored.status === 'hydrating') return
    const raw = stored.value ?? null
    if (raw === lastRecord.current) return
    lastRecord.current = raw
    setRecord(parseRecord(raw))
  }, [stored.status, stored.value])

  const d = game ? derive(game) : null

  // The cover toggles between the two boards; the game picks the useful side
  // whenever the phase changes.
  const phase = d?.phase
  useEffect(() => {
    if (!phase) return
    setFocus(phase === 'placing' ? 'fleet' : 'target')
  }, [phase])

  // The bot belongs to the facing copy. `derive` picks only unfired cells, so
  // even a stale publish cannot fire twice at the same cell.
  useEffect(() => {
    if (!view.active || !game || !d || d.turn !== 'bot') return
    const t = setTimeout(() => {
      const at = chooseShot(d.botShots, game.fleet, d.sunkYou)
      if (at !== null) publish({ ...game, shots: [...game.shots, { by: 'bot', at }] })
    }, BOT_DELAY)
    return () => clearTimeout(t)
  }, [game, d, view.active, publish])

  // Match accounting and the payoff cue, once per finished game, on the
  // facing copy. lastGame dedupes: folding mid-victory cannot double count.
  useEffect(() => {
    if (!view.active || !game || !d?.winner || !record) return
    if (record.lastGame === game.id) return
    const entry: RecentMatch = { result: d.winner === 'you' ? 'won' : 'lost', shots: d.log.length }
    publishRecord({
      you: record.you + (d.winner === 'you' ? 1 : 0),
      bot: record.bot + (d.winner === 'bot' ? 1 : 0),
      lastGame: game.id,
      recent: [entry, ...record.recent].slice(0, 6)
    })
    cue(d.winner === 'you' ? 'win' : 'lose')
    navigator.vibrate?.(d.winner === 'you' ? [40, 60, 40, 60, 140] : [120, 60, 200])
  }, [game, d, view.active, record, publishRecord])

  // Shot sounds trail the log: each new entry cues its own result, except the
  // match winner, which the victory cue already covers.
  useEffect(() => {
    if (!view.active || !d) return
    if (heard.current < 0 || d.log.length < heard.current) {
      heard.current = d.log.length
      return
    }
    if (d.log.length === heard.current) return
    const entry = d.log[d.log.length - 1]!
    heard.current = d.log.length
    if (d.winner) return
    cue(entry.result === 'miss' ? 'miss' : entry.result === 'hit' ? 'hit' : 'sunk')
  }, [d, view.active])

  const newMatch = useCallback(() => {
    publish(newGame(ME))
    setDir('h')
    setHover(null)
    cue('rotate')
  }, [publish])

  const autoPlace = useCallback(() => {
    if (!game || !d || d.phase !== 'placing') return
    const fleet: Fleet = [...game.fleet]
    for (let i = 0; i < SHIPS.length; i++) {
      if (fleet[i]) continue
      for (;;) {
        const cells = shipCells(Math.floor(Math.random() * 100), SHIPS[i]!.size, Math.random() < 0.5 ? 'h' : 'v')
        if (cells && canPlace(fleet, cells)) {
          fleet[i] = cells
          break
        }
      }
    }
    publish({ ...game, fleet })
    cue('place')
  }, [game, d, publish])

  const clearFleet = useCallback(() => {
    if (!game || !d || d.phase !== 'placing') return
    publish({ ...game, fleet: SHIPS.map(() => null) })
    setHover(null)
    cue('rotate')
  }, [game, d, publish])

  const rotate = useCallback(() => {
    setDir((v) => (v === 'h' ? 'v' : 'h'))
    cue('rotate')
  }, [])

  const pickFleet = useCallback(
    (at: number) => {
      if (!game || !d || d.phase !== 'placing') return
      const held = game.fleet.findIndex((s) => s?.includes(at))
      if (held >= 0) {
        const fleet = [...game.fleet]
        fleet[held] = null
        publish({ ...game, fleet })
        cue('rotate')
        return
      }
      const idx = game.fleet.indexOf(null)
      if (idx < 0) return
      const cells = shipCells(at, SHIPS[idx]!.size, dir)
      if (!cells || !canPlace(game.fleet, cells)) {
        cue('reject')
        navigator.vibrate?.(30)
        return
      }
      const fleet = [...game.fleet]
      fleet[idx] = cells
      publish({ ...game, fleet })
      cue('place')
      navigator.vibrate?.(15)
    },
    [game, d, dir, publish]
  )

  const fire = useCallback(
    (at: number) => {
      if (!game || !d || d.turn !== 'you' || d.yourShots.has(at)) return
      publish({ ...game, shots: [...game.shots, { by: 'you', at }] })
      cue('fire')
      navigator.vibrate?.(12)
    },
    [game, d, publish]
  )

  // useWide needs its ref mounted on the first commit, so the loading frame is
  // the same element the loaded one becomes.
  if (!game || !d || !record) {
    return <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)} />
  }

  const fit = fitLayout(view, wide)
  const placing = d.phase === 'placing'
  const lastEntry = d.log.length ? d.log[d.log.length - 1]! : null
  const nextIdx = game.fleet.indexOf(null)
  const hoverShip = placing && hover !== null ? game.fleet.findIndex((s) => s?.includes(hover)) : -1
  // Off-grid anchors still preview: the run clipped to the grid paints as a
  // red ghost, which a cell :hover fill could never out-vote.
  const run =
    placing && hover !== null && hoverShip < 0 && nextIdx >= 0
      ? (shipCells(hover, SHIPS[nextIdx]!.size, dir) ?? clipRun(hover, SHIPS[nextIdx]!.size, dir))
      : null
  const ghost =
    run && run.length > 0 ? { cells: run, ok: run.length === SHIPS[nextIdx]!.size && canPlace(game.fleet, run) } : null
  const status = statusFor(d, game, dir)

  const fleetBoard = (
    <Ocean
      board={fit.board}
      mode={placing ? 'place' : 'off'}
      onPick={pickFleet}
      onHover={setHover}
      pulse={d.winner === 'bot' ? 'lose' : null}
      overlay={
        <>
          {game.fleet.map(
            (cells, i) =>
              cells && (
                <Hull
                  key={SHIPS[i]!.id}
                  board={fit.board}
                  cells={cells}
                  sunk={d.sunkYou.has(i)}
                  pickup={hoverShip === i}
                />
              )
          )}
          {ghost && <Ghost board={fit.board} cells={ghost.cells} ok={ghost.ok} />}
          {[...d.botShots].map((at) => (
            <Peg key={at} board={fit.board} at={at} hit={d.botHits.has(at)} />
          ))}
          {lastEntry?.by === 'bot' && <LastShot board={fit.board} at={lastEntry.at} side="bot" />}
        </>
      }
    />
  )
  const targetBoard = (
    <Ocean
      board={fit.board}
      mode={d.turn === 'you' ? 'fire' : 'off'}
      onPick={fire}
      pulse={d.winner === 'you' ? 'win' : null}
      overlay={
        <>
          {SHIPS.map(
            (ship, i) =>
              d.sunkEnemy.has(i) && <Hull key={ship.id} board={fit.board} cells={game.enemy[i]!} sunk enemy />
          )}
          {[...d.yourShots].map((at) => (
            <Peg key={at} board={fit.board} at={at} hit={d.yourHits.has(at)} />
          ))}
          {lastEntry?.by === 'you' && <LastShot board={fit.board} at={lastEntry.at} side="you" />}
          {placing && <div {...stylex.props(styles.fog)}>Deploy your fleet to open fire</div>}
        </>
      }
    />
  )

  const placeControls = (rail: boolean) => (
    <>
      <button type="button" onClick={rotate} {...stylex.props(styles.secondary, rail && styles.grow)}>
        <Sym name="flip" size={13} />
        Rotate
      </button>
      <button type="button" onClick={autoPlace} {...stylex.props(styles.secondary, rail && styles.grow)}>
        <Sym name="bolt" size={13} />
        Auto
      </button>
      <button type="button" onClick={clearFleet} {...stylex.props(styles.secondary, rail && styles.grow)}>
        <Sym name="trash" size={13} />
        Clear
      </button>
    </>
  )
  const battleControls = (rail = false) => (
    <button type="button" onClick={newMatch} {...stylex.props(styles.primary, rail && styles.grow)}>
      <Sym name="reload" size={13} />
      New match
    </button>
  )

  return (
    <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Naval engagement</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Battleship</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipYou)}>YOU</span>
            <span {...stylex.props(styles.chipValue)}>{record.you}</span>
          </div>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel, styles.chipBot)}>BOT</span>
            <span {...stylex.props(styles.chipValue)}>{record.bot}</span>
          </div>
        </div>
      </header>

      <p
        {...stylex.props(
          styles.status,
          status.kind === 'win' && styles.statusWin,
          status.kind === 'lose' && styles.statusLose,
          status.kind === 'live' && styles.statusLive
        )}
      >
        {status.text}
        {status.kind === 'bot' && (
          <span {...stylex.props(styles.thinkDots)}>
            <i {...stylex.props(styles.thinkDot)} />
            <i {...stylex.props(styles.thinkDot, styles.thinkDotB)} />
            <i {...stylex.props(styles.thinkDot, styles.thinkDotC)} />
          </span>
        )}
      </p>

      {wide ? (
        <section {...stylex.props(styles.stage)}>
          <div {...stylex.props(styles.panel)}>
            <div {...stylex.props(styles.panelHead)}>
              <span {...stylex.props(styles.panelTitle)}>Your fleet</span>
              <span {...stylex.props(styles.panelMeta)}>{SHIPS.length - d.sunkYou.size} afloat</span>
            </div>
            {fleetBoard}
          </div>
          <div {...stylex.props(styles.panel)}>
            <div {...stylex.props(styles.panelHead)}>
              <span {...stylex.props(styles.panelTitle)}>Enemy waters</span>
              <span {...stylex.props(styles.panelMeta)}>{d.yourShots.size} shots</span>
            </div>
            {targetBoard}
          </div>
          <aside {...stylex.props(styles.rail)}>
            <div {...stylex.props(styles.controls, styles.controlsWide)}>
              {placing ? placeControls(true) : battleControls(true)}
            </div>
            <FleetCard game={game} d={d} />
            <Log d={d} cover={false} />
          </aside>
        </section>
      ) : (
        <section {...stylex.props(styles.stage, styles.stageCover)}>
          <div {...stylex.props(styles.controls, styles.controlsCover)}>
            {placing ? (
              placeControls(false)
            ) : (
              <>
                <Seg
                  value={focus}
                  onChange={setFocus}
                  options={[
                    ['Target', 'target'],
                    ['Fleet', 'fleet']
                  ]}
                  fill
                />
                {battleControls()}
              </>
            )}
          </div>
          {focus === 'fleet' ? fleetBoard : targetBoard}
          {!placing && <Log d={d} cover />}
        </section>
      )}

      {(d.phase === 'won' || d.phase === 'lost') && (
        <div {...stylex.props(styles.result)}>
          <div {...stylex.props(styles.resultCopy)}>
            <span {...stylex.props(styles.resultKicker, d.phase === 'won' && styles.resultKickerWin)}>
              {d.phase === 'won' ? 'Victory' : 'Defeat'}
            </span>
            <span {...stylex.props(styles.resultTitle)}>
              {d.phase === 'won' ? 'Enemy fleet destroyed' : 'Fleet sunk'}
            </span>
            <span {...stylex.props(styles.resultSub)}>
              {d.yourShots.size} shots fired, {d.yourHits.size} hits
            </span>
          </div>
          {wide && (
            <button
              type="button"
              onClick={() => publishRecord({ you: 0, bot: 0, lastGame: record.lastGame, recent: [] })}
              {...stylex.props(styles.secondary)}
            >
              <Sym name="undo" size={13} />
              Reset tally
            </button>
          )}
          {battleControls()}
        </div>
      )}
    </main>
  )
}

void os.connect().then(() => {
  createRoot(document.body).render(<Game />)
})
