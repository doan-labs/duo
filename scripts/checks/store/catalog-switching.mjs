// The complete Store journey in headless Chromium: the default catalog is the assembled
// /catalog tree (bundled Notes and Weather plus a published community app), the community
// app installs from it, a developer catalog replaces the rows and "Back to Duo catalog"
// returns, and an update offered by a different origin is refused with both origins named.
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { buildApp } from '../../build-app.ts'
import { publish } from '../../publish-catalog.ts'

const id = 'labs.doan.fold-compass'
const scratch = resolve(`.cache/store-check/${crypto.randomUUID()}`)
await mkdir(scratch, { recursive: true })
const evidence = resolve(process.env.STORE_EVIDENCE_DIR ?? '.cache/debug/store')
await mkdir(evidence, { recursive: true })

// The curated tree the site would serve: bundled releases plus the example submission.
const tree = join(scratch, 'catalog')
await publish('dist/cdn', tree)
const first = await buildApp('community-apps/fold-compass', { output: join(scratch, 'built-1') })
await publish(join(scratch, 'built-1'), tree)
// A developer's own catalog with a newer version of the same app, on another origin.
const app = join(scratch, 'app')
for (const file of ['main.tsx', 'icon.png', 'package.json'])
  await Bun.write(join(app, file), Bun.file(`community-apps/fold-compass/${file}`))
const manifest = await Bun.file('community-apps/fold-compass/manifest.json').json()
await Bun.write(join(app, 'manifest.json'), JSON.stringify({ ...manifest, version: '1.1.0' }))
await buildApp(app, { output: join(scratch, 'developer') })

const serve = (routes, port) =>
  Bun.serve({
    port,
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname)
      if (path.includes('..')) return new Response('Forbidden', { status: 403 })
      const [prefix, base] = Object.entries(routes).find(([p]) => path.startsWith(p)) ?? ['', routes['']]
      const file = Bun.file(join(base, path === '/' ? 'index.html' : path.slice(prefix.length)))
      return (await file.exists())
        ? new Response(file, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
        : new Response('Not found', { status: 404 })
    }
  })
const shell = serve({ '/catalog/': tree, '': resolve('dist') }, 3141)
const developer = serve({ '': join(scratch, 'developer') }, 3142)
const url = `http://localhost:${shell.port}/`
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  userDataDir: await mkdtemp(join(tmpdir(), 'duo-store-')),
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
})
const checks = []
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 818, height: 664 })
  const storeText = () => page.evaluate(() => document.querySelector('[data-app="App Store"]')?.innerText ?? '')
  const rows = () =>
    page.evaluate(() => [...document.querySelectorAll('[data-store-app]')].map((e) => e.dataset.storeApp))
  const button = async (label, scope = '') => {
    await page.waitForFunction(
      ({ label, scope }) =>
        [...document.querySelectorAll(`${scope} button`)].some((b) => b.textContent.trim() === label),
      { timeout: 45000 },
      { label, scope }
    )
    await page.evaluate(
      ({ label, scope }) =>
        [...document.querySelectorAll(`${scope} button`)].find((b) => b.textContent.trim() === label).click(),
      { label, scope }
    )
  }
  const loadCatalog = async (catalogUrl) => {
    await page.evaluate((catalogUrl) => {
      const input = document.querySelector('[aria-label="Developer catalog URL"]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, catalogUrl)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.closest('form').requestSubmit()
    }, catalogUrl)
  }

  await page.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await page.waitForSelector(`[data-store-app="${id}"]`, { timeout: 60000 })
  const listed = await rows()
  assert.ok(listed.includes('labs.doan.ipduo.notes') && listed.includes(id), `default rows: ${listed}`)
  assert.match(await storeText(), /Duo catalog/)
  await page.screenshot({ path: join(evidence, 'default-catalog.png') })
  checks.push('Default Store lists bundled apps and the published community app from /catalog and names the source')

  await button('GET', `[data-store-app="${id}"]`)
  await button('OPEN', `[data-store-app="${id}"]`)
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
  await page.screenshot({ path: join(evidence, 'installed-from-default.png') })
  checks.push('The community app installs and launches from the default catalog')

  await page.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await page.waitForSelector('[aria-label="Developer catalog URL"]', { timeout: 60000 })
  await loadCatalog(`http://localhost:${developer.port}/index.json`)
  await page.waitForFunction(() => document.body.innerText.includes('Back to Duo catalog'), { timeout: 30000 })
  // Installed apps stay listed whichever catalog is selected; the developer catalog's newer version shows for ours.
  await page.waitForFunction(
    (id) => document.querySelector(`[data-store-app="${id}"]`)?.innerText.includes('1.1.0'),
    { timeout: 30000 },
    id
  )
  assert.match(await storeText(), new RegExp(`localhost:${developer.port}`))
  await page.screenshot({ path: join(evidence, 'developer-catalog.png') })
  checks.push('A developer catalog replaces the rows, shows its URL and offers Back to Duo catalog')

  await button('UPDATE', `[data-store-app="${id}"]`)
  await page.waitForSelector(`[data-store-app="${id}"] [role="alert"]`, { timeout: 30000 })
  const alert = await page.$eval(`[data-store-app="${id}"] [role="alert"]`, (e) => e.textContent)
  assert.match(alert, /installed catalog origin/)
  assert.match(alert, new RegExp(`localhost:${shell.port}`))
  assert.match(alert, new RegExp(`localhost:${developer.port}`))
  assert.match(alert, /Remove App/)
  await page.screenshot({ path: join(evidence, 'origin-conflict.png') })
  checks.push('An update from another origin is refused with both origins and the supported transition named')

  await button('Back to Duo catalog')
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-store-app]')].some((e) => e.dataset.storeApp === 'labs.doan.ipduo.weather'),
    { timeout: 30000 }
  )
  assert.match(await storeText(), /Duo catalog/)
  assert.ok((await rows()).includes(id))
  await page.screenshot({ path: join(evidence, 'back-to-duo.png') })
  checks.push('Back to Duo catalog restores the default rows; the installed app keeps its source')
  await Bun.write(
    join(evidence, 'evidence.json'),
    JSON.stringify({ release: `${first.release.manifest.version}+${first.release.build.hash}`, checks }, null, 2)
  )
  console.log('Catalog switching PASS', JSON.stringify(checks, null, 2))
} catch (error) {
  const page = (await browser.pages()).at(-1)
  if (page && !page.isClosed()) {
    console.log(await page.evaluate(() => document.body.innerText.slice(-2000)))
    await page.screenshot({ path: join(evidence, 'failure.png') }).catch(() => {})
  }
  throw error
} finally {
  await browser.close()
  shell.stop(true)
  developer.stop(true)
  await rm(scratch, { recursive: true, force: true })
}
