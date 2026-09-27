import * as stylex from '@stylexjs/stylex'
import { useInView } from 'motion/react'
import { useRef, useState } from 'react'
import { color, ease, font } from '../tokens.stylex'
import { useAutoplay } from './autoplay'
import { diagram, Stat, useNarrow } from './diagram'

type Trust = 'host' | 'trusted' | 'sandboxed'
type Layer = {
  name: string
  trust: Trust
  runs: string
  owner: string
  parts: readonly (readonly [label: string, note: string])[]
}

// Bottom to top, the way a press travels up and a draw call comes down
// (docs/architecture.md). The line between Runtime and App is the trust boundary.
const LAYERS: Layer[] = [
  {
    name: 'Window',
    trust: 'host',
    runs: 'Tauri 2 or a tab',
    owner: 'native.ts',
    parts: [
      ['WKWebView', 'frameless, clear'],
      ['native.ts', 'every Tauri check'],
      ['commands/', 'one file a feature'],
      ['Platform', 'OS code, one trait']
    ]
  },
  {
    name: 'Shell',
    trust: 'trusted',
    runs: 'Three.js',
    owner: 'main.ts',
    parts: [
      ['Scene', 'main.ts'],
      ['Fixed eye', 'shaders/'],
      ['The bake', 'screen.ts'],
      ['HUD', 'hud.tsx']
    ]
  },
  {
    name: 'OS × 2',
    trust: 'trusted',
    runs: 'React, one per display',
    owner: 'os.tsx',
    parts: [
      ['SpringBoard', 'springboard.tsx'],
      ['Home grid', 'grid.ts'],
      ['Control Center', 'toggles.ts'],
      ['Baked apps', 'need camera or mic']
    ]
  },
  {
    name: 'Runtime',
    trust: 'trusted',
    runs: 'the host side',
    owner: 'runtime/',
    parts: [
      ['Verifier', 'releases.ts'],
      ['Nonce', 'sandbox.tsx'],
      ['Port', 'bridge.ts'],
      ['IndexedDB', 'database.ts']
    ]
  },
  {
    name: 'App',
    trust: 'sandboxed',
    runs: 'an opaque iframe',
    owner: 'one HTML file',
    parts: [
      ['iframe', 'allow-scripts only'],
      ['origin null', 'parent is opaque'],
      ['One document', 'all bytes inline'],
      ['CSP', 'first in <head>']
    ]
  },
  {
    name: 'SDK + kit',
    trust: 'sandboxed',
    runs: 'inside the app',
    owner: '@doan-labs/duo-sdk',
    parts: [
      ['os.view', 'the hinge angle'],
      ['os.mirror', 'which copy runs'],
      ['os.device', 'buttons, sensors'],
      ['UI kit', 'HIG components']
    ]
  }
]

// The stack in svg units: rhombus plates, the lens beside them.
const CX = 190
const A = 128
const B = 40
const BOTTOM = 372
const GAP = 54
const SHUT = 8
const LENS = { x: 340, y: 24, w: 300, h: 350 }
/** On a phone the lens drops under the stack, so neither has to share the width. */
const LENS_UNDER = { x: 20, y: 404, w: 300, h: 290 }
/** The brackets' spine, left of the stack, and the port's line across the boundary. */
const BX = 34
const PX = CX + 70
const CHIP = { w: 134, h: 78, gap: 8 }

const plate = (y: number) => `${CX},${y - B} ${CX + A},${y} ${CX},${y + B} ${CX - A},${y}`
const side = (y: number) =>
  `${CX - A},${y} ${CX},${y + B} ${CX + A},${y} ${CX + A},${y + 7} ${CX},${y + B + 7} ${CX - A},${y + 7}`
const TRUST: Record<Trust, string> = { host: 'host', trusted: 'trusted', sandboxed: 'sandboxed' }

/**
 * Duo taken apart: the stack from the native window up to the SDK an app
 * calls, exploded as it scrolls in. The lens opens one layer to what is on it,
 * with the file that owns each piece. Everything under the red line is Duo's
 * code; everything above it is a stranger's, and never touches what is below.
 */
export function Layers() {
  const [pick, setPick] = useState(4)
  const narrow = useNarrow()
  const lens = narrow ? LENS_UNDER : LENS
  const svg = useRef<SVGSVGElement>(null)
  const seen = useInView(svg, { once: true, amount: 0.4 })
  const auto = useAutoplay<HTMLDivElement>((t) => setPick((Math.floor(t / 2.8) + 4) % LAYERS.length))
  const gap = seen ? GAP : SHUT
  const y = (i: number) => BOTTOM - B - i * gap
  const l = LAYERS[pick] as Layer
  const boundary = (y(3) + y(4)) / 2
  const choose = (i: number) => {
    auto.stop()
    setPick(i)
  }

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={auto.ref}>
        <svg
          ref={svg}
          viewBox={narrow ? '0 0 340 700' : '0 0 660 400'}
          role="img"
          aria-label={`Duo's layers, ${l.name} opened`}
        >
          <title>Duo, layer by layer</title>
          {LAYERS.map((layer, i) => {
            const on = i === pick
            const sandboxed = layer.trust === 'sandboxed'
            return (
              // biome-ignore lint/a11y/useSemanticElements: an svg plate cannot be a <button>.
              <g
                key={layer.name}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={layer.name}
                onClick={() => choose(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && choose(i)}
                {...stylex.props(styles.plate, styles.lift(`translateY(${y(i) - y(0)}px)`))}
              >
                <polygon points={side(y(0))} {...stylex.props(styles.side, sandboxed && styles.sideApp)} />
                <polygon
                  points={plate(y(0))}
                  {...stylex.props(styles.top, sandboxed && styles.topApp, on && styles.topOn)}
                />
                <text x={CX} y={y(0) + 4} textAnchor="middle" {...stylex.props(styles.name, on && styles.nameOn)}>
                  {layer.name}
                </text>
              </g>
            )
          })}
          {seen && (
            <g key="brackets" {...stylex.props(styles.fade)}>
              {/* Duo's code below the line, a stranger's above it. */}
              <path d={`M${BX + 6} ${y(0) + B} H${BX} V${boundary + 4} H${BX + 6}`} {...stylex.props(styles.bracket)} />
              <path
                d={`M${BX + 6} ${boundary - 4} H${BX} V${y(5) - B} H${BX + 6}`}
                {...stylex.props(styles.bracket, styles.bracketApp)}
              />
              <text
                x={BX - 8}
                y={(y(0) + B + boundary) / 2}
                textAnchor="middle"
                {...stylex.props(diagram.svgText, styles.vertical, styles.duo)}
              >
                Duo
              </text>
              <text
                x={BX - 8}
                y={(boundary + y(5) - B) / 2}
                textAnchor="middle"
                {...stylex.props(diagram.svgText, styles.vertical, styles.stranger)}
              >
                a stranger's app
              </text>
              <line x1={BX - 4} x2={BX + 12} y1={boundary} y2={boundary} {...stylex.props(styles.boundary)} />
              {/* The one way down: messages on a single port, App to Runtime and back. */}
              <line x1={PX} x2={PX} y1={y(4)} y2={y(3)} {...stylex.props(styles.port)} />
              <circle cx={PX} cy={y(4)} r="4" {...stylex.props(styles.packet)} />
              <text x={PX + 8} y={(y(3) + y(4)) / 2 + 4} {...stylex.props(diagram.svgText, styles.portText)}>
                one port
              </text>
            </g>
          )}
          {seen && !narrow && (
            <line
              key={`lead-${pick}`}
              x1={CX + A}
              y1={y(pick)}
              x2={LENS.x}
              y2={LENS.y + 34}
              {...stylex.props(styles.leader, styles.fade)}
            />
          )}
          <rect x={lens.x} y={lens.y} width={lens.w} height={lens.h} rx="16" {...stylex.props(styles.lens)} />
          <g key={pick}>
            <text x={lens.x + 16} y={lens.y + 38} {...stylex.props(styles.lensTitle)}>
              {l.name}
            </text>
            <text
              x={lens.x + lens.w - 16}
              y={lens.y + 38}
              textAnchor="end"
              {...stylex.props(
                styles.chipTrust,
                l.trust === 'sandboxed' ? styles.sandboxed : l.trust === 'host' ? styles.host : styles.trusted
              )}
            >
              {TRUST[l.trust]}
            </text>
            {l.parts.map(([label, note], i) => {
              const cx = lens.x + 12 + (i % 2) * (CHIP.w + CHIP.gap)
              const cy = lens.y + 62 + Math.floor(i / 2) * (CHIP.h + CHIP.gap)
              return (
                <g key={label} {...stylex.props(styles.chip, styles.wait(`${0.08 + i * 0.09}s`))}>
                  <rect x={cx} y={cy} width={CHIP.w} height={CHIP.h} rx="10" {...stylex.props(styles.chipBox)} />
                  <text x={cx + 12} y={cy + 30} {...stylex.props(styles.chipLabel)}>
                    {label}
                  </text>
                  <text x={cx + 12} y={cy + 52} {...stylex.props(diagram.svgText, styles.chipNote)}>
                    {note}
                  </text>
                </g>
              )
            })}
            <text x={lens.x + 16} y={lens.y + lens.h - 20} {...stylex.props(diagram.svgText, styles.fade)}>
              owner · {l.owner}
            </text>
          </g>
        </svg>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Layer" value={l.name} />
        <Stat label="Trust" value={l.trust === 'sandboxed' ? 'Sandboxed' : l.trust === 'host' ? 'Host' : 'Trusted'} />
        <Stat label="Runs as" value={l.runs} />
        <Stat label="Below the line" value={pick < 4 ? 'Yes' : 'No'} />
      </dl>
    </figure>
  )
}

const pop = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(0.96)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' }
})
const fade = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
// A message down to the host and its reply back up, on the one port: GAP, one layer apart.
const travel = stylex.keyframes({
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(54px)' }
})

const styles = stylex.create({
  plate: {
    cursor: 'pointer',
    outlineStyle: 'none',
    transitionProperty: 'transform',
    transitionDuration: '1.1s',
    transitionTimingFunction: ease.out
  },
  lift: (transform: string) => ({ transform }),
  top: {
    fill: color.well,
    stroke: color.borderStrong,
    strokeWidth: 1.2,
    transitionProperty: 'fill, stroke',
    transitionDuration: '0.3s'
  },
  topApp: { fill: color.accentSoft, stroke: color.accent },
  topOn: { fill: color.orangeBg, stroke: color.orange, strokeWidth: 2 },
  side: { fill: color.border },
  sideApp: { fill: color.accent, opacity: 0.45 },
  name: { fontFamily: font.sans, fontSize: '13px', fontWeight: 600, fill: color.text2, pointerEvents: 'none' },
  nameOn: { fill: color.text },
  boundary: { stroke: color.red, strokeWidth: 2 },
  bracket: { fill: 'none', stroke: color.green, strokeWidth: 1.5 },
  bracketApp: { stroke: color.accent },
  vertical: { transformBox: 'fill-box', transformOrigin: 'center', transform: 'rotate(-90deg)' },
  duo: { fill: color.green },
  stranger: { fill: color.accent },
  port: { stroke: color.accent, strokeWidth: 1.5, strokeDasharray: '2 3' },
  portText: { fill: color.accent, fontSize: '10.5px' },
  packet: {
    fill: color.accent,
    animationName: travel,
    animationDuration: '1.8s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite'
  },
  leader: { stroke: color.orange, strokeWidth: 1, strokeDasharray: '3 4' },
  lens: { fill: color.well, stroke: color.orange, strokeWidth: 1.5 },
  lensTitle: { fontFamily: font.display, fontSize: '20px', fontWeight: 600, fill: color.text },
  chipTrust: { fontFamily: font.mono, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' },
  host: { fill: color.text3 },
  trusted: { fill: color.green },
  sandboxed: { fill: color.accent },
  chip: {
    opacity: 0,
    transformBox: 'fill-box',
    transformOrigin: 'center',
    animationName: pop,
    animationDuration: '0.45s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  },
  wait: (delay: string) => ({ animationDelay: delay }),
  chipBox: { fill: color.surface, stroke: color.border, strokeWidth: 1 },
  chipLabel: { fontFamily: font.sans, fontSize: '14px', fontWeight: 600, fill: color.text },
  chipNote: { fontSize: '10px' },
  fade: {
    opacity: 0,
    animationName: fade,
    animationDuration: '0.5s',
    animationDelay: '0.5s',
    animationTimingFunction: ease.out,
    animationFillMode: 'forwards'
  }
})
