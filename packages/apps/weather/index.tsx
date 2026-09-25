import type { Os } from '@doan-labs/duo-sdk'
import { useWide, WidgetLabel } from '@doan-labs/duo-uikit'
import { Num } from '@doan-labs/duo-uikit/num.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import {
  clock,
  condition,
  hour,
  refresh,
  type Scene,
  type SymName,
  scene,
  select,
  useForecast,
  usePreferences
} from './data.ts'
import { Locations } from './locations.tsx'
import { styles } from './styles.ts'
import { TemperatureChart } from './temperature-chart.tsx'
import { Tiles } from './tiles.tsx'

export function Weather(_: { os: Os }) {
  const preferences = usePreferences()
  const place = preferences.places.find((p) => p.id === preferences.selected) || preferences.places[0]!
  const { data: f, loading, error, fetched } = useForecast(place)
  const [root, wide] = useWide<HTMLDivElement>()
  const [locations, setLocations] = useState(false)
  const [aside, setAside] = useState(true)
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
  // A location change resets navigation even when the component stays mounted on the other display.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the location is the reset trigger
  useEffect(() => {
    content.current?.scrollTo(0, 0)
    setDetail(null)
  }, [place.id])
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
  const span = Math.max(1, high - low)
  const sky = scene(current?.weather_code, current?.is_day)
  // The next 24 hours with sunrise and sunset slotted in where they fall.
  const strip: ({ kind: 'hour'; i: number } | { kind: 'sunrise' | 'sunset'; time: number })[] = hours
    .slice(start, start + 24)
    .map((_, i) => ({ kind: 'hour' as const, i: start + i }))
  if (f) {
    const from = hours[start] ?? 0
    const to = hours[Math.min(hours.length - 1, start + 24)] ?? Infinity
    for (const kind of ['sunrise', 'sunset'] as const)
      for (const time of f.daily[kind] ?? [])
        if (time >= from && time < to) {
          const at = strip.findIndex((s) => s.kind === 'hour' && hours[s.i]! > time)
          strip.splice(at < 0 ? strip.length : at, 0, { kind, time })
        }
  }
  const dots = (
    <div role="tablist" aria-label="Saved locations" {...stylex.props(styles.dots)}>
      {preferences.places.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={p.id === place.id}
          aria-label={p.name}
          onClick={() => select(p)}
          {...stylex.props(
            styles.dot,
            p.id === place.id && styles.dotCurrent,
            p.id.startsWith('local:') && styles.dotLocal
          )}
        >
          {p.id.startsWith('local:') && <Sym name="location" size={10} />}
        </button>
      ))}
    </div>
  )
  const list = (
    <button
      type="button"
      aria-label={locations ? 'Close locations' : 'Manage locations'}
      aria-expanded={locations}
      onClick={() => {
        setLocations(!locations)
        setDetail(null)
      }}
      {...stylex.props(styles.control)}
    >
      <Sym name={locations ? 'close' : 'list'} size={18} />
    </button>
  )
  return (
    <div data-weather ref={root} {...stylex.props(styles.root, styles[sky])}>
      <Sky sky={sky} code={current?.weather_code} />
      {wide && aside && (
        <aside aria-label="Locations" inert={detail !== null} {...stylex.props(styles.side)}>
          <Locations wide temp={temp} />
        </aside>
      )}
      <div {...stylex.props(styles.pane, wide && aside && styles.paneSide)}>
        <div inert={detail !== null} {...stylex.props(styles.top)}>
          <div {...stylex.props(styles.topLeft)}>
            {wide && (
              <button
                type="button"
                aria-label={aside ? 'Hide locations sidebar' : 'Show locations sidebar'}
                aria-expanded={aside}
                onClick={() => setAside(!aside)}
                {...stylex.props(styles.control)}
              >
                <Sym name="sidebar" size={17} />
              </button>
            )}
          </div>
          <div />
          <div {...stylex.props(styles.topRight)}>
            <button
              type="button"
              aria-label="Refresh weather"
              disabled={loading}
              onClick={() => void refresh(place, true)}
              {...stylex.props(styles.control)}
            >
              <span {...stylex.props(loading && styles.spin)}>
                <Sym name="reload" size={15} />
              </span>
            </button>
          </div>
        </div>
        {!wide && locations ? (
          <Locations onClose={() => setLocations(false)} temp={temp} />
        ) : (
          <div ref={content} inert={detail !== null} {...stylex.props(styles.scroll, styles.scrollbar)}>
            <header {...stylex.props(styles.hero)}>
              <div {...stylex.props(styles.eyebrow)}>
                {place.id.startsWith('local:') ? 'MY LOCATION' : place.region.toUpperCase()}
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
                  <span>H:{temp(f.daily.temperature_2m_max?.[0])}</span>
                  <span>L:{temp(f.daily.temperature_2m_min?.[0])}</span>
                </div>
              )}
              {f && <div {...stylex.props(styles.localTime)}>{clock(f.current.time!, f.timezone)} local time</div>}
            </header>
            {error && (
              <div role="alert" {...stylex.props(styles.card, styles.notice)}>
                {f && 'Showing the last successful forecast. '}
                {error}{' '}
                <button
                  type="button"
                  onClick={() => void refresh(place, true)}
                  {...stylex.props(styles.control, styles.pill)}
                >
                  Retry
                </button>
              </div>
            )}
            {f && (
              <>
                <section {...stylex.props(styles.card)} aria-label="Hourly forecast">
                  <div {...stylex.props(styles.summary)}>
                    {condition(current!.weather_code!, current!.is_day)[1]} conditions
                    {(f.daily.precipitation_probability_max?.[0] ?? 0) > 30
                      ? ' with a chance of precipitation later today'
                      : ' will continue for the rest of the day'}
                    . Wind gusts are up to <Num value={current!.wind_gusts_10m} suffix=" km/h" />.
                  </div>
                  <div {...stylex.props(styles.hourly)}>
                    {strip.map((s) =>
                      s.kind === 'hour' ? (
                        <button
                          key={hours[s.i]}
                          type="button"
                          aria-label={`View forecast for ${clock(hours[s.i]!, f.timezone)}`}
                          onClick={() =>
                            setDetail(
                              Math.max(
                                0,
                                f.daily.time!.findIndex((day) => sameDay(day, hours[s.i]!))
                              )
                            )
                          }
                          {...stylex.props(styles.hour)}
                        >
                          <span>{s.i === start ? 'Now' : hour(hours[s.i]!, f.timezone)}</span>
                          <Glyph name={condition(f.hourly.weather_code![s.i]!, f.hourly.is_day![s.i])[0]} size={26} />
                          {(f.hourly.precipitation_probability?.[s.i] ?? 0) >= 20 ? (
                            <span {...stylex.props(styles.chance)}>
                              <Num value={f.hourly.precipitation_probability?.[s.i]} suffix="%" />
                            </span>
                          ) : null}
                          <span>{temp(s.i === start ? current!.temperature_2m : f.hourly.temperature_2m?.[s.i])}</span>
                        </button>
                      ) : (
                        <div key={s.kind + s.time} {...stylex.props(styles.hour)}>
                          <span>{clock(s.time, f.timezone).replace(' ', '')}</span>
                          <Glyph name={s.kind} size={26} />
                          <span {...stylex.props(styles.hourEvent)}>{s.kind === 'sunrise' ? 'Sunrise' : 'Sunset'}</span>
                        </div>
                      )
                    )}
                  </div>
                </section>
                <div {...stylex.props(styles.grid)}>
                  <section {...stylex.props(styles.card, styles.forecast)} aria-label="10-day forecast">
                    <h2 {...stylex.props(styles.label)}>
                      <Sym name="calendarSym" size={12} />
                      10-day forecast
                    </h2>
                    {f.daily.time!.map((time, i) => {
                      const min = f.daily.temperature_2m_min![i]!
                      const max = f.daily.temperature_2m_max![i]!
                      const left = ((min - low) / span) * 100
                      const width = Math.max(4, ((max - min) / span) * 100)
                      return (
                        <button
                          key={time}
                          type="button"
                          aria-label={`View ${i === 0 ? 'today' : clock(time, f.timezone, { weekday: 'long' })} forecast`}
                          onClick={() => setDetail(i)}
                          {...stylex.props(styles.daily)}
                        >
                          <span>{i === 0 ? 'Today' : clock(time, f.timezone, { weekday: 'short' })}</span>
                          <span {...stylex.props(styles.dailyIcon)}>
                            <Glyph name={condition(f.daily.weather_code![i]!)[0]} size={24} />
                            {(f.daily.precipitation_probability_max?.[i] ?? 0) >= 20 && (
                              <small {...stylex.props(styles.chance)}>
                                <Num value={f.daily.precipitation_probability_max?.[i]} suffix="%" />
                              </small>
                            )}
                          </span>
                          <span {...stylex.props(styles.muted)}>{temp(min)}</span>
                          <span {...stylex.props(styles.track)}>
                            <span {...stylex.props(styles.range(left, Math.min(width, 100 - left)))} />
                            {i === 0 && current && (
                              <span
                                aria-hidden="true"
                                {...stylex.props(
                                  styles.marker(
                                    Math.min(100, Math.max(0, ((current.temperature_2m! - low) / span) * 100))
                                  )
                                )}
                              />
                            )}
                          </span>
                          <span>{temp(max)}</span>
                        </button>
                      )
                    })}
                  </section>
                  <Tiles f={f} start={start} temp={temp} />
                </div>
                <footer {...stylex.props(styles.footnote)}>
                  Updated{' '}
                  {fetched
                    ? new Date(fetched).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '—'}{' '}
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
      </div>
      {!locations && (
        <div inert={detail !== null} {...stylex.props(styles.bottom)}>
          <span />
          {dots}
          <div {...stylex.props(styles.topRight)}>{list}</div>
        </div>
      )}
      {locations && (
        <div {...stylex.props(styles.bottom)}>
          <span />
          <span />
          <div {...stylex.props(styles.topRight)}>{list}</div>
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
          <div {...stylex.props(styles.top)}>
            <div {...stylex.props(styles.topLeft)}>
              <button type="button" onClick={() => setDetail(null)} {...stylex.props(styles.control, styles.pill)}>
                <Sym name="back" size={14} />
                Back
              </button>
            </div>
            <strong {...stylex.props(styles.sheetTitle)}>
              {clock(f.daily.time![detail]!, f.timezone, { weekday: 'long', month: 'short', day: 'numeric' })}
            </strong>
            <span />
          </div>
          <div {...stylex.props(styles.scroll, styles.scrollbar)}>
            <h2 {...stylex.props(styles.detailTitle)}>
              <Glyph name={condition(f.daily.weather_code![detail]!)[0]} size={30} />
              {condition(f.daily.weather_code![detail]!)[1]}
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
                {...stylex.props(styles.control, styles.pill)}
              >
                <Sym name="back" size={14} />
                Previous
              </button>
              <button
                type="button"
                disabled={detail === f.daily.time!.length - 1}
                onClick={() => setDetail(detail + 1)}
                {...stylex.props(styles.control, styles.pill)}
              >
                Next
                <Sym name="forward" size={14} />
              </button>
            </div>
            <div {...stylex.props(styles.card)}>
              <h3 {...stylex.props(styles.label)}>Hour · Conditions · Temperature · Rain · Wind</h3>
              {hours
                .filter((time) => sameDay(time, f.daily.time![detail]!))
                .map((time) => {
                  const i = hours.indexOf(time)
                  const [glyph, label] = condition(f.hourly.weather_code![i]!, f.hourly.is_day![i])
                  return (
                    <div key={time} {...stylex.props(styles.detailRow)}>
                      <span>{hour(time, f.timezone)}</span>
                      <span role="img" aria-label={label}>
                        <Glyph name={glyph} size={20} />
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

/** Sky layers behind everything: glare, stars, clouds, rain, snow or fog by scene. */
function Sky({ sky, code }: { sky: Scene; code: number | undefined }) {
  const heavy = code != null && code >= 65
  return (
    <>
      {sky === 'clear' && <div aria-hidden="true" {...stylex.props(styles.layer, styles.glare)} />}
      {sky === 'night' && (
        <>
          <div aria-hidden="true" {...stylex.props(styles.layer, styles.stars)} />
          <div aria-hidden="true" {...stylex.props(styles.layer, styles.moon)} />
        </>
      )}
      {sky !== 'clear' && sky !== 'night' && sky !== 'fog' && (
        <>
          <div aria-hidden="true" {...stylex.props(styles.layer, styles.clouds, styles.cloudsBack)} />
          <div aria-hidden="true" {...stylex.props(styles.layer, styles.clouds)} />
        </>
      )}
      {(sky === 'rain' || sky === 'storm') && (
        <div aria-hidden="true" {...stylex.props(styles.layer, styles.streaks, heavy && styles.heavy)} />
      )}
      {sky === 'storm' && <div aria-hidden="true" {...stylex.props(styles.layer, styles.lightning)} />}
      {sky === 'snow' && <div aria-hidden="true" {...stylex.props(styles.layer, styles.flakes)} />}
      {sky === 'fog' && <div aria-hidden="true" {...stylex.props(styles.layer, styles.bands)} />}
    </>
  )
}

/** Condition glyph: sun-bearing symbols go warm, rain-bearing ones cool, the rest stay white. */
function Glyph({ name, size }: { name: SymName; size: number }) {
  const warm = name === 'sun' || name === 'cloudSun' || name === 'sunRain' || name === 'sunrise' || name === 'sunset'
  const cool = name === 'rain' || name === 'heavyRain' || name === 'drizzle' || name === 'storm'
  return (
    <span {...stylex.props(styles.hourIcon, warm && styles.sunColor, cool && styles.rainColor)}>
      <Sym name={name} size={size} />
    </span>
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

export function WeatherWidget({ onOpen }: { onOpen: (from: HTMLElement) => void }) {
  const el = useRef<HTMLButtonElement>(null)
  const preferences = usePreferences()
  const place = preferences.places.find((p) => p.id === preferences.selected) || preferences.places[0]!
  const { data, error } = useForecast(place)
  const sky = scene(data?.current.weather_code, data?.current.is_day)
  return (
    <button
      type="button"
      ref={el}
      {...stylex.props(shared.glass, shared.widget, styles.widget, styles[sky])}
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
