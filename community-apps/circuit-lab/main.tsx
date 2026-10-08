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
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { type Cue, cue } from './audio.ts'
import { CHALLENGES, challengeById, challengeRun, scaffold } from './challenges.ts'
import {
  addNode,
  bulbsOf,
  type CircuitNode,
  cleanView,
  commitMove,
  connect,
  type Doc,
  decideRemote,
  decodeLibrary,
  displayName,
  docBounds,
  emptyLibrary,
  evaluate,
  gatesOf,
  hasOutput,
  inPin,
  inputCount,
  type Library,
  latestDoc,
  layoutPads,
  MAX_BULBS,
  MAX_GATES,
  MAX_SWITCHES,
  moveNode,
  NODE_H,
  NODE_W,
  newDoc,
  nextBulbLabel,
  nextSwitchLabel,
  type Op,
  outPin,
  PIN_PAD_ZOOM,
  parseLibrary,
  parseMirror,
  reaches,
  redo,
  removeNode,
  removeWire,
  type Sel,
  serializeMirror,
  setLabel,
  switchesOf,
  toggleSwitch,
  truthTable,
  undo,
  type View,
  welcomeDoc,
  wireAt
} from './circuit.ts'
import {
  dropDocIntent,
  libWrite,
  mutedIntent,
  putDocIntent,
  solvedIntent,
  type WriteOutcome,
  writeConditional
} from './persist.ts'
import { styles } from './styles.ts'

const ME = crypto.randomUUID()
const LIB_KEY = 'circuitlab-library'
const DOC_KEY = 'circuitlab-doc'

// view.active from useDisplay is batched through rAF, so on the occluded
// copy it can lag a fold behind; the SDK's os.view property updates on the
// message itself, and an occluded copy can still report active while
// invisible. Anything that admits new work - mutates, plays, focuses, times
// or moves input - therefore reads both flags at execution time: only a
// copy that is on screen AND in charge takes it. Writes and gestures
// already in flight may finish their own completion without this gate.
const admit = () => os.view.visible && os.view.active

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

// Library writes funnel through one queue so two quick edits cannot each merge
// into the same stale snapshot and overwrite one another's circuits. Each job
// is a conditional write: it reads the freshest entry inside the host's CAS
// contract and re-derives its intent on conflict, so a write computed from a
// stale read loses to confirmed peer facts instead of clobbering them.
let libQueue = Promise.resolve()
let savePending = 0
let saveFailed = false
let onSaveState: (() => void) | null = null
const enqueue = (job: () => Promise<WriteOutcome>) => {
  savePending++
  onSaveState?.()
  libQueue = libQueue
    .then(job)
    .then((outcome) => {
      if (outcome === 'failed' || outcome === 'gone' || outcome === 'unknown') saveFailed = true
      else saveFailed = false
    })
    .catch(() => {
      saveFailed = true
    })
    .finally(() => {
      savePending--
      onSaveState?.()
    })
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
  const [trayOpen, setTrayOpen] = useState(false)
  const [note, setNote] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const chromeRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  // Fork accounting: docRev is the session revision of the write that
  // produced the doc content this copy holds - its freshness watermark. A
  // mirror for the same doc declaring an older base forked from state that
  // predates our doc's producing write, so it is merged in and healed over
  // rather than overwriting. answeredRev is the newest remote revision this
  // copy already healed, so a replayed stale write is never answered twice.
  const docRev = useRef(0)
  const lastWritten = useRef<string | null>(null)
  const answeredRev = useRef(-1)
  const bootRef = useRef<() => void>(() => {})
  const returnFocus = useRef<HTMLElement | null>(null)
  // The doc id this copy framed for its own canvas: one stored view cannot
  // serve a 387pt cover and a 790pt inner, so each display fits the circuit to
  // the box it actually has and the framed flag marks "this copy computed it".
  const framedDoc = useRef<string | null>(null)
  // The camera is per-display state, not document content: a cover Fit must
  // never clobber the inner's view and a remote edit must never drag this
  // display's camera along. doc.view stays the authored home view; the live
  // camera rides cam/camRef and persists in shared storage keyed by display.
  const [cam, setCam] = useState<View>({ x: 0, y: 0, zoom: 1, framed: false })
  const camRef = useRef(cam)
  camRef.current = cam
  // Doc ids whose stored camera read is still in flight: the first-sight fit
  // waits out that read so a returning display's saved view is never clobbered.
  const camWait = useRef(new Set<string>())
  const docRef = useRef(doc)
  docRef.current = doc
  const selRef = useRef(sel)
  selRef.current = sel
  const armedRef = useRef(armed)
  armedRef.current = armed

  const library = parseLibrary(stored.value)
  const muted = library.muted
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const play = (c: Cue) => {
    if (mutedRef.current || !admit()) return
    cue(c)
  }

  const selNode = doc && sel?.kind === 'node' ? (doc.nodes[sel.id] ?? null) : null
  const selWire = doc && sel?.kind === 'wire' ? (doc.wires[sel.id] ?? null) : null
  const activeChallenge = challengeById(doc?.challenge)
  const run = doc && activeChallenge ? challengeRun(doc, activeChallenge) : null

  // Merges one doc into the freshest library the host will commit over. The
  // intent recomputes on the entry read each attempt, so a confirmed peer
  // delete or newer stored version wins over a snapshot captured here.
  const saveDoc = (next: Doc) => {
    enqueue(() => libWrite(os.storage, LIB_KEY, putDocIntent(next)))
  }

  // Every structural edit lands in both places: the session key carries the
  // live circuit across the fold, the library key keeps it durable. A drag
  // writes once on release - the moving frames only repaint locally. `op`
  // describes the edit so a holder can merge this write if it was a stale
  // fork. Gated on the live view: nothing on the hidden copy may write.
  const publish = (next: Doc, nextSel?: Sel, op: Op | null = null) => {
    if (!admit()) return
    const selNow = pruneSel(nextSel === undefined ? selRef.current : nextSel, next)
    setDoc(next)
    docRef.current = next
    if (selNow !== selRef.current) setSel(selNow)
    saveDoc(next)
    const raw = serializeMirror(ME, next, selNow, docRev.current, op)
    lastWritten.current = raw
    void os.session.set(DOC_KEY, raw).catch(() => {})
  }

  // View-only edits (pan, zoom, fit) are per-display camera state: they never
  // write the shared doc or session mirror, so a cover gesture cannot move the
  // inner's camera and doc history never records a pan. Each display keeps its
  // own camera in shared storage keyed `view:<doc>:<display>`.
  const camKey = useCallback((docId: string) => `view:${docId}:${view.display}`, [view.display])
  // The live frame moves every pointer tick; the stored camera only needs the
  // resting one, so the storage write settles after the gesture. The pending
  // payload is kept so a read (or unmount) can flush it before it goes stale.
  const camPending = useRef<{ key: string; json: string } | null>(null)
  const camSave = useRef<number | undefined>(undefined)
  const flushCam = useCallback(() => {
    window.clearTimeout(camSave.current)
    const p = camPending.current
    camPending.current = null
    // Conditional like the library: on conflict the intent re-reads the live
    // pending value, so a newer resting frame always beats a stale payload.
    if (p)
      void writeConditional(os.storage, p.key, () =>
        camPending.current && camPending.current.key === p.key ? camPending.current.json : p.json
      )
  }, [])
  const applyCam = useCallback(
    (docId: string, v: View) => {
      camRef.current = v
      setCam(v)
      camPending.current = { key: camKey(docId), json: JSON.stringify(v) }
      window.clearTimeout(camSave.current)
      camSave.current = window.setTimeout(flushCam, 250)
    },
    [camKey, flushCam]
  )
  // Camera for a doc this display just opened or adopted: its own stored view
  // wins, else the doc's authored home view frames it. The async stored read
  // only ever overlays while the camera still sits on that same authored frame.
  const loadCam = useCallback(
    (docId: string, authored: View) => {
      camRef.current = authored
      setCam(authored)
      // A still-pending debounced write must land before this read, or the
      // stored camera would answer with a frame the gesture just left.
      flushCam()
      camWait.current.add(docId)
      void os.storage
        .get(camKey(docId))
        .then((raw) => {
          let saved: View | null = null
          try {
            saved = raw ? cleanView(JSON.parse(raw)) : null
          } catch {
            saved = null
          }
          if (saved && camRef.current === authored) {
            camRef.current = saved
            setCam(saved)
            framedDoc.current = docId
          } else if (!saved && camRef.current === authored) {
            // Nothing stored: re-set the authored view as a fresh object so
            // the first-sight effect re-fires and frames this doc.
            setCam({ ...authored, framed: false })
          }
          camWait.current.delete(docId)
        })
        .catch(() => {
          camWait.current.delete(docId)
        })
    },
    [camKey, flushCam]
  )

  // Canvas chrome - a challenge banner up top, the hint and zoom dock strip
  // at the bottom - rides over the board. `fitBox` returns the room between
  // them: w/h the usable box and dy how far its centre sits below the canvas
  // centre, so a fit never slides the circuit under either strip.
  const fitBox = useCallback(() => {
    const el = canvasRef.current
    if (!el) return null
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return null
    const pad = 12
    const top = (bannerRef.current?.getBoundingClientRect().bottom ?? box.top) - box.top
    const bottom = box.bottom - (chromeRef.current?.getBoundingClientRect().top ?? box.bottom)
    return { w: box.width - pad * 2, h: box.height - top - bottom - pad, dy: top - bottom }
  }, [])

  // Selection alone never writes storage - it rides the session mirror only.
  // Its echo is untracked on purpose: a selection write carries no new doc
  // content, so it must not advance docRev and make real peer edits read stale.
  const publishSel = (s: Sel) => {
    if (!admit()) return
    const current = docRef.current
    setSel(s)
    if (current) void os.session.set(DOC_KEY, serializeMirror(ME, current, s, docRev.current, null)).catch(() => {})
  }

  const setMuted = (next: boolean) => {
    if (!admit()) return
    enqueue(() => libWrite(os.storage, LIB_KEY, mutedIntent(next)))
  }

  // A fresh durable read for choices that must see confirmed peer state.
  // A failed or corrupt read resolves to null and the caller aborts - it
  // never acts on a blank library.
  const readLibEntry = async (): Promise<Library | null> => {
    try {
      const e = await os.storage.entry(LIB_KEY)
      return e.v === null ? emptyLibrary() : decodeLibrary(e.v)
    } catch {
      return null
    }
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
            // Heals count too: a heal is the producing write of the merged doc
            // this copy then holds, so it must advance docRev like an edit.
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
  // A visibility flip also drops every armed intent - a wire half-drawn or a
  // delete half-confirmed never survives the fold either way around, and an
  // occluded copy can stay active while invisible, so both flags trigger it.
  useEffect(() => {
    if (!view.visible || !view.active) {
      setArming(null)
      setArmed(null)
      setGhost(null)
      dragRef.current = null
      setGesturing(false)
    }
    if (view.active) void bootRef.current()
  }, [view.active, view.visible])

  // Even while visible, an armed confirm is a momentary intent - disarm after
  // a few idle seconds. The tick re-reads os.view at fire time: the effect's
  // view.active is rAF-batched, so a copy folded mid-window keeps its arming
  // frozen until the flip effect above clears it on return.
  useEffect(() => {
    if (arming === null || !view.active) return
    const t = setTimeout(() => {
      if (admit()) setArming(null)
    }, 6000)
    return () => clearTimeout(t)
  }, [arming, view.active])

  // The inner panel's scroll holds tools and the list together; jumping the
  // list into view when its tab is picked keeps the section out of the fold.
  // The initial mount stays put so PARTS greets the build view.
  const listRef = useRef<HTMLDivElement>(null)
  const prevTab = useRef(panelTab)
  useEffect(() => {
    if (prevTab.current === panelTab) return
    prevTab.current = panelTab
    listRef.current?.scrollIntoView({ block: 'start' })
  }, [panelTab])

  // On the cover, selecting a part scrolls the inspector into view inside the
  // tray so the Selected section is never stranded below the Parts grid.
  const inspectorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (wide || coverTab !== 'Build' || sel === null) return
    inspectorRef.current?.scrollIntoView({ block: 'nearest' })
  }, [sel, wide, coverTab])

  // A write this copy did not make is the settled circuit to converge on;
  // adopting it is what carries the build across the fold. Own writes are
  // already on screen. When a foreign write is a stale fork - its base predates
  // the write that produced our doc - decideRemote answers by republishing our
  // doc with the stale write's op merged in, at a base past the stale write's
  // own revision, so the writer reads the heal as fresher than itself and
  // adopts. Every mergeable edit is preserved on both sides; nothing escalates
  // base counters to duel for the top slot.
  useEffect(() => {
    if (!live.known) return
    const raw = live.raw
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // Seed only after the library hydrates: a fresh copy publishing before it
      // would otherwise let a peer write over circuits it never saw. The
      // choice of what to open is made inside the conditional write, on the
      // freshest library the host commits over - a boot where both copies
      // race still yields one circuit, and a confirmed delete of the welcome
      // doc is never resurrected by a returning display.
      if (!seeded.current && stored.status === 'ready') {
        enqueue(async () => {
          const picked: { doc: Doc | null } = { doc: null }
          const outcome = await libWrite(os.storage, LIB_KEY, (lib) => {
            picked.doc = latestDoc(lib) ?? (lib.tombs.welcome === undefined ? welcomeDoc() : null)
            return picked.doc === null ? null : putDocIntent(picked.doc)(lib)
          })
          if (outcome === 'failed' || outcome === 'gone' || outcome === 'unknown' || !picked.doc) return outcome
          const open = picked.doc
          seeded.current = true
          setDoc(open)
          docRef.current = open
          loadCam(open.id, open.view)
          setSel(null)
          const raw = serializeMirror(ME, open, null, docRev.current, { t: 'doc' })
          lastWritten.current = raw
          await os.session.set(DOC_KEY, raw).catch(() => {})
          return outcome
        })
      }
      return
    }
    const next = parseMirror(raw)
    if (!next || next.by === ME) return
    const cur = docRef.current
    const decision = decideRemote(cur, docRev.current, next, live.rev, answeredRev.current)
    if (decision.kind === 'drop') return
    if (decision.kind === 'heal') {
      // Stale fork answered: our doc plus whatever the stale write changed.
      const merged = decision.doc
      const selNow = pruneSel(selRef.current, merged)
      setDoc(merged)
      docRef.current = merged
      enqueue(() => libWrite(os.storage, LIB_KEY, putDocIntent(merged)))
      // Only the live copy may answer a stale write - a hidden copy's heal
      // would itself be a stale writer. The same write re-decides when this
      // copy becomes visible, so convergence waits for the fold, not for it.
      if (admit()) {
        answeredRev.current = live.rev
        const heal = serializeMirror(ME, merged, selNow, decision.base, null)
        lastWritten.current = heal
        void os.session.set(DOC_KEY, heal).catch(() => {})
      }
      return
    }
    docRev.current = live.rev
    // A different circuit resets the camera too - to this display's stored
    // view for it, or the doc's authored home view. The same doc adopting new
    // content never moves the camera: the mutation is data, not a pan.
    if (cur?.id !== next.doc.id) {
      framedDoc.current = null
      loadCam(next.doc.id, next.doc.view)
    }
    const adopted = next.doc
    setDoc(adopted)
    docRef.current = adopted
    setSel(pruneSel(next.sel, next.doc))
    setArmed(null)
    setArming(null)
    // Persist only if the fresher library does not already hold this version
    // or a confirmed delete of it.
    enqueue(() => libWrite(os.storage, LIB_KEY, putDocIntent(next.doc)))
  }, [live, stored.status, loadCam])

  // First sight of a circuit fits it whole - circuits are small, so the
  // overview is the legible one - for THIS canvas. A hidden copy measures 0x0
  // and defers through the observer until the fold gives it a real box. The
  // fit lands in this display's own camera only: the shared doc and the peer's
  // view never see it.
  useEffect(() => {
    // A framed camera - this display's stored view or its own fit - means the
    // position is already owned; only a fresh authored view gets fitted.
    if (!doc || framedDoc.current === doc.id || cam.framed === true) return
    const el = canvasRef.current
    if (!el) return
    const fitLocal = () => {
      if (camWait.current.has(doc.id)) return
      const b = docBounds(doc)
      const u = fitBox()
      if (!u) return
      framedDoc.current = doc.id
      // First sight floors at a legible zoom rather than a whole-graph
      // overview: 55% still shows the whole I/O row of any scaffold while the
      // counter-scaled bodies keep labels readable. Fit-all stays a tap away.
      const zoom = Math.min(1.15, Math.max(0.55, Math.min(u.w / b.w, u.h / b.h)))
      applyCam(doc.id, { x: -b.cx * zoom, y: u.dy / 2 - b.cy * zoom, zoom, framed: true })
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
  }, [doc, cam, applyCam, fitBox])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Live-solve: the moment every row matches, the challenge is marked and
  // banked - once, not on every render while it stays solved.
  const solvedNow = run?.solved === true && !!activeChallenge && !library.solved.includes(activeChallenge.id)
  useEffect(() => {
    if (!solvedNow || !doc || !activeChallenge) return
    if (!mutedRef.current && admit()) cue('solve')
    setNote(`${activeChallenge.title} solved`)
    enqueue(() => libWrite(os.storage, LIB_KEY, solvedIntent(activeChallenge.id)))
  }, [solvedNow, doc, activeChallenge])

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
      // Keyboard input on the hidden copy - only reachable through forced
      // dispatch - must not mutate; os.view is the live read, not the batched
      // hook value.
      if (confirmDelete !== null || !admit()) return
      const current = docRef.current
      if (!current) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
        const s = selRef.current
        if (!s) return
        event.preventDefault()
        if (s.kind === 'wire') {
          play('cut')
          publish(removeWire(current, s.id), null, { t: 'drop-wire', id: s.id })
        } else if (canDelete(current, s.id)) {
          play('cut')
          publish(removeNode(current, s.id), null, { t: 'drop-node', id: s.id })
        }
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const next = event.shiftKey ? redo(current) : undo(current)
        if (next !== current) {
          play('undo')
          setArmed(null)
          publish(next, undefined, { t: 'doc' })
        }
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        const next = redo(current)
        if (next !== current) {
          play('undo')
          setArmed(null)
          publish(next, undefined, { t: 'doc' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Durable-write status comes from the conditional queue itself: in flight
  // reads Saving, a committed write clears it and an unrecoverable outcome
  // (conflict bound exhausted, dead generation, corrupt blob) reads failed
  // rather than silently pretending a save.
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'failed'>('idle')
  useEffect(() => {
    const update = () => setSaveStatus(savePending > 0 ? 'saving' : saveFailed ? 'failed' : 'idle')
    onSaveState = update
    update()
    return () => {
      onSaveState = null
    }
  }, [])

  if (!doc) return <main ref={rootRef} {...stylex.props(dark, styles.root)} />

  const ev = evaluate(doc)
  const table = truthTable(doc)
  const saving = saveStatus === 'saving'
  const saveErr = saveStatus === 'failed'
  const ins = switchesOf(doc)
  const outs = bulbsOf(doc)
  // The truth-table row matching the live switch pattern, lit for orientation.
  const liveMask = ins.reduce((m, sw, i) => m | (ev.value[sw.id] ? 1 << (ins.length - 1 - i) : 0), 0)
  const okRows = run ? run.rows.filter((r) => r.got.every((g, i) => g === r.want[i])).length : 0

  // ---- gestures ------------------------------------------------------------

  const toWorld = (clientX: number, clientY: number) => {
    const el = canvasRef.current
    const v = camRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: (clientX - rect.left - rect.width / 2 - v.x) / v.zoom,
      y: (clientY - rect.top - rect.height / 2 - v.y) / v.zoom
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Forced input delivered to the folded copy must not start a gesture.
    if (e.button !== 0 || !admit()) return
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
      ox: id ? now.nodes[id]!.x : camRef.current.x,
      oy: id ? now.nodes[id]!.y : camRef.current.y,
      moved: false
    }
    if (armedRef.current) setGhost(toWorld(e.clientX, e.clientY))
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!admit()) return
    if (armedRef.current) setGhost(toWorld(e.clientX, e.clientY))
    const d = dragRef.current
    const now = docRef.current
    if (!d || !now || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    if (!d.moved) setGesturing(true)
    d.moved = true
    if (d.kind === 'pan') applyCam(now.id, { ...camRef.current, x: d.ox + dx, y: d.oy + dy })
    else if (d.id) setDoc(moveNode(now, d.id, d.ox + dx / camRef.current.zoom, d.oy + dy / camRef.current.zoom))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    setGesturing(false)
    const now = docRef.current
    if (!now || !admit()) return
    if (d.moved) {
      if (d.kind === 'node' && d.id) {
        const moved = commitMove(now, d.id, d.ox, d.oy)
        publish(
          moved,
          { kind: 'node', id: d.id },
          {
            t: 'move',
            id: d.id,
            x: moved.nodes[d.id]!.x,
            y: moved.nodes[d.id]!.y
          }
        )
      }
      // A pan was already committed to the per-display camera on each move.
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
        publish(toggleSwitch(now, d.id), { kind: 'node', id: d.id }, { t: 'toggle', id: d.id })
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
    if (!admit()) return
    play(armed === nodeId ? 'cut' : 'arm')
    setArmed(armed === nodeId ? null : nodeId)
    publishSel(null)
  }

  const tapIn = (nodeId: string, port: number) => {
    const now = docRef.current
    if (!now || !admit()) return
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
        `Wired ${now.nodes[from] ? displayName(now.nodes[from]!) : 'pin'} to ${displayName(now.nodes[nodeId]!)}${inputCount(now.nodes[nodeId]!.kind) > 1 ? ` ${PIN_A[port]}` : ''}`
      )
      publish(
        result.doc,
        { kind: 'wire', id: result.wire!.id },
        { t: 'wire', from, to: nodeId, port, id: result.wire!.id }
      )
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
    if (!admit()) return
    const v = camRef.current
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
    publish(next, { kind: 'node', id }, { t: 'add', n: next.nodes[id]! })
  }

  const dropNode = (id: string) => {
    if (!admit()) return
    if (!canDelete(doc, id)) {
      play('reject')
      setNote('Challenge inputs and bulbs stay put')
      return
    }
    play('cut')
    publish(removeNode(doc, id), null, { t: 'drop-node', id })
    setArming(null)
  }

  const dropWire = (id: string) => {
    if (!admit()) return
    play('cut')
    publish(removeWire(doc, id), null, { t: 'drop-wire', id })
  }

  const doUndo = () => {
    if (!admit()) return
    const next = undo(doc)
    if (next === doc) return
    play('undo')
    setArmed(null)
    publish(next, undefined, { t: 'doc' })
  }
  const doRedo = () => {
    if (!admit()) return
    const next = redo(doc)
    if (next === doc) return
    play('undo')
    setArmed(null)
    publish(next, undefined, { t: 'doc' })
  }

  const zoomBy = (factor: number) => {
    if (!admit()) return
    const v = camRef.current
    applyCam(doc.id, { ...v, zoom: v.zoom * factor })
  }
  const fit = () => {
    if (!admit()) return
    const u = fitBox()
    if (!u) return
    const b = docBounds(doc)
    // Explicit Fit keeps the true fit-all as closely as wiring allows: it
    // floors at PIN_PAD_ZOOM so the 44pt pin pads - and the canvas's wiring
    // path - stay live on the small cover where a full fit would hide them.
    const zoom = Math.min(1.15, Math.max(PIN_PAD_ZOOM, Math.min(u.w / b.w, u.h / b.h)))
    applyCam(doc.id, { x: -b.cx * zoom, y: u.dy / 2 - b.cy * zoom, zoom })
  }

  // ---- library & challenges --------------------------------------------------

  const openCircuit = (id: string) => {
    if (!admit()) return
    setArming(null)
    if (id === doc.id) return
    // Read the library fresh: the KV mirror can lag while this copy is
    // occluded, so a circuit the other display just made may not be listed yet.
    void (async () => {
      const next = (await readLibEntry())?.circuits[id]
      if (next && next.id !== docRef.current?.id) {
        framedDoc.current = null
        loadCam(next.id, next.view)
        publish(next, null, { t: 'doc' })
      }
    })()
  }
  const makeCircuit = () => {
    if (!admit()) return
    setArming(null)
    void (async () => {
      const lib = await readLibEntry()
      if (!lib) return
      const next = newDoc(`Circuit ${Object.keys(lib.circuits).length + 1}`)
      framedDoc.current = null
      loadCam(next.id, next.view)
      publish(next, null, { t: 'doc' })
    })()
  }
  const startChallenge = (id: string) => {
    if (!admit()) return
    setArming(null)
    void (async () => {
      const lib = await readLibEntry()
      if (!lib) return
      const existing = Object.values(lib.circuits).find((c) => c.challenge === id)
      const ch = challengeById(id)
      if (!ch) return
      const open = existing ?? scaffold(ch)
      framedDoc.current = null
      loadCam(open.id, open.view)
      publish(open, null, { t: 'doc' })
    })()
  }
  const dropCircuit = (id: string) => {
    if (!admit()) return
    setConfirmDelete(null)
    enqueue(async () => {
      // The replacement doc is minted once so a conflicted retry keeps one
      // stable identity; the open-circuit choice is recomputed per attempt on
      // the freshest library the host commits over.
      const openDoc = docRef.current
      const wantOpen = openDoc?.id === id
      const fallback = wantOpen ? newDoc('Circuit 1') : null
      // The delete binds to the incarnation the user observed - the live doc
      // for the open circuit, the listed row otherwise. Captured once here,
      // never resampled inside the retry: a conflicted retry that found a
      // peer's newer restore or edit must refuse, not re-delete their work.
      const observed = openDoc?.id === id ? openDoc.updated : library.circuits[id]?.updated
      const expected = observed ?? -1 // no observation: refuse any present doc
      const at = Date.now()
      const picked: { doc: Doc | null } = { doc: null }
      const outcome = await libWrite(os.storage, LIB_KEY, (lib) => {
        const cur = lib.circuits[id]
        if (cur && cur.updated !== expected) return null
        let next = dropDocIntent(id, at, expected)(lib) ?? lib
        if (fallback) {
          picked.doc = latestDoc(next) ?? fallback
          next = putDocIntent(picked.doc)(next) ?? next
        }
        return next === lib ? null : next
      })
      if (!picked.doc || outcome === 'failed' || outcome === 'gone' || outcome === 'unknown') return outcome
      const open = picked.doc
      framedDoc.current = null
      loadCam(open.id, open.view)
      setDoc(open)
      docRef.current = open
      setSel(null)
      void os.session.set(DOC_KEY, serializeMirror(ME, open, null, docRev.current, { t: 'doc' })).catch(() => {})
      return outcome
    })
  }

  // ---- pieces ---------------------------------------------------------------

  // Nodes counter-scale against the canvas zoom so first-sight and Fit zooms
  // never shrink a chip below a legible floor; pins ride a separate layer so
  // their 44pt targets stay constant at every zoom.
  const nodeScale = Math.min(1.6, Math.max(1, 0.8 / cam.zoom))
  const zoom = cam.zoom

  const nodeView = (n: CircuitNode) => {
    const dead = ev.dead.has(n.id)
    const on = ev.value[n.id] === true
    return (
      <div key={n.id} {...stylex.props(styles.nodeBox, styles.nodeAt(n.x, n.y, NODE_W[n.kind], NODE_H))}>
        <button
          type="button"
          data-node={n.id}
          aria-label={`${KIND_LABEL[n.kind]} ${displayName(n)}${n.kind === 'switch' ? (on ? ', on' : ', off') : n.kind === 'bulb' ? (on ? ', lit' : ', dark') : ''}`}
          aria-pressed={sel?.kind === 'node' && sel.id === n.id}
          {...stylex.props(
            styles.body,
            styles.bodyScale(nodeScale),
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
          {n.kind !== 'switch' && n.label ? <span {...stylex.props(styles.nodeLabel)}>{n.label}</span> : null}
        </button>
      </div>
    )
  }

  // Every pin as a constant 44pt pad anchored just outside its node body -
  // the pin rests on the pad's inner edge, so the pad and the body never
  // contend for one tap - plus a pip pinned to the true wire endpoint.
  // layoutPads repels colliding pads in screen space; a pad that still
  // collides (or sits under PIN_PAD_ZOOM) renders its dot only, and the
  // inspector's wire rows stay the always-reachable path onto that pin.
  const pinDefs = Object.values(doc.nodes).flatMap((n) => {
    // The counter-scaled visual body reaches `margin` screen px beyond the
    // logical pin; anchoring the pad past it keeps body taps and pin taps on
    // disjoint pixels.
    const margin = (NODE_W[n.kind] * (nodeScale - 1) * zoom) / 2
    const defs: {
      key: string
      node: CircuitNode
      port: number
      x: number
      y: number
      dir: 1 | -1
      margin: number
    }[] = []
    if (hasOutput(n.kind)) defs.push({ key: `${n.id}:out`, node: n, port: -1, dir: 1, margin, ...outPin(n) })
    for (let port = 0; port < inputCount(n.kind); port++)
      defs.push({ key: `${n.id}:${port}`, node: n, port, dir: -1, margin, ...inPin(n, port) })
    return defs
  })
  const pads =
    zoom >= PIN_PAD_ZOOM
      ? layoutPads(
          pinDefs,
          zoom,
          // The bodies pads must not sit on are the visual (counter-scaled)
          // ones, not the logical rects.
          Object.values(doc.nodes).map((n) => ({
            id: n.id,
            x: n.x - (NODE_W[n.kind] * nodeScale) / 2,
            y: n.y - (NODE_H * nodeScale) / 2,
            w: NODE_W[n.kind] * nodeScale,
            h: NODE_H * nodeScale,
            inputs: inputCount(n.kind) > 0,
            output: hasOutput(n.kind)
          }))
        )
      : []

  const canvas = (
    <div
      ref={canvasRef}
      role="application"
      aria-label="Circuit canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      {...stylex.props(styles.canvas, styles.dots, styles.dotsAt(cam.x, cam.y), gesturing && styles.canvasBusy)}
    >
      <div {...stylex.props(styles.world, styles.worldAt(cam.x, cam.y, cam.zoom))}>
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
        {zoom >= PIN_PAD_ZOOM ? (
          <>
            {pinDefs.map((def) => {
              const fed = def.port >= 0 ? wireAt(doc, def.node.id, def.port) : undefined
              const on =
                def.port < 0 ? ev.value[def.node.id] === true : fed !== undefined && ev.value[fed.from] === true
              return (
                <i
                  key={`d${def.key}`}
                  aria-hidden="true"
                  {...stylex.props(
                    styles.pinDot,
                    styles.pinDotAt(def.x, def.y, zoom),
                    on ? styles.pinHigh : styles.pinLow,
                    def.port < 0 && armed === def.node.id && styles.pinArmed,
                    def.port >= 0 && armed !== null && targets.ok.has(def.key) && styles.pinCandidate,
                    def.port >= 0 && armed !== null && targets.bad.has(def.key) && styles.pinBad
                  )}
                />
              )
            })}
            {pads.map((pad, i) => {
              if (pad.off) return null
              const def = pinDefs[i]!
              const n = def.node
              return (
                <button
                  key={pad.key}
                  type="button"
                  data-pin={def.port < 0 ? 'out' : 'in'}
                  aria-label={
                    def.port < 0
                      ? `Output of ${displayName(n)}`
                      : `Input ${inputCount(n.kind) > 1 ? `${PIN_A[def.port]} ` : ''}of ${displayName(n)}${wireAt(doc, n.id, def.port) ? ', wired' : ''}`
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    if (def.port < 0) armOut(n.id)
                    else tapIn(n.id, def.port)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  {...stylex.props(styles.pinPad, styles.pinPadAt(pad.x, pad.y, zoom))}
                />
              )
            })}
          </>
        ) : null}
      </div>
      {activeChallenge ? (
        <div ref={bannerRef} {...stylex.props(styles.banner, run?.solved && styles.bannerSolved)} role="status">
          <span {...stylex.props(run?.solved ? styles.bannerOk : styles.bannerMiss)}>
            {run?.solved ? 'Solved' : `${okRows}/${run?.rows.length ?? 0}`}
          </span>
          <span {...stylex.props(styles.bannerText)}>{activeChallenge.brief}</span>
        </div>
      ) : null}
      <div ref={chromeRef} {...stylex.props(styles.chromeBottom)}>
        <span {...stylex.props(styles.hint)}>
          {armed
            ? pads.some((p) => !p.off && !p.key.endsWith(':out'))
              ? 'Tap an input pin to land the wire'
              : 'Select a part, then tap its input row, to land the wire'
            : pads.some((p) => !p.off && p.key.endsWith(':out'))
              ? 'Tap a switch to flip it. Tap an output pin, then an input, to wire.'
              : 'Tap a switch to flip it. Select a part to wire it.'}
        </span>
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
            onClick={() => applyCam(doc.id, { ...camRef.current, zoom: 1 })}
            {...stylex.props(styles.zoomPct, shared.press)}
          >
            {Math.round(cam.zoom * 100)}%
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
      </div>
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
          const capped =
            kind === 'switch'
              ? switchesOf(doc).length >= MAX_SWITCHES
              : kind === 'bulb'
                ? bulbsOf(doc).length >= MAX_BULBS
                : gatesOf(doc).length >= MAX_GATES
          const disabled = locked || forbidden || capped
          return (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              aria-label={`Add ${KIND_LABEL[kind]}${forbidden ? ' (off the shelf for this challenge)' : capped ? ' (limit reached)' : ''}`}
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
    <div ref={inspectorRef} {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Selected</span>
      {selNode ? (
        <>
          <div {...stylex.props(styles.field)}>
            <TextField
              aria-label="Part label"
              value={selNode.label}
              placeholder={KIND_LABEL[selNode.kind]}
              onChange={(e) =>
                publish(setLabel(doc, selNode.id, e.target.value), undefined, {
                  t: 'label',
                  id: selNode.id,
                  label: e.target.value
                })
              }
            />
          </div>
          {inputCount(selNode.kind) > 0 ? (
            <div role="group" aria-label={`Inputs of ${displayName(selNode)}`} {...stylex.props(styles.list)}>
              {Array.from({ length: inputCount(selNode.kind) }, (_, port) => {
                const fed = wireAt(doc, selNode.id, port)
                const land = armed !== null && armed !== selNode.id && !reaches(doc, selNode.id, armed)
                const pinName = inputCount(selNode.kind) > 1 ? `Input ${PIN_A[port]}` : 'Input'
                return (
                  <button
                    key={pinName}
                    type="button"
                    disabled={!fed && !land}
                    aria-label={
                      land
                        ? `Wire ${armed && doc.nodes[armed] ? displayName(doc.nodes[armed]!) : ''} to ${pinName.toLowerCase()} of ${displayName(selNode)}`
                        : fed
                          ? `Disconnect ${pinName.toLowerCase()} of ${displayName(selNode)}`
                          : `${pinName} of ${displayName(selNode)} is open`
                    }
                    onClick={() => (fed && !land ? dropWire(fed.id) : tapIn(selNode.id, port))}
                    {...stylex.props(styles.pinRow, land && styles.pinRowOn, !fed && !land && styles.pinRowDim)}
                  >
                    <span {...stylex.props(styles.rowName)}>
                      {pinName}
                      {fed && doc.nodes[fed.from] ? ` · from ${displayName(doc.nodes[fed.from]!)}` : ' · open'}
                    </span>
                    {land ? <Sym name="plus" size={12} /> : fed ? <Sym name="trash" size={12} /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}
          <div {...stylex.props(styles.rowBtns)}>
            {hasOutput(selNode.kind) ? (
              <button
                type="button"
                aria-pressed={armed === selNode.id}
                onClick={() => armOut(selNode.id)}
                {...stylex.props(styles.btn, armed === selNode.id && styles.btnAccent, shared.press)}
              >
                <Sym name="plus" size={12} />
                {armed === selNode.id ? 'Cancel wire' : 'Wire from output'}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canDelete(doc, selNode.id)}
              onClick={() =>
                admit() ? (arming === selNode.id ? dropNode(selNode.id) : setArming(selNode.id)) : undefined
              }
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
      {table.truncated ? (
        <span {...stylex.props(styles.meta)}>This doc carries more than 8 switches; the table shows the first 8.</span>
      ) : null}
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
                  if (!admit()) return
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
          onClick={() => {
            if (admit()) onChange(o)
          }}
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
    if (!admit()) return
    setConfirmDelete(null)
    const el = returnFocus.current
    returnFocus.current = null
    // Only the live copy may move focus: a deferred rAF restore on the hidden
    // display would steal it from whichever copy the user is actually on.
    if (el instanceof HTMLElement) {
      let tries = 0
      const restore = () => {
        if (!el.isConnected || !admit()) return
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
          {saveErr ? <span {...stylex.props(styles.chip)}>Save failed</span> : null}
          {chips}
        </header>
        {wide ? (
          <section {...stylex.props(styles.stage)}>
            {canvas}
            <div {...stylex.props(styles.panel)}>
              <div {...stylex.props(styles.panelScroll)}>
                {palette}
                {inspector}
                <div {...stylex.props(styles.sepH)} />
                <div ref={listRef} {...stylex.props(styles.anchor)}>
                  {tabContent(panelTab)}
                </div>
              </div>
              {seg(panelTab, setPanelTab, ['Table', 'Tasks', 'Saved'] as Tab[])}
            </div>
          </section>
        ) : (
          <section {...stylex.props(styles.stage, styles.stageCover)}>
            {canvas}
            <div {...stylex.props(styles.tray, trayOpen && styles.trayOpen)}>
              <div {...stylex.props(styles.trayTop)}>
                {seg(coverTab, setCoverTab, ['Build', 'Table', 'Tasks', 'Saved'] as Tab[])}
                <button
                  type="button"
                  aria-label={trayOpen ? 'Shrink panel' : 'Grow panel'}
                  aria-expanded={trayOpen}
                  onClick={() => admit() && setTrayOpen(!trayOpen)}
                  {...stylex.props(styles.iconBtn, styles.iconBtnLg, shared.press)}
                >
                  <Sym name={trayOpen ? 'down' : 'up'} size={14} />
                </button>
              </div>
              <div {...stylex.props(styles.trayBody, coverTab === 'Build' && styles.trayBodyBuild)}>
                {/* Build splits into a pinned Parts block and the inspector's
                    own scroll pane: the auto-reveal on selection can nudge the
                    inspector, but it can never slide the Parts grid out from
                    under a tap already in flight. */}
                {coverTab === 'Build' ? (
                  <>
                    <div {...stylex.props(styles.buildPin)}>{palette}</div>
                    <div {...stylex.props(styles.buildScroll)}>{inspector}</div>
                  </>
                ) : (
                  tabContent(coverTab)
                )}
              </div>
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
    // os.view is read live: an Escape forced into the folded copy falls
    // through to the SDK's own forwarder instead of cancelling phantom state.
    if (event.key !== 'Escape' || !cancelTop || !admit()) return
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
