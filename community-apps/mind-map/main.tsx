import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, TextField, useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  addChild,
  docBounds,
  type Library,
  latestDoc,
  type MindDoc,
  type MindNode,
  moveNode,
  newDoc,
  parseLibrary,
  parseMirror,
  recolorNode,
  removeSubtree,
  renameDoc,
  renameNode,
  serializeLibrary,
  serializeMirror,
  setView,
  welcomeDoc,
  withDoc,
  withoutDoc
} from './graph.ts'
import { HUES, styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled map - adopting it unconditionally is what converges the two
// displays, including the race where both seed a fresh session at once.
const ME = crypto.randomUUID()
const LIB_KEY = 'mindmap-library'
const DOC_KEY = 'mindmap-doc'

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

let libQueue = Promise.resolve()
// Library writes funnel through one queue so two quick edits cannot each merge
// into the same stale snapshot and overwrite one another's maps.
const enqueue = (job: () => Promise<void>) => {
  libQueue = libQueue.then(job).catch(() => {})
}

const edgePath = (a: MindNode, b: MindNode) => {
  const dx = b.x - a.x
  return `M ${a.x} ${a.y} C ${a.x + dx * 0.5} ${a.y} ${b.x - dx * 0.5} ${b.y} ${b.x} ${b.y}`
}

function MindMap() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const stored = useKV(os.storage, LIB_KEY)
  // Latest session value for the open map, fed by a raw watch - not useKV.
  const [live, setLive] = useState<{ raw: string | null; known: boolean }>({ raw: null, known: false })
  const [doc, setDoc] = useState<MindDoc | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [arming, setArming] = useState<string | null>(null)
  const [gesturing, setGesturing] = useState(false)
  // The node this copy is dragging, so its move transition can switch off:
  // a transitioning transform would trail the pointer instead of tracking it.
  const [dragId, setDragId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  // Maps this copy has already fitted to its own canvas: one shared view
  // cannot serve a 387pt cover and a 790pt inner, so each display computes
  // its own framing on first sight of a doc.
  const framedMine = useRef(new Set<string>())
  const docRef = useRef(doc)
  docRef.current = doc
  const selRef = useRef(sel)
  selRef.current = sel

  const library = parseLibrary(stored.value)
  const selected = doc && sel ? (doc.nodes[sel] ?? null) : null

  // Merges one doc into the freshest library it can read. Merging against a
  // fresh get - not the KV mirror, which lags while occluded - is what stops a
  // hidden copy from clobbering maps it has not seen yet.
  const saveDoc = (next: MindDoc) => {
    enqueue(async () => {
      const lib = await readLib()
      stored.set(serializeLibrary(withDoc(lib, next)))
    })
  }

  // Every edit lands in both places: the session key carries the live map
  // across the fold, the library key keeps it durable. A drag writes once, on
  // release - the moving frames only repaint locally.
  const publish = (next: MindDoc, nextSel?: string | null) => {
    const selNow = nextSel === undefined ? selRef.current : nextSel
    setDoc(next)
    if (nextSel !== undefined) setSel(nextSel)
    saveDoc(next)
    void os.session.set(DOC_KEY, serializeMirror(ME, next, selNow)).catch(() => {})
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

  // Why adopt on the session key: the fold carries the open map to the other
  // display. A write this copy did not make is the new settled map; own writes
  // are already on screen and are ignored. Storage stays the source of truth -
  // an adopted map lands as one library write, so the two stores never fight.
  // The raw string is the guard: the effect body must not re-fire on every
  // render of a remote value already on screen.
  useEffect(() => {
    if (!live.known) return
    const raw = live.raw
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      // Seed only after the library hydrates: a fresh copy publishing before it
      // would otherwise let a peer write over maps it never saw.
      if (!seeded.current && stored.status === 'ready') {
        seeded.current = true
        enqueue(async () => {
          const lib = await readLib()
          const open = latestDoc(lib) ?? welcomeDoc()
          setDoc(open)
          setSel(null)
          stored.set(serializeLibrary(withDoc(lib, open)))
          await os.session.set(DOC_KEY, serializeMirror(ME, open, null)).catch(() => {})
        })
      }
      return
    }
    const next = parseMirror(raw)
    if (!next || next.by === ME) return
    // Keep this copy's own view for a doc it already fitted: a remote fit was
    // computed for a different canvas and must not replace the local one.
    const keep = docRef.current?.id === next.doc.id && framedMine.current.has(next.doc.id)
    setDoc(keep && docRef.current ? { ...next.doc, view: docRef.current.view } : next.doc)
    setSel(next.sel)
    setArming(null)
    enqueue(async () => {
      const lib = await readLib()
      const existing = lib.maps[next.doc.id]
      if (!existing || existing.updated < next.doc.updated) {
        stored.set(serializeLibrary(withDoc(lib, next.doc)))
      }
    })
  }, [live, stored.status, stored.set])

  // First sight of a doc gets a fit computed for this display's own canvas.
  // A hidden copy's canvas measures 0x0, so the observer retries once the
  // fold gives the element a real box; the fitted view is published back so
  // it also serves as the stored starting view.
  useEffect(() => {
    if (!doc || framedMine.current.has(doc.id)) return
    const el = canvasRef.current
    if (!el) return
    const fitLocal = () => {
      const box = el.getBoundingClientRect()
      if (!box.width) return
      framedMine.current.add(doc.id)
      const b = docBounds(doc)
      const zoom = Math.min(1, Math.min((box.width - 96) / b.w, (box.height - 96) / b.h))
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
      if (!framedMine.current.has(doc.id)) fitLocal()
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

  // The ref'd shell renders even while the map seeds: useWide's observer needs
  // the element on the first commit or it throws before ready can post.
  if (!doc) return <main ref={rootRef} {...stylex.props(dark, styles.root)} />

  const count = Object.keys(doc.nodes).length
  const saving = stored.status === 'saving'

  const zoomBy = (factor: number) => publish(setView(doc, { ...doc.view, zoom: doc.view.zoom * factor }))
  const fit = () => {
    const box = canvasRef.current?.getBoundingClientRect()
    if (!box?.width) return
    const b = docBounds(doc)
    const zoom = Math.min(1, Math.min((box.width - 96) / b.w, (box.height - 96) / b.h))
    publish(setView(doc, { x: -b.cx * zoom, y: -b.cy * zoom, zoom }))
  }
  const openMap = (id: string) => {
    setSheet(false)
    setArming(null)
    if (id === doc.id) return
    // Read the library fresh: the KV mirror can lag while this copy is
    // occluded, so a map the other display just made may not be listed yet.
    void (async () => {
      const next = (await readLib()).maps[id]
      if (next && next.id !== docRef.current?.id) publish(next, next.root)
    })()
  }
  const makeMap = () => {
    setSheet(false)
    setArming(null)
    void (async () => {
      const next = newDoc(`Map ${Object.keys((await readLib()).maps).length + 1}`)
      publish(next, next.root)
    })()
  }
  // Deleting a map runs as one queued write so a republished doc cannot
  // resurrect it from a stale list. When the open map goes, the newest
  // remaining one (or a fresh one) takes over the session.
  const dropMap = (id: string) => {
    setArming(null)
    enqueue(async () => {
      const lib = withoutDoc(await readLib(), id)
      const open = docRef.current?.id === id ? (latestDoc(lib) ?? newDoc('Map 1')) : null
      stored.set(serializeLibrary(open ? withDoc(lib, open) : lib))
      if (open) {
        setDoc(open)
        setSel(open.root)
        void os.session.set(DOC_KEY, serializeMirror(ME, open, open.root)).catch(() => {})
      }
    })
  }
  const dropNode = (id: string) => {
    if (id === doc.root) return
    publish(removeSubtree(doc, id), null)
    setArming(null)
  }
  const spawn = () => {
    const anchor = sel ?? doc.root
    const { doc: next, id } = addChild(doc, anchor)
    publish(next, id)
    setArming(null)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const hit = (e.target as HTMLElement).closest('[data-node]')
    const id = hit instanceof HTMLElement ? (hit.dataset.node ?? null) : null
    // The zoom dock lives inside the canvas: capturing its pointerdown would
    // retarget the release to the canvas and swallow the button's click.
    if (!id && (e.target as HTMLElement).closest('button, input, [role="toolbar"]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      kind: id ? 'node' : 'pan',
      id,
      px: e.clientX,
      py: e.clientY,
      ox: id ? doc.nodes[id]!.x : doc.view.x,
      oy: id ? doc.nodes[id]!.y : doc.view.y,
      moved: false
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    const now = docRef.current
    if (!d || !now || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    if (!d.moved) {
      setGesturing(true)
      if (d.kind === 'node') setDragId(d.id)
    }
    d.moved = true
    if (d.kind === 'pan') setDoc({ ...now, view: { ...now.view, x: d.ox + dx, y: d.oy + dy } })
    else if (d.id) setDoc(moveNode(now, d.id, d.ox + dx / now.view.zoom, d.oy + dy / now.view.zoom))
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    setGesturing(false)
    setDragId(null)
    if (d.moved) {
      suppressClick.current = true
      if (docRef.current) publish(docRef.current)
      return
    }
    setArming(null)
    if (d.kind === 'node' && d.id) setSel(d.id)
    else setSel(null)
  }

  const mapRow = (id: string, name: string, nodes: number) => (
    <div key={id} {...stylex.props(styles.trayRow)}>
      <button
        type="button"
        onClick={() => openMap(id)}
        aria-current={id === doc.id}
        {...stylex.props(styles.mapRow, styles.grow, id === doc.id && styles.mapRowOn)}
      >
        <span {...stylex.props(styles.mapName)}>{name}</span>
        <span {...stylex.props(styles.mapMeta)}>{nodes}</span>
        {id === doc.id && <Sym name="check" size={12} />}
      </button>
      <button
        type="button"
        aria-label={arming === id ? 'Confirm delete map' : `Delete ${name}`}
        onClick={() => (arming === id ? dropMap(id) : setArming(id))}
        {...stylex.props(styles.iconBtn, arming === id && styles.btnWarn)}
      >
        <Sym name="trash" size={13} />
      </button>
    </div>
  )

  const nodeTools = (
    <>
      <div {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>Selected node</span>
        <TextField
          aria-label="Node text"
          value={selected?.text ?? ''}
          placeholder="Tap a node to edit"
          disabled={!selected}
          onChange={(e) => selected && publish(renameNode(doc, selected.id, e.target.value))}
        />
      </div>
      {selected && (
        <fieldset aria-label="Node colour" {...stylex.props(styles.palette)}>
          {HUES.map((hue, i) => (
            <button
              key={hue}
              type="button"
              aria-label={`Colour ${i + 1}`}
              aria-pressed={selected.color === i}
              onClick={() => publish(recolorNode(doc, selected.id, i))}
              {...stylex.props(styles.swatch, styles.dotTone(i), selected.color === i && styles.swatchOn)}
            />
          ))}
        </fieldset>
      )}
      <div {...stylex.props(styles.rowBtns)}>
        <button type="button" onClick={spawn} {...stylex.props(styles.btn, styles.btnAccent)}>
          <Sym name="plus" size={12} />
          {selected ? 'Add child' : 'Add to centre'}
        </button>
        <button
          type="button"
          disabled={!selected || selected.id === doc.root}
          onClick={() => selected && (arming === selected.id ? dropNode(selected.id) : setArming(selected.id))}
          {...stylex.props(styles.btn, selected !== null && arming === selected.id && styles.btnWarn)}
        >
          <Sym name="trash" size={12} />
          {arming === selected?.id ? 'Sure?' : 'Delete'}
        </button>
      </div>
    </>
  )

  const mapsSection = (
    <div {...stylex.props(styles.section)}>
      <span {...stylex.props(styles.fieldLabel)}>Maps</span>
      <div {...stylex.props(styles.mapList)}>
        {Object.values(library.maps)
          .sort((a, b) => b.updated - a.updated)
          .map((m) => mapRow(m.id, m.name, Object.keys(m.nodes).length))}
      </div>
      <button type="button" onClick={makeMap} {...stylex.props(styles.btn)}>
        <Sym name="plus" size={12} />
        New map
      </button>
    </div>
  )

  const zoomDock = (
    <div role="toolbar" aria-label="Zoom" {...stylex.props(styles.zoomDock)}>
      <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)} {...stylex.props(styles.iconBtn)}>
        <Sym name="minus" size={13} />
      </button>
      <button
        type="button"
        aria-label="Reset zoom"
        onClick={() => publish(setView(doc, { ...doc.view, zoom: 1 }))}
        {...stylex.props(styles.zoomPct)}
      >
        {Math.round(doc.view.zoom * 100)}%
      </button>
      <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)} {...stylex.props(styles.iconBtn)}>
        <Sym name="plus" size={13} />
      </button>
      <button type="button" aria-label="Fit map" onClick={fit} {...stylex.props(styles.iconBtn)}>
        <Sym name="expand" size={13} />
      </button>
    </div>
  )

  const canvas = (
    <div
      ref={canvasRef}
      role="application"
      aria-label="Mind map canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      {...stylex.props(
        styles.canvas,
        styles.dots,
        styles.dotsAt(doc.view.x, doc.view.y),
        gesturing && styles.canvasPanning
      )}
    >
      <div {...stylex.props(styles.world, styles.worldAt(doc.view.x, doc.view.y, doc.view.zoom))}>
        <svg aria-hidden="true" {...stylex.props(styles.edges)}>
          {Object.values(doc.nodes)
            .filter((n) => n.parent !== null && doc.nodes[n.parent])
            .map((n) => (
              <path
                key={n.id}
                d={edgePath(doc.nodes[n.parent!]!, n)}
                fill="none"
                pathLength={1}
                {...stylex.props(styles.edge, sel === n.id ? styles.edgeSel(n.color) : styles.edgeTone(n.color))}
              />
            ))}
        </svg>
        {Object.values(doc.nodes).map((n) => (
          <button
            key={n.id}
            type="button"
            data-node={n.id}
            aria-label={`Idea: ${n.text || 'Untitled'}`}
            aria-pressed={sel === n.id}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false
                return
              }
              setSel(n.id)
              setArming(null)
            }}
            {...stylex.props(
              styles.node,
              !wide && styles.nodeCover,
              styles.nodeAt(n.x, n.y),
              n.id === doc.root && styles.nodeRoot,
              sel === n.id && styles.nodeSel,
              dragId === n.id && styles.nodeDrag
            )}
          >
            <i aria-hidden="true" {...stylex.props(styles.dot, styles.dotTone(n.color))} />
            <span {...stylex.props(styles.nodeText)}>{n.text || 'Untitled'}</span>
          </button>
        ))}
      </div>
      {zoomDock}
      <span {...stylex.props(styles.hint)}>
        {wide ? 'Drag the canvas to pan, drag a node to move it' : 'Drag to pan, tap a node'}
      </span>
    </div>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root, !wide && styles.rootCover)}>
      {wide ? (
        <>
          <header {...stylex.props(styles.header)}>
            <div {...stylex.props(styles.brand)}>
              <span {...stylex.props(styles.kicker)}>Duo Studio</span>
              <h1 {...stylex.props(styles.title)}>Mind Map</h1>
            </div>
            <div {...stylex.props(styles.countChip)}>{count} ideas</div>
          </header>
          <section {...stylex.props(styles.stage)}>
            {canvas}
            <aside {...stylex.props(styles.panel)}>
              <div {...stylex.props(styles.field)}>
                <span {...stylex.props(styles.fieldLabel)}>Map</span>
                <TextField
                  aria-label="Map name"
                  value={doc.name}
                  onChange={(e) => publish(renameDoc(doc, e.target.value))}
                />
                <small role="status" {...stylex.props(styles.meta)}>
                  {saving ? 'Saving...' : 'Synced across both displays'}
                </small>
              </div>
              <span {...stylex.props(styles.sepH)} />
              {nodeTools}
              <span {...stylex.props(styles.sepH)} />
              {mapsSection}
            </aside>
          </section>
        </>
      ) : (
        <>
          <header {...stylex.props(styles.header)}>
            <div {...stylex.props(styles.brand)}>
              <span {...stylex.props(styles.kicker)}>Duo Studio</span>
              <h1 {...stylex.props(styles.title, styles.titleCover)}>{doc.name || 'Mind Map'}</h1>
            </div>
            <div {...stylex.props(styles.countChip)}>{count}</div>
          </header>
          {canvas}
          <div {...stylex.props(styles.tray)}>
            <div {...stylex.props(styles.trayRow)}>
              <button
                type="button"
                onClick={spawn}
                {...stylex.props(styles.iconBtn, styles.iconBtnTint, styles.iconBtnLgH)}
              >
                <Sym name="plus" size={13} />
                Idea
              </button>
              <button
                type="button"
                aria-label="Maps"
                onClick={() => setSheet(true)}
                {...stylex.props(styles.iconBtn, styles.iconBtnTint, styles.iconBtnLgH)}
              >
                <Sym name="stack" size={13} />
                Maps
              </button>
              <span {...stylex.props(styles.sep)} />
              <button
                type="button"
                disabled={!selected || selected.id === doc.root}
                aria-label={arming === selected?.id ? 'Confirm delete node' : 'Delete node'}
                onClick={() => selected && (arming === selected.id ? dropNode(selected.id) : setArming(selected.id))}
                {...stylex.props(styles.iconBtn, styles.iconBtnLg, arming === selected?.id && styles.btnWarn)}
              >
                <Sym name="trash" size={13} />
              </button>
              <span role="status" {...stylex.props(styles.saved)}>
                {!saving && <Sym name="check" size={10} />}
                {saving ? 'Saving' : 'Saved'}
              </span>
            </div>
            {selected && (
              <div {...stylex.props(styles.trayRow)}>
                <div {...stylex.props(styles.trayField)}>
                  <TextField
                    aria-label="Node text"
                    value={selected.text}
                    onChange={(e) => publish(renameNode(doc, selected.id, e.target.value))}
                  />
                </div>
              </div>
            )}
            {selected && (
              <fieldset aria-label="Node colour" {...stylex.props(styles.palette)}>
                {HUES.map((hue, i) => (
                  <button
                    key={hue}
                    type="button"
                    aria-label={`Colour ${i + 1}`}
                    aria-pressed={selected.color === i}
                    onClick={() => publish(recolorNode(doc, selected.id, i))}
                    {...stylex.props(styles.swatch, styles.dotTone(i), selected.color === i && styles.swatchOn)}
                  />
                ))}
              </fieldset>
            )}
          </div>
          {sheet && (
            <div role="dialog" aria-label="Maps" {...stylex.props(styles.scrim)}>
              <button
                type="button"
                aria-label="Close maps"
                onClick={() => setSheet(false)}
                {...stylex.props(styles.scrimTap)}
              />
              <div {...stylex.props(styles.sheet)}>
                <div {...stylex.props(styles.sheetHead)}>
                  <span {...stylex.props(styles.fieldLabel)}>This map</span>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setSheet(false)}
                    {...stylex.props(styles.iconBtn)}
                  >
                    <Sym name="close" size={13} />
                  </button>
                </div>
                <TextField
                  aria-label="Map name"
                  value={doc.name}
                  onChange={(e) => publish(renameDoc(doc, e.target.value))}
                />
                {mapsSection}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<MindMap />)
