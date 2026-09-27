import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { fly, run } from '../../../apps/maps/camera.ts'
import {
  byId,
  type Category,
  HOME,
  MAX_Z,
  ME,
  MIN_LABEL_Z,
  MIN_Z,
  PLACES,
  project,
  TILE,
  tileUrl,
  unproject,
  type View
} from '../../../apps/maps/data.ts'
import { color } from '../tokens.stylex'
import { diagram, Stat } from './diagram'

// The diagram draws Maps' world at S svg units per display pixel, with the
// inner display as a window in the middle and the tile grid running past it.
const VW = 640
const VH = 400
const S = 0.5
const W = 700
const H = 460
const CX = VW / 2
const CY = VH / 2
const BOX = { x: CX - (W * S) / 2, y: CY - (H * S) / 2, w: W * S, h: H * S }

const TINT: Partial<Record<Category, string>> = {
  transit: color.accent,
  rail: color.accent,
  medical: color.red,
  food: color.orange,
  cafe: color.orange,
  shop: color.orange,
  park: color.green
}

const TRIPS = [
  { id: 'ben-thanh', label: 'Ben Thanh' },
  { id: 'saigon-station', label: 'the station' },
  { id: 'tan-dinh', label: 'Tan Dinh' },
  { id: 'opera', label: 'the Opera House' }
]

const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z))

/**
 * Maps' tile pipeline, run on the app's own maths (packages/apps/maps): the
 * Web Mercator projection, the tile URLs and the camera flight. Tiles come at
 * the nearest whole zoom and the fraction is a scale on each one, so a zoom
 * between levels never reloads. Only tiles that touch the display are asked
 * for; the rest of the grid is drawn as outlines.
 */
export function TileDiagram() {
  const [view, setView] = useState<View>(HOME)
  const [trip, setTrip] = useState(0)
  const svg = useRef<SVGSVGElement>(null)
  const grab = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const cancel = useRef<(() => void) | null>(null)
  useEffect(() => () => cancel.current?.(), [])

  const c = project(view.lat, view.lon, view.z)
  const tileZ = Math.round(view.z)
  const k = 2 ** (view.z - tileZ)
  const size = TILE * k
  const toSvg = (x: number, y: number) => ({ x: CX + (x - c.x) * S, y: CY + (y - c.y) * S })

  const tiles = []
  for (let tx = Math.floor((c.x - CX / S) / size); tx * size < c.x + CX / S; tx++)
    for (let ty = Math.floor((c.y - CY / S) / size); ty * size < c.y + CY / S; ty++) {
      const at = toSvg(tx * size, ty * size)
      const side = size * S
      const fetched = at.x < BOX.x + BOX.w && at.x + side > BOX.x && at.y < BOX.y + BOX.h && at.y + side > BOX.y
      tiles.push({ key: `${tileZ}/${tx}/${ty}`, url: tileUrl('explore', tx, ty, tileZ), ...at, side, fetched })
    }
  const fetched = tiles.filter((t) => t.fetched)

  const inBox = (p: { x: number; y: number }) =>
    p.x > BOX.x + 6 && p.x < BOX.x + BOX.w - 6 && p.y > BOX.y + 6 && p.y < BOX.y + BOX.h - 6
  const pins = PLACES.map((p) => {
    const w = project(p.lat, p.lon, view.z)
    return { p, at: toSvg(w.x, w.y) }
  }).filter((q) => inBox(q.at))
  const meW = project(ME.lat, ME.lon, view.z)
  const me = toSvg(meW.x, meW.y)

  const stop = () => {
    cancel.current?.()
    cancel.current = null
  }
  const down = (e: PointerEvent<SVGSVGElement>) => {
    stop()
    e.currentTarget.setPointerCapture(e.pointerId)
    grab.current = { px: e.clientX, py: e.clientY, x: c.x, y: c.y }
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const g = grab.current
    const r = svg.current?.getBoundingClientRect()
    if (!g || !r) return
    const unit = VW / r.width / S
    setView((v) => ({ ...unproject(g.x - (e.clientX - g.px) * unit, g.y - (e.clientY - g.py) * unit, v.z), z: v.z }))
  }
  const up = () => {
    grab.current = null
  }
  const go = () => {
    const to = byId(TRIPS[trip]?.id ?? '')
    if (!to) return
    stop()
    cancel.current = run(fly(view, { lat: to.lat, lon: to.lon, z: 16.4 }), setView)
    setTrip((t) => (t + 1) % TRIPS.length)
  }

  return (
    <figure {...stylex.props(diagram.figure)}>
      <svg
        ref={svg}
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-label={`Map tiles at zoom ${view.z.toFixed(2)}: ${fetched.length} fetched for the display`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        {...stylex.props(styles.svg, grab.current && styles.grabbing)}
      >
        <title>Maps tile grid</title>
        <defs>
          <clipPath id="tileDisplay">
            <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx="12" />
          </clipPath>
          <clipPath id="tileStage">
            <rect width={VW} height={VH} rx="10" />
          </clipPath>
        </defs>
        <g clipPath="url(#tileStage)">
          {/* A fetched tile arrives whole, so the part past the glass is drawn too, faintly. */}
          {fetched.map((t) => (
            <image
              key={t.key}
              href={t.url}
              x={t.x}
              y={t.y}
              width={t.side}
              height={t.side}
              {...stylex.props(styles.past)}
            />
          ))}
          {tiles.map((t) => (
            <g key={t.key}>
              <rect
                x={t.x}
                y={t.y}
                width={t.side}
                height={t.side}
                fill="none"
                stroke={t.fetched ? color.accent : color.borderStrong}
                strokeWidth={t.fetched ? 1.2 : 1}
                strokeDasharray={t.fetched ? undefined : '3 4'}
              />
            </g>
          ))}
          <g clipPath="url(#tileDisplay)">
            {fetched.map((t) => (
              <image key={t.key} href={t.url} x={t.x} y={t.y} width={t.side} height={t.side} />
            ))}
            {pins.map(({ p, at }) => (
              <g key={p.id}>
                <circle
                  cx={at.x}
                  cy={at.y}
                  r="4.5"
                  fill={TINT[p.category] ?? color.gray}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                {view.z >= MIN_LABEL_Z + 1 && (
                  <text x={at.x} y={at.y + 14} textAnchor="middle" {...stylex.props(styles.pin)}>
                    {p.name}
                  </text>
                )}
              </g>
            ))}
            {inBox(me) && <circle cx={me.x} cy={me.y} r="5.5" fill={color.accent} stroke="#fff" strokeWidth="2.5" />}
            {/* The hinge: the display is one sheet of glass, the fold runs down its middle. */}
            <line
              x1={CX}
              x2={CX}
              y1={BOX.y}
              y2={BOX.y + BOX.h}
              stroke="#000"
              strokeOpacity="0.12"
              strokeDasharray="2 5"
            />
          </g>
          <rect
            x={BOX.x - 4}
            y={BOX.y - 4}
            width={BOX.w + 8}
            height={BOX.h + 8}
            rx="16"
            fill="none"
            stroke={color.text}
            strokeWidth="7"
          />
          {/* Each fetched tile's address, z/x/y, the path the request asks for. */}
          {fetched.map((t) => (
            <text key={t.key} x={t.x + 5} y={t.y + 13} {...stylex.props(diagram.svgText, styles.label)}>
              {t.key}
            </text>
          ))}
        </g>
      </svg>
      <div {...stylex.props(diagram.controls)}>
        <button type="button" onClick={go} {...stylex.props(diagram.button)}>
          Fly to {TRIPS[trip]?.label}
        </button>
        <input
          type="range"
          min={MIN_Z}
          max={MAX_Z}
          step={0.01}
          value={view.z}
          onChange={(e) => {
            stop()
            setView((v) => ({ ...v, z: clampZ(Number(e.target.value)) }))
          }}
          aria-label="Zoom"
          {...stylex.props(diagram.range)}
        />
        <output {...stylex.props(diagram.deg, styles.zoom)}>z {view.z.toFixed(2)}</output>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="View zoom" value={view.z.toFixed(2)} />
        <Stat label="Tiles from" value={`Level ${tileZ}`} />
        <Stat label="Tile scale" value={`× ${k.toFixed(2)}`} />
        <Stat label="Tiles fetched" value={String(fetched.length)} />
      </dl>
      <figcaption {...stylex.props(diagram.caption)}>
        Drag the map, zoom it, or let it fly. The tiles under the glass are real OpenStreetMap tiles, requested by the
        same code Maps runs; the dashed squares are the ones it never asks for. Watch the level jump as the zoom crosses
        a half: that is the only moment new pixels are needed.
      </figcaption>
    </figure>
  )
}

const styles = stylex.create({
  svg: { display: 'block', width: '100%', height: 'auto', touchAction: 'none', cursor: 'grab', userSelect: 'none' },
  grabbing: { cursor: 'grabbing' },
  past: { opacity: 0.4, filter: 'grayscale(1)' },
  label: { fontSize: '9px', fill: color.accent, paintOrder: 'stroke', stroke: color.surface, strokeWidth: '3px' },
  pin: {
    fontFamily: 'inherit',
    fontSize: '8.5px',
    fontWeight: 600,
    fill: '#1c1c1e',
    paintOrder: 'stroke',
    stroke: '#fff',
    strokeWidth: '2.5px'
  },
  zoom: { width: '64px' }
})
