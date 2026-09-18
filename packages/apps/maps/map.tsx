import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import {
  GLYPH,
  MAX_Z,
  type MapKind,
  ME,
  MIN_LABEL_Z,
  MIN_Z,
  PLACES,
  type Place,
  project,
  scale,
  TILE,
  tileUrl,
  unproject,
  type View
} from './data.ts'
import { styles } from './styles.ts'

type Props = {
  view: View
  onView: (v: View) => void
  kind: MapKind
  onKind: (k: MapKind) => void
  sel: Place | null
  onSelect: (p: Place) => void
  /** What the panels cover on the left and at the bottom, so the view centres on the rest. */
  padX: number
  padY: number
}

export function MapCanvas({ view, onView, kind, onKind, sel, onSelect, padX, padY }: Props) {
  const surface = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState(false)
  const [menu, setMenu] = useState(false)
  const from = useRef<{ px: number; py: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setBox({ w: e!.contentRect.width, h: e!.contentRect.height }))
    ro.observe(surface.current!)
    return () => ro.disconnect()
  }, [])

  const centre = project(view.lat, view.lon, view.z)
  const left = centre.x - (box.w + padX) / 2
  const top = centre.y - (box.h - padY) / 2
  const span = 2 ** view.z
  const dark = kind === 'satellite'

  const tiles = []
  for (let tx = Math.floor(left / TILE); tx * TILE < left + box.w; tx++)
    for (let ty = Math.floor(top / TILE); ty * TILE < top + box.h; ty++) {
      if (ty < 0 || ty >= span) continue
      tiles.push({
        key: `${kind}/${view.z}/${tx}/${ty}`,
        url: tileUrl(kind, ((tx % span) + span) % span, ty, view.z),
        x: tx * TILE - left,
        y: ty * TILE - top
      })
    }

  const place = (lat: number, lon: number) => {
    const p = project(lat, lon, view.z)
    return { x: p.x - left, y: p.y - top }
  }
  const zoom = (by: number) => onView({ ...view, z: Math.min(MAX_Z, Math.max(MIN_Z, view.z + by)) })
  const stop = (e: PointerEvent) => e.stopPropagation()
  const me = place(ME.lat, ME.lon)
  const ruler = scale(view.lat, view.z)

  return (
    <div
      ref={surface}
      {...stylex.props(styles.surface, drag && styles.dragging)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        from.current = { px: e.clientX, py: e.clientY, x: centre.x, y: centre.y }
        setDrag(true)
        setMenu(false)
      }}
      onPointerMove={(e) => {
        const f = from.current
        if (!f) return
        onView({ ...view, ...unproject(f.x - (e.clientX - f.px), f.y - (e.clientY - f.py), view.z) })
      }}
      onPointerUp={() => {
        from.current = null
        setDrag(false)
      }}
      onPointerCancel={() => {
        from.current = null
        setDrag(false)
      }}
    >
      {tiles.map((t) => (
        <img key={t.key} src={t.url} alt="" draggable={false} {...stylex.props(styles.tile, styles.at(t.x, t.y))} />
      ))}

      {PLACES.map((p) => {
        const at = place(p.lat, p.lon)
        if (at.x < -40 || at.y < -40 || at.x > box.w + 40 || at.y > box.h + 40) return null
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
      })}
      <span {...stylex.props(styles.me, styles.at(me.x, me.y))} />

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
            onClick={() => onView({ ...view, ...ME })}
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

        {menu && (
          <div role="menu" {...stylex.props(styles.menu)} onPointerDown={stop}>
            {(['explore', 'satellite'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={kind === k}
                onClick={() => {
                  onKind(k)
                  setMenu(false)
                }}
                {...stylex.props(styles.menuItem)}
              >
                <Sym name={k === 'explore' ? 'map' : 'globe'} size={14} />
                {k === 'explore' ? 'Explore' : 'Satellite'}
                {kind === k && (
                  <i {...stylex.props(styles.check)}>
                    <Sym name="tick" size={12} />
                  </i>
                )}
              </button>
            ))}
          </div>
        )}

        <div {...stylex.props(styles.legal)}>{dark ? 'Imagery © Esri' : '© OpenStreetMap contributors'}</div>
      </div>
    </div>
  )
}
