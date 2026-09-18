import { Num } from '@doan-labs/duo-uikit/num.tsx'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { clock, type Forecast, type SymName } from './data.ts'
import { styles } from './styles.ts'

type Props = { f: Forecast; start: number; temp: (value: number | undefined) => ReactNode }

/** The 2-up detail tiles under the ten-day forecast, in the real app's order. */
export function Tiles({ f, start, temp }: Props) {
  const c = f.current
  const now = c.time ?? Date.now() / 1000
  const uv = f.hourly.uv_index?.[start] ?? 0
  const sunrise = f.daily.sunrise![0]!
  const sunset = f.daily.sunset![0]!
  const dew = c.temperature_2m! - (100 - c.relative_humidity_2m!) / 5
  const feel = c.apparent_temperature! - c.temperature_2m!
  const visibility = f.hourly.visibility?.[start]
  const km = visibility == null ? undefined : visibility / 1000
  const rain = Array.from({ length: 24 }, (_, i) => f.hourly.precipitation?.[start + i] ?? 0)
  const peak = Math.max(1, ...rain)
  const aqi = f.aqi
  return (
    <div {...stylex.props(styles.tiles)}>
      <Tile icon="sunOutline" label="UV index">
        <div {...stylex.props(styles.tileValue)}>
          <Num value={uv} />
        </div>
        <div {...stylex.props(styles.tileSub)}>{level(uv, [3, 6, 8, 11], UV)}</div>
        <div {...stylex.props(styles.spectrum(appAppearance.weatherUvSpectrum, (Math.min(uv, 11) / 11) * 100))} />
        <p {...stylex.props(styles.tileNote)}>
          Peak <Num value={f.daily.uv_index_max?.[0]} /> today.
        </p>
      </Tile>
      <Tile icon="sunset" label={now < sunrise || now > sunset ? 'Sunrise' : 'Sunset'}>
        <div {...stylex.props(styles.tileValue)}>
          {clock(now < sunrise || now > sunset ? sunrise : sunset, f.timezone)}
        </div>
        <SunArc t={(now - sunrise) / Math.max(1, sunset - sunrise)} />
        <p {...stylex.props(styles.tileNote)}>
          {now < sunrise || now > sunset ? 'Sunset' : 'Sunrise'}:{' '}
          {clock(now < sunrise || now > sunset ? sunset : sunrise, f.timezone)}
        </p>
      </Tile>
      <Tile icon="wind" label="Wind">
        <Compass direction={c.wind_direction_10m ?? 0} speed={c.wind_speed_10m} />
        <p {...stylex.props(styles.tileNote)}>
          Gusts up to <Num value={c.wind_gusts_10m} suffix=" km/h" />.
        </p>
      </Tile>
      <Tile icon="thermometer" label="Feels like">
        <div {...stylex.props(styles.tileValue)}>{temp(c.apparent_temperature)}</div>
        <p {...stylex.props(styles.tileNote)}>
          {feel > 2
            ? 'Humidity is making it feel warmer.'
            : feel < -2
              ? 'Wind is making it feel colder.'
              : 'Similar to the actual temperature.'}
        </p>
      </Tile>
      <Tile icon="umbrella" label="Precipitation">
        <div {...stylex.props(styles.tileValue)}>
          <Num
            value={f.daily.precipitation_sum?.[0]}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            suffix=" mm"
          />
        </div>
        <div {...stylex.props(styles.tileSub)}>Today</div>
        <div aria-hidden="true" {...stylex.props(styles.bars)}>
          {rain.map((v, i) => (
            <span key={f.hourly.time![start + i] ?? i} {...stylex.props(styles.bar((v / peak) * 100))} />
          ))}
        </div>
        <p {...stylex.props(styles.tileNote)}>
          <Num
            value={rain.reduce((a, b) => a + b, 0)}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            suffix=" mm"
          />{' '}
          expected in the next 24h.
        </p>
      </Tile>
      <Tile icon="humidity" label="Humidity">
        <div {...stylex.props(styles.tileValue)}>
          <Num value={c.relative_humidity_2m} suffix="%" />
        </div>
        <p {...stylex.props(styles.tileNote)}>The dew point is {temp(dew)} right now.</p>
      </Tile>
      <Tile icon="eye" label="Visibility">
        <div {...stylex.props(styles.tileValue)}>
          <Num value={km} suffix=" km" />
        </div>
        <p {...stylex.props(styles.tileNote)}>
          {km == null
            ? 'Visibility unavailable.'
            : km >= 20
              ? 'Perfectly clear view.'
              : km >= 10
                ? 'Clear view.'
                : km >= 4
                  ? 'Fairly clear view.'
                  : 'Reduced visibility.'}
        </p>
      </Tile>
      <Tile icon="gauge" label="Pressure">
        <Gauge value={c.pressure_msl ?? 1013} />
      </Tile>
      {aqi != null && (
        <Tile icon="aqi" label="Air quality" wide>
          <div {...stylex.props(styles.tileValue)}>
            <Num value={aqi} />
          </div>
          <div {...stylex.props(styles.tileSub)}>{level(aqi, [51, 101, 151, 201, 301], AQI)}</div>
          <div {...stylex.props(styles.spectrum(appAppearance.weatherAqiSpectrum, (Math.min(aqi, 300) / 300) * 100))} />
          <p {...stylex.props(styles.tileNote)}>US Air Quality Index right now.</p>
        </Tile>
      )}
    </div>
  )
}

const UV = ['Low', 'Moderate', 'High', 'Very High', 'Extreme']
const AQI = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous']
const level = (value: number, cuts: number[], names: string[]) => names[cuts.filter((c) => value >= c).length]!

function Tile({ icon, label, wide, children }: { icon: SymName; label: string; wide?: boolean; children: ReactNode }) {
  return (
    <section aria-label={label} {...stylex.props(styles.card, styles.tile, wide && styles.tileWide)}>
      <h2 {...stylex.props(styles.label, styles.labelPlain)}>
        <Sym name={icon} size={12} />
        {label}
      </h2>
      <div {...stylex.props(styles.tileBody)}>{children}</div>
    </section>
  )
}

/** Day arc with the sun where it is now; below the horizon it sits on the nearer end. */
function SunArc({ t }: { t: number }) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, t)))
  const x = 100 + 84 * Math.cos(a)
  const y = 84 - 84 * Math.sin(a)
  return (
    <svg viewBox="0 0 200 96" aria-hidden="true" {...stylex.props(styles.gauge)}>
      <path d="M16 84 A84 84 0 0 1 184 84" strokeWidth="2" {...stylex.props(styles.stroke, styles.faint)} />
      <line x1="0" x2="200" y1="84" y2="84" strokeWidth="1" {...stylex.props(styles.stroke, styles.faint)} />
      <circle cx={x} cy={y} r="5" {...stylex.props(styles.fill)} />
    </svg>
  )
}

/** Compass with the arrow pointing where the wind blows and the speed in the middle. */
function Compass({ direction, speed }: { direction: number; speed: number | undefined }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Wind from ${Math.round(direction)} degrees`}
      {...stylex.props(styles.gauge)}
    >
      <circle
        cx="50"
        cy="50"
        r="42"
        strokeWidth="2"
        strokeDasharray="1 4.7"
        {...stylex.props(styles.stroke, styles.faint)}
      />
      {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
        <text
          key={d}
          x={[50, 92, 50, 8][i]}
          y={[10, 53, 96, 53][i]}
          textAnchor="middle"
          {...stylex.props(styles.svgText)}
        >
          {d}
        </text>
      ))}
      <g transform={`rotate(${direction + 180} 50 50)`}>
        <line x1="50" y1="30" x2="50" y2="18" strokeWidth="2" {...stylex.props(styles.stroke)} />
        <path d="M45 20 L50 12 L55 20 Z" {...stylex.props(styles.fill)} />
        <line x1="50" y1="70" x2="50" y2="82" strokeWidth="2" {...stylex.props(styles.stroke)} />
      </g>
      <text x="50" y="48" textAnchor="middle" {...stylex.props(styles.svgText, styles.compassValue)}>
        {speed == null ? '—' : Math.round(speed)}
      </text>
      <text x="50" y="60" textAnchor="middle" {...stylex.props(styles.svgText)}>
        km/h
      </text>
    </svg>
  )
}

/** Barometer: 960 to 1060 hPa across a 180° arc. */
function Gauge({ value }: { value: number }) {
  const t = Math.min(1, Math.max(0, (value - 960) / 100))
  const a = Math.PI * (1 - t)
  return (
    <>
      <svg viewBox="0 0 200 110" aria-hidden="true" {...stylex.props(styles.gauge)}>
        <path
          d="M20 96 A80 80 0 0 1 180 96"
          strokeWidth="6"
          strokeDasharray="2 6"
          {...stylex.props(styles.stroke, styles.faint)}
        />
        <circle cx={100 + 80 * Math.cos(a)} cy={96 - 80 * Math.sin(a)} r="6" {...stylex.props(styles.fill)} />
        <text x="100" y="80" textAnchor="middle" {...stylex.props(styles.svgText, styles.compassValue)}>
          {Math.round(value)}
        </text>
        <text x="100" y="94" textAnchor="middle" {...stylex.props(styles.svgText)}>
          hPa
        </text>
        <text x="22" y="110" textAnchor="middle" {...stylex.props(styles.svgText)}>
          Low
        </text>
        <text x="178" y="110" textAnchor="middle" {...stylex.props(styles.svgText)}>
          High
        </text>
      </svg>
      <p {...stylex.props(styles.tileNote)}>
        {value < 1005
          ? 'Low pressure, unsettled air.'
          : value > 1022
            ? 'High pressure, settled air.'
            : 'Steady pressure.'}
      </p>
    </>
  )
}
