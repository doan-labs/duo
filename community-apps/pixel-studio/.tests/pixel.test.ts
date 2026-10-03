import { describe, expect, test } from 'bun:test'
import {
  addPaletteSlot,
  CANVAS_SIZES,
  type CellEdit,
  clearEdit,
  DEFAULT_PALETTE,
  EMPTY,
  floodFill,
  indexAt,
  MAX_PALETTE,
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
  serializeDocState,
  serializeGallery,
  serializeShared,
  setPaletteSlot,
  swatchLabel,
  undoWork,
  upsertGallery,
  withEdit
} from '../pixel.ts'

const doc = (size: 16 | 32 = 16, cells?: number[]): PixelDoc => ({
  ...newDoc(size, 'Test', 'doc-1'),
  cells: cells ?? Array.from({ length: size * size }, () => EMPTY)
})

describe('floodFill', () => {
  test('fills a contiguous empty region', () => {
    const d = doc()
    const edit = floodFill(d.cells, 16, indexAt(16, 0, 0), 2)
    expect(edit.length).toBe(256)
    expect(edit.every((c) => c.from === EMPTY && c.to === 2)).toBe(true)
  })

  test('respects painted boundaries, not just canvas edges', () => {
    // A horizontal wall of colour 1 across row 1: fill row 0 cannot leak past it.
    const cells = Array.from({ length: 256 }, () => EMPTY)
    for (let x = 0; x < 16; x++) cells[indexAt(16, x, 1)] = 1
    const edit = floodFill(cells, 16, indexAt(16, 3, 0), 2)
    expect(edit.length).toBe(16)
    expect(edit.every((c) => c.i < 16)).toBe(true)
  })

  test('wraps do not leak across the left and right edges', () => {
    const cells = Array.from({ length: 256 }, () => EMPTY)
    cells[indexAt(16, 15, 0)] = 1 // right edge of row 0
    const edit = floodFill(cells, 16, indexAt(16, 15, 0), 2)
    // Filling a single painted cell must not touch (0, 0) or (15, 1).
    expect(edit.map((c) => c.i)).toEqual([indexAt(16, 15, 0)])
  })

  test('diagonal neighbours do not connect the region', () => {
    const cells = Array.from({ length: 256 }, () => EMPTY)
    cells[indexAt(16, 1, 1)] = 3
    const edit = floodFill(cells, 16, indexAt(16, 1, 1), 4)
    expect(edit.length).toBe(1)
  })

  test('same-colour start is a no-op', () => {
    const cells = Array.from({ length: 256 }, () => EMPTY)
    cells[0] = 5
    expect(floodFill(cells, 16, 0, 5)).toEqual([])
    expect(floodFill(cells, 16, 99, EMPTY)).toEqual([])
  })

  test('works on the 32 canvas', () => {
    const cells = Array.from({ length: 1024 }, () => EMPTY)
    const edit = floodFill(cells, 32, indexAt(32, 31, 31), 0)
    expect(edit.length).toBe(1024)
  })
})

describe('strokes and edits', () => {
  test('recordStroke dedupes repeat visits and keeps the original from', () => {
    const cells = doc().cells
    const map = new Map<number, CellEdit>()
    recordStroke(map, cells, 4, 2)
    recordStroke(map, cells, 4, 3)
    expect(map.size).toBe(1)
    expect(map.get(4)).toEqual({ i: 4, from: EMPTY, to: 3 })
  })

  test('a stroke that repaints the original colour leaves no edit', () => {
    const cells = doc().cells
    const map = new Map<number, CellEdit>()
    recordStroke(map, cells, 4, 2)
    recordStroke(map, cells, 4, EMPTY)
    expect(map.size).toBe(0)
  })

  test('withEdit applies the edit, caps history and clears redo', () => {
    let work = newWork(doc())
    for (let i = 0; i < 60; i++) work = withEdit(work, [{ i: 0, from: i - 1, to: i }])
    expect(work.undo.length).toBe(48)
    work = undoWork(work)
    expect(work.redo.length).toBe(1)
    work = withEdit(work, [{ i: 1, from: EMPTY, to: 0 }])
    expect(work.redo.length).toBe(0)
  })

  test('undo then redo restores the cells exactly', () => {
    let work = newWork(doc())
    const edit: CellEdit[] = [
      { i: 0, from: EMPTY, to: 1 },
      { i: 5, from: EMPTY, to: 2 }
    ]
    work = withEdit(work, edit)
    expect(work.doc.cells[0]).toBe(1)
    work = undoWork(work)
    expect(work.doc.cells[0]).toBe(EMPTY)
    expect(work.doc.cells[5]).toBe(EMPTY)
    work = redoWork(work)
    expect(work.doc.cells[0]).toBe(1)
    expect(work.doc.cells[5]).toBe(2)
  })

  test('clear empties every painted cell and stays undoable', () => {
    let work = newWork(
      doc(
        16,
        Array.from({ length: 256 }, (_, i) => i % 4)
      )
    )
    work = withEdit(work, clearEdit(work.doc.cells))
    expect(work.doc.cells.every((c) => c === EMPTY)).toBe(true)
    work = undoWork(work)
    expect(work.doc.cells[255]).toBe(255 % 4)
  })
})

describe('palette ops', () => {
  test('setPaletteSlot re-slots without touching cells', () => {
    const d = doc()
    const next = setPaletteSlot(d, 2, 'mint')
    expect(next.palette[2]).toBe('mint')
    expect(next.cells).toBe(d.cells)
  })

  test('addPaletteSlot refuses duplicates and a full palette', () => {
    const d = doc()
    expect(addPaletteSlot(d, 'red').palette).toBe(d.palette)
    const full = { ...d, palette: [...d.palette, 'grey4' as const, 'grey5' as const] }
    expect(full.palette.length).toBe(MAX_PALETTE)
    expect(addPaletteSlot(full, 'teal').palette).toBe(full.palette)
  })

  test('removePaletteSlot empties cells on the slot and shifts higher indexes', () => {
    const cells = Array.from({ length: 256 }, () => EMPTY)
    cells[0] = 1 // 'black'
    cells[1] = 3 // 'orange'
    const d = doc(16, cells)
    const next = removePaletteSlot(d, 2) // drop 'red'
    expect(next.palette).toEqual(DEFAULT_PALETTE.filter((_, i) => i !== 2))
    expect(next.cells[0]).toBe(1)
    expect(next.cells[1]).toBe(2)
    const gone = removePaletteSlot(d, 1)
    expect(gone.cells[0]).toBe(EMPTY)
    expect(gone.cells[1]).toBe(2)
  })
})

describe('save/load round trips', () => {
  test('doc state survives serialize + parse, including undo history', () => {
    let state = newDocState(32, 'Sprite')
    state = { ...state, work: withEdit(state.work, floodFill(state.work.doc.cells, 32, 0, 4)), dirty: true }
    const restored = parseDocState(serializeDocState(state))
    expect(restored).toEqual(state)
  })

  test('shared payload keeps the writer id and parses for the other display', () => {
    const state = newDocState(16, 'Icon')
    const wire = serializeShared({ by: 'display-a', ...state })
    const parsed = parseShared(wire)
    expect(parsed?.by).toBe('display-a')
    expect(parsed?.work.doc.id).toBe(state.work.doc.id)
  })

  test('gallery upsert replaces by id and keeps other entries', () => {
    const a = { id: 'a', updatedAt: 1, doc: doc() }
    const items = upsertGallery([a], { ...doc(16), id: 'b' }, 7)
    expect(items.length).toBe(2)
    expect(items[1]!.updatedAt).toBe(7)
    const again = upsertGallery(items, { ...doc(32), id: 'b' }, 9)
    expect(again.length).toBe(2)
    expect(again[1]!.updatedAt).toBe(9)
    expect(parseGallery(serializeGallery(again))).toEqual(again)
  })
})

describe('schema validation', () => {
  test('parseDocState rejects malformed payloads instead of throwing', () => {
    expect(parseDocState('{')).toBeNull()
    expect(parseDocState(null)).toBeNull()
    expect(parseDocState('{}')).toBeNull()
    const bad = JSON.stringify({ ...newDocState(16, 'x'), dirty: 'yes' })
    expect(parseDocState(bad)).toBeNull()
  })

  test('a doc is rejected on wrong version, size, palette or cell range', () => {
    const good = serializeDocState(newDocState(16, 'x'))
    const shape = () => JSON.parse(good)
    for (const doc of [
      { ...shape().work.doc, v: 2 },
      { ...shape().work.doc, size: 24 },
      { ...shape().work.doc, palette: [] },
      { ...shape().work.doc, palette: ['neon'] },
      { ...shape().work.doc, cells: [999] },
      { ...shape().work.doc, cells: shape().work.doc.cells.slice(1) }
    ]) {
      const state = { ...shape(), work: { ...shape().work, doc } }
      expect(parseDocState(JSON.stringify(state))).toBeNull()
    }
  })

  test('undo history with out-of-range cells is rejected', () => {
    const state = newDocState(16, 'x')
    const poison = {
      ...state,
      work: { ...state.work, undo: [[{ i: 9999, from: EMPTY, to: 0 }]] }
    }
    expect(parseDocState(JSON.stringify(poison))).toBeNull()
  })

  test('parseShared requires a writer id', () => {
    const state = newDocState(16, 'x')
    expect(parseShared(JSON.stringify({ ...state, by: 4 }))).toBeNull()
  })

  test('parseShared keeps a good view payload and drops a malformed one', () => {
    const state = newDocState(16, 'x')
    const view = {
      tool: 'Erase',
      color: 3,
      page: true,
      sheet: 'rename',
      actionId: 'a',
      renameTarget: 'g',
      nameInput: 'draft',
      deleteId: null,
      editSlot: 2,
      newName: 'next',
      newSize: '32 x 32',
      pending: { type: 'open', id: 'g' }
    }
    const withView = parseShared(serializeShared({ by: 'w', ...state, view }))
    expect(withView?.view?.tool).toBe('Erase')
    expect(withView?.view?.pending?.id).toBe('g')
    // Bad view fields invalidate only the view, never the draft beside it.
    const wire = (v: unknown) => JSON.stringify({ by: 'w', ...state, view: v })
    const dropped = parseShared(wire({ ...view, color: -1 }))
    expect(dropped).not.toBeNull()
    expect(dropped?.view).toBeUndefined()
    expect(dropped?.work.doc.name).toBe('x')
    for (const v of [
      { ...view, tool: '' },
      { ...view, page: 'yes' },
      { ...view, pending: { type: 'wild', id: null } }
    ]) {
      expect(parseShared(wire(v))?.view).toBeUndefined()
    }
  })

  test('a UI publication after a commit carries the committed document, not the stale one', () => {
    // Regression check for the publish ordering bug: commit() must move the
    // state ref ahead before returning, so a UI patch fired on the same tick
    // publishes the committed document instead of rewinding the peer's
    // pixels, dirty flag and undo stack to the pre-commit state.
    const base = newDocState(16, 'x')
    const view = {
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
    const stateRef = { current: base }
    const writes: string[] = []
    const publish = (st: typeof base, v: typeof view) => writes.push(serializeShared({ by: 'me', ...st, view: v }))
    const commit = (next: typeof base, v: typeof view) => {
      stateRef.current = next
      publish(next, v)
    }
    const patchUi = (v: typeof view) => publish(stateRef.current, v)
    const committed = { ...base, work: withEdit(base.work, [{ i: 0, from: EMPTY, to: 2 }]), dirty: true }
    commit(committed, view)
    patchUi({ ...view, tool: 'Erase' })
    const last = parseShared(writes.at(-1)!)
    expect(last?.work.doc.cells[0]).toBe(2)
    expect(last?.work.undo.length).toBe(1)
    expect(last?.dirty).toBe(true)
    expect(last?.view?.tool).toBe('Erase')
    // The rewinding shape this guard exists to catch: publishing the pre-commit
    // state after the edit would drop the painted cell for the other display.
    const rewound = parseShared(serializeShared({ by: 'me', ...base, view: { ...view, tool: 'Erase' } }))
    expect(rewound?.work.doc.cells[0]).toBe(EMPTY)
  })

  test('parseGallery drops corrupt items but keeps good ones', () => {
    const good = { id: 'g', updatedAt: 3, doc: doc() }
    const wire = JSON.stringify({
      v: 1,
      items: [good, { id: 4, updatedAt: 1, doc: doc() }, { id: 'x', updatedAt: 1, doc: null }]
    })
    const items = parseGallery(wire)
    expect(items.length).toBe(1)
    expect(items[0]!.id).toBe('g')
    expect(parseGallery('nope')).toEqual([])
    expect(parseGallery(JSON.stringify({ v: 2, items: [] }))).toEqual([])
  })

  test('canvas sizes stay small and supported', () => {
    expect(CANVAS_SIZES).toEqual([16, 32])
  })

  test('swatchLabel formats token names for labels', () => {
    expect(swatchLabel('grey3')).toBe('Grey 3')
    expect(swatchLabel('red')).toBe('Red')
  })
})
