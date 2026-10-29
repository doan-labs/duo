import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, Segmented, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { blip } from './audio.ts'
import { frame, type Ink, paint, toCourt } from './draw.ts'
import { aimFrom, hit, type Level, type Mode, newWorld, type Phase, type Score, type Side, step } from './game.ts'
import { styles } from './styles.ts'

type Match = { score: Score; mode: Mode; level: Level }
type Tally = { wins: number; losses: number }
type Hud = { phase: Phase; score: Score; server: Side; winner: Side | null }

const FRESH: Match = { score: { left: 0, right: 0 }, mode: 'bot', level: 'Normal' }
const MODES = ['vs Bot', '2 Players'] as const
const LEVELS = ['Easy', 'Normal', 'Hard'] as const
const KEY_ANGLE = 35

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return { ...fallback, ...(JSON.parse(raw) as T) }
  } catch {
    return fallback
  }
}

function Tennis() {
  const view = useDisplay()
  const [root, wide] = useWide<HTMLElement>()
  const matchKV = useKV(os.storage, 'match')
  const tallyKV = useKV(os.storage, 'tally')
  const match = useMemo(() => parse(matchKV.value, FRESH), [matchKV.value])
  const tally = useMemo(() => parse<Tally>(tallyKV.value, { wins: 0, losses: 0 }), [tallyKV.value])
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef(newWorld())
  const size = useRef({ width: 0, height: 0 })
  const ink = useRef<Ink>({ trace: '', screen: '' })
  const written = useRef<string | null>(null)
  const settings = useRef(match)
  const act = useRef({
    redraw: () => {},
    save: (_: Match) => {},
    snapshot: (): Hud => snapshot(),
    adopt: (_: Score) => {},
    tallyWin: (_: Side) => {}
  })
  const keyAim = useRef({ left: KEY_ANGLE, right: KEY_ANGLE })
  const [hud, setHud] = useState<Hud>(() => snapshot())
  // Only the display the person is looking at plays; the other copy draws the same match and starts nothing.
  const live = view.visible && view.active
  const cover = view.display === 'cover'
  const humans: Side[] = match.mode === 'duo' ? ['left', 'right'] : ['left']
  settings.current = match

  function snapshot(): Hud {
    const w = world.current
    return { phase: w.phase, score: { ...w.score }, server: w.server, winner: w.winner }
  }

  const redraw = () => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx || !size.current.width) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paint(ctx, world.current, size.current.width, size.current.height, ink.current, live ? humans : [])
  }

  const tallyWin = (winner: Side) => {
    const t = tally
    tallyKV.set(JSON.stringify(winner === 'left' ? { ...t, wins: t.wins + 1 } : { ...t, losses: t.losses + 1 }))
  }

  const adopt = (score: Score) => {
    world.current = newWorld(score)
    setHud(snapshot())
    redraw()
  }

  const save = (next: Match) => {
    const raw = JSON.stringify(next)
    written.current = raw
    matchKV.set(raw)
  }

  const restart = (next: Partial<Match> = {}) => {
    const fresh = { ...settings.current, ...next, score: { left: 0, right: 0 } }
    world.current = newWorld(fresh.score)
    save(fresh)
    setHud(snapshot())
    redraw()
  }

  // Stored score is the source of truth between displays: adopt it unless this copy wrote it.
  useEffect(() => {
    if (matchKV.status === 'hydrating' || matchKV.value === written.current) return
    act.current.adopt(parse(matchKV.value, FRESH).score)
  }, [matchKV.value, matchKV.status])

  // Folding away mid-rally puts the ball back in the server's hand at the stored score.
  useEffect(() => {
    if (!live) act.current.adopt(settings.current.score)
  }, [live])

  useEffect(() => {
    const host = stage.current!
    const el = canvas.current!
    const read = () => {
      const css = getComputedStyle(el)
      ink.current = { trace: css.color, screen: css.backgroundColor }
    }
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      size.current = { width, height }
      el.width = Math.round(width * dpr)
      el.height = Math.round(height * dpr)
      read()
      act.current.redraw()
    })
    ro.observe(host)
    requestAnimationFrame(() => os.ready())
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    act.current.redraw()
    if (!live) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = world.current
      const { mode, level } = settings.current
      const before = w.phase
      const cues = step(w, dt, mode, level)
      for (const cue of cues) blip(cue)
      const { save, snapshot, tallyWin, redraw } = act.current
      if (cues.includes('point') || cues.includes('over')) {
        save({ ...settings.current, score: { ...w.score } })
        if (w.winner && mode === 'bot') tallyWin(w.winner)
      }
      if (cues.length || before !== w.phase) setHud(snapshot())
      redraw()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live])

  const strike = (side: Side, angle: number, power?: number) => {
    const w = world.current
    const before = w.phase
    if (!hit(w, side, angle, power)) return
    blip('hit')
    if (before !== w.phase) setHud(snapshot())
  }

  act.current = { redraw, save, snapshot, adopt, tallyWin }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const duo = settings.current.mode === 'duo'
      const aim = keyAim.current
      const nudge = (side: Side, by: number) => {
        aim[side] = Math.min(75, Math.max(8, aim[side] + by))
      }
      const keys: Record<string, () => void> = {
        ' ': () => strike('left', aim.left),
        a: () => strike('left', aim.left),
        w: () => nudge('left', 5),
        s: () => nudge('left', -5),
        Enter: () => strike(duo ? 'right' : 'left', duo ? aim.right : aim.left),
        ArrowUp: () => nudge(duo ? 'right' : 'left', 5),
        ArrowDown: () => nudge(duo ? 'right' : 'left', -5)
      }
      const action = keys[e.key]
      if (!action || !live) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!live) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const side: Side = match.mode === 'duo' && px > rect.width / 2 ? 'right' : 'left'
    const at = toCourt(frame(rect.width, rect.height), px, py)
    const { angle, power } = aimFrom(world.current, at.x, at.y)
    strike(side, angle, power)
  }

  const names: Record<Side, string> =
    match.mode === 'duo' ? { left: 'Left', right: 'Right' } : { left: 'You', right: 'Bot' }
  const hint = hintFor(hud.phase, hud.server, match.mode, names, cover)

  return (
    <main
      ref={root}
      data-display={view.display}
      {...stylex.props(dark, styles.root, cover && styles.cover, wide && styles.wide)}
    >
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.titles)}>
          <span {...stylex.props(styles.kicker)}>Brookhaven, 1958</span>
          <h1 {...stylex.props(styles.title, wide && styles.titleWide)}>Tennis for Two</h1>
        </div>
        <output aria-label="Score" {...stylex.props(styles.board)}>
          {(['left', 'right'] as const).map((side) => (
            <span key={side} {...stylex.props(styles.player, side === 'right' && styles.playerRight)}>
              <span {...stylex.props(styles.name)}>
                {side === 'left' && hud.server === side && hud.phase !== 'over' && (
                  <span {...stylex.props(styles.dot)} />
                )}
                {names[side]}
                {side === 'right' && hud.server === side && hud.phase !== 'over' && (
                  <span {...stylex.props(styles.dot)} />
                )}
              </span>
              <span {...stylex.props(styles.points, wide && styles.pointsWide)}>{hud.score[side]}</span>
            </span>
          ))}
        </output>
      </header>

      <div
        ref={stage}
        role="application"
        aria-label="Court. Tap toward where the ball should go to strike it."
        onPointerDown={onPointer}
        {...stylex.props(styles.stage)}
      >
        <canvas ref={canvas} {...stylex.props(styles.canvas)} />
        {hud.phase === 'over' && hud.winner && (
          <section role="alertdialog" aria-label="Match over" {...stylex.props(styles.panel)}>
            <strong {...stylex.props(styles.panelTitle)}>
              {match.mode === 'duo' ? `${names[hud.winner]} wins` : hud.winner === 'left' ? 'You win' : 'Bot wins'}
            </strong>
            <span {...stylex.props(styles.panelScore)}>
              {hud.score.left} - {hud.score.right}
            </span>
            {match.mode === 'bot' && (
              <span {...stylex.props(styles.muted)}>
                Record {tally.wins} - {tally.losses}
              </span>
            )}
            <Button variant="filled" onClick={() => restart()} onPointerDown={(e) => e.stopPropagation()}>
              Play again
            </Button>
          </section>
        )}
      </div>

      <p role="status" {...stylex.props(styles.hint)}>
        {hint}
      </p>

      <footer {...stylex.props(styles.controls)}>
        <Segmented
          aria-label="Opponent"
          options={MODES}
          value={match.mode === 'duo' ? '2 Players' : 'vs Bot'}
          onChange={(v) => restart({ mode: v === '2 Players' ? 'duo' : 'bot' })}
        />
        {match.mode === 'bot' && (
          <Segmented
            aria-label="Bot level"
            options={LEVELS}
            value={match.level}
            onChange={(level) => save({ ...settings.current, level })}
          />
        )}
        <Button variant="plain" onClick={() => restart()} xstyle={styles.restart}>
          New match
        </Button>
      </footer>
    </main>
  )
}

function hintFor(phase: Phase, server: Side, mode: Mode, names: Record<Side, string>, cover: boolean): string {
  if (phase === 'over') return 'First to 11, win by 2'
  if (phase === 'point') return 'Point'
  const where = mode === 'duo' ? `${names[server]} half: ` : ''
  if (phase === 'serve') {
    if (mode === 'bot' && server === 'right') return 'Bot to serve'
    return `${where}${names[server]} to serve. Tap where the ball should land`
  }
  return cover ? 'Strike when the ring appears' : 'Strike when the ring appears. Tap higher to lob'
}

await os.connect()
createRoot(document.body).render(<Tennis />)
