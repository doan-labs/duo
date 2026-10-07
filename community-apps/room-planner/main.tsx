import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sheet, Sym, TextField, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue } from './audio.ts'
import { admitSeed, LIB_KEY, LibStore, readLib } from './library.ts'
import {
  addItem,
  CATALOG,
  type Core,
  clearItems,
  commitHistory,
  coreOf,
  docBounds,
  emptyHistory,
  fmtDims,
  fmtLength,
  fmtSnap,
  type History,
  ITEM_LIMIT,
  isOlderEdit,
  itemRect,
  itemSize,
  latestDoc,
  moveItem,
  newPlan,
  PIECE,
  type PlanDoc,
  type Prefs,
  parseLength,
  parseLibrary,
  parseMirror,
  parsePrefs,
  planIssues,
  redoHistory,
  removeItem,
  renameDoc,
  resizeRoom,
  rotateItem,
  serializeMirror,
  serializePrefs,
  setView,
  snapSteps,
  snapTo,
  type Units,
  undoHistory,
  wallGaps,
  withCore,
  withDoc,
  withoutDoc,
  ZOOM_MAX,
  ZOOM_MIN
} from './plan.ts'
import { COVER_PEEK, HUES, HUES_DARK, styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled plan - adopting it unconditionally is what converges the two
// displays, including the race where both seed a fresh session at once.
const ME = crypto.randomUUID()
const DOC_KEY = 'roomplanner-doc'
const PREF_KEY = 'roomplanner-prefs'

// One persistence adapter per copy: its pending intents and committed union
// are the convergence state the other display's writes race against.
const libStore = new LibStore(os.storage)

// os.view is mutated synchronously on every view event, so reading it at
// admission time sees the current flags - the React copy (useDisplay) can lag
// a same-turn flip by a render. A hidden or inactive copy must never admit a
// key, pointer, button or audio cue as if it were live; gestures and writes
// already admitted still complete across the hide.
const liveNow = () => os.view.visible === true && os.view.active === true

type Drag = {
  pointerId: number
  kind: 'pan' | 'item'
  id: string | null
  px: number
  py: number
  ox: number
  oy: number
  moved: boolean
}

// A pinch anchors the world point that sat under its midpoint when the second
// finger landed; every later frame keeps that point fixed under the moving
// midpoint. Storing live view values here instead would drift.
type Pinch = { ids: [number, number]; d0: number; zoom0: number; x0: number; y0: number; mcx: number; mcy: number }

// Registered before os.connect() so it fires ahead of the SDK's window-capture
// Escape-to-home forward: while any app sheet is open, Escape cancels the top
// layer inside the app; at all other times the event passes through and still
// goes home.
const escapeStack: (() => void)[] = []
const pushEscape = (cancel: () => void) => {
  escapeStack.push(cancel)
  return () => {
    const i = escapeStack.indexOf(cancel)
    if (i >= 0) escapeStack.splice(i, 1)
  }
}
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || escapeStack.length === 0) return
    const top = escapeStack[escapeStack.length - 1]
    if (!top) return
    event.preventDefault()
    event.stopImmediatePropagation()
    top()
  },
  true
)

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
// offsetParent is null under a position:fixed ancestor in Blink, so a visible
// check has to measure rects instead of trusting the layout parent.
const focusablesIn = (box: HTMLElement) =>
  [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

/**
 * The kit Sheet is deliberately non-modal: it focuses itself and swallows
 * Escape but leaves the page behind it tabbable. A destructive choice needs
 * real modality - while `active` this trap cycles Tab among the sheet's own
 * controls and hands focus back to the element that opened it.
 */
function useFocusTrap(
  boxRef: RefObject<HTMLElement | null>,
  active: boolean,
  initial: 'first' | 'last' = 'first',
  explicitTrigger?: HTMLElement | null,
  // Focus only ever moves while this copy owns the display: a sheet left open
  // on the folded (hidden) copy must not steal focus from the visible one.
  allowed?: RefObject<boolean>
) {
  const trigger = useRef<HTMLElement | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref contents are read live during the trap, not captured as deps
  useEffect(() => {
    if (!active) return
    trigger.current = explicitTrigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const box = boxRef.current
      if (!box) return
      const els = focusablesIn(box)
      const first = els[0]
      const last = els[els.length - 1]
      if (!first || !last) return
      const at = document.activeElement
      if (e.shiftKey ? at === first || !box.contains(at) : at === last || !box.contains(at)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    const frame = requestAnimationFrame(() => {
      if (allowed && !allowed.current) return
      const els = boxRef.current ? focusablesIn(boxRef.current) : []
      ;(initial === 'last' ? els[els.length - 1] : els[0])?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey, true)
      const el = trigger.current
      if (el?.isConnected) {
        // The trigger sits inside the inert subtree until the close commits,
        // so retry across frames until inert lifts and it takes focus again.
        let tries = 0
        const restore = () => {
          if (!el.isConnected || (allowed && !allowed.current)) return
          el.focus()
          if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
        }
        requestAnimationFrame(restore)
      } else {
        if (allowed && !allowed.current) return
        document.querySelector<HTMLElement>('main button:not([disabled])')?.focus()
      }
    }
  }, [active, initial])
}

/** A destructive confirmation: the kit card plus the modality it leaves out. */
function DestructiveSheet({
  open,
  label,
  onClose,
  restoreTo,
  busy,
  allowed,
  children
}: {
  open: boolean
  label: string
  onClose: () => void
  restoreTo?: HTMLElement | null
  busy?: boolean
  allowed?: RefObject<boolean>
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  // Focus lands on the first control (Keep), never the destructive one: an
  // Enter that opened the sheet must not carry through into a delete.
  useFocusTrap(box, open, 'first', restoreTo, allowed)
  useEffect(() => (open ? pushEscape(onClose) : undefined), [open, onClose])
  return (
    <Sheet open={open} onClose={onClose} aria-label={label}>
      <div ref={box} inert={busy} {...stylex.props(styles.confirm)}>
        {children}
      </div>
    </Sheet>
  )
}

/** A radiogroup with roving tabindex: arrows move focus and select together. */
function Seg<T extends string>({
  label,
  options,
  value,
  onPick
}: {
  label: string
  options: { v: T; name: string }[]
  value: T
  onPick: (v: T) => void
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
    const j = (i + dir + options.length) % options.length
    const next = options[j]
    if (!next) return
    if (next.v !== value) onPick(next.v)
    ;(e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus()
  }
  // Roving radiogroup: the WAI-ARIA segmented pattern. Native radio inputs
  // cannot express roving-tabindex selection on styled action chips, so this
  // keeps button[role=radio] deliberately - the lint warning is the justified
  // exception, not a missing semantic.
  return (
    <div role="radiogroup" aria-label={label} {...stylex.props(styles.segTrack)}>
      {options.map((o, i) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={o.v === value}
          tabIndex={o.v === value ? 0 : -1}
          onClick={() => onPick(o.v)}
          onKeyDown={(e) => onKey(e, i)}
          {...stylex.props(styles.segBtn, shared.press, o.v === value && styles.segOn)}
        >
          {o.name}
        </button>
      ))}
    </div>
  )
}

/**
 * A dimension field: shows the formatted length, drafts locally while focused,
 * and parses on Enter/blur so per-keystroke edits never write half a size.
 * Invalid input reverts and flags red instead of guessing a room size.
 */
function NumField({
  label,
  cm,
  units,
  onCommit,
  onError
}: {
  label: string
  cm: number
  units: Units
  onCommit: (cm: number) => void
  onError: () => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  // The error remembers which room size it complained about: once that value
  // changes underneath (undo, a remote edit) the hint would describe a number
  // the field no longer shows, so it hides itself.
  const [badAt, setBadAt] = useState<number | null>(null)
  const bad = badAt !== null && Math.round(badAt) === Math.round(cm)
  const shown = fmtLength(cm, units)
  const commit = (text: string) => {
    setDraft(null)
    const parsed = parseLength(text, units, 'room')
    if (parsed === null) {
      setBadAt(cm)
      onError()
      return
    }
    setBadAt(null)
    if (Math.round(parsed) !== Math.round(cm)) onCommit(parsed)
  }
  return (
    <div {...stylex.props(styles.field, styles.grow)}>
      <span {...stylex.props(styles.fieldLabel)}>{label}</span>
      <TextField
        aria-label={label}
        value={draft ?? shown}
        inputMode="decimal"
        onFocus={() => {
          setDraft(shown)
          setBadAt(null)
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        xstyle={styles.tallField}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      {bad && (
        <small role="alert" {...stylex.props(styles.meta, styles.metaErr)}>
          Try {units === 'metric' ? '4.6 m, 460 cm' : '15\'6", 15 ft 6 in'}
        </small>
      )}
    </div>
  )
}

const hueFill = (hue: number, darkMode: boolean): string =>
  `${(darkMode ? HUES_DARK : HUES)[hue % HUES.length] ?? HUES[0]}`

function RoomPlanner() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  const stored = useKV(os.storage, LIB_KEY)
  const prefKV = useKV(os.storage, PREF_KEY)
  // Latest session value for the open plan, fed by a raw watch - not useKV.
  const [live, setLive] = useState<{ raw: string | null; known: boolean }>({ raw: null, known: false })
  const [doc, setDoc] = useState<PlanDoc | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [hist, setHist] = useState<History>(emptyHistory)
  const [tab, setTab] = useState<'add' | 'edit' | 'plans'>('add')
  // Cover only: the tray docks as a sheet - collapsed it peeks tabs + saved,
  // open it slides up over the plan. The body goes inert while tucked so
  // keyboard focus can never land on offscreen controls.
  const [trayOpen, setTrayOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | 'clear' | { drop: string; name: string }>(null)
  // Arming is bound to the item it armed for: a selection change (keyboard,
  // pointer or a peer adoption) invalidates it so `Sure?` can only ever
  // destroy the piece it was raised against.
  const [arming, setArming] = useState<string | null>(null)
  const [gesturing, setGesturing] = useState(false)
  // The item this copy is dragging, so its move transition can switch off:
  // a transitioning position would trail the pointer instead of tracking it.
  const [dragId, setDragId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const trayBodyRef = useRef<HTMLDivElement>(null)
  const trayToggleRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const gestureCore = useRef<Core | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<Pinch | null>(null)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  // The doc id this copy framed for its own canvas: one shared view cannot
  // serve a 387pt cover and a 790pt inner, so each display frames the plan it
  // is showing. Cleared wherever a doc arrives carrying a view this copy did
  // not compute (adopt, open, delete-fallback), so the frame effect cannot
  // mistake the foreign view for a local fit.
  const framedDoc = useRef<string | null>(null)
  const docRef = useRef(doc)
  // Newest foreign doc write seen on the wire, for the stale-base publish guard.
  const remoteDoc = useRef<{ id: string; updated: number } | null>(null)
  docRef.current = doc
  const selRef = useRef(sel)
  selRef.current = sel
  const histRef = useRef(hist)
  histRef.current = hist
  const prefs = parsePrefs(prefKV.value)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const activeRef = useRef(view.visible && view.active)
  activeRef.current = view.visible && view.active
  const sheetTrigger = useRef<HTMLElement | null>(null)

  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])

  // Folding mid-gesture strands the pointer: its up/cancel never reaches a
  // hidden iframe. Settle whatever the gesture already moved, then drop every
  // tracked id so the first tap after unfold is single-finger again.
  useEffect(() => {
    if (view.visible) return
    const now = docRef.current
    if ((dragRef.current || pinchRef.current) && now) {
      publishRef.current(now, { prev: gestureCore.current })
    }
    pointersRef.current.clear()
    pinchRef.current = null
    dragRef.current = null
    gestureCore.current = null
    suppressClick.current = false
    // A queued zoom debounce would fire after the fold and publish from the
    // dark - settle it now instead so the peer sees the final view.
    if (wheelTimer.current) {
      clearTimeout(wheelTimer.current)
      wheelTimer.current = null
      if (now) publishRef.current(now)
    }
    setGesturing(false)
    setDragId(null)
    setArming(null)
  }, [view.visible])

  const library = parseLibrary(stored.value)
  const items = doc ? Object.values(doc.items) : []
  const selected = doc && sel ? (doc.items[sel] ?? null) : null
  const issues = doc ? planIssues(doc) : { out: [], hits: [] }
  const issueCount = issues.out.length + issues.hits.length

  // Merges one doc into the freshest library it can read. writeLib replays
  // the merge on top of any peer write that lands mid-flight, so the other
  // display's save cannot be clobbered by this one.
  const saveDoc = (next: PlanDoc) => {
    void libStore.write((lib) => {
      const existing = lib.plans[next.id]
      return !existing || existing.updated <= next.updated ? withDoc(lib, next) : null
    })
  }

  // Every edit lands in both places: the session key carries the live plan
  // across the fold, the library key keeps it durable. A drag writes once, on
  // release - the moving frames only repaint locally. `prev` lets a gesture
  // say what the undo snapshot should be (the doc before the drag began).
  // Sound is only for the copy on the lit display, and only after a gesture
  // has had a chance to unlock the AudioContext.
  const sound = (kind: Cue) => {
    // Cues are admitted on the live view flags, not the React copy: a hidden
    // copy stays silent even when a remote adoption fires mid-fold.
    if (liveNow() && !prefsRef.current.muted) cue(kind)
  }
  const publish = (
    next: PlanDoc,
    opts: { sel?: string | null; tag?: string | null; prev?: Core | null; skipHist?: boolean } = {}
  ) => {
    const selNow = opts.sel === undefined ? selRef.current : opts.sel
    const before = docRef.current
    // A same-doc edit grown from a base older than the newest adopted remote
    // write would stamp stale content back over the fold (act right after
    // unfold, before hydration settles). Adoption is already replaying the
    // fresher doc; this edit is dropped rather than clobbering the peer.
    if (before && before.id === next.id && isOlderEdit(before, remoteDoc.current)) return
    if (!opts.skipHist && before && before.id === next.id) {
      const prev = opts.prev ?? coreOf(before)
      setHist((h) => commitHistory(h, prev, coreOf(next), opts.tag ?? null))
    }
    if (before && before.id !== next.id) setHist(emptyHistory())
    setDoc(next)
    if (opts.sel !== undefined) setSel(opts.sel)
    saveDoc(next)
    void os.session.set(DOC_KEY, serializeMirror(ME, next, selNow)).catch(() => {})
  }
  // Once-registered listeners (keyboard, session watch) call through refs so
  // they never need to re-subscribe on every render.
  const publishRef = useRef(publish)
  publishRef.current = publish

  // Selection is part of the shared truth: a tap that only setSel()'d locally
  // would leave the wire's `sel` stale until the next edit, and a fresh
  // copy's framing republish could then wipe it last-writer-wins on both
  // displays. Selecting publishes the doc unchanged with the new sel.
  const pick = (id: string | null) => {
    if (!liveNow()) return
    const now = docRef.current
    if (id !== selRef.current) setArming(null)
    if (now) publish(now, { sel: id, skipHist: true })
    else setSel(id)
  }
  const soundRef = useRef(sound)
  soundRef.current = sound

  const savePrefs = (next: Prefs) => {
    if (!liveNow()) return
    prefKV.set(serializePrefs(next))
  }

  // Why a raw watch beside useKV: remote KV changes render through a view
  // transition whose callback never runs while this copy is occluded by the
  // fold - the hidden display's useKV value freezes and drops updates. The
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
        setLive({ raw: seen.get(DOC_KEY) ?? null, known: true })
        off()
        off = os.session.watch(rev, (e) => {
          if (e.rev < 0) void boot()
          else if (e.k === DOC_KEY) setLive({ raw: e.v, known: true })
        })
      } catch {
        if (!dead) setTimeout(() => void boot(), 2000)
      }
    }
    void boot()
    return () => {
      dead = true
      off()
    }
  }, [])

  // Why adopt on the session key: the fold carries the open plan to the other
  // display. A write this copy did not make is the new settled plan; own writes
  // are already on screen and are ignored. The raw string is the guard: the
  // effect body must not re-fire on every render of a remote value already on
  // screen.
  useEffect(() => {
    if (!live.known) return
    const raw = live.raw
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // Seed only after the library hydrates: a fresh copy publishing before it
      // would otherwise let a peer write over plans it never saw.
      if (!seeded.current && stored.status === 'ready') {
        seeded.current = true
        void (async () => {
          // Confirm before admitting: the screen only ever shows a doc the
          // store accepted. A failed read is 'unknown', not empty, so the
          // loop re-reads; a failed write retries the whole pass; a peer
          // adopted meanwhile stops the seed without a stale stamp.
          for (let pass = 0; pass < 4; pass++) {
            const open = admitSeed(await readLib(os.storage), docRef.current !== null || remoteDoc.current !== null)
            if (open === 'retry') continue
            if (!open) return
            const wrote = await libStore.write((lib) =>
              (lib.plans[open.id]?.updated ?? -1) >= open.updated ? null : withDoc(lib, open)
            )
            if (!wrote?.confirmed) continue
            if (docRef.current !== null || remoteDoc.current !== null) return
            // The confirmed union can carry a newer peer doc: adopt what won.
            const openNow = latestDoc(wrote.lib) ?? open
            setDoc(openNow)
            setSel(null)
            await os.session.set(DOC_KEY, serializeMirror(ME, openNow, null)).catch(() => {})
            return
          }
          // Never seeded: reopen the gate so a later storage recovery or fold
          // pass can try again instead of leaving a fake welcome on screen.
          seeded.current = false
        })()
      }
      return
    }
    const next = parseMirror(raw)
    if (!next || next.by === ME) return
    if (remoteDoc.current?.id !== next.doc.id || remoteDoc.current.updated < next.doc.updated) {
      remoteDoc.current = { id: next.doc.id, updated: next.doc.updated }
    }
    const now = docRef.current
    // Keep this copy's own view for the plan it already framed: a remote fit
    // was computed for a different canvas and must not replace the local one.
    const keep = now?.id === next.doc.id && framedDoc.current === next.doc.id
    if (!keep) framedDoc.current = null
    // A remote plan is a local history entry: undo on this display steps back
    // through it, so folding never strands an edit.
    if (now?.id === next.doc.id) {
      setHist((h) => commitHistory(h, coreOf(now), coreOf(next.doc), null))
    } else {
      setHist(emptyHistory())
    }
    setDoc(keep && now ? { ...next.doc, view: now.view } : next.doc)
    setSel(next.sel && next.doc.items[next.sel] ? next.sel : null)
    setArming(null)
    // Fold-side sound: faint cues for what the other display just did.
    if (now && now.id === next.doc.id) {
      const before = now.items
      const after = next.doc.items
      const added = Object.keys(after).filter((k) => !before[k]).length
      const dropped = Object.keys(before).filter((k) => !after[k]).length
      const moved = Object.keys(after).some((k) => {
        const a = before[k]
        const b = after[k]
        return !!a && !!b && (a.x !== b.x || a.y !== b.y)
      })
      const spun = Object.keys(after).some((k) => {
        const a = before[k]
        const b = after[k]
        return !!a && !!b && a.rot !== b.rot
      })
      if (added) soundRef.current('place')
      else if (dropped) soundRef.current('delete')
      else if (spun) soundRef.current('rotate')
      else if (moved) soundRef.current('settle')
    }
    void libStore.write((lib) => {
      const existing = lib.plans[next.doc.id]
      return !existing || existing.updated < next.doc.updated ? withDoc(lib, next.doc) : null
    })
  }, [live, stored.status])

  // Whole-blob writes have no CAS: a delayed foreign set can land on top of a
  // commit from this copy and erase it. Every observed change to the library
  // key runs a repair pass that re-offers our union and unconfirmed intents -
  // without it a clobbered plan would simply be gone.
  useEffect(() => {
    if (stored.status === 'ready') void libStore.repair()
  }, [stored])

  // First sight of a plan frames the whole room for THIS canvas: legibility on
  // first sight beats a heritage zoom, and the cover's fit is the app's front
  // door. A hidden copy's canvas measures 0x0, so the observer retries once
  // the fold gives the element a real box; the framed view is published back
  // so it also serves as the stored starting view.
  useEffect(() => {
    if (!doc) return
    const el = canvasRef.current
    if (!el) return
    const fitLocal = () => {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) return
      framedDoc.current = doc.id
      // The zoom dock and the room's top dimension label ride the canvas's
      // upper edge: the fit reserves more headroom up top than at the sides
      // so neither chrome nor callouts collide with the plan.
      const padX = 34
      const padTop = 64
      // On the cover the docked tray always covers COVER_PEEK of the bottom;
      // it never counts the open state - expanding must not re-shrink the
      // plan, so the fit reserves only the peek.
      const padBot = 34 + (wide ? 0 : COVER_PEEK)
      const zoom = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, Math.min((box.width - padX * 2) / doc.room.w, (box.height - padTop - padBot) / doc.room.d))
      )
      const next = setView(doc, {
        x: (-doc.room.w / 2) * zoom,
        y: (-doc.room.d / 2) * zoom + (padTop - padBot) / 2,
        zoom,
        framed: true
      })
      setDoc(next)
      // Framing a stale doc must not push it back over a newer remote write.
      if (!isOlderEdit(doc, remoteDoc.current)) {
        void libStore.write((lib) => {
          const existing = lib.plans[next.id]
          return !existing || existing.updated < next.updated ? withDoc(lib, next) : null
        })
        void os.session.set(DOC_KEY, serializeMirror(ME, next, selRef.current)).catch(() => {})
      }
    }
    const f = requestAnimationFrame(() => {
      if (framedDoc.current !== doc.id) fitLocal()
    })
    const ro = new ResizeObserver(() => {
      const now = docRef.current
      if (!now || now.id !== doc.id) return
      if (framedDoc.current !== doc.id) return fitLocal()
      // Refit on a canvas resize only while the camera is still in auto-fit:
      // a manual pan or zoom sets framed:false and keeps its crop.
      if (now.view.framed !== false) fitLocal()
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(f)
      ro.disconnect()
    }
  }, [doc, wide])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // Editor keyboard: arrows nudge the selection (one snap step, or a cm),
  // R rotates, Delete removes, Cmd/Ctrl+Z steps the plan's own undo stack.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A hidden or inactive copy admits no keys: a forged keydown must not
      // move, delete, undo or write. Gestures admitted while live still run.
      if (!liveNow()) return
      const at = e.target as HTMLElement
      if (at.closest('input, textarea, select')) return
      const now = docRef.current
      if (!now) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const r = e.shiftKey ? redoHistory(histRef.current, coreOf(now)) : undoHistory(histRef.current, coreOf(now))
        if (!r.core) return
        setHist(r.h)
        const next = withCore(now, r.core)
        publishRef.current(next, {
          sel: selRef.current && next.items[selRef.current] ? selRef.current : null,
          skipHist: true
        })
        soundRef.current('undo')
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        const r = redoHistory(histRef.current, coreOf(now))
        if (!r.core) return
        setHist(r.h)
        const next = withCore(now, r.core)
        publishRef.current(next, {
          sel: selRef.current && next.items[selRef.current] ? selRef.current : null,
          skipHist: true
        })
        soundRef.current('undo')
        return
      }
      if (mod) return
      const item = selRef.current ? now.items[selRef.current] : undefined
      if (!item) return
      const step = prefsRef.current.snap > 0 ? prefsRef.current.snap : e.shiftKey ? 10 : 1
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key] as
        | [number, number]
        | undefined
      if (move) {
        e.preventDefault()
        // Pass the active snap step through: the target lands on the snapped
        // grid line at full precision. Rounding a 30.48 cm grid to whole
        // centimetres on each press drifts roughly half a cm per nudge.
        publishRef.current(moveItem(now, item.id, item.x + move[0], item.y + move[1], prefsRef.current.snap))
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        publishRef.current(rotateItem(now, item.id, e.shiftKey ? -1 : 1))
        soundRef.current('rotate')
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        publishRef.current(removeItem(now, item.id), { sel: null })
        setArming(null)
        soundRef.current('delete')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // The ref'd shell renders even while the plan seeds: useWide's observer needs
  // the element on the first commit or it throws before ready can post.
  if (!doc) return <main ref={rootRef} {...stylex.props(dark, styles.root)} />

  const count = items.length
  const saving = stored.status === 'saving'
  const zoom = doc.view.zoom
  // Item labels shrink with the plan; dimension and wall-gap callouts
  // counter-scale instead, floored so they never render under 13 pt: a
  // measurement the reader cannot read is worse than a big one.
  const cs = Math.min(3, Math.max(1, 1 / zoom))
  // Warning flags counter-scale less aggressively - they signal, not measure.
  const fs = Math.min(2, cs)

  const zoomBy = (factor: number) => {
    if (!liveNow()) return
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor))
    publish(setView(doc, { ...doc.view, zoom: z, framed: false }))
  }
  const zoomAt = (px: number, py: number, factor: number) => {
    if (!liveNow()) return
    const box = canvasRef.current?.getBoundingClientRect()
    const now = docRef.current
    if (!box || !now) return
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, now.view.zoom * factor))
    const cx = box.width / 2
    const cy = box.height / 2
    const nx = px - cx - (px - cx - now.view.x) * (z / now.view.zoom)
    const ny = py - cy - (py - cy - now.view.y) * (z / now.view.zoom)
    setDoc({ ...now, view: { ...now.view, x: nx, y: ny, zoom: z, framed: false } })
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => {
      if (docRef.current) publishRef.current(docRef.current)
    }, 280)
  }
  const fit = () => {
    if (!liveNow()) return
    const box = canvasRef.current?.getBoundingClientRect()
    if (!box?.width || !box.height) return
    const b = docBounds(doc)
    const pad = 34
    const z = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, Math.min((box.width - pad * 2) / b.w, (box.height - pad * 2) / b.h))
    )
    publish(setView(doc, { x: -b.cx * z, y: -b.cy * z, zoom: z, framed: true }))
  }

  const undo = () => {
    if (!liveNow()) return
    const r = undoHistory(hist, coreOf(doc))
    if (!r.core) return
    setHist(r.h)
    const next = withCore(doc, r.core)
    setArming(null)
    publish(next, { sel: sel && next.items[sel] ? sel : null, skipHist: true })
    sound('undo')
  }
  const redo = () => {
    if (!liveNow()) return
    const r = redoHistory(hist, coreOf(doc))
    if (!r.core) return
    setHist(r.h)
    const next = withCore(doc, r.core)
    setArming(null)
    publish(next, { sel: sel && next.items[sel] ? sel : null, skipHist: true })
    sound('undo')
  }

  // --- plan actions ----------------------------------------------------------

  const spawn = (kind: string) => {
    if (!liveNow()) return
    if (count >= ITEM_LIMIT) {
      sound('error')
      return
    }
    const piece = PIECE.get(kind)
    if (!piece) return
    // New pieces land at the middle of what this display is looking at,
    // snapped if snapping is on - visible placement, never a surprise corner.
    const wx = -doc.view.x / zoom || 0
    const wy = -doc.view.y / zoom || 0
    const snap = prefs.snap
    const tx = Math.min(doc.room.w - piece.w / 2, Math.max(piece.w / 2, snap > 0 ? snapTo(wx, snap) : wx))
    const ty = Math.min(doc.room.d - piece.d / 2, Math.max(piece.d / 2, snap > 0 ? snapTo(wy, snap) : wy))
    const { doc: next, id } = addItem(doc, kind, tx, ty)
    if (!id) {
      sound('error')
      return
    }
    publish(next, { sel: id })
    setArming(null)
    sound('place')
  }
  const rotateSel = (dir: 1 | -1) => {
    if (!liveNow()) return
    if (!selected) return
    publish(rotateItem(doc, selected.id, dir))
    sound('rotate')
  }
  const dropSel = () => {
    if (!liveNow()) return
    if (!selected) return
    publish(removeItem(doc, selected.id), { sel: null })
    setArming(null)
    sound('delete')
  }
  const commitRoom = (w: number, d: number) => {
    if (!liveNow()) return
    const next = resizeRoom(doc, w, d)
    if (next === doc) return
    publish(next, { sel: null, tag: 'room' })
    sound('settle')
  }
  const pickUnits = (units: Units) => {
    if (!liveNow()) return
    if (units === prefs.units) return
    // Carry the snap over to the nearest step in the new unit system.
    const steps = snapSteps(units)
    const snap = steps.reduce(
      (best, s) => (Math.abs(s - prefs.snap) < Math.abs(best - prefs.snap) ? s : best),
      steps[0]!
    )
    savePrefs({ ...prefs, units, snap })
  }
  const doClear = () => {
    if (!liveNow()) return
    setConfirm(null)
    if (!count) return
    publish(clearItems(doc), { sel: null })
    setArming(null)
    sound('delete')
  }

  const openPlan = (id: string) => {
    if (!liveNow()) return
    if (id === doc.id) return
    // Read the library fresh: the KV mirror can lag while this copy is
    // occluded, so a plan the other display just made may not be listed yet.
    void (async () => {
      const next = (await readLib(os.storage))?.plans[id]
      if (next && next.id !== docRef.current?.id) {
        // The stored view may have been fit for the other display's canvas:
        // opening a plan is a fresh first sight, so this copy frames it again.
        framedDoc.current = null
        publish(next, { sel: null })
        sound('open')
      }
    })()
  }
  const makePlan = () => {
    if (!liveNow()) return
    void (async () => {
      const n = Object.keys((await readLib(os.storage))?.plans ?? {}).length + 1
      framedDoc.current = null
      publish(newPlan(`Layout ${n}`), { sel: null })
      sound('save')
    })()
  }
  const dupPlan = () => {
    if (!liveNow()) return
    const copy: PlanDoc = {
      ...doc,
      id: crypto.randomUUID().slice(0, 8),
      name: `${doc.name} copy`.slice(0, 48),
      updated: Date.now()
    }
    framedDoc.current = null
    publish(copy, { sel: null })
    sound('save')
  }
  const askDrop = (id: string, name: string, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (!liveNow()) return
    sheetTrigger.current = e.currentTarget
    setConfirm({ drop: id, name })
  }
  // Deleting a plan runs as one queued write so a republished doc cannot
  // resurrect it from a stale list. When the open plan goes, the newest
  // remaining one (or a fresh one) takes over the session.
  const dropPlan = () => {
    if (!liveNow()) return
    if (typeof confirm !== 'object' || !confirm?.drop) return
    const id = confirm.drop
    setConfirm(null)
    void (async () => {
      const wrote = await libStore.write((l) => withoutDoc(l, id))
      // The delete only happened if the tombstone is in the reached library:
      // an unreadable or unconfirmed write keeps the current doc instead of
      // publishing a fresh 'Layout 1' over a state nobody saw.
      if (!wrote || wrote.lib.gone[id] === undefined) return
      const open = docRef.current?.id === id ? (latestDoc(wrote.lib) ?? newPlan('Layout 1')) : null
      if (open) {
        await libStore.write((l) => ((l.plans[open.id]?.updated ?? -1) >= open.updated ? null : withDoc(l, open)))
        framedDoc.current = null
        setHist(emptyHistory())
        setDoc(open)
        setSel(null)
        void os.session.set(DOC_KEY, serializeMirror(ME, open, null)).catch(() => {})
      }
    })()
    sound('delete')
  }

  // --- pointer: pan, drag, pinch ---------------------------------------------

  const canvasPoint = (clientX: number, clientY: number) => {
    const box = canvasRef.current?.getBoundingClientRect()
    return box ? { x: clientX - box.left, y: clientY - box.top } : { x: 0, y: 0 }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only the live copy admits a gesture; a drag already in flight keeps its
    // move/up across a hide, so the gate sits on the down alone.
    if (!liveNow()) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const now = docRef.current
    if (!now) return
    // The zoom dock lives inside the canvas: capturing its pointerdown would
    // retarget the release to the canvas and swallow the button's click.
    if ((e.target as HTMLElement).closest('[role="toolbar"]')) return
    // A pointer id can leak when its up/cancel never reaches the canvas - a
    // fold or OS gesture mid-drag hides the iframe before the release lands.
    // Any id that belongs to no live gesture is dead weight; left in the map
    // it makes the next lone tap read as a second finger and pinches dead.
    const live = new Set<number>()
    if (dragRef.current) live.add(dragRef.current.pointerId)
    if (pinchRef.current) for (const id of pinchRef.current.ids) live.add(id)
    for (const id of [...pointersRef.current.keys()]) if (!live.has(id)) pointersRef.current.delete(id)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      // Second finger: abandon the single-finger drag, start the pinch.
      dragRef.current = null
      setDragId(null)
      setGesturing(false)
      const [a, b] = [...pointersRef.current.entries()]
      const pa = canvasPoint(a![1].x, a![1].y)
      const pb = canvasPoint(b![1].x, b![1].y)
      pinchRef.current = {
        ids: [a![0], b![0]],
        d0: Math.max(10, Math.hypot(a![1].x - b![1].x, a![1].y - b![1].y)),
        zoom0: now.view.zoom,
        x0: now.view.x,
        y0: now.view.y,
        mcx: (pa.x + pb.x) / 2,
        mcy: (pa.y + pb.y) / 2
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    const hit = (e.target as HTMLElement).closest('[data-item]')
    const id = hit instanceof HTMLElement ? (hit.dataset.item ?? null) : null
    e.currentTarget.setPointerCapture(e.pointerId)
    gestureCore.current = coreOf(now)
    dragRef.current = {
      pointerId: e.pointerId,
      kind: id ? 'item' : 'pan',
      id,
      px: e.clientX,
      py: e.clientY,
      ox: id ? (now.items[id]?.x ?? 0) : now.view.x,
      oy: id ? (now.items[id]?.y ?? 0) : now.view.y,
      moved: false
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = docRef.current
    if (!now) return
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.zoom0 * (dist / pinch.d0)))
      const box = canvasRef.current?.getBoundingClientRect()
      if (!box) return
      const pa = canvasPoint(a!.x, a!.y)
      const pb = canvasPoint(b!.x, b!.y)
      const mx = (pa.x + pb.x) / 2
      const my = (pa.y + pb.y) / 2
      const cx = box.width / 2
      const cy = box.height / 2
      const nx = mx - cx - (pinch.mcx - cx - pinch.x0) * (z / pinch.zoom0)
      const ny = my - cy - (pinch.mcy - cy - pinch.y0) * (z / pinch.zoom0)
      setDoc({ ...now, view: { ...now.view, x: nx, y: ny, zoom: z, framed: false } })
      return
    }
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    if (!d.moved) {
      setGesturing(true)
      if (d.kind === 'item') setDragId(d.id)
    }
    d.moved = true
    if (d.kind === 'pan') setDoc({ ...now, view: { ...now.view, x: d.ox + dx, y: d.oy + dy, framed: false } })
    else if (d.id) {
      const snap = prefsRef.current.snap
      const wx = snap > 0 ? snapTo(d.ox + dx / now.view.zoom, snap) : d.ox + dx / now.view.zoom
      const wy = snap > 0 ? snapTo(d.oy + dy / now.view.zoom, snap) : d.oy + dy / now.view.zoom
      // Snap goes through so fractional grids (30.48 cm) keep their precision
      // instead of being rounded to whole centimetres into the stored doc.
      setDoc(moveItem(now, d.id, wx, wy, snap))
    }
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    const now = docRef.current
    if (pinchRef.current) {
      if (pointersRef.current.size < 2) {
        pinchRef.current = null
        // One finger still down resumes as a pan from its current spot.
        const rest = [...pointersRef.current.entries()][0]
        if (rest && now) {
          dragRef.current = {
            pointerId: rest[0],
            kind: 'pan',
            id: null,
            px: rest[1].x,
            py: rest[1].y,
            ox: now.view.x,
            oy: now.view.y,
            moved: true
          }
          setGesturing(true)
        }
        if (now) publish(now)
      }
      return
    }
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    setGesturing(false)
    setDragId(null)
    if (d.moved) {
      suppressClick.current = true
      if (now) {
        publish(now, { prev: gestureCore.current })
        if (d.kind === 'item') sound('settle')
      }
      gestureCore.current = null
      return
    }
    setArming(null)
    if (d.kind === 'item' && d.id) {
      if (selRef.current !== d.id) {
        pick(d.id)
        sound('select')
      }
    } else {
      pick(null)
    }
  }

  // --- sections --------------------------------------------------------------

  const paletteSection = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Add furniture</span>
      <div {...stylex.props(styles.paletteGrid)}>
        {CATALOG.map((piece) => (
          <button
            key={piece.kind}
            type="button"
            aria-label={`Add ${piece.name}, ${fmtDims(piece.w, piece.d, prefs.units)}`}
            onClick={() => spawn(piece.kind)}
            {...stylex.props(styles.palItem, shared.press)}
          >
            <i aria-hidden="true" {...stylex.props(styles.palSwatch, styles.swatchAt(hueFill(piece.hue, darkMode)))} />
            <span {...stylex.props(styles.palName)}>
              {piece.name}
              <span {...stylex.props(styles.palDims)}>{fmtDims(piece.w, piece.d, prefs.units)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  const gaps = selected ? wallGaps(doc.room, selected) : null
  const selSize = selected ? itemSize(selected) : null
  const selRect = selected ? itemRect(selected) : null
  // A callout that cannot fit between its item and the wall flips inside the
  // room edge instead of clipping under the wall or riding under the zoom dock.
  const cw = 96 / zoom
  const ch = 48 / zoom
  const gapInL = selRect ? selRect.x0 < cw : false
  const gapInR = selRect ? doc.room.w - (selRect?.x1 ?? 0) < cw : false
  const gapInT = selRect ? selRect.y0 < ch : false
  const gapInB = selRect ? doc.room.d - (selRect?.y1 ?? 0) < ch : false
  const gapCell = (name: string, v: number) => (
    <div {...stylex.props(styles.gapCell)}>
      <span {...stylex.props(styles.gapName)}>{name}</span>
      <span {...stylex.props(styles.gapVal, v < -0.05 && styles.gapValBad)}>{fmtLength(v, prefs.units)}</span>
    </div>
  )

  const selectedSection = selected && selSize && gaps && (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Selected</span>
      <div>
        <div {...stylex.props(styles.selName)}>{PIECE.get(selected.kind)?.name ?? selected.kind}</div>
        <span {...stylex.props(styles.meta)}>{fmtDims(selSize.w, selSize.d, prefs.units)}</span>
      </div>
      <fieldset {...stylex.props(styles.gapGrid)} aria-label="Distance to each wall">
        {gapCell('Left wall', gaps.l)}
        {gapCell('Right wall', gaps.r)}
        {gapCell('Top wall', gaps.t)}
        {gapCell('Bottom wall', gaps.b)}
      </fieldset>
      <div {...stylex.props(styles.rowBtns)}>
        <button
          type="button"
          aria-label="Rotate counter-clockwise"
          onClick={() => rotateSel(-1)}
          {...stylex.props(styles.btn, shared.press)}
        >
          <span aria-hidden="true" {...stylex.props(styles.flipIcon)}>
            <Sym name="reload" size={13} />
          </span>
        </button>
        <button
          type="button"
          aria-label="Rotate clockwise"
          onClick={() => rotateSel(1)}
          {...stylex.props(styles.btn, shared.press)}
        >
          <Sym name="reload" size={13} />
        </button>
        <button
          type="button"
          aria-label={
            arming === selected.id ? 'Confirm delete item' : `Delete ${PIECE.get(selected.kind)?.name ?? 'item'}`
          }
          onClick={() => liveNow() && (arming === selected.id ? dropSel() : setArming(selected.id))}
          {...stylex.props(styles.btn, shared.press, arming === selected.id && styles.btnWarn)}
        >
          <Sym name="trash" size={12} />
          {arming === selected.id ? 'Sure?' : 'Delete'}
        </button>
      </div>
    </div>
  )

  const roomSection = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Room</span>
      <TextField
        aria-label="Layout name"
        value={doc.name}
        xstyle={styles.tallField}
        onChange={(e) => {
          if (!liveNow()) return
          // Whitespace alone is not a name; typing it would blank the plan
          // row everywhere, so nothing below the trim publishes.
          if (e.target.value.trim()) publish(renameDoc(doc, e.target.value), { tag: 'name' })
        }}
      />
      <div {...stylex.props(styles.fieldRow)}>
        <NumField
          label="Width"
          cm={doc.room.w}
          units={prefs.units}
          onCommit={(cm) => commitRoom(cm, doc.room.d)}
          onError={() => sound('error')}
        />
        <NumField
          label="Depth"
          cm={doc.room.d}
          units={prefs.units}
          onCommit={(cm) => commitRoom(doc.room.w, cm)}
          onError={() => sound('error')}
        />
      </div>
      <div {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>Units</span>
        <Seg
          label="Units"
          options={[
            { v: 'metric', name: 'Metric' },
            { v: 'imperial', name: 'Imperial' }
          ]}
          value={prefs.units}
          onPick={pickUnits}
        />
      </div>
      <div {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>Snap to grid</span>
        <fieldset {...stylex.props(styles.chipRow)} aria-label="Snap step">
          {snapSteps(prefs.units).map((step) => (
            <button
              key={step}
              type="button"
              aria-pressed={prefs.snap === step}
              onClick={() => savePrefs({ ...prefs, snap: step })}
              {...stylex.props(styles.chipBtn, shared.press, prefs.snap === step && styles.chipOn)}
            >
              {fmtSnap(step, prefs.units)}
            </button>
          ))}
        </fieldset>
      </div>
      <div {...stylex.props(styles.rowBtns)}>
        <button
          type="button"
          disabled={!count}
          onClick={(e) => {
            if (!liveNow()) return
            sheetTrigger.current = e.currentTarget
            setConfirm('clear')
          }}
          {...stylex.props(styles.btn, shared.press, styles.btnWarn)}
        >
          <Sym name="xmark" size={12} />
          Clear room
        </button>
      </div>
    </div>
  )

  const planRow = (p: PlanDoc) => (
    <div key={p.id} {...stylex.props(styles.fieldRow)}>
      <button
        type="button"
        aria-current={p.id === doc.id}
        title={p.name}
        onClick={() => openPlan(p.id)}
        {...stylex.props(styles.layoutRow, shared.press, styles.grow, p.id === doc.id && styles.layoutOn)}
      >
        <span {...stylex.props(styles.layoutName)}>{p.name}</span>
        <span {...stylex.props(styles.layoutMeta)}>{Object.keys(p.items).length}</span>
        {p.id === doc.id && <Sym name="check" size={12} />}
      </button>
      <button
        type="button"
        aria-label={`Delete ${p.name}`}
        onClick={(e) => askDrop(p.id, p.name, e)}
        {...stylex.props(styles.iconBtn, shared.press)}
      >
        <Sym name="trash" size={13} />
      </button>
    </div>
  )

  const plansSection = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Layouts</span>
      <div {...stylex.props(styles.layoutList)}>
        {Object.values(library.plans)
          .sort((a, b) => b.updated - a.updated)
          .map(planRow)}
        {!Object.keys(library.plans).length && (
          <div {...stylex.props(styles.empty)}>
            <Sym name="stack" size={20} />
            Saved layouts appear here
          </div>
        )}
      </div>
      <div {...stylex.props(styles.rowBtns)}>
        <button type="button" onClick={makePlan} {...stylex.props(styles.btn, shared.press)}>
          <Sym name="plus" size={12} />
          New layout
        </button>
        <button type="button" onClick={dupPlan} {...stylex.props(styles.btn, shared.press)}>
          <Sym name="saved" size={12} />
          Duplicate
        </button>
      </div>
    </div>
  )

  const zoomDock = (
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
        aria-label="Reset zoom to 100 percent"
        onClick={() => publish(setView(doc, { ...doc.view, zoom: 1 }))}
        {...stylex.props(styles.zoomPct, shared.press)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomBy(1.25)}
        {...stylex.props(styles.iconBtn, shared.press)}
      >
        <Sym name="plus" size={13} />
      </button>
      <button type="button" aria-label="Fit room" onClick={fit} {...stylex.props(styles.iconBtn, shared.press)}>
        <Sym name="expand" size={13} />
      </button>
    </div>
  )

  const gridStep = prefs.snap > 0 ? prefs.snap : prefs.units === 'metric' ? 25 : 30.48

  const canvas = (
    <div
      ref={canvasRef}
      role="application"
      aria-label={`Floor plan canvas, ${doc.name}, room ${fmtLength(doc.room.w, prefs.units)} by ${fmtLength(doc.room.d, prefs.units)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onWheel={(e) => {
        const p = canvasPoint(e.clientX, e.clientY)
        zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0012))
      }}
      {...stylex.props(styles.canvas, gesturing && styles.canvasPanning, !wide && styles.canvasCover)}
    >
      <div {...stylex.props(styles.world, styles.worldAt(doc.view.x, doc.view.y, zoom))}>
        <div
          {...stylex.props(
            styles.floor,
            styles.floorAt(doc.room.w, doc.room.d),
            styles.wallColor,
            styles.floorGrid(gridStep)
          )}
        >
          {items
            .slice()
            .sort((a, b) => (a.kind === 'rug' ? -1 : b.kind === 'rug' ? 1 : 0))
            .map((item) => {
              const piece = PIECE.get(item.kind)
              const r = itemRect(item)
              const bad = issues.out.includes(item.id) || issues.hits.includes(item.id)
              const isSel = sel === item.id
              const labelFits = (r.x1 - r.x0) * zoom > 56 && (r.y1 - r.y0) * zoom > 26
              return (
                <button
                  key={item.id}
                  type="button"
                  data-item={item.id}
                  aria-label={`${piece?.name ?? item.kind}, ${fmtDims(r.x1 - r.x0, r.y1 - r.y0, prefs.units)}${bad ? ', outside the room or overlapping' : ''}`}
                  aria-pressed={isSel}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false
                      return
                    }
                    if (selRef.current !== item.id) {
                      pick(item.id)
                      sound('select')
                    }
                  }}
                  {...stylex.props(
                    styles.item,
                    styles.itemAt(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0),
                    styles.itemFill(hueFill(piece?.hue ?? 0, darkMode)),
                    item.kind === 'rug' && styles.itemRug,
                    item.kind === 'rug' ? styles.zRug : styles.zMid,
                    isSel && styles.zSel,
                    bad && !isSel && styles.zFlag,
                    bad && styles.itemBad,
                    dragId === item.id && styles.itemDrag
                  )}
                >
                  {labelFits && (
                    <span {...stylex.props(styles.itemLabel)}>
                      {piece?.name ?? item.kind}
                      {(r.y1 - r.y0) * zoom > 48 && (
                        <span {...stylex.props(styles.itemSub)}>{fmtDims(r.x1 - r.x0, r.y1 - r.y0, prefs.units)}</span>
                      )}
                    </span>
                  )}
                  {bad && (
                    <span aria-hidden="true" {...stylex.props(styles.flag, styles.flagAt(fs))}>
                      !
                    </span>
                  )}
                </button>
              )
            })}
          {selected && selRect && gaps && (
            <>
              <span
                {...stylex.props(
                  styles.gap,
                  gaps.l < -0.05 && styles.gapBad,
                  styles.calloutAt(
                    gapInL ? selRect.x0 + 6 : selRect.x0 - 6,
                    (selRect.y0 + selRect.y1) / 2,
                    gapInL ? `translate(0,-50%) scale(${cs})` : `translate(-100%,-50%) scale(${cs})`,
                    gapInL ? 'left center' : 'right center'
                  )
                )}
              >
                {fmtLength(gaps.l, prefs.units)}
              </span>
              <span
                {...stylex.props(
                  styles.gap,
                  gaps.r < -0.05 && styles.gapBad,
                  styles.calloutAt(
                    gapInR ? selRect.x1 - 6 : selRect.x1 + 6,
                    (selRect.y0 + selRect.y1) / 2,
                    gapInR ? `translate(-100%,-50%) scale(${cs})` : `translate(0,-50%) scale(${cs})`,
                    gapInR ? 'right center' : 'left center'
                  )
                )}
              >
                {fmtLength(gaps.r, prefs.units)}
              </span>
              <span
                {...stylex.props(
                  styles.gap,
                  gaps.t < -0.05 && styles.gapBad,
                  styles.calloutAt(
                    (selRect.x0 + selRect.x1) / 2,
                    gapInT ? selRect.y0 + 6 : selRect.y0 - 6,
                    gapInT ? `translate(-50%,0) scale(${cs})` : `translate(-50%,-100%) scale(${cs})`,
                    gapInT ? 'center top' : 'center bottom'
                  )
                )}
              >
                {fmtLength(gaps.t, prefs.units)}
              </span>
              <span
                {...stylex.props(
                  styles.gap,
                  gaps.b < -0.05 && styles.gapBad,
                  styles.calloutAt(
                    (selRect.x0 + selRect.x1) / 2,
                    gapInB ? selRect.y1 - 6 : selRect.y1 + 6,
                    gapInB ? `translate(-50%,-100%) scale(${cs})` : `translate(-50%,0) scale(${cs})`,
                    gapInB ? 'center bottom' : 'center top'
                  )
                )}
              >
                {fmtLength(gaps.b, prefs.units)}
              </span>
            </>
          )}
        </div>
        <span
          {...stylex.props(
            styles.dimTop,
            styles.calloutAt(doc.room.w / 2, -14, `translate(-50%,-100%) scale(${cs})`, 'center bottom')
          )}
        >
          {fmtLength(doc.room.w, prefs.units)}
        </span>
        <span
          {...stylex.props(
            styles.dimTop,
            styles.calloutAt(-14, doc.room.d / 2, `translate(-50%,-50%) rotate(-90deg) scale(${cs})`, 'center')
          )}
        >
          {fmtLength(doc.room.d, prefs.units)}
        </span>
      </div>
      {zoomDock}
      <span {...stylex.props(styles.hint, !wide && styles.hintCover)}>
        {wide ? 'Drag to pan, drag a piece to move it' : 'Drag to pan, tap a piece'}
      </span>
    </div>
  )

  // Tucking the tray drops the body from tab order; if focus was inside it
  // the chevron takes it so the caret never ends up on an inert control.
  const tuckTray = () => {
    setTrayOpen(false)
    if (trayBodyRef.current?.contains(document.activeElement)) trayToggleRef.current?.focus()
    sound('select')
  }

  const muteBtn = (
    <button
      type="button"
      aria-label={prefs.muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={prefs.muted}
      onClick={() => {
        const next = { ...prefs, muted: !prefs.muted }
        savePrefs(next)
        if (!next.muted) cue('select')
      }}
      {...stylex.props(styles.iconBtn, shared.press)}
    >
      <Sym name="volume" size={14} />
      {prefs.muted && <i aria-hidden="true" {...stylex.props(styles.muteSlash)} />}
    </button>
  )

  const historyBtns = (
    <>
      <button
        type="button"
        aria-label="Undo"
        disabled={!hist.past.length}
        onClick={undo}
        {...stylex.props(styles.iconBtn, shared.press)}
      >
        <Sym name="undo" size={14} />
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={!hist.future.length}
        onClick={redo}
        {...stylex.props(styles.iconBtn, shared.press)}
      >
        <span aria-hidden="true" {...stylex.props(styles.flipIcon)}>
          <Sym name="undo" size={14} />
        </span>
      </button>
    </>
  )

  const statusChip = (
    <span
      role="status"
      aria-label={issueCount ? `${issueCount} placement issues` : `${count} pieces placed`}
      {...stylex.props(styles.chip, issueCount > 0 && styles.chipWarn)}
    >
      {issueCount > 0 ? (
        <>
          <Sym name="info" size={11} />
          {issueCount}
        </>
      ) : (
        count
      )}
    </span>
  )

  return (
    <main ref={rootRef} {...stylex.props(darkMode ? dark : light, styles.root, !wide && styles.rootCover)}>
      <div inert={confirm !== null} {...stylex.props(styles.contents)}>
        {wide ? (
          <>
            <header {...stylex.props(styles.header)}>
              <div {...stylex.props(styles.brand)}>
                <span {...stylex.props(styles.kicker)}>Room Planner</span>
                <h1 title={doc.name} {...stylex.props(styles.title)}>
                  {doc.name}
                </h1>
                <span {...stylex.props(styles.roomLine)}>
                  {fmtDims(doc.room.w, doc.room.d, prefs.units)} - {count} pieces
                </span>
              </div>
              <div {...stylex.props(styles.headerSide)}>
                {statusChip}
                {historyBtns}
                {muteBtn}
              </div>
            </header>
            <section {...stylex.props(styles.stage)}>
              {canvas}
              <aside {...stylex.props(styles.panel)} aria-label="Plan inspector">
                {selectedSection}
                {selectedSection && <span {...stylex.props(styles.sepH)} />}
                {paletteSection}
                <span {...stylex.props(styles.sepH)} />
                {roomSection}
                <span {...stylex.props(styles.sepH)} />
                {plansSection}
                <span role="status" {...stylex.props(styles.saved)}>
                  {!saving && <Sym name="check" size={10} />}
                  {saving ? 'Saving' : 'Synced across both displays'}
                </span>
              </aside>
            </section>
          </>
        ) : (
          <>
            <header {...stylex.props(styles.header)}>
              <div {...stylex.props(styles.brand)}>
                <span {...stylex.props(styles.kicker)}>Room Planner</span>
                <h1 title={doc.name} {...stylex.props(styles.title)}>
                  {doc.name}
                </h1>
              </div>
              <div {...stylex.props(styles.headerSide)}>
                {statusChip}
                {historyBtns}
                {muteBtn}
              </div>
            </header>
            <div {...stylex.props(styles.stageCover)}>
              {canvas}
              <div {...stylex.props(styles.tray, styles.trayDock, styles.trayShift(trayOpen))}>
                <div {...stylex.props(styles.trayHead)}>
                  <div {...stylex.props(styles.segGrow)}>
                    <Seg
                      label="Tray"
                      options={[
                        { v: 'add', name: 'Add' },
                        { v: 'edit', name: 'Edit' },
                        { v: 'plans', name: 'Plans' }
                      ]}
                      value={tab}
                      onPick={(t) => {
                        if (!liveNow()) return
                        if (t === tab) tuckTray()
                        else {
                          setTab(t)
                          setTrayOpen(true)
                          sound('select')
                        }
                      }}
                    />
                  </div>
                  <button
                    ref={trayToggleRef}
                    type="button"
                    aria-expanded={trayOpen}
                    aria-label={trayOpen ? 'Tuck tray away' : 'Show tray panel'}
                    {...stylex.props(styles.iconBtn, shared.press)}
                    onClick={() => {
                      if (!liveNow()) return
                      if (trayOpen) tuckTray()
                      else {
                        setTrayOpen(true)
                        sound('select')
                      }
                    }}
                  >
                    <Sym name={trayOpen ? 'down' : 'up'} size={13} />
                  </button>
                </div>
                <span role="status" {...stylex.props(styles.saved)}>
                  {!saving && <Sym name="check" size={10} />}
                  {saving ? 'Saving' : 'Saved'}
                </span>
                <div ref={trayBodyRef} inert={!trayOpen} {...stylex.props(styles.trayBody)}>
                  {tab === 'add' && paletteSection}
                  {tab === 'edit' && (
                    <>
                      {selectedSection}
                      {selectedSection && <span {...stylex.props(styles.sepH)} />}
                      {roomSection}
                    </>
                  )}
                  {tab === 'plans' && plansSection}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <DestructiveSheet
        open={confirm === 'clear'}
        label="Clear room"
        onClose={() => setConfirm(null)}
        restoreTo={sheetTrigger.current}
        allowed={activeRef}
      >
        <h2 {...stylex.props(styles.confirmTitle)}>Clear this room?</h2>
        <p {...stylex.props(styles.confirmText)}>
          Removes all {count} pieces from {doc.name}. The layout and its walls stay; undo can bring the pieces back.
        </p>
        <div {...stylex.props(styles.confirmBtns)}>
          <button type="button" onClick={() => setConfirm(null)} {...stylex.props(styles.btn, shared.press)}>
            Keep
          </button>
          <button type="button" onClick={doClear} {...stylex.props(styles.btn, shared.press, styles.btnWarn)}>
            <Sym name="trash" size={12} />
            Clear
          </button>
        </div>
      </DestructiveSheet>
      <DestructiveSheet
        open={typeof confirm === 'object' && confirm !== null}
        label="Delete layout"
        onClose={() => setConfirm(null)}
        restoreTo={sheetTrigger.current}
        allowed={activeRef}
      >
        <h2 {...stylex.props(styles.confirmTitle)}>
          Delete {typeof confirm === 'object' && confirm ? confirm.name : 'layout'}?
        </h2>
        <p {...stylex.props(styles.confirmText)}>
          {typeof confirm === 'object' && confirm?.drop === doc.id
            ? 'The newest remaining layout takes its place. This cannot be undone.'
            : 'This layout is removed from the library on both displays. This cannot be undone.'}
        </p>
        <div {...stylex.props(styles.confirmBtns)}>
          <button type="button" onClick={() => setConfirm(null)} {...stylex.props(styles.btn, shared.press)}>
            Keep
          </button>
          <button type="button" onClick={dropPlan} {...stylex.props(styles.btn, shared.press, styles.btnWarn)}>
            <Sym name="trash" size={12} />
            Delete
          </button>
        </div>
      </DestructiveSheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<RoomPlanner />)
