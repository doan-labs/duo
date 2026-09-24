import { os } from '@doan-labs/duo-sdk'
import { useJSON, useKV } from '@doan-labs/duo-sdk/react.ts'
import { Num, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Board, fitLayout } from './board.tsx'
import {
  adoptTiles,
  type Direction,
  type GameStatus,
  hasMoves,
  move,
  newGame,
  type SavedTile,
  serializeTiles,
  type Tile
} from './game.ts'
import { SLIDE_MS, styles } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled board - adopting it unconditionally is what converges the two
// displays, including the race where both seed an empty session at once.
const ME = crypto.randomUUID()
type SavedGame = { by: string; tiles: SavedTile[]; score: number; status: GameStatus }

function Game() {
  const view = useDisplay()
  const [rootRef, wide] = useWide<HTMLElement>()
  // Why lazy init through a ref: StrictMode double-invokes the useState
  // initializer, which would burn the module id counter and desync ids.
  const initial = useRef<Tile[] | null>(null)
  if (!initial.current) initial.current = newGame()
  const [tiles, setTiles] = useState<Tile[]>(initial.current)
  const [absorbed, setAbsorbed] = useState<Tile[]>([])
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState<GameStatus>('playing')
  const [tick, setTick] = useState(0)
  const [gain, setGain] = useState(0)
  const [bump, setBump] = useState(0)
  const busy = useRef(false)
  const tickGuard = useRef(0)
  const seeded = useRef(false)
  const lastSeen = useRef<string | null>(null)
  const fit = fitLayout(view, wide)

  const saved = useKV(os.session, 'board')
  const best = useJSON<number>(os.storage, 'best', 0)

  const publish = useCallback(
    (list: Tile[], nextScore: number, nextStatus: GameStatus) => {
      saved.set(JSON.stringify({ by: ME, tiles: serializeTiles(list), score: nextScore, status: nextStatus }))
    },
    [saved]
  )

  // Why adopt on the session key: the fold carries the running game to the
  // other display. A write this copy did not make is the new settled board;
  // own writes are already on screen and are ignored. The raw string is the
  // guard: the effect body must not re-fire on every render of a remote value
  // already on screen, or the setTiles below loops forever.
  useEffect(() => {
    if (saved.status === 'hydrating' || saved.status === 'saving') return
    const raw = saved.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current) {
        seeded.current = true
        publish(initial.current!, 0, 'playing')
      }
      return
    }
    const next = JSON.parse(raw) as SavedGame
    if (next.by === ME) return
    busy.current = false
    setAbsorbed([])
    setTiles(adoptTiles(next.tiles))
    setScore(next.score)
    setStatus(next.status)
  }, [saved.value, saved.status, publish])

  // Why the lock: absorbed ghosts are cleared after the glide, so a second
  // move mid-flight would orphan them. Holding input for SLIDE_MS keeps the
  // absorbed tile under the merged tile until the pop covers the swap.
  // Why tick-guarded flag clearing: `fresh`/`merged`/`nextValue` drive one-shot
  // animations, so they must reset only after those animations finish.
  useEffect(() => {
    if (tick === 0) return
    tickGuard.current = tick
    const unlock = window.setTimeout(() => {
      busy.current = false
      setAbsorbed([])
    }, SLIDE_MS + 50)
    // The merged tile keeps its old face through the glide and flips to the new
    // value as it lands, while the pop is still growing.
    const flip = window.setTimeout(() => {
      if (tickGuard.current !== tick) return
      setTiles((current) =>
        current.map((tile) =>
          tile.nextValue !== undefined ? { ...tile, value: tile.nextValue, nextValue: undefined } : tile
        )
      )
    }, SLIDE_MS + 40)
    const settle = window.setTimeout(() => {
      if (tickGuard.current !== tick) return
      setTiles((current) => {
        if (!current.some((tile) => tile.fresh || tile.merged)) return current
        return current.map((tile) => (tile.fresh || tile.merged ? { ...tile, fresh: false, merged: false } : tile))
      })
      setGain(0)
    }, SLIDE_MS + 340)
    return () => {
      window.clearTimeout(unlock)
      window.clearTimeout(flip)
      window.clearTimeout(settle)
    }
  }, [tick])

  const handleMove = useCallback(
    (direction: Direction) => {
      if (status === 'over' || busy.current) return
      const result = move(tiles, direction)
      if (!result.moved) {
        setBump((current) => current + 1)
        if (!hasMoves(tiles)) {
          setStatus('over')
          publish(tiles, score, 'over')
        }
        return
      }
      busy.current = true
      const nextScore = score + result.score
      let nextStatus: GameStatus = status
      // Why `merged` and no prior big tile: the card celebrates creating 2048,
      // not a board that merely still has one after "Keep going".
      const made2048 =
        result.tiles.some((tile) => tile.merged && (tile.nextValue ?? tile.value) >= 2048) &&
        !tiles.some((tile) => tile.value >= 2048)
      if (made2048) nextStatus = 'won'
      // Why settled values: survivors still carry nextValue until the flip, so
      // the dead-board test must read the value they are about to become.
      else if (!hasMoves(result.tiles.map((tile) => ({ ...tile, value: tile.nextValue ?? tile.value }))))
        nextStatus = 'over'
      setTiles(result.tiles)
      setAbsorbed(result.absorbed)
      setTick((current) => current + 1)
      setScore(nextScore)
      if (result.score > 0) setGain(result.score)
      if (nextScore > best.value) best.set(nextScore)
      setStatus(nextStatus)
      publish(result.tiles, nextScore, nextStatus)
    },
    [tiles, score, status, best, publish]
  )

  const resetGame = () => {
    busy.current = false
    const fresh = newGame()
    setAbsorbed([])
    setTiles(fresh)
    setScore(0)
    setStatus('playing')
    setGain(0)
    setTick((current) => current + 1)
    publish(fresh, 0, 'playing')
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

  const overlay =
    status === 'playing' ? null : (
      <div {...stylex.props(styles.overlay)}>
        <div {...stylex.props(styles.overlayCard)}>
          <strong {...stylex.props(styles.overlayTitle)}>{status === 'won' ? '2048' : 'No more moves'}</strong>
          <span {...stylex.props(styles.overlaySub)}>
            {status === 'won' ? 'The golden tile is yours' : `Score ${score.toLocaleString()}`}
          </span>
          <div {...stylex.props(styles.overlayButtons)}>
            {status === 'won' && (
              <button
                type="button"
                onClick={() => {
                  setStatus('playing')
                  publish(tiles, score, 'playing')
                }}
                {...stylex.props(styles.overlayBtn)}
              >
                Keep going
              </button>
            )}
            <button
              type="button"
              onClick={resetGame}
              {...stylex.props(styles.overlayBtn, status === 'won' ? styles.overlayBtn : styles.overlayBtnGold)}
            >
              {status === 'won' ? 'New game' : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    )

  return (
    <main ref={rootRef} {...stylex.props(styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>DUO ARCADE</span>
          <h1 {...stylex.props(styles.logo, !wide && styles.logoCover)}>
            20<span {...stylex.props(styles.logoTile)}>48</span>
          </h1>
        </div>
        <div {...stylex.props(styles.scores)}>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel)}>SCORE</span>
            <strong {...stylex.props(styles.chipValue)}>
              <Num value={score} />
            </strong>
            {gain > 0 && (
              <span key={tick} {...stylex.props(styles.gainWrap)}>
                <i {...stylex.props(styles.gain)}>+{gain}</i>
              </span>
            )}
          </div>
          <div {...stylex.props(styles.chip)}>
            <span {...stylex.props(styles.chipLabel)}>BEST</span>
            <strong {...stylex.props(styles.chipValue)}>
              <Num value={Math.max(best.value, score)} />
            </strong>
          </div>
        </div>
      </header>
      <section {...stylex.props(styles.stage, !wide && styles.stageCover)}>
        <Board tiles={tiles} absorbed={absorbed} size={fit.board} bump={bump} overlay={overlay} onMove={handleMove} />
        <div {...stylex.props(styles.rail, !wide && styles.railCover)}>
          <div role="group" {...stylex.props(styles.tray)} aria-label="Move controls">
            <button
              type="button"
              aria-label="Move up"
              onClick={() => handleMove('up')}
              {...stylex.props(styles.key, styles.keyUp)}
            >
              <Sym name="up" size={15} />
            </button>
            <button
              type="button"
              aria-label="Move left"
              onClick={() => handleMove('left')}
              {...stylex.props(styles.key)}
            >
              <Sym name="back" size={15} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              onClick={() => handleMove('down')}
              {...stylex.props(styles.key)}
            >
              <Sym name="down" size={15} />
            </button>
            <button
              type="button"
              aria-label="Move right"
              onClick={() => handleMove('right')}
              {...stylex.props(styles.key)}
            >
              <Sym name="forward" size={15} />
            </button>
          </div>
          <div {...stylex.props(styles.railActions)}>
            <button type="button" onClick={resetGame} {...stylex.props(styles.newGame)}>
              <Sym name="reload" size={13} />
              New game
            </button>
            <p {...stylex.props(styles.hint, !wide && styles.hintCover)}>
              {wide ? 'Swipe the board, tap the pad, or use WASD / arrow keys' : 'Swipe the board or tap the pad'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Game />)
