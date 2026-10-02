import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useMemo, useRef } from 'react'
import { type Cell, type Game, neighbors } from './game.ts'
import { styles } from './styles.ts'

export type ViewDimensions = { display: 'inner' | 'cover'; width: number; height: number }

/**
 * The square the board gets, from the view's real size. On the wide stage the
 * rail sits beside the board and costs width; on the cover it stacks under it
 * and costs height.
 */
export function fitLayout(view: ViewDimensions, wide: boolean) {
  const padX = wide ? 40 : 24
  const top = wide ? 16 : 12
  const bottom = wide ? 32 : 24
  // Cover header wraps the score chips onto a second line; rail stacks the
  // segments over the buttons, and the hint row sits under it.
  const header = wide ? 56 : 112
  const gaps = wide ? 24 : 48
  const railWide = 200
  const railCover = 124
  const width = view.width || 790
  const height = view.height || 555
  const freeH = height - top - header - bottom - gaps
  const board = wide ? Math.min(freeH, width - padX * 2 - railWide) : Math.min(freeH - railCover, width - padX * 2)
  return { board: Math.max(96, Math.floor(board)) }
}

const LONG_PRESS_MS = 400
/** Drag distance that cancels a long-press: the finger was scrolling the field. */
const DRAG_PX = 12

/** Classic number colours, tuned for the dark field. */
const NUMBER_STYLES = [styles.n1, styles.n2, styles.n3, styles.n4, styles.n5, styles.n6, styles.n7, styles.n8] as const

export function FlagGlyph({ button }: { button?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.glyph, button && styles.glyphBtn)}>
      <path d="M7 21V3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7 4h10.5L14 8.5 17.5 13H7z" fill="currentColor" />
    </svg>
  )
}

function MineGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.glyph)}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <circle cx="10.4" cy="10.4" r="1.15" fill="white" opacity="0.75" />
    </svg>
  )
}

function labelFor(cell: Cell, index: number, cols: number): string {
  const row = Math.floor(index / cols) + 1
  const column = (index % cols) + 1
  const place = `Row ${row} column ${column}`
  if (cell.state === 'flagged') return `${place}, flagged`
  if (cell.state === 'hidden') return `${place}, hidden`
  if (cell.mine) return cell.exploded ? `${place}, exploded mine` : `${place}, mine`
  return cell.n === 0 ? `${place}, clear` : `${place}, ${cell.n} mines nearby`
}

// Board cells are inherently small: the HIG's 44 pt target cannot coexist with
// an interactive grid on the cover (a 16x16 hard board gives each cell ~12 pt).
// Precise selection comes instead from tap-anywhere hit rect per cell, the
// roving arrow-key focus, F/G/R/N keys and long-press / right-click flagging -
// the controls around the board keep the full-size touch targets.
export function Board({
  game,
  size,
  focus,
  ended,
  wave,
  onTap,
  onFlag,
  onFocus,
  overlay
}: {
  game: Game
  size: number
  focus: number
  /** Game over: cells stay visible but stop accepting input. */
  ended: boolean
  /** Last reveal tap on this display: the flood ripples out from it. The
   * mirrored copy never receives it and simply settles its adopted board. */
  wave?: { index: number; stamp: number } | null
  onTap: (index: number) => void
  onFlag: (index: number) => void
  onFocus: (index: number) => void
  overlay?: ReactNode
}) {
  const pressTimer = useRef<number | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const suppressTap = useRef(false)
  // Recent long-presses also produce a contextmenu event on release; the stamp
  // tells that handler the flag already toggled so it does not toggle back.
  const longPressedAt = useRef(0)
  // Cells already drawn open; only cells opening since then earn a stagger.
  const seenOpen = useRef<Set<number>>(new Set())
  // The delay a cell was assigned at open time. It must outlive later renders:
  // storage echoes re-render this board before the flood finishes, and a
  // stripped delay would rush the stagger. Assigned once, kept until cleared.
  const delays = useRef(new Map<number, number>())
  // The flood breathes out one ring at a time: clear cells carry the wave
  // forward, numbered edge cells land one step past their neighbour.
  const depths = useMemo(() => {
    const map = new Map<number, number>()
    if (wave == null || game.cells[wave.index]?.state !== 'open') return map
    const queue: Array<[number, number]> = [[wave.index, 0]]
    map.set(wave.index, 0)
    while (queue.length > 0) {
      const [cellIndex, depth] = queue.shift()!
      for (const next of neighbors(cellIndex, game.cols, game.rows)) {
        if (map.has(next) || game.cells[next]?.state !== 'open') continue
        map.set(next, depth + 1)
        if (game.cells[next]?.n === 0) queue.push([next, depth + 1])
      }
    }
    return map
  }, [wave, game])
  // A fresh board holds no open cells; clear the seen set so the next game's
  // flood staggers again instead of skipping every cell.
  if (!game.cells.some((cell) => cell.state === 'open')) {
    seenOpen.current.clear()
    delays.current.clear()
  }
  // These mirror the well's `space.xs` padding and `space.xxs` grid gap; they
  // are runtime geometry, not styles, so the token literals are mirrored here.
  const pad = 4
  const gap = 2
  const digitPx = Math.max(8, Math.floor(((size - pad * 2 - gap * (game.cols - 1)) / game.cols) * 0.5))

  const disarm = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
    pressStart.current = null
  }

  return (
    <div
      role="grid"
      aria-label="Minefield"
      aria-rowcount={game.rows}
      aria-colcount={game.cols}
      {...stylex.props(styles.well, styles.fitBoard(size), styles.fitGrid(game.cols, game.rows))}
      onContextMenu={(event) => event.preventDefault()}
    >
      {game.cells.map((cell, index) => {
        const open = cell.state === 'open'
        const flagged = cell.state === 'flagged'
        const wrongFlag = game.status === 'lost' && flagged && !cell.mine
        const digit = open && !cell.mine && cell.n > 0 ? cell.n : 0
        const newlyOpen = open && !seenOpen.current.has(index)
        if (newlyOpen) {
          seenOpen.current.add(index)
          // Flood cells stagger by ring; mines revealed on a loss scatter in a
          // stable pseudo-random order; the exploded cell shows instantly.
          const stagger = cell.exploded
            ? 0
            : cell.mine
              ? Math.round((((index * 37) % 97) / 97) * 380)
              : Math.min((depths.get(index) ?? 0) * 34, 420)
          delays.current.set(index, stagger)
        }
        const delay = delays.current.get(index) ?? 0
        return (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: the grid never reorders
            key={`cell-${index}`}
            type="button"
            role="gridcell"
            aria-label={labelFor(cell, index, game.cols)}
            data-index={index}
            tabIndex={index === focus ? 0 : -1}
            onFocus={() => onFocus(index)}
            onClick={() => {
              if (suppressTap.current) {
                suppressTap.current = false
                return
              }
              onTap(index)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              if (Date.now() - longPressedAt.current < 600) return
              onFlag(index)
            }}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') return
              pressStart.current = { x: event.clientX, y: event.clientY }
              pressTimer.current = window.setTimeout(() => {
                suppressTap.current = true
                longPressedAt.current = Date.now()
                onFlag(index)
              }, LONG_PRESS_MS)
            }}
            onPointerUp={() => disarm()}
            onPointerCancel={() => disarm()}
            onPointerLeave={() => disarm()}
            onPointerMove={(event) => {
              const start = pressStart.current
              if (!start) return
              if (Math.abs(event.clientX - start.x) > DRAG_PX || Math.abs(event.clientY - start.y) > DRAG_PX) disarm()
            }}
            {...stylex.props(
              styles.cell,
              styles.fitDigits(digitPx),
              open ? styles.cellOpen : styles.cellHidden,
              flagged && styles.cellFlagged,
              delay > 0 && styles.waveDelay(delay),
              ended && styles.cellLocked,
              cell.exploded && styles.cellExploded,
              wrongFlag && styles.wrongFlag
            )}
          >
            {flagged ? (
              <span {...stylex.props(styles.flagInk, styles.flagOnCell)}>
                <FlagGlyph />
              </span>
            ) : open && cell.mine ? (
              <span {...stylex.props(cell.exploded ? styles.mineInkExploded : styles.mineInk)}>
                <MineGlyph />
              </span>
            ) : digit ? (
              <span {...stylex.props(styles.digit, NUMBER_STYLES[digit - 1]!)}>{digit}</span>
            ) : null}
          </button>
        )
      })}
      {overlay}
    </div>
  )
}
