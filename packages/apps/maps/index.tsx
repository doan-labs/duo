// Apple Maps: live search, real routing and a working blue dot under the same
// furniture as before. Photon answers the search field and the dropped pins,
// FOSSGIS's OSRM mirrors drive/bike/walk the routes, and the browser's own
// geolocation stands in for GPS when it grants it. Every camera jump flies;
// the cover display's folded layout keeps it all in a bottom sheet.

import type { Os } from '@doan-labs/duo-sdk'
import { useWide } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fly, run } from './camera.ts'
import { fit, HOME, type MapKind, ME, type Place, project, RECENT, type Recent, unproject, type View } from './data.ts'
import { Directions } from './directions.tsx'
import { type Route, reverse, routes, search, type TravelMode } from './live.ts'
import { MapCanvas } from './map.tsx'
import { type Estimate, PlaceCard } from './place.tsx'
import { Sidebar } from './sidebar.tsx'
import { ASIDE, CARD, SHEET, styles } from './styles.ts'

type Dir = { to: Place; mode: TravelMode; routes: Route[] | null; active: number; error: boolean }

export const Maps = ({ os }: { os: Os }) => {
  const [root, wide] = useWide<HTMLDivElement>()
  // The folded-away copy draws but starts nothing - no search, no routes, no GPS.
  const live = !os.mirror
  const box = useRef({ w: 0, h: 0 })
  const [view, setView] = useState<View>(HOME)
  const viewRef = useRef(view)
  viewRef.current = view
  const [kind, setKind] = useState<MapKind>('explore')
  const [sel, setSel] = useState<Place | null>(null)
  const [aside, setAside] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [recents, setRecents] = useState<Recent[]>(RECENT)
  const [me, setMe] = useState<{ lat: number; lon: number; label?: string }>(ME)
  const meRef = useRef(me)
  meRef.current = me
  const [dir, setDir] = useState<Dir | null>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  // Whatever rAF is moving the camera - flight or the pan's leftover speed - lives here.
  const motion = useRef<(() => void) | null>(null)
  const cache = useRef(new Map<string, Route[]>())

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => (box.current = { w: e!.contentRect.width, h: e!.contentRect.height }))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [root])

  const flyTo = useCallback((to: View) => {
    motion.current?.()
    motion.current = run(fly(viewRef.current, to), setView, () => (motion.current = null))
  }, [])
  const interrupt = () => {
    motion.current?.()
    motion.current = null
  }
  const coast = (vx: number, vy: number) => {
    interrupt()
    let v = { x: vx, y: vy }
    let last = performance.now()
    let raf = 0
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = Math.exp(-3 * dt)
      v = { x: v.x * k, y: v.y * k }
      const cur = viewRef.current
      const c = project(cur.lat, cur.lon, cur.z)
      setView({ ...cur, ...unproject(c.x - v.x * dt, c.y - v.y * dt, cur.z) })
      if (Math.hypot(v.x, v.y) > 20) raf = requestAnimationFrame(step)
      else motion.current = null
    }
    raf = requestAnimationFrame(step)
    motion.current = () => cancelAnimationFrame(raf)
  }

  // The search field asks Photon after a pause; local catalogue rows lead anyway.
  useEffect(() => {
    const q = query.trim()
    if (!q || !live) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      search(q, viewRef.current, ctl.signal)
        .then((rs) => {
          setResults(rs)
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 240)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [query, live])

  // A place card asks for its drive time up front, so Directions opens loaded.
  useEffect(() => {
    setEstimate(null)
    if (!sel || dir || !live) return
    const ctl = new AbortController()
    const at = me
    routes('drive', at, sel, ctl.signal)
      .then((rs) => {
        if (!rs[0]) return
        cache.current.set(`drive|${at.lat.toFixed(4)},${at.lon.toFixed(4)}|${sel.id}`, rs)
        setEstimate({ duration: rs[0].duration, distance: rs[0].distance })
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [sel, dir, me, live])

  const padX = wide ? (dir ? ASIDE : (aside ? ASIDE : 44) + (sel ? CARD : 0)) : 0
  const padYFrac = wide ? 0 : SHEET

  const fitRoute = useCallback(
    (r: Route) => {
      const { w, h } = box.current
      if (!w || !h) return
      flyTo(fit(r.pts, w, h, wide ? ASIDE : 0, wide ? 0 : h * SHEET))
    },
    [wide, flyTo]
  )

  // Fetch the routes whenever the directions panel wants them.
  useEffect(() => {
    if (!dir || dir.routes !== null || !live) return
    const at = meRef.current
    const key = `${dir.mode}|${at.lat.toFixed(4)},${at.lon.toFixed(4)}|${dir.to.id}`
    const hit = cache.current.get(key)
    if (hit) {
      setDir((d) => (d ? { ...d, routes: hit } : d))
      fitRoute(hit[0]!)
      return
    }
    const ctl = new AbortController()
    routes(dir.mode, at, dir.to, ctl.signal)
      .then((rs) => {
        cache.current.set(key, rs)
        setDir((d) => (d && d.to.id === dir.to.id && d.mode === dir.mode ? { ...d, routes: rs, error: !rs.length } : d))
        if (rs[0]) fitRoute(rs[0])
      })
      .catch(() => setDir((d) => (d ? { ...d, error: true } : d)))
    return () => ctl.abort()
  }, [dir, live, fitRoute])

  const remember = (p: Place) =>
    setRecents((r) =>
      [
        { p, note: [p.address[0], p.address[1]].filter(Boolean).join(', ') || p.kind },
        ...r.filter(({ p: x }) => x.id !== p.id)
      ].slice(0, 4)
    )

  const pick = (p: Place) => {
    setSel(p)
    remember(p)
    if (dir) {
      // Mid-route, another pin is just the new destination.
      setDir({ to: p, mode: dir.mode, routes: null, active: 0, error: false })
      return
    }
    flyTo({ lat: p.lat, lon: p.lon, z: Math.max(viewRef.current.z, 16) })
  }

  const go = (p: Place) => {
    setAside(true)
    setSel(p)
    setDir({ to: p, mode: dir?.mode ?? 'drive', routes: null, active: 0, error: false })
  }

  const locate = () => {
    if (!live || !('geolocation' in navigator)) {
      flyTo({ ...viewRef.current, ...ME })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        setMe({ lat, lon })
        flyTo({ lat, lon, z: Math.max(viewRef.current.z, 15.5) })
        reverse(lat, lon)
          .then(
            (p) => p && setMe((m) => (m.lat === lat && m.lon === lon ? { ...m, label: p.address[0] ?? p.name } : m))
          )
          .catch(() => {})
      },
      () => flyTo({ ...viewRef.current, ...ME }),
      { timeout: 9000, maximumAge: 60000 }
    )
  }

  const dropPin = (lat: number, lon: number) => {
    const p: Place = {
      id: `pin-${lat.toFixed(5)}:${lon.toFixed(5)}`,
      name: 'Dropped Pin',
      kind: 'Address',
      category: 'address',
      lat,
      lon,
      address: []
    }
    setSel(p)
    if (dir) setDir({ ...dir, to: p, routes: null, active: 0, error: false })
    if (!live) return
    reverse(lat, lon)
      .then((found) => {
        if (!found) return
        const named = { ...found, id: p.id, name: found.address[0] ?? found.name }
        setSel((s) => (s?.id === p.id ? named : s))
        setDir((d) => (d && d.to.id === p.id ? { ...d, to: named } : d))
        remember(named)
      })
      .catch(() => remember(p))
  }

  const panel = dir ? (
    <Directions
      to={dir.to}
      origin={me.label ?? 'My Location'}
      mode={dir.mode}
      onMode={(m) => setDir({ ...dir, mode: m, routes: null, active: 0, error: false })}
      routes={dir.routes}
      active={dir.active}
      onPick={(i) => setDir({ ...dir, active: i })}
      error={dir.error}
      onEnd={() => setDir(null)}
    />
  ) : null

  const sidebar = (
    <Sidebar
      sel={sel}
      onSelect={pick}
      query={query}
      onQuery={setQuery}
      results={results}
      searching={searching}
      recents={recents}
      onClear={() => setRecents([])}
      sheet={!wide}
      onCollapse={() => setAside(false)}
    />
  )

  const card = sel && (
    <PlaceCard place={sel} estimate={estimate} onDirections={() => go(sel)} onClose={() => setSel(null)} />
  )

  return (
    <div ref={root} {...stylex.props(styles.root)}>
      <MapCanvas
        view={view}
        onView={setView}
        flyTo={flyTo}
        kind={kind}
        onKind={setKind}
        sel={sel}
        onSelect={pick}
        results={results}
        me={me}
        routes={dir?.routes ?? null}
        active={dir?.active ?? 0}
        onRoute={(i) => dir && setDir({ ...dir, active: i })}
        pinless={!!dir}
        onInterrupt={interrupt}
        onCoast={coast}
        onLocate={locate}
        onDropPin={dropPin}
        padX={padX}
        padYFrac={padYFrac}
      />
      {wide ? (
        dir ? (
          <aside {...stylex.props(styles.aside)}>{panel}</aside>
        ) : (
          <>
            {aside ? (
              <aside {...stylex.props(styles.aside)}>{sidebar}</aside>
            ) : (
              <button
                type="button"
                aria-label="Show sidebar"
                onClick={() => setAside(true)}
                {...stylex.props(styles.control, styles.alone, styles.reveal)}
              >
                <Sym name="sidebar" size={15} />
              </button>
            )}
            {sel && (
              <section key={sel.id} aria-label={sel.name} {...stylex.props(styles.card)}>
                {card}
              </section>
            )}
          </>
        )
      ) : (
        <section {...stylex.props(styles.sheet)}>
          <span {...stylex.props(styles.grab)} />
          {dir ? panel : sel ? card : sidebar}
        </section>
      )}
    </div>
  )
}
