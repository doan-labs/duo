import { os } from '@doan-labs/duo-sdk'
import { useDisplay } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Board, fitLayout } from './board.tsx'
import { type Direction, type GameStatus, hasMoves, move, newGame, type Tile } from './game.ts'
import { SLIDE_MS, styles } from './styles.ts'

function Game() {
  const view = useDisplay()
  // Why lazy init through a ref: StrictMode double-invokes the useState
  // initializer, which would burn the module id counter and desync ids.
  const initial = useRef<Tile[] | null>(null)
  if (!initial.current) initial.current = newGame()
  const [tiles, setTiles] = useState<Tile[]>(initial.current)
  const [absorbed, setAbsorbed] = useState<Tile[]>([])
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [status, setStatus] = useState<GameStatus>('playing')
  const [animationTick, setAnimationTick] = useState(0)
  const busy = useRef(false)
  const tick = useRef(0)
  const cover = view.display === 'cover'
  const fit = fitLayout(view, 48)

  // Why the lock: absorbed ghosts are cleared after the glide, so a second
  // move mid-flight would orphan them. Holding input for SLIDE_MS keeps the
  // absorbed tile under the merged tile until the pop covers the swap.
  // Why tick-guarded flag clearing: `fresh`/`merged` drive one-shot pop
  // animations, so they must reset to false after playing. A later move must
  // not clear them, otherwise the next pop never starts.
  useEffect(() => {
    if (animationTick === 0) return
    tick.current = animationTick
    const unlock = window.setTimeout(() => {
      busy.current = false
      setAbsorbed([])
    }, SLIDE_MS + 30)
    const settle = window.setTimeout(() => {
      if (tick.current !== animationTick) return
      setTiles((current) => {
        if (!current.some((tile) => tile.fresh || tile.merged || tile.nextValue !== undefined)) return current
        return current.map((tile) =>
          tile.fresh || tile.merged || tile.nextValue !== undefined
            ? { ...tile, value: tile.nextValue ?? tile.value, nextValue: undefined, fresh: false, merged: false }
            : tile
        )
      })
    }, SLIDE_MS + 260)
    return () => {
      window.clearTimeout(unlock)
      window.clearTimeout(settle)
      busy.current = false
    }
  }, [animationTick])

  const handleMove = useCallback(
    (direction: Direction) => {
      if (status === 'over' || busy.current) return
      const result = move(tiles, direction)
      if (!result.moved) {
        if (!hasMoves(tiles)) setStatus('over')
        return
      }
      busy.current = true
      const nextScore = score + result.score
      setTiles(result.tiles)
      setAbsorbed(result.absorbed)
      setAnimationTick((current) => current + 1)
      setScore(nextScore)
      setBest((current) => Math.max(current, nextScore))
      if (result.tiles.some((tile) => (tile.nextValue ?? tile.value) === 2048)) setStatus('won')
      else if (!hasMoves(result.tiles)) setStatus('over')
    },
    [tiles, score, status]
  )

  const reset = () => {
    busy.current = false
    setTiles(newGame())
    setAbsorbed([])
    setScore(0)
    setStatus('playing')
    setAnimationTick((current) => current + 1)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const directions: Record<string, Direction> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down'
      }
      const direction = directions[event.key]
      if (!direction) return
      event.preventDefault()
      handleMove(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleMove])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  return (
    <main {...stylex.props(styles.root, cover && styles.cover)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.title)}>2048</h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.score)}>
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>
          <div {...stylex.props(styles.score)}>
            <span>BEST</span>
            <strong>{best}</strong>
          </div>
        </div>
      </header>
      <p {...stylex.props(styles.hint)}>{cover ? 'Swipe or tap the arrows' : 'Swipe, tap, or use your keyboard'}</p>
      <Board tiles={tiles} absorbed={absorbed} size={fit.board} onMove={handleMove} />
      <div role="group" {...stylex.props(styles.controls, styles.fitControls(fit.control))} aria-label="Move controls">
        <button
          type="button"
          aria-label="Move up"
          onClick={() => handleMove('up')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control), styles.up)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move left"
          onClick={() => handleMove('left')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Move down"
          onClick={() => handleMove('down')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Move right"
          onClick={() => handleMove('right')}
          {...stylex.props(styles.arrow, styles.fitArrow(fit.control))}
        >
          →
        </button>
      </div>
      <button type="button" onClick={reset} {...stylex.props(styles.newGame)}>
        New game
      </button>
      {status !== 'playing' && (
        <section {...stylex.props(styles.message)}>
          <strong>{status === 'won' ? 'You made 2048!' : 'No more moves'}</strong>
          <button
            type="button"
            onClick={status === 'won' ? () => setStatus('playing') : reset}
            {...stylex.props(styles.continue)}
          >
            {status === 'won' ? 'Keep going' : 'Try again'}
          </button>
        </section>
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Game />)
