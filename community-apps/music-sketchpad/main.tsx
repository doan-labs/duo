import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Sym, useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { createRoot } from 'react-dom/client'
import { type EngineStatus, engineClose, engineStart, engineStop, engineUnlock } from './audio.ts'
import {
  clampTempo,
  emptyGrid,
  freshLive,
  gridCount,
  gridOn,
  gridSet,
  type Live,
  type Loop,
  MAX_TEMPO,
  MIN_TEMPO,
  nextLoopName,
  parseEngine,
  parseLive,
  parseLoops,
  parseSketch,
  pause,
  play,
  reanchor,
  STEPS,
  stepAt,
  TRACKS,
  writeLive,
  writeSketch
} from './sequencer.ts'
import { styles } from './styles.ts'

// One document per display shares the session's `live` key. The raw string is
// the state itself, so both copies converge by writing, not by adopting.
const ME = crypto.randomUUID()

const PlayGlyph = () => (
  <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true" {...stylex.props(styles.playGlyph)}>
    <path
      d="M6.5 4.4v11.2c0 1 1.1 1.6 1.9 1.1l9-5.6c.7-.4.7-1.5 0-1.9l-9-5.6c-.8-.5-1.9.1-1.9 1.1z"
      fill="currentColor"
    />
  </svg>
)
const PauseGlyph = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <rect x="5" y="4" width="3.4" height="12" rx="1.2" fill="currentColor" />
    <rect x="11.6" y="4" width="3.4" height="12" rx="1.2" fill="currentColor" />
  </svg>
)

const labelStyles = [styles.labelKeys, styles.labelHat, styles.labelSnare, styles.labelKick]
const litStyles = [styles.litKeys, styles.litHat, styles.litSnare, styles.litKick]

function Sketchpad() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useSyncExternalStore(os.onView, () => os.view)
  const isOwner = useSyncExternalStore(os.onOwner, () => os.owner) !== null
  const [now, setNow] = useState(() => Date.now())

  const liveKv = useKV(os.session, 'live')
  const engineKv = useKV(os.session, 'engine')
  const sketchKv = useKV(os.storage, 'sketch')
  const loopsKv = useKV(os.storage, 'loops')

  const live = useMemo(() => parseLive(liveKv.value), [liveKv.value])
  const loops = useMemo(() => parseLoops(loopsKv.value), [loopsKv.value])
  const engine = useMemo(() => parseEngine(engineKv.value), [engineKv.value])
  const doc = live ?? freshLive(ME)

  const liveRef = useRef(live)
  liveRef.current = live
  const displayRef = useRef(view.display)
  displayRef.current = view.display
  const seeded = useRef(false)
  const paint = useRef<boolean | null>(null)
  // useKV hands back a fresh object each render, so effects that must survive
  // repaint ticks keep the latest writer in a ref and key on primitives only.
  const sketchSet = useRef(sketchKv.set)
  sketchSet.current = sketchKv.set

  // The first copy to find an empty session seeds it from durable storage; a
  // racing seed from the other display writes the same sketch and converges.
  useEffect(() => {
    if (seeded.current || liveKv.status !== 'ready' || liveKv.value !== null || sketchKv.status !== 'ready') return
    seeded.current = true
    liveKv.set(writeLive(freshLive(ME, parseSketch(sketchKv.value))))
  }, [liveKv.status, liveKv.value, liveKv.set, sketchKv.status, sketchKv.value])

  // Edits flow back into durable storage shortly after they settle. The
  // transport itself is session-only: a loop never resumes playback on launch.
  // Deps stay primitive so the playhead's repaint ticks cannot starve the write.
  useEffect(() => {
    if (!live || sketchKv.status !== 'ready') return
    const sketch = writeSketch({ grid: live.grid, mutes: live.mutes, tempo: live.tempo })
    if (sketch === (sketchKv.value ?? '')) return
    const id = setTimeout(() => void sketchSet.current(sketch), 500)
    return () => clearTimeout(id)
  }, [live, sketchKv.status, sketchKv.value])

  // Sound and scheduling belong to the owner copy alone. The mirror repaints
  // the playhead from the same anchors but starts nothing.
  const on = doc.transport.on
  useEffect(() => {
    if (!isOwner) return
    const report = (status: EngineStatus) => {
      void os.session.set('engine', JSON.stringify({ ...status, at: displayRef.current })).catch(() => {})
    }
    if (on) engineStart(() => liveRef.current, report)
    else engineStop(report)
    return () => engineStop(report)
  }, [isOwner, on])

  // Losing ownership (or this view dying) tears the whole engine down.
  useEffect(() => {
    if (isOwner) return () => engineClose()
  }, [isOwner])

  // The playhead ticker only repaints; position derives from the transport
  // anchor, so both displays land on the same step at the same moment.
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setNow(Date.now()), 45)
    return () => clearInterval(id)
  }, [on])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const edit = useCallback(
    (fn: (l: Live) => Live) => liveKv.set(writeLive(fn(liveRef.current ?? freshLive(ME)))),
    [liveKv]
  )

  const togglePlay = () => {
    // Inside the gesture: when this copy is the owner, this is the tap that
    // satisfies autoplay. On the mirror it is a no-op, and the owner starts
    // from the session state a moment later.
    engineUnlock()
    const at = Date.now()
    edit((l) => ({
      ...l,
      transport: l.transport.on ? pause(l.transport, l.tempo, at) : play(l.transport, l.tempo, at)
    }))
  }

  const setTempo = (bpm: number) =>
    edit((l) => ({ ...l, tempo: clampTempo(bpm), transport: reanchor(l.transport, l.tempo, Date.now()) }))

  const slideTempo = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setTempo(MIN_TEMPO + ratio * (MAX_TEMPO - MIN_TEMPO))
  }

  // Paint several pads in one stroke: the first pad decides lit or cleared,
  // and cells entered while the button is held take the same value.
  const padDown = (track: number, step: number) => {
    const next = !gridOn(doc.grid, track, step)
    paint.current = next
    edit((l) => ({ ...l, grid: gridSet(l.grid, track, step, next) }))
  }
  const padEnter = (e: ReactPointerEvent<HTMLButtonElement>, track: number, step: number) => {
    if (paint.current === null || !(e.buttons & 1)) return
    const value = paint.current
    if (gridOn(doc.grid, track, step) !== value) edit((l) => ({ ...l, grid: gridSet(l.grid, track, step, value) }))
  }

  const toggleMute = (track: number) => edit((l) => ({ ...l, mutes: l.mutes.map((m, i) => (i === track ? !m : m)) }))

  const clear = () => edit((l) => ({ ...l, grid: emptyGrid(), loop: undefined }))

  const saveLoop = () => {
    const current = liveRef.current
    if (!current) return
    const loop: Loop = {
      id: crypto.randomUUID(),
      name: nextLoopName(loops),
      tempo: current.tempo,
      grid: [...current.grid],
      savedAt: Date.now()
    }
    loopsKv.set(JSON.stringify([...loops, loop]))
    edit((l) => ({ ...l, loop: loop.id }))
  }

  const loadLoop = (loop: Loop) =>
    edit((l) => ({
      ...l,
      grid: [...loop.grid],
      tempo: loop.tempo,
      transport: reanchor(l.transport, l.tempo, Date.now()),
      loop: loop.id
    }))

  const dropLoop = (id: string) => loopsKv.set(JSON.stringify(loops.filter((loop) => loop.id !== id)))

  const pos = Math.floor(stepAt(doc.transport, doc.tempo, now)) % STEPS
  const lit = gridCount(doc.grid)
  const ratio = (doc.tempo - MIN_TEMPO) / (MAX_TEMPO - MIN_TEMPO)
  const loadedLoop = loops.find((loop) => loop.id === doc.loop)

  const status = engine?.blocked
    ? `Sound asleep - tap once on the ${engine.at === 'cover' ? 'cover' : 'inner'} display to wake it`
    : sketchKv.status === 'saving'
      ? 'Saving sketch...'
      : sketchKv.status === 'error'
        ? `Not saved: ${sketchKv.error}`
        : loadedLoop
          ? `${loadedLoop.name} on the pads`
          : lit === 0
            ? 'Tap pads to write a loop'
            : `${lit} pads lit`

  const transport = (
    <div {...stylex.props(styles.transport, wide && styles.transportWide)}>
      <button
        type="button"
        onClick={togglePlay}
        aria-label={on ? 'Pause loop' : 'Play loop'}
        aria-pressed={on}
        {...stylex.props(styles.playButton)}
      >
        {on ? <PauseGlyph /> : <PlayGlyph />}
      </button>
      <div {...stylex.props(styles.tempoBox)}>
        <div {...stylex.props(styles.tempoRow)}>
          <span {...stylex.props(styles.tempoLabel)}>TEMPO</span>
          <span {...stylex.props(styles.tempoValue)}>{doc.tempo} BPM</span>
        </div>
        <div
          role="slider"
          aria-label="Tempo"
          aria-valuemin={MIN_TEMPO}
          aria-valuemax={MAX_TEMPO}
          aria-valuenow={doc.tempo}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            slideTempo(e)
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) slideTempo(e)
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 8 : 1
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setTempo(doc.tempo - step)
            else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setTempo(doc.tempo + step)
            else return
            e.preventDefault()
          }}
          tabIndex={0}
          {...stylex.props(styles.slider)}
        >
          <div {...stylex.props(styles.sliderTrack)}>
            <div {...stylex.props(styles.sliderFill(ratio))} />
          </div>
          <div {...stylex.props(styles.sliderThumb(ratio))} />
        </div>
      </div>
      <div {...stylex.props(styles.utilRow)}>
        <button
          type="button"
          onClick={saveLoop}
          aria-label="Save loop"
          {...stylex.props(styles.utilButton, styles.utilAccent)}
        >
          <Sym name="plus" size={17} />
        </button>
        <button type="button" onClick={clear} aria-label="Clear all pads" {...stylex.props(styles.utilButton)}>
          <Sym name="trash" size={16} />
        </button>
      </div>
    </div>
  )

  // One pad cell for both grid orientations: cover paints tracks as columns,
  // wide as rows, so the beat marker sits on a different edge in each mode.
  const padCell = (track: number, step: number, variant: 'cover' | 'wide') => {
    const litPad = gridOn(doc.grid, track, step)
    return (
      <button
        key={`${TRACKS[track]!.id}-${step}`}
        type="button"
        aria-pressed={litPad}
        aria-label={`${TRACKS[track]!.name} step ${step + 1}`}
        onPointerDown={() => padDown(track, step)}
        onPointerEnter={(e) => padEnter(e, track, step)}
        {...stylex.props(
          styles.pad,
          variant === 'cover' && step % 4 === 0 && styles.padBeat,
          variant === 'wide' && step > 0 && step % 4 === 0 && styles.padCellBeat,
          litPad && styles.padLit,
          litPad && litStyles[track]!,
          !litPad && on && pos === step && styles.padPlay,
          litPad && on && pos === step && styles.padPlayLit,
          doc.mutes[track]! && styles.padMuted
        )}
      />
    )
  }

  // Cover: tracks run down as columns, steps as rows - big pads at 387 pt.
  const padsCover = (
    <section aria-label="Step sequencer" {...stylex.props(styles.pads)}>
      <div {...stylex.props(styles.padHeader)}>
        <span {...stylex.props(styles.padGutter)} />
        {TRACKS.map((track, t) => (
          <button
            key={track.id}
            type="button"
            onClick={() => toggleMute(t)}
            aria-pressed={doc.mutes[t]!}
            aria-label={`${track.name}${doc.mutes[t]! ? ' muted' : ''}`}
            {...stylex.props(styles.padLabelCol, labelStyles[t]!, doc.mutes[t]! && styles.padMuted)}
          >
            {track.name}
          </button>
        ))}
      </div>
      <div {...stylex.props(styles.padRows)}>
        {Array.from({ length: STEPS }, (_, s) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: sixteen fixed steps, never reordered
          <div key={`step-${s}`} {...stylex.props(styles.padRow, s > 0 && s % 4 === 0 && styles.padRowBeat)}>
            <span
              {...stylex.props(
                styles.padStep,
                s % 4 === 0 && styles.padStepBeat,
                on && pos === s && styles.padStepPlay
              )}
            >
              {s + 1}
            </span>
            {TRACKS.map((_, t) => padCell(t, s, 'cover'))}
          </div>
        ))}
      </div>
    </section>
  )

  // Unfolded: the classic rows-of-sixteen beside the control rail.
  const padsWide = (
    <section aria-label="Step sequencer" {...stylex.props(styles.pads)}>
      {TRACKS.map((track, t) => (
        <div key={track.id} {...stylex.props(styles.padRowWide)}>
          <button
            type="button"
            onClick={() => toggleMute(t)}
            aria-pressed={doc.mutes[t]!}
            aria-label={`${track.name}${doc.mutes[t]! ? ' muted' : ''}`}
            {...stylex.props(styles.padLabelRow, labelStyles[t]!, doc.mutes[t]! && styles.padMuted)}
          >
            {track.name}
          </button>
          <div {...stylex.props(styles.padCellsWide)}>
            {Array.from({ length: STEPS }, (_, s) => padCell(t, s, 'wide'))}
          </div>
        </div>
      ))}
    </section>
  )

  const loopsCover = (
    <div {...stylex.props(styles.loopsCover)}>
      {loops.map((loop) => (
        <div key={loop.id} {...stylex.props(styles.loopChip, doc.loop === loop.id && styles.loopChipOn)}>
          <button type="button" onClick={() => loadLoop(loop)} {...stylex.props(styles.loopLoad)}>
            {loop.name}
            <span {...stylex.props(styles.loopMeta)}>{loop.tempo}</span>
          </button>
          <button
            type="button"
            onClick={() => dropLoop(loop.id)}
            aria-label={`Delete ${loop.name}`}
            {...stylex.props(styles.loopDel)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )

  const loopsWide = (
    <>
      <div {...stylex.props(styles.loopsHead)}>
        <span {...stylex.props(styles.loopsTitle)}>LOOPS</span>
      </div>
      <div {...stylex.props(styles.loopsList)}>
        {loops.length === 0 && <p {...stylex.props(styles.loopEmpty)}>No saved loops yet. Sketch one, then +.</p>}
        {loops.map((loop) => (
          <div key={loop.id} {...stylex.props(styles.loopRow, doc.loop === loop.id && styles.loopRowOn)}>
            <button type="button" onClick={() => loadLoop(loop)} {...stylex.props(styles.loopRowLoad)}>
              <span {...stylex.props(styles.loopRowName)}>{loop.name}</span>
              <span {...stylex.props(styles.loopRowMeta)}>
                {loop.tempo} BPM · {gridCount(loop.grid)} pads
              </span>
            </button>
            <button
              type="button"
              onClick={() => dropLoop(loop.id)}
              aria-label={`Delete ${loop.name}`}
              {...stylex.props(styles.loopDel)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <main
      ref={rootRef}
      onPointerDown={engineUnlock}
      onPointerUp={() => (paint.current = null)}
      onPointerCancel={() => (paint.current = null)}
      data-app="music-sketchpad"
      {...stylex.props(dark, styles.root, wide && styles.rootWide)}
    >
      {wide ? (
        <>
          <div {...stylex.props(styles.rail)}>
            <header {...stylex.props(styles.header)}>
              <div {...stylex.props(styles.brand)}>
                <span {...stylex.props(styles.kicker)}>DUO LOOPS</span>
                <h1 {...stylex.props(styles.title)}>Music Sketchpad</h1>
              </div>
              <span {...stylex.props(styles.liveChip)}>
                <span {...stylex.props(styles.liveDot, on && styles.liveDotOn)} />
                {on ? 'PLAYING' : 'READY'}
              </span>
            </header>
            {transport}
            {loopsWide}
            <small
              role="status"
              {...stylex.props(styles.status, styles.statusRail, engine?.blocked && styles.statusWarn)}
            >
              {status}
            </small>
          </div>
          {padsWide}
        </>
      ) : (
        <>
          <header {...stylex.props(styles.header)}>
            <div {...stylex.props(styles.brand)}>
              <span {...stylex.props(styles.kicker)}>DUO LOOPS</span>
              <h1 {...stylex.props(styles.title, styles.titleCover)}>Sketchpad</h1>
            </div>
            <span {...stylex.props(styles.liveChip)}>
              <span {...stylex.props(styles.liveDot, on && styles.liveDotOn)} />
              {on ? 'PLAYING' : 'READY'}
            </span>
          </header>
          {transport}
          {padsCover}
          {loopsCover}
          <small role="status" {...stylex.props(styles.status, engine?.blocked && styles.statusWarn)}>
            {status}
          </small>
        </>
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Sketchpad />)
