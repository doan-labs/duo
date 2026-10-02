import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, Num, Segmented, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, delay, light } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  adoptGame,
  applyCell,
  type Cell,
  clues,
  type Durable,
  type Edit,
  emptyDurable,
  FILLED,
  fitBoard,
  formatTime,
  freshCells,
  isComplete,
  lineSatisfied,
  MARKED,
  type PuzzleRecord,
  parseDurable,
  progress,
  type SavedGame,
  type Tool,
  targetFor,
  UNKNOWN,
  type UndoEntry,
  undoOnce
} from './game.ts'
import { BY_ID, gridFor, PUZZLES } from './puzzles.ts'
import { styles } from './styles.ts'

// Both displays share one session key whose store is last-writer-wins, so a
// value not written by this copy is always the newer settled game - adopting
// it unconditionally is what converges the two displays, including the race
// where both seed a fresh session at once.
const ME = crypto.randomUUID()
const TOOL_LABELS = ['Fill', 'Mark', 'Erase'] as const
const TOOL_OF: Record<(typeof TOOL_LABELS)[number], Tool> = { Fill: 'fill', Mark: 'mark', Erase: 'erase' }
const TOOL_LABEL_OF: Record<Tool, (typeof TOOL_LABELS)[number]> = { fill: 'Fill', mark: 'Mark', erase: 'Erase' }
const UNDO_CAP = 400

function liveGame(at: number, puzzleId: string, cells: Cell[], done: boolean, screen: SavedGame['screen']): SavedGame {
  return {
    by: ME,
    at,
    run: crypto.randomUUID(),
    screen,
    puzzleId,
    tool: 'fill',
    cells,
    undo: [],
    moves: 0,
    startedAt: null,
    finishedAt: null,
    done
  }
}

// A relaunch resumes the last played puzzle and its marks; a fresh install
// opens on the picker instead.
function seedGame(d: Durable): SavedGame {
  const id = d.last && BY_ID.has(d.last) ? d.last : ''
  if (!id) return liveGame(Date.now(), PUZZLES[0]!.id, freshCells(gridFor(PUZZLES[0]!)), false, 'pick')
  const grid = gridFor(BY_ID.get(id)!)
  const rec = d.puzzles[id]
  const cells = rec && rec.cells.length === grid.cells.length ? [...rec.cells] : freshCells(grid)
  const done = isComplete(cells, grid) && !!rec?.done
  return liveGame(Date.now(), id, cells, done, 'play')
}

function XMark() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" {...stylex.props(styles.mark)}>
      <path
        d="M1.8 1.8 L8.2 8.2 M8.2 1.8 L1.8 8.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function App() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const saved = useKV(os.session, 'nonogram-game')
  const stored = useKV(os.storage, 'nonogram-progress')
  const [game, setGame] = useState<SavedGame | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [draft, setDraft] = useState<Cell[] | null>(null)
  const [hot, setHot] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [armClear, setArmClear] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const boardRef = useRef<HTMLDivElement | null>(null)
  const strokeRef = useRef<{ target: Cell; cells: Cell[]; edits: Map<number, Cell> } | null>(null)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const celebrated = useRef<string | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const durable = useMemo(() => {
    try {
      return stored.value ? parseDurable(JSON.parse(stored.value)) : emptyDurable
    } catch {
      return emptyDurable
    }
  }, [stored.value])

  const puzzle = game ? (BY_ID.get(game.puzzleId) ?? null) : null
  const grid = useMemo(() => (puzzle ? gridFor(puzzle) : null), [puzzle])
  const clueSet = useMemo(() => (grid ? clues(grid) : null), [grid])
  // Position is a clue number's identity, so the row/column metadata carries
  // its own stable keys instead of leaning on map indices in JSX.
  const colClues = useMemo(
    () =>
      clueSet?.cols.map((cl) => ({ id: crypto.randomUUID(), nums: cl.map((n) => ({ id: crypto.randomUUID(), n })) })),
    [clueSet]
  )
  const rowClues = useMemo(
    () =>
      clueSet?.rows.map((cl) => ({ id: crypto.randomUUID(), nums: cl.map((n) => ({ id: crypto.randomUUID(), n })) })),
    [clueSet]
  )
  const cells = draft ?? game?.cells ?? []
  const prog = useMemo(() => (grid && cells.length === grid.cells.length ? progress(cells, grid) : null), [cells, grid])
  const fit = useMemo(
    () => (grid && clueSet ? fitBoard(grid, clueSet.rows, clueSet.cols, view, wide) : null),
    [grid, clueSet, view, wide]
  )
  const solved = Object.values(durable.puzzles).filter((r) => r.done).length

  const publish = useCallback((next: SavedGame) => {
    setGame(next)
    void os.session.set('nonogram-game', JSON.stringify(next))
  }, [])

  // Dark Mode is a device switch: the light app wears the kit's dark theme.
  useEffect(() => os.device.on('switches', (sw) => setDarkMode(sw.darkMode)), [])

  // Adopt the peer's settled game; seed only after the durable store hydrates
  // so a fresh copy cannot publish over a real saved board.
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
      if (!seeded.current && stored.status !== 'hydrating') {
        seeded.current = true
        publish(seedGame(durable))
      }
      return
    }
    const next = adoptGame(parsed, ME)
    if (!next || next.by === ME) return
    setDraft(null)
    setHot(null)
    setFocus(null)
    setArmClear(false)
    setGame(next)
  }, [saved.value, saved.status, stored.status, durable, publish])

  // The active view alone owns the durable write: per-puzzle marks, ever-solved,
  // solve count and best time. A solve counts once per run, so replaying a
  // cleared board increments honestly.
  useEffect(() => {
    if (!game || !view.active || stored.status === 'hydrating') return
    const prev = durable.puzzles[game.puzzleId]
    const counted = prev?.done === true && prev.run === game.run
    const won = game.done && !counted
    const elapsed = game.startedAt != null && game.finishedAt != null ? game.finishedAt - game.startedAt : null
    const rec: PuzzleRecord = {
      cells: game.cells,
      done: game.done || prev?.done === true,
      solves: (prev?.solves ?? 0) + (won ? 1 : 0),
      bestTime:
        won && elapsed != null
          ? Math.min(prev?.bestTime ?? Number.MAX_SAFE_INTEGER, elapsed)
          : (prev?.bestTime ?? null),
      run: won ? game.run : (prev?.run ?? null)
    }
    const next: Durable = { schema: 1, last: game.puzzleId, puzzles: { ...durable.puzzles, [game.puzzleId]: rec } }
    if (JSON.stringify(next) !== stored.value) void stored.set(JSON.stringify(next))
  }, [game, view.active, stored, durable])

  // The finish moment celebrates once per run, on the glass being looked at.
  useEffect(() => {
    if (!game?.done || game.finishedAt == null || !view.active || celebrated.current === game.run) return
    celebrated.current = game.run
    navigator.vibrate?.([40, 60, 40])
  }, [game, view.active])

  // The clock belongs to the active view; the second copy draws the last
  // published timestamp and starts nothing.
  useEffect(() => {
    if (game?.startedAt == null || game.done || !view.active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [game?.startedAt, game?.done, view.active])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Leaving the board mid-stroke drops the drag state so a stranded capture
  // cannot block the next touch.
  useEffect(() => {
    if (game?.screen === 'play') return
    strokeRef.current = null
    setDraft(null)
    setHot(null)
  }, [game?.screen])

  const commit = useCallback(
    (nextCells: Cell[], entry: UndoEntry | null) => {
      if (!game || !grid) return
      const done = isComplete(nextCells, grid)
      publish({
        ...game,
        by: ME,
        at: Date.now(),
        cells: nextCells,
        undo: entry ? [...game.undo, entry].slice(-UNDO_CAP) : game.undo,
        moves: game.moves + (entry ? 1 : 0),
        startedAt: game.startedAt ?? (entry ? Date.now() : null),
        finishedAt: done ? (game.done ? game.finishedAt : Date.now()) : null,
        done
      })
    },
    [game, grid, publish]
  )

  function cellFromEvent(e: React.PointerEvent): number {
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]')
    return hit instanceof HTMLElement && boardRef.current?.contains(hit) ? Number(hit.dataset.cell) : -1
  }

  // A stroke keeps its own working copy: pointer events can land faster than
  // React applies the draft state, so every edit must go through the ref, not
  // the last rendered cells array.
  function beginStroke(e: React.PointerEvent, i: number) {
    if (!game || game.done || game.screen !== 'play') return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    boardRef.current?.setPointerCapture(e.pointerId)
    boardRef.current?.focus()
    const target = targetFor(game.tool, cells[i]!)
    const st = { target, cells: cells.slice(), edits: new Map<number, Cell>() }
    strokeRef.current = st
    for (const ed of applyCell(st.cells, i, target)) st.edits.set(ed.i, ed.prev)
    setDraft([...st.cells])
    setHot(i)
    setFocus(i)
  }

  function moveStroke(e: React.PointerEvent) {
    const st = strokeRef.current
    if (!st || !game) return
    const i = cellFromEvent(e)
    if (!Number.isInteger(i) || i < 0 || i >= st.cells.length) return
    setHot(i)
    if (st.edits.has(i)) return
    for (const ed of applyCell(st.cells, i, st.target)) st.edits.set(ed.i, ed.prev)
    setDraft([...st.cells])
    setFocus(i)
  }

  function endStroke() {
    const st = strokeRef.current
    strokeRef.current = null
    setDraft(null)
    if (!st || !game) return
    if (!st.edits.size) return
    const edits: Edit = [...st.edits].map(([i, prev]) => ({ i, prev }))
    commit([...st.cells], { applied: st.target, edits })
  }

  function applyFocused(i: number) {
    if (!game || game.done || strokeRef.current) return
    const target = targetFor(game.tool, cells[i]!)
    const next = cells.slice()
    const edits = applyCell(next, i, target)
    if (edits.length) commit(next, { applied: target, edits })
  }

  function undo() {
    if (!game || !grid || !game.undo.length || strokeRef.current) return
    const entry = game.undo.at(-1)!
    const next = game.cells.slice()
    undoOnce(next, entry)
    const done = isComplete(next, grid)
    publish({
      ...game,
      by: ME,
      at: Date.now(),
      cells: next,
      undo: game.undo.slice(0, -1),
      moves: game.moves + 1,
      finishedAt: done ? (game.done ? game.finishedAt : Date.now()) : null,
      done
    })
  }

  // Clear is a two-tap gesture and one undoable edit, never a silent wipe.
  function clearBoard(force = false) {
    if (!game || !grid) return
    if (!force && !armClear) {
      setArmClear(true)
      if (clearTimer.current) clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setArmClear(false), 2500)
      return
    }
    setArmClear(false)
    const edits: Edit = []
    game.cells.forEach((c, i) => {
      if (c !== UNKNOWN) edits.push({ i, prev: c })
    })
    publish({
      ...game,
      by: ME,
      at: Date.now(),
      run: crypto.randomUUID(),
      cells: freshCells(grid),
      undo: edits.length ? [...game.undo, { applied: UNKNOWN as Cell, edits }].slice(-UNDO_CAP) : game.undo,
      moves: game.moves + (edits.length ? 1 : 0),
      startedAt: null,
      finishedAt: null,
      done: false
    })
  }

  function choose(id: string) {
    if (!game) return
    if (id === game.puzzleId) {
      publish({ ...game, by: ME, at: Date.now(), screen: 'play' })
      return
    }
    const p = BY_ID.get(id)
    if (!p) return
    const g = gridFor(p)
    const rec = durable.puzzles[id]
    const nextCells = rec && rec.cells.length === g.cells.length ? [...rec.cells] : freshCells(g)
    const done = isComplete(nextCells, g) && rec?.done === true
    publish({ ...liveGame(Date.now(), id, nextCells, done, 'play'), tool: game.tool })
  }

  function nextPuzzle() {
    if (!game) return
    const at = PUZZLES.findIndex((p) => p.id === game.puzzleId)
    const rest = [...PUZZLES.slice(at + 1), ...PUZZLES.slice(0, at + 1)]
    const open = rest.find((p) => !durable.puzzles[p.id]?.done) ?? rest[0]!
    choose(open.id)
  }

  function onBoardKey(e: React.KeyboardEvent) {
    if (!game || !grid || game.screen !== 'play') return
    const i = focus ?? 0
    let next = i
    if (e.key === 'ArrowLeft') next = Math.max(0, i - 1)
    else if (e.key === 'ArrowRight') next = Math.min(grid.cells.length - 1, i + 1)
    else if (e.key === 'ArrowUp') next = Math.max(0, i - grid.cols)
    else if (e.key === 'ArrowDown') next = Math.min(grid.cells.length - 1, i + grid.cols)
    else if (e.key === ' ' || e.key === 'Enter') applyFocused(i)
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) undo()
    else if (e.key === '1' || e.key === '2' || e.key === '3') {
      const label = TOOL_LABELS[Number(e.key) - 1]
      if (label) publish({ ...game, by: ME, at: Date.now(), tool: TOOL_OF[label] })
    } else return
    e.preventDefault()
    if (next !== i) {
      setFocus(next)
      setHot(next)
    }
  }

  if (!game || !grid || !clueSet || !fit || !puzzle)
    return <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root, !wide && styles.rootCover)} />

  const playing = game.screen === 'play'
  const elapsedMs = game.startedAt != null ? (game.finishedAt ?? now) - game.startedAt : null
  const hotRow = hot != null ? Math.floor(hot / grid.cols) : -1
  const hotCol = hot != null ? hot % grid.cols : -1
  const rowDone = (r: number) =>
    lineSatisfied(cells.slice(r * grid.cols, (r + 1) * grid.cols), grid.cells.slice(r * grid.cols, (r + 1) * grid.cols))
  const colDone = (c: number) =>
    lineSatisfied(
      cells.filter((_, i) => i % grid.cols === c),
      grid.cells.filter((_, i) => i % grid.cols === c)
    )
  const gridCols = `${fit.clueW}px repeat(${grid.cols}, ${fit.cell}px)`
  const gridRows = `${fit.clueH}px repeat(${grid.rows}, ${fit.cell}px)`
  const check = darkMode ? styles.pickDoneDark : styles.pickDone

  const board = (
    <div {...stylex.props(styles.boardCard)}>
      <div
        ref={boardRef}
        role="grid"
        aria-label={`${puzzle.name} board`}
        tabIndex={0}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={(e) => {
          moveStroke(e)
          if (!strokeRef.current) setHot(null)
        }}
        onKeyDown={onBoardKey}
        onContextMenu={(e) => e.preventDefault()}
        {...stylex.props(styles.grid, styles.gridTemplate(gridCols, gridRows))}
      >
        <div {...stylex.props(styles.clueCorner, styles.clueW(fit.clueW), styles.clueH(fit.clueH))} />
        {colClues?.map((d, c) => (
          <div
            key={d.id}
            {...stylex.props(
              styles.colClue,
              c % 5 === 0 && styles.cellMajorLeft,
              c === grid.cols - 1 && styles.cellMajorRight
            )}
          >
            {d.nums.map((item) => (
              <span
                key={item.id}
                {...stylex.props(styles.clue, colDone(c) && styles.clueDim, c === hotCol && styles.clueHot)}
              >
                {item.n}
              </span>
            ))}
          </div>
        ))}
        {rowClues?.map((d, r) => (
          <Fragment key={d.id}>
            <div
              {...stylex.props(
                styles.rowClue,
                styles.clueW(fit.clueW),
                r % 5 === 0 && styles.cellMajorTop,
                r === grid.rows - 1 && styles.cellMajorBottom
              )}
            >
              {d.nums.map((item) => (
                <span
                  key={item.id}
                  {...stylex.props(styles.clue, rowDone(r) && styles.clueDim, r === hotRow && styles.clueHot)}
                >
                  {item.n}
                </span>
              ))}
            </div>
            {Array.from({ length: grid.cols }, (_, c) => {
              const i = r * grid.cols + c
              const v = cells[i] ?? UNKNOWN
              const label = v === FILLED ? 'filled' : v === MARKED ? 'marked' : 'empty'
              return (
                <button
                  key={i}
                  type="button"
                  data-cell={i}
                  tabIndex={-1}
                  aria-label={`row ${r + 1} column ${c + 1}, ${label}`}
                  onPointerDown={(e) => beginStroke(e, i)}
                  onPointerEnter={() => setHot(i)}
                  onFocus={() => setFocus(i)}
                  {...stylex.props(
                    styles.cell,
                    styles.cellSize(fit.cell),
                    r % 5 === 0 && styles.cellMajorTop,
                    c % 5 === 0 && styles.cellMajorLeft,
                    r === grid.rows - 1 && styles.cellBottom,
                    c === grid.cols - 1 && styles.cellRight,
                    v === FILLED
                      ? styles.cellFilled
                      : i === hot
                        ? styles.cellLive
                        : (r === hotRow || c === hotCol) && styles.cellHot,
                    i === focus && styles.cellFocus,
                    game.done && v === FILLED && styles.cellSolved,
                    game.done && v === FILLED && delay.ms((r + c) * 30)
                  )}
                >
                  {v === MARKED && <XMark />}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )

  const rail = (
    <div {...stylex.props(styles.rail, !wide && styles.railCover)}>
      <div {...stylex.props(styles.tools)}>
        <Segmented
          options={TOOL_LABELS}
          value={TOOL_LABEL_OF[game.tool]}
          onChange={(v) => {
            if (game) publish({ ...game, by: ME, at: Date.now(), tool: TOOL_OF[v] })
          }}
          aria-label="Tool"
        />
      </div>
      <div {...stylex.props(styles.actions, wide && styles.actionsWide)}>
        <Button variant="tinted" onClick={undo} disabled={!game.undo.length || game.screen !== 'play'}>
          <Sym name="undo" /> Undo
        </Button>
        <Button
          variant="tinted"
          onClick={() => clearBoard()}
          disabled={game.screen !== 'play' || !cells.some((c) => c !== UNKNOWN)}
          xstyle={armClear ? (darkMode ? styles.dangerDarkSafe : styles.danger) : undefined}
        >
          <Sym name="trash" /> {armClear ? 'Sure?' : 'Clear'}
        </Button>
        <Button variant="tinted" onClick={() => publish({ ...game, by: ME, at: Date.now(), screen: 'pick' })}>
          <Sym name="grid" /> Puzzles
        </Button>
      </div>
      {wide && (
        <div {...stylex.props(styles.meta)}>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaKey)}>Inked</span>
            <span {...stylex.props(styles.metaVal)}>
              <Num value={prog?.inked} /> / <Num value={prog?.total} />
            </span>
          </div>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaKey)}>Moves</span>
            <span {...stylex.props(styles.metaVal)}>
              <Num value={game.moves} />
            </span>
          </div>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaKey)}>Best</span>
            <span {...stylex.props(styles.metaVal)}>
              {durable.puzzles[game.puzzleId]?.bestTime != null
                ? formatTime(durable.puzzles[game.puzzleId]!.bestTime!)
                : '-'}
            </span>
          </div>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaKey)}>Solves</span>
            <span {...stylex.props(styles.metaVal)}>
              <Num value={durable.puzzles[game.puzzleId]?.solves ?? 0} />
            </span>
          </div>
        </div>
      )}
    </div>
  )

  const picker = (
    <div {...stylex.props(styles.listScroll)}>
      {(['Easy', 'Medium', 'Tricky'] as const).map((tier) => {
        const list = PUZZLES.filter((p) => p.tier === tier)
        if (!list.length) return null
        return (
          <div key={tier}>
            <div {...stylex.props(styles.tierLabel)}>{tier}</div>
            {list.map((p) => {
              const g = gridFor(p)
              const rec = durable.puzzles[p.id]
              const live = p.id === game.puzzleId ? game : null
              const board = live ? live.cells : (rec?.cells ?? freshCells(g))
              const pg = progress(board, g)
              const meta = rec?.done
                ? `Solved${rec.solves > 1 ? ` x${rec.solves}` : ''}${rec.bestTime != null ? ` - best ${formatTime(rec.bestTime)}` : ''}`
                : pg.inked
                  ? `${pg.inked}/${pg.total} inked`
                  : 'Fresh board'
              return (
                <button key={p.id} type="button" onClick={() => choose(p.id)} {...stylex.props(styles.pickRow)}>
                  <div
                    {...stylex.props(
                      styles.preview,
                      styles.gridTemplate(`repeat(${g.cols}, 1fr)`, `repeat(${g.rows}, 1fr)`),
                      styles.cellSize(34)
                    )}
                  >
                    {g.cells.map((w, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: a preview cell's index is its identity
                      <div key={i} {...stylex.props(w ? styles.previewCell : styles.previewGap)} />
                    ))}
                  </div>
                  <div {...stylex.props(styles.pickBody)}>
                    <span {...stylex.props(styles.pickName)}>{p.name}</span>
                    <span {...stylex.props(styles.pickMeta)}>
                      {g.cols} x {g.rows} - {meta}
                    </span>
                  </div>
                  {rec?.done === true && (
                    <span {...stylex.props(check)}>
                      <Sym name="check" />
                    </span>
                  )}
                  {p.id === game.puzzleId && !rec?.done && (
                    <span {...stylex.props(styles.statusDimAccent)}>Resume</span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root, !wide && styles.rootCover)}>
      <div {...stylex.props(styles.head)}>
        <div>
          <div {...stylex.props(styles.kicker)}>Duo Arcade</div>
          <div {...stylex.props(styles.title, !wide && styles.titleCover)}>Nonogram</div>
        </div>
        <div {...stylex.props(styles.chip)}>
          <Num value={solved} /> / <Num value={PUZZLES.length} /> solved
        </div>
      </div>
      <div {...stylex.props(styles.status)}>
        <span {...stylex.props(styles.statusName)}>
          {puzzle.name}
          <span {...stylex.props(styles.statusDim)}>
            {' '}
            - {grid.cols} x {grid.rows}
          </span>
        </span>
        <span {...stylex.props(styles.statusDim)}>
          {game.done ? 'Solved' : elapsedMs != null ? formatTime(elapsedMs) : 'Pick a tool'}
        </span>
      </div>
      {playing ? (
        <div {...stylex.props(styles.stage, wide && styles.stageWide)}>
          {board}
          {rail}
        </div>
      ) : (
        picker
      )}
      {game.done && game.finishedAt != null && playing && (
        <div {...stylex.props(styles.banner)}>
          <div {...stylex.props(styles.bannerCard)}>
            <div {...stylex.props(styles.bannerText)}>
              <span {...stylex.props(styles.kicker)}>Solved</span>
              <span {...stylex.props(styles.bannerTitle)}>{puzzle.name}</span>
              <span {...stylex.props(styles.bannerSub)}>
                {elapsedMs != null ? `in ${formatTime(elapsedMs)} - ` : ''}
                {game.moves} moves
              </span>
            </div>
            <div {...stylex.props(styles.bannerActions)}>
              <Button variant="tinted" onClick={() => clearBoard(true)}>
                Replay
              </Button>
              <Button variant="filled" onClick={nextPuzzle}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<App />)
