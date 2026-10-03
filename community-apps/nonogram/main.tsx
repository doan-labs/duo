import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, IconButton, Num, Push, Sheet, Sym, useDisplay, usePresence, useWide } from '@doan-labs/duo-uikit'
import { animations, dark, delay, light, shared } from '@doan-labs/duo-uikit/styles.ts'
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
    done,
    scored: false
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
  const seeded = liveGame(Date.now(), id, cells, done, 'play')
  // A relaunched solved board reuses the recorded run so the durable writer
  // sees it as already counted instead of scoring a fresh solve.
  if (done && rec?.run) seeded.run = rec.run
  return seeded
}

function XMark({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" {...stylex.props(styles.mark, done && styles.markDone)}>
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
  // publish mirrors every write here before React re-renders, so a stroke or
  // commit landing while the previous publish is still mid-render extends the
  // newest board rather than resurrecting stale cells.
  const gameRef = useRef<SavedGame | null>(null)
  gameRef.current = game
  const [darkMode, setDarkMode] = useState(false)
  const [draft, setDraft] = useState<Cell[] | null>(null)
  const [hot, setHot] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cheered, setCheered] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // The tray yields to the board once dismissed; a new run celebrates again.
  const presence = usePresence(
    !!game?.done && game.finishedAt != null && game.screen === 'play' && cheered !== game.run
  )
  const boardRef = useRef<HTMLDivElement | null>(null)
  const clearBtnRef = useRef<HTMLButtonElement | null>(null)
  const sheetBodyRef = useRef<HTMLDivElement | null>(null)
  const segRefs = useRef(new Map<Tool, HTMLButtonElement>())
  const strokeRef = useRef<{ pid: number; target: Cell; cells: Cell[]; edits: Map<number, Cell> } | null>(null)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)

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
    gameRef.current = next
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
    setConfirming(false)
    gameRef.current = next
    setGame(next)
  }, [saved.value, saved.status, stored.status, durable, publish])

  // The active view alone owns the durable write: per-puzzle marks, ever-solved,
  // solve count and best time. A solve counts once per run: `scored` is set by
  // the copy that finished the board inside the same publish, so the count is
  // decided at commit time and never depends on which display is active when
  // the write lands - folding mid-celebration cannot lose or double a solve.
  useEffect(() => {
    if (!game || !view.active || stored.status === 'hydrating') return
    const prev = durable.puzzles[game.puzzleId]
    const won = game.done && game.scored === true && prev?.run !== game.run
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

  // The clock belongs to the view that is both active and visible: a folded
  // away copy stays `active` by angle but paints nothing, so the interval
  // sleeps with it and snaps the displayed elapsed the moment it is reshown.
  useEffect(() => {
    if (game?.startedAt == null || game.done || !view.active || !view.visible) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [game?.startedAt, game?.done, view.active, view.visible])

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
      const cur = gameRef.current
      if (!cur || !grid) return
      const done = isComplete(nextCells, grid)
      // The fold flush commits through this same path while hidden; a haptic
      // belongs only to a finishing stroke the player is actually touching.
      if (done && !cur.done && view.active && view.visible) navigator.vibrate?.([40, 60, 40])
      publish({
        ...cur,
        by: ME,
        at: Date.now(),
        cells: nextCells,
        undo: entry ? [...cur.undo, entry].slice(-UNDO_CAP) : cur.undo,
        moves: cur.moves + (entry ? 1 : 0),
        startedAt: cur.startedAt ?? (entry ? Date.now() : null),
        finishedAt: done ? (cur.done ? cur.finishedAt : Date.now()) : null,
        done,
        scored: done && (cur.scored || !cur.done)
      })
    },
    [grid, publish, view.active, view.visible]
  )

  function cellFromEvent(e: React.PointerEvent): number {
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]')
    return hit instanceof HTMLElement && boardRef.current?.contains(hit) ? Number(hit.dataset.cell) : -1
  }

  // A stroke keeps its own working copy: pointer events can land faster than
  // React applies the draft state, so every edit must go through the ref, not
  // the last rendered cells array.
  function beginStroke(e: React.PointerEvent, i: number) {
    const cur = gameRef.current
    if (!cur || cur.done || cur.screen !== 'play' || confirming) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    // Untrusted pointer events (automation, pen hover with no active pointer)
    // throw on setPointerCapture; the stroke still works without capture.
    try {
      boardRef.current?.setPointerCapture(e.pointerId)
    } catch {}
    boardRef.current?.focus()
    const target = targetFor(cur.tool, cur.cells[i]!)
    const st = { pid: e.pointerId, target, cells: cur.cells.slice(), edits: new Map<number, Cell>() }
    strokeRef.current = st
    for (const ed of applyCell(st.cells, i, target)) st.edits.set(ed.i, ed.prev)
    setDraft([...st.cells])
    setHot(i)
    setFocus(i)
  }

  function moveStroke(e: React.PointerEvent) {
    const st = strokeRef.current
    if (!st || !gameRef.current) return
    const i = cellFromEvent(e)
    if (!Number.isInteger(i) || i < 0 || i >= st.cells.length) return
    setHot(i)
    if (st.edits.has(i)) return
    for (const ed of applyCell(st.cells, i, st.target)) st.edits.set(ed.i, ed.prev)
    setDraft([...st.cells])
    setFocus(i)
  }

  // endStroke doubles as the flush a fold or window blur calls: the drag's
  // cells are committed rather than dropped, and the pointer capture is
  // released so it cannot strand the copy that is about to sleep.
  const endStroke = useCallback(() => {
    const st = strokeRef.current
    strokeRef.current = null
    setDraft(null)
    if (st && boardRef.current?.hasPointerCapture(st.pid)) boardRef.current.releasePointerCapture(st.pid)
    if (!st || !gameRef.current) return
    if (!st.edits.size) return
    const edits: Edit = [...st.edits].map(([i, prev]) => ({ i, prev }))
    commit([...st.cells], { applied: st.target, edits })
  }, [commit])

  // Flush on hide and on window blur; the peer adopts the committed cells.
  useEffect(() => {
    if (!view.visible) endStroke()
  }, [view.visible, endStroke])
  useEffect(() => {
    const flush = () => endStroke()
    window.addEventListener('blur', flush)
    return () => window.removeEventListener('blur', flush)
  }, [endStroke])

  function applyFocused(i: number) {
    const cur = gameRef.current
    if (!cur || cur.done || strokeRef.current || confirming) return
    const target = targetFor(cur.tool, cur.cells[i]!)
    const next = cur.cells.slice()
    const edits = applyCell(next, i, target)
    if (edits.length) commit(next, { applied: target, edits })
  }

  function undo() {
    const cur = gameRef.current
    if (!cur || !grid || !cur.undo.length || strokeRef.current || confirming) return
    const entry = cur.undo.at(-1)!
    const next = cur.cells.slice()
    undoOnce(next, entry)
    const done = isComplete(next, grid)
    publish({
      ...cur,
      by: ME,
      at: Date.now(),
      cells: next,
      undo: cur.undo.slice(0, -1),
      moves: cur.moves + 1,
      finishedAt: done ? (cur.done ? cur.finishedAt : Date.now()) : null,
      done,
      scored: done && (cur.scored || !cur.done)
    })
  }

  // The Sheet owns the confirmation; Clear itself is one undoable edit,
  // never a silent wipe.
  function clearBoard() {
    const cur = gameRef.current
    if (!cur || !grid) return
    const edits: Edit = []
    cur.cells.forEach((c, i) => {
      if (c !== UNKNOWN) edits.push({ i, prev: c })
    })
    publish({
      ...cur,
      by: ME,
      at: Date.now(),
      run: crypto.randomUUID(),
      cells: freshCells(grid),
      undo: edits.length ? [...cur.undo, { applied: UNKNOWN as Cell, edits }].slice(-UNDO_CAP) : cur.undo,
      moves: cur.moves + (edits.length ? 1 : 0),
      startedAt: null,
      finishedAt: null,
      done: false,
      scored: false
    })
  }

  // Opening the confirm sheet flushes any in-flight drag first: pointer
  // capture routes moves to the board even under the scrim.
  function askClear() {
    endStroke()
    setConfirming(true)
  }

  // Cancel, Escape and the scrim hand focus back to the Clear that opened
  // the sheet; confirming it moves focus to the board, since a wiped board
  // disables the trigger.
  const closeSheet = useCallback((dest: 'trigger' | 'board') => {
    setConfirming(false)
    const target = dest === 'trigger' ? clearBtnRef.current : boardRef.current
    requestAnimationFrame(() => target?.focus())
  }, [])

  // The pre-connect window guard only needs a live callback while the
  // confirm sheet is open; elsewhere Escape falls through to the shell's
  // go-home, so library and board leave the key alone.
  useEffect(() => {
    escapeBack = confirming ? () => closeSheet('trigger') : null
    return () => {
      escapeBack = null
    }
  }, [confirming, closeSheet])

  // Tab stays inside the sheet's own controls; the inert background is the
  // second line of defence behind this wrap.
  function sheetKeys(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !sheetBodyRef.current) return
    const items = [...sheetBodyRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)')]
    if (!items.length) return
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (at === -1) {
      e.preventDefault()
      ;(e.shiftKey ? items.at(-1)! : items[0]!).focus()
    } else if (e.shiftKey && at === 0) {
      e.preventDefault()
      items.at(-1)!.focus()
    } else if (!e.shiftKey && at === items.length - 1) {
      e.preventDefault()
      items[0]!.focus()
    }
  }

  // One tab stop for the tool group: arrows and Home/End rove selection and
  // focus together, the native segmented-control contract.
  function segKeys(e: React.KeyboardEvent) {
    const cur = gameRef.current
    if (!cur) return
    const tools = TOOL_LABELS.map((l) => TOOL_OF[l])
    const at = tools.indexOf(cur.tool)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (at + 1) % tools.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (at - 1 + tools.length) % tools.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tools.length - 1
    if (next < 0) return
    e.preventDefault()
    const tool = tools[next]!
    publish({ ...cur, by: ME, at: Date.now(), tool })
    segRefs.current.get(tool)?.focus()
  }

  function choose(id: string) {
    const cur = gameRef.current
    if (!cur) return
    if (id === cur.puzzleId) {
      publish({ ...cur, by: ME, at: Date.now(), screen: 'play' })
      return
    }
    const p = BY_ID.get(id)
    if (!p) return
    const g = gridFor(p)
    const rec = durable.puzzles[id]
    const nextCells = rec && rec.cells.length === g.cells.length ? [...rec.cells] : freshCells(g)
    const done = isComplete(nextCells, g) && rec?.done === true
    publish({ ...liveGame(Date.now(), id, nextCells, done, 'play'), tool: cur.tool })
  }

  function nextPuzzle() {
    if (!game) return
    const at = PUZZLES.findIndex((p) => p.id === game.puzzleId)
    const rest = [...PUZZLES.slice(at + 1), ...PUZZLES.slice(0, at + 1)]
    const open = rest.find((p) => !durable.puzzles[p.id]?.done) ?? rest[0]!
    choose(open.id)
  }

  function onBoardKey(e: React.KeyboardEvent) {
    if (!game || !grid || game.screen !== 'play' || confirming) return
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
      if (label) publish({ ...(gameRef.current ?? game), by: ME, at: Date.now(), tool: TOOL_OF[label] })
    } else return
    e.preventDefault()
    if (next !== i) {
      setFocus(next)
      setHot(next)
    }
  }

  if (!game || !grid || !clueSet || !fit || !puzzle)
    return <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root)} />

  const playing = game.screen === 'play'
  const marks = cells.filter((c) => c !== UNKNOWN).length
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
                {...stylex.props(
                  styles.clue,
                  (colDone(c) || game.done) && styles.clueDim,
                  c === hotCol && styles.clueHot
                )}
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
                  {...stylex.props(
                    styles.clue,
                    (rowDone(r) || game.done) && styles.clueDim,
                    r === hotRow && styles.clueHot
                  )}
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
                        : (r === hotRow || c === hotCol) && !game.done && styles.cellHot,
                    i === focus && !game.done && styles.cellFocus,
                    game.done && styles.cellDone,
                    game.done && v === FILLED && styles.cellSolved,
                    game.done && v === FILLED && delay.ms((r + c) * 30)
                  )}
                >
                  {v === MARKED && <XMark done={game.done} />}
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
      {wide && <div {...stylex.props(styles.railLabel)}>Editing</div>}
      <div {...stylex.props(styles.toolBar)}>
        <div role="radiogroup" aria-label="Tool" onKeyDown={segKeys} {...stylex.props(styles.segTrack)}>
          {TOOL_LABELS.map((label) => {
            const tool = TOOL_OF[label]
            return (
              <button
                key={tool}
                ref={(el) => {
                  if (el) segRefs.current.set(tool, el)
                  else segRefs.current.delete(tool)
                }}
                type="button"
                role="radio"
                aria-checked={game.tool === tool}
                tabIndex={game.tool === tool ? 0 : -1}
                onClick={() => publish({ ...(gameRef.current ?? game), by: ME, at: Date.now(), tool })}
                {...stylex.props(styles.segBtn, shared.press, game.tool === tool && styles.segOn)}
              >
                {label}
              </button>
            )
          })}
        </div>
        <IconButton
          name="undo"
          variant="tinted"
          aria-label="Undo last move"
          onClick={undo}
          disabled={!game.undo.length || game.screen !== 'play'}
          xstyle={styles.undoBtn}
        />
      </div>
      {wide && <div {...stylex.props(styles.railLabel)}>Board</div>}
      <div {...stylex.props(styles.actions, wide && styles.actionsWide)}>
        <Button
          ref={clearBtnRef}
          variant="tinted"
          onClick={askClear}
          disabled={game.screen !== 'play' || !cells.some((c) => c !== UNKNOWN)}
          xstyle={[!wide && styles.actBtn, styles.bigBtn]}
        >
          <Sym name="trash" /> Clear
        </Button>
      </div>
      {wide && <div {...stylex.props(styles.railLabel)}>Progress</div>}
      {wide && (
        <div {...stylex.props(styles.meta)}>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaKey)}>Time</span>
            <span {...stylex.props(styles.metaVal)}>{elapsedMs != null ? formatTime(elapsedMs) : '-'}</span>
          </div>
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

  // List rows settle down in a short stagger; the counter walks across tiers
  // so the whole list reads as one entrance, not three.
  let rowStagger = 0
  const picker = (
    <div {...stylex.props(styles.listScroll)}>
      {(['Easy', 'Medium', 'Tricky'] as const).map((tier) => {
        const list = PUZZLES.filter((p) => p.tier === tier)
        if (!list.length) return null
        return (
          <div key={tier}>
            <div {...stylex.props(styles.tierLabel)}>{tier}</div>
            <div {...stylex.props(styles.pickGroup)}>
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
                const stagger = rowStagger++
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choose(p.id)}
                    {...stylex.props(styles.pickRow, shared.select, animations.row, delay.ms(stagger * 30))}
                  >
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
                    {rec?.done === true ? (
                      <span {...stylex.props(check)}>
                        <Sym name="check" />
                      </span>
                    ) : (
                      !rec?.done && pg.inked > 0 && <span {...stylex.props(styles.statusDimAccent)}>Resume</span>
                    )}
                    <span {...stylex.props(styles.pickChev)}>
                      <Sym name="forward" size={13} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  // The library is the root page; a board pushes over it through the kit's
  // stack transition, and pops back out on the leading chevron or Escape.
  const pickerPage = (
    <div {...stylex.props(styles.page, !wide && styles.pageCover)}>
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
        <span {...stylex.props(styles.statusName)}>Puzzle library</span>
        <span {...stylex.props(styles.statusDim)}>Tap a board to play</span>
      </div>
      {picker}
    </div>
  )

  const boardPage = (
    <div {...stylex.props(styles.page, !wide && styles.pageCover)}>
      <div {...stylex.props(styles.backRow)}>
        <button
          type="button"
          aria-label="Back to library"
          onClick={() => publish({ ...(gameRef.current ?? game), by: ME, at: Date.now(), screen: 'pick' })}
          {...stylex.props(styles.bkBtn, shared.press)}
        >
          <Sym name="back" size={20} />
        </button>
        <span {...stylex.props(styles.statusName)}>
          {puzzle.name}
          <span {...stylex.props(styles.statusDim)}>
            {' '}
            - {grid.cols} x {grid.rows}
          </span>
        </span>
        <span
          {...stylex.props(styles.statusRight, game.done || elapsedMs != null ? styles.statusTime : styles.statusDim)}
        >
          {game.done ? 'Solved' : elapsedMs != null ? formatTime(elapsedMs) : 'Pick a tool'}
        </span>
      </div>
      <div {...stylex.props(styles.stage, wide && styles.stageWide)}>
        {board}
        {rail}
      </div>
      {presence.mounted && (
        <div {...stylex.props(styles.banner)}>
          <div {...stylex.props(styles.bannerCard, presence.closing ? animations.floatOut : animations.float)}>
            <div {...stylex.props(styles.bannerText)}>
              <span {...stylex.props(styles.kicker)}>Solved</span>
              <span {...stylex.props(styles.bannerTitle)}>{puzzle.name}</span>
              <span {...stylex.props(styles.bannerSub)}>
                {elapsedMs != null ? `in ${formatTime(elapsedMs)} - ` : ''}
                {game.moves} moves
              </span>
            </div>
            <div {...stylex.props(styles.bannerActions)}>
              <Button variant="tinted" onClick={clearBoard} xstyle={styles.bigBtn}>
                Replay
              </Button>
              <Button variant="filled" onClick={nextPuzzle} xstyle={styles.bigBtn}>
                Next
              </Button>
              <IconButton
                name="xmark"
                variant="plain"
                aria-label="Dismiss celebration"
                onClick={() => setCheered(game.run)}
                xstyle={styles.undoBtn}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root)}>
      <div {...stylex.props(styles.navWrap)} inert={confirming}>
        <Push open={playing} sheet={boardPage}>
          {pickerPage}
        </Push>
      </div>
      <Sheet
        open={confirming}
        onClose={() => closeSheet('trigger')}
        onKeyDown={sheetKeys}
        aria-label="Clear board confirmation"
      >
        <div ref={sheetBodyRef} {...stylex.props(styles.sheetPad)}>
          <div {...stylex.props(styles.sheetTitle)}>Clear board?</div>
          <div {...stylex.props(styles.sheetMsg)}>
            Erases {marks} {marks === 1 ? 'mark' : 'marks'} on {puzzle.name}. Undo can bring them back.
          </div>
          <div {...stylex.props(styles.sheetActs)}>
            <Button variant="tinted" xstyle={styles.bigBtn} onClick={() => closeSheet('trigger')}>
              Cancel
            </Button>
            <Button
              variant="tinted"
              xstyle={[styles.bigBtn, styles.danger]}
              onClick={() => {
                closeSheet('board')
                clearBoard()
              }}
            >
              Clear board
            </Button>
          </div>
        </div>
      </Sheet>
    </main>
  )
}

// Registered before os.connect() so it fires ahead of the SDK's Escape-to-home
// forward: while the confirm sheet is open, Escape cancels it inside the app.
// Everywhere else the event passes through and still goes home.
let escapeBack: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !escapeBack) return
    event.preventDefault()
    event.stopImmediatePropagation()
    escapeBack()
  },
  true
)

await os.connect()
createRoot(document.body).render(<App />)
