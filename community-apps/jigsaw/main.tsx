import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, IconButton, Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, light } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ARTS, type ArtId, artUri, isArtId } from './art.ts'
import { cue, setAdmission, setMuted, unlock } from './audio.ts'
import { type BoardApi, BoardPane, type BoardView, fitView, PieceThumb, TrayPane } from './board.tsx'
import {
  admitInput,
  createGamePersistence,
  createPrefsPersistence,
  LIVE_KEY,
  PREFS_KEY,
  PREFS0,
  type Prefs,
  parsePrefsDoc,
  SAVES_KEY
} from './persist.ts'
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
  gameKeyOf,
  type Live,
  looseCount,
  newerDoc,
  newGame,
  parseLive,
  parseSaves,
  placeAt,
  placedCount,
  resetGame,
  sendToTray,
  serializeSaves
} from './puzzle.ts'
import { press, styles } from './styles.ts'

// Both displays share one session key; a write this copy did not make is the
// newer settled game, so adopting it unconditionally converges the pair -
// including the race where both seed at once.
const ME = crypto.randomUUID()

type Filter = 'all' | 'corner' | 'edge'

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
  // The last ACCEPTED saves document. Unconditional reads of the KV mirror can
  // see a stale racing write, so this ref only moves through revision checks.
  const savesRaw = useRef<string | null>(null)

  const [prefs, setPrefsState] = useState<Prefs | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [held, setHeld] = useState<number | null>(null)
  const [heldPos, setHeldPos] = useState<Pt | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [boardView, setBoardView] = useState<BoardView>(fitView())
  const [pane, setPane] = useState<'board' | 'pieces'>('board')
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmReset, setConfirmReset] = useState(false)
  // The armed reset is bound to the puzzle it was opened on: a foreign game
  // switch (other display) both closes the sheet and drops the armed intent.
  const armedGameRef = useRef<string | null>(null)
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
  // Lamport clocks: revision/writer of the newest accepted doc per key. A
  // stale racing write (lower or equal-with-lower-by) is rejected and healed.
  const liveClock = useRef({ rev: 0, by: '' })
  const savesClock = useRef({ rev: 0, by: '' })
  const prefsClock = useRef({ rev: 0, by: '' })
  const actQueue = useRef(Promise.resolve())

  const cw = game ? BOARD_W / game.cols : 1
  const ch = game ? BOARD_H / game.rows : 1
  const artUriNow = game && isArtId(game.art) ? artUri(game.art) : ''
  const finished = !!game?.finishedAt
  const placed = game ? placedCount(game) : 0

  // ---- shared state ----

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Applies a foreign doc whose revision beats the one last accepted here.
  const adoptLive = useCallback((doc: Live) => {
    liveClock.current.rev = doc.rev
    liveClock.current.by = doc.by
    gameRef.current = doc.game
    heldRef.current = doc.held
    setGame(doc.game)
    setHeld(doc.held)
    setHeldPos(null)
    const key = gameKeyOf(doc.game)
    if (key !== gameKeyRef.current) {
      gameKeyRef.current = key
      setBoardView(fitView())
      setVeilDown(false)
      setFilter('all')
      armedGameRef.current = null
      setConfirmReset(false)
    }
  }, [])

  // Mirror handles inside refs: the queued write path needs the current
  // mirrors without rebuilding the persistence factory every render.
  const liveMirror = useRef(live)
  liveMirror.current = live
  const savesMirror = useRef(savesKV)
  savesMirror.current = savesKV
  const prefsMirror = useRef(prefsKV)
  prefsMirror.current = prefsKV

  // The serialized write path lives in persist.ts: confirmed reads before
  // every rebase (a rejected read fails the step instead of writing a guessed
  // snapshot), foreign adoption by revision, bind keys so a delayed intent
  // dies with the puzzle it was admitted against.
  const persistence = useMemo(
    () =>
      createGamePersistence({
        me: ME,
        liveKV: os.session,
        savesKV: os.storage,
        liveKey: LIVE_KEY,
        savesKey: SAVES_KEY,
        queue: actQueue,
        clocks: { live: liveClock.current, saves: savesClock.current },
        refs: { game: gameRef, held: heldRef },
        adopt: adoptLive,
        acceptSaves: (sd) => {
          savesClock.current.rev = sd.rev
          savesClock.current.by = sd.by
          savesRaw.current = serializeSaves(sd)
        },
        apply: (p) => {
          gameRef.current = p.game
          heldRef.current = p.held
          setGame(p.game)
          setHeld(p.held)
          liveMirror.current.set(p.live)
          savesRaw.current = p.saves
          savesMirror.current.set(p.saves)
        },
        writeLive: (raw) => liveMirror.current.set(raw),
        writeSaves: (raw) => {
          savesRaw.current = raw
          savesMirror.current.set(raw)
        },
        savesDoc: () => (savesRaw.current ? parseSaves(savesRaw.current) : null)
      }),
    [adoptLive]
  )

  const act = persistence.act

  // Fresh gestures are admitted only while this copy is the live one: active
  // AND visible on the SDK's current snapshot. Internal reconciliation
  // (repair, hydrate, boot seeding) is not input and never passes here.
  const liveNow = useCallback(() => admitInput(os.view), [])

  // Every repair is a queued confirmed-read heal on its own doc only. A
  // blind clock+1 write off a delayed mirror event regresses below whatever
  // the peer just landed, and each regression wakes the peer's stale check.
  const repairLive = useCallback(() => {
    void persistence.heal()
  }, [persistence])

  // Session mirror adoption: a foreign doc wins only by revision. A stale
  // racing write is dropped and the store is healed with our newer doc.
  useEffect(() => {
    if (live.status !== 'ready') return
    const raw = live.value
    if (raw === liveRawRef.current) return
    liveRawRef.current = raw
    const doc = parseLive(raw)
    if (!doc || doc.by === ME) return
    if (!newerDoc(doc.rev, doc.by, liveClock.current.rev, liveClock.current.by)) {
      repairLive()
      return
    }
    adoptLive(doc)
  }, [live.value, live.status, adoptLive, repairLive])

  // Prefs writes run the same confirmed-read rebase as game writes, and every
  // caller is a gesture: rejected while this copy is hidden.
  const prefsQueue = useRef(Promise.resolve())
  const prefsPersist = useMemo(
    () =>
      createPrefsPersistence({
        me: ME,
        kv: os.storage,
        key: PREFS_KEY,
        queue: prefsQueue,
        clock: prefsClock.current,
        current: () => prefsRef.current ?? PREFS0,
        accept: (env) => {
          prefsClock.current.rev = env.rev
          prefsClock.current.by = env.by
        },
        apply: (p) => {
          prefsRef.current = p.prefs
          setPrefsState(p.prefs)
          setMuted(p.prefs.muted)
          prefsMirror.current.set(p.raw)
        }
      }),
    []
  )

  const repairPrefs = useCallback(() => {
    void prefsPersist.heal()
  }, [prefsPersist])

  const repairSaves = useCallback(() => {
    void persistence.healSaves()
  }, [persistence])

  // Saves follow the same revision order: a newer foreign library (a sibling
  // puzzle saved on the other display) is adopted; a stale write is healed.
  useEffect(() => {
    if (savesKV.status !== 'ready') return
    const env = parseSaves(savesKV.value)
    if (env.by === ME) {
      if (env.rev > savesClock.current.rev) {
        savesClock.current.rev = env.rev
        savesClock.current.by = env.by
      }
      savesRaw.current = savesKV.value
      return
    }
    // Clock at 0 means nothing accepted yet: take the doc as the baseline,
    // including rev-0 envelopes left by older builds.
    if (savesClock.current.rev !== 0 && !newerDoc(env.rev, env.by, savesClock.current.rev, savesClock.current.by)) {
      repairSaves()
      return
    }
    savesClock.current.rev = env.rev
    savesClock.current.by = env.by
    savesRaw.current = savesKV.value
  }, [savesKV.value, savesKV.status, repairSaves])

  // Prefs hydrate and follow the other display's switches (mute especially),
  // with the same revision order as the live doc: stale writes are dropped.
  useEffect(() => {
    if (prefsKV.status !== 'ready') return
    const env = parsePrefsDoc(prefsKV.value)
    if (env.by === ME) {
      if (env.rev > prefsClock.current.rev) {
        prefsClock.current.rev = env.rev
        prefsClock.current.by = env.by
      }
      return
    }
    if (prefsClock.current.rev !== 0 && !newerDoc(env.rev, env.by, prefsClock.current.rev, prefsClock.current.by)) {
      repairPrefs()
      return
    }
    prefsClock.current.rev = env.rev
    prefsClock.current.by = env.by
    setPrefsState((cur) => (cur && JSON.stringify(cur) === JSON.stringify(env.prefs) ? cur : env.prefs))
    setMuted(env.prefs.muted)
  }, [prefsKV.value, prefsKV.status, repairPrefs])

  const setPrefs = useCallback(
    (patch: Partial<Prefs>) => {
      if (!liveNow()) return
      void prefsPersist.setPrefs(patch)
    },
    [liveNow, prefsPersist]
  )

  // First-open seeding: durable saves carry progress across relaunches; a live
  // doc already there (fresh fold) wins over storage. The seed is decided
  // INSIDE the queued step, after confirmed reads: a peer that seeded while
  // we were still reading is adopted, never overwritten by a fresh random
  // game. A failed read leaves the copy unseeded until the next real change
  // (mirror status/value or this display going live again) re-runs the effect.
  const seedBusy = useRef(false)
  const copyLive = view.active && view.visible
  useEffect(() => {
    if (seeded.current || seedBusy.current) return
    if (savesKV.status !== 'ready' || live.status !== 'ready' || !prefs) return
    const remote = parseLive(live.value)
    if (remote) {
      seeded.current = true
      adoptLive(remote)
      return
    }
    // savesKV.value and copyLive are re-triggers, not inputs: a failed seed
    // retries on the next foreign saves write or when this copy wakes.
    void savesKV.value
    void copyLive
    seedBusy.current = true
    void act((ctx) => {
      if (ctx.game) return null
      const p = prefsRef.current ?? PREFS0
      const key = configKey(p.art, p.count)
      const g = ctx.saves[key] ?? newGame(p.art, p.count, (Math.random() * 2 ** 31) | 0)
      return { next: g, held: null }
    }, undefined).then(
      () => {
        seedBusy.current = false
        seeded.current = true
      },
      () => {
        seedBusy.current = false
      }
    )
  }, [savesKV.status, savesKV.value, live.status, live.value, prefs, act, adoptLive, copyLive])

  // Device dark-mode switch; the shell applies the real class natively.
  useEffect(() => os.device.on('switches', (sw: { darkMode: boolean }) => setDarkMode(sw.darkMode)), [])

  // A fold hides this copy mid-gesture (inactive or merely not visible): the
  // in-flight drag cancels so the follow-up pointerup cannot drop the piece
  // loose on the felt, and a held piece stays held - it is mirrored state.
  useEffect(() => {
    if ((view.active && view.visible) || !dragRef.current) return
    dragRef.current = null
    setDrag(null)
  }, [view.active, view.visible])

  // Elapsed clock: derives from startedAt so both displays agree; ticks only
  // while this copy is the live visible one and stops at completion.
  useEffect(() => {
    if (!view.active || !view.visible || !game || game.finishedAt !== null) return
    const t = setInterval(() => {
      // Admission is re-read at tick time, not captured at schedule time: a
      // copy that just went hidden stops updating the clock immediately.
      if (admitInput(os.view)) setNow(Date.now())
    }, 1000)
    return () => clearInterval(t)
  }, [view.active, view.visible, game])

  // Audio unlock and cues obey the same admission rule as input: a hidden
  // copy never wakes the context nor plays a sound it cannot show the cause of.
  useEffect(() => {
    setAdmission(() => admitInput(os.view))
  }, [])

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

  // Escape settles app UI in order: an open sheet closes first, then a held
  // piece returns to where it came from. Both consume the key at the
  // pre-connect guard, so the SDK's later capture listener never forwards it
  // to Home. Only unconsumed Escapes still go home.
  useEffect(() => {
    escapeTop = () => {
      if (!liveNow()) return false
      if (sheetRef.current) {
        armedGameRef.current = null
        setPicker(false)
        setConfirmReset(false)
        return true
      }
      const g = gameRef.current
      if (heldRef.current !== null) {
        setHeld(null)
        setHeldPos(null)
        void act((ctx) => (ctx.game ? { next: ctx.game, held: null } : null), g ? gameKeyOf(g) : undefined)
        return true
      }
      return false
    }
    return () => {
      escapeTop = null
    }
  }, [act, liveNow])

  // ---- actions ----

  const dropAt = useCallback(
    (id: number, x: number, y: number) => {
      if (!liveNow()) return
      const bind = gameRef.current ? gameKeyOf(gameRef.current) : undefined
      setHeldPos(null)
      void act((ctx) => {
        const g = ctx.game
        if (!g) return null
        const res = placeAt(g, id, x, y, Date.now())
        if (res.game === g) return { next: g, held: null }
        const finishedNow = res.game.finishedAt !== null && g.finishedAt === null
        cue(finishedNow ? 'done' : res.snapped ? 'snap' : 'drop')
        return { next: res.game, held: null }
      }, bind)
    },
    [act, liveNow]
  )

  const holdPiece = useCallback(
    (id: number) => {
      if (!liveNow()) return
      const g = gameRef.current
      const p = g?.pieces[id]
      if (!g || !p || p.z === 2 || g.finishedAt !== null) return
      const w = BOARD_W / g.cols
      const h = BOARD_H / g.rows
      unlock()
      cue('lift')
      setHeld(id)
      setHeldPos(p.z === 1 ? { x: p.x, y: p.y } : { x: BOARD_W / 2 - w / 2, y: BOARD_H / 2 - h / 2 })
      void act((ctx) => (ctx.game && ctx.game.pieces[id]?.z !== 2 ? { next: ctx.game, held: id } : null), gameKeyOf(g))
      if (cover) setPane('board')
    },
    [act, cover, liveNow]
  )

  const beginDrag = useCallback(
    (id: number, clientX: number, clientY: number) => {
      if (!liveNow()) return
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
    },
    [liveNow]
  )

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
  // a held board piece back to the tray. All of it is input: hidden copies
  // reject before any key does anything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!liveNow()) return
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
          setHeld(null)
          void act((ctx) => {
            const cg = ctx.game
            if (!cg) return null
            const next = sendToTray(cg, hid)
            if (next === cg) return null
            cue('drop')
            return { next, held: null }
          }, gameKeyOf(g))
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [act, dropAt, liveNow])

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
      // A release landing on a now-hidden copy is an unaccepted release: the
      // piece simply stays where the live doc already has it.
      if (!liveNow()) return
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
        setHeld(null)
        void act((ctx) => {
          const cg = ctx.game
          if (!cg) return null
          const next = sendToTray(cg, d.id)
          if (next === cg) return null
          cue('drop')
          return { next, held: null }
        }, gameKeyOf(g))
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
  }, [act, dropAt, holdPiece, liveNow])

  const chooseConfig = useCallback(
    (art: ArtId, count: Count) => {
      if (!liveNow()) return
      const key = configKey(art, count)
      setPrefs({ art, count })
      // The chosen puzzle is the binding: the step rebases on confirmed saves
      // and switches to whatever the library now holds for that key.
      void act(({ saves }) => {
        const g = saves[key] ?? newGame(art, count, (Math.random() * 2 ** 31) | 0)
        gameKeyRef.current = gameKeyOf(g)
        return { next: g, held: null }
      })
      setHeldPos(null)
      setBoardView(fitView())
      setVeilDown(false)
      setPane('board')
    },
    [act, setPrefs, liveNow]
  )

  const doReset = useCallback(() => {
    if (!liveNow()) return
    setConfirmReset(false)
    const armed = armedGameRef.current
    armedGameRef.current = null
    void act((ctx) => {
      // The armed intent dies if the puzzle it was opened on is no longer live.
      if (!ctx.game || gameKeyOf(ctx.game) !== armed) return null
      const next = resetGame(ctx.game, (Math.random() * 2 ** 31) | 0)
      gameKeyRef.current = gameKeyOf(next)
      return { next, held: null }
    })
    setHeldPos(null)
    setBoardView(fitView())
    setVeilDown(false)
  }, [act, liveNow])

  const doCollect = useCallback(() => {
    if (!liveNow()) return
    const g = gameRef.current
    void act(
      (ctx) => {
        if (!ctx.game || looseCount(ctx.game) === 0) return null
        cue('drop')
        return { next: collectBoard(ctx.game), held: ctx.held }
      },
      g ? gameKeyOf(g) : undefined
    )
  }, [act, liveNow])

  const toggleMute = useCallback(() => {
    if (!liveNow()) return
    unlock()
    setPrefs({ muted: !(prefsRef.current?.muted ?? false) })
    cue('drop')
  }, [setPrefs, liveNow])

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
    <button type="button" {...stylex.props(styles.action, press)} onClick={doCollect} disabled={looseCount(game) === 0}>
      Collect board pieces
    </button>
  )

  const progressChip = (
    <span {...stylex.props(styles.chip)}>
      <span {...stylex.props(styles.chipValue)}>{placed}</span>/{game.pieces.length}
    </span>
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
        if (!liveNow() || held === null || !pt) return
        setHeldPos({ x: pt.x - cw / 2, y: pt.y - ch / 2 })
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
            {...stylex.props(styles.heldCancel, press)}
            onClick={() => {
              if (!liveNow()) return
              const g = gameRef.current
              setHeld(null)
              setHeldPos(null)
              void act((ctx) => (ctx.game ? { next: ctx.game, held: null } : null), g ? gameKeyOf(g) : undefined)
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
              <button type="button" {...stylex.props(styles.veilBtn, press)} onClick={() => setVeilDown(true)}>
                Keep looking
              </button>
              <button
                type="button"
                {...stylex.props(styles.veilBtn, styles.veilBtnAccent, press)}
                onClick={() => {
                  if (!liveNow()) return
                  // Dismiss the veil first: the picker sheet must stack above it.
                  setVeilDown(true)
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
      <header {...stylex.props(styles.header, cover && styles.headerCover)}>
        <div {...stylex.props(styles.titleLine)}>
          <div {...stylex.props(styles.brand)}>
            <span {...stylex.props(styles.kicker)}>Jigsaw</span>
            <h1 {...stylex.props(styles.title, cover && styles.titleCover)}>{art.name}</h1>
          </div>
          {cover ? progressChip : null}
        </div>
        <div {...stylex.props(styles.headerSide)}>
          {!cover ? progressChip : null}
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
            xstyle={styles.iconHit}
            onClick={() => setPrefs({ guide: !prefs.guide })}
          />
          <IconButton
            name="volume"
            variant="round"
            aria-label={prefs.muted ? 'Unmute sounds' : 'Mute sounds'}
            aria-pressed={prefs.muted}
            xstyle={prefs.muted ? [styles.iconHit, styles.iconBtnWarn] : styles.iconHit}
            onClick={toggleMute}
          />
          <IconButton
            name="reload"
            variant="round"
            aria-label="Start this puzzle over"
            xstyle={styles.iconHit}
            onClick={() => {
              if (!liveNow()) return
              armedGameRef.current = gameKeyOf(game)
              setConfirmReset(true)
            }}
          />
          <IconButton
            name="photo"
            variant="round"
            aria-label="Choose a puzzle"
            xstyle={styles.iconHit}
            onClick={() => {
              if (liveNow()) setPicker(true)
            }}
          />
        </div>
      </header>

      {cover ? (
        <div {...stylex.props(styles.segWrap)}>
          <div role="radiogroup" aria-label="Board or tray" {...stylex.props(styles.segTrack, styles.segFill)}>
            {(['board', 'pieces'] as const).map((p) => (
              // biome-ignore lint/a11y/useSemanticElements: Segmented-style labelled segments, not bare inputs
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={pane === p}
                {...stylex.props(styles.segBtn, styles.paneSegBtn, press, pane === p && styles.segOn)}
                onClick={() => setPane(p)}
              >
                {p === 'board' ? 'Board' : 'Pieces'}
              </button>
            ))}
          </div>
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

      <Sheet
        open={picker}
        onClose={() => {
          if (liveNow()) setPicker(false)
        }}
        aria-label="Choose a puzzle"
      >
        <div {...stylex.props(styles.sheetBody)}>
          <div {...stylex.props(styles.artRow)} role="radiogroup" aria-label="Picture">
            {ARTS.map((a) => {
              const key = configKey(a.id, prefs.count)
              const saved = parseSaves(savesRaw.current).games[key]
              const done = saved?.finishedAt !== null && !!saved
              const prog = saved ? placedCount(saved) : 0
              return (
                // biome-ignore lint/a11y/useSemanticElements: a card with a thumbnail cannot be an input[type=radio]
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.art === a.id}
                  {...stylex.props(styles.artCard, press, prefs.art === a.id && styles.artCardOn)}
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
                {...stylex.props(styles.segBtn, press, prefs.count === n && styles.segOn)}
                onClick={() => setPrefs({ count: n })}
              >
                {n} pieces
              </button>
            ))}
          </div>
          <div {...stylex.props(styles.confirmActions)}>
            <Button
              variant="tinted"
              xstyle={[styles.sheetBtn, styles.sheetCancel]}
              onClick={() => {
                if (liveNow()) setPicker(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              xstyle={styles.sheetBtn}
              onClick={() => {
                if (!liveNow()) return
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

      <Sheet
        open={confirmReset}
        onClose={() => {
          if (liveNow()) setConfirmReset(false)
        }}
        aria-label="Start over"
      >
        <div {...stylex.props(styles.sheetBody)}>
          <div {...stylex.props(styles.confirmCard)}>
            <h2 {...stylex.props(styles.confirmTitle)}>Start this puzzle over?</h2>
            <p {...stylex.props(styles.confirmSub)}>
              The {placed} placed {placed === 1 ? 'piece returns' : 'pieces return'} to the tray and the timer restarts.
            </p>
            <div {...stylex.props(styles.confirmActions)}>
              <Button
                variant="tinted"
                autoFocus
                xstyle={[styles.sheetBtn, styles.sheetCancel]}
                onClick={() => {
                  if (liveNow()) setConfirmReset(false)
                }}
              >
                Cancel
              </Button>
              <Button variant="filled" xstyle={styles.sheetBtn} onClick={doReset}>
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
