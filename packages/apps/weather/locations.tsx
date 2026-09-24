import { Menu } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import {
  clock,
  condition,
  locate,
  type Place,
  refresh,
  remove,
  scene,
  search,
  select,
  update,
  useForecast,
  usePreferences
} from './data.ts'
import { styles } from './styles.ts'

type Props = { onClose?: () => void; temp: (value: number | undefined) => ReactNode; wide?: boolean }

/** The saved-cities list: large title, unit menu, search, one sky card per city. On the
 *  inner display it becomes the iPad sidebar: search and the menu share the top row. */
export function Locations({ onClose, temp, wide }: Props) {
  const preferences = usePreferences()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [searchState, setSearchState] = useState('')
  const [locationState, setLocationState] = useState('')
  const [menu, setMenu] = useState(false)
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
  function choose(p: Place) {
    select(p)
    if (wide) setQuery('')
    else onClose?.()
  }
  async function askLocation() {
    setLocationState('Finding your location…')
    try {
      const place = await locate()
      if (!place) {
        setLocationState('Location access failed. Allow location in your browser, or search for a city.')
        return
      }
      select(place)
      void refresh(place, true)
      if (!wide) onClose?.()
    } catch {
      setLocationState('Location access failed. Allow location in your browser, or search for a city.')
    }
  }
  const units = [
    ['C', 'Celsius', '°C'],
    ['F', 'Fahrenheit', '°F']
  ] as const
  const more = (
    <div {...stylex.props(styles.menuWrap)}>
      <button
        type="button"
        aria-label="More options"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
        {...stylex.props(styles.control)}
      >
        <Sym name="more" size={20} />
      </button>
      <Menu
        open={menu}
        onClose={() => setMenu(false)}
        size={14}
        xstyle={styles.menu}
        itemStyle={styles.menuItem}
        items={[
          ...units.map(([unit, name, sign]) => ({
            label: (
              <span>
                {name} <span {...stylex.props(styles.muted)}>{sign}</span>
              </span>
            ),
            name: `Switch to degrees ${name}`,
            checked: preferences.unit === unit,
            onSelect: () => update({ unit })
          })),
          {
            label: <span>Use Current Location</span>,
            icon: 'location' as const,
            disabled: locationState === 'Finding your location…',
            onSelect: () => void askLocation()
          }
        ]}
      />
    </div>
  )
  const searchField = (
    <div {...stylex.props(styles.searchBox, wide && styles.searchGrow)}>
      <span aria-hidden="true" {...stylex.props(styles.searchIcon)}>
        <Sym name="search" size={15} />
      </span>
      <input
        type="search"
        aria-label="Search cities"
        placeholder="Search for a city or airport"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        {...stylex.props(styles.search)}
      />
    </div>
  )
  const body = (
    <>
      {(locationState || searchState) && (
        <p role="status" {...stylex.props(styles.message)}>
          {locationState || searchState}
        </p>
      )}
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
              selected={p.id === preferences.selected}
              onChoose={() => choose(p)}
              canRemove={preferences.places.length > 1 && !p.id.startsWith('local:')}
              temp={temp}
            />
          ))}
    </>
  )
  if (wide)
    return (
      <div {...stylex.props(styles.sideFrame)}>
        <div {...stylex.props(styles.sideHead)}>
          {searchField}
          {more}
        </div>
        <div {...stylex.props(styles.sideList, styles.scrollbar)}>{body}</div>
        <p {...stylex.props(styles.footnote, styles.sideFoot)}>Locations and units are shared across both displays.</p>
      </div>
    )
  return (
    <div {...stylex.props(styles.scroll, styles.scrollbar)}>
      <div {...stylex.props(styles.listHead)}>
        <h1 {...stylex.props(styles.listTitle)}>Weather</h1>
        {more}
      </div>
      {searchField}
      {body}
      <p {...stylex.props(styles.footnote)}>Locations and units are shared across both displays.</p>
    </div>
  )
}

function Location({
  place,
  selected,
  onChoose,
  canRemove,
  temp
}: {
  place: Place
  selected: boolean
  onChoose: () => void
  canRemove: boolean
  temp: (value: number | undefined) => ReactNode
}) {
  const { data, error } = useForecast(place)
  const current = data?.current
  const sky = scene(current?.weather_code, current?.is_day)
  return (
    <div {...stylex.props(styles.location, styles[sky], selected && styles.locationSelected)}>
      {sky === 'clear' && <div aria-hidden="true" {...stylex.props(styles.layer, styles.glare)} />}
      {sky === 'night' && <div aria-hidden="true" {...stylex.props(styles.layer, styles.stars)} />}
      <button
        type="button"
        onClick={onChoose}
        aria-current={selected ? 'location' : undefined}
        {...stylex.props(styles.locationMain)}
      >
        <span {...stylex.props(styles.locationName)}>{place.name}</span>
        <span {...stylex.props(styles.locationTemp)}>{temp(current?.temperature_2m)}</span>
        <span {...stylex.props(styles.locationTime)}>
          {place.id.startsWith('local:')
            ? 'My Location'
            : data
              ? clock(Date.now() / 1000, data.timezone)
              : place.region}
        </span>
        <span {...stylex.props(styles.locationCondition)}>
          {current ? condition(current.weather_code!, current.is_day)[1] : error ? 'Weather unavailable' : 'Loading…'}
        </span>
        <span {...stylex.props(styles.locationRange)}>
          {data && (
            <>
              H:{temp(data.daily.temperature_2m_max?.[0])} L:{temp(data.daily.temperature_2m_min?.[0])}
            </>
          )}
        </span>
      </button>
      {canRemove && (
        <button
          type="button"
          aria-label={`Remove ${place.name}`}
          onClick={() => remove(place.id)}
          {...stylex.props(styles.control, styles.plain, styles.remove)}
        >
          <Sym name="close" size={12} />
        </button>
      )}
    </div>
  )
}
