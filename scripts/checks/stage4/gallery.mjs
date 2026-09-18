import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { buildApp } from '../../build-app.ts'

const cache = resolve('.cache/debug/stage4/gallery')
await mkdir(cache, { recursive: true })
const bundle = await buildApp('examples/developer', { output: `${cache}/catalog-${Date.now()}` })
const output = await Bun.build({ entrypoints: ['scripts/checks/stage2/runtime-host.ts'], target: 'browser' })
assert.ok(output.success)
const js = await output.outputs[0].text()
const server = Bun.serve({
  port: 3122,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path.endsWith('/release.json')) return Response.json(bundle.release)
    if (path.endsWith('/app.html')) return new Response(bundle.html)
    if (path.endsWith('/icon-1024.png')) return new Response(Bun.file('examples/developer/icon.png'))
    if (path === '/host.js') return new Response(js, { headers: { 'Content-Type': 'text/javascript' } })
    return new Response('<!doctype html><script type="module" src="/host.js"></script>', {
      headers: { 'Content-Type': 'text/html' }
    })
  }
})
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: process.env.CI ? ['--no-sandbox'] : []
})
const page = await browser.newPage()
const errors = [],
  network = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('request', (request) => {
  if (!request.url().startsWith('http://localhost:3122') && !request.url().startsWith('data:'))
    network.push(request.url())
})
try {
  console.log('Gallery: loading host')
  await page.setViewport({ width: 1160, height: 640 })
  await page.goto('http://localhost:3122')
  await page.waitForFunction(() => window.host)
  await page.evaluate(async (id) => {
    await host.lifecycle.install(id, '/app/')
    await host.launch(id)
    await host.launch(id)
    for (const [i, frame] of host.frames.entries()) {
      const width = i ? 340 : 768
      frame.frame.parentElement.style.cssText = `width:${width}px;height:600px;display:inline-block`
      frame.update({ ...frame.view.info, width, height: 600, angle: i ? 0 : 180 })
    }
  }, bundle.release.manifest.id)
  console.log('Gallery: waiting for both displays')
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2)
  const [inner, cover] = page.frames().filter((frame) => frame.parentFrame())
  await cover.waitForFunction(() =>
    document.querySelector('[data-testid="display"]').textContent.includes('cover · 340 × 600 · 0°')
  )
  await inner.waitForFunction(() => !document.querySelector('[aria-label="Gallery switch"]').disabled)
  console.log('Gallery: mirroring the toggle')
  await inner.click('[aria-label="Gallery switch"]')
  await cover.waitForFunction(() => document.querySelector('[aria-label="Gallery switch"]').checked)
  assert.equal(
    await page.evaluate(
      (id) => host.db.transaction(['appdata'], 'readonly', (tx) => host.db.read(tx, 'appdata', [id, 'gallery-toggle'])),
      bundle.release.manifest.id
    ),
    'on'
  )
  await inner.evaluate(() => (document.querySelector('[aria-label="Component gallery"]').scrollTop = 0))
  await cover.evaluate(() => (document.querySelector('[aria-label="Component gallery"]').scrollTop = 0))
  await page.screenshot({ path: `${cache}/both-displays.png` })
  console.log('Gallery: keyboard activation')
  await cover.evaluate(() =>
    [...document.querySelectorAll('button')].find((button) => button.textContent === 'Filled').focus()
  )
  await page.keyboard.press('Enter')
  await cover.waitForFunction(() => document.querySelector('[role="status"]').textContent === 'Filled pressed')
  console.log('Gallery: push and back navigation')
  await cover.evaluate(() =>
    [...document.querySelectorAll('button')].find((button) => button.textContent === 'Open detail').click()
  )
  await cover.waitForSelector('[aria-label="Back"]')
  await cover.click('[aria-label="Back"]')
  await cover.waitForFunction(() => !document.querySelector('[aria-label="Back"]'))
  assert.equal(await cover.$eval('[aria-label="Gallery switch"]', (input) => input.checked), true)
  console.log('Gallery: reduced motion and layout')
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  assert.equal(
    await cover.evaluate(
      () =>
        getComputedStyle([...document.querySelectorAll('span')].find((span) => span.textContent === 'spin'))
          .animationName
    ),
    'none'
  )
  assert.equal(
    await cover.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'cover has no horizontal overflow'
  )
  await cover.evaluate(() => (document.querySelector('[aria-label="Component gallery"]').scrollTop = 500))
  await page.screenshot({ path: `${cache}/controls.png` })
  console.log('Gallery: teardown')
  await page.evaluate(() => host.frames.forEach((frame) => frame.close()))
  await page.waitForFunction(() => document.querySelectorAll('iframe').length === 0)
  assert.deepEqual(errors, [])
  assert.deepEqual(network, [], 'kit starts no external network effects')
  const evidence = {
    bytes: bundle.release.files.find((file) => file.path === 'app.html').bytes,
    checks: [
      'Public exports render in two opaque sandbox views at 768/340px',
      'Live display subscription and shared durable toggle mirror',
      'Keyboard button, push/back navigation and preserved state',
      'Reduced-motion presets and no cover horizontal overflow',
      'No external network effects; both frames tear down'
    ],
    errors,
    network
  }
  await Bun.write(`${cache}/evidence.json`, JSON.stringify(evidence, null, 2))
  console.log('Gallery PASS', JSON.stringify(evidence))
} catch (error) {
  console.error('Gallery browser errors:', errors)
  console.error('Gallery frame state:', await page.evaluate(() => document.body.innerHTML))
  throw error
} finally {
  await browser.close()
  server.stop(true)
}
