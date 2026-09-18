import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import puppeteer from 'puppeteer-core'
import { PREVIEW_FEATURES } from '../../../packages/sdk/preview-features.ts'
import { buildApp } from '../../build-app.ts'

const id = 'dev.independent.fold-compass'
const cache = resolve(process.env.MVP_EVIDENCE_DIR ?? '.cache/debug/stage2/mvp')
await mkdir(cache, { recursive: true })
async function hashes(directory) {
  const files = {}
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) Object.assign(files, await hashes(path))
    else
      files[path] = createHash('sha256')
        .update(new Uint8Array(await Bun.file(path).arrayBuffer()))
        .digest('hex')
  }
  return files
}
// Build the simulator before running this check. Nothing below writes its source or dist.
assert.ok(await Bun.file('dist/index.html').exists(), 'Run bun run build first')
const before = await hashes(resolve('dist'))
const project = join(tmpdir(), `duo-independent-${crypto.randomUUID()}`)
await cp('examples/fold-compass', project, { recursive: true })
const artifacts = await Bun.file(
  process.env.PLATFORM_ARTIFACTS ?? '.cache/platform-packages/final/artifacts.json'
).json()
const overrides = Object.fromEntries(Object.entries(artifacts).map(([name, path]) => [name, `file:${path}`]))
const manifest = await Bun.file(join(project, 'package.json')).json()
await Bun.write(join(project, 'package.json'), JSON.stringify({ ...manifest, overrides }))
const install = Bun.spawn(['bun', 'install', '--ignore-scripts'], {
  cwd: project,
  stdout: 'inherit',
  stderr: 'inherit'
})
assert.equal(await install.exited, 0, 'Install local package artifacts in the independent project')
const output = `${cache}/catalog-${Date.now()}`
const bundle = await buildApp(project, { output })
let forbiddenRequests = 0
function serve(root, port) {
  const base = resolve(root)
  return Bun.serve({
    port,
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname)
      if (path === '/sentinel') forbiddenRequests++
      const full = resolve(base, `.${path === '/' ? '/index.html' : path}`)
      if (!full.startsWith(base + sep)) return new Response('Refused', { status: 403 })
      const file = Bun.file(full)
      return (await file.exists())
        ? new Response(file, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
        : new Response('Not found', { status: 404 })
    }
  })
}
const shell = serve('dist', 3111)
const catalog = serve(output, 3112)
const evidence = {
  project,
  bundleBytes: bundle.bytes,
  catalog: 'http://localhost:3112/index.json',
  simulatorFiles: Object.keys(before).length,
  checks: {}
}
await Bun.write(`${cache}/independent-build.json`, JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence, null, 2))
if (!process.argv.includes('--serve')) {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
  })
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 818, height: 664, deviceScaleFactor: 1 })
    page.on('pageerror', (error) => console.log('pageerror', error.message))
    await page.evaluateOnNewDocument(() => {
      if (self === top && location.hostname === 'localhost')
        localStorage.setItem('duo.notes.field-note', 'Private Notes sentinel')
    })
    await page.goto('http://localhost:3111/?debug&app=App%20Store&deg=180', { timeout: 120000 })
    await page.waitForSelector('[aria-label="Developer catalog URL"]', { timeout: 60000 })
    await page.evaluate(() => {
      const field = document.querySelector('[aria-label="Developer catalog URL"]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
        field,
        'http://localhost:3112/index.json'
      )
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.evaluate(() =>
      document.querySelector('[aria-label="Developer catalog URL"]').closest('form').requestSubmit()
    )
    await page.waitForSelector(`[data-store-app="${id}"]`)
    await page.evaluate(
      (id) =>
        [...document.querySelector(`[data-store-app="${id}"]`).querySelectorAll('button')]
          .find((b) => b.textContent.trim() === 'GET')
          .click(),
      id
    )
    await page.waitForFunction(
      (id) =>
        [...document.querySelector(`[data-store-app="${id}"]`).querySelectorAll('button')].some(
          (b) => b.textContent.trim() === 'OPEN'
        ),
      {},
      id
    )
    await page.screenshot({ path: `${cache}/installed.png` })
    await page.evaluate(
      (id) =>
        [...document.querySelector(`[data-store-app="${id}"]`).querySelectorAll('button')]
          .find((b) => b.textContent.trim() === 'OPEN')
          .click(),
      id
    )
    await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
      timeout: 60000
    })
    const frames = page.frames().filter((frame) => frame.parentFrame())
    const initialViews = await page.$$eval('iframe', (elements) => elements.map((element) => element.dataset.view))
    const inner = frames[0]
    await inner.waitForSelector('[data-demo="fold-compass"]')
    assert.equal(await inner.$eval('[aria-label="Field note"]', (field) => field.value), '')
    await inner.evaluate(() => {
      const field = document.querySelector('[aria-label="Field note"]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, 'Independent app memory')
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await inner.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === 'Saved in this app only'
    )
    evidence.checks.independentApp = 'PASS: external project, public SDK only, installed through GET/OPEN'
    evidence.checks.isolation = await inner.evaluate(async () => {
      const denied = (fn) => {
        try {
          fn()
          return false
        } catch {
          return true
        }
      }
      let network = false
      try {
        await fetch('http://localhost:3112/sentinel')
      } catch {
        network = true
      }
      return {
        opaqueOrigin: self.origin === 'null',
        parentDOM: denied(() => parent.document),
        parentStorage: denied(() => parent.localStorage),
        ownStorage: denied(() => localStorage.getItem('x')),
        indexedDB: denied(() => indexedDB.open('steal')),
        tauriAbsent: typeof window.__TAURI_INTERNALS__ === 'undefined' && typeof window.__TAURI__ === 'undefined',
        network
      }
    })
    assert.ok(Object.values(evidence.checks.isolation).every(Boolean))
    const data = await page.evaluate(async (id) => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('ipduo')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const read = (key) =>
        new Promise((resolve) => {
          const req = db.transaction('appdata').objectStore('appdata').get(key)
          req.onsuccess = () => resolve(req.result)
        })
      const values = {
        demo: await read([id, 'field-note']),
        notes: await read(['labs.doan.ipduo.notes', 'field-note'])
      }
      db.close()
      return values
    }, id)
    assert.deepEqual(data, { demo: 'Independent app memory', notes: 'Private Notes sentinel' })
    evidence.checks.otherAppData = data
    evidence.checks.fold = []
    for (const angle of [180, 120, 0]) {
      await page.evaluate((angle) => {
        const range = document.querySelector('input[aria-label="Hinge angle"]')
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, String(angle))
        range.dispatchEvent(new Event('input', { bubbles: true }))
      }, angle)
      const display = angle === 0 ? 'cover' : 'inner'
      let target
      for (const frame of frames)
        if ((await frame.$eval('[data-demo]', (element) => element.dataset.display)) === display) target = frame
      await target.waitForFunction(
        (angle) => Number(document.querySelector('[data-demo]').dataset.angle) === angle,
        { timeout: 30000 },
        angle
      )
      evidence.checks.fold.push(
        await target.$eval('[data-demo]', (element) => ({
          display: element.dataset.display,
          angle: element.dataset.angle,
          text: element.textContent
        }))
      )
      await page.screenshot({ path: `${cache}/fold-${angle}.png` })
    }
    assert.ok(evidence.checks.fold[0].text.includes('Desk board'))
    assert.ok(evidence.checks.fold[1].text.includes('Folded workspace'))
    assert.ok(evidence.checks.fold[2].text.includes('Pocket card'))
    const ids = await page.$$eval('iframe', (elements) => elements.map((element) => element.dataset.view))
    assert.deepEqual(ids, initialViews)
    evidence.checks.foldStableViews = true
    await page.goto(`http://localhost:3111/?debug&app=${id}&deg=0`, { timeout: 120000 })
    await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
      timeout: 60000
    })
    const restored = page.frames().find((frame) => frame.parentFrame())
    await restored.waitForFunction(
      () => document.querySelector('[aria-label="Field note"]')?.value === 'Independent app memory'
    )
    evidence.checks.relaunch = 'PASS: installed registry and app-private data survive a shell reload'
    assert.equal(forbiddenRequests, 0)
    assert.deepEqual(await hashes(resolve('dist')), before)
    evidence.checks.noSimulatorRebuild =
      'PASS: every simulator dist file SHA-256 unchanged from before independent app build through install/fold/reload'
    if (!PREVIEW_FEATURES.developmentLoader) {
      await page.goto('http://localhost:3111/?debug&dev=http://localhost:3112/sentinel', { timeout: 120000 })
      await page.waitForFunction(() => document.body.innerText.includes('Live development loading is deferred'))
      assert.equal(await page.$$eval('iframe', (elements) => elements.length), 0)
      assert.equal(forbiddenRequests, 0)
      evidence.checks.deferredDevelopment = 'PASS: disabled before external requests or frame creation'
    }
    await Bun.write(`${cache}/chromium.json`, JSON.stringify(evidence, null, 2))
    console.log('MVP Chromium PASS', JSON.stringify(evidence.checks, null, 2))
  } catch (error) {
    console.log(await page.evaluate(() => document.body.innerText.slice(-2500)))
    await page.screenshot({ path: `${cache}/failure.png` })
    throw error
  } finally {
    await browser.close()
    shell.stop()
    catalog.stop()
  }
}
