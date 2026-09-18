import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
})
const page = await browser.newPage()
try {
  let forecasts = 0
  const requests = []
  page.on('request', (request) => {
    if (request.url().startsWith('https://api.open-meteo.com/')) {
      forecasts++
      requests.push({ url: request.url(), headers: request.headers() })
    }
  })
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  await page.setViewport({ width: 818, height: 664 })
  await page.goto(`${process.env.STAGE2_URL ?? 'http://localhost:3110'}/?debug&app=Weather&deg=180`, {
    timeout: 120000
  })
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
  const frames = page.frames().filter((f) => f.parentFrame())
  await frames[0].waitForFunction(() => document.body.textContent.includes('Updated'), { timeout: 30000 })
  assert.equal(forecasts, 1, 'one forecast across both views')
  const handles = await page.$$('iframe')
  const index = await page.evaluate(() => [...document.querySelectorAll('iframe')].findIndex((f) => !f.dataset.owner))
  const nonowner = await handles[index].contentFrame()
  await nonowner.evaluate(() => document.querySelector('[aria-label="Refresh weather"]').click())
  await page
    .waitForRequest((r) => r.url().startsWith('https://api.open-meteo.com/'), { timeout: 10000 })
    .catch(() => {})
  await nonowner.waitForFunction(() => !document.querySelector('[aria-label="Refresh weather"]')?.disabled)
  assert.equal(forecasts, 2, 'non-owner command fetched once')
  assert.equal(
    await nonowner.evaluate(async () => {
      try {
        await fetch('https://example.com')
        return true
      } catch {
        return false
      }
    }),
    false
  )
  await page.screenshot({ path: '.cache/debug/stage2/weather-180.png' })
  await Bun.write('.cache/debug/stage2/weather-network.json', JSON.stringify({ forecasts, requests }, null, 2))
  console.log('Weather PASS: real network, one owner request, non-owner refresh command, undeclared network denied')
} catch (error) {
  console.log(
    await page.evaluate(() => ({
      text: document.body.innerText.slice(-1500),
      frames: [...document.querySelectorAll('iframe')].map((f) => f.dataset.state)
    }))
  )
  await page.screenshot({ path: '.cache/debug/stage2/weather-failure.png' })
  throw error
} finally {
  await browser.close()
}
