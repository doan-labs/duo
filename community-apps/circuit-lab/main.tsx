// Circuit Lab: a digital-logic sandbox for the Duo folding device. Switches
// feed AND/OR/NOT/XOR gates through tap-wired connections into bulbs; the
// truth table enumerates every input row live, and a challenge shelf asks for
// real combinational builds. The open circuit, selection and undo history ride
// `os.session` across the fold; the library, solved challenges and the mute
// switch persist in `os.storage`.
//
// Both displays run a copy. Anything the two must agree on lives in the wire
// values: a write this copy did not make is the settled document and is
// adopted outright, so a mid-build fold never splits the circuit.
import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sheet, Sym, TextField, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { type Cue, cue } from './audio.ts'
import { CHALLENGES, challengeById, challengeRun, scaffold } from './challenges.ts'
import {
  addNode,
  bulbsOf,
  type CircuitNode,
  commitMove,
  connect,
  type Doc,
  displayName,
  docBounds,
  evaluate,
  hasOutput,
  inPin,
  inputCount,
  type Library,
  latestDoc,
  moveNode,
  NODE_H,
  NODE_W,
  newDoc,
  nextBulbLabel,
  nextSwitchLabel,
  outPin,
  parseLibrary,
  parseMirror,
  reaches,
  redo,
  removeNode,
  removeWire,
  type Sel,
  serializeLibrary,
  serializeMirror,
  setLabel,
  setView,
  switchesOf,
  toggleSwitch,
  truthTable,
  undo,
  welcomeDoc,
  wireAt,
  withDoc,
  withoutDoc
} from './circuit.ts'
import { styles } from './styles.ts'

const ME = crypto.randomUUID()
const LIB_KEY = 'circuitlab-library'
const DOC_KEY = 'circuitlab-doc'

type Tab = 'Build' | 'Table' | 'Tasks' | 'Saved'

type Drag = {
  pointerId: number
  kind: 'pan' | 'node'
  id: string | null
  px: number
  py: number
  ox: number
  oy: number
  moved: boolean
}

const readLib = (): Promise<Library> => os.storage.get(LIB_KEY).then(parseLibrary, () => parseLibrary(null))

// Library writes funnel through one queue so two quick edits cannot each merge
// into the same stale snapshot and overwrite one another's circuits.
let libQueue = Promise.resolve()
const enqueue = (job: () => Promise<void>) => {
  libQueue = libQueue.then(job).catch(() => {})
}

const wirePath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.max(46, Math.abs(x2 - x1) * 0.55)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
}

const KIND_LABEL: Record<CircuitNode['kind'], string> = {
  switch: 'Switch',
  and: 'AND',
  or: 'OR',
  xor: 'XOR',
  not: 'NOT',
  bulb: 'Bulb'
}
const PIN_A = ['a', 'b']

/**
 * A challenge's I/O row is fixed by the brief: deleting a scaffold switch or
 * bulb would leave the challenge unsolvable, so deletion refuses instead. In
 * free build anything goes.
 */
const canDelete = (d: Doc, id: string): boolean => {
  const n = d.nodes[id]
  if (!n) return false
  if (d.challenge && (n.kind === 'switch' || n.kind === 'bulb')) return false
  return true
}

/** A selection pointing at a node or wire the doc no longer has prunes to null. */
const pruneSel = (s: Sel, d: Doc): Sel => (s && (s.kind === 'node' ? d.nodes[s.id] : d.wires[s.id]) ? s : null)

/** Gate glyphs: IEEE distinctive shapes, drawn on currentColor so they tint. */
function GateGlyph({ kind, size = 34 }: { kind: 'and' | 'or' | 'xor' | 'not'; size?: number }) {
  return (
    <svg width={size} height={(size * 24) / 34} viewBox="0 0 34 24" aria-hidden="true">
      {kind === 'and' ? (
        <path d="M6 3h10a9 9 0 0 1 0 18H6z" fill="none" stroke="currentColor" strokeWidth="2" />
      ) : kind === 'or' ? (
        <path d="M5 3q6 9 0 18 9-1 20-9Q14 4 5 3z" fill="none" stroke="currentColor" strokeWidth="2" />
      ) : kind === 'xor' ? (
        <>
          <path d="M8 3q6 9 0 18 9-1 20-9Q17 4 8 3z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M4 3q6 9 0 18" fill="none" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M5 4l14 8-14 8z" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="23.5" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  )
}

function CircuitLab() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const stored = useKV(os.storage, LIB_KEY)
  // Latest session value for the open circuit, fed by a raw watch - not useKV.
  const [live, setLive] = useState<{ raw: string | null; rev: number; known: boolean }>({
    raw: null,
    rev: 0,
    known: false
  })
  const [doc, setDoc] = useState<Doc | null>(null)
  const [sel, setSel] = useState<Sel>(null)
  const [armed, setArmed] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [coverTab, setCoverTab] = useState<Tab>('Build')
  const [panelTab, setPanelTab] = useState<Tab>('Table')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [arming, setArming] = useState<string | null>(null)
  const [gesturing, setGesturing] = useState(false)
  const [note, setNote] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  // Fork accounting: docRev is the session revision of the write that
  // produced the doc content this copy holds - its freshness watermark. A
  // mirror for the same doc declaring an older base forked from state that
  // predates our doc's producing write, so it must not overwrite it.
  // healedFor caps the corrective republish at once per content revision so
  // two disagreeing copies cannot bounce heals forever.
  const docRev = useRef(0)
  const lastWritten = useRef<string | null>(null)
  const healedFor = useRef(-1)
  const bootRef = useRef<() => void>(() => {})
  const returnFocus = useRef<HTMLElement | null>(null)
  // The doc id this copy framed for its own canvas: one stored view cannot
  // serve a 387pt cover and a 790pt inner, so each display fits the circuit to
  // the box it actually has and the framed flag marks "this copy computed it".
  const framedDoc = useRef<string | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  const selRef = useRef(sel)
  selRef.current = sel
  const armedRef = useRef(armed)
  armedRef.current = armed
  const viewActiveRef = useRef(view.active)
  viewActiveRef.current = view.active

  const library = parseLibrary(stored.value)
  const muted = library.muted
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const play = (c: Cue) => {
    if (mutedRef.current || !viewActiveRef.current) return
    cue(c)
  }

  const selNode = doc && sel?.kind === 'node' ? (doc.nodes[sel.id] ?? null) : null
  const selWire = doc && sel?.kind === 'wire' ? (doc.wires[sel.id] ?? null) : null
  const activeChallenge = challengeById(doc?.challenge)
  const run = doc && activeChallenge ? challengeRun(doc, activeChallenge) : null

  // Merges one doc into the freshest library it can read. Merging against a
  // fresh get - not the KV mirror, which lags while occluded - is what stops a
  // hidden copy from clobbering circuits it has not seen yet.
  const saveDoc = (next: Doc) => {
    enqueue(async () => {
      const lib = await readLib()
      stored.set(serializeLibrary(withDoc(lib, next)))
    })
  }

  // Every structural edit lands in both places: the session key carries the
  // live circuit across the fold, the library key keeps it durable. A drag
  // writes once on release - the moving frames only repaint locally.
  const publish = (next: Doc, nextSel?: Sel) => {
    const selNow = pruneSel(nextSel === undefined ? selRef.current : nextSel, next)
    setDoc(next)
    docRef.current = next
    if (selNow !== selRef.current) setSel(selNow)
    saveDoc(next)
    const raw = serializeMirror(ME, next, selNow, docRev.current)
    lastWritten.current = raw
    void os.session.set(DOC_KEY, raw).catch(() => {})
  }

  // View-only edits (pan, zoom, fit) are per-display state: they persist to
  // the library for relaunch but never touch the session mirror, where a
  // mechanical write could fork the doc against the peer's real edits.
  const publishView = (next: Doc) => {
    setDoc(next)
    docRef.current = next
    saveDoc(next)
  }

  // Selection alone never writes storage - it rides the session mirror only.
  // Its echo is untracked on purpose: a selection write carries no new doc
  // content, so it must not advance docRev and make real peer edits read stale.
  const publishSel = (s: Sel) => {
    const current = docRef.current
    setSel(s)
    if (current) void os.session.set(DOC_KEY, serializeMirror(ME, current, s, docRev.current)).catch(() => {})
  }

  const setMuted = (next: boolean) => {
    enqueue(async () => {
      const lib = await readLib()
      stored.set(serializeLibrary({ ...lib, muted: next }))
    })
  }

  // A raw watch beside useKV: remote KV changes render through a view
  // transition whose callback never runs while this copy is occluded by the
  // fold - the hidden display's value freezes and drops updates. The
  // port-level watch fires on the message itself, so the folded copy stays
  // current and opens already in sync.
  useEffect(() => {
    let dead = false
    let off = () => {}
    const boot = async () => {
      try {
        const seen = new Map<string, string>()
        let rev = 0
        let cursor: string | undefined
        do {
          const page = await os.session.snapshot(cursor)
          rev = page.rev
          for (const [k, v] of page.entries) seen.set(k, v)
          cursor = page.cursor
        } while (cursor)
        if (dead) return
        setLive({ raw: seen.get(DOC_KEY) ?? null, rev, known: true })
        off()
        off = os.session.watch(rev, (e) => {
          if (e.rev < 0) void boot()
          else {
            // Our own write's echo confirms the session position the doc we
            // display now holds - the freshness watermark the fork gate needs.
            // Heal writes are not tracked here: a republish confirms position
            // but must not advance it, or stale heals would inflate into wins.
            if (e.v === lastWritten.current) docRev.current = e.rev
            if (e.k === DOC_KEY) setLive({ raw: e.v, rev: e.rev, known: true })
          }
        })
      } catch {
        if (!dead) setTimeout(() => void boot(), 2000)
      }
    }
    bootRef.current = boot
    void boot()
    return () => {
      dead = true
      off()
    }
  }, [])

  // A copy frozen on the occluded display can miss session events; on becoming
  // the visible display again, re-snapshot so its doc can never lag the peer.
  useEffect(() => {
    if (view.active) void bootRef.current()
  }, [view.active])

  // A write this copy did not make is the new settled circuit; adopting it is
  // what carries the build across the fold. Own writes are already on screen.
  useEffect(() => {
    if (!live.known) return
    const raw = live.raw
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // Seed only after the library hydrates: a fresh copy publishing before it
      // would otherwise let a peer write over circuits it never saw.
      if (!seeded.current && stored.status === 'ready') {
        seeded.current = true
        enqueue(async () => {
          const lib = await readLib()
          const open = latestDoc(lib) ?? welcomeDoc()
          setDoc(open)
          docRef.current = open
          setSel(null)
          stored.set(serializeLibrary(withDoc(lib, open)))
          const raw = serializeMirror(ME, open, null, docRev.current)
          lastWritten.current = raw
          await os.session.set(DOC_KEY, raw).catch(() => {})
        })
      }
      return
    }
    const next = parseMirror(raw)
    if (!next || next.by === ME) return
    const cur = docRef.current
    if (cur && next.doc.id === cur.id && next.base < docRev.current) {
      // Stale fork: the writer derived its doc from before the write that
      // produced ours. Refuse the overwrite and republish ours once so the
      // session converges on the fresher lineage instead of splitting.
      if (healedFor.current !== docRev.current) {
        healedFor.current = docRev.current
        const heal = serializeMirror(ME, cur, selRef.current, docRev.current)
        void os.session.set(DOC_KEY, heal).catch(() => {})
        enqueue(async () => {
          const lib = await readLib()
          stored.set(serializeLibrary(withDoc(lib, cur)))
        })
      }
      return
    }
    docRev.current = live.rev
    // Keep this copy's own view for the doc it already framed: a remote fit
    // was computed for a different canvas and must not replace the local one.
    const keep = cur?.id === next.doc.id && framedDoc.current === next.doc.id
    if (!keep) framedDoc.current = null
    const adopted = keep && cur ? { ...next.doc, view: cur.view } : next.doc
    setDoc(adopted)
    docRef.current = adopted
    setSel(pruneSel(next.sel, next.doc))
    setArmed(null)
    setArming(null)
    enqueue(async () => {
      const lib = await readLib()
      const existing = lib.circuits[next.doc.id]
      if (!existing || existing.updated < next.doc.updated) {
        stored.set(serializeLibrary(withDoc(lib, next.doc)))
      }
    })
  }, [live, stored.status, stored.set])

  // First sight of a circuit fits it whole - circuits are small, so the
  // overview is the legible one - for THIS canvas. A hidden copy measures 0x0
  // and defers through the observer until the fold gives it a real box; the
  // framed view publishes back so it also serves as the stored start view.
  useEffect(() => {
    if (!doc || framedDoc.current === doc.id) return
    const el = canvasRef.current
    if (!el) return
    const fitLocal = () => {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) return
      framedDoc.current = doc.id
      const b = docBounds(doc)
      const zoom = Math.min(1.15, Math.min((box.width - 40) / b.w, (box.height - 40) / b.h))
      const next = setView(doc, { x: -b.cx * zoom, y: -b.cy * zoom, zoom, framed: true })
      setDoc(next)
      enqueue(async () => {
        const lib = await readLib()
        stored.set(serializeLibrary(withDoc(lib, next)))
      })
      void os.session.set(DOC_KEY, serializeMirror(ME, next, selRef.current)).catch(() => {})
    }
    const f = requestAnimationFrame(fitLocal)
    const ro = new ResizeObserver(() => {
      if (framedDoc.current !== doc.id) fitLocal()
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(f)
      ro.disconnect()
    }
  }, [doc, stored.set])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Live-solve: the moment every row matches, the challenge is marked and
  // banked - once, not on every render while it stays solved.
  const solvedNow = run?.solved === true && !!activeChallenge && !library.solved.includes(activeChallenge.id)
  useEffect(() => {
    if (!solvedNow || !doc || !activeChallenge) return
    if (!mutedRef.current && viewActiveRef.current) cue('solve')
    setNote(`${activeChallenge.title} solved`)
    enqueue(async () => {
      const lib = await readLib()
      if (lib.solved.includes(activeChallenge.id)) return
      stored.set(serializeLibrary({ ...lib, solved: [...lib.solved, activeChallenge.id] }))
    })
  }, [solvedNow, doc, activeChallenge, stored.set])

  // Hands the pre-connect Escape guard the live cancel callback only while a
  // wire is armed or a Sheet is actually open.
  useEffect(() => {
    cancelTop = confirmDelete !== null ? () => closeConfirm() : armed !== null ? () => setArmed(null) : null
    return () => {
      cancelTop = null
    }
  })

  // Structural keys: Delete/Backspace removes the selection, Cmd/Ctrl+Z walks
  // undo, Shift adds redo, Ctrl+Y redoes. While a Sheet is open the kit owns
  // focus and captures Escape, so no shortcut may act behind it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (confirmDelete !== null) return
      const current = docRef.current
      if (!current) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
        const s = selRef.current
        if (!s) return
        event.preventDefault()
        if (s.kind === 'wire') {
          play('cut')
          publish(removeWire(current, s.id), null)
        } else if (canDelete(current, s.id)) {
          play('cut')
          publish(removeNode(current, s.id), null)
        }
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const next = event.shiftKey ? redo(current) : undo(current)
        if (next !== current) {
          play('undo')
          setArmed(null)
          publish(next)
        }
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        const next = redo(current)
        if (next !== current) {
          play('undo')
          setArmed(null)
          publish(next)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!doc) return <main ref={rootRef} {...stylex.props(dark, styles.root)} />

  const ev = evaluate(doc)
  const table = truthTable(doc)
  const saving = stored.status === 'saving'
  const ins = switchesOf(doc)
  const outs = bulbsOf(doc)
  // The truth-table row matching the live switch pattern, lit for orientation.
  const liveMask = ins.reduce((m, sw, i) => m | (ev.value[sw.id] ? 1 << (ins.length - 1 - i) : 0), 0)
  const okRows = run ? run.rows.filter((r) => r.got.every((g, i) => g === r.want[i])).length : 0

  // ---- gestures ------------------------------------------------------------

  const toWorld = (clientX: number, clientY: number) => {
    const el = canvasRef.current
    const v = docRef.current?.view
    if (!el || !v) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: (clientX - rect.left - rect.width / 2 - v.x) / v.zoom,
      y: (clientY - rect.top - rect.height / 2 - v.y) / v.zoom
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Pins answer their own taps; dock and tray controls are not the board.
    if (target.closest('[data-pin]')) return
    if (!target.closest('[data-node]') && target.closest('button, input, [role="toolbar"], [role="radiogroup"]')) return
    const hit = target.closest('[data-node]')
    const id = hit instanceof HTMLElement ? (hit.dataset.node ?? null) : null
    const now = docRef.current
    if (!now) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      kind: id ? 'node' : 'pan',
      id,
      px: e.clientX,
      py: e.clientY,
      ox: id ? now.nodes[id]!.x : now.view.x,
      oy: id ? now.nodes[id]!.y : now.view.y,
      moved: false
    }
    if (armedRef.current) setGhost(toWorld(e.clientX, e.clientY))
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (armedRef.current) setGhost(toWorld(e.clientX, e.clientY))
    const d = dragRef.current
    const now = docRef.current
    if (!d || !now || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    if (!d.moved) setGesturing(true)
    d.moved = true
    if (d.kind === 'pan') setDoc({ ...now, view: { ...now.view, x: d.ox + dx, y: d.oy + dy } })
    else if (d.id) setDoc(moveNode(now, d.id, d.ox + dx / now.view.zoom, d.oy + dy / now.view.zoom))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    setGesturing(false)
    const now = docRef.current
    if (!now) return
    if (d.moved) {
      if (d.kind === 'node' && d.id) {
        publish(commitMove(now, d.id, d.ox, d.oy), { kind: 'node', id: d.id })
      } else publishView(now)
      return
    }
    setArming(null)
    // A plain tap: on a node it selects (and switches flip); on bare canvas it
    // clears the selection and drops any armed pin.
    if (d.kind === 'node' && d.id) {
      const n = now.nodes[d.id]
      if (!n) return
      if (n.kind === 'switch') {
        play('flip')
        publish(toggleSwitch(now, d.id), { kind: 'node', id: d.id })
      } else {
        publishSel({ kind: 'node', id: d.id })
      }
    } else {
      setArmed(null)
      publishSel(null)
    }
  }

  // ---- wiring --------------------------------------------------------------

  const armOut = (nodeId: string) => {
    play(armed === nodeId ? 'cut' : 'arm')
    setArmed(armed === nodeId ? null : nodeId)
    publishSel(null)
  }

  const tapIn = (nodeId: string, port: number) => {
    const now = docRef.current
    if (!now) return
    if (armedRef.current) {
      const from = armedRef.current
      const result = connect(now, from, nodeId, port)
      if (result.error) {
        play('reject')
        setNote(result.error === 'cycle' ? 'That wire would make a loop' : 'That pin cannot take a wire')
        return
      }
      play('connect')
      setArmed(null)
      setNote(
        `Wired ${displayName(now.nodes[from]!)} to ${displayName(now.nodes[nodeId]!)}${inputCount(now.nodes[nodeId]!.kind) > 1 ? ` ${PIN_A[port]}` : ''}`
      )
      publish(result.doc, { kind: 'wire', id: result.wire!.id })
      return
    }
    // Not armed: tapping a fed pin selects the wire on it, so Disconnect is
    // one tap in the inspector.
    const w = wireAt(now, nodeId, port)
    if (w) publishSel({ kind: 'wire', id: w.id })
  }

  // Which input pins a wire armed at `from` may legally land on: bad pins are
  // the armed node's own and any that would close a loop.
  const pinTargets = (from: string | null): { ok: Set<string>; bad: Set<string> } => {
    const ok = new Set<string>()
    const bad = new Set<string>()
    if (!from || !doc) return { ok, bad }
    for (const n of Object.values(doc.nodes)) {
      for (let p = 0; p < inputCount(n.kind); p++) {
        ;(from === n.id || reaches(doc, n.id, from) ? bad : ok).add(`${n.id}:${p}`)
      }
    }
    return { ok, bad }
  }
  const targets = pinTargets(armed)

  const addPart = (kind: CircuitNode['kind']) => {
    const v = doc.view
    // New parts land near the visible centre, columned by role.
    const cx = -v.x / v.zoom
    const cy = -v.y / v.zoom
    const xs: Record<CircuitNode['kind'], number> = {
      switch: cx - 240,
      bulb: cx + 240,
      and: cx - 44,
      or: cx - 44,
      xor: cx + 44,
      not: cx + 44
    }
    const label = kind === 'switch' ? nextSwitchLabel(doc) : kind === 'bulb' ? nextBulbLabel(doc) : ''
    // Stack downward until the spot is clear of other parts.
    let y = cy
    const taken = (py: number) =>
      Object.values(doc.nodes).some((n) => Math.abs(n.x - xs[kind]) < 100 && Math.abs(n.y - py) < 70)
    while (taken(y)) y += 80
    const { doc: next, id, error } = addNode(doc, kind, xs[kind], y, label)
    if (error) {
      play('reject')
      setNote(
        error === 'io-locked'
          ? 'Challenge inputs and bulbs are fixed'
          : error === 'switch-limit'
            ? 'Four switches is the limit'
            : error === 'bulb-limit'
              ? 'Four bulbs is the limit'
              : 'The board is full'
      )
      return
    }
    play('place')
    publish(next, { kind: 'node', id })
  }

  const dropNode = (id: string) => {
    if (!canDelete(doc, id)) {
      play('reject')
      setNote('Challenge inputs and bulbs stay put')
      return
    }
    play('cut')
    publish(removeNode(doc, id), null)
    setArming(null)
  }

  const dropWire = (id: string) => {
    play('cut')
    publish(removeWire(doc, id), null)
  }

  const doUndo = () => {
    const next = undo(doc)
    if (next === doc) return
    play('undo')
    setArmed(null)
    publish(next)
  }
  const doRedo = () => {
    const next = redo(doc)
    if (next === doc) return
    play('undo')
    setArmed(null)
    publish(next)
  }

  const zoomBy = (factor: number) => publishView(setView(doc, { ...doc.view, zoom: doc.view.zoom * factor }))
  const fit = () => {
    const box = canvasRef.current?.getBoundingClientRect()
    if (!box?.width || !box.height) return
    const b = docBounds(doc)
    const zoom = Math.min(1.15, Math.min((box.width - 40) / b.w, (box.height - 40) / b.h))
    publishView(setView(doc, { x: -b.cx * zoom, y: -b.cy * zoom, zoom }))
  }

  // ---- library & challenges --------------------------------------------------

  const openCircuit = (id: string) => {
    setArming(null)
    if (id === doc.id) return
    // Read the library fresh: the KV mirror can lag while this copy is
    // occluded, so a circuit the other display just made may not be listed yet.
    void (async () => {
      const next = (await readLib()).circuits[id]
      if (next && next.id !== docRef.current?.id) {
        framedDoc.current = null
        publish(next, null)
      }
    })()
  }
  const makeCircuit = () => {
    setArming(null)
    void (async () => {
      const next = newDoc(`Circuit ${Object.keys((await readLib()).circuits).length + 1}`)
      framedDoc.current = null
      publish(next, null)
    })()
  }
  const startChallenge = (id: string) => {
    setArming(null)
    void (async () => {
      const lib = await readLib()
      const existing = Object.values(lib.circuits).find((c) => c.challenge === id)
      const ch = challengeById(id)
      if (!ch) return
      framedDoc.current = null
      publish(existing ?? scaffold(ch), null)
    })()
  }
  const dropCircuit = (id: string) => {
    setConfirmDelete(null)
    enqueue(async () => {
      const lib = withoutDoc(await readLib(), id)
      const open = docRef.current?.id === id ? (latestDoc(lib) ?? newDoc('Circuit 1')) : null
      stored.set(serializeLibrary(open ? withDoc(lib, open) : lib))
      if (open) {
        framedDoc.current = null
        setDoc(open)
        setSel(null)
        void os.session.set(DOC_KEY, serializeMirror(ME, open, null)).catch(() => {})
      }
    })
  }

  // ---- pieces ---------------------------------------------------------------

  const nodeView = (n: CircuitNode) => {
    const dead = ev.dead.has(n.id)
    const on = ev.value[n.id] === true
    const pins: ReactNode[] = []
    if (hasOutput(n.kind)) {
      pins.push(
        <button
          key="out"
          type="button"
          data-pin="out"
          aria-label={`Output of ${displayName(n)}`}
          onClick={(e) => {
            e.stopPropagation()
            armOut(n.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          {...stylex.props(
            styles.pin,
            // Pin coords relative to the node's own box origin (top-left).
            styles.pinAt(NODE_W[n.kind], NODE_H / 2),
            shared.press
          )}
        >
          <i
            aria-hidden="true"
            {...stylex.props(styles.pinDot, on ? styles.pinHigh : styles.pinLow, armed === n.id && styles.pinArmed)}
          />
        </button>
      )
    }
    for (let port = 0; port < inputCount(n.kind); port++) {
      const p = inPin(n, port)
      const key = `${n.id}:${port}`
      const fed = wireAt(doc, n.id, port)
      pins.push(
        <button
          key={`in${port}`}
          type="button"
          data-pin="in"
          aria-label={`Input ${inputCount(n.kind) > 1 ? `${PIN_A[port]} ` : ''}of ${displayName(n)}${fed ? ', wired' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            tapIn(n.id, port)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          {...stylex.props(styles.pin, styles.pinAt(0, p.y - n.y + NODE_H / 2), shared.press)}
        >
          <i
            aria-hidden="true"
            {...stylex.props(
              styles.pinDot,
              fed && ev.value[fed.from] ? styles.pinHigh : styles.pinLow,
              armed !== null && targets.ok.has(key) && styles.pinCandidate,
              armed !== null && targets.bad.has(key) && styles.pinBad
            )}
          />
        </button>
      )
    }
    return (
      <div key={n.id} {...stylex.props(styles.nodeBox, styles.nodeAt(n.x, n.y, NODE_W[n.kind], NODE_H))}>
        <button
          type="button"
          data-node={n.id}
          aria-label={`${KIND_LABEL[n.kind]} ${displayName(n)}${n.kind === 'switch' ? (on ? ', on' : ', off') : n.kind === 'bulb' ? (on ? ', lit' : ', dark') : ''}`}
          aria-pressed={sel?.kind === 'node' && sel.id === n.id}
          {...stylex.props(
            styles.body,
            sel?.kind === 'node' && sel.id === n.id && styles.bodySel,
            dead && styles.bodyDead
          )}
        >
          {n.kind === 'switch' ? (
            <>
              <span {...stylex.props(styles.switchLetter)}>{displayName(n)}</span>
              <span aria-hidden="true" {...stylex.props(styles.switchTrack, on ? styles.switchOn : styles.switchOff)}>
                <i {...stylex.props(styles.knob, on && styles.knobOn)} />
              </span>
            </>
          ) : n.kind === 'bulb' ? (
            <span aria-hidden="true" {...stylex.props(styles.bulbCircle, on ? styles.bulbOn : styles.bulbOff)}>
              <Sym name="bolt" size={18} />
            </span>
          ) : (
            <>
              <GateGlyph kind={n.kind} />
              <span {...stylex.props(styles.gateLabel)}>{n.label || KIND_LABEL[n.kind]}</span>
            </>
          )}
        </button>
        {pins}
        {n.kind !== 'switch' && n.label ? <span {...stylex.props(styles.nodeLabel)}>{n.label}</span> : null}
      </div>
    )
  }

  const canvas = (
    <div
      ref={canvasRef}
      role="application"
      aria-label="Circuit canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      {...stylex.props(
        styles.canvas,
        styles.dots,
        styles.dotsAt(doc.view.x, doc.view.y),
        gesturing && styles.canvasBusy
      )}
    >
      <div {...stylex.props(styles.world, styles.worldAt(doc.view.x, doc.view.y, doc.view.zoom))}>
        <svg aria-hidden="true" {...stylex.props(styles.wiresSvg)}>
          {Object.values(doc.wires).map((w) => {
            const a = doc.nodes[w.from]
            const b = doc.nodes[w.to]
            if (!a || !b) return null
            const p = outPin(a)
            const q = inPin(b, w.port)
            const d = wirePath(p.x, p.y, q.x, q.y)
            const hot = ev.value[w.from] === true
            const selected = sel?.kind === 'wire' && sel.id === w.id
            const dead = ev.dead.has(w.to) || ev.dead.has(w.from)
            const delay = Math.min(ev.depth[w.from] ?? 0, 8) * 55
            return (
              <g key={w.id}>
                <path
                  d={d}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    publishSel({ kind: 'wire', id: w.id })
                  }}
                  {...stylex.props(styles.wireHit)}
                />
                <path
                  d={d}
                  pathLength={1}
                  {...stylex.props(
                    styles.wire,
                    dead ? styles.wireDead : selected ? styles.wireSel : hot ? styles.wireHigh : styles.wireLow,
                    styles.wireDelay(delay)
                  )}
                />
                {hot && view.active ? <path d={d} {...stylex.props(styles.wireFlow, styles.flowDelay(delay))} /> : null}
              </g>
            )
          })}
          {armed && ghost && doc.nodes[armed]
            ? (() => {
                const p = outPin(doc.nodes[armed]!)
                return <path d={wirePath(p.x, p.y, ghost.x, ghost.y)} {...stylex.props(styles.ghostWire)} />
              })()
            : null}
        </svg>
        {Object.values(doc.nodes).map(nodeView)}
      </div>
      {activeChallenge ? (
        <div {...stylex.props(styles.banner, run?.solved && styles.bannerSolved)} role="status">
          <span {...stylex.props(run?.solved ? styles.bannerOk : styles.bannerMiss)}>
            {run?.solved ? 'Solved' : `${okRows}/${run?.rows.length ?? 0}`}
          </span>
          <span {...stylex.props(styles.bannerText)}>{activeChallenge.brief}</span>
        </div>
      ) : null}
      <div role="toolbar" aria-label="Zoom" {...stylex.props(styles.zoomDock)}>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / 1.25)}
          {...stylex.props(styles.iconBtn, shared.press)}
        >
          <Sym name="minus" size={13} />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={() => publish(setView(doc, { ...doc.view, zoom: 1 }))}
          {...stylex.props(styles.zoomPct, shared.press)}
        >
          {Math.round(doc.view.zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBy(1.25)}
          {...stylex.props(styles.iconBtn, shared.press)}
        >
          <Sym name="plus" size={13} />
        </button>
        <button type="button" aria-label="Fit circuit" onClick={fit} {...stylex.props(styles.iconBtn, shared.press)}>
          <Sym name="expand" size={13} />
        </button>
      </div>
      <span {...stylex.props(styles.hint)}>
        {armed
          ? 'Tap an input pin to land the wire'
          : 'Tap a switch to flip it. Tap an output pin, then an input, to wire.'}
      </span>
    </div>
  )

  // ---- sections --------------------------------------------------------------

  const paletteKinds: CircuitNode['kind'][] = ['switch', 'and', 'or', 'xor', 'not', 'bulb']
  const palette = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Parts</span>
      <div {...stylex.props(styles.paletteGrid)} role="group" aria-label="Add a part">
        {paletteKinds.map((kind) => {
          const locked = doc.challenge !== null && (kind === 'switch' || kind === 'bulb')
          const forbidden = activeChallenge?.forbid.includes(kind) ?? false
          const disabled = locked || forbidden
          return (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              aria-label={`Add ${KIND_LABEL[kind]}${forbidden ? ' (off the shelf for this challenge)' : ''}`}
              onClick={() => addPart(kind)}
              {...stylex.props(styles.tile, shared.press)}
            >
              {kind === 'switch' ? (
                <Sym name="flip" size={17} />
              ) : kind === 'bulb' ? (
                <Sym name="bolt" size={17} />
              ) : (
                <GateGlyph kind={kind} size={26} />
              )}
              {KIND_LABEL[kind]}
            </button>
          )
        })}
      </div>
      <span {...stylex.props(styles.meta)}>Open inputs read LOW (0).</span>
    </div>
  )

  const inspector = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Selected</span>
      {selNode ? (
        <>
          <div {...stylex.props(styles.field)}>
            <TextField
              aria-label="Part label"
              value={selNode.label}
              placeholder={KIND_LABEL[selNode.kind]}
              onChange={(e) => publish(setLabel(doc, selNode.id, e.target.value))}
            />
          </div>
          <div {...stylex.props(styles.rowBtns)}>
            <button
              type="button"
              disabled={!canDelete(doc, selNode.id)}
              onClick={() => (arming === selNode.id ? dropNode(selNode.id) : setArming(selNode.id))}
              {...stylex.props(styles.btn, arming === selNode.id && styles.btnWarn, shared.press)}
            >
              <Sym name="trash" size={12} />
              {arming === selNode.id ? 'Sure?' : 'Delete'}
            </button>
          </div>
        </>
      ) : selWire ? (
        <>
          <span {...stylex.props(styles.meta)}>
            {doc.nodes[selWire.from] ? displayName(doc.nodes[selWire.from]!) : '?'} &rarr;{' '}
            {doc.nodes[selWire.to] ? displayName(doc.nodes[selWire.to]!) : '?'}
            {inputCount(doc.nodes[selWire.to]?.kind ?? 'not') > 1 ? ` · pin ${PIN_A[selWire.port]}` : ''}
          </span>
          <div {...stylex.props(styles.rowBtns)}>
            <button
              type="button"
              onClick={() => dropWire(selWire.id)}
              {...stylex.props(styles.btn, styles.btnWarn, shared.press)}
            >
              <Sym name="trash" size={12} />
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <span {...stylex.props(styles.meta)}>
          Tap a part or a wire to inspect it. Tap an output pin, then an input pin, to wire them.
        </span>
      )}
    </div>
  )

  const tableSection = (
    <div {...stylex.props(styles.section, styles.grow)}>
      <span {...stylex.props(styles.fieldLabel)}>Truth table</span>
      <div {...stylex.props(styles.tableWrap)}>
        <table {...stylex.props(styles.table)} aria-label="Truth table of every input row">
          <thead>
            <tr>
              {table.ins.map((sw) => (
                <th key={sw.id} {...stylex.props(styles.th)}>
                  {displayName(sw)}
                </th>
              ))}
              {table.outs.map((b) => (
                <th key={b.id} {...stylex.props(styles.th, styles.thOut)}>
                  {displayName(b)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={row.ins.map(Number).join('')} {...(i === liveMask ? stylex.props(styles.trLive) : {})}>
                {row.ins.map((bit, j) => (
                  <td key={table.ins[j]!.id} {...stylex.props(styles.td, bit && styles.tdOn)}>
                    {bit ? 1 : 0}
                  </td>
                ))}
                {row.outs.map((bit, j) => (
                  <td key={table.outs[j]!.id} {...stylex.props(styles.td, styles.tdOut, bit && styles.tdOutOn)}>
                    {bit ? 1 : 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!outs.length ? <span {...stylex.props(styles.meta)}>Add a bulb to read the table.</span> : null}
    </div>
  )

  const tasksSection = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Challenges</span>
      <div {...stylex.props(styles.list)}>
        {CHALLENGES.map((ch) => {
          const solved = library.solved.includes(ch.id)
          const active = doc.challenge === ch.id
          return (
            <div key={ch.id} {...stylex.props(styles.listRow)}>
              <button
                type="button"
                aria-label={`${ch.title}: ${ch.brief}`}
                aria-current={active}
                onClick={() => startChallenge(ch.id)}
                {...stylex.props(styles.rowBtn, active && styles.rowBtnOn, shared.press)}
              >
                <span {...stylex.props(styles.rowName)}>{ch.title}</span>
                {solved ? <Sym name="check" size={13} /> : null}
                <span {...stylex.props(styles.rowMeta)}>{ch.inputs} in</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  const savedSection = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Circuits</span>
      <div {...stylex.props(styles.list)}>
        {Object.values(library.circuits)
          .sort((a, b) => b.updated - a.updated)
          .map((c) => (
            <div key={c.id} {...stylex.props(styles.listRow)}>
              <button
                type="button"
                aria-current={c.id === doc.id}
                aria-label={`Open ${c.name}`}
                onClick={() => openCircuit(c.id)}
                {...stylex.props(styles.rowBtn, c.id === doc.id && styles.rowBtnOn, shared.press)}
              >
                <span {...stylex.props(styles.rowName)}>{c.name}</span>
                {c.challenge ? <Sym name="bolt" size={11} /> : null}
                <span {...stylex.props(styles.rowMeta)}>{Object.keys(c.nodes).length}</span>
                {c.id === doc.id && <Sym name="check" size={12} />}
              </button>
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={(e) => {
                  returnFocus.current = e.currentTarget
                  setConfirmDelete(c.id)
                }}
                {...stylex.props(styles.iconBtn, styles.iconBtnLg, shared.press)}
              >
                <Sym name="trash" size={13} />
              </button>
            </div>
          ))}
      </div>
      <button type="button" onClick={makeCircuit} {...stylex.props(styles.btn, shared.press)}>
        <Sym name="plus" size={12} />
        New circuit
      </button>
    </div>
  )

  const tabContent = (tab: Tab) =>
    tab === 'Build' ? (
      <>
        {palette}
        {inspector}
      </>
    ) : tab === 'Table' ? (
      tableSection
    ) : tab === 'Tasks' ? (
      tasksSection
    ) : (
      savedSection
    )

  const seg = (value: Tab, onChange: (t: Tab) => void, options: Tab[]) => (
    <div role="radiogroup" aria-label="Panel section" {...stylex.props(styles.seg)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          {...stylex.props(styles.segBtn, o === value && styles.segBtnOn, shared.press)}
        >
          {o}
        </button>
      ))}
    </div>
  )

  const chips = (
    <div {...stylex.props(styles.chips)}>
      <button
        type="button"
        aria-label="Undo"
        disabled={!doc.past.length}
        onClick={doUndo}
        {...stylex.props(styles.iconBtn, styles.iconBtnLg, shared.press)}
      >
        <Sym name="undo" size={14} />
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={!doc.future.length}
        onClick={doRedo}
        {...stylex.props(styles.iconBtn, styles.iconBtnLg, shared.press)}
      >
        <span {...stylex.props(styles.flipX)}>
          <Sym name="undo" size={14} />
        </span>
      </button>
      <button
        type="button"
        aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        aria-pressed={muted}
        onClick={() => {
          const next = !muted
          setMuted(next)
          if (!next) play('arm')
        }}
        {...stylex.props(
          styles.iconBtn,
          styles.iconBtnLg,
          muted ? styles.iconBtnMuted : styles.iconBtnTintOn,
          shared.press
        )}
      >
        <Sym name="volume" size={14} />
      </button>
    </div>
  )

  // The kit Sheet owns focus, the scrim and a captured Escape; the app marks
  // its content inert and loops Tab inside the card while it is open.
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
  const closeConfirm = () => {
    setConfirmDelete(null)
    const el = returnFocus.current
    returnFocus.current = null
    if (el instanceof HTMLElement) {
      let tries = 0
      const restore = () => {
        if (!el.isConnected) return
        el.focus()
        if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
      }
      requestAnimationFrame(restore)
    }
  }
  const deleteName = confirmDelete ? (library.circuits[confirmDelete]?.name ?? 'this circuit') : ''

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root, !wide && styles.rootCover)}>
      {/* inert lifts the whole surface out of focus and hit-testing while the
          delete Sheet is open; the Sheet stays outside this subtree. */}
      <div inert={confirmDelete !== null} {...stylex.props(styles.shell, !wide && styles.shellCover)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.brand)}>
            <span {...stylex.props(styles.kicker)}>Duo Lab</span>
            <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>{doc.name}</h1>
          </div>
          {saving ? <span {...stylex.props(styles.chip)}>Saving</span> : null}
          {chips}
        </header>
        {wide ? (
          <section {...stylex.props(styles.stage)}>
            {canvas}
            <div {...stylex.props(styles.panel)}>
              {palette}
              {inspector}
              <div {...stylex.props(styles.sepH)} />
              {seg(panelTab, setPanelTab, ['Table', 'Tasks', 'Saved'] as Tab[])}
              <div {...stylex.props(styles.panelScroll)}>{tabContent(panelTab)}</div>
            </div>
          </section>
        ) : (
          <section {...stylex.props(styles.stage, styles.stageCover)}>
            {canvas}
            <div {...stylex.props(styles.tray)}>
              {seg(coverTab, setCoverTab, ['Build', 'Table', 'Tasks', 'Saved'] as Tab[])}
              <div {...stylex.props(styles.trayBody)}>{tabContent(coverTab)}</div>
            </div>
          </section>
        )}
      </div>
      <Sheet
        open={confirmDelete !== null}
        onClose={closeConfirm}
        aria-label="Delete this circuit?"
        aria-modal="true"
        onKeyDown={trapTab}
      >
        {confirmDelete !== null ? (
          <div {...stylex.props(styles.confirmCard)}>
            <h2 {...stylex.props(styles.confirmTitle)}>Delete {deleteName}?</h2>
            <span {...stylex.props(styles.confirmSub)}>Its gates, wires and undo history are removed for good.</span>
            <div {...stylex.props(styles.confirmActions)}>
              <button type="button" autoFocus onClick={closeConfirm} {...stylex.props(styles.btn, shared.press)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => dropCircuit(confirmDelete)}
                {...stylex.props(styles.btn, styles.btnWarn, shared.press)}
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
      <div aria-live="polite" {...stylex.props(styles.announce)}>
        {note}
      </div>
    </main>
  )
}

// Registered before os.connect() so it fires ahead of the SDK's Escape-to-home
// forward: while a wire is armed or the delete Sheet is open, Escape cancels
// it inside the app; at all other times the event passes through and goes home.
let cancelTop: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !cancelTop) return
    event.preventDefault()
    event.stopImmediatePropagation()
    cancelTop()
  },
  true
)

await os.connect()
// The app template ships a bare body - there is no #root element; every
// community app mounts straight onto document.body.
createRoot(document.body).render(<CircuitLab />)
