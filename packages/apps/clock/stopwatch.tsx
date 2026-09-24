// Stopwatch: the digital face and the analog face share one stored state, so
// switching between them never loses the run. Laps are just the deltas.

import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { stopwatchElapsed, useNow, useStopwatch } from './store.ts'
import { styles } from './styles.ts'
import { stopwatchText } from './time.ts'

export const Stopwatch = ({ narrow, wide }: { narrow: boolean; wide: boolean }) => {
  const sw = useStopwatch()
  const mode = useKV(os.session, 'swMode')
  const analog = mode.value === 'analog'
  const running = sw.value.startedAt !== null
  const now = useNow(60, running)
  const elapsed = stopwatchElapsed(sw.value, now)

  const start = () => sw.set({ ...sw.value, startedAt: Date.now() })
  const stop = () => sw.set({ ...sw.value, startedAt: null, elapsed })
  const lap = () =>
    running && sw.set({ ...sw.value, laps: [elapsed - sw.value.lapAt, ...sw.value.laps], lapAt: elapsed })
  const reset = () => sw.set({ startedAt: null, elapsed: 0, lapAt: 0, laps: [] })

  const controls = (
    <div {...stylex.props(styles.swControls, wide && styles.swControlsWide)}>
      <button
        type="button"
        onClick={running ? lap : reset}
        disabled={!running && elapsed === 0}
        {...stylex.props(styles.swBtn, styles.swLap, shared.press)}
      >
        {running ? 'Lap' : 'Reset'}
      </button>
      <button
        type="button"
        onClick={running ? stop : start}
        {...stylex.props(styles.swBtn, running ? styles.swStop : styles.swStart, shared.press)}
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </div>
  )

  const face = analog ? (
    <Face elapsed={elapsed} lapAt={sw.value.lapAt} size={wide ? 300 : 224} />
  ) : (
    <>
      <div {...stylex.props(styles.swDigits)}>{stopwatchText(elapsed)}</div>
      {running && <div {...stylex.props(styles.swLapNow)}>Lap {sw.value.laps.length + 1}</div>}
    </>
  )

  const dots = (
    <div {...stylex.props(styles.dots)}>
      <button
        type="button"
        aria-label="Digital"
        onClick={() => mode.set('digital')}
        {...stylex.props(styles.dot, !analog && styles.dotOn)}
      />
      <button
        type="button"
        aria-label="Analog"
        onClick={() => mode.set('analog')}
        {...stylex.props(styles.dot, analog && styles.dotOn)}
      />
    </div>
  )

  const laps = <LapList sw={sw.value} elapsed={elapsed} running={running} />

  return (
    <>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.title)}>Stopwatch</div>
      </div>
      <div {...stylex.props(styles.body, narrow && styles.bodyNarrow)}>
        <div {...stylex.props(styles.swFace)}>
          {face}
          {controls}
          {dots}
          {laps}
        </div>
      </div>
    </>
  )
}

const LapList = ({
  sw,
  elapsed,
  running
}: {
  sw: { laps: number[]; lapAt: number }
  elapsed: number
  running: boolean
}) => {
  const best = sw.laps.length > 1 ? Math.min(...sw.laps) : -1
  const worst = sw.laps.length > 1 ? Math.max(...sw.laps) : -1
  const tone = (lap: number) => (lap === best ? styles.lapBest : lap === worst ? styles.lapWorst : undefined)
  return (
    <div {...stylex.props(styles.lapList)}>
      {running && sw.laps.length > 0 && (
        <div {...stylex.props(styles.lapRow)}>
          <span {...stylex.props(styles.lapNum)}>Lap {sw.laps.length + 1}</span>
          <span>{stopwatchText(elapsed - sw.lapAt)}</span>
        </div>
      )}
      {sw.laps.map((lap, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: laps are only ever prepended; the lap number is the stable key
        <div key={sw.laps.length - i} {...stylex.props(styles.lapRow, animations.row)}>
          <span {...stylex.props(styles.lapNum, tone(lap))}>Lap {sw.laps.length - i}</span>
          <span {...stylex.props(tone(lap))}>{stopwatchText(lap)}</span>
        </div>
      ))}
      {!sw.laps.length && <div {...stylex.props(styles.cap3, styles.empty)}>No laps yet</div>}
    </div>
  )
}

/** The analog face: a 60-second dial, the grey lap hand underneath, minute counter at top. */
const Face = ({ elapsed, lapAt, size }: { elapsed: number; lapAt: number; size: number }) => {
  const c = size / 2
  const r = c - 10
  const sec = (elapsed / 1000) % 60
  const min = (elapsed / 60000) % 60
  const lapSec = (lapAt / 1000) % 60
  const pt = (deg: number, len: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return { x: c + Math.cos(a) * len, y: c + Math.sin(a) * len }
  }
  const sEnd = pt(sec * 6, r - 24)
  const lEnd = pt(lapSec * 6, r - 24)
  const my = c - r * 0.42
  const mEnd = {
    x: c + Math.cos(((min * 6 - 90) * Math.PI) / 180) * 18,
    y: my + Math.sin(((min * 6 - 90) * Math.PI) / 180) * 18
  }
  return (
    <svg role="img" aria-label={`Stopwatch ${stopwatchText(elapsed)}`} width={size} height={size}>
      {Array.from({ length: 60 }, (_, i) => i * 6).map((deg) => {
        const major = deg % 30 === 0
        const a = pt(deg, r)
        const b = pt(deg, r - (major ? 14 : 8))
        return (
          <line
            key={deg}
            x1={b.x}
            y1={b.y}
            x2={a.x}
            y2={a.y}
            stroke={major ? appAppearance.clockTick : appAppearance.clockTickMinor}
            strokeWidth={major ? 2 : 1}
          />
        )
      })}
      {[0, 15, 30, 45].map((i) => {
        const n = pt(i * 6, r - 30)
        return (
          <text
            key={i}
            x={n.x}
            y={n.y}
            fill={colors.white}
            fontSize={14}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {i === 0 ? '60' : `${i}`}
          </text>
        )
      })}
      {/* minute counter at twelve o'clock */}
      <circle cx={c} cy={my} r={22} fill="none" stroke={appAppearance.clockTickMinor} strokeWidth={1} />
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
        const a = {
          x: c + Math.cos(((deg - 90) * Math.PI) / 180) * 20,
          y: my + Math.sin(((deg - 90) * Math.PI) / 180) * 20
        }
        const b = {
          x: c + Math.cos(((deg - 90) * Math.PI) / 180) * 16,
          y: my + Math.sin(((deg - 90) * Math.PI) / 180) * 16
        }
        return <line key={deg} x1={b.x} y1={b.y} x2={a.x} y2={a.y} stroke={appAppearance.clockTick} strokeWidth={1} />
      })}
      <line x1={c} y1={my} x2={mEnd.x} y2={mEnd.y} stroke={colors.blue} strokeWidth={1.5} />
      {/* lap hand under the running hand */}
      {lapAt > 0 && <line x1={c} y1={c} x2={lEnd.x} y2={lEnd.y} stroke={appAppearance.clockTick} strokeWidth={1.5} />}
      {/* counterbalanced second hand */}
      <line
        x1={pt(sec * 6 + 180, 16).x}
        y1={pt(sec * 6 + 180, 16).y}
        x2={sEnd.x}
        y2={sEnd.y}
        stroke={colors.blue}
        strokeWidth={1.5}
      />
      <circle cx={c} cy={c} r={4} fill={colors.blue} />
      <circle cx={c} cy={c} r={1.5} fill={colors.black} />
    </svg>
  )
}
