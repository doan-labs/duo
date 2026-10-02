import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import {
  animations,
  Button,
  HStack,
  IconButton,
  List,
  Push,
  Row,
  Section,
  Sheet,
  Sym,
  TextField,
  useDisplay,
  useWide
} from '@doan-labs/duo-uikit'
import { dark, delay, shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import {
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createRoot } from 'react-dom/client'
import {
  addPaletteSlot,
  type CanvasSize,
  type CellEdit,
  clearEdit,
  type DocState,
  EMPTY,
  floodFill,
  type GalleryItem,
  indexAt,
  MAX_NAME,
  newDoc,
  newDocState,
  newWork,
  type PixelDoc,
  parseDocState,
  parseGallery,
  parseShared,
  recordStroke,
  redoWork,
  removePaletteSlot,
  type SharedView,
  type SwatchName,
  serializeDocState,
  serializeGallery,
  serializeShared,
  setPaletteSlot,
  swatchLabel,
  TOKEN_SWATCHES,
  undoWork,
  upsertGallery,
  withEdit
} from './pixel.ts'
import { styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// draft - adopting it unconditionally is what converges the two displays,
// including the race where both seed an empty session at once.
const ME = crypto.randomUUID()

type Tool = 'Paint' | 'Fill' | 'Erase' | 'Pick'
const TOOLS: readonly Tool[] = ['Paint', 'Fill', 'Erase', 'Pick']
type SheetKind = 'new' | 'rename' | 'clear' | 'palette' | 'item' | 'discard'
const SHEET_KINDS: readonly SheetKind[] = ['new', 'rename', 'clear', 'palette', 'item', 'discard']
type SizeLabel = '16 x 16' | '32 x 32'
const SIZE_LABELS: readonly SizeLabel[] = ['16 x 16', '32 x 32']
const SIZE_BY_LABEL: Record<SizeLabel, CanvasSize> = { '16 x 16': 16, '32 x 32': 32 }
type PendingSwap = { type: 'open' | 'new'; id: string | null }

/** Palette slots are token names; this app is themed dark, so slots resolve to the dark hues. */
const SWATCH_COLOR: Record<SwatchName, string> = {
  black: colors.black,
  grey6: colors.grey6Dark,
  grey5: colors.grey5Dark,
  grey4: colors.grey4Dark,
  grey3: colors.grey3Dark,
  grey2: colors.grey2Dark,
  grey: colors.grey,
  white: colors.white,
  red: colors.redDark,
  orange: colors.orangeDark,
  yellow: colors.yellowDark,
  green: colors.greenDark,
  mint: colors.mintDark,
  teal: colors.tealDark,
  cyan: colors.cyanDark,
  blue: colors.blueDark,
  indigo: colors.indigoDark,
  purple: colors.purpleDark,
  pink: colors.pinkDark,
  brown: colors.brownDark
}
const cellColor = (doc: PixelDoc, index: number) =>
  index === EMPTY ? 'transparent' : (SWATCH_COLOR[doc.palette[index]!] ?? 'transparent')

const Cell = memo(function Cell({
  value,
  color,
  label,
  focused
}: {
  value: number
  color: string
  label: string
  focused: boolean
}) {
  return (
    <div
      role="gridcell"
      aria-label={label}
      tabIndex={-1}
      {...stylex.props(styles.cell, value !== EMPTY && styles.cellPaint(color), focused && styles.cellFocus)}
    />
  )
})

/** The artwork redrawn at pixel size: what the drawing looks like with no grid. */
const Mosaic = memo(function Mosaic({
  doc,
  liveCells,
  thumb
}: {
  doc: PixelDoc
  liveCells?: number[]
  thumb?: boolean
}) {
  const cells = liveCells ?? doc.cells
  return (
    <span
      aria-hidden="true"
      {...stylex.props(styles.mosaicGrid(doc.size), thumb ? styles.galleryThumb : styles.mosaic)}
    >
      {cells.map((value, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: pixel position is identity and never reorders
          key={i}
          {...stylex.props(styles.mosaicCell, value !== EMPTY && styles.cellPaint(cellColor(doc, value)))}
        />
      ))}
    </span>
  )
})

/** Native radio-group contract: selection follows the arrow keys, one tab stop lands on the checked option. */
const useRadioKeys = (count: number) => {
  const refs = useRef<(HTMLElement | null)[]>([])
  const move = (next: number, select: (i: number) => void) => {
    if (next < 0 || next >= count) return
    select(next)
    refs.current[next]?.focus()
  }
  const onKeyDown = (i: number, select: (i: number) => void) => (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      move((i + 1) % count, select)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      move((i - 1 + count) % count, select)
    } else if (event.key === 'Home') {
      event.preventDefault()
      move(0, select)
    } else if (event.key === 'End') {
      event.preventDefault()
      move(count - 1, select)
    }
  }
  const slot = (i: number, selected: boolean) => ({
    role: 'radio' as const,
    'aria-checked': selected,
    tabIndex: selected ? 0 : -1,
    ref: (el: HTMLElement | null) => {
      refs.current[i] = el
    }
  })
  return { onKeyDown, slot }
}

/**
 * 44-point labelled radio group standing in for the kit Segmented, whose fixed
 * 22-point options cannot be sized by an app. shared.press keeps the press
 * feedback; selection and focus move together on the arrow keys.
 */
function Choices<T extends string>({
  options,
  value,
  onChange,
  label
}: {
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  label: string
}) {
  const keys = useRadioKeys(options.length)
  return (
    <div role="radiogroup" aria-label={label} {...stylex.props(styles.toolGroup)}>
      {options.map((opt, i) => (
        <button
          type="button"
          key={opt}
          aria-label={opt}
          onClick={() => onChange(opt)}
          onKeyDown={keys.onKeyDown(i, (next) => onChange(options[next]!))}
          {...keys.slot(i, opt === value)}
          {...stylex.props(shared.press, styles.toolSeg, opt === value && styles.toolSegOn)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/**
 * The kit Sheet is a non-modal dialog on purpose, so the app makes the chrome
 * behind it inert, keeps Tab cycling through the dialog's controls and hands
 * focus back to the control that opened it.
 */
function GuardedSheet({
  open,
  onClose,
  label,
  children
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  const trigger = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      wasOpen.current = true
      return
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false
      if (trigger.current?.isConnected) trigger.current.focus()
      trigger.current = null
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const dialog = document.querySelector('dialog[open]')
      if (!dialog) return
      const controls = [...dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]')].filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0
      )
      event.preventDefault()
      if (!controls.length) {
        ;(dialog as HTMLElement).focus()
        return
      }
      const at = controls.indexOf(document.activeElement as HTMLElement)
      const next = event.shiftKey ? (at <= 0 ? controls.length - 1 : at - 1) : at === controls.length - 1 ? 0 : at + 1
      controls[next]!.focus()
    }
    document.addEventListener('keydown', trap, true)
    return () => document.removeEventListener('keydown', trap, true)
  }, [open])
  return (
    <Sheet open={open} onClose={onClose} aria-label={label}>
      {children}
    </Sheet>
  )
}

function PixelStudio() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const draft = useKV(os.storage, 'draft')
  const saved = useKV(os.storage, 'gallery')
  const sharedWork = useKV(os.session, 'work')
  const [state, setState] = useState<DocState | null>(null)
  const [focus, setFocus] = useState(-1)
  const [liveCells, setLiveCells] = useState<number[] | null>(null)

  const gallery = useMemo(() => parseGallery(saved.value), [saved.value])
  const boardRef = useRef<HTMLDivElement>(null)
  const stroke = useRef<{ pointer: number; cells: number[]; edits: Map<number, CellEdit> } | null>(null)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  const storageSeeded = useRef(false)
  const sessionAdopted = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const sessionRef = useRef(sharedWork)
  sessionRef.current = sharedWork
  const draftRef = useRef(draft)
  draftRef.current = draft

  const doc = state?.work.doc ?? null
  const cells = liveCells ?? doc?.cells ?? []

  // View context - tool, palette slot, open page/sheet and editing drafts - is
  // mirrored through os.session on every write, so a fold lands the other
  // display mid-workflow instead of on default controls. Pointer capture and a
  // live stroke stay per-view: both displays never fight over one stroke.
  interface UiState {
    tool: Tool
    color: number
    page: boolean
    sheet: SheetKind | null
    actionId: string | null
    renameTarget: string | null
    nameInput: string
    deleteId: string | null
    editSlot: number
    newName: string
    newSize: SizeLabel
    pending: PendingSwap | null
  }
  const DEFAULT_UI: UiState = {
    tool: 'Paint',
    color: 1,
    page: false,
    sheet: null,
    actionId: null,
    renameTarget: null,
    nameInput: '',
    deleteId: null,
    editSlot: 0,
    newName: '',
    newSize: '16 x 16',
    pending: null
  }
  const [ui, setUi] = useState<UiState>(DEFAULT_UI)
  const uiRef = useRef(ui)
  uiRef.current = ui

  const writeShared = useCallback((st: DocState) => {
    const {
      tool,
      color,
      page,
      sheet,
      actionId,
      renameTarget,
      nameInput,
      deleteId,
      editSlot,
      newName,
      newSize,
      pending
    } = uiRef.current
    const view: SharedView = {
      tool,
      color,
      page,
      sheet,
      actionId,
      renameTarget,
      nameInput,
      deleteId,
      editSlot,
      newName,
      newSize,
      pending
    }
    sessionRef.current.set(serializeShared({ by: ME, ...st, view }))
  }, [])

  const patchUi = useCallback(
    (patch: Partial<UiState>) => {
      const next = { ...uiRef.current, ...patch }
      uiRef.current = next
      setUi(next)
      const st = stateRef.current
      if (st) writeShared(st)
    },
    [writeShared]
  )

  const applyUi = useCallback((v: SharedView, paletteLen: number) => {
    const ui: UiState = {
      tool: (TOOLS as readonly string[]).includes(v.tool) ? (v.tool as Tool) : 'Paint',
      color: Math.max(0, Math.min(v.color, Math.max(0, paletteLen - 1))),
      page: v.page,
      sheet: (SHEET_KINDS as readonly string[]).includes(v.sheet ?? '') ? (v.sheet as SheetKind) : null,
      actionId: v.actionId,
      renameTarget: v.renameTarget,
      nameInput: v.nameInput,
      deleteId: v.deleteId,
      editSlot: v.editSlot,
      newName: v.newName,
      newSize: (SIZE_LABELS as readonly string[]).includes(v.newSize) ? (v.newSize as SizeLabel) : '16 x 16',
      pending: v.pending
    }
    uiRef.current = ui
    setUi(ui)
  }, [])

  // One commit path for every local change: state, the session mirror for the
  // other display and the durable draft, in that order.
  const commit = useCallback(
    (next: DocState) => {
      setState(next)
      writeShared(next)
      void draftRef.current.set(serializeDocState(next))
    },
    [writeShared]
  )

  const commitEdit = useCallback(
    (edit: CellEdit[]) => {
      const st = stateRef.current
      if (!st || !edit.length) return
      commit({ ...st, work: withEdit(st.work, edit), dirty: true })
    },
    [commit]
  )

  const commitDoc = useCallback(
    (nextDoc: PixelDoc, dirty = true) => {
      const st = stateRef.current
      if (!st) return
      commit({ ...st, work: { ...st.work, doc: nextDoc }, dirty })
    },
    [commit]
  )

  // Why adopt on the session key: the fold carries the working draft to the
  // other display. A write this copy did not make is the newer state; own
  // writes are already on screen and are ignored. The raw string is the guard.
  // The doc and view halves always travel together: adopting one without the
  // other would roll an untouched half backwards.
  useEffect(() => {
    if (sharedWork.status === 'hydrating' || sharedWork.status === 'saving') return
    const raw = sharedWork.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    const next = parseShared(raw)
    if (next) {
      if (next.by === ME) return
      sessionAdopted.current = true
      const { by: _by, view: nextView, ...rest } = next
      setState(rest)
      setLiveCells(null)
      if (nextView) applyUi(nextView, rest.work.doc.palette.length)
      return
    }
    // Empty or malformed session: seed this copy's state once storage has landed.
    if (seeded.current || draft.status === 'hydrating' || !storageSeeded.current) return
    seeded.current = true
    const st = stateRef.current
    if (st) writeShared(st)
  }, [sharedWork.value, sharedWork.status, draft.status, writeShared, applyUi])

  // Why once: the durable draft is the record of last session's work, read at
  // mount. After that the session is the live source, so a late storage refresh
  // must not rewind adopted session state.
  useEffect(() => {
    if (draft.status === 'hydrating' || storageSeeded.current) return
    storageSeeded.current = true
    if (sessionAdopted.current) return
    setState(parseDocState(draft.value) ?? newDocState(16, 'Untitled'))
  }, [draft.status, draft.value])

  const flushStroke = useCallback(() => {
    const s = stroke.current
    if (!s) return
    stroke.current = null
    setLiveCells(null)
    commitEdit([...s.edits.values()])
  }, [commitEdit])

  // A fold or a blur mid-stroke still commits the stroke: the pending diffs are
  // already the newer draft, and the other display picks them up.
  useEffect(() => {
    const flush = () => flushStroke()
    addEventListener('blur', flush)
    return () => removeEventListener('blur', flush)
  }, [flushStroke])

  useEffect(() => {
    if (!view.visible) flushStroke()
  }, [view.visible, flushStroke])

  const cellIndex = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = boardRef.current
    const st = stateRef.current
    if (!el || !st) return -1
    const rect = el.getBoundingClientRect()
    const size = st.work.doc.size
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * size)
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * size)
    if (x < 0 || y < 0 || x >= size || y >= size) return -1
    return indexAt(size, x, y)
  }

  const paintAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = stroke.current
    const st = stateRef.current
    if (!s || !st) return
    const i = cellIndex(event)
    if (i < 0) return
    setFocus(i)
    const active = uiRef.current.tool
    if (active === 'Pick') {
      const value = s.cells[i]!
      if (value !== EMPTY) patchUi({ color: value })
      return
    }
    if (active === 'Fill') {
      for (const c of floodFill(s.cells, st.work.doc.size, i, uiRef.current.color)) {
        s.edits.set(c.i, c)
        s.cells[c.i] = c.to
      }
    } else {
      const next = active === 'Erase' ? EMPTY : uiRef.current.color
      recordStroke(s.edits, s.cells, i, next)
      s.cells[i] = next
    }
    setLiveCells(s.cells.slice())
  }

  const beginStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const st = stateRef.current
    if (!st || stroke.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    boardRef.current?.setPointerCapture(event.pointerId)
    stroke.current = { pointer: event.pointerId, cells: st.work.doc.cells.slice(), edits: new Map() }
    paintAt(event)
  }

  const moveStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stroke.current?.pointer === event.pointerId) paintAt(event)
  }

  const applyAt = (i: number) => {
    const st = stateRef.current
    if (!st || i < 0) return
    const { tool, color } = uiRef.current
    const value = st.work.doc.cells[i]!
    if (tool === 'Pick') {
      if (value !== EMPTY) patchUi({ color: value })
      return
    }
    if (tool === 'Fill') {
      commitEdit(floodFill(st.work.doc.cells, st.work.doc.size, i, color))
      return
    }
    const next = tool === 'Erase' ? EMPTY : color
    commitEdit(value === next ? [] : [{ i, from: value, to: next }])
  }

  const onBoardKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const st = stateRef.current
    if (!st) return
    const size = st.work.doc.size
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      commit({ ...st, work: event.shiftKey ? redoWork(st.work) : undoWork(st.work), dirty: true })
      return
    }
    if (event.key === 'y' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      commit({ ...st, work: redoWork(st.work), dirty: true })
      return
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return
    let next = -1
    if (event.key === 'ArrowLeft') next = Math.max(0, (focus < 0 ? 0 : focus) - 1)
    else if (event.key === 'ArrowRight') next = Math.min(size * size - 1, (focus < 0 ? -1 : focus) + 1)
    else if (event.key === 'ArrowUp') next = Math.max(0, (focus < 0 ? 0 : focus) - size)
    else if (event.key === 'ArrowDown') next = Math.min(size * size - 1, (focus < 0 ? -size : focus) + size)
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (focus >= 0) applyAt(focus)
      return
    } else return
    event.preventDefault()
    setFocus(next)
  }

  const saveDoc = () => {
    const st = stateRef.current
    if (!st) return
    saved.set(serializeGallery(upsertGallery(gallery, st.work.doc)))
    commit({ ...st, galleryId: st.work.doc.id, dirty: false })
  }

  // Opening a saved creation or starting a new canvas with unsaved edits detours
  // through the discard sheet first; a confirmed swap runs the operation that was
  // asked for, and Cancel keeps the dirty draft, its pixels and its undo stack.
  const openItem = (item: GalleryItem) => {
    const st = stateRef.current
    if (st?.dirty) {
      patchUi({ sheet: 'discard', pending: { type: 'open', id: item.id } })
      return
    }
    forceOpen(item)
  }

  const forceOpen = (item: GalleryItem) => {
    commit({ work: newWork(item.doc), galleryId: item.id, dirty: false })
    patchUi({ page: false, deleteId: null, sheet: null, pending: null })
    setFocus(-1)
  }

  const createDoc = () => {
    const st = stateRef.current
    if (st?.dirty) {
      patchUi({ sheet: 'discard', pending: { type: 'new', id: null } })
      return
    }
    forceCreate()
  }

  const forceCreate = () => {
    const name = (uiRef.current.newName.trim() || 'Untitled').slice(0, MAX_NAME)
    commit({ work: newWork(newDoc(SIZE_BY_LABEL[uiRef.current.newSize], name)), galleryId: null, dirty: false })
    patchUi({ page: false, sheet: null, pending: null, newName: '', newSize: '16 x 16' })
    setFocus(-1)
  }

  const cancelPending = () => patchUi({ sheet: uiRef.current.pending?.type === 'new' ? 'new' : null, pending: null })

  const confirmPending = (saveFirst: boolean) => {
    const p = uiRef.current.pending
    if (!p) {
      patchUi({ sheet: null })
      return
    }
    if (saveFirst) saveDoc()
    if (p.type === 'open') {
      const item = gallery.find((i) => i.id === p.id)
      if (item) {
        forceOpen(item)
        return
      }
    }
    forceCreate()
  }

  const renameDoc = () => {
    const name = uiRef.current.nameInput.trim().slice(0, MAX_NAME)
    if (!name) return
    const st = stateRef.current
    const target = uiRef.current.renameTarget
    if (target === null) {
      if (st) commitDoc({ ...st.work.doc, name })
    } else {
      saved.set(
        serializeGallery(
          gallery.map((item) =>
            item.id === target ? { ...item, updatedAt: Date.now(), doc: { ...item.doc, name } } : item
          )
        )
      )
      if (st?.galleryId === target) commitDoc({ ...st.work.doc, name }, st.dirty)
    }
    patchUi({ sheet: null, renameTarget: null })
  }

  const removeItem = (id: string) => {
    saved.set(serializeGallery(gallery.filter((item) => item.id !== id)))
    patchUi({ deleteId: null })
    const st = stateRef.current
    if (st?.galleryId === id) commit({ ...st, galleryId: null, dirty: true })
  }

  const editSlotColor = (swatch: SwatchName) => {
    const st = stateRef.current
    if (!st || st.work.doc.palette.includes(swatch)) return
    commitDoc(setPaletteSlot(st.work.doc, uiRef.current.editSlot, swatch))
  }

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const statusText =
    draft.status === 'hydrating'
      ? 'Loading...'
      : draft.status === 'saving'
        ? 'Saving...'
        : draft.status === 'error'
          ? `Not saved: ${draft.error ?? 'storage error'}`
          : state?.dirty
            ? 'Unsaved changes - Save keeps this creation'
            : 'Saved on this device'

  const openRename = (target: string | null) => {
    patchUi({
      renameTarget: target,
      nameInput: target === null ? (doc?.name ?? '') : (gallery.find((i) => i.id === target)?.doc.name ?? ''),
      sheet: 'rename'
    })
  }

  // One roving tab stop for the slot strip, shared by every chip in the sheet.
  const slotKeys = useRadioKeys(doc?.palette.length ?? 0)

  const emptyBoard = !!doc && doc.cells.every((value) => value === EMPTY)

  const board = doc && (
    <div {...stylex.props(styles.boardWrap)}>
      {emptyBoard && (
        <div aria-hidden="true" {...stylex.props(styles.boardEmpty)}>
          <div {...stylex.props(styles.boardEmptyCard)}>
            <Sym name="handwriting" size={22} />
            <span {...stylex.props(styles.boardEmptyTitle)}>Tap or drag to paint</span>
            <span {...stylex.props(styles.boardEmptyHint)}>Pick a colour, then draw. Arrows and Space work too.</span>
          </div>
        </div>
      )}
      <div
        ref={boardRef}
        role="grid"
        aria-label={`Canvas, ${doc.size} by ${doc.size}. Arrow keys move the cursor, Space or Enter applies the tool.`}
        aria-rowcount={doc.size}
        tabIndex={0}
        onPointerDown={beginStroke}
        onPointerMove={moveStroke}
        onPointerUp={flushStroke}
        onPointerCancel={flushStroke}
        onLostPointerCapture={flushStroke}
        onKeyDown={onBoardKey}
        {...stylex.props(styles.board, styles.boardGrid(doc.size))}
      >
        {cells.map((value, i) => {
          const row = Math.floor(i / doc.size) + 1
          const col = (i % doc.size) + 1
          const name = value === EMPTY ? 'empty' : swatchLabel(doc.palette[value]!)
          return (
            <Cell
              // biome-ignore lint/suspicious/noArrayIndexKey: pixel position is identity and never reorders
              key={i}
              value={value}
              color={cellColor(doc, value)}
              label={`Row ${row} column ${col}, ${name}`}
              focused={i === focus}
            />
          )
        })}
      </div>
    </div>
  )

  const toolbar = (
    <div {...stylex.props(styles.toolbar)}>
      <Choices options={TOOLS} value={ui.tool} onChange={(tool) => patchUi({ tool })} label="Drawing tool" />
      <div {...stylex.props(styles.toolCluster)}>
        <IconButton
          name="undo"
          variant="plain"
          aria-label="Undo"
          xstyle={styles.icon44}
          disabled={!state?.work.undo.length}
          onClick={() => {
            if (state) commit({ ...state, work: undoWork(state.work), dirty: true })
          }}
        />
        <IconButton
          name="undo"
          variant="plain"
          aria-label="Redo"
          xstyle={[styles.icon44, styles.redoFlip]}
          disabled={!state?.work.redo.length}
          onClick={() => {
            if (state) commit({ ...state, work: redoWork(state.work), dirty: true })
          }}
        />
        <IconButton
          name="trashOutline"
          variant="plain"
          aria-label="Clear canvas"
          xstyle={styles.icon44}
          onClick={() => patchUi({ sheet: 'clear' })}
        />
      </div>
    </div>
  )

  const paletteSection = doc && (
    <section {...stylex.props(styles.section)} aria-label="Palette">
      <div {...stylex.props(styles.sectionHead)}>
        <span>PALETTE</span>
        <button
          type="button"
          aria-label="Edit palette"
          onClick={() => patchUi({ sheet: 'palette' })}
          {...stylex.props(shared.press, styles.sectionEdit)}
        >
          Edit
        </button>
      </div>
      <div {...stylex.props(styles.palette)}>
        {doc.palette.map((swatch, i) => (
          <button
            type="button"
            key={swatch}
            aria-label={`Colour ${i + 1}: ${swatchLabel(swatch)}`}
            aria-pressed={i === ui.color}
            onClick={() => patchUi(ui.tool === 'Erase' ? { color: i, tool: 'Paint' } : { color: i })}
            {...stylex.props(
              shared.press,
              styles.swatch,
              styles.cellPaint(SWATCH_COLOR[swatch]),
              i === ui.color && styles.swatchOn
            )}
          />
        ))}
        {doc.palette.length < TOKEN_SWATCHES.length && (
          <button
            type="button"
            aria-label="Add a colour to the palette"
            onClick={() => patchUi({ sheet: 'palette' })}
            {...stylex.props(shared.press, styles.swatch, styles.swatchAdd)}
          >
            <Sym name="plus" size={16} />
          </button>
        )}
      </div>
    </section>
  )

  const preview = doc && (
    <div {...stylex.props(styles.previewCard)}>
      <Mosaic doc={doc} liveCells={liveCells ?? undefined} />
      <div {...stylex.props(styles.previewMeta)}>
        <span {...stylex.props(styles.previewLabel)}>PREVIEW</span>
        <span key={`${doc.id}:${ui.tool}:${ui.color}`} {...stylex.props(styles.previewDetailWrap)}>
          <span {...stylex.props(shared.swap, styles.previewDetail)}>{doc.name}</span>
          <span {...stylex.props(shared.swap, styles.previewSub)}>
            {doc.size} x {doc.size} - {ui.tool}
            {ui.tool === 'Paint' || ui.tool === 'Fill' ? `, ${swatchLabel(doc.palette[ui.color] ?? 'black')}` : ''}
          </span>
        </span>
      </div>
    </div>
  )

  const status = (
    <small role="status" {...stylex.props(styles.status)}>
      <span key={statusText} {...stylex.props(shared.swap)}>
        {statusText}
      </span>
    </small>
  )

  const newCanvas = () => {
    patchUi({ sheet: 'new' })
  }

  // The kit Page's own back chevron tops out at a 22-point hit box; this page
  // header matches its chrome so Back is a full 44-point target.
  const galleryPage = (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.hdr)}>
        <button
          type="button"
          aria-label="Back"
          {...stylex.props(shared.press, styles.backBtn)}
          onClick={() => patchUi({ page: false })}
        >
          <Sym name="back" size={20} />
        </button>
        Gallery
      </div>
      <div {...stylex.props(shared.body)}>
        {gallery.length ? (
          <Section>
            <List>
              {gallery.map((item, i) => (
                <div key={item.id} {...stylex.props(styles.galleryItem, animations.row, delay.ms(i * 40))}>
                  {ui.deleteId === item.id ? (
                    <Row
                      as="div"
                      icon={<Mosaic doc={item.doc} thumb />}
                      label={`Delete "${item.doc.name}"?`}
                      detail={
                        <HStack gap={4}>
                          <Button variant="plain" xstyle={styles.hit44} onClick={() => patchUi({ deleteId: null })}>
                            Cancel
                          </Button>
                          <Button
                            variant="filled"
                            xstyle={[styles.hit44, styles.btnDanger]}
                            onClick={() => removeItem(item.id)}
                          >
                            Delete
                          </Button>
                        </HStack>
                      }
                    />
                  ) : (
                    <>
                      <Row
                        as="button"
                        xstyle={styles.galleryOpenRow}
                        onClick={() => openItem(item)}
                        icon={<Mosaic doc={item.doc} thumb />}
                        label={item.doc.name}
                        subtitle={
                          <span>
                            {item.doc.size} x {item.doc.size} - {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        }
                        detail={state?.galleryId === item.id ? 'Open' : undefined}
                      />
                      <IconButton
                        name="ellipsis"
                        aria-label={`Actions for ${item.doc.name}`}
                        aria-expanded={ui.sheet === 'item' && ui.actionId === item.id}
                        xstyle={styles.icon44}
                        onClick={() => patchUi({ actionId: item.id, sheet: 'item' })}
                      />
                    </>
                  )}
                </div>
              ))}
            </List>
          </Section>
        ) : (
          <div {...stylex.props(styles.galleryEmpty)}>
            <span {...stylex.props(styles.galleryEmptyIcon)}>
              <Sym name="grid" size={28} />
            </span>
            <span>No saved creations yet</span>
            <span>Draw something, then save it here to keep it on this device.</span>
          </div>
        )}
        <div {...stylex.props(styles.galleryFoot)}>
          <Button variant="tinted" xstyle={styles.hit44} onClick={newCanvas}>
            New canvas
          </Button>
          <Button variant="filled" xstyle={styles.hit44} disabled={!state} onClick={saveDoc}>
            Save current
          </Button>
        </div>
      </div>
    </div>
  )

  const discardHint =
    ui.pending?.type === 'new'
      ? 'The new canvas replaces this one. Saving first keeps your work in the gallery.'
      : 'Opening a saved creation replaces this canvas. Saving first keeps it in your gallery.'

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root)}>
      <div inert={ui.sheet !== null} {...stylex.props(styles.appShell)}>
        <header {...stylex.props(styles.header)}>
          <button
            type="button"
            aria-label="Rename this canvas"
            onClick={() => openRename(null)}
            {...stylex.props(shared.press, styles.docName)}
          >
            <span {...stylex.props(styles.docNameText)}>{doc?.name ?? 'Pixel Studio'}</span>
            <span {...stylex.props(styles.docCaret)}>
              <Sym name="down" size={10} />
            </span>
            {state?.dirty ? <span role="img" aria-label="Unsaved changes" {...stylex.props(styles.dirty)} /> : null}
          </button>
          <div {...stylex.props(styles.headerActions)}>
            <IconButton
              name="collections"
              variant="tinted"
              aria-label="Gallery"
              aria-expanded={ui.page}
              xstyle={styles.icon44}
              onClick={() => patchUi({ page: true })}
            />
            <IconButton
              name="plus"
              variant="tinted"
              aria-label="New canvas"
              xstyle={styles.icon44}
              onClick={newCanvas}
            />
          </div>
        </header>
        <Push open={ui.page} sheet={galleryPage}>
          {wide ? (
            <section {...stylex.props(styles.stage, styles.stageWide)}>
              <div {...stylex.props(styles.canvasCol)}>{board}</div>
              <div {...stylex.props(styles.rail)}>
                {toolbar}
                {paletteSection}
                {preview}
              </div>
            </section>
          ) : (
            <section {...stylex.props(styles.stage)}>
              {board}
              {toolbar}
              {paletteSection}
              {preview}
            </section>
          )}
        </Push>
        <footer {...stylex.props(styles.statusBar)}>{status}</footer>
      </div>

      <GuardedSheet open={ui.sheet === 'clear'} onClose={() => patchUi({ sheet: null })} label="Clear canvas">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Clear canvas?</h2>
          <p {...stylex.props(styles.sheetHint)}>Every pixel is removed. Undo brings it back.</p>
          <div {...stylex.props(styles.actionStack)}>
            <Button
              variant="filled"
              xstyle={[styles.hit44, styles.btnDanger]}
              onClick={() => {
                commitEdit(clearEdit(cells))
                patchUi({ sheet: null })
              }}
            >
              Clear
            </Button>
            <Button variant="plain" xstyle={styles.hit44} onClick={() => patchUi({ sheet: null })}>
              Cancel
            </Button>
          </div>
        </div>
      </GuardedSheet>

      <GuardedSheet open={ui.sheet === 'rename'} onClose={() => patchUi({ sheet: null })} label="Rename">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Rename</h2>
          <TextField
            aria-label="Name"
            value={ui.nameInput}
            maxLength={MAX_NAME}
            onChange={(event) => patchUi({ nameInput: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') renameDoc()
            }}
            xstyle={styles.sheetField}
          />
          <div {...stylex.props(styles.actionStack)}>
            <Button variant="filled" xstyle={styles.hit44} onClick={renameDoc}>
              Save
            </Button>
            <Button variant="plain" xstyle={styles.hit44} onClick={() => patchUi({ sheet: null })}>
              Cancel
            </Button>
          </div>
        </div>
      </GuardedSheet>

      <GuardedSheet open={ui.sheet === 'new'} onClose={() => patchUi({ sheet: null })} label="New canvas">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>New canvas</h2>
          <TextField
            aria-label="Canvas name"
            placeholder="Untitled"
            value={ui.newName}
            maxLength={MAX_NAME}
            onChange={(event) => patchUi({ newName: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') createDoc()
            }}
            xstyle={styles.sheetField}
          />
          <Choices
            options={SIZE_LABELS}
            value={ui.newSize}
            onChange={(newSize) => patchUi({ newSize })}
            label="Canvas size"
          />
          <div {...stylex.props(styles.actionStack)}>
            <Button variant="filled" xstyle={styles.hit44} onClick={createDoc}>
              Create
            </Button>
            <Button variant="plain" xstyle={styles.hit44} onClick={() => patchUi({ sheet: null })}>
              Cancel
            </Button>
          </div>
        </div>
      </GuardedSheet>

      <GuardedSheet open={ui.sheet === 'palette'} onClose={() => patchUi({ sheet: null })} label="Edit palette">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Edit palette</h2>
          <p {...stylex.props(styles.sheetHint)}>Pick a slot, then tap a colour to assign it.</p>
          {doc && (
            <div {...stylex.props(styles.slotRow)} role="radiogroup" aria-label="Palette slot">
              {doc.palette.map((swatch, i) => (
                <button
                  type="button"
                  key={swatch}
                  aria-label={`Slot ${i + 1}: ${swatchLabel(swatch)}`}
                  onClick={() => patchUi({ editSlot: i })}
                  onKeyDown={slotKeys.onKeyDown(i, (n) => patchUi({ editSlot: n }))}
                  {...slotKeys.slot(i, i === ui.editSlot)}
                  {...stylex.props(
                    shared.press,
                    styles.slotChip,
                    styles.cellPaint(SWATCH_COLOR[swatch]),
                    i === ui.editSlot && styles.swatchOn
                  )}
                />
              ))}
            </div>
          )}
          <div {...stylex.props(styles.catalogGrid)}>
            {TOKEN_SWATCHES.map((swatch) => (
              <button
                type="button"
                key={swatch}
                aria-label={swatchLabel(swatch)}
                onClick={() => editSlotColor(swatch)}
                {...stylex.props(shared.press, styles.catalogSwatch, doc?.palette.includes(swatch) && styles.catalogOn)}
              >
                <span {...stylex.props(styles.catalogChip, styles.cellPaint(SWATCH_COLOR[swatch]))} />
                {swatchLabel(swatch)}
              </button>
            ))}
          </div>
          <div {...stylex.props(styles.actionStack)}>
            <Button
              variant="tinted"
              xstyle={styles.hit44}
              disabled={!doc || doc.palette.length <= 1}
              onClick={() => {
                if (!doc) return
                commitDoc(removePaletteSlot(doc, ui.editSlot))
                patchUi({ editSlot: 0, color: Math.max(0, Math.min(ui.color, doc.palette.length - 2)) })
              }}
            >
              Remove slot
            </Button>
            <Button
              variant="tinted"
              xstyle={styles.hit44}
              disabled={!doc || doc.palette.length >= TOKEN_SWATCHES.length}
              onClick={() => {
                if (!doc) return
                const spare = TOKEN_SWATCHES.find((s) => !doc.palette.includes(s))
                if (spare) commitDoc(addPaletteSlot(doc, spare))
              }}
            >
              Add slot
            </Button>
            <Button variant="filled" xstyle={styles.hit44} onClick={() => patchUi({ sheet: null })}>
              Done
            </Button>
          </div>
        </div>
      </GuardedSheet>

      <GuardedSheet
        open={ui.sheet === 'item'}
        onClose={() => patchUi({ sheet: null, actionId: null })}
        label="Creation actions"
      >
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>
            {gallery.find((i) => i.id === ui.actionId)?.doc.name ?? 'Creation'}
          </h2>
          <div {...stylex.props(styles.actionStack)}>
            <Button
              variant="tinted"
              xstyle={styles.hit44}
              onClick={() => {
                const target = ui.actionId
                patchUi({ sheet: null })
                openRename(target)
              }}
            >
              Rename
            </Button>
            <Button
              variant="plain"
              xstyle={[styles.hit44, styles.actionDanger]}
              onClick={() => patchUi({ deleteId: ui.actionId, sheet: null, actionId: null })}
            >
              Delete
            </Button>
            <Button variant="plain" xstyle={styles.hit44} onClick={() => patchUi({ sheet: null, actionId: null })}>
              Cancel
            </Button>
          </div>
        </div>
      </GuardedSheet>

      <GuardedSheet open={ui.sheet === 'discard'} onClose={cancelPending} label="Unsaved changes">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Discard unsaved changes?</h2>
          <p {...stylex.props(styles.sheetHint)}>{discardHint}</p>
          <div {...stylex.props(styles.actionStack)}>
            <Button variant="filled" xstyle={styles.hit44} onClick={() => confirmPending(true)}>
              Save & continue
            </Button>
            <Button variant="filled" xstyle={[styles.hit44, styles.btnDanger]} onClick={() => confirmPending(false)}>
              Discard changes
            </Button>
            <Button variant="plain" xstyle={styles.hit44} onClick={cancelPending}>
              Cancel
            </Button>
          </div>
        </div>
      </GuardedSheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<PixelStudio />)
