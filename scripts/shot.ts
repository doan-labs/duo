import puppeteer from 'puppeteer-core'

const [url, out, w = '900', h = '1100', wait = '4000'] = process.argv.slice(2)
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    `--window-size=${w},${h}`,
    '--hide-scrollbars'
  ]
})
const page = await browser.newPage()
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 })
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 500)))
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('response', (r) => r.url().includes('/assets/') && console.log('[resp]', r.status(), r.url().slice(-40)))
page.on('requestfailed', (r) => console.log('[reqfail]', r.url()))
await page.goto(url!, { waitUntil: 'load', timeout: 120000 })
const t0 = Date.now()
try {
  await page.waitForSelector('[data-os]', { timeout: 60000 })
} catch {
  console.log('[timeout] [data-os] never appeared')
}
console.log('[ready]', Date.now() - t0, 'ms')
await new Promise((r) => setTimeout(r, +wait))
const dbg = await page.$$eval('.dbg', (els) => els.map((e) => e.textContent))
for (const d of dbg) console.log(d)
if (out) await page.screenshot({ path: out })
await browser.close()
