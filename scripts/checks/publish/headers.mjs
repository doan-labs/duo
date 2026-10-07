// Release bytes are hash-verified at install time (packages/shell/runtime/releases.ts),
// so every path that serves a release must answer with the committed bytes for
// every request class. The host's `_headers` file pins that contract on the
// edge: `no-transform` forbids any response rewriting (injected analytics
// snippets change the bytes and break the hash check), and the content-addressed
// paths support the documented immutable long-term caching.
// This check parses _headers and proves the release trees carry both.
import assert from 'node:assert/strict'

const headersFile = await Bun.file('packages/web/public/_headers').text()

// Blocks: a URL pattern line, then indented `name: value` lines. Splats (`*`)
// greedily match every character; `:name` placeholders match one segment.
const rules = []
let current
for (const raw of headersFile.split('\n')) {
  const line = raw.replace(/\t/g, '  ')
  if (!line.trim() || line.trim().startsWith('#')) continue
  if (/^\s/.test(line)) {
    assert(current, 'header line without a pattern')
    const m = /^([A-Za-z-]+):\s*(.+)$/.exec(line.trim())
    assert(m, `malformed header line: ${line.trim()}`)
    current.headers.push([m[1].toLowerCase(), m[2].trim()])
    continue
  }
  current = { pattern: line.trim(), headers: [] }
  rules.push(current)
}

const splat = /^((?!\*).)*\*((?!\*).)*$/ // at most one splat per pattern
const toRe = (pattern) => {
  assert(splat.test(pattern), `multiple splats in pattern ${pattern}`)
  return new RegExp(
    '^' +
      pattern
        .split('*')
        .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]\w*/g, '[^/]+'))
        .join('.*') +
      '$'
  )
}
const effective = (path) => {
  const found = rules.filter((r) => toRe(r.pattern).test(path))
  const headers = new Map()
  for (const rule of found) for (const [name, value] of rule.headers) headers.set(name, value)
  return { found, headers }
}

// Every tree the Store downloads releases from (DEFAULT_SOURCES in
// packages/shell/runtime/catalog.ts) plus the seed catalog in registry.ts.
const trees = ['/catalog', '/cdn', '/preinstalled']
const files = ['app.html', 'app', 'release.json', 'manifest.json', 'icon-1024.png']
for (const tree of trees)
  for (const file of files) {
    const path = `${tree}/apps/labs.example.check/1.0.0+deadbeef/${file}`
    const { found, headers } = effective(path)
    assert(found.length, `no _headers rule covers ${path}`)
    const cache = headers.get('cache-control') ?? ''
    assert(cache.includes('no-transform'), `${path} is transformable on the edge: ${cache}`)
    assert(cache.includes('immutable'), `${path} lost immutable caching: ${cache}`)
  }

// The rules must not leak onto catalog indexes or site pages: freshness and
// page analytics keep their defaults there.
for (const path of [
  '/catalog/index.json',
  '/catalog/developers.json',
  '/catalog/delisted.json',
  '/cdn/index.json',
  '/preinstalled/index.json',
  '/',
  '/apps'
])
  assert(!effective(path).found.length, `release rule leaks onto ${path}`)

// Custom headers only apply to asset-layer responses, so a run_worker_first
// pattern that caught a release path would silently drop the invariant.
const wrangler = await Bun.file('wrangler.jsonc').text()
const workerFirst = [...wrangler.matchAll(/"([^"]+)"\s*(?:,|\])/g)].map((m) => m[1])
for (const tree of trees)
  for (const pattern of workerFirst) {
    assert(!pattern.startsWith(`${tree}/`), `run_worker_first pattern ${pattern} shadows ${tree}`)
  }
assert.match(
  wrangler,
  /"directory":\s*"[^"]*packages\/web\/dist\/client"/,
  '_headers must ship inside the assets directory'
)

console.log('Hosted release bytes are no-transform immutable: /catalog, /cdn and /preinstalled release trees')
