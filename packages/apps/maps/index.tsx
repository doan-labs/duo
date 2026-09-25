// Apple Maps: live search, real routing and a working blue dot under the same
// furniture as before. Photon answers the search field and the dropped pins,
// FOSSGIS's OSRM mirrors drive/bike/walk the routes, and the browser's own
// geolocation stands in for GPS when it grants it. Every camera jump flies;
// the cover display's folded layout keeps it all in a bottom sheet. What the
// user is doing - the query, the pin, the route, where "you" are - lives in
// share.ts, so the fold hands the same map over whole (DESIGN.md §2).

import type { Os } from '@doan-labs/duo-sdk'
import { useWide } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fly, run } from './camera.ts'
import { fit, HOME, type MapKind, type Place, project, RECENT, unproject, type View } from './data.ts'
import { Directions } from './directions.tsx'
import { reverse, routes, search } from './live.ts'
import { MapCanvas } from './map.tsx'
import { PlaceCard } from './place.tsx'
import { share, useShared } from './share.ts'
import { Sidebar } from './sidebar.tsx'
import { ASIDE, CARD, SHEET, styles } from './styles.ts'

const aborted = (e: unknown) => e instanceof Error && e.name === 'AbortError'

const remember = (p: Place) =>
  share.set({
    recents: [
      { p, note: [p.address[0], p.address[1]].filter(Boolean).join(', ') || p.kind },
      ...(share.get().recents ?? RECENT).filter(({ p: x }) => x.id !== p.id)
    ].slice(0, 4)
  })

export const Maps = ({ os }: { os: Os }) => {
  const [root, wide] = useWide<HTMLDivElement>()
  // The folded-away copy draws but starts nothing - no search, no routes, no GPS.
  const live = !os.mirror
  const box = useRef({ w: 0, h: 0 })
  const [view, setView] = useState<View>(HOME)
  const viewRef = useRef(view)
  viewRef.current = view
  const [kind, setKind] = useState<MapKind>('explore')
  const [aside, setAside] = useState(true)

  const s = useShared()
  const { query, sel, dir, me } = s
  const found = s.results
  const rec = s.routes
  const recents = s.recents ?? RECENT
  const q = query.trim()
  // Hits only count while they belong to this query, so a stale pick can't slip in.
  const results = found?.q === q ? found.list : []
  const searching = q !== '' && found?.q !== q
  const searchFailed = found?.q === q && found.failed
  const want = dir ? `${dir.mode}|${me.lat.toFixed(4)},${me.lon.toFixed(4)}|${dir.to.id}` : ''
  const routeList = rec.key === want ? rec.list : null
  const routeError = rec.key === want && rec.failed
  const estKey = sel ? `drive|${me.lat.toFixed(4)},${me.lon.toFixed(4)}|${sel.id}` : ''
  const estimate = estKey && s.estimate?.key === estKey ? s.estimate : null

  // Whatever rAF is moving the camera - flight or the pan's leftover speed - lives here.
  const motion = useRef<(() => void) | null>(null)
  // The request in flight and the route already fitted, so effects never ask twice.
  const fetching = useRef('')
  const fitted = useRef('')
  const named = useRef(new Set<string>())

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

  const fitRoute = useCallback(
    (r: { pts: [number, number][] }) => {
      const { w, h } = box.current
      if (!w || !h) return
      flyTo(fit(r.pts, w, h, wide ? ASIDE : 0, wide ? 0 : h * SHEET))
    },
    [wide, flyTo]
  )

  // The search field asks Photon after a pause; local catalogue rows lead anyway.
  // A written answer - even a failure - matches `q` and keeps this from re-asking.
  useEffect(() => {
    if (!q || !live || found?.q === q) return
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      search(q, viewRef.current, ctl.signal)
        .then((list) => share.set({ results: { q, list, failed: false } }))
        .catch((e) => {
          if (!aborted(e)) share.set({ results: { q, list: [], failed: true } })
        })
    }, 240)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [q, live, found])

  // A place card asks for its drive time up front; the same answer warms the
  // routes record, so Directions opens loaded.
  useEffect(() => {
    if (!sel || dir || !live) return
    if (share.get().estimate?.key === estKey) return
    const ctl = new AbortController()
    routes('drive', me, sel, ctl.signal)
      .then((list) => {
        if (!list[0]) return
        share.set({
          estimate: { key: estKey, duration: list[0].duration, distance: list[0].distance },
          routes: { key: estKey, list, failed: false }
        })
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [sel, dir, me, live, estKey])

  // Fetch the routes whenever the directions panel wants them. The record lands
  // keyed by the request, so failure or an empty answer ends it - no refire.
  useEffect(() => {
    if (!dir || !live || !want || rec.key === want || fetching.current === want) return
    fetching.current = want
    let dead = false
    const ctl = new AbortController()
    routes(dir.mode, me, dir.to, ctl.signal)
      .then((list) => {
        if (!dead) share.set({ routes: { key: want, list, failed: false } })
      })
      .catch((e) => {
        if (!dead && !aborted(e)) share.set({ routes: { key: want, list: [], failed: true } })
      })
      .finally(() => {
        if (!dead) fetching.current = ''
      })
    return () => {
      dead = true
      ctl.abort()
      if (fetching.current === want) fetching.current = ''
    }
  }, [dir, live, want, me, rec])

  // Every copy flies its own camera to a route once the record lands.
  useEffect(() => {
    if (!dir) {
      fitted.current = ''
      return
    }
    if (rec.key !== want || !rec.list?.length || fitted.current === want) return
    fitted.current = want
    fitRoute(rec.list[0]!)
  }, [dir, want, rec, fitRoute])

  // The blue dot's street name, once the geocoder answers; runs wherever `me` lands.
  useEffect(() => {
    if (!live || me.label !== undefined) return
    const at = me
    const ctl = new AbortController()
    reverse(at.lat, at.lon, ctl.signal)
      .then((p) => {
        const cur = share.get().me
        if (p && cur.lat === at.lat && cur.lon === at.lon) share.set({ me: { ...at, label: p.address[0] ?? p.name } })
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [live, me])

  // A dropped pin starts unnamed; the live copy asks Photon what is there, so a
  // pin laid from the folded display gets named too.
  useEffect(() => {
    if (!live || !sel?.id.startsWith('pin-') || named.current.has(sel.id)) return
    const m = /^pin-(-?\d+\.\d+):(-?\d+\.\d+)$/.exec(sel.id)
    if (!m) return
    named.current.add(sel.id)
    const id = sel.id
    const ctl = new AbortController()
    reverse(Number(m[1]), Number(m[2]), ctl.signal)
      .then((p) => {
        if (!p) return
        const cur = share.get()
        if (cur.sel?.id !== id) return
        const namedP = { ...p, id, name: p.address[0] ?? p.name }
        share.set({ sel: namedP, dir: cur.dir?.to.id === id ? { ...cur.dir, to: namedP } : cur.dir })
        remember(namedP)
      })
      .catch(() => {
        if (share.get().sel?.id === id) remember(sel)
      })
    return () => ctl.abort()
  }, [live, sel])

  const padX = wide ? (dir ? ASIDE : (aside ? ASIDE : 44) + (sel ? CARD : 0)) : 0
  const padYFrac = wide ? 0 : SHEET

  const pick = (p: Place) => {
    share.set({ sel: p })
    remember(p)
    if (dir) {
      // Mid-route, another pin is just the new destination.
      share.set({ dir: { to: p, mode: dir.mode, active: 0 } })
      return
    }
    flyTo({ lat: p.lat, lon: p.lon, z: Math.max(viewRef.current.z, 16) })
  }

  const go = (p: Place) => {
    setAside(true)
    share.set({ sel: p, dir: { to: p, mode: dir?.mode ?? 'drive', active: 0 } })
  }

  const locate = () => {
    if (!live || !('geolocation' in navigator)) {
      flyTo({ ...viewRef.current, lat: me.lat, lon: me.lon })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        // Fresh coordinates re-key the route request, so an open panel refetches.
        share.set({ me: { lat, lon } })
        flyTo({ lat, lon, z: Math.max(viewRef.current.z, 15.5) })
      },
      () => flyTo({ ...viewRef.current, lat: me.lat, lon: me.lon }),
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
    share.set(dir ? { sel: p, dir: { ...dir, to: p, active: 0 } } : { sel: p })
  }

  const panel = dir ? (
    <Directions
      to={dir.to}
      origin={me.label ?? 'My Location'}
      mode={dir.mode}
      onMode={(mode) => share.set({ dir: { ...dir, mode, active: 0 } })}
      routes={routeList}
      active={dir.active}
      onPick={(i) => share.set({ dir: { ...dir, active: i } })}
      error={routeError}
      onEnd={() => share.set({ dir: null })}
    />
  ) : null

  const sidebar = (
    <Sidebar
      sel={sel}
      onSelect={pick}
      query={query}
      onQuery={(next) => share.set({ query: next })}
      results={results}
      searching={searching}
      failed={searchFailed}
      recents={recents}
      onClear={() => share.set({ recents: [] })}
      sheet={!wide}
      onCollapse={() => setAside(false)}
    />
  )

  const card = sel && (
    <PlaceCard place={sel} estimate={estimate} onDirections={() => go(sel)} onClose={() => share.set({ sel: null })} />
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
        routes={routeList}
        active={dir?.active ?? 0}
        onRoute={(i) => dir && share.set({ dir: { ...dir, active: i } })}
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
