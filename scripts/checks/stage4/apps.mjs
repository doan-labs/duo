import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const tag = process.argv[2] ?? 'after'
const names = process.argv.slice(3)
const apps = names.length
  ? names
  : ['Settings', 'Contacts', 'Mail', 'Messages', 'Reminders', 'Files', 'Notes', 'Weather']
const directory = resolve(`.cache/debug/stage4/${tag}`)
await mkdir(directory, { recursive: true })
const server = Bun.serve({
  port: Number(process.env.APP_PORT ?? 3120),
  async fetch(request) {
    const path = new URL(request.url).pathname
    const file = Bun.file(resolve(process.env.APP_DIST ?? 'dist', path === '/' ? 'index.html' : `.${path}`))
    return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
  }
})
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
})
const evidence = []
try {
  const page = await browser.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('console', message.text())
  })
  await page.evaluateOnNewDocument(() => {
    addEventListener('error', (event) => console.error('App error:', event.message, event.error?.stack))
    addEventListener('unhandledrejection', (event) => console.error('App rejection:', String(event.reason)))
  })
  await page.setViewport({ width: 818, height: 664 })
  for (const app of apps) {
    for (const angle of [180, 0]) {
      const errors = []
      const error = (e) => errors.push(e.message)
      page.on('pageerror', error)
      await page.goto(`http://localhost:${server.port}/?debug&app=${encodeURIComponent(app)}&deg=${angle}`, {
        timeout: 120000
      })
      await page.waitForSelector('[data-app]', { timeout: 60000 })
      if (app === 'Notes' || app === 'Weather')
        await page.waitForSelector('iframe[data-state="ready"]', { timeout: 60000 })
      await new Promise((r) => setTimeout(r, 2400))
      const state = await page.evaluate((angle) => {
        const root = [...document.querySelectorAll('[data-os]')].find((e) => e.offsetWidth < 500 === (angle === 0))
        const app = root?.querySelector('[data-app]')
        return { name: app?.getAttribute('data-app'), text: app?.textContent, width: root?.offsetWidth }
      }, angle)
      assert.ok(state.name, `${app} is open at ${angle}`)
      assert.deepEqual(errors, [], `${app} page errors`)
      const slug = app.toLowerCase().replaceAll(' ', '-')
      await page.screenshot({ path: `${directory}/${slug}-${angle}.png` })
      evidence.push({ app, angle, ...state, errors })
      console.log(`PASS ${tag} ${app} ${angle}`)
      page.off('pageerror', error)
    }
  }
  await Bun.write(`${directory}/evidence.json`, JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
  server.stop(true)
}
