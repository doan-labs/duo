import { os, transition } from '@doan-labs/duo-sdk'
import type { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { useEffect, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type Place = {
  id: string
  name: string
  region: string
  latitude: number
  longitude: number
  /** How a `local:` place was fixed: the GPS prompt, or the public IP's registry answer. */
  via?: 'gps' | 'ip'
}
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
/** A city or unit change is a whole new screen; it cross-fades rather than snaps. */
const swap = () => transition(() => flushSync(emit))
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
  swap()
}
export const usePreferences = () => useSyncExternalStore(subscribe, () => preferences)
export function select(place: Place) {
  // My Location leads the list, like on iOS; there is at most one of them.
  const places = place.id.startsWith('local:')
    ? [place, ...preferences.places.filter((p) => !p.id.startsWith('local:'))]
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
  /** US AQI, when the air-quality service answered. */
  aqi?: number
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
    const signal = AbortSignal.any([ownerAbort.signal, AbortSignal.timeout(15000)])
    const air = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: 'us_aqi'
    })
    const [response, quality] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { credentials: 'omit', signal }),
      // Air quality is a bonus tile: a failure here must not take the forecast down.
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${air}`, { credentials: 'omit', signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ])
    if (!response.ok) throw new Error('Forecast service unavailable')
    const data: Forecast = await response.json()
    if (Number.isFinite(quality?.current?.us_aqi)) data.aqi = quality.current.us_aqi
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
type Fix = { latitude: number; longitude: number }
/** The browser prompt's answer, or null when it is refused, missing or times out. */
function geolocate(): Promise<Fix | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 300000 }
    )
  )
}
/** 'denied' means skip the prompt entirely and go straight to the IP answer. */
async function geoState(): Promise<PermissionState | null> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state
  } catch {
    return null
  }
}
/** Name a GPS fix through the free reverse geocoder; the bare coordinates still work when it cannot. */
async function named(fix: Fix, signal: AbortSignal): Promise<Place> {
  const place: Place = {
    id: `local:${fix.latitude.toFixed(4)},${fix.longitude.toFixed(4)}`,
    name: 'My Location',
    region: `${fix.latitude.toFixed(2)}\u00B0, ${fix.longitude.toFixed(2)}\u00B0`,
    latitude: fix.latitude,
    longitude: fix.longitude,
    via: 'gps'
  }
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${new URLSearchParams({
        latitude: String(fix.latitude),
        longitude: String(fix.longitude),
        localityLanguage: 'en'
      })}`,
      { credentials: 'omit', signal }
    )
    if (response.ok) {
      const data = await response.json()
      if (typeof data.city === 'string' && data.city) place.name = data.city
      else if (typeof data.locality === 'string' && data.locality) place.name = data.locality
      const region = [data.principalSubdivision, data.countryName]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(', ')
      if (region) place.region = region
    }
  } catch {
    /* An unnamed place still shows real weather. */
  }
  return place
}
/** Where the public IP puts the device, when a GPS fix never comes. */
async function ipLocate(signal: AbortSignal): Promise<Place | null> {
  try {
    const response = await fetch('https://ipwho.is/', { credentials: 'omit', signal })
    if (!response.ok) return null
    const data = await response.json()
    if (data.success !== true || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return null
    const region = [data.region, data.country]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
      .join(', ')
    return {
      id: `local:${Number(data.latitude).toFixed(4)},${Number(data.longitude).toFixed(4)}`,
      name: typeof data.city === 'string' && data.city ? data.city : 'My Location',
      region: region || 'Approximate location',
      latitude: data.latitude,
      longitude: data.longitude,
      via: 'ip'
    }
  } catch {
    return null
  }
}
/** GPS first, the public IP second; null when neither can place the device. */
async function locateHere(signal: AbortSignal): Promise<Place | null> {
  if ((await geoState()) !== 'denied') {
    const fix = await geolocate()
    if (fix) return named(fix, signal)
  }
  return ipLocate(signal)
}
/** Resolve the device's place from whichever view asks; only the owner actually asks. */
export async function locate(): Promise<Place | null> {
  if (!os.owner) {
    const request = crypto.randomUUID()
    await os.commands.send('locate', request)
    const value = await os.session.get(`locate:${request}`)
    await os.session.del(`locate:${request}`)
    try {
      const place = JSON.parse(value ?? 'null')
      return place && typeof place.id === 'string' ? (place as Place) : null
    } catch {
      return null
    }
  }
  return locateHere(ownerAbort.signal)
}
let locating = false
/**
 * First launch asks for a fix and files My Location first; later launches refresh it quietly.
 * An undecided prompt must not fire on every launch while a list already has places, and a
 * copy never asks at all: it draws the weather, it does not start the prompt.
 */
async function autoLocate() {
  if (!os.owner || locating) return
  locating = true
  try {
    const local = preferences.places.find((p) => p.id.startsWith('local:'))
    if (!local) {
      const place = await locateHere(ownerAbort.signal)
      if (place) {
        select(place)
        void refresh(place, true)
      }
      return
    }
    if ((await geoState()) === 'prompt') return
    const place = await locateHere(ownerAbort.signal)
    if (
      place &&
      (place.id !== local.id || place.name !== local.name || place.region !== local.region || place.via !== local.via)
    ) {
      const keep = preferences.selected.startsWith('local:') ? { selected: place.id } : {}
      update({ places: [place, ...preferences.places.filter((p) => !p.id.startsWith('local:'))], ...keep })
      void refresh(place)
    }
  } finally {
    locating = false
  }
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
export type SymName = keyof typeof SYM
/** SF Symbol and label for a WMO weather code. */
export function condition(code: number, isDay = 1): [SymName, string] {
  if (code === 0) return [isDay ? 'sun' : 'moonStars', isDay ? 'Sunny' : 'Clear']
  if (code === 1 || code === 2) return [isDay ? 'cloudSun' : 'cloudMoon', 'Partly Cloudy']
  if (code === 3) return ['cloud', 'Cloudy']
  if (code === 45 || code === 48) return ['fog', 'Fog']
  if (code >= 51 && code <= 57) return ['drizzle', 'Drizzle']
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'Snow']
  if (code >= 95) return ['storm', 'Thunderstorms']
  if (code >= 80 && code <= 82) return [isDay ? 'sunRain' : 'moonRain', 'Showers']
  if (code >= 65 || code === 82) return ['heavyRain', 'Heavy Rain']
  if (code >= 61 && code <= 82) return ['rain', 'Rain']
  return ['cloud', 'Unavailable']
}
export type Scene = 'clear' | 'night' | 'cloudy' | 'cloudyNight' | 'rain' | 'storm' | 'snow' | 'fog'
/** Which sky to paint. Precipitation wins over time of day, as in the real app. */
export function scene(code: number | undefined, isDay = 1): Scene {
  if (code == null) return isDay ? 'clear' : 'night'
  if (code >= 95) return 'storm'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 51) return 'rain'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 2) return isDay ? 'cloudy' : 'cloudyNight'
  return isDay ? 'clear' : 'night'
}
/** "10AM" the way the hourly strip writes it. */
export const hour = (time: number, timezone: string) => clock(time, timezone, { hour: 'numeric' }).replace(' ', '')

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
      // Our own write echoes back here; only a change we have not shown yet is worth a cross-fade.
      const before = JSON.stringify(preferences)
      apply(change.k, change.v)
      if (change.k === key && JSON.stringify(preferences) !== before) swap()
      else emit()
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
    void autoLocate()
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
    if (type === 'locate') {
      await os.session.set(`locate:${payload}`, JSON.stringify(await locateHere(ownerAbort.signal)))
    }
  })
  os.session.onArg((arg) => {
    if (preferences.places.some((p) => p.id === arg)) update({ selected: arg })
  })
  if (os.session.arg && preferences.places.some((p) => p.id === os.session.arg)) update({ selected: os.session.arg })
  setInterval(reconcile, 30000)
  reconcile()
  void autoLocate()
}
