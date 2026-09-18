import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { buildApp } from '../../build-app.ts'

const cache = resolve(`.cache/debug/stage2/runtime-${Date.now()}`)
const bundle = await buildApp('packages/apps/notes', {
  experiment: true,
  entry: resolve('scripts/checks/stage2/bridge-probe.ts'),
  output: cache
})
const failing = await buildApp('packages/apps/notes', {
  experiment: true,
  entry: resolve('scripts/checks/stage2/failing-probe.ts'),
  output: `${cache}-failing`
})
const second = { ...bundle, release: { ...bundle.release, manifest: { ...bundle.release.manifest, version: '2.0.0' } } }
failing.release.manifest.version = '3.0.0'
const unsafe = structuredClone(bundle)
unsafe.html = bundle.html.replace("default-src 'none'", 'default-src *')
const sha = (value) => createHash('sha256').update(value).digest('hex')
const icon = Buffer.from(await Bun.file('packages/apps/notes/icon.png').arrayBuffer())
unsafe.release.files.find((file) => file.path === 'app.html').bytes = Buffer.byteLength(unsafe.html)
unsafe.release.files.find((file) => file.path === 'app.html').sha256 = sha(unsafe.html)
unsafe.release.build.hash = sha(Buffer.concat([Buffer.from(unsafe.html), icon])).slice(0, 8)
const output = await Bun.build({ entrypoints: ['scripts/checks/stage2/runtime-host.ts'], target: 'browser' })
if (!output.success) throw new Error(output.logs.join('\n'))
const js = await output.outputs[0].text()
const server = Bun.serve({
  port: 3109,
  async fetch(req) {
    const path = new URL(req.url).pathname
    const variant = path.startsWith('/unsafe/')
      ? unsafe
      : path.startsWith('/second/')
        ? second
        : path.startsWith('/failing/')
          ? failing
          : bundle
    if (path.endsWith('/release.json')) return Response.json(variant.release)
    if (path.endsWith('/app.html')) return new Response(variant.html, { headers: { 'Content-Type': 'text/html' } })
    if (path.endsWith('/icon-1024.png')) return new Response(Bun.file('packages/apps/notes/icon.png'))
    if (path === '/host.js') return new Response(js, { headers: { 'Content-Type': 'text/javascript' } })
    if (path.startsWith('/app/')) {
      const name = path.slice(5)
      if (name === 'release.json') return Response.json(bundle.release)
      if (name === 'app.html') return new Response(bundle.html)
      if (name === 'icon-1024.png') return new Response(Bun.file('packages/apps/notes/icon.png'))
    }
    return new Response('<!doctype html><title>Runtime tests</title><script type="module" src="/host.js"></script>', {
      headers: { 'Content-Type': 'text/html' }
    })
  }
})
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox']
})
const id = 'labs.doan.ipduo.notes'
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('pageerror', String(e)))
  await page.goto('http://localhost:3109')
  await page.waitForFunction(() => window.host)
  assert.equal(
    await page.evaluate(async (id) => {
      try {
        await host.lifecycle.install(id, '/unsafe/')
      } catch (error) {
        return error.code
      }
    }, id),
    'E_PROTOCOL',
    'Even a self-consistent release cannot loosen the host document policy'
  )
  assert.equal(await page.evaluate((id) => host.db.getInstalled(id), id), undefined)
  await page.evaluate(async (id) => {
    localStorage.setItem('duo.notes.new', 'legacy body')
    await host.lifecycle.install(id, '/app/')
  }, id)
  assert.equal(await page.evaluate(() => localStorage.getItem('duo.notes.new')), null)
  const launches = await page.evaluate(async (id) => [await host.launch(id), await host.launch(id)], id)
  assert.equal(launches[0].session, launches[1].session)
  await page.waitForFunction(() => document.querySelectorAll('[data-state="ready"] iframe').length === 2)
  const [inner, cover] = page.frames().filter((f) => f.parentFrame())
  assert.equal(await inner.evaluate(() => probe.owner.epoch), 1)
  assert.equal(await cover.evaluate(() => probe.owner), null)
  assert.equal(await inner.evaluate(() => probe.storage.get('new')), 'legacy body')
  const quota = await page.evaluate(async (id) => {
    const app = await host.db.getInstalled(id)
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'appdata') throw new DOMException('Simulated quota failure', 'QuotaExceededError')
      return put.call(this, value, key)
    }
    try {
      await host.storage.storage(id, app.generation, 'set', { k: 'new', v: 'not committed' })
    } catch (error) {
      return error.code
    } finally {
      IDBObjectStore.prototype.put = put
    }
  }, id)
  assert.equal(quota, 'E_STORAGE')
  assert.equal(await inner.evaluate(() => probe.storage.get('new')), 'legacy body')
  await inner.evaluate(() => probe.storage.set('new', ''))
  assert.equal(await cover.evaluate(() => probe.storage.get('new')), '')
  await cover.evaluate(() => probe.commands.send('refresh', 'once'))
  await inner.evaluate(() => probe.commands.send('self', 'owner can await storage'))
  assert.equal(await cover.evaluate(() => probe.session.get('command:self')), 'owner can await storage')
  assert.equal(await inner.evaluate(() => probe.session.get('command:refresh')), 'once')
  assert.equal(
    await cover.evaluate(async () => {
      try {
        await probe.photos.list()
      } catch (e) {
        return e.code
      }
    }),
    'E_DENIED'
  )
  await page.evaluate(() => host.frames[0].close())
  await cover.waitForFunction(() => probe.owner?.epoch === 2)
  assert.equal(await cover.evaluate(() => probe.session.get('command:refresh')), 'once')
  const old = await page.evaluate((id) => host.db.getInstalled(id), id)
  assert.equal(
    await page.evaluate(async (id) => {
      try {
        await host.lifecycle.install(id, 'http://localhost:3199/app/')
      } catch (error) {
        return error.code
      }
    }, id),
    'E_DENIED',
    'A different catalog origin cannot replace an app and inherit its data'
  )
  await page.evaluate((id) => host.lifecycle.install(id, '/second/'), id)
  const staged = await page.evaluate((id) => host.db.getInstalled(id), id)
  assert.equal(staged.generation, old.generation)
  assert.ok(staged.candidate.startsWith('2.0.0+'))
  await page.evaluate(() => {
    for (const frame of host.frames) frame.close()
  })
  await page.waitForFunction(async (id) => (await host.db.getInstalled(id)).state === 'trial', {}, id)
  const trial = await page.evaluate((id) => host.db.getInstalled(id), id)
  assert.equal(trial.recovery.release, old.current)
  await page.evaluate((id) => host.launch(id), id)
  await page.waitForFunction(() => document.querySelector('iframe[data-state="ready"]'))
  await page.evaluate((id) => host.lifecycle.install(id, '/failing/'), id)
  await page.evaluate(() => {
    for (const frame of host.frames) frame.close()
  })
  await page.waitForFunction(async (id) => (await host.db.getInstalled(id)).current.startsWith('3.0.0+'), {}, id)
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.evaluate((id) => host.launch(id), id)
    await page.waitForFunction(() => document.querySelectorAll('iframe').length === 0)
  }
  assert.equal((await page.evaluate((id) => host.db.getInstalled(id), id)).attempts, 2)
  await page.evaluate((id) => host.lifecycle.restore(id), id)
  const restored = await page.evaluate((id) => host.db.getInstalled(id), id)
  assert.equal(restored.current, trial.current)
  assert.ok(restored.failedVersion.startsWith('3.0.0+'))
  assert.equal(
    await page.evaluate(async (id) => {
      const a = await host.db.getInstalled(id)
      return host.storage.storage(id, a.generation, 'get', { k: 'trial-only' })
    }, id),
    null
  )
  await page.evaluate(() => host.lifecycle.reconcile())
  assert.equal((await page.evaluate((id) => host.db.getInstalled(id), id)).current, restored.current)
  await page.evaluate((id) => host.launch(id), id)
  await page.waitForFunction(() => document.querySelector('iframe[data-state="ready"]'))
  const survivor = page.frames().find((f) => f.parentFrame())
  const tab = await browser.newPage()
  await tab.goto('http://localhost:3109')
  await tab.waitForFunction(() => window.host)
  await tab.evaluate((id) => host.launch(id), id)
  await tab.waitForFunction(() => document.querySelector('[data-state="ready"] iframe'))
  const other = tab.frames().find((f) => f.parentFrame())
  await other.evaluate(() => probe.storage.set('new', 'tab two'))
  assert.equal(await survivor.evaluate(() => probe.storage.get('new')), 'tab two')
  const generation = await page.evaluate(async (id) => (await host.db.getInstalled(id)).generation, id)
  await page.evaluate((id) => host.lifecycle.uninstall(id), id)
  await page.waitForFunction(() => document.querySelectorAll('iframe').length === 0)
  await tab.waitForFunction(() => document.querySelectorAll('iframe').length === 0)
  await page.evaluate(() => host.lifecycle.reconcile())
  assert.equal(await page.evaluate(async (id) => !!(await host.db.getInstalled(id)), id), false)
  assert.equal(
    await tab.evaluate(
      async ({ id, generation }) => {
        try {
          await host.storage.storage(id, generation, 'set', { k: 'ghost', v: 'no' })
        } catch (e) {
          return e.code
        }
      },
      { id, generation }
    ),
    'E_GONE'
  )
  assert.equal(
    await page
      .evaluate(async (id) => host.db.transaction(['marks'], 'readonly', (tx) => host.db.read(tx, 'marks', id)), id)
      .then((m) => m.migrated),
    true
  )
  await page.evaluate((id) => host.lifecycle.install(id, '/app/'), id)
  assert.ok((await page.evaluate((id) => host.db.getInstalled(id), id)).generation > generation)
  assert.equal(
    await page.evaluate(
      async ({ id, generation }) => {
        try {
          await host.storage.storage(id, generation, 'set', { k: 'ghost', v: 'no' })
        } catch (error) {
          return error.code
        }
      },
      { id, generation }
    ),
    'E_GONE',
    'Reinstall must not revive old launch authority'
  )
  console.log(
    'Runtime PASS: policy tamper rejection, migration, two views, quota abort, empty string, owner handover, owner/nonowner commands, permission denial, staged generation, activation, trial failure, restoration, two tabs, uninstall and reinstall fencing'
  )
} finally {
  await browser.close()
  server.stop()
}
