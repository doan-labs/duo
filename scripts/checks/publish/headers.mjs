// Release files are immutable and hash-verified at install time
// (packages/shell/runtime/releases.ts): every path that serves a release must
// answer with the committed bytes for every request class, and a miss must
// never be cached like a hit. The asset layer cannot express status-conditional
// Cache-Control in _headers, so the three release trees run through the site
// Worker (wrangler assets.run_worker_first), which stamps immutable +
// no-transform only on committed hits and no-store on misses/redirects/errors -
// see packages/web/worker.ts. _headers never applies to Worker-served
// responses, so release rules do not belong there.
// This check verifies the config contract, drives the real Worker handler over
// canned asset responses to prove the emitted status/header/body surface, and
// runs a fixture suite so the validator itself is exercised. Live edge behavior
// is verified against the deploy itself (docs/debug.md).

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const TREES = ['catalog', 'cdn', 'preinstalled']
const CANONICAL = TREES.map((t) => `/${t}/apps/*`)
const INDEX_PATHS = TREES.flatMap((t) => [`/${t}/index.json`, `/${t}/developers.json`, `/${t}/delisted.json`])
const SITE_PATHS = ['/', '/apps', '/docs', '/kit', '/sdk', '/simulator', '/build']
// Every /<tree>/apps/ file form the store can request, in both + and %2B
// identities - the paths the Worker must stamp.
const RELEASE_PATHS = TREES.flatMap((t) =>
  ['app.html', 'app', 'release.json', 'manifest.json', 'icon-1024.png'].flatMap((f) => [
    `/${t}/apps/com.example.duo.app/1.0.0+1234abcd/${f}`,
    `/${t}/apps/com.example.duo.app/1.0.0%2B1234abcd/${f}`
  ])
).concat(TREES.map((t) => `/${t}/apps/`))
// The route surface roots: asset-served (a /apps/* route does not match the
// bare dir), but a Worker pattern intersecting them is suspect.
const SURFACE_PATHS = TREES.flatMap((t) => [`/${t}/apps`, `/${t}`])

// Cache-Control directives this deployment is allowed to use. Unknown names
// (immutable-ish, no-transformer) fail instead of passing as substrings.
const KNOWN_CC = new Set([
  'public',
  'private',
  'no-store',
  'no-cache',
  'must-revalidate',
  'proxy-revalidate',
  'immutable',
  'no-transform',
  'only-if-cached',
  'must-understand',
  'stale-while-revalidate',
  'stale-if-error',
  'max-age',
  's-maxage'
])
const SITE_MAX_AGE = 300 // indexes and pages stay short-fresh; the store proposal uses 60s

// ---------- _headers grammar ----------
// A rule is an unindented pattern line followed by indented `Name: value`
// entries or `! Name` detachments. Comments (#) and blank lines are skipped.
// Per Cloudflare docs: at most one splat per pattern, placeholders are
// :[A-Za-z]\w*, a request inherits every matching rule's headers, and same-name
// values across matching rules join with commas.

function parseHeadersFile(text) {
  const rules = []
  const errors = []
  let cur = null
  for (const [i, raw] of text.split('\n').entries()) {
    const no = i + 1
    if (raw.length > 2000) errors.push(`line ${no}: over the 2000 character limit`)
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue
    if (/^\s/.test(raw)) {
      if (!cur) {
        errors.push(`line ${no}: header entry without a rule`)
        continue
      }
      const line = raw.trim()
      if (line.startsWith('!')) {
        const name = line.slice(1).trim()
        if (!/^[A-Za-z0-9-]+$/.test(name)) errors.push(`line ${no}: malformed detach '${line}'`)
        else cur.entries.push({ detach: true, name: name.toLowerCase() })
        continue
      }
      const m = /^([A-Za-z0-9-]+)\s*:\s*(.+)$/.exec(line)
      if (!m) errors.push(`line ${no}: malformed header entry '${line}'`)
      else cur.entries.push({ name: m[1].toLowerCase(), value: m[2] })
      continue
    }
    cur = { pattern: raw.trim(), entries: [] }
    rules.push(cur)
  }
  for (const r of rules) {
    const p = r.pattern
    if (!p.startsWith('/') && !p.startsWith('https://')) errors.push(`pattern '${p}' must be a /path or https:// URL`)
    if (p.split('*').length - 1 > 1) errors.push(`pattern '${p}': at most one splat allowed`)
    const rest = p.startsWith('https://') ? p.slice('https://'.length) : p
    for (const m of rest.matchAll(/:([A-Za-z0-9_]*)/g))
      if (!/^[A-Za-z]\w*$/.test(m[1])) errors.push(`pattern '${p}': bad placeholder '${m[0]}'`)
    if (!r.entries.length) errors.push(`pattern '${p}': rule sets no headers`)
  }
  if (rules.length > 100) errors.push('more than 100 header rules')
  return { rules, errors }
}

// A pattern compiles to a regex over the request path. Absolute https://
// patterns evaluate on their path part (the host is out of scope for these
// assertions); splats greedily match any characters including '/', placeholders
// match a single path segment.
function patternRe(pattern) {
  let src = pattern
  if (src.startsWith('https://')) {
    const slash = src.indexOf('/', 'https://'.length)
    src = slash === -1 ? '/' : src.slice(slash)
  }
  const out = []
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '*') out.push('.*')
    else if (c === ':') {
      const m = /^:([A-Za-z]\w*)/.exec(src.slice(i))
      out.push(m ? '[^/]+' : ':')
      i += m ? m[0].length - 1 : 0
    } else out.push(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  }
  return new RegExp(`^${out.join('')}$`)
}

// Effective headers per Cloudflare: matching rules apply in file order, a `!`
// detaches everything collected so far for that name, and surviving same-name
// values join with commas.
function effective(rules, path) {
  const collected = new Map()
  for (const r of rules) {
    if (!patternRe(r.pattern).test(path)) continue
    for (const e of r.entries) {
      if (e.detach) collected.delete(e.name)
      else collected.set(e.name, [...(collected.get(e.name) ?? []), e.value])
    }
  }
  return new Map([...collected].map(([k, v]) => [k, v.join(', ')]))
}

// ---------- Cache-Control evaluation ----------

function directives(cc) {
  const map = new Map()
  for (const tok of cc.split(',')) {
    const t = tok.trim()
    if (!t) throw new Error('empty directive')
    const eq = t.indexOf('=')
    const name = (eq === -1 ? t : t.slice(0, eq)).trim().toLowerCase()
    const value = eq === -1 ? true : t.slice(eq + 1).trim()
    if (!KNOWN_CC.has(name)) throw new Error(`unknown directive '${name}'`)
    if (['max-age', 's-maxage', 'stale-while-revalidate', 'stale-if-error'].includes(name))
      if (value === true || !/^\d+$/.test(value)) throw new Error(`${name} needs a non-negative integer`)
    if (map.has(name) && map.get(name) !== value) throw new Error(`conflicting duplicate directive '${name}'`)
    map.set(name, value)
  }
  return map
}

function ccConflicts(map) {
  const errs = []
  if (map.has('no-store') && (map.has('immutable') || map.has('public') || Number(map.get('max-age')) > 0))
    errs.push('no-store contradicts public/immutable/max-age')
  if (map.has('no-cache') && map.has('immutable')) errs.push('no-cache contradicts immutable')
  if (map.has('public') && map.has('private')) errs.push('public and private are mutually exclusive')
  const long = (k) => map.has(k) && Number(map.get(k)) > 0
  if (map.has('immutable') && !long('max-age') && !long('s-maxage'))
    errs.push('immutable without a positive max-age does nothing')
  return errs
}

const freshEnough = (map) =>
  !map.has('immutable') &&
  Number(map.get('max-age') ?? 0) <= SITE_MAX_AGE &&
  Number(map.get('s-maxage') ?? 0) <= SITE_MAX_AGE

// ---------- wrangler config ----------

function parseJsonc(text) {
  let out = ''
  let i = 0
  let inStr = false
  while (i < text.length) {
    const c = text[i]
    if (inStr) {
      out += c
      if (c === '\\') {
        out += text[i + 1]
        i += 2
        continue
      }
      if (c === '"') inStr = false
      i++
      continue
    }
    if (c === '"') {
      inStr = true
      out += c
      i++
      continue
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    out += c
    i++
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

// run_worker_first decides which paths the Worker sees at all. The release
// trees must be routed there (that is what makes the status-conditional stamp
// possible), but nothing else may shadow them or the indexes: the only allowed
// patterns covering release space are the three canonical ones.
function checkRunWorkerFirst(assets) {
  const errors = []
  const rwf = assets?.run_worker_first
  if (rwf === true) {
    errors.push('run_worker_first: true routes every path through the Worker; keep it selective')
    return errors
  }
  if (!Array.isArray(rwf)) {
    errors.push('assets.run_worker_first must be an array of path patterns')
    return errors
  }
  const guarded = [...RELEASE_PATHS, ...SURFACE_PATHS, ...INDEX_PATHS, ...SITE_PATHS]
  for (const p of rwf) {
    if (typeof p !== 'string' || !p.startsWith('/') || p.includes('://') || p.includes(':')) {
      errors.push(`run_worker_first pattern '${p}' must be a plain /path pattern`)
      continue
    }
    if (p.split('*').length - 1 > 1) errors.push(`run_worker_first pattern '${p}': at most one splat allowed`)
    if (CANONICAL.includes(p)) continue
    // A pattern shadows release space when its literal prefix either contains
    // a tree's /apps root or is contained by it - covers /*, /<tree>*,
    // /*/apps/* and narrower /<tree>/apps/<id>/* forms alike.
    const lit = p.split('*')[0]
    for (const tree of TREES) {
      const canon = `/${tree}/apps`
      if (canon.startsWith(lit) || lit.startsWith(`${canon}/`))
        errors.push(`run_worker_first pattern '${p}' reaches into ${canon} without being the canonical route`)
    }
    let re
    try {
      re = patternRe(p)
    } catch {
      errors.push(`run_worker_first pattern '${p}': invalid`)
      continue
    }
    for (const path of guarded) if (re.test(path)) errors.push(`run_worker_first pattern '${p}' shadows ${path}`)
  }
  for (const c of CANONICAL) if (!rwf.includes(c)) errors.push(`run_worker_first is missing release route ${c}`)
  return errors
}

function checkConfig({ headersText, wranglerText }) {
  const errors = []
  const { rules, errors: hErrs } = headersText === null ? { rules: [], errors: [] } : parseHeadersFile(headersText)
  errors.push(...hErrs)
  // Every Cache-Control written in _headers must at least parse and be
  // internally consistent, on any path - release paths included (rules there
  // are dead under Worker routing, but broken directives are still defects).
  for (const r of rules)
    for (const e of r.entries)
      if (!e.detach && e.name === 'cache-control') {
        try {
          errors.push(...ccConflicts(directives(e.value)).map((m) => `${r.pattern}: ${m}`))
        } catch (err) {
          errors.push(`${r.pattern}: Cache-Control ${err.message}`)
        }
      }
  // The comma-joined effective value on every probed path must still parse and
  // be internally consistent - a later same-name directive silently replaces
  // an earlier one in a naive map, so conflicting duplicates are defects even
  // on release paths where _headers is dead config. Index and site paths also
  // keep short freshness; a long-cache or immutable rule leaking onto them is
  // a real defect.
  const shortFreshPaths = new Set([...INDEX_PATHS, ...SITE_PATHS])
  for (const path of [...shortFreshPaths, ...RELEASE_PATHS, ...SURFACE_PATHS]) {
    const cc = effective(rules, path).get('cache-control')
    if (cc === undefined) continue
    let map
    try {
      map = directives(cc)
    } catch (err) {
      errors.push(`${path}: Cache-Control ${err.message}`)
      continue
    }
    if (shortFreshPaths.has(path) && !freshEnough(map))
      errors.push(`${path}: Cache-Control '${cc}' pins long freshness on a non-release path`)
    errors.push(...ccConflicts(map).map((m) => `${path}: ${m}`))
  }
  let wrangler
  try {
    wrangler = parseJsonc(wranglerText)
  } catch (err) {
    errors.push(`wrangler.jsonc: ${err.message}`)
  }
  if (wrangler) {
    const assets = wrangler.assets ?? {}
    errors.push(...checkRunWorkerFirst(assets))
    // Wrangler resolves assets.directory relative to the wrangler.jsonc
    // location (the repo root here), so compare resolved paths - substring
    // checks accept siblings, nesting and traversal while wrongly rejecting
    // equivalent normalized spellings.
    const directory = typeof assets.directory === 'string' ? assets.directory : ''
    const expectedDirectory = resolve(process.cwd(), 'packages/web/dist/client')
    if (!directory || resolve(process.cwd(), directory) !== expectedDirectory)
      errors.push(`assets.directory '${assets.directory}' must resolve to packages/web/dist/client`)
    if (assets.binding !== 'ASSETS')
      errors.push("assets.binding must be 'ASSETS' - packages/web/worker.ts reaches the asset layer through env.ASSETS")
    if (assets.not_found_handling === 'single-page-application')
      errors.push('not_found_handling single-page-application would 200 a missing release with index.html')
    if (typeof wrangler.main !== 'string' || !existsSync(resolve(process.cwd(), wrangler.main)))
      errors.push(`main '${wrangler.main}' does not resolve to the Worker source`)
  }
  return { errors, wrangler }
}

// ---------- Worker behavior ----------
// Drive the real handler with a canned ASSETS binding: for every release path
// the emitted Cache-Control must be status-conditional, status and upstream
// headers preserved, and the body passed through byte-identical. Non-release
// paths and the blog range responder must be untouched.

const CONTRACT = 'public, max-age=31536000, immutable, no-transform'
const NULL_BODY = new Set([101, 204, 205, 304])
const BODY = new Uint8Array([0, 1, 2, 159, 200, 255, 7])

const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])

async function checkWorker(wrangler) {
  const errors = []
  let handler
  try {
    handler = (await import(pathToFileURL(resolve(process.cwd(), wrangler.main)).href)).default
  } catch (err) {
    return [`worker import failed: ${err.message}`]
  }
  if (typeof handler?.fetch !== 'function') return ['worker must export default { fetch }']
  const upstream = (status, headers = {}) =>
    new Response(NULL_BODY.has(status) ? null : BODY.slice(), {
      status,
      statusText: 'edge',
      headers: { 'content-type': 'text/html', etag: '"upstream"', ...headers }
    })
  const call = (path, status, init = {}) =>
    handler.fetch(new Request(`https://duo.doan-labs.com${path}`, init), {
      ASSETS: { fetch: async () => upstream(status, init.upstreamHeaders) }
    })
  for (const path of RELEASE_PATHS) {
    for (const [status, expected] of [
      [200, CONTRACT],
      [206, CONTRACT],
      [304, CONTRACT],
      [307, 'no-store'],
      [404, 'no-store'],
      [416, 'no-store'],
      [500, 'no-store']
    ]) {
      const res = await call(path, status)
      if (res.status !== status) errors.push(`${path} @${status}: status became ${res.status}`)
      if (res.headers.get('cache-control') !== expected)
        errors.push(`${path} @${status}: cache-control '${res.headers.get('cache-control')}'`)
      if (res.headers.get('etag') !== '"upstream"') errors.push(`${path} @${status}: upstream headers lost`)
      if (!NULL_BODY.has(status)) {
        const out = new Uint8Array(await res.arrayBuffer())
        if (!eq(out, BODY)) errors.push(`${path} @${status}: body was not a passthrough`)
      }
    }
    const head = await call(path, 200, { method: 'HEAD' })
    if (head.headers.get('cache-control') !== CONTRACT) errors.push(`${path} HEAD: cache-control lost`)
  }
  for (const path of [...INDEX_PATHS, ...SURFACE_PATHS, ...SITE_PATHS]) {
    const res = await call(path, 200, {
      upstreamHeaders: { 'cache-control': 'public, max-age=0, must-revalidate' }
    })
    if (res.headers.get('cache-control') !== 'public, max-age=0, must-revalidate')
      errors.push(`${path}: non-release Cache-Control changed to '${res.headers.get('cache-control')}'`)
    if (!eq(new Uint8Array(await res.arrayBuffer()), BODY)) errors.push(`${path}: body changed`)
  }
  const ranged = await call('/blog/film.mp4', 200, { headers: { range: 'bytes=0-3' } })
  if (ranged.status !== 206 || ranged.headers.get('content-range') !== `bytes 0-3/${BODY.length}`)
    errors.push('blog range responder regressed')
  return errors
}

// ---------- run ----------

const read = async (path) => (existsSync(path) ? await Bun.file(path).text() : null)
const real = {
  headersText: await read('packages/web/public/_headers'),
  wranglerText: await read('wrangler.jsonc')
}
const realResult = checkConfig(real)
const errors = [...realResult.errors]
if (realResult.wrangler) errors.push(...(await checkWorker(realResult.wrangler)))

// Unit-level assertions on the helpers themselves.
{
  assert(patternRe('/a/*').test('/a/x/y'))
  assert(!patternRe('/a/*').test('/ab/x'))
  assert(patternRe('/b/:p').test('/b/x'))
  assert(!patternRe('/b/:p').test('/b/x/y'))
  const joined = parseHeadersFile('/x\n  Cache-Control: public\n/x\n  Cache-Control: max-age=60\n').rules
  assert.equal(effective(joined, '/x').get('cache-control'), 'public, max-age=60')
  const detached = parseHeadersFile('/x\n  Cache-Control: public\n/x\n  ! Cache-Control\n').rules
  assert.equal(effective(detached, '/x').get('cache-control'), undefined)
  assert.throws(() => directives('immutable-ish'))
  assert.throws(() => directives('public, max-age=60, max-age=0'))
  assert.deepEqual(directives('public, max-age=60, max-age=60').get('max-age'), '60')
  assert.equal(ccConflicts(directives('public, private, max-age=0')).length, 1)
  assert.equal(ccConflicts(directives('private, max-age=60')).length, 0)
  assert.equal(ccConflicts(directives('no-cache="Set-Cookie", max-age=0')).length, 0)
  assert.deepEqual(directives('public, max-age=60').get('max-age'), '60')
}

// Fixture suite: positive and negative configs must pass/fail for the stated
// reason. Mutations mirror how the files are edited in practice.
const W = real.wranglerText
const H = '/healthcheck.txt\n  Cache-Control: no-store\n'
const withRwf = (value) =>
  W.replace(
    '"run_worker_first": ["/blog/*", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*"]',
    `"run_worker_first": ${value}`
  )
const FIXTURES = [
  ['committed config', null, W, true],
  ['unrelated exact-path rule', H, W, true],
  ['global nosniff', '/*\n  X-Content-Type-Options: nosniff\n', W, true],
  ['global frame-deny', '/*\n  X-Frame-Options: DENY\n', W, true],
  ['global short freshness is safe', '/*\n  Cache-Control: public, max-age=60\n', W, true],
  [
    'detach clears an earlier rule',
    '/*\n  Cache-Control: public, max-age=60\n/catalog/index.json\n  ! Cache-Control\n',
    W,
    true
  ],
  ['absolute https pattern', 'https://duo.doan-labs.com/health\n  X-Robots-Tag: noindex\n', W, true],
  ['placeholder pattern', '/blog/:slug\n  X-Robots-Tag: nosnippet\n', W, true],
  [
    'unrelated quoted string in wrangler',
    null,
    W.replace('"run_worker_first"', '"extra": "/catalog/not-a-pattern",\n    "run_worker_first"'),
    true
  ],
  ['jsonc comments tolerated', null, W.replace('"/blog/*"', '"/blog/*" /* still /blog/* */'), true],
  ['jsonc trailing commas tolerated', null, W.replace('"/preinstalled/apps/*"', '"/preinstalled/apps/*",'), true],
  [
    'extra non-overlapping worker route',
    null,
    withRwf('["/blog/*", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*", "/api/*"]'),
    true
  ],

  ['lookalike directives fail', '/x\n  Cache-Control: immutable-ish, no-transformer\n', W, false],
  ['immutable leak on indexes', '/*\n  Cache-Control: public, max-age=31536000, immutable, no-transform\n', W, false],
  ['bare immutable leak', '/*\n  Cache-Control: immutable\n', W, false],
  ['targeted index leak', '/catalog/index.json\n  Cache-Control: public, max-age=86400\n', W, false],
  ['no-store contradicts immutable', '/x\n  Cache-Control: no-store, immutable\n', W, false],
  ['immutable without max-age', '/x\n  Cache-Control: immutable\n', W, false],
  [
    'joined conflicting index freshness across matching rules',
    '/catalog/index.json\n  Cache-Control: public, max-age=31536000\n/catalog/index.json\n  Cache-Control: max-age=0\n',
    W,
    false
  ],
  [
    'conflicting index freshness within one rule',
    '/catalog/index.json\n  Cache-Control: public, max-age=31536000\n  Cache-Control: max-age=0\n',
    W,
    false
  ],
  [
    'conflicting freshness on a release path',
    '/catalog/apps/*\n  Cache-Control: public, max-age=31536000\n  Cache-Control: max-age=0\n',
    W,
    false
  ],
  [
    'identical duplicate directives tolerated',
    '/catalog/index.json\n  Cache-Control: public, max-age=60\n/catalog/index.json\n  Cache-Control: max-age=60\n',
    W,
    true
  ],
  ['non-integer max-age', '/x\n  Cache-Control: max-age=abc\n', W, false],
  ['empty directive value', '/x\n  Cache-Control:\n', W, false],
  ['two splats in one pattern', '/catalog/*/apps/*\n  Cache-Control: no-store\n', W, false],
  ['pattern without leading slash', 'catalog/apps/*\n  Cache-Control: no-store\n', W, false],
  ['header entry without colon', '/x\n  NotAHeader\n', W, false],
  ['malformed detach', '/x\n  ! Cache Control\n', W, false],
  ['over 100 rules', Array.from({ length: 101 }, (_, i) => `/r${i}\n  X-A: 1`).join('\n'), W, false],
  ['run_worker_first: true', null, withRwf('true'), false],
  ['run_worker_first /*', null, withRwf('["/*"]'), false],
  [
    'run_worker_first /catalog*',
    null,
    withRwf('["/blog/*", "/catalog*", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*"]'),
    false
  ],
  [
    'run_worker_first /catalog/apps exact',
    null,
    withRwf('["/blog/*", "/catalog/apps", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*"]'),
    false
  ],
  [
    'run_worker_first /*/apps/*',
    null,
    withRwf('["/blog/*", "/*/apps/*", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*"]'),
    false
  ],
  [
    'run_worker_first narrower release shadow',
    null,
    withRwf('["/blog/*", "/catalog/apps/x/*", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*"]'),
    false
  ],
  [
    'run_worker_first /cdn/*',
    null,
    withRwf('["/blog/*", "/cdn/*", "/catalog/apps/*", "/cdn/apps/*", "/preinstalled/apps/*"]'),
    false
  ],
  ['missing a canonical release route', null, withRwf('["/blog/*", "/catalog/apps/*", "/cdn/apps/*"]'), false],
  ['run_worker_first absent', null, W.replace(/"run_worker_first":.*\n/, ''), false],
  ['run_worker_first not an array', null, withRwf('"/blog/*"'), false],
  ['malformed jsonc', null, W.replace('"run_worker_first"', '"run_worker_first'), false],
  ['assets.directory moved', null, W.replace('./packages/web/dist/client', './dist'), false],
  [
    'assets.directory sibling name',
    null,
    W.replace('./packages/web/dist/client', './packages/web/dist/client-old'),
    false
  ],
  [
    'assets.directory nested under target',
    null,
    W.replace('./packages/web/dist/client', './packages/web/dist/client/unintended'),
    false
  ],
  [
    'assets.directory traversal escapes target',
    null,
    W.replace('./packages/web/dist/client', './packages/web/dist/client/../unintended'),
    false
  ],
  [
    'assets.directory equivalent normalized spelling',
    null,
    W.replace('./packages/web/dist/client', './packages/web/dist/./client/'),
    true
  ],
  ['assets.directory wrong build root', null, W.replace('./packages/web/dist/client', './dist/client'), false],
  ['public and private together', '/apps\n  Cache-Control: public, private, max-age=0\n', W, false],
  ['private alone is valid', '/x\n  Cache-Control: private, max-age=60\n', W, true],
  ['rfc-qualified no-cache is valid', '/x\n  Cache-Control: no-cache="Set-Cookie", max-age=0\n', W, true],
  [
    'spa fallback on misses',
    null,
    W.replace('"not_found_handling": "none"', '"not_found_handling": "single-page-application"'),
    false
  ],
  ['assets.binding removed', null, W.replace('"binding": "ASSETS",\n', ''), false],
  ['asset binding renamed', null, W.replace('"binding": "ASSETS"', '"binding": "DIFFERENT_ASSETS"'), false],
  ['main resolves nowhere', null, W.replace('./packages/web/worker.ts', './packages/web/nope.ts'), false]
]

let fixtureFailures = 0
for (const [name, headersText, wranglerText, shouldPass] of FIXTURES) {
  const { errors: fe } = checkConfig({ headersText, wranglerText })
  const passed = fe.length === 0
  if (passed !== shouldPass) {
    fixtureFailures++
    console.error(
      `FIXTURE ${shouldPass ? 'should pass' : 'should fail'} but ${passed ? 'passed' : `failed: ${fe[0]}`} - ${name}`
    )
  }
}
if (fixtureFailures) errors.push(`${fixtureFailures} fixture(s) diverged`)

if (errors.length) {
  for (const e of errors) console.error(`FAIL ${e}`)
  process.exit(1)
}
console.log(
  `Hosted release serving verified: ${RELEASE_PATHS.length} release paths x statuses status-conditional, ${FIXTURES.length} config fixtures, indexes/pages short-fresh`
)
