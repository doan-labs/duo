import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { clock, type Forecast, temperature } from './data.ts'

export function TemperatureChart({ forecast, day, unit }: { forecast: Forecast; day: number; unit: 'C' | 'F' }) {
  const date = clock(forecast.daily.time![day]!, forecast.timezone, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
  const points = forecast.hourly.time!.flatMap((time, i) => {
    const value = forecast.hourly.temperature_2m?.[i]
    return clock(time, forecast.timezone, { year: 'numeric', month: 'numeric', day: 'numeric' }) === date &&
      value != null
      ? [{ time, value }]
      : []
  })
  if (points.length < 2) return null
  const low = Math.min(...points.map((p) => p.value)) - 2
  const high = Math.max(...points.map((p) => p.value)) + 2
  const y = (value: number) => 130 - ((value - low) / (high - low)) * 110
  const line = points.map((p, i) => `${(i * 300) / (points.length - 1)},${y(p.value)}`).join(' ')
  return (
    <svg
      viewBox="0 0 350 165"
      role="img"
      aria-label={`Hourly temperature chart for ${date}, from ${temperature(low + 2, unit)} to ${temperature(high - 2, unit)}`}
      {...stylex.props(styles.chart)}
    >
      <title>Hourly temperatures</title>
      {[low, (low + high) / 2, high].map((value) => (
        <g key={value}>
          <line x1="0" x2="300" y1={y(value)} y2={y(value)} {...stylex.props(styles.grid)} />
          <text x="310" y={y(value) + 4} {...stylex.props(styles.label)}>
            {temperature(value, unit)}
          </text>
        </g>
      ))}
      <polyline points={line} {...stylex.props(styles.line)} />
      {points
        .filter((_, i) => i % 6 === 0)
        .map((p) => (
          <text
            key={p.time}
            x={(points.indexOf(p) * 300) / (points.length - 1)}
            y="155"
            {...stylex.props(styles.label)}
          >
            {clock(p.time, forecast.timezone, { hour: 'numeric' })}
          </text>
        ))}
    </svg>
  )
}

const styles = stylex.create({
  chart: { display: 'block', width: '100%', maxHeight: 210, marginBottom: 16, overflow: 'visible' },
  grid: { stroke: colors.white, opacity: 0.12, strokeWidth: 1 },
  line: { fill: 'none', stroke: colors.weatherSun, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' },
  label: { fill: colors.white, opacity: 0.7, fontSize: appAppearance.calendarFontSize4 }
})
