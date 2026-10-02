import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, HStack, IconButton, Segmented, Sheet, TextField, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import {
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
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
type SheetKind = 'gallery' | 'new' | 'rename' | 'clear' | 'palette'
type SizeLabel = '16 x 16' | '32 x 32'
const SIZE_LABELS: readonly SizeLabel[] = ['16 x 16', '32 x 32']
const SIZE_BY_LABEL: Record<SizeLabel, CanvasSize> = { '16 x 16': 16, '32 x 32': 32 }

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

function PixelStudio() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const draft = useKV(os.storage, 'draft')
  const saved = useKV(os.storage, 'gallery')
  const sharedWork = useKV(os.session, 'work')
  const [state, setState] = useState<DocState | null>(null)
  const [tool, setTool] = useState<Tool>('Paint')
  const [color, setColor] = useState(1)
  const [focus, setFocus] = useState(-1)
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editSlot, setEditSlot] = useState(0)
  const [newName, setNewName] = useState('')
  const [newSize, setNewSize] = useState<SizeLabel>('16 x 16')
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
  const toolRef = useRef(tool)
  toolRef.current = tool
  const colorRef = useRef(color)
  colorRef.current = color
  const sessionRef = useRef(sharedWork)
  sessionRef.current = sharedWork
  const draftRef = useRef(draft)
  draftRef.current = draft

  const doc = state?.work.doc ?? null
  const cells = liveCells ?? doc?.cells ?? []

  // One commit path for every local change: state, the session mirror for the
  // other display and the durable draft, in that order.
  const commit = useCallback((next: DocState) => {
    setState(next)
    sessionRef.current.set(serializeShared({ by: ME, ...next }))
    void draftRef.current.set(serializeDocState(next))
  }, [])

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
  useEffect(() => {
    if (sharedWork.status === 'hydrating' || sharedWork.status === 'saving') return
    const raw = sharedWork.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    const next = parseShared(raw)
    if (next) {
      if (next.by === ME) return
      sessionAdopted.current = true
      const { by: _by, ...rest } = next
      setState(rest)
      setLiveCells(null)
      return
    }
    // Empty or malformed session: seed this copy's state once storage has landed.
    if (seeded.current || draft.status === 'hydrating' || !storageSeeded.current) return
    seeded.current = true
    const st = stateRef.current
    if (st) sessionRef.current.set(serializeShared({ by: ME, ...st }))
  }, [sharedWork.value, sharedWork.status, draft.status])

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
    const active = toolRef.current
    if (active === 'Pick') {
      const value = s.cells[i]!
      if (value !== EMPTY) setColor(value)
      return
    }
    if (active === 'Fill') {
      for (const c of floodFill(s.cells, st.work.doc.size, i, colorRef.current)) {
        s.edits.set(c.i, c)
        s.cells[c.i] = c.to
      }
    } else {
      const next = active === 'Erase' ? EMPTY : colorRef.current
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
    const value = st.work.doc.cells[i]!
    if (tool === 'Pick') {
      if (value !== EMPTY) setColor(value)
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

  const openItem = (item: GalleryItem) => {
    commit({ work: newWork(item.doc), galleryId: item.id, dirty: false })
    setSheet(null)
    setDeleteId(null)
    setFocus(-1)
  }

  const createDoc = () => {
    const name = (newName.trim() || 'Untitled').slice(0, MAX_NAME)
    commit({ work: newWork(newDoc(SIZE_BY_LABEL[newSize], name)), galleryId: null, dirty: false })
    setSheet(null)
    setNewName('')
    setFocus(-1)
  }

  const renameDoc = () => {
    const name = nameInput.trim().slice(0, MAX_NAME)
    if (!name) return
    const st = stateRef.current
    if (renameTarget === null) {
      if (st) commitDoc({ ...st.work.doc, name })
    } else {
      saved.set(
        serializeGallery(
          gallery.map((item) =>
            item.id === renameTarget ? { ...item, updatedAt: Date.now(), doc: { ...item.doc, name } } : item
          )
        )
      )
      if (st?.galleryId === renameTarget) commitDoc({ ...st.work.doc, name }, st.dirty)
    }
    setSheet(null)
    setRenameTarget(null)
  }

  const removeItem = (id: string) => {
    saved.set(serializeGallery(gallery.filter((item) => item.id !== id)))
    setDeleteId(null)
    const st = stateRef.current
    if (st?.galleryId === id) commit({ ...st, galleryId: null, dirty: true })
  }

  const editSlotColor = (swatch: SwatchName) => {
    const st = stateRef.current
    if (!st || st.work.doc.palette.includes(swatch)) return
    commitDoc(setPaletteSlot(st.work.doc, editSlot, swatch))
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
    setRenameTarget(target)
    setNameInput(target === null ? (doc?.name ?? '') : (gallery.find((i) => i.id === target)?.doc.name ?? ''))
    setSheet('rename')
  }

  const board = doc && (
    <div {...stylex.props(styles.boardWrap)}>
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
      <Segmented options={TOOLS} value={tool} onChange={setTool} aria-label="Drawing tool" />
      <div {...stylex.props(styles.toolActions)}>
        <IconButton
          name="undo"
          variant="tinted"
          aria-label="Undo"
          disabled={!state?.work.undo.length}
          onClick={() => {
            if (state) commit({ ...state, work: undoWork(state.work), dirty: true })
          }}
        />
        <IconButton
          name="undo"
          variant="tinted"
          aria-label="Redo"
          xstyle={styles.redoFlip}
          disabled={!state?.work.redo.length}
          onClick={() => {
            if (state) commit({ ...state, work: redoWork(state.work), dirty: true })
          }}
        />
        <IconButton name="trashOutline" variant="tinted" aria-label="Clear canvas" onClick={() => setSheet('clear')} />
      </div>
    </div>
  )

  const paletteSection = doc && (
    <section {...stylex.props(styles.section)} aria-label="Palette">
      <div {...stylex.props(styles.sectionHead)}>
        <span>PALETTE</span>
        <IconButton name="compose" aria-label="Edit palette" onClick={() => setSheet('palette')} />
      </div>
      <div {...stylex.props(styles.palette)}>
        {doc.palette.map((swatch, i) => (
          <button
            type="button"
            key={swatch}
            aria-label={`Colour ${i + 1}: ${swatchLabel(swatch)}`}
            aria-pressed={i === color}
            onClick={() => {
              setColor(i)
              if (tool === 'Erase') setTool('Paint')
            }}
            {...stylex.props(
              shared.press,
              styles.swatch,
              styles.cellPaint(SWATCH_COLOR[swatch]),
              i === color && styles.swatchOn
            )}
          />
        ))}
        {doc.palette.length < TOKEN_SWATCHES.length && (
          <button
            type="button"
            aria-label="Edit palette"
            onClick={() => setSheet('palette')}
            {...stylex.props(shared.press, styles.swatch, styles.swatchAdd)}
          >
            +
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
        <span {...stylex.props(styles.previewDetail)}>{doc.name}</span>
        <span {...stylex.props(styles.previewSub)}>
          {doc.size} x {doc.size} - {tool}
          {tool === 'Paint' || tool === 'Fill' ? `, ${swatchLabel(doc.palette[color] ?? 'black')}` : ''}
        </span>
      </div>
    </div>
  )

  const status = (
    <small role="status" {...stylex.props(styles.status)}>
      {statusText}
    </small>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>DUO ATELIER</span>
          <button
            type="button"
            aria-label="Rename this canvas"
            onClick={() => openRename(null)}
            {...stylex.props(styles.docName)}
          >
            <span {...stylex.props(styles.docNameText)}>{doc?.name ?? 'Pixel Studio'}</span>
            {state?.dirty ? <span role="img" aria-label="Unsaved changes" {...stylex.props(styles.dirty)} /> : null}
          </button>
        </div>
        <div {...stylex.props(styles.headerActions)}>
          <IconButton
            name="collections"
            variant="tinted"
            aria-label="Gallery"
            aria-expanded={sheet === 'gallery'}
            onClick={() => setSheet('gallery')}
          />
          <IconButton
            name="plus"
            variant="tinted"
            aria-label="New canvas"
            onClick={() => {
              setNewName('')
              setNewSize('16 x 16')
              setSheet('new')
            }}
          />
        </div>
      </header>
      {wide ? (
        <section {...stylex.props(styles.stage, styles.stageWide)}>
          <div {...stylex.props(styles.canvasCol)}>{board}</div>
          <div {...stylex.props(styles.rail)}>
            {toolbar}
            {paletteSection}
            {preview}
            {status}
          </div>
        </section>
      ) : (
        <section {...stylex.props(styles.stage)}>
          {board}
          {toolbar}
          {paletteSection}
          {preview}
          {status}
        </section>
      )}

      <Sheet open={sheet === 'clear'} onClose={() => setSheet(null)} aria-label="Clear canvas">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Clear canvas?</h2>
          <p {...stylex.props(styles.sheetHint)}>Every pixel is removed. Undo brings it back.</p>
          <div {...stylex.props(styles.sheetActions)}>
            <Button variant="plain" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                commitEdit(clearEdit(cells))
                setSheet(null)
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === 'rename'} onClose={() => setSheet(null)} aria-label="Rename">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Rename</h2>
          <TextField
            aria-label="Name"
            value={nameInput}
            maxLength={MAX_NAME}
            onChange={(event) => setNameInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') renameDoc()
            }}
            xstyle={styles.sheetField}
          />
          <div {...stylex.props(styles.sheetActions)}>
            <Button variant="plain" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button variant="filled" onClick={renameDoc}>
              Save
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === 'new'} onClose={() => setSheet(null)} aria-label="New canvas">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>New canvas</h2>
          <TextField
            aria-label="Canvas name"
            placeholder="Untitled"
            value={newName}
            maxLength={MAX_NAME}
            onChange={(event) => setNewName(event.target.value)}
            xstyle={styles.sheetField}
          />
          <Segmented options={SIZE_LABELS} value={newSize} onChange={setNewSize} aria-label="Canvas size" />
          <div {...stylex.props(styles.sheetActions)}>
            <Button variant="plain" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button variant="filled" onClick={createDoc}>
              Create
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === 'palette'} onClose={() => setSheet(null)} aria-label="Edit palette">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Edit palette</h2>
          <p {...stylex.props(styles.sheetHint)}>Pick a slot, then tap a colour to assign it.</p>
          {doc && (
            <div {...stylex.props(styles.slotRow)} role="radiogroup" aria-label="Palette slot">
              {doc.palette.map((swatch, i) => (
                <button
                  type="button"
                  key={swatch}
                  role="radio"
                  aria-checked={i === editSlot}
                  aria-label={`Slot ${i + 1}: ${swatchLabel(swatch)}`}
                  onClick={() => setEditSlot(i)}
                  {...stylex.props(
                    styles.slotChip,
                    styles.cellPaint(SWATCH_COLOR[swatch]),
                    i === editSlot && styles.swatchOn
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
          <HStack gap={8} justify="between">
            <HStack gap={8}>
              <Button
                variant="tinted"
                disabled={!doc || doc.palette.length <= 1}
                onClick={() => {
                  if (!doc) return
                  commitDoc(removePaletteSlot(doc, editSlot))
                  setEditSlot(0)
                  setColor((c) => Math.max(0, Math.min(c, doc.palette.length - 2)))
                }}
              >
                Remove slot
              </Button>
              <Button
                variant="tinted"
                disabled={!doc || doc.palette.length >= TOKEN_SWATCHES.length}
                onClick={() => {
                  if (!doc) return
                  const spare = TOKEN_SWATCHES.find((s) => !doc.palette.includes(s))
                  if (spare) commitDoc(addPaletteSlot(doc, spare))
                }}
              >
                Add slot
              </Button>
            </HStack>
            <Button variant="filled" onClick={() => setSheet(null)}>
              Done
            </Button>
          </HStack>
        </div>
      </Sheet>

      <Sheet open={sheet === 'gallery'} onClose={() => setSheet(null)} aria-label="Saved creations">
        <div {...stylex.props(styles.sheetBody)}>
          <h2 {...stylex.props(styles.sheetTitle)}>Gallery</h2>
          {gallery.length ? (
            <div {...stylex.props(styles.galleryList)}>
              {gallery.map((item) =>
                deleteId === item.id ? (
                  <div key={item.id} {...stylex.props(styles.galleryRow)}>
                    <span {...stylex.props(styles.galleryMeta)}>
                      <span {...stylex.props(styles.galleryName)}>Delete "{item.doc.name}"?</span>
                    </span>
                    <Button variant="plain" onClick={() => setDeleteId(null)}>
                      Cancel
                    </Button>
                    <Button variant="filled" onClick={() => removeItem(item.id)}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div key={item.id} {...stylex.props(styles.galleryRow)}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      {...stylex.props(shared.press, styles.galleryOpen)}
                    >
                      <Mosaic doc={item.doc} thumb />
                      <span {...stylex.props(styles.galleryMeta)}>
                        <span {...stylex.props(styles.galleryName)}>
                          {item.doc.name}
                          {state?.galleryId === item.id ? ' - open' : ''}
                        </span>
                        <span {...stylex.props(styles.galleryDetail)}>
                          {item.doc.size} x {item.doc.size} - {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                      </span>
                    </button>
                    <IconButton
                      name="compose"
                      aria-label={`Rename ${item.doc.name}`}
                      onClick={() => openRename(item.id)}
                    />
                    <IconButton
                      name="trashOutline"
                      aria-label={`Delete ${item.doc.name}`}
                      onClick={() => setDeleteId(item.id)}
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <p {...stylex.props(styles.galleryEmpty)}>No saved creations yet. Save the current canvas to keep it.</p>
          )}
          <div {...stylex.props(styles.sheetActions)}>
            <Button
              variant="tinted"
              onClick={() => {
                setNewName('')
                setNewSize('16 x 16')
                setSheet('new')
              }}
            >
              New canvas
            </Button>
            <Button variant="filled" disabled={!state} onClick={saveDoc}>
              Save current
            </Button>
          </div>
        </div>
      </Sheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<PixelStudio />)
