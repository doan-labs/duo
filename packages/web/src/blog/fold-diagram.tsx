import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { color } from '../tokens.stylex'
import { Stat, diagram as styles } from './diagram'

// Schematic side view in SVG units: the hinge, the eye straight above it, and
// half a panel either side. Not to scale; the real eye is 40 cm off a 7.9 cm half.
const HX = 320
const HY = 280
const EY = 44
const L = 210
const N = 36
const BANDS = [color.accent, color.green, color.orange, color.red]

const clamp = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The fixed-eye projection from packages/shell/shaders, drawn from the side.
 * Every sample on the moving half takes the colour the flat panel showed
 * where the ray from the eye through it lands, black past the panel's edge,
 * then darkens toward the free edge as the fold deepens. The readouts are the
 * shell's own thresholds: the cover's 30 degree fade and the 40 degree handover.
 */
export function FoldDiagram() {
  const [deg, setDeg] = useState(120)
  const [sweeping, setSweeping] = useState(false)
  const dir = useRef(-1)

  useEffect(() => {
    if (!sweeping) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      setDeg((d) => {
        const next = d + dir.current * 70 * dt
        if (next <= 0 || next >= 180) dir.current *= -1
        return Math.min(180, Math.max(0, next))
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [sweeping])

  const a = ((180 - deg) * Math.PI) / 180
  const d = { x: Math.cos(a), y: -Math.sin(a) }
  const motion = clamp((180 - deg) / 90)
  const at = (s: number) => ({ x: HX + s * L * d.x, y: HY + s * L * d.y })
  // Where the ray from the eye through a point meets the flat panel's plane, or null above the eye.
  const land = (p: { x: number; y: number }) => {
    if (p.y <= EY + 1) return null
    return HX + ((HY - EY) / (p.y - EY)) * (p.x - HX)
  }
  const band = (x: number | null) => {
    if (x === null || x < HX || x > HX + L) return null
    return BANDS[Math.min(BANDS.length - 1, Math.floor(((x - HX) / L) * BANDS.length))] ?? null
  }

  const segs = Array.from({ length: N }, (_, i) => {
    const s0 = i / N
    const s1 = (i + 1) / N
    const p0 = at(s0)
    const p1 = at(s1)
    const fill = band(land(at((s0 + s1) / 2)))
    const shade = motion * ((s0 + s1) / 2) ** 1.35 * 0.85
    return { p0, p1, fill, shade, key: i }
  })
  const rays = [0.3, 0.6, 0.9].map((s) => ({ s, p: at(s), x: land(at(s)) }))
  const n = { x: -d.y, y: d.x }
  const cover = clamp((180 - deg) / 30)
  const lead = deg < 40 ? 'Cover' : 'Inner'

  return (
    <figure {...stylex.props(styles.figure)}>
      <svg viewBox="0 0 640 330" role="img" aria-label={`Side view of the fold at ${Math.round(deg)} degrees`}>
        <title>Fixed-eye projection at {Math.round(deg)}°</title>
        {/* The flat panel the texture was baked for, as a ghost where the moving half used to lie. */}
        {BANDS.map((c, i) => (
          <line
            key={c}
            x1={HX + (i * L) / BANDS.length}
            x2={HX + ((i + 1) * L) / BANDS.length}
            y1={HY + 16}
            y2={HY + 16}
            stroke={c}
            strokeWidth="4"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
          />
        ))}
        <text x={HX + L / 2} y={HY + 38} textAnchor="middle" {...stylex.props(styles.svgText)}>
          what the flat panel showed
        </text>
        {/* The fixed half. */}
        <line x1={HX - L} y1={HY} x2={HX} y2={HY} stroke={color.text} strokeWidth="6" strokeLinecap="round" />
        <text x={HX - L / 2} y={HY + 26} textAnchor="middle" {...stylex.props(styles.svgText)}>
          fixed half
        </text>
        {rays.map((r) =>
          r.x === null ? null : (
            <g key={r.s}>
              <line x1={HX} y1={EY} x2={r.x} y2={HY + 16} stroke={color.text3} strokeWidth="1" strokeDasharray="3 5" />
              <circle cx={r.x} cy={HY + 16} r="3.5" fill={color.text3} />
            </g>
          )
        )}
        {/* The cover display, on the back of the moving half. */}
        <line
          x1={at(0.08).x + n.x * 9}
          y1={at(0.08).y + n.y * 9}
          x2={at(1).x + n.x * 9}
          y2={at(1).y + n.y * 9}
          stroke={color.text3}
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity={cover}
        />
        {segs.map((g) => (
          <g key={g.key}>
            <line
              x1={g.p0.x}
              y1={g.p0.y}
              x2={g.p1.x}
              y2={g.p1.y}
              stroke={g.fill ?? '#000'}
              strokeWidth="6"
              strokeLinecap="butt"
            />
            <line
              x1={g.p0.x}
              y1={g.p0.y}
              x2={g.p1.x}
              y2={g.p1.y}
              stroke="#000"
              strokeWidth="6"
              strokeOpacity={g.shade}
            />
          </g>
        ))}
        {rays.map((r) => (
          <circle key={r.s} cx={r.p.x} cy={r.p.y} r="4" fill={color.bg} stroke={color.text} strokeWidth="1.5" />
        ))}
        <circle cx={HX} cy={HY} r="5" fill={color.text} />
        <g transform={`translate(${HX} ${EY})`}>
          <ellipse rx="15" ry="9" fill={color.surface} stroke={color.text} strokeWidth="1.5" />
          <circle r="4.5" fill={color.text} />
        </g>
        <text x={HX + 26} y={EY + 4} {...stylex.props(styles.svgText)}>
          the eye, fixed at z = 40 cm
        </text>
      </svg>
      <div {...stylex.props(styles.controls)}>
        <button
          type="button"
          onClick={() => setSweeping((v) => !v)}
          aria-pressed={sweeping}
          {...stylex.props(styles.button)}
        >
          {sweeping ? 'Pause' : 'Fold it'}
        </button>
        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={Math.round(deg)}
          onChange={(e) => {
            setSweeping(false)
            setDeg(Number(e.target.value))
          }}
          aria-label="Hinge angle"
          {...stylex.props(styles.range)}
        />
        <output {...stylex.props(styles.deg)}>{Math.round(deg)}°</output>
      </div>
      <dl {...stylex.props(styles.stats)}>
        <Stat label="Lead display" value={lead} />
        <Stat label="Mirror copy" value={lead === 'Cover' ? 'Inner' : 'Cover'} />
        <Stat label="Cover glass" value={`${Math.round(cover * 100)}%`} />
        <Stat label="Inner surface" value={deg >= 179 ? 'Live DOM' : 'Projected'} />
      </dl>
    </figure>
  )
}
