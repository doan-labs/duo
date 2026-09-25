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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fly, run } from './camera.ts'
import { fit, localMatches, PLACES, type Place, project, RECENT, samePlace, unproject, type View } from './data.ts'
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
  const [aside, setAside] = useState(true)

  const s = useShared()
  const { query, sel, dir, me, view, kind } = s
  const viewRef = useRef(view)
  viewRef.current = view
  const found = s.results
  const rec = s.routes
  const recents = s.recents ?? RECENT
  const q = query.trim()
  // Photon's bias follows the camera at city scale: cross a ~50km bucket and the
  // query re-asks, so results in another town aren't the old town's leftovers.
  const bucket = `${Math.round(view.lat / 0.5)},${Math.round(view.lon / 0.5)}`
  const wantKey = q ? `${q}|${bucket}` : ''
  // Hits only count while they belong to this query, so a stale pick can't slip in.
  const results = found?.key === wantKey ? found.list : []
  const searching = q !== '' && found?.key !== wantKey
  const searchFailed = found?.key === wantKey && found.failed
  // A live query narrows the pins to what matches it, locally and on Photon.
  const local = localMatches(q.toLowerCase())
  // A Photon namesake near a curated pin is the same place; far away it is not.
  const pool = q ? [...local, ...results.filter((r) => !local.some((l) => samePlace(l, r)))] : PLACES
  // The card can outlive its query - keep the selected pin drawn alongside.
  const marks = sel && !pool.some((m) => m.id === sel.id) ? [...pool, sel] : pool
  // Route keys and route requests normalize the origin the same way, so a GPS
  // fix inside an ~11m bucket neither refetches nor lies about where it started.
  const from = useMemo(() => ({ lat: +me.lat.toFixed(4), lon: +me.lon.toFixed(4) }), [me.lat, me.lon])
  const want = dir ? `${dir.mode}|${from.lat},${from.lon}|${dir.to.id}` : ''
  const routeList = rec.key === want ? rec.list : null
  const routeError = rec.key === want && rec.failed
  const estKey = sel ? `drive|${from.lat},${from.lon}|${sel.id}` : ''
  const estimate = estKey && s.estimate?.key === estKey ? s.estimate : null

  // Whatever rAF is moving the camera - flight or the pan's leftover speed - lives here.
  const motion = useRef<(() => void) | null>(null)
  // The request in flight, the route already fitted, and the card estimate
  // already attempted, so effects never ask twice.
  const fetching = useRef('')
  const fitted = useRef('')
  const estTried = useRef('')

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => (box.current = { w: e!.contentRect.width, h: e!.contentRect.height }))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [root])

  const setView = useCallback((to: View) => share.set({ view: to }), [])

  // Only the live copy animates: its frames land in the store and the mirror
  // draws them flat, so no timer ever runs on the folded-away display.
  const flyTo = useCallback(
    (to: View) => {
      motion.current?.()
      if (!live) {
        setView(to)
        motion.current = null
        return
      }
      motion.current = run(fly(viewRef.current, to), setView, () => (motion.current = null))
    },
    [live, setView]
  )
  const interrupt = () => {
    motion.current?.()
    motion.current = null
  }
  const coast = (vx: number, vy: number) => {
    interrupt()
    if (!live) return
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
  // A written answer - even a failure - matches the key and keeps this from
  // re-asking; a failed one gets one retry, not a loop.
  useEffect(() => {
    if (!q || !live || !wantKey || (found?.key === wantKey && (!found.failed || found.tries >= 2))) return
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      search(q, viewRef.current, ctl.signal)
        .then((list) => share.set({ results: { key: wantKey, q, list, failed: false, tries: 1 } }))
        .catch((e) => {
          if (!aborted(e))
            share.set({
              results: {
                key: wantKey,
                q,
                list: [],
                failed: true,
                tries: (found?.key === wantKey ? found.tries : 0) + 1
              }
            })
        })
    }, 240)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [q, live, found, wantKey])

  // Leaving the app mid-flight would let a stray rAF keep writing the store.
  useEffect(() => () => motion.current?.(), [])

  // A place card asks for its drive time up front; the same answer warms the
  // routes record, so Directions opens loaded.
  useEffect(() => {
    if (!sel || dir || !live || estTried.current === estKey) return
    if (share.get().estimate?.key === estKey) return
    estTried.current = estKey
    const ctl = new AbortController()
    routes('drive', from, sel, ctl.signal)
      .then((list) => {
        if (!list[0]) return
        share.set({
          estimate: { key: estKey, duration: list[0].duration, distance: list[0].distance },
          routes: { key: estKey, list, failed: false, tries: 1 }
        })
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [sel, dir, from, live, estKey])

  // Fetch the routes whenever the directions panel wants them. The record lands
  // keyed by the request; a failure gets one retry on its own and another when
  // the panel is reopened, but never a render-loop.
  useEffect(() => {
    if (!dir || !live || !want || (rec.key === want && (!rec.failed || rec.tries >= 2)) || fetching.current === want)
      return
    fetching.current = want
    const tries = rec.key === want ? rec.tries : 0
    let dead = false
    const ctl = new AbortController()
    routes(dir.mode, from, dir.to, ctl.signal)
      .then((list) => {
        if (!dead) share.set({ routes: { key: want, list, failed: false, tries: tries + 1 } })
      })
      .catch((e) => {
        if (!dead && !aborted(e)) share.set({ routes: { key: want, list: [], failed: true, tries: tries + 1 } })
      })
      .finally(() => {
        if (!dead) fetching.current = ''
      })
    return () => {
      dead = true
      ctl.abort()
      if (fetching.current === want) fetching.current = ''
    }
  }, [dir, live, want, from, rec])

  // The live copy flies the shared camera to a route once the record lands;
  // the mirror draws the same view without scheduling a frame of its own.
  useEffect(() => {
    if (!dir) {
      fitted.current = ''
      return
    }
    if (!live || rec.key !== want || !rec.list?.length || fitted.current === want) return
    fitted.current = want
    fitRoute(rec.list[0]!)
  }, [dir, live, want, rec, fitRoute])

  // The real position gets a quiet chance at being the origin, before "My
  // Location" means it; denied, the demo city's point stands in like before.
  useEffect(() => {
    if (!live || !('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => share.set({ me: { lat: pos.coords.latitude, lon: pos.coords.longitude } }),
      () => {},
      { timeout: 9000, maximumAge: 60000 }
    )
  }, [live])

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
  // pin laid from the folded display gets named too. The label is the dedupe:
  // still "Dropped Pin" and the lookup can retry.
  useEffect(() => {
    if (!live || sel?.name !== 'Dropped Pin' || !sel.id.startsWith('pin-')) return
    const m = /^pin-(-?\d+\.\d+):(-?\d+\.\d+)$/.exec(sel.id)
    if (!m) return
    const id = sel.id
    const ctl = new AbortController()
    reverse(Number(m[1]), Number(m[2]), ctl.signal)
      .then((p) => {
        if (!p) return
        const cur = share.get()
        if (cur.sel?.id !== id) return
        // The pin stays where it was dropped; only its name comes from Photon.
        const namedP = { ...p, id, lat: sel.lat, lon: sel.lon, name: p.address[0] ?? p.name }
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
      share.set({ dir: { to: p, mode: dir.mode, active: 0 }, scroll: 0 })
      return
    }
    flyTo({ lat: p.lat, lon: p.lon, z: Math.max(viewRef.current.z, 16) })
  }

  const go = (p: Place) => {
    setAside(true)
    const mode = dir?.mode ?? 'drive'
    // A failed record keeps its key, so reopening directions is the retry:
    // drop it and the fetch effect asks again.
    const retry =
      rec.key === `${mode}|${from.lat},${from.lon}|${p.id}` && rec.failed
        ? { routes: { key: '', list: null, failed: false, tries: 0 } }
        : {}
    share.set({ sel: p, dir: { to: p, mode, active: 0 }, scroll: 0, ...retry })
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
    share.set(dir ? { sel: p, dir: { ...dir, to: p, active: 0 }, scroll: 0 } : { sel: p })
  }

  const panel = dir ? (
    <Directions
      to={dir.to}
      origin={me.label ?? 'My Location'}
      mode={dir.mode}
      onMode={(mode) => share.set({ dir: { ...dir, mode, active: 0 }, scroll: 0 })}
      routes={routeList}
      active={dir.active}
      onPick={(i) => share.set({ dir: { ...dir, active: i }, scroll: 0 })}
      error={routeError}
      onEnd={() => share.set({ dir: null })}
      track={live}
      scroll={s.scroll}
      onScrolled={(n) => share.set({ scroll: n })}
    />
  ) : null

  const sidebar = (
    <Sidebar
      sel={sel}
      onSelect={pick}
      query={query}
      onQuery={(next) => {
        const t = next.trim()
        // Retyping a failed query is a resubmit; a fresh key reopens the fetch.
        const retry =
          t && t !== q && found?.key === `${t}|${bucket}` && found.failed
            ? { results: { key: '', q: t, list: [], failed: false, tries: 0 } }
            : {}
        share.set({ query: next, ...retry })
      }}
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
    <PlaceCard
      key={sel.id}
      place={sel}
      estimate={estimate}
      onDirections={() => go(sel)}
      onClose={() => share.set({ sel: null })}
    />
  )

  return (
    <div ref={root} {...stylex.props(styles.root)}>
      <MapCanvas
        view={view}
        onView={setView}
        flyTo={flyTo}
        kind={kind}
        onKind={(kind) => share.set({ kind })}
        sel={sel}
        onSelect={pick}
        results={marks}
        me={me}
        pulse={live}
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
