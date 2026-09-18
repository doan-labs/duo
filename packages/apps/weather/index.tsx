import type { Os } from '@doan-labs/duo-sdk'
import { WidgetLabel } from '@doan-labs/duo-uikit'
import { Num } from '@doan-labs/duo-uikit/num.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  clock,
  condition,
  type Place,
  refresh,
  remove,
  search,
  select,
  update,
  useForecast,
  usePreferences
} from './data.ts'
import { styles } from './styles.ts'
import { TemperatureChart } from './temperature-chart.tsx'

export function Weather(_: { os: Os }) {
  const preferences = usePreferences()
  const place = preferences.places.find((p) => p.id === preferences.selected) || preferences.places[0]!
  const { data: f, loading, error, fetched } = useForecast(place)
  const [locations, setLocations] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [searchState, setSearchState] = useState('')
  const [locationState, setLocationState] = useState('')
  const [detail, setDetail] = useState<number | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const temp = (value: number | undefined) => <Temp value={value} unit={preferences.unit} />
  useEffect(() => {
    if (detail === null) return
    const previous = document.activeElement as HTMLElement | null
    const panel = dialog.current
    panel?.querySelector('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setDetail(null)
      }
      if (event.key !== 'Tab') return
      const buttons = panel?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      const first = buttons?.[0]
      const last = buttons?.[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    panel?.addEventListener('keydown', keydown)
    return () => {
      panel?.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [detail])
  useEffect(() => {
    const controller = new AbortController()
    setResults([])
    setSearchState(query.trim().length < 2 ? '' : 'Searching…')
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) return
      try {
        const matches = await search(query.trim(), controller.signal)
        if (!controller.signal.aborted) {
          setResults(matches)
          setSearchState(matches.length ? '' : 'No cities found. Try a nearby city.')
        }
      } catch {
        if (!controller.signal.aborted) setSearchState('Search unavailable. Check your connection or try again.')
      }
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])
  // A location change resets navigation even when the component stays mounted on the other display.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the location is the reset trigger
  useEffect(() => {
    content.current?.scrollTo(0, 0)
    setDetail(null)
  }, [place.id])
  function choose(p: Place) {
    select(p)
    setLocations(false)
    setQuery('')
    setLocationState('')
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationState('Location is unavailable in this browser. Search for a city instead.')
      return
    }
    setLocationState('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const p = {
          id: `local:${latitude.toFixed(4)},${longitude.toFixed(4)}`,
          name: 'My Location',
          region: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          latitude,
          longitude
        }
        select(p)
        void refresh(p, true)
        setLocations(false)
        setLocationState('')
      },
      () => setLocationState('Location access failed. Allow location in your browser, or search for a city.'),
      { timeout: 10000, maximumAge: 300000 }
    )
  }
  const current = f?.current
  const hours = f?.hourly.time || []
  const start = Math.max(
    0,
    hours.findIndex((time) => time >= (current?.time || Date.now() / 1000) - 3600)
  )
  const sameDay = (a: number, b: number) =>
    clock(a, f!.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' }) ===
    clock(b, f!.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const low = Math.min(...(f?.daily.temperature_2m_min || [0]))
  const high = Math.max(...(f?.daily.temperature_2m_max || [1]))
  return (
    <div
      data-weather
      {...stylex.props(
        styles.root,
        current?.is_day === 0 ? styles.night : (current?.weather_code || 0) >= 3 ? styles.cloudy : styles.day
      )}
    >
      <div aria-hidden="true" {...stylex.props(styles.atmosphere, current?.is_day === 0 && styles.stars)} />
      {(current?.weather_code || 0) > 0 && <div aria-hidden="true" {...stylex.props(styles.clouds)} />}
      <div inert={detail !== null} {...stylex.props(styles.toolbar)}>
        <button
          type="button"
          aria-label={locations ? 'Close locations' : 'Manage locations'}
          onClick={() => {
            setLocations(!locations)
            setDetail(null)
          }}
          {...stylex.props(styles.button)}
        >
          {locations ? (
            <>
              <Sym name="back" size={14} />
              Weather
            </>
          ) : (
            <>
              <Sym name="checklist" size={15} />
              Locations
            </>
          )}
        </button>
        <div {...stylex.props(styles.actions)}>
          <button
            type="button"
            aria-label={`Switch to degrees ${preferences.unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
            onClick={() => update({ unit: preferences.unit === 'C' ? 'F' : 'C' })}
            {...stylex.props(styles.button, styles.icon)}
          >
            °{preferences.unit}
          </button>
          <button
            type="button"
            aria-label="Refresh weather"
            disabled={loading}
            onClick={() => void refresh(place, true)}
            {...stylex.props(styles.button, styles.icon)}
          >
            <span {...stylex.props(loading && styles.spin)}>
              <Sym name="reload" size={16} />
            </span>
          </button>
        </div>
      </div>
      {locations ? (
        <div {...stylex.props(styles.scroll, styles.scrollbar)}>
          <h1 {...stylex.props(styles.listTitle)}>Weather</h1>
          <div {...stylex.props(styles.searchBox)}>
            <span aria-hidden="true" {...stylex.props(styles.searchIcon)}>
              <Sym name="search" size={16} />
            </span>
            <input
              type="search"
              aria-label="Search cities"
              placeholder="Search for a city or postcode"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              {...stylex.props(styles.search)}
            />
          </div>
          <button
            type="button"
            onClick={locate}
            disabled={locationState === 'Finding your location…'}
            {...stylex.props(styles.button, styles.locate)}
          >
            <Sym name="location" size={14} />
            Use Current Location
          </button>
          <p role="status" {...stylex.props(styles.message)}>
            {locationState || searchState}
          </p>
          {query.trim().length >= 2
            ? results.map((p) => (
                <button key={p.id} type="button" onClick={() => choose(p)} {...stylex.props(styles.result)}>
                  <strong {...stylex.props(styles.resultName)}>{p.name}</strong>
                  <span {...stylex.props(styles.muted)}>{p.region}</span>
                  <span {...stylex.props(styles.add)}>
                    <Sym name="plus" size={14} />
                  </span>
                </button>
              ))
            : preferences.places.map((p) => (
                <Location
                  key={p.id}
                  place={p}
                  selected={p.id === place.id}
                  onChoose={() => choose(p)}
                  canRemove={preferences.places.length > 1}
                />
              ))}
          <p {...stylex.props(styles.footnote)}>
            Choose a city to save it. Locations and units are shared across both displays.
          </p>
        </div>
      ) : (
        <div ref={content} inert={detail !== null} {...stylex.props(styles.scroll, styles.scrollbar)}>
          <header {...stylex.props(styles.hero)}>
            <div {...stylex.props(styles.eyebrow)}>
              {place.id.startsWith('local:') ? '⌖ CURRENT LOCATION' : 'LOCAL WEATHER'}
            </div>
            <h1 {...stylex.props(styles.city)}>{place.name}</h1>
            <div {...stylex.props(styles.temperature)}>{temp(current?.temperature_2m)}</div>
            <div {...stylex.props(styles.condition)}>
              {current
                ? condition(current.weather_code!, current.is_day)[1]
                : loading
                  ? 'Loading forecast…'
                  : 'Weather unavailable'}
            </div>
            {f && (
              <div {...stylex.props(styles.highLow)}>
                H:{temp(f.daily.temperature_2m_max?.[0])}{' '}
                <span {...stylex.props(styles.muted)}>L:{temp(f.daily.temperature_2m_min?.[0])}</span>
              </div>
            )}
            <div {...stylex.props(styles.localTime)}>
              {f ? `${clock(f.current.time!, f.timezone)} · ${place.region}` : place.region}
            </div>
          </header>
          {error && (
            <div role="alert" {...stylex.props(styles.notice)}>
              {f && 'Showing the last successful forecast. '}
              {error}{' '}
              <button type="button" onClick={() => void refresh(place, true)} {...stylex.props(styles.button)}>
                Retry
              </button>
            </div>
          )}
          {f && (
            <>
              <section {...stylex.props(styles.card)} aria-label="Hourly forecast">
                <div {...stylex.props(styles.summary)}>
                  {condition(current!.weather_code!, current!.is_day)[1]} now. Today's precipitation chance is{' '}
                  <Num value={f.daily.precipitation_probability_max?.[0]} suffix="%" />. Wind{' '}
                  <Num value={current!.wind_speed_10m} suffix=" km/h" />.
                </div>
                <h2 {...stylex.props(styles.label)}>◷ HOURLY FORECAST</h2>
                <div {...stylex.props(styles.hourly, styles.scrollbar)}>
                  {hours.slice(start, start + 24).map((time, i) => (
                    <button
                      key={time}
                      type="button"
                      aria-label={`View forecast for ${clock(time, f.timezone)}`}
                      onClick={() =>
                        setDetail(
                          Math.max(
                            0,
                            f.daily.time!.findIndex((day) => sameDay(day, time))
                          )
                        )
                      }
                      {...stylex.props(styles.hour)}
                    >
                      <span>{i === 0 ? 'Now' : clock(time, f.timezone, { hour: 'numeric' })}</span>
                      <span {...stylex.props(styles.weatherIcon)}>
                        {condition(f.hourly.weather_code![start + i]!, f.hourly.is_day![start + i])[0]}
                      </span>
                      <span {...stylex.props(styles.chance)}>
                        <Num value={f.hourly.precipitation_probability?.[start + i]} suffix="%" />
                      </span>
                      <strong>{temp(i === 0 ? current!.temperature_2m : f.hourly.temperature_2m?.[start + i])}</strong>
                    </button>
                  ))}
                </div>
              </section>
              <div {...stylex.props(styles.grid)}>
                <section {...stylex.props(styles.card, styles.forecast)}>
                  <h2 {...stylex.props(styles.label)}>▦ 10-DAY FORECAST</h2>
                  {f.daily.time!.map((time, i) => (
                    <button
                      key={time}
                      type="button"
                      aria-label={`View ${i === 0 ? 'today' : clock(time, f.timezone, { weekday: 'long' })} forecast`}
                      onClick={() => setDetail(i)}
                      {...stylex.props(styles.daily)}
                    >
                      <span>{i === 0 ? 'Today' : clock(time, f.timezone, { weekday: 'short' })}</span>
                      <span {...stylex.props(styles.dailyIcon)}>
                        {condition(f.daily.weather_code![i]!)[0]}
                        <small {...stylex.props(styles.chance)}>
                          <Num value={f.daily.precipitation_probability_max?.[i]} suffix="%" />
                        </small>
                      </span>
                      <span {...stylex.props(styles.muted)}>{temp(f.daily.temperature_2m_min?.[i])}</span>
                      <span {...stylex.props(styles.track)}>
                        <span
                          {...stylex.props(
                            styles.range(
                              ((f.daily.temperature_2m_min![i]! - low) / Math.max(1, high - low)) * 100,
                              Math.max(
                                3,
                                ((f.daily.temperature_2m_max![i]! - f.daily.temperature_2m_min![i]!) /
                                  Math.max(1, high - low)) *
                                  100
                              )
                            )
                          )}
                        />
                      </span>
                      <span>{temp(f.daily.temperature_2m_max?.[i])}</span>
                      <span {...stylex.props(styles.muted)}>›</span>
                    </button>
                  ))}
                </section>
                <div {...stylex.props(styles.metrics)}>
                  <Metric
                    label="☀ UV INDEX"
                    value={<Num value={f.hourly.uv_index?.[start]} />}
                    description={
                      <>
                        Today's peak: <Num value={f.daily.uv_index_max?.[0]} />
                      </>
                    }
                  />
                  <Metric
                    label="◴ SUNSET"
                    value={clock(f.daily.sunset![0]!, f.timezone)}
                    description={`Sunrise: ${clock(f.daily.sunrise![0]!, f.timezone)}`}
                  />
                  <Metric
                    label="↗ WIND"
                    value={<Num value={current!.wind_speed_10m} suffix=" km/h" />}
                    description={
                      <>
                        From <Num value={current!.wind_direction_10m} suffix="°" /> · Gusts{' '}
                        <Num value={current!.wind_gusts_10m} suffix=" km/h" />
                      </>
                    }
                  />
                  <Metric
                    label="♧ FEELS LIKE"
                    value={temp(current!.apparent_temperature)}
                    description="Temperature adjusted for wind and humidity."
                  />
                  <Metric
                    label="☂ PRECIPITATION"
                    value={
                      <Num
                        value={f.daily.precipitation_sum?.[0]}
                        format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                        suffix=" mm"
                      />
                    }
                    description="Total forecast for today."
                  />
                  <Metric
                    label="◉ HUMIDITY"
                    value={<Num value={current!.relative_humidity_2m} suffix="%" />}
                    description="Current relative humidity."
                  />
                  <Metric
                    label="◎ VISIBILITY"
                    value={
                      <Num
                        value={f.hourly.visibility?.[start] == null ? undefined : f.hourly.visibility[start]! / 1000}
                        suffix=" km"
                      />
                    }
                    description="Forecast horizontal visibility."
                  />
                  <Metric
                    label="⊙ PRESSURE"
                    value={<Num value={current!.pressure_msl} suffix=" hPa" />}
                    description="Atmospheric pressure at sea level."
                  />
                </div>
              </div>
              <footer {...stylex.props(styles.footnote)}>
                Updated{' '}
                {fetched ? new Date(fetched).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}{' '}
                · Forecast times are local to {place.name}.<br />
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" {...stylex.props(styles.link)}>
                  Weather data by Open-Meteo
                </a>{' '}
                · Model estimates, not a live station.
              </footer>
            </>
          )}
        </div>
      )}
      {detail !== null && f && (
        <div
          ref={dialog}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-label="Daily weather details"
          {...stylex.props(styles.sheet)}
        >
          <div {...stylex.props(styles.toolbar)}>
            <button type="button" onClick={() => setDetail(null)} {...stylex.props(styles.button)}>
              <Sym name="back" size={14} />
              Back
            </button>
            <strong {...stylex.props(styles.toolbarTitle)}>
              {clock(f.daily.time![detail]!, f.timezone, { weekday: 'long', month: 'short', day: 'numeric' })}
            </strong>
            <span />
          </div>
          <div {...stylex.props(styles.scroll, styles.scrollbar)}>
            <h2 {...stylex.props(styles.detailTitle)}>
              {condition(f.daily.weather_code![detail]!)[0]} {condition(f.daily.weather_code![detail]!)[1]}
            </h2>
            <TemperatureChart forecast={f} day={detail} unit={preferences.unit} />
            <p {...stylex.props(styles.detailSummary)}>
              High {temp(f.daily.temperature_2m_max?.[detail])} · Low {temp(f.daily.temperature_2m_min?.[detail])}
              <br />
              Rain chance <Num value={f.daily.precipitation_probability_max?.[detail]} suffix="%" /> · UV peak{' '}
              <Num value={f.daily.uv_index_max?.[detail]} />
            </p>
            <div {...stylex.props(styles.dayControls)}>
              <button
                type="button"
                disabled={detail === 0}
                onClick={() => setDetail(detail - 1)}
                {...stylex.props(styles.button)}
              >
                <Sym name="back" size={14} />
                Previous
              </button>
              <button
                type="button"
                disabled={detail === f.daily.time!.length - 1}
                onClick={() => setDetail(detail + 1)}
                {...stylex.props(styles.button)}
              >
                Next
                <Sym name="forward" size={14} />
              </button>
            </div>
            <div {...stylex.props(styles.card)}>
              <h3 {...stylex.props(styles.label)}>HOUR · CONDITIONS · TEMPERATURE · RAIN · WIND</h3>
              {hours
                .filter((time) => sameDay(time, f.daily.time![detail]!))
                .map((time) => {
                  const i = hours.indexOf(time)
                  return (
                    <div key={time} {...stylex.props(styles.detailRow)}>
                      <span>{clock(time, f.timezone, { hour: 'numeric' })}</span>
                      <span role="img" aria-label={condition(f.hourly.weather_code![i]!, f.hourly.is_day![i])[1]}>
                        {condition(f.hourly.weather_code![i]!, f.hourly.is_day![i])[0]}
                      </span>
                      <strong>{temp(f.hourly.temperature_2m?.[i])}</strong>
                      <span {...stylex.props(styles.chance)}>
                        <Num value={f.hourly.precipitation_probability?.[i]} suffix="%" />
                      </span>
                      <span>
                        <Num value={f.hourly.wind_speed_10m?.[i]} suffix=" km/h" />
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Temp({ value, unit }: { value: number | undefined; unit: 'C' | 'F' }) {
  return (
    <Num
      value={value == null ? undefined : unit === 'F' ? (value * 9) / 5 + 32 : value}
      format={{ maximumFractionDigits: 0 }}
      suffix="°"
    />
  )
}
function Metric({ label, value, description }: { label: string; value: ReactNode; description: ReactNode }) {
  return (
    <section {...stylex.props(styles.card, styles.metric)}>
      <h2 {...stylex.props(styles.label)}>{label}</h2>
      <div {...stylex.props(styles.metricValue)}>{value}</div>
      <p {...stylex.props(styles.metricDescription)}>{description}</p>
    </section>
  )
}
function Location({
  place,
  selected,
  onChoose,
  canRemove
}: {
  place: Place
  selected: boolean
  onChoose: () => void
  canRemove: boolean
}) {
  const { data, error } = useForecast(place)
  const { unit } = usePreferences()
  return (
    <div {...stylex.props(styles.location, selected && styles.locationSelected)}>
      <button
        type="button"
        onClick={onChoose}
        aria-current={selected ? 'location' : undefined}
        {...stylex.props(styles.locationMain)}
      >
        <span {...stylex.props(styles.locationName)}>
          {place.name}
          {selected && <Sym name="location" size={13} />}
        </span>
        <span {...stylex.props(styles.muted)}>{place.region}</span>
        <span {...stylex.props(styles.locationCondition)}>
          {data
            ? condition(data.current.weather_code!, data.current.is_day)[1]
            : error
              ? 'Weather unavailable'
              : 'Loading…'}
        </span>
        <span {...stylex.props(styles.locationTemp)}>
          <Temp value={data?.current.temperature_2m} unit={unit} />
        </span>
      </button>
      {canRemove && (
        <button
          type="button"
          aria-label={`Remove ${place.name}`}
          onClick={() => remove(place.id)}
          {...stylex.props(styles.button, styles.remove)}
        >
          <Sym name="trash" size={14} />
        </button>
      )}
    </div>
  )
}

export function WeatherWidget({ onOpen }: { onOpen: (from: HTMLElement) => void }) {
  const el = useRef<HTMLButtonElement>(null)
  const preferences = usePreferences()
  const place = preferences.places.find((p) => p.id === preferences.selected) || preferences.places[0]!
  const { data, error } = useForecast(place)
  return (
    <button
      type="button"
      ref={el}
      {...stylex.props(shared.glass, shared.widget, styles.widget)}
      onClick={() => onOpen(el.current!)}
    >
      <WidgetLabel>{place.name}</WidgetLabel>
      <div {...stylex.props(styles.widgetTemp)}>
        <Temp value={data?.current.temperature_2m} unit={preferences.unit} />
      </div>
      <WidgetLabel xstyle={[styles.widgetFoot]}>
        {data ? condition(data.current.weather_code!, data.current.is_day)[1] : error ? 'Unavailable' : 'Loading…'}
      </WidgetLabel>
      <WidgetLabel>
        {data && (
          <>
            H:
            <Temp value={data.daily.temperature_2m_max?.[0]} unit={preferences.unit} /> L:
            <Temp value={data.daily.temperature_2m_min?.[0]} unit={preferences.unit} />
          </>
        )}
      </WidgetLabel>
    </button>
  )
}
