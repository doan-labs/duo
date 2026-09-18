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
  // A fresh profile has no notes: compose one, then wait for the display that renders its editor.
  const editor = async () => {
    const frames = page.frames().filter((f) => f.parentFrame())
    for (const f of frames) if (await f.$('textarea')) return f
    return frames[0]
  }
  const list = await editor()
  await list.waitForSelector('[aria-label="New note"]')
  await list.evaluate(() => document.querySelector('[aria-label="New note"]').click())
  await list.waitForSelector('textarea')
  const inner = await editor()
  await inner.evaluate(() => {
    const area = document.querySelector('textarea')
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, 'Sandboxed Notes persists')
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
  // The list titles a note from its stored text, so the row proves the write reached storage.
  // innerText skips the textarea, so this line can only come from the list row.
  await inner.waitForFunction(() => document.body.innerText.includes('Sandboxed Notes persists'))
  await page.screenshot({ path: '.cache/debug/stage2/notes-180.png' })
  await page.reload({ timeout: 120000 })
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
  // The selection lives in session storage and does not survive a reload: pick the row again.
  const list2 = page.frames().filter((f) => f.parentFrame())[0]
  await list2.waitForFunction(() => document.body.innerText.includes('Sandboxed Notes persists'))
  await list2.evaluate(() => {
    const row = [...document.querySelectorAll('*')].find(
      (e) => e.childElementCount === 0 && e.textContent === 'Sandboxed Notes persists'
    )
    row.closest('button, li, [role="button"], a')?.click() ?? row.click()
  })
  await list2.waitForSelector('textarea')
  const next = await editor()
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
