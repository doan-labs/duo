import { Menu } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import {
  GLYPH,
  MAX_Z,
  type MapKind,
  MIN_LABEL_Z,
  MIN_Z,
  PLACES,
  type Place,
  project,
  scale,
  TILE,
  tileUrl,
  unproject,
  type View,
  zoomAt
} from './data.ts'
import type { Route } from './live.ts'
import { styles } from './styles.ts'

type Props = {
  view: View
  onView: (v: View) => void
  /** Every smooth jump goes through the parent's fly; plain moves are instant. */
  flyTo: (v: View) => void
  kind: MapKind
  onKind: (k: MapKind) => void
  sel: Place | null
  onSelect: (p: Place) => void
  /** Pins while a query is up (local + Photon, already matched); null means no query and the catalogue stands in. */
  results: Place[] | null
  /** The blue dot - the device's real position when granted, else the seed point. */
  me: { lat: number; lon: number }
  /** The dot's pulse ring is an animation, so it follows the mirror's no-timer rule. */
  pulse: boolean
  /** Routes on the canvas, selected one on top; tapping a grey one picks it. */
  routes: Route[] | null
  active: number
  onRoute: (i: number) => void
  /** Directions is up: curated and result pins hide; only the destination stays. */
  pinless: boolean
  /** A pointer or wheel grabbed the camera - the parent cancels any flight. */
  onInterrupt: () => void
  /** Released with speed still on it - the parent coasts the camera along it. */
  onCoast: (vx: number, vy: number) => void
  onLocate: () => void
  /** Press-and-hold drops a pin; the parent reverse-geocodes it into a place. */
  onDropPin: (lat: number, lon: number) => void
  /** What the panels cover on the left, and the sheet's share of the height. */
  padX: number
  padYFrac: number
}

const clamp = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z))

export function MapCanvas({
  view,
  onView,
  flyTo,
  kind,
  onKind,
  sel,
  onSelect,
  results,
  me,
  pulse,
  routes,
  active,
  onRoute,
  onInterrupt,
  onCoast,
  onLocate,
  onDropPin,
  padX,
  padYFrac,
  pinless
}: Props) {
  const surface = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState(false)
  const [menu, setMenu] = useState(false)
  const from = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  // Last few pointer deltas, for the flick's take-off speed.
  const trail = useRef<{ t: number; x: number; y: number }[]>([])
  const hold = useRef<number | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setBox({ w: e!.contentRect.width, h: e!.contentRect.height }))
    ro.observe(surface.current!)
    return () => ro.disconnect()
  }, [])

  // A held press can outlive the component; don't let it drop a pin after close.
  useEffect(
    () => () => {
      if (hold.current !== null) clearTimeout(hold.current)
    },
    []
  )

  // React's wheel listener is passive; zoom must preventDefault, so it binds natively.
  useEffect(() => {
    const el = surface.current!
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onInterrupt()
      const r = el.getBoundingClientRect()
      const k = box.w / r.width
      onView(
        zoomAt(
          view,
          -e.deltaY * 0.004,
          (e.clientX - r.left) * k,
          (e.clientY - r.top) * k,
          box.w,
          box.h,
          padX,
          padYFrac * box.h
        )
      )
    }
    const dbl = (e: MouseEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const k = box.w / r.width
      flyTo(zoomAt(view, 1, (e.clientX - r.left) * k, (e.clientY - r.top) * k, box.w, box.h, padX, padYFrac * box.h))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('dblclick', dbl)
    }
  })

  const padY = Math.round(box.h * padYFrac)
  const centre = project(view.lat, view.lon, view.z)
  const left = centre.x - (box.w + padX) / 2
  const top = centre.y - (box.h - padY) / 2

  // Tiles render at the nearest whole zoom; the fractional part is a scale on
  // each tile, so wheel and fly zoom without a blurry reload between levels.
  const tileZ = Math.round(clamp(view.z))
  const zoomK = 2 ** (view.z - tileZ)
  const size = TILE * zoomK
  const span = 2 ** tileZ
  const dark = kind === 'satellite'

  const tiles = []
  for (let tx = Math.floor(left / size); tx * size < left + box.w; tx++)
    for (let ty = Math.floor(top / size); ty * size < top + box.h; ty++) {
      if (ty < 0 || ty >= span) continue
      tiles.push({
        key: `${kind}/${tileZ}/${tx}/${ty}`,
        url: tileUrl(kind, ((tx % span) + span) % span, ty, tileZ),
        x: tx * size - left,
        y: ty * size - top
      })
    }

  const place = (lat: number, lon: number) => {
    const p = project(lat, lon, view.z)
    return { x: p.x - left, y: p.y - top }
  }
  // Point-to-polyline distance, so a tap on a grey route picks it.
  const near = (px: number, py: number, r: Route) => {
    const pts = r.pts.map(([la, lo]) => place(la, lo))
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k]!
      const b = pts[k + 1]!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const l2 = dx * dx + dy * dy
      const t = l2 ? Math.min(1, Math.max(0, ((px - a.x) * dx + (py - a.y) * dy) / l2)) : 0
      if (Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)) < 10) return true
    }
    return false
  }
  // Steps stay fractional like the wheel's, so a plus from 15.7 lands on 16.7.
  const zoom = (by: number) => flyTo({ ...view, z: clamp(view.z + by) })
  const stop = (e: PointerEvent) => e.stopPropagation()
  const dot = place(me.lat, me.lon)
  const ruler = scale(view.lat, view.z)

  // A route covers the canvas; while it is up the loose pins bow out.
  const marks = pinless ? [] : (results ?? PLACES)
  const pin = (p: Place) => {
    const at = place(p.lat, p.lon)
    if (at.x < -60 || at.y < -60 || at.x > box.w + 60 || at.y > box.h + 60) return null
    const on = sel?.id === p.id
    return (
      <button
        // Selection remounts the pin, so the marker pops in rather than swelling in place.
        key={on ? `${p.id}!` : p.id}
        type="button"
        aria-label={p.name}
        aria-pressed={on}
        onPointerDown={stop}
        onClick={() => onSelect(p)}
        {...stylex.props(styles.pin, styles[p.category], on && styles.marker, styles.at(at.x, at.y))}
      >
        <Sym name={GLYPH[p.category]} size={on ? 20 : 12} />
        {(on || view.z >= MIN_LABEL_Z) && (
          <span {...stylex.props(styles.pinLabel, on && styles.markerLabel, dark && styles.onDark)}>{p.name}</span>
        )}
      </button>
    )
  }

  return (
    <div
      ref={surface}
      {...stylex.props(styles.surface, drag && styles.dragging)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        onInterrupt()
        from.current = { px: e.clientX, py: e.clientY, x: centre.x, y: centre.y }
        trail.current = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }]
        setDrag(true)
        setMenu(false)
        // Held still long enough, a press drops a pin rather than grabs the map.
        // Client px are the CSS3D display's scaled px; the world maths wants the
        // surface's own layout px, so every coordinate crosses `k` first.
        hold.current = window.setTimeout(() => {
          const r = surface.current!.getBoundingClientRect()
          const k = box.w / r.width
          const p = unproject(left + (e.clientX - r.left) * k, top + (e.clientY - r.top) * k, view.z)
          onDropPin(p.lat, p.lon)
        }, 600)
      }}
      onPointerMove={(e) => {
        const f = from.current
        if (!f) return
        if (hold.current !== null && Math.hypot(e.clientX - f.px, e.clientY - f.py) > 8) {
          clearTimeout(hold.current)
          hold.current = null
        }
        trail.current = [...trail.current.slice(-6), { t: e.timeStamp, x: e.clientX, y: e.clientY }]
        const k = box.w / surface.current!.getBoundingClientRect().width
        onView({ ...view, ...unproject(f.x - (e.clientX - f.px) * k, f.y - (e.clientY - f.py) * k, view.z) })
      }}
      onPointerUp={(e) => {
        from.current = null
        setDrag(false)
        if (hold.current !== null) {
          clearTimeout(hold.current)
          hold.current = null
        }
        const tr = trail.current
        // A tap near a grey line picks that way there instead, like Apple Maps.
        if (routes && tr.length && Math.hypot(e.clientX - tr[0]!.x, e.clientY - tr[0]!.y) < 5) {
          const r = surface.current!.getBoundingClientRect()
          const k = box.w / r.width
          const px = (e.clientX - r.left) * k
          const py = (e.clientY - r.top) * k
          for (let i = 0; i < routes.length; i++) {
            if (i !== active && near(px, py, routes[i]!)) {
              onRoute(i)
              trail.current = []
              return
            }
          }
        }
        if (tr.length > 2) {
          const dt = tr[tr.length - 1]!.t - tr[0]!.t
          const k = box.w / surface.current!.getBoundingClientRect().width
          if (dt > 0 && dt < 150)
            onCoast(
              ((tr[tr.length - 1]!.x - tr[0]!.x) / dt) * 1000 * k,
              ((tr[tr.length - 1]!.y - tr[0]!.y) / dt) * 1000 * k
            )
        }
        trail.current = []
      }}
      onPointerCancel={() => {
        from.current = null
        setDrag(false)
        trail.current = []
        if (hold.current !== null) {
          clearTimeout(hold.current)
          hold.current = null
        }
      }}
    >
      {tiles.map((t) => (
        <img
          key={t.key}
          src={t.url}
          alt=""
          draggable={false}
          {...stylex.props(styles.tile, styles.tileAt(t.x, t.y, size))}
        />
      ))}

      {routes && (
        <svg {...stylex.props(styles.route)} width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`}>
          <title>Route options</title>
          {routes.map((r, i) => {
            if (i === active) return null
            const pts = r.pts.map(([la, lo]) => place(la, lo))
            return (
              <polyline
                key={`${r.distance}-${r.duration}`}
                points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                fill="none"
                {...stylex.props(styles.routeOff)}
              />
            )
          })}
          {routes[active] && (
            <>
              <polyline
                points={routes[active]!.pts.map(([la, lo]) => {
                  const p = place(la, lo)
                  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
                }).join(' ')}
                fill="none"
                {...stylex.props(styles.routeCase)}
              />
              <polyline
                points={routes[active]!.pts.map(([la, lo]) => {
                  const p = place(la, lo)
                  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
                }).join(' ')}
                fill="none"
                {...stylex.props(styles.routeOn)}
              />
            </>
          )}
        </svg>
      )}

      {marks.map((p) => pin(p))}
      {pinless && sel && pin(sel)}

      {pulse && <span {...stylex.props(styles.mePulse, styles.at(dot.x, dot.y))} />}
      <span {...stylex.props(styles.me, styles.at(dot.x, dot.y))} />

      <div {...stylex.props(styles.chrome, styles.pad(padX, padY))}>
        <div {...stylex.props(styles.scale, dark && styles.onDark)}>
          <div {...stylex.props(styles.ticks, styles.bar(ruler.width))}>
            <span>0</span>
            <span>{ruler.mid}</span>
            <span>{ruler.full}</span>
          </div>
          <div {...stylex.props(styles.rule, styles.bar(ruler.width), dark && styles.ruleDark)} />
        </div>

        <div {...stylex.props(styles.controls)} onPointerDown={stop}>
          <button
            type="button"
            aria-label="Map type"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
            {...stylex.props(styles.control, styles.alone, menu && styles.on)}
          >
            <Sym name={dark ? 'globe' : 'map'} size={15} />
          </button>
          <button
            type="button"
            aria-label="Centre on my location"
            onClick={onLocate}
            {...stylex.props(styles.control, styles.alone)}
          >
            <Sym name="location" size={14} />
          </button>
          <div {...stylex.props(styles.stack)}>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={view.z >= MAX_Z}
              onClick={() => zoom(1)}
              {...stylex.props(styles.control)}
            >
              <Sym name="plus" size={13} />
            </button>
            <span {...stylex.props(styles.divider)} />
            <button
              type="button"
              aria-label="Zoom out"
              disabled={view.z <= MIN_Z}
              onClick={() => zoom(-1)}
              {...stylex.props(styles.control)}
            >
              <Sym name="minus" size={13} />
            </button>
          </div>
        </div>

        <Menu
          open={menu}
          onClose={() => setMenu(false)}
          onPointerDown={stop}
          size={12}
          xstyle={styles.menu}
          itemStyle={styles.menuItem}
          items={(['explore', 'satellite'] as const).map((k) => ({
            label: (
              <>
                <Sym name={k === 'explore' ? 'map' : 'globe'} size={14} />
                {k === 'explore' ? 'Explore' : 'Satellite'}
              </>
            ),
            checked: kind === k,
            onSelect: () => onKind(k)
          }))}
        />

        <div {...stylex.props(styles.legal)}>{dark ? 'Imagery © Esri' : '© OpenStreetMap contributors'}</div>
      </div>
    </div>
  )
}
