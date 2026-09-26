// Canvas paint cannot read `var(--…)`: resolve a token's `var()` reference to a
// computed colour once per themed root, then hand the literal to the context.

const cache = new WeakMap<Element, Map<string, string>>()

/** Resolve a `var(--x)` token (e.g. `colors.blue`) to the colour it computes to under `el`'s theme. */
export function resolveColor(el: Element, token: string): string {
  let map = cache.get(el)
  if (!map) {
    map = new Map()
    cache.set(el, map)
  }
  let out = map.get(token)
  if (out === undefined) {
    const name = /var\(\s*(--[\w-]+)/.exec(token)?.[1]
    out = (name ? getComputedStyle(el).getPropertyValue(name).trim() : '') || token
    map.set(token, out)
  }
  return out
}

/** Mix two resolved `#rrggbb`/`rgb()` colours; `t` of 0 is `a`, 1 is `b`. */
export function mixColor(a: string, b: string, t: number, shade = 1): string {
  const pa = parseColor(a)
  const pb = parseColor(b)
  const r = Math.round((pa[0] + (pb[0] - pa[0]) * t) * shade)
  const g = Math.round((pa[1] + (pb[1] - pa[1]) * t) * shade)
  const bl = Math.round((pa[2] + (pb[2] - pa[2]) * t) * shade)
  const cl = (v: number) => Math.max(0, Math.min(255, v))
  return `rgb(${cl(r)}, ${cl(g)}, ${cl(bl)})`
}

function parseColor(c: string): [number, number, number] {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c)
  if (hex) return [parseInt(hex[1]!, 16), parseInt(hex[2]!, 16), parseInt(hex[3]!, 16)]
  const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return [255, 255, 255]
}
