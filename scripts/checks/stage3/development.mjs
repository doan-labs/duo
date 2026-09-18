import assert from 'node:assert/strict'
import { cp, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
import { serveDevelopment } from '../../../packages/cli/development.mjs'

const cache = '.cache/debug/stage3'
const project = await mkdtemp(join(tmpdir(), 'duo-preview-test-'))
await cp('examples/fold-compass', project, { recursive: true })
const artifacts = await Bun.file(
  process.env.PLATFORM_ARTIFACTS ?? '.cache/platform-packages/final/artifacts.json'
).json()
const overrides = Object.fromEntries(Object.entries(artifacts).map(([name, path]) => [name, `file:${path}`]))
const metadata = await Bun.file(join(project, 'package.json')).json()
await Bun.write(join(project, 'package.json'), JSON.stringify({ ...metadata, overrides }))
const install = Bun.spawn(['bun', 'install', '--ignore-scripts'], {
  cwd: project,
  stdout: 'inherit',
  stderr: 'inherit'
})
assert.equal(await install.exited, 0)
let builds = 0
const errors = []
const dev = await serveDevelopment(project, {
  port: 3115,
  onBuild: () => builds++,
  onError: (error) => errors.push(String(error))
})
const other = await serveDevelopment(project, { port: 3116, watch: false })
let changedDocuments = 0
const changing = Bun.serve({
  port: 3117,
  async fetch(request) {
    const url = new URL(request.url)
    if (request.headers.get('sec-fetch-dest') === 'iframe') {
      changedDocuments++
      return new Response('<!doctype html><h1>Unverified replacement</h1>', {
        headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }
      })
    }
    return fetch(`http://localhost:3115${url.pathname}`)
  }
})
const output = await Bun.build({ entrypoints: ['scripts/checks/stage2/runtime-host.ts'], target: 'browser' })
assert.ok(output.success)
const js = await output.outputs[0].text()
const server = Bun.serve({
  port: 3114,
  fetch(req) {
    return new URL(req.url).pathname === '/host.js'
      ? new Response(js, { headers: { 'Content-Type': 'text/javascript' } })
      : new Response('<!doctype html><script type="module" src="/host.js"></script>', {
          headers: { 'Content-Type': 'text/html' }
        })
  }
})
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
})
const page = await browser.newPage()
// Keep every probe visible: offscreen cross-origin frames can suspend requestAnimationFrame.
await page.setViewport({ width: 1600, height: 1000 })
page.on('pageerror', (error) => console.log('pageerror', error.message))
page.on('console', (message) => {
  if (message.type() === 'error') console.log('console', message.text())
})
const id = dev.current().release.manifest.id
const evidence = { project, checks: [] }
async function waitFor(predicate) {
  const until = Date.now() + 20000
  while (!(await predicate())) {
    if (Date.now() > until) throw new Error('Condition timed out')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
async function launch(id) {
  console.log('Launch', id)
  const launched = await page.evaluate((id) => host.launch(id), id)
  const element = await page.waitForSelector(`iframe[data-view="${launched.id}"][data-state="ready"]`)
  const frame = await element.contentFrame()
  await frame.waitForSelector('[aria-label="Field note"]')
  return frame
}
async function write(frame, value) {
  await frame.evaluate((value) => {
    const field = document.querySelector('[aria-label="Field note"]')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
  await frame.waitForFunction(() => document.querySelector('[role="status"]').textContent === 'Saved in this app only')
}
const value = (frame) => frame.$eval('[aria-label="Field note"]', (field) => field.value)
try {
  await page.goto('http://localhost:3114')
  await page.waitForFunction(() => window.host)
  const changingNS = await page.evaluate(() => host.development.loadDevelopment('http://localhost:3117'))
  await page.evaluate((id) => host.launch(id), changingNS)
  await new Promise((resolve) => setTimeout(resolve, 1000))
  assert.equal(changedDocuments, 0, 'iframe must execute the verified bytes without a second server fetch')
  await page.waitForSelector('iframe[data-state="ready"]')
  await page.evaluate((id) => host.store.remove(id), changingNS)
  evidence.checks.push('Changing development server cannot substitute unverified iframe HTML')
  const identity = `${dev.current().release.manifest.version}+${dev.current().release.build.hash}`
  await page.evaluate(
    ({ id, identity }) => host.lifecycle.install(id, `http://localhost:3115/apps/${id}/${identity}/`),
    { id, identity }
  )
  const installed = await launch(id)
  await write(installed, 'installed private')
  const ns = await page.evaluate(() => host.development.loadDevelopment('http://localhost:3115'))
  const first = await launch(ns)
  assert.equal(await value(first), '')
  await write(first, 'preview private')
  assert.equal(await value(installed), 'installed private')
  assert.ok(first.url().startsWith('blob:'), 'src pins the verified document')
  const firstURL = first.url()
  await page.evaluate(() => host.development.loadDevelopment('http://localhost:3115'))
  assert.equal(await page.evaluate((ns) => host.development.development.get(ns).src, ns), firstURL)
  const isolation = await first.evaluate(() => {
    let denied = false
    try {
      void parent.document
    } catch {
      denied = true
    }
    return { origin: self.origin, parentDenied: denied, native: typeof window.__TAURI_INTERNALS__ }
  })
  assert.deepEqual(isolation, { origin: 'null', parentDenied: true, native: 'undefined' })
  const secondNS = await page.evaluate(() => host.development.loadDevelopment('http://localhost:3116'))
  const second = await launch(secondNS)
  assert.equal(await value(second), '')
  assert.notEqual(ns, secondNS)
  evidence.checks.push('Opaque src frame; installed and two preview origins have separate storage')
  const oldHash = dev.current().release.build.hash
  const source = await Bun.file(join(project, 'main.tsx')).text()
  await Bun.write(join(project, 'main.tsx'), source.replaceAll('Fold Compass', 'Fold Compass v2'))
  await waitFor(() => dev.current().release.build.hash !== oldHash)
  assert.equal(await first.$eval('h1', (element) => element.textContent), 'Fold Compass')
  await page.evaluate(() => host.development.loadDevelopment('http://localhost:3115'))
  await page.waitForFunction(() => document.querySelectorAll('iframe').length === 2)
  const reloaded = await launch(ns)
  assert.equal(await reloaded.$eval('h1', (element) => element.textContent), 'Fold Compass v2')
  assert.equal(await value(reloaded), 'preview private')
  assert.equal(
    await page.evaluate(
      async (url) =>
        fetch(url).then(
          () => true,
          () => false
        ),
      firstURL
    ),
    false
  )
  evidence.checks.push(
    'Immutable old document survives rebuild; explicit reload revokes stale view and preserves preview data'
  )
  let requests = 0
  page.on('request', (request) => {
    if (request.url().startsWith('http://localhost:3115')) requests++
  })
  await page.evaluate((ns) => host.store.remove(ns), ns)
  assert.equal(
    await page.evaluate(
      async (url) =>
        fetch(url).then(
          () => true,
          () => false
        ),
      reloaded.url()
    ),
    false
  )
  await page.waitForFunction(() => document.querySelectorAll('iframe').length === 2)
  assert.equal(await value(installed), 'installed private')
  assert.equal(await page.evaluate(async (ns) => (await host.db.allInstalled()).some((a) => a.id === ns), ns), false)
  assert.deepEqual(
    await page.evaluate(
      (ns) => host.db.transaction(['appdata'], 'readonly', (tx) => host.db.entries(tx, 'appdata', ns)),
      ns
    ),
    []
  )
  await dev.stop()
  const stoppedBuilds = builds
  await Bun.write(join(project, 'main.tsx'), source)
  await new Promise((resolve) => setTimeout(resolve, 350))
  assert.equal(builds, stoppedBuilds)
  await assert.rejects(fetch('http://localhost:3115/release.json'))
  assert.equal(requests, 0)
  assert.deepEqual(errors, [])
  evidence.checks.push(
    'Remove clears only dev data and revokes views; stopping closes server/watcher without late rebuild or browser polling'
  )
  await Bun.write(`${cache}/development.json`, JSON.stringify(evidence, null, 2))
  console.log('Development safety PASS', evidence)
} finally {
  await browser.close()
  await dev.stop()
  await other.stop()
  changing.stop(true)
  server.stop(true)
}
