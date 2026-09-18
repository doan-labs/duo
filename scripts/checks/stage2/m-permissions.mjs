import { mkdir } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
import { frameAllow } from '../../../packages/sdk/permissions.ts'
import { appDocument } from '../../build-app.ts'
import { permissionProbe } from './permission-probe.mjs'

await mkdir('.cache/debug/stage2', { recursive: true })
const html = appDocument(`(${permissionProbe.toString()})()`, '', 'Permissions probe')
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
})
const server = Bun.serve({
  port: 3108,
  fetch: () =>
    new Response('<!doctype html><title>Permission delegation</title>', { headers: { 'Content-Type': 'text/html' } })
})
try {
  await browser
    .defaultBrowserContext()
    .overridePermissions('http://localhost:3108', ['geolocation', 'camera', 'microphone'])
  const page = await browser.newPage()
  await page.setGeolocation({ latitude: 10.77, longitude: 106.69 })
  await page.goto('http://localhost:3108')
  await page.evaluate(
    ({ html, declared, denied }) => {
      window.results = []
      addEventListener('message', (e) => {
        if (e.data?.stage2) window.results.push(e.data.stage2)
      })
      for (const [name, allow] of [
        ['declared', declared],
        ['denied', denied]
      ]) {
        const frame = document.createElement('iframe')
        frame.name = name
        frame.sandbox = 'allow-scripts'
        frame.allow = allow
        frame.srcdoc = html
        document.body.append(frame)
      }
    },
    { html, declared: frameAllow(['geolocation']), denied: frameAllow() }
  )
  await page.waitForFunction(() => window.results.length === 2, { timeout: 15000 })
  const results = await page.evaluate(() => window.results)
  await Bun.write('.cache/debug/stage2/m-feature-chromium.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  if (
    !results.some((r) => r.loader === 'declared' && r.geolocation.latitude === 10.77) ||
    !results.some((r) => r.loader === 'denied' && r.geolocation.code === 1) ||
    results.some((r) => r.camera === 'allowed' || r.cameraPolicy)
  )
    process.exitCode = 1
} finally {
  await browser.close()
  server.stop()
}
