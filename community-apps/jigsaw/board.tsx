import { Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { app } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import {
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  BOARD_H,
  BOARD_W,
  FELT,
  filterTray,
  type Game,
  type Grid,
  gridOf,
  kindOf,
  looseCount,
  piecePath,
  placedCount,
  SNAP,
  tabReach
} from './puzzle.ts'
import { styles } from './styles.ts'

/** The board viewport: a point in board units at the viewport centre plus zoom. */
export type BoardView = { cx: number; cy: number; z: number }

/** What the parent needs from the board: element geometry and unit conversion. */
export type BoardApi = {
  el: () => HTMLElement | null
  toBoard: (clientX: number, clientY: number) => { x: number; y: number } | null
  scale: () => number
  contains: (clientX: number, clientY: number) => boolean
}

export function cellSize(g: Game) {
  return { w: BOARD_W / g.cols, h: BOARD_H / g.rows }
}

export function fitView(): BoardView {
  return { cx: BOARD_W / 2, cy: BOARD_H / 2, z: 1 }
}

const Z_MIN = 1
const Z_MAX = 4

function clampPan(v: BoardView): BoardView {
  // Keep at least a sliver of the table on screen: the centre may wander but
  // never past the felt edge.
  const cx = Math.min(Math.max(v.cx, -FELT * 0.6), BOARD_W + FELT * 0.6)
  const cy = Math.min(Math.max(v.cy, -FELT * 0.6), BOARD_H + FELT * 0.6)
  return { cx, cy, z: Math.min(Math.max(v.z, Z_MIN), Z_MAX) }
}

function PieceShape({
  g,
  grid,
  i,
  art,
  clipId,
  x,
  y,
  stroke,
  strokeWidth = 1.4,
  opacity = 1
}: {
  g: Game
  grid: Grid
  i: number
  art: string
  clipId: string
  x: number
  y: number
  stroke?: string
  strokeWidth?: number
  opacity?: number
}) {
  const p = g.pieces[i]!
  const cw = BOARD_W / g.cols
  const ch = BOARD_H / g.rows
  const d = piecePath(grid, p.r, p.c)
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <g clipPath={`url(#${clipId})`}>
        <image href={art} x={-p.c * cw} y={-p.r * ch} width={BOARD_W} height={BOARD_H} />
      </g>
      {stroke ? <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} /> : null}
    </g>
  )
}

export function BoardPane({
  api,
  game,
  art,
  guide,
  heldId,
  preview,
  ghostOf,
  finished,
  view,
  onView,
  onPieceDown,
  onPieceKey,
  onBoardTap,
  onHover,
  children
}: {
  api: MutableRefObject<BoardApi | null>
  game: Game
  art: string
  guide: boolean
  heldId: number | null
  preview: { id: number; x: number; y: number } | null
  ghostOf: number | null
  finished: boolean
  view: BoardView
  onView: (v: BoardView) => void
  onPieceDown: (id: number, e: ReactPointerEvent<HTMLElement>) => void
  onPieceKey: (id: number, e: KeyboardEvent<SVGElement>) => void
  onBoardTap: (pt: { x: number; y: number }) => void
  onHover: (pt: { x: number; y: number } | null) => void
  children?: ReactNode
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [panning, setPanning] = useState(false)
  const inst = useId().replace(/[^a-zA-Z0-9]/g, '')
  const viewRef = useRef(view)
  viewRef.current = view
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const panRef = useRef<{ cx: number; cy: number; x: number; y: number; moved: boolean } | null>(null)
  const pinchRef = useRef<{ d: number; z: number; cx: number; cy: number } | null>(null)

  const sceneW = BOARD_W + FELT * 2
  const sceneH = BOARD_H + FELT * 2
  const base = Math.min(box.w / sceneW, box.h / sceneH) || 0
  const scale = base * view.z

  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(([e]) => {
      const w = e!.contentRect.width
      const h = e!.contentRect.height
      if (w < 4 || h < 4) return
      setBox((b) => (Math.abs(b.w - w) > 0.5 || Math.abs(b.h - h) > 0.5 ? { w, h } : b))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Measurements, conversion and hit tests for the parent's gesture machine.
  useEffect(() => {
    api.current = {
      el: () => wrap.current,
      scale: () => {
        const r = wrap.current?.getBoundingClientRect()
        if (!r || r.width < 4) return 0
        const b = Math.min(r.width / sceneW, r.height / sceneH)
        return b * viewRef.current.z
      },
      toBoard: (cx, cy) => {
        const r = wrap.current?.getBoundingClientRect()
        if (!r || r.width < 4) return null
        const b = Math.min(r.width / sceneW, r.height / sceneH)
        const s = b * viewRef.current.z
        const v = viewRef.current
        return { x: v.cx + (cx - r.left - r.width / 2) / s, y: v.cy + (cy - r.top - r.height / 2) / s }
      },
      contains: (cx, cy) => {
        const r = wrap.current?.getBoundingClientRect()
        return !!r && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom
      }
    }
    return () => {
      api.current = null
    }
  }, [api, sceneW, sceneH])

  const vb =
    scale > 0
      ? `${view.cx - box.w / 2 / scale} ${view.cy - box.h / 2 / scale} ${box.w / scale} ${box.h / scale}`
      : '0 0 1 1'

  const zoomTo = (z: number, at?: { x: number; y: number }) => {
    const v = viewRef.current
    const z2 = Math.min(Math.max(z, Z_MIN), Z_MAX)
    if (z2 === v.z || !scale) {
      onView({ ...v, z: z2 })
      return
    }
    const a = at ?? { x: v.cx, y: v.cy }
    onView(clampPan({ cx: a.x + (v.cx - a.x) * (v.z / z2), cy: a.y + (v.cy - a.y) * (v.z / z2), z: z2 }))
  }

  const hitPiece = (e: ReactPointerEvent) => {
    const t = (e.target as Element).closest?.('[data-p]')
    return t ? Number((t as HTMLElement).dataset.p) : null
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Nested buttons (zoom dock, held card, completion veil) must keep their
    // click: pointer capture retargets the follow-up click to the wrap.
    if ((e.target as Element).closest?.('button')) return
    wrap.current?.setPointerCapture(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      pinchRef.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z, cx: 0, cy: 0 }
      const mid = api.current?.toBoard((a.x + b.x) / 2, (a.y + b.y) / 2)
      if (mid) pinchRef.current.cx = mid.x
      if (mid) pinchRef.current.cy = mid.y
      panRef.current = null
      return
    }
    const pid = hitPiece(e)
    const p = pid !== null ? game.pieces[pid] : undefined
    if (p && p.z !== 0 && !finished) {
      onPieceDown(pid!, e)
      return
    }
    panRef.current = { cx: viewRef.current.cx, cy: viewRef.current.cy, x: e.clientX, y: e.clientY, moved: false }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const pt = pts.current.get(e.pointerId)
    if (pt) {
      pt.x = e.clientX
      pt.y = e.clientY
      const pinch = pinchRef.current
      if (pinch && pts.current.size === 2) {
        const [a, b] = [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch.d > 0 && d > 0) {
          const z = Math.min(Math.max((pinch.z * d) / pinch.d, Z_MIN), Z_MAX)
          const v = viewRef.current
          // Pinch keeps the mid-board point pinned under the fingers' midpoint.
          const mid = api.current?.toBoard((a.x + b.x) / 2, (a.y + b.y) / 2)
          if (mid) onView(clampPan({ cx: pinch.cx + (v.cx - mid.x), cy: pinch.cy + (v.cy - mid.y), z }))
          else onView(clampPan({ ...v, z }))
        }
        return
      }
      const pan = panRef.current
      if (pan) {
        const dx = e.clientX - pan.x
        const dy = e.clientY - pan.y
        if (pan.moved || Math.hypot(dx, dy) > 5) {
          pan.moved = true
          setPanning(true)
          const s = api.current?.scale() ?? scale
          if (s) onView(clampPan({ cx: pan.cx - dx / s, cy: pan.cy - dy / s, z: viewRef.current.z }))
        }
        return
      }
      return
    }
    // No buttons: hover tracking drives the held-piece preview position.
    if (e.pointerType === 'mouse' && e.buttons === 0) onHover(api.current?.toBoard(e.clientX, e.clientY) ?? null)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const pan = panRef.current
    pts.current.delete(e.pointerId)
    pinchRef.current = null
    panRef.current = null
    setPanning(false)
    if (pan && !pan.moved) {
      const pt = api.current?.toBoard(e.clientX, e.clientY)
      if (pt) onBoardTap(pt)
    }
  }

  const onPointerLeave = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) onHover(null)
  }

  const grid = useMemo(() => gridOf(game), [game])
  const cw = BOARD_W / game.cols
  const ch = BOARD_H / game.rows
  const locked = game.pieces.filter((p) => p.z === 2)
  const loose = game.pieces.filter((p) => p.z === 1 && p.i !== ghostOf)
  const pv = preview
  const pvPiece = pv ? game.pieces[pv.id] : null
  const pvNear =
    pv && pvPiece ? Math.hypot(pv.x - pvPiece.c * cw, pv.y - pvPiece.r * ch) <= Math.min(cw, ch) * SNAP : false

  return (
    <div
      ref={wrap}
      {...stylex.props(
        styles.boardWrap,
        styles.dots,
        panning && styles.boardWrapPan,
        heldId !== null && styles.boardWrapPlace
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onWheel={(e) => {
        const pt = api.current?.toBoard(e.clientX, e.clientY)
        zoomTo(viewRef.current.z * (e.deltaY > 0 ? 0.86 : 1.16), pt ?? undefined)
      }}
      role="application"
      aria-label={`Puzzle board, ${placedCount(game)} of ${game.pieces.length} pieces placed`}
    >
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        viewBox={vb}
        role="img"
        aria-label={`Puzzle board, ${placedCount(game)} of ${game.pieces.length} pieces placed`}
      >
        <defs>
          {game.pieces.map((p) => (
            <clipPath key={p.i} id={`pc${inst}x${p.i}`} clipPathUnits="userSpaceOnUse">
              <path d={piecePath(grid, p.r, p.c)} />
            </clipPath>
          ))}
        </defs>
        <rect x={-FELT} y={-FELT} width={sceneW} height={sceneH} fill="none" />
        {/* The plate the picture is rebuilt on. */}
        <rect x={-7} y={-7} width={BOARD_W + 14} height={BOARD_H + 14} rx={10} fill={app.surface} />
        {guide ? <image href={art} x={0} y={0} width={BOARD_W} height={BOARD_H} opacity={0.24} /> : null}
        {game.pieces.map((p) => (
          <path
            key={`s${p.i}`}
            d={piecePath(grid, p.r, p.c)}
            transform={`translate(${p.c * cw} ${p.r * ch})`}
            fill="none"
            stroke={app.separator}
            strokeWidth={1}
          />
        ))}
        {locked.map((p) =>
          p.i === ghostOf ? null : (
            <PieceShape
              key={p.i}
              g={game}
              grid={grid}
              i={p.i}
              art={art}
              clipId={`pc${inst}x${p.i}`}
              x={p.c * cw}
              y={p.r * ch}
            />
          )
        )}
        {loose.map((p) => (
          // biome-ignore lint/a11y/useSemanticElements: SVG has no button element; the g is a real focusable target
          <g
            key={p.i}
            data-p={p.i}
            role="button"
            tabIndex={0}
            aria-label={`Piece ${p.i + 1}, ${kindOf(grid, p.r, p.c)} piece, on the board`}
            style={{ cursor: 'grab' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
              onPieceKey(p.i, e)
            }}
          >
            <PieceShape
              g={game}
              grid={grid}
              i={p.i}
              art={art}
              clipId={`pc${inst}x${p.i}`}
              x={p.x}
              y={p.y}
              stroke={app.separator}
            />
          </g>
        ))}
        {pv && pvPiece && pvPiece.z !== 2 ? (
          pvNear ? (
            <g>
              <PieceShape
                g={game}
                grid={grid}
                i={pv.id}
                art={art}
                clipId={`pc${inst}x${pv.id}`}
                x={pvPiece.c * cw}
                y={pvPiece.r * ch}
                opacity={0.55}
              />
              <path
                d={piecePath(grid, pvPiece.r, pvPiece.c)}
                transform={`translate(${pvPiece.c * cw} ${pvPiece.r * ch})`}
                fill="none"
                stroke={app.link}
                strokeWidth={2.4}
              />
            </g>
          ) : (
            <PieceShape
              g={game}
              grid={grid}
              i={pv.id}
              art={art}
              clipId={`pc${inst}x${pv.id}`}
              x={pv.x}
              y={pv.y}
              opacity={0.6}
              stroke={app.separator}
            />
          )
        ) : null}
      </svg>
      {children}
      {/* biome-ignore lint/a11y/useSemanticElements: a compact pill is a toolbar of buttons, not a fieldset */}
      <div {...stylex.props(styles.zoomDock)} role="group" aria-label="Board zoom">
        <button
          type="button"
          aria-label="Zoom out"
          {...stylex.props(styles.zoomBtn, shared.press)}
          onClick={() => zoomTo(view.z / 1.3)}
        >
          <Sym name="minus" size={13} />
        </button>
        <button
          type="button"
          aria-label="Fit board"
          {...stylex.props(styles.zoomPct, shared.press)}
          onClick={() => onView(fitView())}
        >
          {Math.round(view.z * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          {...stylex.props(styles.zoomBtn, shared.press)}
          onClick={() => zoomTo(view.z * 1.3)}
        >
          <Sym name="plus" size={13} />
        </button>
      </div>
      {guide ? <div {...stylex.props(styles.guideTag)}>Guide</div> : null}
    </div>
  )
}

/** One piece rendered for the tray or the held/drag chip. */
export function PieceThumb({ game, i, art, px }: { game: Game; i: number; art: string; px: number }) {
  const p = game.pieces[i]!
  const grid = gridOf(game)
  const cw = BOARD_W / game.cols
  const ch = BOARD_H / game.rows
  const reach = tabReach(grid)
  const inst = useId().replace(/[^a-zA-Z0-9]/g, '')
  const clip = `pt${inst}x${i}`
  return (
    <svg width={px} height={px} viewBox={`${-reach} ${-reach} ${cw + reach * 2} ${ch + reach * 2}`} aria-hidden="true">
      <defs>
        <clipPath id={clip} clipPathUnits="userSpaceOnUse">
          <path d={piecePath(grid, p.r, p.c)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <image href={art} x={-p.c * cw} y={-p.r * ch} width={BOARD_W} height={BOARD_H} />
      </g>
      <path d={piecePath(grid, p.r, p.c)} fill="none" stroke={app.separator} strokeWidth={2} />
    </svg>
  )
}

export function TrayPane({
  game,
  art,
  filter,
  onFilter,
  heldId,
  onPress,
  railRef,
  compact,
  action
}: {
  game: Game
  art: string
  filter: 'all' | 'corner' | 'edge'
  onFilter: (f: 'all' | 'corner' | 'edge') => void
  heldId: number | null
  onPress: (id: number, e: ReactPointerEvent<HTMLElement>) => void
  railRef: MutableRefObject<HTMLElement | null>
  compact: boolean
  action?: ReactNode
}) {
  const grid = useMemo(() => gridOf(game), [game])
  const list = useMemo(() => filterTray(game, filter), [game, filter])
  const left = looseCount(game)
  return (
    <div
      {...stylex.props(styles.rail, compact && styles.railCover)}
      ref={railRef as MutableRefObject<HTMLDivElement | null>}
    >
      <div {...stylex.props(styles.railHead)}>
        <span {...stylex.props(styles.railTitle)}>Tray</span>
        <span {...stylex.props(styles.railTitle, styles.railCount)}>
          {list.length}
          {filter === 'all' ? '' : ` of ${left}`}
        </span>
        <div role="radiogroup" aria-label="Filter pieces" {...stylex.props(styles.segTrack)}>
          {(['all', 'corner', 'edge'] as const).map((f) => (
            // biome-ignore lint/a11y/useSemanticElements: Segmented-style labelled segments, not bare inputs
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              {...stylex.props(styles.segBtn, shared.press, filter === f && styles.segOn)}
              onClick={() => onFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'corner' ? 'Corners' : 'Edges'}
            </button>
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.trayBox)}>
        {list.length === 0 ? (
          <p {...stylex.props(styles.trayEmpty)}>
            {left === 0 ? 'All pieces are placed.' : 'No pieces match this filter.'}
          </p>
        ) : (
          <div {...stylex.props(styles.trayGrid)} role="listbox" aria-label="Tray pieces">
            {list.map((i) => (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={heldId === i}
                aria-label={`Piece ${i + 1}, ${kindOf(grid, game.pieces[i]!.r, game.pieces[i]!.c)} piece`}
                {...stylex.props(styles.pieceBtn, shared.press, heldId === i && styles.pieceBtnHeld)}
                onPointerDown={(e) => onPress(i, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    // The document listener drops a held piece on the same key;
                    // this press already handles it.
                    e.preventDefault()
                    e.stopPropagation()
                    onPress(i, e as unknown as ReactPointerEvent<HTMLElement>)
                  }
                }}
              >
                <PieceThumb game={game} i={i} art={art} px={compact ? 48 : 52} />
              </button>
            ))}
          </div>
        )}
      </div>
      {action}
    </div>
  )
}
