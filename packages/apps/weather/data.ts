import { os } from '@doan-labs/ipduo-sdk'
import { useEffect, useSyncExternalStore } from 'react'

export type Place = { id: string; name: string; region: string; latitude: number; longitude: number }
export const home: Place = {
  id: 'sf',
  name: 'San Francisco',
  region: 'California, United States',
  latitude: 37.77,
  longitude: -122.42
}
type Preferences = { places: Place[]; selected: string; unit: 'C' | 'F' }
const key = 'preferences'
const defaults: Preferences = { places: [home], selected: home.id, unit: 'C' }
function read(raw: string | null): Preferences {
  try {
    const p = JSON.parse(raw || 'null')
    if (
      p &&
      ['C', 'F'].includes(p.unit) &&
      Array.isArray(p.places) &&
      p.places.length &&
      p.places.every(
        (v: Place) =>
          typeof v.id === 'string' &&
          typeof v.name === 'string' &&
          typeof v.region === 'string' &&
          Number.isFinite(v.latitude) &&
          Number.isFinite(v.longitude)
      )
    )
      return { ...p, selected: p.places.some((v: Place) => v.id === p.selected) ? p.selected : p.places[0].id }
  } catch {
    /* A blocked storage area still allows a session. */
  }
  return defaults
}
let preferences = defaults
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function update(patch: Partial<Preferences>) {
  preferences = { ...preferences, ...patch }
  void os.storage.set(key, JSON.stringify(preferences)).catch(() => {
    const place = preferences.places.find((p) => p.id === preferences.selected)!
    cache.set(place.id, { ...cache.get(place.id), loading: false, error: 'Preferences were not saved. Try again.' })
    emit()
  })
  emit()
}
export const usePreferences = () => useSyncExternalStore(subscribe, () => preferences)
export function select(place: Place) {
  const places = place.id.startsWith('local:')
    ? preferences.places.filter((p) => !p.id.startsWith('local:'))
    : preferences.places
  update({ selected: place.id, places: places.some((p) => p.id === place.id) ? places : [...places, place] })
}
export function remove(id: string) {
  const places = preferences.places.filter((p) => p.id !== id)
  if (places.length) update({ places, selected: preferences.selected === id ? places[0]!.id : preferences.selected })
}
export type Forecast = {
  current: Record<string, number>
  hourly: Record<string, number[]>
  daily: Record<string, number[]>
  timezone: string
}
type Entry = { data?: Forecast; loading: boolean; error?: string; fetched?: number }
const cache = new Map<string, Entry>()
const empty: Entry = { loading: true }
const pending = new Set<string>()
export async function refresh(place: Place, force = false) {
  if (!os.owner) {
    if (force) await os.commands.send('refresh', place.id)
    return
  }
  const epoch = os.owner.epoch
  const prior = cache.get(place.id)
  if (pending.has(place.id) || (!force && prior?.fetched && Date.now() - prior.fetched < 600_000)) return
  pending.add(place.id)
  cache.set(place.id, { ...prior, loading: true, error: undefined })
  emit()
  try {
    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      timezone: 'auto',
      timeformat: 'unixtime',
      forecast_days: '10',
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly:
        'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m,is_day,uv_index',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'
    })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      credentials: 'omit',
      signal: AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    })
    if (!response.ok) throw new Error('Forecast service unavailable')
    const data: Forecast = await response.json()
    if (
      !Number.isFinite(data.current?.temperature_2m) ||
      !data.daily?.time?.length ||
      !data.hourly?.time?.length ||
      !data.timezone
    )
      throw new Error('Incomplete forecast')
    if (os.owner?.epoch !== epoch) return
    cache.set(place.id, { data, loading: false, fetched: Date.now() })
  } catch {
    cache.set(place.id, {
      ...prior,
      loading: false,
      error: 'Unable to update weather. Check your connection and try again.'
    })
  } finally {
    pending.delete(place.id)
    emit()
    if (os.owner?.epoch === epoch) {
      try {
        await os.storage.set(`forecast:${place.id}`, JSON.stringify(cache.get(place.id)))
        await publishWidget()
      } catch {
        cache.set(place.id, { ...cache.get(place.id), loading: false, error: 'Weather could not be saved. Try again.' })
        emit()
      }
    }
  }
}
export function useForecast(place: Place) {
  const entry = useSyncExternalStore(subscribe, () => cache.get(place.id) || empty)
  useEffect(() => {
    void refresh(place)
  }, [place])
  return entry
}
export async function search(query: string, signal: AbortSignal): Promise<Place[]> {
  if (!os.owner) {
    const request = crypto.randomUUID()
    await os.commands.send('search', JSON.stringify({ query, request }))
    const value = await os.session.get(`search:${request}`)
    await os.session.del(`search:${request}`)
    signal.throwIfAborted()
    return JSON.parse(value ?? '[]')
  }
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' })}`,
    { credentials: 'omit', signal: AbortSignal.any([signal, ownerAbort.signal, AbortSignal.timeout(15000)]) }
  )
  if (!response.ok) throw new Error('Search unavailable')
  const data = await response.json()
  return (data.results || []).map(
    (p: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
      id: String(p.id),
      name: p.name,
      region: [p.admin1, p.country].filter(Boolean).join(', '),
      latitude: p.latitude,
      longitude: p.longitude
    })
  )
}
export const temperature = (value: number | undefined, unit: 'C' | 'F') =>
  value == null ? '—' : `${Math.round(unit === 'F' ? (value * 9) / 5 + 32 : value)}°`
export const number = (value: number | undefined, suffix = '') =>
  value == null ? '—' : `${Math.round(value)}${suffix}`
export const clock = (
  time: number,
  timezone: string,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
) => (Number.isFinite(time) ? new Date(time * 1000).toLocaleString('en-US', { ...options, timeZone: timezone }) : '—')
export function condition(code: number, isDay = 1): [string, string] {
  if (code === 0) return [isDay ? '☀️' : '🌙', isDay ? 'Sunny' : 'Clear']
  if (code === 1 || code === 2) return [isDay ? '⛅️' : '☁️', 'Partly Cloudy']
  if (code === 3) return ['☁️', 'Cloudy']
  if (code === 45 || code === 48) return ['🌫️', 'Fog']
  if (code >= 51 && code <= 57) return ['🌦️', 'Drizzle']
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['🌨️', 'Snow']
  if (code >= 95) return ['⛈️', 'Thunderstorms']
  if (code >= 61 && code <= 82) return ['🌧️', 'Rain']
  return ['—', 'Unavailable']
}

export function widgetSnapshot() {
  const place = preferences.places.find((p) => p.id === preferences.selected) || preferences.places[0]!
  const entry = cache.get(place.id)
  const data = entry?.data
  return {
    name: place.name,
    temperature: temperature(data?.current.temperature_2m, preferences.unit),
    condition: data
      ? condition(data.current.weather_code!, data.current.is_day)[1]
      : entry?.error
        ? 'Unavailable'
        : 'Loading…',
    range: data
      ? `H:${temperature(data.daily.temperature_2m_max?.[0], preferences.unit)} L:${temperature(data.daily.temperature_2m_min?.[0], preferences.unit)}`
      : ''
  }
}

let ownerAbort = new AbortController()
async function publishWidget() {
  if (!os.owner) return
  const value = widgetSnapshot()
  const place = preferences.places.find((p) => p.id === preferences.selected) ?? home
  await os.widget.set('small', {
    arg: place.id,
    tint: 'glass',
    lines: [
      { role: 'label', text: value.name.slice(0, 64) },
      { role: 'value', text: value.temperature },
      { role: 'caption', text: cache.get(place.id)?.error ? 'Offline · cached forecast' : value.condition },
      { role: 'caption', text: value.range }
    ]
  })
}
export async function initializeWeather() {
  let revision = 0
  let unwatch: (() => void) | undefined
  const apply = (k: string, v: string | null) => {
    if (k === key) preferences = read(v)
    if (k.startsWith('forecast:')) {
      try {
        if (v) cache.set(k.slice(9), JSON.parse(v))
        else cache.delete(k.slice(9))
      } catch {
        /* Ignore invalid old cache entries. */
      }
    }
  }
  const load = async () => {
    unwatch?.()
    let cursor: string | undefined
    do {
      const snap = await os.storage.snapshot(cursor)
      revision = snap.rev
      cursor = snap.cursor
      for (const [k, v] of snap.entries) apply(k, v)
    } while (cursor)
    unwatch = os.storage.watch(revision, (change) => {
      if (change.rev < 0 || change.rev > revision + 1) {
        void load()
        return
      }
      if (change.rev <= revision) return
      revision = change.rev
      apply(change.k, change.v)
      emit()
    })
    emit()
  }
  await load()
  const reconcile = () => {
    if (os.owner) {
      const place = preferences.places.find((p) => p.id === preferences.selected) ?? home
      void refresh(place)
    }
  }
  os.onOwner(() => {
    ownerAbort.abort()
    ownerAbort = new AbortController()
    reconcile()
  })
  os.onView((view) => {
    if (view.visible) reconcile()
  })
  os.commands.onCommand(async ({ type, payload }) => {
    if (type === 'refresh') {
      const place = preferences.places.find((p) => p.id === payload)
      if (place) await refresh(place, true)
    }
    if (type === 'search') {
      const { query, request } = JSON.parse(payload)
      await os.session.set(`search:${request}`, JSON.stringify(await search(query, ownerAbort.signal)))
    }
  })
  os.session.onArg((arg) => {
    if (preferences.places.some((p) => p.id === arg)) update({ selected: arg })
  })
  if (os.session.arg && preferences.places.some((p) => p.id === os.session.arg)) update({ selected: os.session.arg })
  setInterval(reconcile, 30000)
  reconcile()
}
