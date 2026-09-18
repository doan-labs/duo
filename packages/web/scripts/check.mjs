// Website check: every route renders without page errors at three widths in both
// colour schemes, text keeps WCAG contrast, the nav links resolve, every internal
// link on every page answers 200, the docs render tables and code, the theme
// toggle sticks across a reload, reduced motion leaves nothing hidden, the
// launch page tells its story in order and its posture buttons drive the
// readout, the phone-width hero video and its poster download, the display font
// loads, the HTML ships rendered without JS, the embedded shell takes the
// page's backdrop over the bridge, and a screenshot of each page lands in
// .cache/debug/web/.
//   bun scripts/check.mjs [http://localhost:3001]   (production preview: http://localhost:3011)
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const base = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '')
const out = new URL('../../../.cache/debug/web/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1100 },
  { name: 'phone', width: 390, height: 844 }
]
const PAGES = [
  '/',
  '/apps',
  '/get-started',
  '/docs',
  '/docs/platform/manifest',
  '/docs/platform/progress/contract',
  '/kit',
  '/kit/Nav',
  '/sdk',
  '/publish',
  '/guidelines',
  '/changelog',
  '/simulator'
]

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars']
})
let failures = 0
const fail = (msg) => {
  failures++
  console.log('FAIL', msg)
}

const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
// The simulator frame is the shell's own concern (and needs its own server): block it here so the check is about the site.
await page.setRequestInterception(true)
page.on('request', (r) => (r.frame() !== page.mainFrame() ? r.abort() : r.continue()))

// Runs in the page: WCAG contrast of an element's text against the first
// ancestor that actually paints a background. Transparency is walked through,
// not blended — an element over a translucent layer reads the layer below it.
const PROBE = () => {
  const rgb = (s) => (s.match(/[\d.]+/g) ?? []).map(Number)
  const lum = ([r, g, b]) =>
    [r, g, b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor)
      if (c.length && (c[3] ?? 1) > 0) return c
    }
    return [255, 255, 255]
  }
  const ratio = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(bgOf(el))]
    return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) + Number.EPSILON) * 100) / 100
  }
  return {
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60),
    navLinks: [...document.querySelectorAll('header nav a')].length,
    menuVisible: getComputedStyle(document.querySelector('header details')).display !== 'none',
    listVisible: getComputedStyle(document.querySelector('header ul')).display !== 'none',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    tables: document.querySelectorAll('main table').length,
    pres: document.querySelectorAll('main pre').length,
    links: [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href')),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    story: [...document.querySelectorAll('main > section[aria-labelledby]')].map((s) =>
      s.getAttribute('aria-labelledby')
    ),
    simulators: document.querySelectorAll('[data-simulator]').length,
    contrast: { h1: ratio('h1'), p: ratio('main p'), a: ratio('main a') }
  }
}
const MIN = { h1: 3, p: 4.5, a: 4.5 }
// The launch page's sections, by the id of the headline each is labelled by.
const STORY = [
  'hero-title',
  'works-title',
  'camera-title',
  'store-title',
  'fold-title',
  'build-title',
  'sdk-title',
  'apps-title',
  'open-title',
  'cta-title'
]
const scheme = (s) => page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: s }])

const seen = new Set()
let shots = 0
for (const path of PAGES) {
  const bgs = {}
  for (const s of ['light', 'dark'])
    for (const w of WIDTHS) {
      errors.length = 0
      await scheme(s)
      await page.setViewport({ width: w.width, height: w.height, deviceScaleFactor: 1 })
      const res = await page.goto(base + path, { waitUntil: 'networkidle0', timeout: 60000 })
      if (res?.status() !== 200) fail(`${path} ${w.name} ${s}: status ${res?.status()}`)
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => fail(`${path} ${w.name} ${s}: no h1`))
      const state = await page.evaluate(PROBE)
      if (errors.length) fail(`${path} ${w.name} ${s}: ${errors.join(' | ')}`)
      if (state.overflow) fail(`${path} ${w.name} ${s}: horizontal overflow`)
      if (w.width < 1069 ? !state.menuVisible || state.listVisible : state.menuVisible || !state.listVisible)
        fail(`${path} ${w.name} ${s}: nav layout wrong for width`)
      if (path.startsWith('/docs/platform/') && (state.tables === 0 || state.pres === 0))
        fail(`${path}: expected tables and code blocks, got ${state.tables}/${state.pres}`)
      if (path === '/' && state.story.join() !== STORY.join())
        fail(`home ${w.name}: sections out of order or missing: ${state.story.join(' ')}`)
      // Wide screens get the real shell three times; the phone gets the video in the hero.
      if (path === '/' && state.simulators !== (w.width < 735 ? 2 : 3))
        fail(`home ${w.name}: ${state.simulators} simulator frames`)
      // Contrast is a property of the theme, not the width: check it once per scheme.
      if (w.name === 'desktop') {
        bgs[s] = state.bodyBg
        for (const [k, min] of Object.entries(MIN)) {
          const got = state.contrast[k]
          // Not every page links from its body; the other two are always there.
          if (got === null && k !== 'a') fail(`${path} ${s}: no ${k} to measure contrast on`)
          else if (got !== null && got < min) fail(`${path} ${s}: ${k} contrast ${got} < ${min}`)
        }
      }
      for (const l of state.links) seen.add(l.split('#')[0])
      await page.screenshot({
        path: `${out}${path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')}-${w.name}-${s}.png`,
        fullPage: w.name !== 'desktop'
      })
      shots++
      if (w.name === 'desktop')
        console.log(`${path} @${w.name} ${s}: ${state.h1} · ${state.title} · bg ${state.bodyBg}`)
    }
  if (bgs.light === bgs.dark) fail(`${path}: body background is ${bgs.light} in both schemes`)
  // The mobile menu opens with one tap and lists every section.
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(base + path, { waitUntil: 'networkidle0' })
  await page.click('header summary')
  const open = await page.evaluate(
    () => document.querySelector('header details')?.open && document.querySelectorAll('header details a').length
  )
  if (!open || open < 5) fail(`${path}: mobile menu did not open with links (${open})`)
}

// Every internal link found on the pages answers 200 with an h1. /device is the
// copied shell, not a page of this site; embed.mjs in .cache/debug/web proves it boots.
for (const href of [...seen].filter((h) => !h.startsWith('/device')).sort()) {
  const res = await page.goto(base + href, { waitUntil: 'domcontentloaded' })
  const ok = res && res.status() === 200 && (await page.$('h1'))
  if (!ok) fail(`link ${href}: ${res?.status()}`)
}
console.log(`${seen.size} internal links checked`)

// Client-side navigation: clicking the nav swaps pages without a reload.
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`${base}/`, { waitUntil: 'networkidle0' })
await page.evaluate(() => {
  window.__mark = 1
})
await page.click('header nav a[href="/get-started"]')
await page.waitForFunction(() => location.pathname === '/get-started' && !!document.querySelector('h1'))
const spa = await page.evaluate(() => window.__mark === 1)
if (!spa) fail('nav click reloaded the document instead of routing')
console.log('client-side navigation ok')

// The theme toggle: from the system default (dark here) one click picks light,
// the pick survives a reload through localStorage, and the run leaves no trace.
await scheme('dark')
await page.goto(`${base}/`, { waitUntil: 'networkidle0' })
// Frames are blocked, so the network goes idle before the bundle has hydrated: wait for React to own the button.
await page.waitForFunction(() =>
  Object.keys(document.querySelector('header button') ?? {}).some((k) => k.startsWith('__reactFiber'))
)
const before = await page.evaluate(() => ({
  cls: [...document.documentElement.classList].filter((c) => !c.startsWith('lenis')).join(' '),
  bg: getComputedStyle(document.body).backgroundColor
}))
const toggle = await page.$('header button[aria-label*="heme"]')
if (!toggle) fail('theme toggle: no button with a theme aria-label in the nav')
else {
  await toggle.click()
  await new Promise((r) => setTimeout(r, 300))
  const after = await page.evaluate(() => ({
    cls: [...document.documentElement.classList].filter((c) => !c.startsWith('lenis')).join(' '),
    bg: getComputedStyle(document.body).backgroundColor,
    saved: localStorage.getItem('ipduo-theme')
  }))
  if (after.cls === before.cls) fail(`theme toggle: <html> class unchanged (${after.cls || 'empty'})`)
  if (after.bg === before.bg) fail(`theme toggle: body background stayed ${after.bg}`)
  if (after.saved !== 'light') fail(`theme toggle: localStorage ipduo-theme is ${after.saved}, expected light`)
  await page.reload({ waitUntil: 'networkidle0' })
  const kept = await page.evaluate(() => ({
    cls: [...document.documentElement.classList].filter((c) => !c.startsWith('lenis')).join(' '),
    bg: getComputedStyle(document.body).backgroundColor
  }))
  if (kept.cls !== after.cls || kept.bg !== after.bg)
    fail(`theme toggle: reload lost the pick (${kept.cls || 'empty'} / ${kept.bg})`)
  console.log(`theme toggle ok: ${before.bg} → ${after.bg}, kept across reload`)
}
await page.evaluate(() => localStorage.removeItem('ipduo-theme'))

// Reduced motion: the content is text, not an animation. Nothing in main may be
// left transparent, and the decorative hero loop stays still.
await scheme('light')
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'light' },
  { name: 'prefers-reduced-motion', value: 'reduce' }
])
await page.goto(`${base}/`, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 600))
const still = await page.evaluate(() => {
  // Frames are blocked in this run and stay transparent until they load; that is the site's own fade, not motion.
  // The CSS device's screens fade with the hinge: state, not motion. Same for frames not yet loaded.
  const hidden = [...document.querySelectorAll('main *')]
    .filter((el) => el.tagName !== 'IFRAME' && !el.closest('[data-device]') && getComputedStyle(el).opacity === '0')
    .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 40)}`)
  const v = document.querySelector('video')
  return { hidden: hidden.slice(0, 5), count: hidden.length, video: v && { paused: v.paused, autoplay: v.autoplay } }
})
if (still.count) fail(`reduced motion: ${still.count} element(s) in main at opacity 0 — ${still.hidden.join(', ')}`)
if (still.video && !still.video.paused && still.video.autoplay) fail('reduced motion: hero video is playing')
console.log('reduced motion ok: nothing hidden, hero video still')
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])

// The posture buttons on the launch page: picking Closed flips the pressed state and the readout.
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`${base}/`, { waitUntil: 'networkidle0' })
const buttons = await page.$$('fieldset[aria-label="Posture"] button')
if (buttons.length !== 4) fail(`fold: ${buttons.length} posture buttons, expected 4`)
else {
  await buttons[3].click()
  await new Promise((r) => setTimeout(r, 200))
  const fold = await page.evaluate(() => ({
    pressed: [...document.querySelectorAll('fieldset[aria-label="Posture"] button')].map((b) =>
      b.getAttribute('aria-pressed')
    ),
    mode: [...document.querySelectorAll('#fold-title ~ div dd')][0]?.textContent
  }))
  if (fold.pressed.join() !== 'false,false,false,true' || fold.mode !== '"closed"')
    fail(`fold: after Closed, pressed=${fold.pressed.join()} mode=${fold.mode}`)
  else console.log('fold posture buttons ok: Closed → mode "closed"')
}

// The hero video and its poster, at phone width where the WebGL shell gives way to it.
await page.setViewport({ width: 390, height: 844 })
await page.goto(`${base}/`, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 300))
const hero = await page.evaluate(() => {
  const v = document.querySelector('video')
  if (!v) return null
  return {
    poster: v.getAttribute('poster'),
    sources: [...v.querySelectorAll('source')].map((s) => ({ src: s.getAttribute('src'), type: s.type }))
  }
})
if (!hero) fail('hero: no <video> on the home page')
else {
  if (!hero.poster) fail('hero: <video> has no poster')
  for (const type of ['video/webm', 'video/mp4'])
    if (!hero.sources.some((s) => s.type === type)) fail(`hero: no ${type} source`)
  for (const url of [hero.poster, ...hero.sources.map((s) => s.src)].filter(Boolean)) {
    const r = await fetch(base + url)
    // The dev server streams without a length header; fall back to the body.
    const len = Number(r.headers.get('content-length')) || (await r.arrayBuffer()).byteLength
    if (r.status !== 200 || len === 0) fail(`hero asset ${url}: status ${r.status}, ${len} bytes`)
    else console.log(`hero asset ${url}: ${Math.round(len / 1024)} KB`)
  }
}

// The display font: loaded, not silently falling back to the system stack.
const font = await page.evaluate(async () => {
  await document.fonts.ready
  return navigator.onLine ? document.fonts.check('16px "Inter Tight"') : null
})
if (font === null) console.log('font check skipped (offline)')
else if (!font) fail('font: "Inter Tight" is not loaded after document.fonts.ready')
else console.log('font ok: Inter Tight loaded')

// The bridge: with frames allowed, the hero shell loads and paints the page's
// backdrop behind the device (packages/shell/main.ts listens for { bg, deg, yaw }).
await page.setViewport({ width: 1440, height: 900 })
const live = await browser.newPage()
await live.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
await live.setViewport({ width: 1440, height: 900 })
await live.goto(`${base}/`, { waitUntil: 'networkidle0', timeout: 120000 })
const bridge = await live
  .waitForFunction(
    () => {
      const f = document.querySelector('iframe')
      const bg = getComputedStyle(document.body).backgroundColor
      return f?.contentDocument?.querySelector('canvas') && f.contentDocument.body.style.background === bg && bg
    },
    { timeout: 90000 }
  )
  .then((h) => h.jsonValue())
  .catch(() => null)
if (!bridge) fail('bridge: the hero shell did not take the page backdrop')
else console.log(`bridge ok: hero shell painted ${bridge} behind the device`)
await live.close()

// Rendered without JS: the HTML that leaves the server already has the page in it.
for (const path of ['/', '/docs']) {
  await page.goto(base + path, { waitUntil: 'networkidle0' })
  const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim())
  const html = await (await fetch(base + path)).text()
  // A headline may carry a <br>, so match its first words rather than the joined text.
  if (!h1 || !html.includes(h1.slice(0, 24))) fail(`no-JS ${path}: h1 "${h1}" missing from the served HTML`)
  const links = new Set([...html.matchAll(/<a[^>]+href="(\/[^"#]*)"/g)].map((m) => m[1]))
  if (links.size < 5) fail(`no-JS ${path}: only ${links.size} internal links in the served HTML`)
  else console.log(`no-JS ${path}: h1 and ${links.size} links in the raw HTML`)
}

await browser.close()
console.log(
  failures
    ? `${failures} failures`
    : `PASS · ${PAGES.length} routes × ${WIDTHS.length} widths × 2 schemes, ${shots} screenshots, ${seen.size} links`,
  '→',
  out
)
process.exit(failures ? 1 : 0)
