// Unit tables for Convert mode. Each category names a base unit and a factor to
// it; temperature is affine and converts through Celsius. Currency rates come
// from a public endpoint and are cached in os.storage so the app works offline
// with the last fetched table.

export type Unit = { id: string; name: string; to: number }
export type Category = { id: string; name: string; units: Unit[]; affine?: boolean }

const u = (id: string, name: string, to: number): Unit => ({ id, name, to })

export const CATEGORIES: Category[] = [
  {
    id: 'currency',
    name: 'Currency',
    units: [
      u('USD', 'US Dollar', 1),
      u('EUR', 'Euro', 1),
      u('GBP', 'British Pound', 1),
      u('JPY', 'Japanese Yen', 1),
      u('CNY', 'Chinese Yuan', 1),
      u('AUD', 'Australian Dollar', 1),
      u('CAD', 'Canadian Dollar', 1),
      u('CHF', 'Swiss Franc', 1),
      u('HKD', 'Hong Kong Dollar', 1),
      u('SGD', 'Singapore Dollar', 1),
      u('INR', 'Indian Rupee', 1),
      u('KRW', 'South Korean Won', 1),
      u('MXN', 'Mexican Peso', 1),
      u('BRL', 'Brazilian Real', 1),
      u('SEK', 'Swedish Krona', 1),
      u('NOK', 'Norwegian Krone', 1),
      u('NZD', 'New Zealand Dollar', 1),
      u('ZAR', 'South African Rand', 1),
      u('TWD', 'New Taiwan Dollar', 1),
      u('THB', 'Thai Baht', 1),
      u('VND', 'Vietnamese Dong', 1)
    ]
  },
  {
    id: 'length',
    name: 'Length',
    units: [
      u('mm', 'Millimeters', 0.001),
      u('cm', 'Centimeters', 0.01),
      u('m', 'Meters', 1),
      u('km', 'Kilometers', 1000),
      u('in', 'Inches', 0.0254),
      u('ft', 'Feet', 0.3048),
      u('yd', 'Yards', 0.9144),
      u('mi', 'Miles', 1609.344),
      u('nmi', 'Nautical Miles', 1852)
    ]
  },
  {
    id: 'mass',
    name: 'Weight',
    units: [
      u('mg', 'Milligrams', 0.001),
      u('g', 'Grams', 1),
      u('kg', 'Kilograms', 1000),
      u('t', 'Metric Tons', 1e6),
      u('oz', 'Ounces', 28.349523125),
      u('lb', 'Pounds', 453.59237),
      u('st', 'Stone', 6350.29318)
    ]
  },
  {
    id: 'temperature',
    name: 'Temperature',
    affine: true,
    units: [u('°C', 'Celsius', 1), u('°F', 'Fahrenheit', 1), u('K', 'Kelvin', 1)]
  },
  {
    id: 'speed',
    name: 'Speed',
    units: [
      u('m/s', 'Meters per Second', 1),
      u('km/h', 'Kilometers per Hour', 1 / 3.6),
      u('mph', 'Miles per Hour', 0.44704),
      u('kn', 'Knots', 0.5144444444),
      u('ft/s', 'Feet per Second', 0.3048)
    ]
  },
  {
    id: 'time',
    name: 'Time',
    units: [
      u('ms', 'Milliseconds', 0.001),
      u('s', 'Seconds', 1),
      u('min', 'Minutes', 60),
      u('h', 'Hours', 3600),
      u('day', 'Days', 86400),
      u('wk', 'Weeks', 604800)
    ]
  },
  {
    id: 'pressure',
    name: 'Pressure',
    units: [
      u('Pa', 'Pascals', 1),
      u('kPa', 'Kilopascals', 1e3),
      u('bar', 'Bar', 1e5),
      u('atm', 'Atmospheres', 101325),
      u('psi', 'Pounds per Sq. Inch', 6894.757293168),
      u('mmHg', 'Millimeters of Mercury', 133.322387415)
    ]
  },
  {
    id: 'power',
    name: 'Power',
    units: [
      u('W', 'Watts', 1),
      u('kW', 'Kilowatts', 1e3),
      u('hp', 'Horsepower', 745.699871582),
      u('BTU/h', 'BTU per Hour', 0.2930710702)
    ]
  },
  {
    id: 'volume',
    name: 'Volume',
    units: [
      u('mL', 'Milliliters', 0.001),
      u('L', 'Liters', 1),
      u('fl oz', 'Fluid Ounces', 0.02957352956),
      u('cup', 'Cups', 0.2365882365),
      u('pt', 'Pints', 0.473176473),
      u('qt', 'Quarts', 0.946352946),
      u('gal', 'Gallons', 3.785411784),
      u('m³', 'Cubic Meters', 1000)
    ]
  },
  {
    id: 'area',
    name: 'Area',
    units: [
      u('cm²', 'Square Centimeters', 1e-4),
      u('m²', 'Square Meters', 1),
      u('km²', 'Square Kilometers', 1e6),
      u('ha', 'Hectares', 1e4),
      u('ft²', 'Square Feet', 0.09290304),
      u('yd²', 'Square Yards', 0.83612736),
      u('acre', 'Acres', 4046.8564224),
      u('mi²', 'Square Miles', 2589988.110336)
    ]
  },
  {
    id: 'data',
    name: 'Data',
    units: [
      u('B', 'Bytes', 1),
      u('KB', 'Kilobytes', 1e3),
      u('MB', 'Megabytes', 1e6),
      u('GB', 'Gigabytes', 1e9),
      u('TB', 'Terabytes', 1e12),
      u('PB', 'Petabytes', 1e15)
    ]
  },
  {
    id: 'angle',
    name: 'Angle',
    units: [
      u('°', 'Degrees', Math.PI / 180),
      u('rad', 'Radians', 1),
      u('grad', 'Gradians', Math.PI / 200),
      u('rev', 'Revolutions', Math.PI * 2)
    ]
  }
]

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[1]!

const toC: Record<string, (v: number) => number> = {
  '°C': (v) => v,
  '°F': (v) => ((v - 32) * 5) / 9,
  K: (v) => v - 273.15
}
const fromC: Record<string, (v: number) => number> = {
  '°C': (v) => v,
  '°F': (v) => (v * 9) / 5 + 32,
  K: (v) => v + 273.15
}

/** Convert `v` between two units of one category. Currency converts through USD rates. */
export function convert(v: number, cat: Category, from: string, to: string, rates?: Record<string, number>): number {
  if (cat.affine) return fromC[to]!(toC[from]!(v))
  if (cat.id === 'currency') {
    const a = rates?.[from]
    const b = rates?.[to]
    if (!a || !b) return NaN
    return (v / a) * b
  }
  const a = cat.units.find((x) => x.id === from)
  const b = cat.units.find((x) => x.id === to)
  if (!a || !b) return NaN
  return (v * a.to) / b.to
}

export type FxTable = { rates: Record<string, number>; at: number }
export const FX_URL = 'https://open.er-api.com/v6/latest/USD'
export const FX_MAX_AGE = 12 * 3600 * 1000

let inflight: Promise<FxTable> | null = null

/** Live USD-based rates; the caller caches the result in os.storage. */
export const fetchRates = (): Promise<FxTable> =>
  (inflight ??= fetchRatesNow().finally(() => {
    inflight = null
  }))

async function fetchRatesNow(): Promise<FxTable> {
  const res = await fetch(FX_URL)
  if (!res.ok) throw new Error(`Rates ${res.status}`)
  const data = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string }
  if (data.result !== 'success' || !data.rates) throw new Error('Bad rates payload')
  const rates: Record<string, number> = {}
  for (const unit of CATEGORIES[0]!.units)
    if (typeof data.rates[unit.id] === 'number') rates[unit.id] = data.rates[unit.id]!
  rates.USD = 1
  const at = data.time_last_update_utc ? Date.parse(data.time_last_update_utc) : Date.now()
  return { rates, at }
}
