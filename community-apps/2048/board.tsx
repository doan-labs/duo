import * as stylex from '@stylexjs/stylex'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { CELL_COUNT, type Direction, SIZE, type Tile } from './game.ts'
import { styles, tileFont, tileGeometry, tileStyle } from './styles.ts'

export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

// Why inline style for placement: position changes every move, so per-tile
// geometry sets transform/width/height directly. StyleX only owns the static
// look (faces, radius, transition), which keeps placement animatable.
function place(x: number, y: number, size: number, font?: number): CSSProperties {
  const style: CSSProperties = { width: `${size}px`, height: `${size}px`, transform: `translate(${x}px, ${y}px)` }
  if (font) style.fontSize = `${font}px`
  return style
}

export function fitLayout(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 20 : 12
  const top = wide ? 18 : 12
  const bottom = wide ? 32 : 28
  const header = wide ? 62 : 50
  const gaps = wide ? 36 : 22
  // On the wide stage the controls sit beside the board and cost width; on the
  // cover they stack under it and cost height.
  const railWide = 196
  const railCover = 96
  const width = view.width || 740
  const height = view.height || 480
  const freeH = height - top - header - bottom - gaps
  const board = wide ? Math.min(freeH, width - padX * 2 - railWide) : Math.min(freeH - railCover, width - padX * 2)
  return { board: Math.max(0, Math.floor(board)) }
}

// Why a two-step glide: React only animates transform when the same node
// re-renders with a new value, so the absorbed tile mounts at its origin and
// flips to the destination on the next frame. Mounting at the destination
// would teleport it and skip the travel.
function GlideTile({
  tile,
  size,
  destination
}: {
  tile: Tile
  size: number
  destination?: { row: number; column: number }
}) {
  const [arrived, setArrived] = useState(!destination)
  useEffect(() => {
    if (!destination) return
    const frame = requestAnimationFrame(() => setArrived(true))
    return () => cancelAnimationFrame(frame)
  }, [destination])
  const cell = arrived && destination ? destination : { row: tile.row, column: tile.column }
  const geometry = tileGeometry(cell.row, cell.column, size)
  return (
    <div
      aria-hidden="true"
      {...stylex.props(styles.tile, styles.ghost, tileStyle(tile.value))}
      style={place(geometry.x, geometry.y, geometry.size, tileFont(tile.value, geometry.size))}
    />
  )
}

export function Board({
  tiles,
  absorbed,
  size,
  bump,
  overlay,
  onMove
}: {
  tiles: Tile[]
  absorbed: Tile[]
  size: number
  /** Increments on a rejected move; the well answers with a side-to-side nudge. */
  bump: number
  overlay?: ReactNode
  onMove: (direction: Direction) => void
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!bump || !el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { translate: '0 0' },
        { translate: '-6px 0', offset: 0.25 },
        { translate: '5px 0', offset: 0.55 },
        { translate: '-2px 0', offset: 0.8 },
        { translate: '0 0' }
      ],
      { duration: 190, easing: 'ease-out' }
    )
  }, [bump])

  return (
    <div
      ref={root}
      aria-label="2048 board"
      role="grid"
      {...stylex.props(styles.board, styles.fitBoard(size))}
      onTouchStart={(event) => {
        const touch = event.touches[0]
        if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0]
        const start = touchStart.current
        touchStart.current = null
        if (!touch || !start) return
        const x = touch.clientX - start.x
        const y = touch.clientY - start.y
        if (Math.max(Math.abs(x), Math.abs(y)) < 24) return
        onMove(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up')
      }}
    >
      {Array.from({ length: CELL_COUNT }, (_, index) => {
        const row = Math.floor(index / SIZE)
        const column = index % SIZE
        const geometry = tileGeometry(row, column, size)
        return (
          <div
            key={`cell-${row}-${column}`}
            {...stylex.props(styles.cell)}
            style={place(geometry.x, geometry.y, geometry.size)}
          />
        )
      })}
      {absorbed.map((tile) => (
        <GlideTile key={tile.id} tile={tile} size={size} destination={tile.target} />
      ))}
      {tiles.map((tile) => {
        const value = tile.nextValue ?? tile.value
        const geometry = tileGeometry(tile.row, tile.column, size)
        return (
          <div
            key={tile.id}
            aria-label={`${value} tile`}
            role="gridcell"
            tabIndex={-1}
            {...stylex.props(
              styles.tile,
              tileStyle(value),
              tile.fresh ? styles.tileSpawned : null,
              tile.merged ? styles.tileMerged : null
            )}
            style={place(geometry.x, geometry.y, geometry.size, tileFont(value, geometry.size))}
          >
            {value}
          </div>
        )
      })}
      {overlay}
    </div>
  )
}
