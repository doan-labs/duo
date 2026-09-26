// The real backends behind the furniture, all keyless and CORS-open. Search and
// reverse geocoding go to Komoot's Photon (OpenStreetMap data, tuned for
// typeahead); routes come from FOSSGIS's OSRM mirrors, which run three separate
// engines - car, bike and foot - where the public OSRM demo aliases everything
// to driving. None of it needs an account; each call takes an AbortSignal and a
// hard timeout so a bad connection degrades to an empty panel, not a hang.

import { type Category, type Place } from './data.ts'

const PHOTON = 'https://photon.komoot.io'

/** One FOSSGIS OSRM host per way of travelling. The path profile name stays `driving`: it selects nothing inside those backends. */
export const MODES = {
  drive: 'routed-car',
  bike: 'routed-bike',
  walk: 'routed-foot'
} as const
export type TravelMode = keyof typeof MODES

export const MODE_LABEL: Record<TravelMode, string> = { drive: 'Drive', bike: 'Bike', walk: 'Walk' }

const fetchJson = (url: string, signal?: AbortSignal, ms = 9000) =>
  fetch(url, { signal: signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : signal }).then(
    (r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
  )

// ---------- search & reverse: Photon ----------

type PhotonFeature = {
  properties: {
    osm_type: string
    osm_id: number
    osm_key: string
    osm_value: string
    type?: string
    name?: string
    housenumber?: string
    street?: string
    locality?: string
    district?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
  geometry: { coordinates: [number, number] }
}

/** osm_key/osm_value to the pin colour and row glyph. */
const KIND_CATEGORY: Record<string, Category> = {
  'amenity:cafe': 'cafe',
  'amenity:restaurant': 'food',
  'amenity:fast_food': 'food',
  'amenity:food_court': 'food',
  'amenity:bakery': 'food',
  'amenity:bar': 'landmark',
  'amenity:pub': 'landmark',
  'amenity:biergarten': 'landmark',
  'amenity:nightclub': 'landmark',
  'amenity:ice_cream': 'food',
  'amenity:hospital': 'medical',
  'amenity:clinic': 'medical',
  'amenity:doctors': 'medical',
  'amenity:dentist': 'medical',
  'amenity:pharmacy': 'medical',
  'amenity:veterinary': 'medical',
  'amenity:bus_station': 'transit',
  'amenity:cinema': 'cinema',
  'amenity:theatre': 'cinema',
  'amenity:marketplace': 'shop',
  'amenity:parking': 'address',
  'shop:*': 'shop',
  'tourism:museum': 'museum',
  'tourism:gallery': 'museum',
  'tourism:attraction': 'landmark',
  'tourism:hotel': 'landmark',
  'tourism:viewpoint': 'landmark',
  'tourism:artwork': 'landmark',
  'leisure:park': 'park',
  'leisure:garden': 'park',
  'leisure:playground': 'park',
  'leisure:stadium': 'landmark',
  'railway:*': 'rail',
  'public_transport:*': 'transit',
  'aeroway:*': 'transit',
  'historic:*': 'landmark',
  'place:*': 'address',
  'boundary:*': 'address',
  'building:*': 'address',
  'office:*': 'address'
}

const TITLE_CASE: Record<string, string> = {
  marketplace: 'Market',
  fast_food: 'Fast Food',
  food_court: 'Food Court',
  bus_station: 'Bus Station',
  bus_stop: 'Bus Stop',
  ice_cream: 'Ice Cream',
  arts_centre: 'Arts Centre',
  tram_stop: 'Tram Stop',
  train_station: 'Train Station',
  ferry_terminal: 'Ferry Terminal'
}

const humanise = (v: string) => TITLE_CASE[v] ?? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const categoryOf = (p: PhotonFeature['properties']): Category =>
  KIND_CATEGORY[`${p.osm_key}:${p.osm_value}`] ?? KIND_CATEGORY[`${p.osm_key}:*`] ?? 'address'

const kindOf = (p: PhotonFeature['properties']) =>
  p.osm_key === 'place' || p.osm_key === 'building' || !p.osm_value || p.osm_value === 'yes'
    ? humanise(p.type ?? 'address')
    : humanise(p.osm_value)

const addressOf = (p: PhotonFeature['properties']) =>
  [
    [p.housenumber, p.street].filter(Boolean).join(' ') || p.street || '',
    [p.locality, p.district].filter(Boolean).join(', '),
    [p.city, p.postcode].filter(Boolean).join(' ') || p.state || '',
    p.country ?? ''
  ].filter(Boolean)

const toPlace = (f: PhotonFeature): Place | null => {
  const p = f.properties
  const name = p.name ?? ([p.housenumber, p.street].filter(Boolean).join(' ') || p.locality || p.district || p.city)
  if (!name) return null
  return {
    id: `osm-${p.osm_type}${p.osm_id}`,
    name,
    kind: kindOf(p),
    category: categoryOf(p),
    lat: f.geometry.coordinates[1]!,
    lon: f.geometry.coordinates[0]!,
    address: addressOf(p)
  }
}

/** Typeahead search biased toward what the map is looking at. */
export async function search(q: string, near: { lat: number; lon: number }, signal?: AbortSignal): Promise<Place[]> {
  const u = `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=8&lat=${near.lat}&lon=${near.lon}`
  const data = (await fetchJson(u, signal)) as { features: PhotonFeature[] }
  return data.features.map(toPlace).filter((p): p is Place => p !== null)
}

/** What sits at a point - the dropped pin's name and the directions panel's "My Location". */
export async function reverse(lat: number, lon: number, signal?: AbortSignal): Promise<Place | null> {
  const u = `${PHOTON}/reverse?lat=${lat}&lon=${lon}`
  const data = (await fetchJson(u, signal)) as { features: PhotonFeature[] }
  return data.features.length ? toPlace(data.features[0]!) : null
}

// ---------- routing: FOSSGIS OSRM ----------

export type Step = {
  /** "Turn left onto Pasteur" */
  text: string
  /** Glyph key in glyphs.tsx's MANOEUVRE set. */
  icon: string
  distance: number
  lat: number
  lon: number
}

export type Route = {
  distance: number
  duration: number
  /** lat/lon pairs along the whole path, for the polyline. */
  pts: [number, number][]
  steps: Step[]
  /** The road that covers the most ground - Apple's "via". */
  via: string
}

type OsrmManeuver = {
  type: string
  modifier?: string
  bearing_after?: number
  exit?: number
  location?: [number, number]
}
type OsrmStep = {
  maneuver: OsrmManeuver
  name?: string
  ref?: string
  distance: number
  duration: number
}
type OsrmRoute = {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
  legs: { steps: OsrmStep[] }[]
}

const CARDINAL = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

const street = (s: OsrmStep) => s.name || s.ref || ''

const manoeuvre = (m: OsrmManeuver, s: OsrmStep): { text: string; icon: string } => {
  const on = street(s)
  const at = on ? ` onto ${on}` : ''
  const mod = m.modifier ?? ''
  if (m.type === 'depart')
    return {
      text: `Head ${CARDINAL[Math.round((m.bearing_after ?? 0) / 45) % 8]!}${on ? ` on ${on}` : ''}`,
      icon: 'up'
    }
  if (m.type === 'arrive') return { text: 'Arrive at your destination', icon: 'flag' }
  if (m.type === 'roundabout' || m.type === 'rotary')
    return { text: `Take exit ${m.exit ?? 1} at the roundabout${at}`, icon: 'roundabout' }
  if (m.type === 'merge') return { text: `Merge${at}`, icon: 'merge' }
  if (m.type === 'fork')
    return { text: `Keep ${mod || 'straight'}${at}`, icon: mod.includes('left') ? 'slightL' : 'slightR' }
  if (m.type === 'on ramp' || m.type === 'off ramp')
    return { text: `Take the ramp${at}`, icon: mod.includes('left') ? 'left' : 'right' }
  if (m.type === 'end of road' || m.type === 'turn')
    if (mod === 'uturn') return { text: `Make a U-turn${at}`, icon: 'uturn' }
    else if (mod.startsWith('sharp'))
      return { text: `Sharp ${mod.replace('sharp ', '')}${at}`, icon: mod.includes('left') ? 'sharpL' : 'sharpR' }
    else if (mod.startsWith('slight'))
      return { text: `Bear ${mod.replace('slight ', '')}${at}`, icon: mod.includes('left') ? 'slightL' : 'slightR' }
    else if (mod === 'straight') return { text: `Continue${at}`, icon: 'up' }
    else if (mod) return { text: `Turn ${mod}${at}`, icon: mod === 'left' ? 'left' : 'right' }
  if (m.type === 'new name' || m.type === 'continue') return { text: `Continue${at}`, icon: 'up' }
  return { text: `Continue${at}`, icon: 'up' }
}

const toRoute = (r: OsrmRoute): Route => {
  const steps = r.legs.flatMap((l) =>
    l.steps
      .filter((s) => s.maneuver.type !== 'notification')
      .map((s) => ({
        ...manoeuvre(s.maneuver, s),
        distance: s.distance,
        lat: s.maneuver.location?.[1] ?? r.geometry.coordinates[0]![1]!,
        lon: s.maneuver.location?.[0] ?? r.geometry.coordinates[0]![0]!
      }))
  )
  const longest = r.legs
    .flatMap((l) => l.steps)
    .reduce((a, b) => (b.name && b.distance > (a?.distance ?? 0) ? b : a), null as OsrmStep | null)
  return {
    distance: r.distance,
    duration: r.duration,
    pts: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    steps,
    via: longest?.name ?? ''
  }
}

/** Up to three ways there; an empty array means the network or the road said no. */
export async function routes(
  mode: TravelMode,
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  signal?: AbortSignal
): Promise<Route[]> {
  const host = MODES[mode]
  const u =
    `https://routing.openstreetmap.de/${host}/route/v1/driving/` +
    `${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=2`
  const data = (await fetchJson(u, signal)) as { code: string; routes?: OsrmRoute[] }
  if (data.code !== 'Ok' || !data.routes?.length) return []
  return data.routes.map(toRoute)
}

// ---------- what the panels print ----------

/** 3824s -> "1 hr 4 min"; seconds under a minute still read "1 min". */
export const formatMin = (s: number) => {
  const m = Math.max(1, Math.round(s / 60))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}`
}

/** 2185m -> "2.2 km", 214m -> "200 m" (rounded to a pair of digits like Apple's). */
export const formatLength = (m: number) =>
  m >= 995 ? `${(m / 1000).toFixed(m >= 9950 ? 0 : 1)} km` : `${Math.round(m / 10) * 10} m`

/** "4:32 PM" - the arrival clock under a route's duration. */
export const arrival = (duration: number) =>
  new Date(Date.now() + duration * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
