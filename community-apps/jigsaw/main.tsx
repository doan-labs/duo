import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, IconButton, Segmented, Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ARTS, type ArtId, artUri, isArtId } from './art.ts'
import { cue, setMuted, unlock } from './audio.ts'
import { type BoardApi, BoardPane, type BoardView, fitView, PieceThumb, TrayPane } from './board.tsx'
import {
  BOARD_H,
  BOARD_W,
  COUNTS,
  type Count,
  collectBoard,
  configKey,
  elapsedMs,
  formatTime,
  type Game,
  liveOf,
  looseCount,
  newGame,
  parseLive,
  parseSaves,
  placeAt,
  placedCount,
  resetGame,
  sendToTray,
  serializeSaves
} from './puzzle.ts'
import { styles } from './styles.ts'

// Both displays share one session key; a write this copy did not make is the
// newer settled game, so adopting it unconditionally converges the pair -
// including the race where both seed at once.
const ME = crypto.randomUUID()
const LIVE_KEY = 'jigsaw-live'
const SAVES_KEY = 'jigsaw-saves'
const PREFS_KEY = 'jigsaw-prefs'

type Filter = 'all' | 'corner' | 'edge'
type Prefs = { art: ArtId; count: Count; muted: boolean; guide: boolean }
const PREFS0: Prefs = { art: 'harbour', count: 12, muted: false, guide: true }

function cleanPrefs(raw: string | null): Prefs {
  try {
    const v: unknown = raw ? JSON.parse(raw) : {}
    if (typeof v !== 'object' || v === null) return PREFS0
    const o = v as Record<string, unknown>
    const art = isArtId(o.art) ? o.art : PREFS0.art
    const count = (COUNTS as readonly number[]).includes(o.count as number) ? (o.count as Count) : PREFS0.count
    return { art, count, muted: o.muted === true, guide: o.guide !== false }
  } catch {
    return PREFS0
  }
}

type Drag = { id: number; x: number; y: number; sx: number; sy: number; moved: boolean; grabX: number; grabY: number }
type Pt = { x: number; y: number }

// Stable decorative keys for the completion confetti.
const CONFETTI_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n']

// The Escape guard is registered before os.connect() so it fires ahead of the
// SDK's Escape-to-home forward: while a question or a held piece is open,
// Escape settles the app first; at all other times it still goes home.
let escapeTop: (() => boolean) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !escapeTop?.()) return
    event.preventDefault()
    event.stopImmediatePropagation()
  },
  true
)

function Jigsaw() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>(560)
  const cover = !wide

  const live = useKV(os.session, LIVE_KEY)
  const savesKV = useKV(os.storage, SAVES_KEY)
  const prefsKV = useKV(os.storage, PREFS_KEY)
  const savesRaw = useRef<string | null>(null)
  savesRaw.current = savesKV.value

  const [prefs, setPrefsState] = useState<Prefs | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [held, setHeld] = useState<number | null>(null)
  const [heldPos, setHeldPos] = useState<Pt | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [boardView, setBoardView] = useState<BoardView>(fitView())
  const [pane, setPane] = useState<'board' | 'pieces'>('board')
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmReset, setConfirmReset] = useState(false)
  const [picker, setPicker] = useState(false)
  const [veilDown, setVeilDown] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const gameRef = useRef(game)
  gameRef.current = game
  const heldRef = useRef(held)
  heldRef.current = held
  const heldPosRef = useRef(heldPos)
  heldPosRef.current = heldPos
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const sheetOpen = picker || confirmReset
  const sheetRef = useRef(sheetOpen)
  sheetRef.current = sheetOpen
  const dragRef = useRef<Drag | null>(null)
  const boardApi = useRef<BoardApi | null>(null)
  const railEl = useRef<HTMLElement | null>(null)
  const seeded = useRef(false)
  const gameKeyRef = useRef('')
  const liveRawRef = useRef<string | null>(null)

  const cw = game ? BOARD_W / game.cols : 1
  const ch = game ? BOARD_H / game.rows : 1
  const artUriNow = game && isArtId(game.art) ? artUri(game.art) : ''
  const finished = !!game?.finishedAt
  const placed = game ? placedCount(game) : 0

  // ---- shared state ----

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Session mirror adoption: a value this copy did not write is the settled
  // game from the other display. The raw-string guard keeps echoes of this
  // copy's own writes from re-firing.
  useEffect(() => {
    if (live.status !== 'ready') return
    const raw = live.value
    if (raw === liveRawRef.current) return
    liveRawRef.current = raw
    const doc = parseLive(raw)
    if (!doc || doc.by === ME) return
    setGame(doc.game)
    setHeld(doc.held)
    setHeldPos(null)
    const key = `${doc.game.art}:${doc.game.count}:${doc.game.seed}`
    if (key !== gameKeyRef.current) {
      gameKeyRef.current = key
      setBoardView(fitView())
      setVeilDown(false)
      setFilter('all')
    }
  }, [live.value, live.status])

  const publish = useCallback(
    (next: Game, heldId: number | null) => {
      setGame(next)
      setHeld(heldId)
      live.set(liveOf(ME, next, heldId))
      const key = configKey(next.art, next.count)
      const saves = parseSaves(savesRaw.current)
      saves.games[key] = next
      saves.current = key
      savesKV.set(serializeSaves(saves))
    },
    [live, savesKV]
  )

  // Prefs hydrate and follow the other display's switches (mute especially).
  useEffect(() => {
    if (prefsKV.status !== 'ready') return
    const next = cleanPrefs(prefsKV.value)
    setPrefsState((cur) => (cur && JSON.stringify(cur) === JSON.stringify(next) ? cur : next))
    setMuted(next.muted)
  }, [prefsKV.value, prefsKV.status])

  const setPrefs = useCallback(
    (patch: Partial<Prefs>) => {
      setPrefsState((cur) => {
        const next = { ...(cur ?? PREFS0), ...patch }
        prefsKV.set(JSON.stringify(next))
        setMuted(next.muted)
        return next
      })
    },
    [prefsKV]
  )

  // First-open seeding: durable saves carry progress across relaunches; a live
  // doc already there (fresh fold) wins over storage.
  useEffect(() => {
    if (savesKV.status !== 'ready' || live.status !== 'ready' || !prefs || seeded.current) return
    seeded.current = true
    const remote = parseLive(live.value)
    if (remote) {
      gameKeyRef.current = `${remote.game.art}:${remote.game.count}:${remote.game.seed}`
      setGame(remote.game)
      setHeld(remote.held)
      return
    }
    const saves = parseSaves(savesKV.value)
    const key = configKey(prefs.art, prefs.count)
    const g = saves.games[key] ?? newGame(prefs.art, prefs.count, (Math.random() * 2 ** 31) | 0)
    publish(g, null)
  }, [savesKV.status, savesKV.value, live.status, live.value, prefs, publish])

  // Device dark-mode switch; the shell applies the real class natively.
  useEffect(() => os.device.on('switches', (sw: { darkMode: boolean }) => setDarkMode(sw.darkMode)), [])

  // A fold hides this copy mid-gesture: cancel the in-flight drag so the
  // follow-up pointerup cannot drop the piece loose on the felt.
  useEffect(() => {
    if (view.active || !dragRef.current) return
    dragRef.current = null
    setDrag(null)
  }, [view.active])

  // Elapsed clock: derives from startedAt so both displays agree; ticks only
  // on the visible copy and stops at completion.
  useEffect(() => {
    if (!view.active || !game || game.finishedAt !== null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [view.active, game])

  // Audio unlock rides the first real gesture anywhere in the app.
  useEffect(() => {
    const on = () => unlock()
    addEventListener('pointerdown', on, true)
    addEventListener('keydown', on, true)
    return () => {
      removeEventListener('pointerdown', on, true)
      removeEventListener('keydown', on, true)
    }
  }, [])

  // Escape settles app UI in order: sheet (handled by Sheet itself), then a
  // held piece returns to where it came from. Nothing stops the pass-through.
  useEffect(() => {
    escapeTop = () => {
      if (sheetRef.current) return false
      if (heldRef.current !== null) {
        setHeld(null)
        setHeldPos(null)
        const g = gameRef.current
        if (g) live.set(liveOf(ME, g, null))
        return true
      }
      return false
    }
    return () => {
      escapeTop = null
    }
  }, [live])

  // ---- actions ----

  const dropAt = useCallback(
    (id: number, x: number, y: number) => {
      const g = gameRef.current
      if (!g) return
      const res = placeAt(g, id, x, y, Date.now())
      if (res.game === g) {
        setHeld(null)
        return
      }
      const finishedNow = res.game.finishedAt !== null && g.finishedAt === null
      publish(res.game, null)
      setHeldPos(null)
      cue(finishedNow ? 'done' : res.snapped ? 'snap' : 'drop')
    },
    [publish]
  )

  const holdPiece = useCallback(
    (id: number) => {
      const g = gameRef.current
      const p = g?.pieces[id]
      if (!g || !p || p.z === 2 || g.finishedAt !== null) return
      const w = BOARD_W / g.cols
      const h = BOARD_H / g.rows
      unlock()
      cue('lift')
      setHeld(id)
      setHeldPos(p.z === 1 ? { x: p.x, y: p.y } : { x: BOARD_W / 2 - w / 2, y: BOARD_H / 2 - h / 2 })
      live.set(liveOf(ME, g, id))
      if (cover) setPane('board')
    },
    [cover, live]
  )

  const beginDrag = useCallback((id: number, clientX: number, clientY: number) => {
    const g = gameRef.current
    const p = g?.pieces[id]
    if (!g || !p || p.z === 2 || g.finishedAt !== null) return
    const w = BOARD_W / g.cols
    const h = BOARD_H / g.rows
    let grabX = w / 2
    let grabY = h / 2
    if (p.z === 1) {
      const pt = boardApi.current?.toBoard(clientX, clientY)
      if (pt) {
        grabX = pt.x - p.x
        grabY = pt.y - p.y
      }
    }
    unlock()
    cue('lift')
    dragRef.current = { id, x: clientX, y: clientY, sx: clientX, sy: clientY, moved: false, grabX, grabY }
    setDrag(dragRef.current)
  }, [])

  // Pressing a tray option picks its piece up; pressing the already-held
  // piece's own option drops it at the ghost position.
  const pressPiece = useCallback(
    (id: number, pt: { x: number; y: number } | null) => {
      if (pt) {
        beginDrag(id, pt.x, pt.y)
        return
      }
      if (heldRef.current === id && heldPosRef.current) {
        dropAt(id, heldPosRef.current.x, heldPosRef.current.y)
        return
      }
      holdPiece(id)
    },
    [beginDrag, dropAt, holdPiece]
  )

  // TrayPane reports the raw pointer event; a keyboard press carries no point.
  const trayPress = useCallback(
    (id: number, e: { clientX?: number; clientY?: number }) =>
      pressPiece(id, typeof e.clientX === 'number' ? { x: e.clientX, y: e.clientY ?? 0 } : null),
    [pressPiece]
  )

  // Arrow-key placement and Enter-to-drop for the held piece; Backspace sends
  // a held board piece back to the tray.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hid = heldRef.current
      const g = gameRef.current
      if (hid === null || !g) return
      const w = BOARD_W / g.cols
      const h = BOARD_H / g.rows
      const step = e.shiftKey ? 1 : 6
      const cur = heldPosRef.current ?? { x: BOARD_W / 2 - w / 2, y: BOARD_H / 2 - h / 2 }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = { ...cur }
        if (e.key === 'ArrowLeft') next.x = cur.x - step
        if (e.key === 'ArrowRight') next.x = cur.x + step
        if (e.key === 'ArrowUp') next.y = cur.y - step
        if (e.key === 'ArrowDown') next.y = cur.y + step
        setHeldPos(next)
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        dropAt(hid, cur.x, cur.y)
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const p = g.pieces[hid]
        if (p && p.z === 1) {
          e.preventDefault()
          const next = sendToTray(g, hid)
          publish(next, null)
          cue('drop')
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dropAt, publish])

  // One pair of window listeners carries every drag: a tap that never moves is
  // a pick-up, a moved pointer drops on the board or the rail.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
      const next = { ...d, moved: true, x: e.clientX, y: e.clientY }
      dragRef.current = next
      setDrag(next)
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      setDrag(null)
      const g = gameRef.current
      if (!g) return
      if (!d.moved) {
        holdPiece(d.id)
        return
      }
      const api = boardApi.current
      if (api?.contains(e.clientX, e.clientY)) {
        const pt = api.toBoard(e.clientX, e.clientY)
        if (pt) dropAt(d.id, pt.x - d.grabX, pt.y - d.grabY)
        return
      }
      const rail = railEl.current?.getBoundingClientRect()
      if (
        rail &&
        e.clientX >= rail.left &&
        e.clientX <= rail.right &&
        e.clientY >= rail.top &&
        e.clientY <= rail.bottom &&
        g.pieces[d.id]?.z === 1
      ) {
        publish(sendToTray(g, d.id), null)
        cue('drop')
        return
      }
      // A drop outside both targets cancels; a held piece stays held.
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dropAt, holdPiece, publish])

  const chooseConfig = useCallback(
    (art: ArtId, count: Count) => {
      const key = configKey(art, count)
      const saves = parseSaves(savesRaw.current)
      const g = saves.games[key] ?? newGame(art, count, (Math.random() * 2 ** 31) | 0)
      setPrefs({ art, count })
      publish(g, null)
      setHeldPos(null)
      setBoardView(fitView())
      setVeilDown(false)
      setPane('board')
      gameKeyRef.current = `${key}:${g.seed}`
    },
    [publish, setPrefs]
  )

  const doReset = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    publish(resetGame(g, (Math.random() * 2 ** 31) | 0), null)
    setHeldPos(null)
    setBoardView(fitView())
    setVeilDown(false)
    setConfirmReset(false)
  }, [publish])

  const doCollect = useCallback(() => {
    const g = gameRef.current
    if (!g || looseCount(g) === 0) return
    publish(collectBoard(g), heldRef.current)
    cue('drop')
  }, [publish])

  const toggleMute = useCallback(() => {
    unlock()
    setPrefs({ muted: !(prefsRef.current?.muted ?? false) })
    cue('drop')
  }, [setPrefs])

  // ---- render ----

  const preview = useMemo(() => {
    if (!game) return null
    if (drag?.moved && boardApi.current?.contains(drag.x, drag.y)) {
      const pt = boardApi.current.toBoard(drag.x, drag.y)
      if (pt) return { id: drag.id, x: pt.x - drag.grabX, y: pt.y - drag.grabY }
      return null
    }
    if (held !== null && heldPos) return { id: held, x: heldPos.x, y: heldPos.y }
    if (held !== null) {
      const p = game.pieces[held]
      if (p && p.z === 1) return { id: held, x: p.x, y: p.y }
    }
    return null
  }, [game, drag, held, heldPos])

  if (!prefs || !game) {
    return <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root)} />
  }

  const art = ARTS.find((a) => a.id === (game.art as ArtId)) ?? ARTS[0]!

  const collectBtn = (
    <button
      type="button"
      {...stylex.props(styles.action, shared.press)}
      onClick={doCollect}
      disabled={looseCount(game) === 0}
    >
      Collect board pieces
    </button>
  )

  const boardEl = (
    <BoardPane
      api={boardApi}
      game={game}
      art={artUriNow}
      guide={prefs.guide && !finished}
      heldId={held}
      preview={preview}
      ghostOf={drag?.moved ? drag.id : held !== null && game.pieces[held]?.z === 1 ? held : null}
      finished={finished}
      view={boardView}
      onView={setBoardView}
      onPieceDown={(id, e) => beginDrag(id, e.clientX, e.clientY)}
      onPieceKey={(id, e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (held === id)
            dropAt(id, heldPosRef.current?.x ?? game.pieces[id]!.x, heldPosRef.current?.y ?? game.pieces[id]!.y)
          else holdPiece(id)
        }
      }}
      onBoardTap={(pt) => {
        if (held !== null) dropAt(held, pt.x - cw / 2, pt.y - ch / 2)
      }}
      onHover={(pt) => {
        if (held !== null && pt) setHeldPos({ x: pt.x - cw / 2, y: pt.y - ch / 2 })
      }}
    >
      {held !== null ? (
        <div {...stylex.props(styles.heldCard)} role="status">
          <div {...stylex.props(styles.heldThumb)}>
            <PieceThumb game={game} i={held} art={artUriNow} px={44} />
          </div>
          <div {...stylex.props(styles.heldText)}>
            <span {...stylex.props(styles.heldTitle)}>Piece {held + 1} picked up</span>
            <span {...stylex.props(styles.heldSub)}>Tap the board to place it, or nudge with arrow keys.</span>
          </div>
          <button
            type="button"
            aria-label="Put piece back"
            {...stylex.props(styles.heldCancel, shared.press)}
            onClick={() => {
              const g = gameRef.current
              setHeld(null)
              setHeldPos(null)
              if (g) live.set(liveOf(ME, g, null))
            }}
          >
            <Sym name="close" size={11} />
          </button>
        </div>
      ) : null}
      {finished && !veilDown ? (
        <div {...stylex.props(styles.veil)}>
          {CONFETTI_IDS.map((id, i) => (
            <span key={id} {...stylex.props(styles.confetti, styles.confettiAt(i))} />
          ))}
          <div {...stylex.props(styles.veilCard)} role="alertdialog" aria-label="Puzzle complete">
            <span {...stylex.props(styles.veilKicker)}>Complete</span>
            <span {...stylex.props(styles.veilTitle)}>{art.name}</span>
            <span {...stylex.props(styles.veilSub)}>
              {game.count} pieces · {formatTime(elapsedMs(game, now))} · {game.moves} moves
            </span>
            <div {...stylex.props(styles.veilActions)}>
              <button type="button" {...stylex.props(styles.veilBtn, shared.press)} onClick={() => setVeilDown(true)}>
                Keep looking
              </button>
              <button
                type="button"
                {...stylex.props(styles.veilBtn, styles.veilBtnAccent, shared.press)}
                onClick={() => {
                  setVeilDown(false)
                  setPicker(true)
                }}
              >
                Next puzzle
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BoardPane>
  )

  return (
    <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Jigsaw</span>
          <h1 {...stylex.props(styles.title, cover && styles.titleCover)}>{art.name}</h1>
        </div>
        <div {...stylex.props(styles.headerSide)}>
          <span {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipValue)}>{placed}</span>/{game.pieces.length}
          </span>
          {!cover ? (
            <span {...stylex.props(styles.chip)}>
              <span {...stylex.props(styles.chipValue)}>{formatTime(elapsedMs(game, now))}</span>
            </span>
          ) : null}
          <IconButton
            name={prefs.guide ? 'eye' : 'eyeSlash'}
            variant="round"
            aria-label={prefs.guide ? 'Hide picture guide' : 'Show picture guide'}
            aria-pressed={prefs.guide}
            onClick={() => setPrefs({ guide: !prefs.guide })}
          />
          <IconButton
            name="volume"
            variant="round"
            aria-label={prefs.muted ? 'Unmute sounds' : 'Mute sounds'}
            aria-pressed={prefs.muted}
            xstyle={prefs.muted ? styles.iconBtnWarn : undefined}
            onClick={toggleMute}
          />
          <IconButton
            name="reload"
            variant="round"
            aria-label="Start this puzzle over"
            onClick={() => setConfirmReset(true)}
          />
          <IconButton name="photo" variant="round" aria-label="Choose a puzzle" onClick={() => setPicker(true)} />
        </div>
      </header>

      {cover ? (
        <div {...stylex.props(styles.segWrap)}>
          <Segmented
            options={['Board', 'Pieces'] as const}
            value={pane === 'board' ? 'Board' : 'Pieces'}
            onChange={(v: 'Board' | 'Pieces') => setPane(v === 'Board' ? 'board' : 'pieces')}
            xstyle={styles.segFill}
            aria-label="Board or tray"
          />
        </div>
      ) : null}

      <section {...stylex.props(styles.stage, cover && styles.stageCover)}>
        {cover ? (
          pane === 'board' ? (
            boardEl
          ) : (
            <TrayPane
              game={game}
              art={artUriNow}
              filter={filter}
              onFilter={setFilter}
              heldId={held}
              onPress={trayPress}
              railRef={railEl}
              compact
              action={collectBtn}
            />
          )
        ) : (
          <>
            {boardEl}
            <TrayPane
              game={game}
              art={artUriNow}
              filter={filter}
              onFilter={setFilter}
              heldId={held}
              onPress={trayPress}
              railRef={railEl}
              compact={false}
              action={collectBtn}
            />
          </>
        )}
      </section>

      {cover ? (
        <p {...stylex.props(styles.hint)}>
          {held !== null
            ? 'Tap the board where it fits, or press Esc to put it back.'
            : 'Tap a piece in Pieces, then tap the board to place it.'}
        </p>
      ) : null}

      <Sheet open={picker} onClose={() => setPicker(false)} aria-label="Choose a puzzle">
        <div {...stylex.props(styles.sheetBody)}>
          <div {...stylex.props(styles.artRow)} role="radiogroup" aria-label="Picture">
            {ARTS.map((a) => {
              const key = configKey(a.id, prefs.count)
              const saved = parseSaves(savesKV.value).games[key]
              const done = saved?.finishedAt !== null && !!saved
              const prog = saved ? placedCount(saved) : 0
              return (
                // biome-ignore lint/a11y/useSemanticElements: a card with a thumbnail cannot be an input[type=radio]
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.art === a.id}
                  {...stylex.props(styles.artCard, shared.press, prefs.art === a.id && styles.artCardOn)}
                  onClick={() => setPrefs({ art: a.id })}
                >
                  <img {...stylex.props(styles.artThumb)} src={artUri(a.id)} alt="" />
                  <span {...stylex.props(styles.artName)}>{a.name}</span>
                  <span {...stylex.props(styles.artMeta)}>
                    {saved ? (done ? 'Solved' : `${prog}/${saved.pieces.length} placed`) : 'New'}
                  </span>
                </button>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Piece count" {...stylex.props(styles.segTrack, styles.segFill)}>
            {COUNTS.map((n) => (
              // biome-ignore lint/a11y/useSemanticElements: Segmented-style labelled segments, not bare inputs
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={prefs.count === n}
                {...stylex.props(styles.segBtn, shared.press, prefs.count === n && styles.segOn)}
                onClick={() => setPrefs({ count: n })}
              >
                {n} pieces
              </button>
            ))}
          </div>
          <div {...stylex.props(styles.confirmActions)}>
            <Button variant="tinted" onClick={() => setPicker(false)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                if (prefs.art !== game.art || prefs.count !== game.count) chooseConfig(prefs.art, prefs.count)
                setPicker(false)
              }}
            >
              {configKey(prefs.art, prefs.count) === configKey(game.art, game.count) ? 'Keep playing' : 'Play'}
            </Button>
          </div>
        </div>
      </Sheet>

      {drag?.moved ? (
        <div
          {...stylex.props(
            styles.ghost,
            styles.ghostAt(drag.x, drag.y, Math.max(30, (BOARD_W / game.cols) * (boardApi.current?.scale() || 1) * 1.6))
          )}
          aria-hidden="true"
        >
          <PieceThumb game={game} i={drag.id} art={artUriNow} px={1000} />
        </div>
      ) : null}

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} aria-label="Start over">
        <div {...stylex.props(styles.sheetBody)}>
          <div {...stylex.props(styles.confirmCard)}>
            <h2 {...stylex.props(styles.confirmTitle)}>Start this puzzle over?</h2>
            <p {...stylex.props(styles.confirmSub)}>
              The {placed} placed {placed === 1 ? 'piece returns' : 'pieces return'} to the tray and the timer restarts.
            </p>
            <div {...stylex.props(styles.confirmActions)}>
              <Button variant="tinted" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="filled" xstyle={styles.danger} onClick={doReset}>
                Start over
              </Button>
            </div>
          </div>
        </div>
      </Sheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Jigsaw />)
