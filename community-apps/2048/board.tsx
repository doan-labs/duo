import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CELL_COUNT, SIZE, type Direction, type Tile } from './game.ts'
import { styles, tileGeometry, tileStyle } from './styles.ts'

export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

// Why inline style for placement: position changes every move, so per-tile
// geometry sets transform/width/height directly. StyleX only owns the static
// look (colors, radius, transition), which keeps placement animatable.
function place(x: number, y: number, size: number): CSSProperties {
  return { width: `${size}px`, height: `${size}px`, transform: `translate(${x}px, ${y}px)` }
}

export function fitLayout(view: ViewDimensions, headerHeight: number) {
  const cover = view.display === 'cover'
  const padding = cover ? 10 : 14
  const gap = cover ? 6 : 8
  const control = 32
  const fixedHeight = padding * 2 + headerHeight + 22 + control * 2 + 6 + 36 + gap * 4
  const width = view.width || 740
  const height = view.height || 480
  return {
    board: Math.max(0, Math.floor(Math.min(width - padding * 2, height - fixedHeight))),
    control
  }
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
      {...stylex.props(styles.tile, tileStyle(tile.value))}
      style={place(geometry.x, geometry.y, geometry.size)}
    />
  )
}

export function Board({
  tiles,
  absorbed,
  size,
  onMove
}: {
  tiles: Tile[]
  absorbed: Tile[]
  size: number
  onMove: (direction: Direction) => void
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  return (
    <div
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
            key={`empty-${index}`}
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
              tile.value >= 1000 && styles.compact
            )}
            style={place(geometry.x, geometry.y, geometry.size)}
          >
            {value}
          </div>
        )
      })}
    </div>
  )
}
