// The board well: background graph paper, settled blocks, the landing ghost,
// the falling piece, the line-clear flash and the points it earned. Layers are
// plain absolutely-positioned cells - transforms animate the slide so the
// passive copy animates too, and the well never repaints more than the cells
// that moved.

import * as stylex from '@stylexjs/stylex'
import { memo, type ReactNode, type PointerEvent as ReactPointerEvent, useMemo } from 'react'

import { COLS, cellsOf, type Game, ghostY, KIND_NAME, type Kind, ROWS } from './game.ts'
import { styles, TONE } from './styles.ts'

/** Actions the well's gestures report back up to the game. */
export type Nudge = 'left' | 'right' | 'rotate' | 'soft' | 'hard'

const GUTTER = 1.5

function cellSize(cell: number) {
  const size = cell - (cell >= 16 ? GUTTER : 1)
  return { size, r: Math.max(1.5, Math.min(5, size * 0.16)) }
}

/** One block: an absolute cell translated into place. */
function Cell({ x, y, cell, k, falling }: { x: number; y: number; cell: number; k: Kind; falling?: boolean }) {
  const { size, r } = cellSize(cell)
  return (
    <i
      aria-hidden="true"
      {...stylex.props(
        styles.cell,
        styles.cellFill(TONE[k]),
        styles.fitCell(size, r),
        styles.cellAt(x, y, cell),
        falling ? styles.cellFall : styles.cellLock
      )}
    />
  )
}

/** The settled stack: one cell per occupied square. Memoized on the board. */
const Settled = memo(function Settled({ board, cell }: { board: number[]; cell: number }) {
  const cells: ReactNode[] = []
  for (let i = 0; i < board.length; i += 1) {
    const k = board[i]
    if (k) cells.push(<Cell key={i} x={i % COLS} y={(i / COLS) | 0} cell={cell} k={k as Kind} />)
  }
  return <>{cells}</>
})

const SHAPES_R0: Record<Kind, readonly (readonly [number, number])[]> = {
  1: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1]
  ],
  2: [
    [1, 0],
    [2, 0],
    [1, 1],
    [2, 1]
  ],
  3: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1]
  ],
  4: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1]
  ],
  5: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1]
  ],
  6: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1]
  ],
  7: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1]
  ]
}

/** A piece drawn in a hold/next box, centred in a 4x2 frame. */
export function Mini({ kind, cell }: { kind: Kind | null; cell: number }) {
  const shape = kind === null ? null : SHAPES_R0[kind]
  // Centre every piece inside the 4x2 frame by its own bounds so previews
  // read centred regardless of shape.
  const [ox, oy] = useMemo(() => {
    if (!shape) return [0, 0]
    const xs = shape.map(([x]) => x)
    const ys = shape.map(([, y]) => y)
    return [
      (4 - (Math.max(...xs) - Math.min(...xs) + 1)) / 2 - Math.min(...xs),
      (2 - (Math.max(...ys) - Math.min(...ys) + 1)) / 2 - Math.min(...ys)
    ]
  }, [shape])
  const { size: s, r } = cellSize(cell)
  return (
    <span
      {...stylex.props(styles.mini, styles.fitMini(cell * 4, cell * 2))}
      role="img"
      aria-label={kind ? `${KIND_NAME[kind]} piece` : 'empty'}
    >
      {!shape && <i aria-hidden="true" {...stylex.props(styles.miniSlot)} />}
      {shape?.map(([x, y], i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: one piece's cells are order-stable
          key={i}
          aria-hidden="true"
          {...stylex.props(
            styles.cell,
            styles.cellFill(TONE[kind!]),
            styles.fitCell(s, r),
            styles.cellAt(x + ox, y + oy, cell)
          )}
        />
      ))}
    </span>
  )
}

export function Playfield({
  game,
  cell,
  pad,
  onNudge,
  children
}: {
  game: Game
  cell: number
  pad: number
  onNudge: (nudge: Nudge) => void
  children?: ReactNode
}) {
  const piece = game.piece
  const ghost = piece && game.status === 'playing' ? ghostY(game.board, piece) : null
  const showGhost = ghost !== null && piece !== null && ghost > piece.y

  // Danger: any settled block in the top five rows tints the well's mouth.
  const danger = useMemo(() => game.board.slice(0, COLS * 5).some((c) => c !== 0), [game.board])

  // Tap rotates, a sideways drag nudges with the finger, a quick downward
  // flick is the hard drop and a held drag is the soft one. Gesture state is
  // per pointer; a fresh pointerdown re-arms it.
  const drag = useMemo(() => ({ x: 0, y: 0, id: -1, moved: 0, t: 0, softT: 0 }), [])
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.id = e.pointerId
    drag.x = e.clientX
    drag.y = e.clientY
    drag.moved = 0
    drag.t = e.timeStamp
    drag.softT = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.id !== e.pointerId) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    // Sideways travel steps one column per cell width under the finger.
    while (Math.abs(dx) - Math.abs(drag.moved) >= cell) {
      onNudge(dx > drag.moved ? 'right' : 'left')
      drag.moved += dx > drag.moved ? cell : -cell
    }
    // A held downward drag soft-drops, throttled to a sane write rate.
    if (dy > cell * 1.6 && e.timeStamp - drag.softT > 110) {
      drag.softT = e.timeStamp
      onNudge('soft')
    }
  }
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.id !== e.pointerId) return
    drag.id = -1
    const dy = e.clientY - drag.y
    const dx = e.clientX - drag.x
    const quick = e.timeStamp - drag.t < 260
    if (quick && dy > cell * 2 && dy > Math.abs(dx) * 1.4) onNudge('hard')
    else if (Math.abs(dx) < cell * 0.7 && dy < cell * 0.7 && quick) onNudge('rotate')
  }

  return (
    <div
      {...stylex.props(styles.board, styles.fitBoard(pad))}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <div {...stylex.props(styles.grid, styles.fitGrid(cell * COLS, cell * ROWS, cell))}>
        <Settled board={game.board} cell={cell} />
        {showGhost &&
          cellsOf(piece).map(([x, y]) => (
            <i
              key={`${x}:${y}`}
              aria-hidden="true"
              {...stylex.props(
                styles.ghost,
                styles.ghostFill(TONE[piece.k]),
                styles.fitCell(cellSize(cell).size, cellSize(cell).r),
                // cellsOf is absolute; the ghost sits at the anchor row plus
                // each cell's offset inside the piece.
                styles.cellAt(x, y + ghost - piece.y, cell)
              )}
            />
          ))}
        {piece &&
          cellsOf(piece).map(([x, y], i) =>
            y >= 0 ? (
              // Keyed on the drop so a fresh piece pops in instead of sliding
              // back up from the locked piece's last cells.
              // biome-ignore lint/suspicious/noArrayIndexKey: the four cells are order-stable within a piece
              <Cell key={`${game.drops}:${i}`} x={x} y={y} cell={cell} k={piece.k} falling />
            ) : null
          )}
        {game.cleared.map((y) => (
          <i key={`${game.drops}:f${y}`} aria-hidden="true" {...stylex.props(styles.flash, styles.fitFlash(y, cell))} />
        ))}
        {game.landed.map((i) => (
          <i
            key={`${game.drops}:l${i}`}
            aria-hidden="true"
            {...stylex.props(
              styles.landMark,
              styles.fitCell(cellSize(cell).size, cellSize(cell).r),
              styles.cellAt(i % COLS, (i / COLS) | 0, cell)
            )}
          />
        ))}
        {game.last > 0 && (
          <b key={`fly${game.drops}`} {...stylex.props(styles.fly, styles.fitFly(game.cleared[0] ?? 0, cell))}>
            {game.cleared.length === 4 ? `Tetris +${game.last.toLocaleString()}` : `+${game.last.toLocaleString()}`}
          </b>
        )}
        {danger && game.status === 'playing' && <i aria-hidden="true" {...stylex.props(styles.danger)} />}
      </div>
      {children}
    </div>
  )
}
