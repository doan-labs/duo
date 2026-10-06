import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, IconButton, Push, Sheet, Sym, TextField, useWide } from '@doan-labs/duo-uikit'
import { dark, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue } from './audio.ts'
import {
  applyPalOp,
  type Core,
  contrast,
  coreEq,
  coreOf,
  type Doc,
  exportCodes,
  HARMONY_KINDS,
  HARMONY_LABEL,
  type HarmonyKind,
  type Hsl,
  harmonyColors,
  hslCss,
  hslEq,
  hslToRgb,
  inkFor,
  newDoc,
  newPalette,
  PAL_OP_WINDOW,
  type Pair,
  type PalOp,
  pairChoices,
  palListEq,
  palOpDone,
  parseColorFull,
  parseDocJson,
  parsePalettes,
  parseShared,
  type Rgb,
  ratioFloor,
  redoDoc,
  rgbEq,
  rgbToHsl,
  type SavedPalette,
  SEED_COLOR,
  type SheetKind,
  serializeDoc,
  serializePalettes,
  serializeShared,
  toHex,
  toHslString,
  toRgbString,
  undoDoc,
  variations,
  verdict,
  withCore
} from './color.ts'
import { styles } from './styles.ts'

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

const ME = crypto.randomUUID()
const SESSION_KEY = 'colorlab-doc'
const STORE_DOC = 'colorlab-doc'
const STORE_PALS = 'colorlab-palettes'
const STORE_MUTE = 'colorlab-muted'

interface UiState {
  field: string
  fieldErr: boolean
  page: boolean
  sheet: SheetKind | null
  nameInput: string
  actionId: string | null
  deleteId: string | null
  copyText: string | null
  muted: boolean
}
const UI0: UiState = {
  field: '',
  fieldErr: false,
  page: false,
  sheet: null,
  nameInput: '',
  actionId: null,
  deleteId: null,
  copyText: null,
  muted: false
}

/**
 * Window-capture Escape guard, registered before os.connect() so it fires
 * ahead of the shell's own Escape-goes-home listener. Armed only while a
 * sheet is open or the code field is mid-edit; every other Escape still
 * leaves the app.
 */
let escapeCancel: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !escapeCancel) return
    event.preventDefault()
    event.stopImmediatePropagation()
    escapeCancel()
  },
  true
)

/** One labelled H/S/L row: a painted track, a thumb, pointer and keyboard driven. */
function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  gradient: string
  onDragStart: () => void
  onChange: (v: number) => void
  onDragEnd: () => void
}) {
  const track = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)

  const setFromPointer = (x: number) => {
    const el = track.current
    if (!el) return
    const box = el.getBoundingClientRect()
    if (box.width <= 0) return
    const t = Math.min(1, Math.max(0, (x - box.left) / box.width))
    props.onChange(props.min + t * (props.max - props.min))
  }

  const pct = props.max === props.min ? 0 : ((props.value - props.min) / (props.max - props.min)) * 100
  const text = `${Math.min(props.max, Math.max(props.min, Math.round(props.value)))}${props.unit}`

  return (
    <div {...stylex.props(styles.sliderRow)}>
      <span {...stylex.props(styles.sliderKey)}>{props.label}</span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={props.label}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuenow={Math.min(props.max, Math.max(props.min, Math.round(props.value)))}
        aria-valuetext={text}
        {...stylex.props(styles.sliderHit)}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          props.onDragStart()
          setFromPointer(e.clientX)
        }}
        onPointerMove={(e) => {
          if (dragging.current) setFromPointer(e.clientX)
        }}
        onPointerUp={() => {
          if (!dragging.current) return
          dragging.current = false
          props.onDragEnd()
        }}
        onPointerCancel={() => {
          if (!dragging.current) return
          dragging.current = false
          props.onDragEnd()
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 1
          let next: number | null = null
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = props.value - step
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = props.value + step
          else if (e.key === 'Home') next = props.min
          else if (e.key === 'End') next = props.max
          else if (e.key === 'PageDown') next = props.value - 10 * step
          else if (e.key === 'PageUp') next = props.value + 10 * step
          if (next === null) return
          e.preventDefault()
          props.onDragStart()
          props.onChange(Math.min(props.max, Math.max(props.min, next)))
          props.onDragEnd()
        }}
      >
        <div ref={track} {...stylex.props(styles.sliderTrack, styles.trackBg(props.gradient))}>
          <span {...stylex.props(styles.sliderThumb, styles.thumbAt(pct))} />
        </div>
      </div>
      <span {...stylex.props(styles.sliderVal)}>{text}</span>
    </div>
  )
}

/** Wrapping radio group for the five harmonies, with roving arrow-key focus. */
function HarmonyPicker(props: { value: HarmonyKind; onPick: (k: HarmonyKind) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div role="radiogroup" aria-label="Harmony" {...stylex.props(styles.segRow)}>
      {HARMONY_KINDS.map((k, i) => {
        const on = k === props.value
        return (
          // biome-ignore lint/a11y/useSemanticElements: painted harmony pills need radio semantics, not a bare input
          <button
            key={k}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            {...stylex.props(styles.seg, on && styles.segOn, shared.press)}
            onClick={() => props.onPick(k)}
            onKeyDown={(e) => {
              let step = 0
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step = 1
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step = -1
              else return
              e.preventDefault()
              refs.current[(i + step + HARMONY_KINDS.length) % HARMONY_KINDS.length]?.focus()
            }}
          >
            {HARMONY_LABEL[k]}
          </button>
        )
      })}
    </div>
  )
}

/** Kit Sheet plus the contract's extras: focus the first field, trap Tab, restore focus. */
function GuardedSheet(props: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const dialogId = useId()
  const bodyId = `${dialogId}-body`
  useEffect(() => {
    if (!props.open) return
    document.getElementById(bodyId)?.querySelector<HTMLElement>('input, button')?.focus()
    // Focus restore lives in ColorLab on the sheet-stack closing edge: a
    // swap between sibling sheets must not drop the original row trigger.
  }, [props.open, bodyId])
  if (!props.open) return null
  return (
    <Sheet
      open
      onClose={props.onClose}
      aria-label={props.label}
      id={dialogId}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return
        const root = document.getElementById(bodyId)
        if (!root) return
        const items = root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
        )
        if (!items.length) return
        const first = items[0]!
        const last = items[items.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }}
    >
      <div id={bodyId} {...stylex.props(styles.sheetBody)}>
        {props.children}
      </div>
    </Sheet>
  )
}

function ColorLab() {
  const [doc, setDoc] = useState<Doc | null>(null)
  const [ui, setUi] = useState<UiState>(UI0)
  const [palettes, setPalettes] = useState<SavedPalette[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [note, setNote] = useState('')
  const [fieldEditing, setFieldEditing] = useState(false)

  const docRef = useRef<Doc | null>(null)
  const uiRef = useRef<UiState>(UI0)
  const editBase = useRef<Core | null>(null)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const sheetTrigger = useRef<HTMLElement | null>(null)
  const fieldRef = useRef<HTMLInputElement | null>(null)
  const copyFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const skipFinalize = useRef(false)
  const pendingShared = useRef<Doc | null>(null)
  const publishRaf = useRef(0)
  // The palette library: wire-authoritative, plus my unconfirmed writes.
  const palsRef = useRef<SavedPalette[]>([])
  const palsWireOps = useRef<PalOp[]>([])
  const pendingPalOps = useRef<PalOp[]>([])
  const persistedPals = useRef<string | null>(null)
  const palOpSeq = useRef(0)
  const ellipsisRefs = useRef(new Map<string, HTMLElement>())
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null)
  const saveActionRef = useRef<HTMLButtonElement | null>(null)
  const lastSheet = useRef<SheetKind | null>(null)

  const storedDoc = useKV(os.storage, STORE_DOC)
  const storedPals = useKV(os.storage, STORE_PALS)
  const storedMute = useKV(os.storage, STORE_MUTE)
  const storedDocSet = useRef(storedDoc.set)
  const storedPalsSet = useRef(storedPals.set)
  const storedMuteSet = useRef(storedMute.set)
  storedDocSet.current = storedDoc.set
  storedPalsSet.current = storedPals.set
  storedMuteSet.current = storedMute.set

  const [wideRef, wide] = useWide<HTMLElement>(620)

  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const announce = useCallback((text: string) => setNote(text), [])
  const play = useCallback((c: Cue) => {
    // Only the owning, on-screen copy makes noise, and only while unmuted.
    if (os.view.active && !uiRef.current.muted) cue(c)
  }, [])

  // ---- session mirror ----

  const publish = useCallback((nextDoc: Doc, nextUi: UiState) => {
    void os.session
      .set(
        SESSION_KEY,
        serializeShared({
          by: ME,
          doc: nextDoc,
          view: {
            field: nextUi.field,
            fieldErr: nextUi.fieldErr,
            page: nextUi.page,
            sheet: nextUi.sheet,
            nameInput: nextUi.nameInput,
            actionId: nextUi.actionId,
            deleteId: nextUi.deleteId,
            copyText: nextUi.copyText,
            muted: nextUi.muted
          },
          pals: palsRef.current,
          ops: palsWireOps.current
        })
      )
      .catch(() => {})
  }, [])

  const patchUi = useCallback(
    (patch: Partial<UiState>) => {
      const prev = uiRef.current
      // The element that opens a sheet is its focus-restore target, captured
      // while the activating button still holds focus.
      if (patch.sheet && !prev.sheet && document.activeElement instanceof HTMLElement) {
        sheetTrigger.current = document.activeElement
      }
      const next = { ...prev, ...patch }
      uiRef.current = next
      setUi(next)
      if (patch.muted !== undefined) void storedMuteSet.current(patch.muted ? '1' : '0')
      const d = docRef.current
      if (d) publish(d, next)
    },
    [publish]
  )

  const commitDoc = useCallback(
    (next: Doc, announceText?: string) => {
      docRef.current = next
      setDoc(next)
      publish(next, uiRef.current)
      void storedDocSet.current(serializeDoc(next))
      if (announceText) announce(announceText)
    },
    [publish, announce]
  )

  /** Discrete edit: pushes the previous core onto undo, clears redo. */
  const commitCore = useCallback(
    (patch: Partial<Core>, sound: Cue = 'pick', announceText?: string) => {
      const d = docRef.current
      if (!d) return
      commitDoc(withCore(d, patch), announceText)
      play(sound)
    },
    [commitDoc, play]
  )

  /** Live edit (field typing, slider drag): replaces the colour, no undo step yet. */
  const replaceCore = useCallback(
    (patch: Partial<Core>) => {
      const d = docRef.current
      if (!d) return
      const merged: Core = {
        color: patch.color ?? d.color,
        hsl: patch.hsl ?? (patch.color ? rgbToHsl(patch.color) : d.hsl),
        harmony: patch.harmony ?? d.harmony,
        pair: patch.pair ?? d.pair
      }
      if (coreEq(coreOf(d), merged)) return
      const next: Doc = { ...merged, v: 1, undo: d.undo, redo: [] }
      docRef.current = next
      setDoc(next)
      // Drags coalesce to one session write per frame.
      pendingShared.current = next
      if (!publishRaf.current) {
        publishRaf.current = requestAnimationFrame(() => {
          publishRaf.current = 0
          const pending = pendingShared.current
          pendingShared.current = null
          if (pending) publish(pending, uiRef.current)
        })
      }
    },
    [publish]
  )

  /** Ends a live-edit session: the pre-edit core becomes one undo step. */
  const endLiveEdit = useCallback(() => {
    const base = editBase.current
    editBase.current = null
    const d = docRef.current
    if (!base || !d || coreEq(base, coreOf(d))) return
    commitDoc({ ...d, undo: [...d.undo.slice(-31), base] })
  }, [commitDoc])

  // ---- boot: storage + session ----

  const [live, setLive] = useState<{ raw: string | null; known: boolean }>({ raw: null, known: false })
  useEffect(() => {
    let dead = false
    let off: (() => void) | undefined
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
        setLive({ raw: seen.get(SESSION_KEY) ?? null, known: true })
        off?.()
        off = os.session.watch(rev, (e) => {
          if (e.rev < 0) {
            void boot()
            return
          }
          if (e.k === SESSION_KEY) setLive({ raw: e.v, known: true })
        })
      } catch {
        if (!dead) setTimeout(() => void boot(), 1500)
      }
    }
    void boot()
    return () => {
      dead = true
      off?.()
    }
  }, [])

  const applyUi = useCallback((v: UiState) => {
    uiRef.current = v
    setUi(v)
    // The muted flag is persisted by the copy whose user toggled it; adopting
    // a foreign publish must not rewrite storage, or hidden slider frames
    // would spam redundant writes.
  }, [])

  /** Persist the library only when its serialized form actually changed. */
  const persistPals = useCallback((items: SavedPalette[]) => {
    const wire = serializePalettes(items)
    if (persistedPals.current === wire) return
    persistedPals.current = wire
    void storedPalsSet.current(wire)
  }, [])

  // Adopt foreign writes; seed once storage is hydrated and no session exists.
  useEffect(() => {
    if (!live.known) return
    if (live.raw !== null) {
      if (live.raw === lastSeen.current) return
      lastSeen.current = live.raw
      const shared = parseShared(live.raw)
      if (shared && shared.by !== ME) {
        docRef.current = shared.doc
        setDoc(shared.doc)
        editBase.current = null
        applyUi({
          field: shared.view.field,
          fieldErr: shared.view.fieldErr,
          page: shared.view.page,
          sheet: shared.view.sheet,
          nameInput: shared.view.nameInput,
          actionId: shared.view.actionId,
          deleteId: shared.view.deleteId,
          copyText: shared.view.copyText,
          muted: shared.view.muted
        })
        if (shared.pals !== undefined) {
          // Foreign writes adopt wholesale, then any of my own ops the wire
          // has not settled yet replay onto the adopted list in order. The
          // merge republishes once so the library converges on both copies.
          const seen = new Set((shared.ops ?? []).map((o) => o.id))
          let merged = shared.pals
          const keep: PalOp[] = []
          for (const op of pendingPalOps.current) {
            if (seen.has(op.id) || palOpDone(merged, op)) continue
            const next = applyPalOp(merged, op)
            if (palListEq(next, merged)) continue
            merged = next
            keep.push(op)
          }
          pendingPalOps.current = keep
          palsRef.current = merged
          setPalettes(merged)
          persistPals(merged)
          palsWireOps.current = [...(shared.ops ?? []), ...keep].slice(-PAL_OP_WINDOW)
          if (keep.length && !palListEq(merged, shared.pals)) publish(shared.doc, uiRef.current)
        }
      }
      return
    }
    if (
      seeded.current ||
      storedDoc.status === 'hydrating' ||
      storedMute.status === 'hydrating' ||
      storedPals.status === 'hydrating'
    )
      return
    seeded.current = true
    const initial = parseDocJson(storedDoc.value) ?? newDoc(hslToRgb(SEED_COLOR))
    docRef.current = initial
    setDoc(initial)
    const initialPals = parsePalettes(storedPals.value)
    palsRef.current = initialPals
    setPalettes(initialPals)
    persistedPals.current = storedPals.value
    const bootUi: UiState = { ...UI0, field: toHex(initial.color), muted: storedMute.value === '1' }
    uiRef.current = bootUi
    setUi(bootUi)
    publish(initial, bootUi)
    if (!storedDoc.value) void storedDocSet.current(serializeDoc(initial))
  }, [
    live,
    storedDoc.status,
    storedDoc.value,
    storedMute.status,
    storedMute.value,
    storedPals.status,
    storedPals.value,
    applyUi,
    publish,
    persistPals
  ])

  /** Queue one library write: apply to the freshest list, append the op so a
   *  peer can settle it, then publish the whole shared state. */
  const queuePalOp = useCallback(
    (op: DistOmit<PalOp, 'id'>) => {
      const full = { ...op, id: `${ME}:${++palOpSeq.current}` } as PalOp
      const next = applyPalOp(palsRef.current, full)
      palsRef.current = next
      setPalettes(next)
      palsWireOps.current = [...palsWireOps.current, full].slice(-PAL_OP_WINDOW)
      pendingPalOps.current = [...pendingPalOps.current, full].slice(-32)
      persistPals(next)
      const d = docRef.current
      if (d) publish(d, uiRef.current)
    },
    [publish, persistPals]
  )

  // ---- Escape arming: sheet first, then a mid-edit code field ----

  const closeSheet = useCallback(() => {
    patchUi({ sheet: null, actionId: null, deleteId: null, copyText: null })
  }, [patchUi])

  // Cancel or Escape an armed inline delete: clear it and put focus back on
  // the row's ellipsis, which remounts with the row.
  const dismissDelete = useCallback(() => {
    const id = uiRef.current.deleteId
    patchUi({ deleteId: null })
    requestAnimationFrame(() => {
      if (id) ellipsisRefs.current.get(id)?.focus()
    })
  }, [patchUi])

  const cancelField = useCallback(() => {
    const base = editBase.current
    editBase.current = null
    const d = docRef.current
    if (base && d && !coreEq(base, coreOf(d))) {
      commitDoc({ ...base, v: 1, undo: d.undo, redo: [] })
    }
    const color = docRef.current?.color
    patchUi({ field: color ? toHex(color) : '', fieldErr: false })
    skipFinalize.current = true
    fieldRef.current?.blur()
  }, [commitDoc, patchUi])

  useEffect(() => {
    escapeCancel =
      ui.sheet !== null ? closeSheet : ui.deleteId !== null ? dismissDelete : fieldEditing ? cancelField : null
    return () => {
      escapeCancel = null
    }
  }, [ui.sheet, ui.deleteId, fieldEditing, closeSheet, cancelField, dismissDelete])

  // ---- copy: try the clipboard, fall back to an honest select-and-copy sheet ----

  const tryCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        play('copy')
        announce('Copied to clipboard')
        return true
      } catch {
        // Denied in the sandbox: fall through to the legacy path.
      }
      try {
        const el = copyFieldRef.current
        if (el) {
          el.focus()
          el.select()
          if (document.execCommand('copy')) {
            play('copy')
            announce('Copied to clipboard')
            return true
          }
        }
      } catch {
        // Still blocked: the fallback sheet stays honest.
      }
      return false
    },
    [play, announce]
  )

  const copyText = useCallback(
    async (text: string, label: string) => {
      if (await tryCopy(text)) return
      patchUi({ sheet: 'copy', copyText: text })
      announce(`${label} did not copy automatically - copy it from the field`)
    },
    [tryCopy, patchUi, announce]
  )

  // ---- code field ----

  const finalizeField = useCallback(() => {
    const d = docRef.current
    if (!d) return
    const text = uiRef.current.field
    const info = parseColorFull(text)
    if (info) {
      if (!rgbEq(info.color, d.color) || !hslEq(info.hsl, d.hsl)) replaceCore({ color: info.color, hsl: info.hsl })
      const now = docRef.current!.color
      patchUi({ field: toHex(now), fieldErr: false })
      endLiveEdit()
      play('apply')
      announce(`Colour set to ${toHex(now)}${info.droppedAlpha ? ' - alpha ignored' : ''}`)
    } else {
      patchUi({ field: toHex(d.color), fieldErr: false })
      endLiveEdit()
      if (text.trim() !== '') {
        play('error')
        announce('That code did not parse - kept the last colour')
      }
    }
  }, [replaceCore, patchUi, endLiveEdit, play, announce])

  // ---- palettes ----

  const strip = useMemo(() => {
    if (!doc) return []
    return harmonyColors(doc.hsl, doc.harmony).map(hslToRgb)
  }, [doc])

  const actionPalette = palettes.find((p) => p.id === ui.actionId) ?? null

  const doSave = useCallback(() => {
    const d = docRef.current
    if (!d) return
    const colors = harmonyColors(d.hsl, d.harmony).map(hslToRgb)
    const pal = newPalette(uiRef.current.nameInput || `Palette ${palsRef.current.length + 1}`, colors, d.harmony)
    queuePalOp({ kind: 'add', palette: pal })
    patchUi({ sheet: null, nameInput: '' })
    play('save')
    announce(`Saved ${pal.name}`)
  }, [queuePalOp, patchUi, play, announce])

  const doRename = useCallback(() => {
    const id = uiRef.current.actionId
    if (!id) return
    const live = palsRef.current.find((p) => p.id === id)
    if (!live) {
      // The peer deleted it while the sheet was open: say so, do not pretend.
      patchUi({ sheet: null, actionId: null, nameInput: '' })
      play('error')
      announce('That palette no longer exists')
      return
    }
    queuePalOp({ kind: 'rename', target: id, name: uiRef.current.nameInput })
    patchUi({ sheet: null, actionId: null, nameInput: '' })
    play('save')
    announce('Palette renamed')
  }, [queuePalOp, patchUi, play, announce])

  const doDelete = useCallback(() => {
    const id = uiRef.current.deleteId
    if (!id) return
    patchUi({ deleteId: null })
    if (!palsRef.current.some((p) => p.id === id)) return
    queuePalOp({ kind: 'delete', target: id })
    play('remove')
    announce('Palette deleted')
    // The row unmounts with the delete: move focus to a stable control.
    requestAnimationFrame(() => saveActionRef.current?.focus())
  }, [queuePalOp, patchUi, play, announce])

  const adoptColor = useCallback(
    (c: Rgb, harmony?: HarmonyKind) => {
      commitCore({ color: c, harmony }, 'apply', `Colour set to ${toHex(c)}`)
      patchUi({ field: toHex(c), fieldErr: false })
    },
    [commitCore, patchUi]
  )

  const doUndo = useCallback(() => {
    const d = docRef.current
    if (!d?.undo.length) return
    editBase.current = null
    const next = undoDoc(d)
    commitDoc(next, 'Undo')
    patchUi({ field: toHex(next.color), fieldErr: false })
  }, [commitDoc, patchUi])

  const doRedo = useCallback(() => {
    const d = docRef.current
    if (!d?.redo.length) return
    editBase.current = null
    const next = redoDoc(d)
    commitDoc(next, 'Redo')
    patchUi({ field: toHex(next.color), fieldErr: false })
  }, [commitDoc, patchUi])

  // Focus restore for the whole sheet stack: only when the last sheet closes,
  // so a sheet-to-sheet swap keeps the original row trigger (the palette row's
  // ellipsis) as the restore target instead of a button that just unmounted.
  useEffect(() => {
    if (ui.sheet === null && lastSheet.current !== null) {
      const t = sheetTrigger.current
      sheetTrigger.current = null
      if (t && document.contains(t)) requestAnimationFrame(() => t.focus())
    }
    lastSheet.current = ui.sheet
  }, [ui.sheet])

  // The inline delete confirm takes focus on show so keyboard users land on it.
  useEffect(() => {
    if (ui.deleteId === null) return
    const raf = requestAnimationFrame(() => deleteCancelRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [ui.deleteId])

  // App-level undo/redo keys; text inputs keep the browser's own undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) doRedo()
        else doUndo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        doRedo()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [doUndo, doRedo])

  // ---- render ----

  if (!doc) {
    return <main ref={wideRef} {...stylex.props(darkMode ? dark : light, styles.root)} />
  }

  const hslNow = doc.hsl
  const hex = toHex(doc.color)
  const ink = inkFor(doc.color)
  const ladder = variations(hslNow).map(hslToRgb)
  const ratio = contrast(doc.pair.fg, doc.pair.bg)
  const v = verdict(ratio)
  const chipChoices = pairChoices(doc)
  const fg = toHex(doc.pair.fg)
  const bg = toHex(doc.pair.bg)
  // A pair value that is not in the derived choices still shows as a selected chip.
  const choicesFor = (which: keyof Pair): Rgb[] =>
    chipChoices.some((c) => rgbEq(c, doc.pair[which])) ? chipChoices : [doc.pair[which], ...chipChoices]

  const setPair = (which: keyof Pair, c: Rgb) => {
    commitCore(
      { pair: { ...doc.pair, [which]: c } },
      'pick',
      which === 'fg' ? `Text colour ${toHex(c)}` : `Surface colour ${toHex(c)}`
    )
  }

  const sliderDefs = [
    {
      key: 'h',
      label: 'H',
      min: 0,
      max: 359,
      unit: '\u00b0',
      value: hslNow.h,
      gradient: `linear-gradient(90deg,${[0, 60, 120, 180, 240, 300, 359].map((h) => hslCss({ h, s: hslNow.s, l: hslNow.l })).join(',')})`
    },
    {
      key: 's',
      label: 'S',
      min: 0,
      max: 100,
      unit: '%',
      value: hslNow.s * 100,
      gradient: `linear-gradient(90deg,${[0, 0.5, 1].map((s) => hslCss({ h: hslNow.h, s, l: hslNow.l })).join(',')})`
    },
    {
      key: 'l',
      label: 'L',
      min: 0,
      max: 100,
      unit: '%',
      value: hslNow.l * 100,
      gradient: `linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map((l) => hslCss({ h: hslNow.h, s: hslNow.s, l })).join(',')})`
    }
  ]

  const badge = (label: string, pass: boolean) => (
    <li {...stylex.props(styles.badge)} aria-label={`${label}: ${pass ? 'passes' : 'fails'}`}>
      <span {...stylex.props(styles.badgeIn, pass ? styles.badgePass : styles.badgeFail)}>
        <Sym name={pass ? 'check' : 'close'} size={11} />
      </span>
      <span {...stylex.props(styles.badgeText)}>{label}</span>
    </li>
  )

  const hero = (
    <button
      type="button"
      aria-label={`Current colour ${hex}. Activate to copy the hex code.`}
      {...stylex.props(styles.hero, shared.press, styles.heroFill(hex))}
      onClick={() => void copyText(hex, 'Hex')}
    >
      <span {...stylex.props(styles.heroHex, styles.heroInk(toHex(ink)))}>{hex}</span>
      <span {...stylex.props(styles.heroSub, styles.heroInk(toHex(ink)))}>
        {toRgbString(doc.color)} / {toHslString(hslNow)}
      </span>
    </button>
  )

  const fieldCard = (
    <section {...stylex.props(styles.card)} aria-label="Colour code">
      <div {...stylex.props(styles.fieldRow)}>
        <TextField
          ref={fieldRef}
          value={ui.field}
          aria-label="Colour code: hex, rgb() or hsl()"
          placeholder={`hex, rgb() or hsl() - ${toHex({ r: 64, g: 156, b: 255 })}`}
          aria-invalid={ui.fieldErr}
          onChange={(e) => {
            const text = e.target.value
            const info = parseColorFull(text)
            patchUi({ field: text, fieldErr: text.trim() !== '' && !info })
            if (info && (!rgbEq(info.color, doc.color) || !hslEq(info.hsl, doc.hsl)))
              replaceCore({ color: info.color, hsl: info.hsl })
          }}
          onFocus={() => {
            setFieldEditing(true)
            editBase.current = coreOf(doc)
            requestAnimationFrame(() => fieldRef.current?.select())
          }}
          onBlur={() => {
            setFieldEditing(false)
            // A blur on the copy that just went hidden in a fold must not
            // finalize the shared draft: the other display is still typing.
            if (!os.view.active) return
            // Enter already finalized; the blur that follows must not re-run it.
            if (skipFinalize.current) {
              skipFinalize.current = false
            } else {
              finalizeField()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              skipFinalize.current = true
              finalizeField()
              fieldRef.current?.blur()
            }
          }}
          xstyle={[styles.field, styles.fieldInput]}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <span {...stylex.props(ui.fieldErr ? styles.fieldErr : styles.fieldHint)}>
        {ui.fieldErr ? 'Not a recognised colour code' : 'Type hex, rgb() or hsl() - Enter applies'}
      </span>
      <div {...stylex.props(styles.chipRow)}>
        {(
          [
            ['Hex', hex],
            ['RGB', toRgbString(doc.color)],
            ['HSL', toHslString(hslNow)]
          ] as const
        ).map(([label, value]) => (
          <button
            key={label}
            type="button"
            aria-label={`Copy ${label} ${value}`}
            {...stylex.props(styles.chip, shared.press)}
            onClick={() => void copyText(value, label)}
          >
            <span {...stylex.props(styles.chipLabel)}>{label}</span>
            <span {...stylex.props(styles.chipValue)}>{value}</span>
          </button>
        ))}
      </div>
    </section>
  )

  const adjustCard = (
    <section {...stylex.props(styles.card)} aria-label="Hue, saturation and lightness">
      <div {...stylex.props(styles.sectionHead)}>Adjust</div>
      {sliderDefs.map((s) => (
        <Slider
          key={s.key}
          label={s.label}
          min={s.min}
          max={s.max}
          unit={s.unit}
          value={s.value}
          gradient={s.gradient}
          onDragStart={() => {
            if (!editBase.current) editBase.current = coreOf(doc)
          }}
          onChange={(value) => {
            const next: Hsl =
              s.key === 'h'
                ? { h: value, s: hslNow.s, l: hslNow.l }
                : s.key === 's'
                  ? { h: hslNow.h, s: value / 100, l: hslNow.l }
                  : { h: hslNow.h, s: hslNow.s, l: value / 100 }
            // The slider edits the authoritative HSL; rgb() quantizes after,
            // so hue and saturation survive achromatic and near-black stops.
            replaceCore({ hsl: next, color: hslToRgb(next) })
          }}
          onDragEnd={() => {
            endLiveEdit()
            play('pick')
            patchUi({ field: toHex(docRef.current!.color), fieldErr: false })
          }}
        />
      ))}
    </section>
  )

  const harmonyCard = (
    <section {...stylex.props(styles.card)} aria-label="Colour harmonies">
      <div {...stylex.props(styles.sectionHead)}>Harmony</div>
      <HarmonyPicker
        value={doc.harmony}
        onPick={(k) => commitCore({ harmony: k }, 'pick', `${HARMONY_LABEL[k]} harmony`)}
      />
      <div {...stylex.props(styles.strip)} role="listbox" aria-label="Harmony colours">
        {strip.map((c, i) => {
          const on = rgbEq(c, doc.color)
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: strip position is identity and never reorders
              key={i}
              type="button"
              role="option"
              aria-selected={on}
              aria-label={`${toHex(c)}${on ? ', current' : ''}`}
              {...stylex.props(
                styles.stripSwatch,
                styles.stripCell,
                shared.press,
                styles.paint(toHex(c)),
                on && styles.stripOn
              )}
              onClick={() => adoptColor(c)}
            />
          )
        })}
      </div>
    </section>
  )

  const ladderCard = (
    <section {...stylex.props(styles.card)} aria-label="Tints and shades">
      <div {...stylex.props(styles.sectionHead)}>Tints and shades</div>
      <div {...stylex.props(styles.strip)} role="listbox" aria-label="Lightness variations">
        {ladder.map((c, i) => {
          const on = rgbEq(c, doc.color)
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: ladder position is identity and never reorders
              key={i}
              type="button"
              role="option"
              aria-selected={on}
              aria-label={`${toHex(c)}${on ? ', current' : ''}`}
              {...stylex.props(
                styles.stripSwatch,
                styles.stripCell,
                shared.press,
                styles.paint(toHex(c)),
                on && styles.stripOn
              )}
              onClick={() => adoptColor(c)}
            />
          )
        })}
      </div>
    </section>
  )

  const contrastCard = (
    <section {...stylex.props(styles.card)} aria-label="Contrast checker">
      <div {...stylex.props(styles.sectionHead)}>
        Contrast
        <button
          type="button"
          aria-label="Swap text and surface colours"
          {...stylex.props(styles.sectionAction, shared.press)}
          onClick={() => commitCore({ pair: { fg: doc.pair.bg, bg: doc.pair.fg } }, 'pick', 'Text and surface swapped')}
        >
          Swap
        </button>
      </div>
      <div {...stylex.props(styles.pairGrid)}>
        {(['fg', 'bg'] as const).map((which) => (
          <div key={which} {...stylex.props(styles.pairRow)}>
            <span {...stylex.props(styles.pairLabel)}>{which === 'fg' ? 'Text' : 'Back'}</span>
            <div
              role="radiogroup"
              aria-label={which === 'fg' ? 'Text colour' : 'Surface colour'}
              {...stylex.props(styles.pairChips)}
            >
              {choicesFor(which).map((c) => {
                const on = rgbEq(c, doc.pair[which])
                return (
                  // biome-ignore lint/a11y/useSemanticElements: painted colour swatches need radio semantics, not a bare input
                  <button
                    key={toHex(c)}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={toHex(c)}
                    title={toHex(c)}
                    {...stylex.props(styles.pairChip, shared.press)}
                    onClick={() => setPair(which, c)}
                  >
                    <span {...stylex.props(styles.pairDot, styles.paint(toHex(c)), on && styles.pairChipOn)} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div {...stylex.props(styles.ratioCard)}>
        {/* biome-ignore lint/a11y/useSemanticElements: a labelled readout group, not a fieldset of controls */}
        <div
          {...stylex.props(styles.ratioWrap)}
          role="group"
          aria-label={`Contrast ratio ${ratioFloor(ratio, 2)} to 1`}
        >
          <span {...stylex.props(styles.ratioBig)}>{ratioFloor(ratio, 2)}</span>
          <span {...stylex.props(styles.ratioColon)}>:1</span>
        </div>
        <div {...stylex.props(styles.ratioVerdicts)}>
          <ul aria-label="WCAG results" {...stylex.props(styles.badgeGrid)}>
            {badge('AA lg 3:1', v.aaLarge)}
            {badge('AA 4.5:1', v.aa)}
            {badge('AAA lg 4.5:1', v.aaaLarge)}
            {badge('AAA 7:1', v.aaa)}
          </ul>
          <span {...stylex.props(styles.ratioCaption)}>
            {v.aa ? 'Clear for body text' : v.aaLarge ? 'Large text only' : 'Too low for text'}
          </span>
        </div>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a labelled preview panel, not a fieldset of controls */}
      <div {...stylex.props(styles.preview, styles.pvBg(bg))} role="group" aria-label="Live preview">
        <h3 {...stylex.props(styles.previewTitle, styles.pvFg(fg))}>Card title</h3>
        <p {...stylex.props(styles.previewBody, styles.pvFg(fg))}>
          Body text sits at {ratioFloor(ratio, 1)}:1 here - AA needs 4.5:1, AAA needs 7:1.
        </p>
        <div {...stylex.props(styles.previewBtnRow)}>
          <span {...stylex.props(styles.previewBtn, styles.pvBg(fg), styles.pvFg(bg))}>Button</span>
          <span {...stylex.props(styles.previewLink, styles.pvFg(fg))}>Link text</span>
        </div>
        <span {...stylex.props(styles.previewCaption, styles.pvFg(fg))}>Captions and metadata</span>
      </div>
    </section>
  )

  const palettesCard = (
    <section {...stylex.props(styles.card)} aria-label="Saved palettes">
      <div {...stylex.props(styles.sectionHead)}>
        Saved palettes
        <button
          type="button"
          ref={saveActionRef}
          {...stylex.props(styles.sectionAction, shared.press)}
          onClick={() => patchUi({ sheet: 'save', nameInput: '' })}
        >
          Save current
        </button>
      </div>
      {palettes.length === 0 ? (
        <div {...stylex.props(styles.palEmpty)}>
          <span {...stylex.props(styles.palEmptyIcon)}>
            <Sym name="collections" size={22} />
          </span>
          <span>No saved palettes yet. Save the current harmony strip to reuse it later.</span>
        </div>
      ) : (
        palettes.map((p) => (
          <div key={p.id} {...stylex.props(styles.palRow)}>
            {ui.deleteId === p.id ? (
              <>
                <span {...stylex.props(styles.palInfo)}>
                  <span {...stylex.props(styles.palName)}>Delete {p.name}?</span>
                </span>
                <Button variant="plain" ref={deleteCancelRef} onClick={dismissDelete}>
                  Cancel
                </Button>
                <Button variant="filled" onClick={doDelete}>
                  Delete
                </Button>
              </>
            ) : (
              <>
                <div {...stylex.props(styles.palInfo)}>
                  <button
                    type="button"
                    {...stylex.props(styles.palName, shared.press)}
                    aria-label={`Open palette ${p.name}`}
                    onClick={() => {
                      const first = p.colors[0]
                      if (first) adoptColor(first, p.harmony)
                    }}
                  >
                    {p.name}
                  </button>
                  <span {...stylex.props(styles.palMeta)}>{p.colors.length} colours</span>
                  <div {...stylex.props(styles.palStrip)}>
                    {p.colors.map((c, i) => (
                      <button
                        // biome-ignore lint/suspicious/noArrayIndexKey: swatch position is identity and never reorders
                        key={i}
                        type="button"
                        aria-label={`${p.name} colour ${toHex(c)}`}
                        title={toHex(c)}
                        {...stylex.props(styles.palDotHit, shared.press)}
                        onClick={() => adoptColor(c, p.harmony)}
                      >
                        <span {...stylex.props(styles.palDot, styles.paint(toHex(c)))} />
                      </button>
                    ))}
                  </div>
                </div>
                <IconButton
                  name="ellipsis"
                  variant="plain"
                  aria-label={`Actions for ${p.name}`}
                  xstyle={styles.icon44}
                  ref={(el: HTMLButtonElement | null) => {
                    if (el) ellipsisRefs.current.set(p.id, el)
                    else ellipsisRefs.current.delete(p.id)
                  }}
                  onClick={() => patchUi({ sheet: 'palette', actionId: p.id })}
                />
              </>
            )}
          </div>
        ))
      )}
    </section>
  )

  const inspectorNav = (
    <button
      type="button"
      {...stylex.props(styles.card, styles.navRow, shared.press)}
      onClick={() => patchUi({ page: true })}
      aria-label="Open contrast and preview inspector"
    >
      <span {...stylex.props(styles.navRowIcon)}>
        <Sym name="gauge" size={16} />
      </span>
      <span {...stylex.props(styles.navRowText)}>
        <span {...stylex.props(styles.navRowTitle)}>Contrast and preview</span>
        <span {...stylex.props(styles.navRowSub)}>
          {ratioFloor(ratio, 2)}:1 - {fg} on {bg}
        </span>
      </span>
      <span {...stylex.props(styles.navRowChev)}>
        <Sym name="forward" size={13} />
      </span>
    </button>
  )

  const inspectorPage = (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.hdr)}>
        <IconButton
          name="back"
          variant="plain"
          aria-label="Back"
          xstyle={styles.icon44}
          onClick={() => patchUi({ page: false })}
        />
        <strong {...stylex.props(styles.pageTitle)}>Contrast and preview</strong>
      </div>
      <div {...stylex.props(styles.scroll)}>
        <div {...stylex.props(styles.stage)}>{contrastCard}</div>
      </div>
    </div>
  )

  return (
    <main ref={wideRef as MutableRefObject<HTMLElement | null>} {...stylex.props(darkMode ? dark : light, styles.root)}>
      <div {...stylex.props(styles.appShell)} inert={ui.sheet !== null}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.brand)}>
            <span {...stylex.props(styles.kicker)}>Color Lab</span>
            <h1 {...stylex.props(styles.title)}>{hex}</h1>
          </div>
          <div {...stylex.props(styles.headerActions)}>
            <IconButton
              name="undo"
              variant="plain"
              aria-label="Undo"
              disabled={doc.undo.length === 0}
              xstyle={styles.icon44}
              onClick={doUndo}
            />
            <IconButton
              name="undo"
              variant="plain"
              aria-label="Redo"
              disabled={doc.redo.length === 0}
              xstyle={[styles.icon44, styles.flipX]}
              onClick={doRedo}
            />
            <button
              type="button"
              aria-label="Sounds"
              aria-pressed={!ui.muted}
              {...stylex.props(shared.press, styles.muteBtn, ui.muted && styles.muteOff)}
              onClick={() => {
                patchUi({ muted: !ui.muted })
                announce(ui.muted ? 'Sounds on' : 'Sounds off')
              }}
            >
              <Sym name="volume" size={18} />
              {ui.muted && <span {...stylex.props(styles.muteSlash)} aria-hidden="true" />}
            </button>
          </div>
        </header>

        <Push open={ui.page} sheet={inspectorPage}>
          <div {...stylex.props(styles.scroll)}>
            <div {...stylex.props(styles.stage, wide && styles.stageWide)}>
              <div {...stylex.props(styles.col)}>
                {hero}
                {fieldCard}
                {adjustCard}
                {harmonyCard}
                {ladderCard}
                {!wide && inspectorNav}
              </div>
              {wide ? (
                <div {...stylex.props(styles.colSide)}>
                  {contrastCard}
                  {palettesCard}
                </div>
              ) : (
                palettesCard
              )}
            </div>
          </div>
        </Push>

        <footer {...stylex.props(styles.statusBar)}>
          <div role="status" aria-live="polite" {...stylex.props(styles.status)}>
            <span key={note} {...stylex.props(styles.statusIn)}>
              {note || `${HARMONY_LABEL[doc.harmony]} - ${fg} on ${bg}`}
            </span>
          </div>
        </footer>
      </div>

      <GuardedSheet open={ui.sheet === 'save'} onClose={closeSheet} label="Save palette">
        <h2 {...stylex.props(styles.sheetTitle)}>Save palette</h2>
        <p {...stylex.props(styles.sheetHint)}>Saves the current {HARMONY_LABEL[doc.harmony].toLowerCase()} strip.</p>
        <div {...stylex.props(styles.sheetStrip)} aria-hidden="true">
          {strip.map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: strip position is identity and never reorders
            <span key={i} {...stylex.props(styles.sheetSwatch, styles.paint(toHex(c)))} />
          ))}
        </div>
        <TextField
          value={ui.nameInput}
          aria-label="Palette name"
          placeholder="Name"
          maxLength={40}
          onChange={(e) => patchUi({ nameInput: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              doSave()
            }
          }}
          xstyle={styles.sheetField}
          autoCapitalize="words"
        />
        <div {...stylex.props(styles.actionStack)}>
          <Button variant="filled" xstyle={styles.hit44} onClick={doSave}>
            Save palette
          </Button>
          <Button variant="tinted" xstyle={styles.hit44} onClick={closeSheet}>
            Cancel
          </Button>
        </div>
      </GuardedSheet>

      <GuardedSheet
        open={ui.sheet === 'palette'}
        onClose={closeSheet}
        label={actionPalette ? `Actions for ${actionPalette.name}` : 'Palette actions'}
      >
        <h2 {...stylex.props(styles.sheetTitle)}>{actionPalette?.name ?? 'Palette'}</h2>
        {actionPalette && (
          <div {...stylex.props(styles.sheetStrip)} aria-hidden="true">
            {actionPalette.colors.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: swatch position is identity and never reorders
              <span key={i} {...stylex.props(styles.sheetSwatch, styles.paint(toHex(c)))} />
            ))}
          </div>
        )}
        <div {...stylex.props(styles.actionStack)}>
          <Button
            variant="tinted"
            xstyle={styles.hit44}
            onClick={() => patchUi({ sheet: 'rename', nameInput: actionPalette?.name ?? '' })}
          >
            Rename
          </Button>
          <Button
            variant="tinted"
            xstyle={styles.hit44}
            onClick={() => {
              if (actionPalette) {
                const text = exportCodes(actionPalette.colors, actionPalette.name)
                patchUi({ sheet: null, actionId: null })
                void copyText(text, 'Palette codes')
              }
            }}
          >
            Export codes
          </Button>
          <Button
            variant="tinted"
            xstyle={styles.hit44}
            onClick={() => {
              const id = uiRef.current.actionId
              patchUi({ sheet: null, actionId: null, deleteId: id })
            }}
          >
            Delete
          </Button>
          <Button variant="plain" xstyle={styles.hit44} onClick={closeSheet}>
            Cancel
          </Button>
        </div>
      </GuardedSheet>

      <GuardedSheet open={ui.sheet === 'rename'} onClose={closeSheet} label="Rename palette">
        <h2 {...stylex.props(styles.sheetTitle)}>Rename palette</h2>
        <TextField
          value={ui.nameInput}
          aria-label="Palette name"
          placeholder="Name"
          maxLength={40}
          onChange={(e) => patchUi({ nameInput: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              doRename()
            }
          }}
          xstyle={styles.sheetField}
          autoCapitalize="words"
        />
        <div {...stylex.props(styles.actionStack)}>
          <Button variant="filled" xstyle={styles.hit44} onClick={doRename}>
            Rename
          </Button>
          <Button variant="tinted" xstyle={styles.hit44} onClick={closeSheet}>
            Cancel
          </Button>
        </div>
      </GuardedSheet>

      <GuardedSheet open={ui.sheet === 'copy'} onClose={closeSheet} label="Copy code">
        <h2 {...stylex.props(styles.sheetTitle)}>Copy code</h2>
        <p {...stylex.props(styles.sheetHint)}>
          Automatic clipboard access is blocked for community apps - select the code and copy it, or try again.
        </p>
        <TextField
          // The kit types ref as input; multiline renders a textarea.
          ref={(el) => {
            copyFieldRef.current = el as unknown as HTMLTextAreaElement
          }}
          multiline
          value={ui.copyText ?? ''}
          aria-label="Code to copy"
          readOnly
          onFocus={() => copyFieldRef.current?.select()}
          xstyle={styles.sheetField}
        />
        <div {...stylex.props(styles.actionStack)}>
          <Button
            variant="filled"
            xstyle={styles.hit44}
            onClick={() => {
              if (ui.copyText) void tryCopy(ui.copyText)
            }}
          >
            Copy
          </Button>
          <Button variant="tinted" xstyle={styles.hit44} onClick={closeSheet}>
            Done
          </Button>
        </div>
      </GuardedSheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<ColorLab />)
