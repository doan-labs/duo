import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
})
let page
try {
  page = await browser.newPage()
  await page.setViewport({ width: 818, height: 664 })
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('console', m.text().slice(0, 200))
  })
  await page.goto(`${process.env.STAGE2_URL ?? 'http://localhost:3110'}/?debug&app=Notes&deg=180`, { timeout: 120000 })
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
  const frames = page.frames().filter((f) => f.parentFrame())
  const inner = frames[0]
  await inner.waitForSelector('textarea')
  await inner.evaluate(() => {
    const area = document.querySelector('textarea')
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, 'Sandboxed Notes persists')
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await inner.waitForFunction(() => document.querySelector('[role="status"]')?.textContent === 'Saved')
  await page.screenshot({ path: '.cache/debug/stage2/notes-180.png' })
  await page.reload({ timeout: 120000 })
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
  const next = page.frames().filter((f) => f.parentFrame())[0]
  await next.waitForSelector('textarea')
  await next.waitForFunction(() => document.querySelector('textarea')?.value === 'Sandboxed Notes persists')
  assert.equal(await next.evaluate(() => document.querySelector('textarea').value), 'Sandboxed Notes persists')
  await next.focus('textarea')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelectorAll('iframe').length === 0, { timeout: 10000 })
  console.log('Notes PASS: two real sandboxed views, edit, durable reload, Escape closes both')
} catch (error) {
  console.log(
    await page.evaluate(() => ({
      text: document.body.innerText,
      frames: [...document.querySelectorAll('iframe')].map((f) => ({
        state: f.dataset.state,
        html: f.srcdoc.slice(0, 90)
      }))
    }))
  )
  await page.screenshot({ path: '.cache/debug/stage2/notes-failure.png' })
  throw error
} finally {
  await browser.close()
}
