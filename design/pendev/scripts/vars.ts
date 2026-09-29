import * as k from '../../../packages/web/src/generated/tokens.ts'
const src = await Bun.file(new URL('../../../packages/web/src/tokens.stylex.ts', import.meta.url).pathname).text()
const hex = (v: string) => {
  v = v.trim()
  const m = v.match(/^rgba?\(([^)]+)\)$/)
  if (m) {
    const [r, g, b, a = '1'] = m[1].split(',').map((s) => s.trim())
    const h = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    return '#' + h(+r) + h(+g) + h(+b) + (a === '1' ? '' : h(+a * 255))
  }
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  return v.toLowerCase()
}
const block = (name: string) => src.slice(src.indexOf(`export const ${name} = stylex.createTheme(color, {`)).split('\n})')[0]
const pairs = (b: string) => Object.fromEntries([...b.matchAll(/^\s+(\w+): '([^']+)'/gm)].map((m) => [m[1], m[2]]))
const L = pairs(block('light')), D = pairs(block('dark'))
// defineVars default dark wins over the createTheme copy (the live page follows the media query)
for (const m of src.matchAll(/^\s+(\w+): \{ default: '([^']+)', \[DARK\]: '([^']+)' \}/gm)) { L[m[1]] = m[2]; D[m[1]] = m[3] }
const V: Record<string, any> = {}
for (const key of Object.keys(L)) { if (L[key].includes(' 0 ') || L[key].startsWith('0 ')) continue
  V['site/' + key] = { type: 'color', value: [{ value: hex(D[key]), theme: { mode: 'dark' } }, { value: hex(L[key]), theme: { mode: 'light' } }] } }
V['site/font-sans'] = { type: 'string', value: 'Inter' }
V['site/font-display'] = { type: 'string', value: 'Inter Tight' }
V['site/font-mono'] = { type: 'string', value: 'Geist Mono' }
for (const [n, v] of [['sm', 8], ['md', 14], ['lg', 24], ['pill', 999]] as const) V['site/radius-' + n] = { type: 'number', value: v }
const kc = Object.fromEntries(k.colors.map((t) => [t.name, t.value]))
for (const t of k.colors) { if (t.name.endsWith('Dark')) continue
  const d = kc[t.name + 'Dark']
  V['kit/' + t.name] = { type: 'color', value: d ? [{ value: hex(d), theme: { mode: 'dark' } }, { value: hex(t.value), theme: { mode: 'light' } }] : hex(t.value) } }
for (const t of k.app) V['kit/app-' + t.name] = { type: 'color', value: hex(t.value) }
for (const [g, arr] of [['type', k.typeScale], ['leading', k.leading], ['tracking', k.tracking], ['space', k.space], ['radius', k.radius], ['weight', k.weight]] as const)
  for (const t of arr) { const n = parseFloat(t.value); if (!isNaN(n) && !t.value.includes('%')) V[`kit/${g}-${t.name}`] = { type: 'number', value: n } }
V['kit/font-system'] = { type: 'string', value: 'SF Pro Text' }
V['kit/font-rounded'] = { type: 'string', value: 'SF Pro Rounded' }
V['kit/font-serif'] = { type: 'string', value: 'New York' }
V['kit/font-mono'] = { type: 'string', value: 'SF Mono' }
await Bun.write('/tmp/pen-cmp/vars.json', JSON.stringify(V))
console.log(Object.keys(V).length, JSON.stringify(V).length)
console.log(Object.entries(V).filter(([n]) => n.startsWith('site/')).map(([n, v]) => n + '=' + JSON.stringify(v.value)).join('\n'))
