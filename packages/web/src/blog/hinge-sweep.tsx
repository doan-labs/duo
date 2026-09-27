import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'react'
import { color, ease, font } from '../tokens.stylex'
import { keyed, useAutoplay } from './autoplay'
import { diagram } from './diagram'

// A side view on a protractor: the hinge, the fixed half lying left of it,
// the moving half turning from closed (0) to flat (180), one tick per degree.
const HX = 320
const HY = 250
const R = 206
const L = 186
const MOCK_S = 4
const LOOP_S = 12

type Mode = 'mock' | 'duo'

const at = (d: number, r: number) => {
  const a = (d * Math.PI) / 180
  return { x: HX - r * Math.cos(a), y: HY - r * Math.sin(a) }
}

/**
 * The problem in one picture. A mockup is two frames, closed and flat, and it
 * snaps between them. Duo draws the fold at every angle between, and each
 * tick lights as the hinge passes it. Plays both in turn until touched.
 */
export function HingeSweep() {
  const [deg, setDeg] = useState(0)
  const [mode, setMode] = useState<Mode>('mock')
  const [count, setCount] = useState(2)
  const seen = useRef(new Uint8Array(181))
  const last = useRef(0)

  const reset = (m: Mode) => {
    seen.current = new Uint8Array(181)
    seen.current[0] = 1
    seen.current[180] = 1
    setCount(2)
    setMode(m)
  }
  // Every whole degree between the last pose and this one, so a fast sweep leaves no gaps.
  const pass = (to: number) => {
    const a = Math.round(Math.min(last.current, to))
    const b = Math.round(Math.max(last.current, to))
    let n = 0
    for (let d = a; d <= b; d++)
      if (!seen.current[d]) {
        seen.current[d] = 1
        n++
      }
    last.current = to
    if (n) setCount((c) => c + n)
    setDeg(to)
  }

  const auto = useAutoplay<HTMLDivElement>((t) => {
    const x = t % LOOP_S
    if (x < MOCK_S) {
      if (mode !== 'mock') reset('mock')
      const d = x < MOCK_S / 2 ? 0 : 180
      last.current = d
      setDeg(d)
    } else {
      if (mode !== 'duo') {
        reset('duo')
        last.current = 180
      }
      pass(
        keyed(x - MOCK_S, [
          [0, 180],
          [4, 0],
          [8, 180]
        ])
      )
    }
  })

  const tip = at(deg, L)
  const inner = at(deg, L - 4)
  const duo = mode === 'duo'

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={auto.ref}>
        <svg viewBox="0 0 640 300" role="img" aria-label={`Hinge at ${Math.round(deg)} degrees, ${count} angles drawn`}>
          <title>Every angle, not two</title>
          {Array.from({ length: 181 }, (_, d) => {
            const big = d % 10 === 0
            const p0 = at(d, R)
            const p1 = at(d, R + (big ? 14 : 7))
            const end = d === 0 || d === 180
            return (
              <line
                // biome-ignore lint/suspicious/noArrayIndexKey: a tick is its degree.
                key={d}
                x1={p0.x}
                y1={p0.y}
                x2={p1.x}
                y2={p1.y}
                {...stylex.props(styles.tick, seen.current[d] === 1 && (end ? styles.tickEnd : styles.tickOn))}
              />
            )
          })}
          {[30, 60, 90, 120, 150].map((d) => {
            const p = at(d, R + 28)
            return (
              <text key={d} x={p.x} y={p.y + 4} textAnchor="middle" {...stylex.props(diagram.svgText, styles.small)}>
                {d}°
              </text>
            )
          })}
          {/* The two frames a mockup has. */}
          <text x={at(0, R).x} y={HY + 26} textAnchor="middle" {...stylex.props(styles.end)}>
            0° closed
          </text>
          <text x={at(180, R).x} y={HY + 26} textAnchor="middle" {...stylex.props(styles.end)}>
            180° flat
          </text>
          {/* The sweep so far, as a soft wedge under the moving half. */}
          <path
            d={`M${HX} ${HY} L${at(0, 60).x} ${at(0, 60).y} A60 60 0 0 1 ${at(deg, 60).x} ${at(deg, 60).y} Z`}
            {...stylex.props(styles.wedge, duo && styles.wedgeOn)}
          />
          <line x1={HX} y1={HY} x2={HX - L} y2={HY} {...stylex.props(styles.half)} />
          <line x1={HX} y1={HY} x2={tip.x} y2={tip.y} {...stylex.props(styles.half, styles.moving)} />
          {/* The inner display, on the face that opens toward you. */}
          <line x1={HX} y1={HY - 4} x2={HX - L + 4} y2={HY - 4} {...stylex.props(styles.glass)} />
          <line
            x1={at(deg, 4).x + Math.sin((deg * Math.PI) / 180) * -4}
            y1={at(deg, 4).y + Math.cos((deg * Math.PI) / 180) * 4}
            x2={inner.x - Math.sin((deg * Math.PI) / 180) * 4}
            y2={inner.y + Math.cos((deg * Math.PI) / 180) * 4}
            {...stylex.props(styles.glass)}
          />
          <circle cx={HX} cy={HY} r="6" {...stylex.props(styles.hinge)} />

          <text x="20" y="54" {...stylex.props(styles.count, duo ? styles.countDuo : styles.countMock)}>
            {count}
          </text>
          <text x="22" y="76" {...stylex.props(diagram.svgText)}>
            {count === 1 ? 'angle' : 'angles'} drawn
          </text>
          <text
            x="620"
            y="30"
            textAnchor="end"
            {...stylex.props(styles.mode, duo ? styles.countDuo : styles.countMock)}
          >
            {duo ? 'Duo' : 'a mockup'}
          </text>
          <text x="620" y="50" textAnchor="end" {...stylex.props(diagram.svgText)}>
            {Math.round(deg)}°
          </text>
        </svg>
      </div>
      <div {...stylex.props(diagram.controls)}>
        <button
          type="button"
          onClick={() => {
            auto.stop()
            if (mode !== 'mock') reset('mock')
            const d = deg < 90 ? 180 : 0
            last.current = d
            setDeg(d)
          }}
          {...stylex.props(diagram.button, duo && styles.off)}
        >
          Mockup
        </button>
        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={Math.round(deg)}
          onChange={(e) => {
            auto.stop()
            if (mode !== 'duo') {
              reset('duo')
              last.current = deg
            }
            pass(Number(e.target.value))
          }}
          aria-label="Hinge angle"
          {...stylex.props(diagram.range)}
        />
        <output {...stylex.props(diagram.deg)}>{Math.round(deg)}°</output>
      </div>
    </figure>
  )
}

const styles = stylex.create({
  tick: {
    stroke: color.border,
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    transitionProperty: 'stroke',
    transitionDuration: '0.4s'
  },
  tickOn: { stroke: color.accent },
  tickEnd: { stroke: color.orange, strokeWidth: 2.5 },
  small: { fontSize: '10.5px' },
  end: { fontFamily: font.mono, fontSize: '11px', fill: color.orange },
  wedge: { fill: color.accentSoft, opacity: 0, transitionProperty: 'opacity', transitionDuration: '0.4s' },
  wedgeOn: { opacity: 1 },
  half: { stroke: color.text, strokeWidth: 8, strokeLinecap: 'round' },
  moving: { transitionProperty: 'none' },
  glass: { stroke: color.accent, strokeWidth: 2, strokeLinecap: 'round' },
  hinge: { fill: color.surface, stroke: color.text, strokeWidth: 2 },
  count: {
    fontFamily: font.display,
    fontSize: '44px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
    transitionProperty: 'fill',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  countMock: { fill: color.orange },
  countDuo: { fill: color.accent },
  mode: { fontFamily: font.sans, fontSize: '15px', fontWeight: 600 },
  off: { backgroundColor: { default: color.well, ':hover': color.border }, color: color.text }
})
