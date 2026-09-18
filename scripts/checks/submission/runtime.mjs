// Runtime evidence for one built submission: serve the built shell (dist/) and the
// submission's catalog, install through the real Store, launch, capture the inner and
// cover displays, and record console errors and any app-frame request outside the
// declared network origins.
//   bun scripts/checks/submission/runtime.mjs <app-id> <catalog-dir> <evidence-dir>
import assert from 'node:assert/strict'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const [id, catalogDir, evidenceDir] = process.argv.slice(2)
assert.ok(id && catalogDir && evidenceDir, 'Usage: runtime.mjs <app-id> <catalog-dir> <evidence-dir>')
const evidence = resolve(evidenceDir)
await mkdir(evidence, { recursive: true })
const manifest = await Bun.file(join(catalogDir, 'index.json')).json()
const listed = manifest.apps[id]
assert.ok(listed, `${id} is not in ${catalogDir}/index.json`)
const releaseFile = join(catalogDir, 'apps', id, listed.releases[0].release, 'release.json')
const declared = new Set((await Bun.file(releaseFile).json()).manifest.network ?? [])

const serve = (base, port) =>
  Bun.serve({
    port,
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname)
      if (path.includes('..')) return new Response('Forbidden', { status: 403 })
      const file = Bun.file(join(base, path === '/' ? 'index.html' : path))
      return (await file.exists())
        ? new Response(file, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
        : new Response('Not found', { status: 404 })
    }
  })
const shell = serve(resolve('dist'), Number(process.env.SHELL_PORT ?? 3131))
const catalog = serve(resolve(catalogDir), Number(process.env.CATALOG_PORT ?? 3132))
const url = `http://localhost:${shell.port}/`
const profile = await mkdtemp(join(tmpdir(), 'duo-submission-'))
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  userDataDir: profile,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
})
const result = { id, release: listed.releases[0].release, console: [], network: [], violations: [], captures: [] }
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 818, height: 664 })
  page.on('console', (message) => {
    if (['error', 'warn'].includes(message.type())) result.console.push(message.text().slice(0, 500))
  })
  page.on('pageerror', (error) => result.console.push(`pageerror: ${error.message}`))
  page.on('request', (request) => {
    if (request.frame() === page.mainFrame()) return
    const target = request.url()
    if (/^(blob|data|about):/.test(target)) return
    const origin = new URL(target).origin
    result.network.push(target)
    if (!declared.has(origin)) result.violations.push(target)
  })
  await page.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await page.waitForSelector('[aria-label="Developer catalog URL"]', { timeout: 60000 })
  await page.evaluate((catalogUrl) => {
    const input = document.querySelector('[aria-label="Developer catalog URL"]')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, catalogUrl)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.closest('form').requestSubmit()
  }, `http://localhost:${catalog.port}/index.json`)
  await page.waitForSelector(`[data-store-app="${id}"]`, { timeout: 30000 })
  const press = async (label) => {
    await page.waitForFunction(
      ({ id, label }) =>
        [...(document.querySelector(`[data-store-app="${id}"]`)?.querySelectorAll('button') ?? [])].some(
          (b) => b.textContent.trim() === label
        ),
      { timeout: 45000 },
      { id, label }
    )
    await page.evaluate(
      ({ id, label }) =>
        [...document.querySelector(`[data-store-app="${id}"]`).querySelectorAll('button')]
          .find((b) => b.textContent.trim() === label)
          .click(),
      { id, label }
    )
  }
  await press('GET')
  await press('OPEN')
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
  await new Promise((r) => setTimeout(r, 1500))
  await page.screenshot({ path: join(evidence, 'inner.png') })
  result.captures.push('inner.png')
  const hinge = await page.$('[aria-label="Hinge angle"]')
  assert.ok(hinge, 'Hinge angle control not found')
  await page.evaluate(() => {
    const input = document.querySelector('[aria-label="Hinge angle"]')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '0')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  // The hinge eases to its target; capture once the shell's readout says it arrived.
  await page.waitForFunction(
    () => [...document.querySelectorAll('output, span')].some((e) => e.textContent.trim() === '0°'),
    {
      timeout: 15000
    }
  )
  await new Promise((r) => setTimeout(r, 800))
  await page.screenshot({ path: join(evidence, 'cover.png') })
  result.captures.push('cover.png')
  const frames = page.frames().filter((f) => f.parentFrame())
  result.frameText = await Promise.all(
    frames.map((f) => f.evaluate(() => document.body?.innerText.slice(0, 400) ?? '').catch(() => ''))
  )
  assert.ok(
    result.frameText.some((text) => text.trim().length > 0),
    'App rendered no text on either display'
  )
  assert.deepEqual(result.violations, [], 'App frame requested an undeclared origin')
  const fatal = result.console.filter((line) => line.startsWith('pageerror'))
  assert.deepEqual(fatal, [], 'Page errors during launch')
  result.pass = true
  console.log(`Runtime PASS ${id} ${result.release}: inner and cover captured, ${result.network.length} app requests`)
} catch (error) {
  result.pass = false
  result.error = String(error)
  const page = (await browser.pages()).at(-1)
  if (page && !page.isClosed()) await page.screenshot({ path: join(evidence, 'failure.png') }).catch(() => {})
  console.log(`Runtime FAIL ${id}: ${error.message}`)
  process.exitCode = 1
} finally {
  await Bun.write(join(evidence, 'runtime.json'), JSON.stringify(result, null, 2))
  await browser.close()
  shell.stop(true)
  catalog.stop(true)
}
