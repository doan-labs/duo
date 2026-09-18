// Apple Maps: a sidebar of saved places and recents beside a live tile map,
// with the selected place's card floating between them. Folded, the same two
// panels stack into one sheet over the map. Nothing routes; the card's walking
// time is part of the place, not a direction.

import type { Os } from '@doan-labs/duo-sdk'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { HOME, type MapKind, type Place, RECENT, type View } from './data.ts'
import { MapCanvas } from './map.tsx'
import { PlaceCard } from './place.tsx'
import { Sidebar } from './sidebar.tsx'
import { ASIDE, CARD, SHEET, styles } from './styles.ts'

export const Maps = (_: { os: Os }) => {
  const root = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>(HOME)
  const [kind, setKind] = useState<MapKind>('explore')
  const [sel, setSel] = useState<Place | null>(null)
  const [aside, setAside] = useState(true)
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<[string, string][]>(RECENT)

  // The box decides, not the display: a split half of the inner panel is as
  // narrow as the cover, and gets the folded sheet rather than the sidebar.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setBox({ w: e!.contentRect.width, h: e!.contentRect.height }))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])

  const wide = box.w > 600
  const padX = wide ? (aside ? ASIDE : 44) + (sel ? CARD : 0) : 0
  const padY = wide ? 0 : Math.round(box.h * SHEET)
  const pick = (p: Place) => {
    setSel(p)
    setView((v) => ({ lat: p.lat, lon: p.lon, z: Math.max(v.z, 16) }))
    setRecents((r) => [[p.id, p.address[0]!] as [string, string], ...r.filter(([id]) => id !== p.id)].slice(0, 4))
  }
  const sidebar = (
    <Sidebar
      sel={sel}
      onSelect={pick}
      query={query}
      onQuery={setQuery}
      recents={recents}
      onClear={() => setRecents([])}
      sheet={!wide}
      onCollapse={() => setAside(false)}
    />
  )
  return (
    <div ref={root} {...stylex.props(styles.root)}>
      <MapCanvas
        view={view}
        onView={setView}
        kind={kind}
        onKind={setKind}
        sel={sel}
        onSelect={pick}
        padX={padX}
        padY={padY}
      />
      {wide ? (
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
              <PlaceCard place={sel} onClose={() => setSel(null)} />
            </section>
          )}
        </>
      ) : (
        <section {...stylex.props(styles.sheet)}>
          <span {...stylex.props(styles.grab)} />
          {sel ? <PlaceCard key={sel.id} place={sel} onClose={() => setSel(null)} /> : sidebar}
        </section>
      )}
    </div>
  )
}
