import assert from 'node:assert/strict'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const root = process.cwd()
const cache = resolve(process.env.PLATFORM_EVIDENCE_DIR ?? '.cache/debug/stage3/workflow')
await mkdir(cache, { recursive: true })
const parent = await mkdtemp(join(tmpdir(), 'duo-workflow-'))
const artifactPath = resolve(process.env.PLATFORM_ARTIFACTS ?? '.cache/platform-packages/stage3/artifacts.json')
const artifacts = await Bun.file(artifactPath).json()
const archive = Object.fromEntries(Object.entries(artifacts).map(([name, path]) => [name, `file:${path}`]))
await Bun.write(
  join(parent, 'package.json'),
  JSON.stringify({ private: true, dependencies: archive, overrides: archive })
)
const processes = []
async function run(args, cwd = parent) {
  const process = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, exit] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ])
  console.log(stdout, stderr)
  assert.equal(exit, 0, args.join(' '))
}
async function waitFor(fn, timeout = 45000) {
  const end = Date.now() + timeout
  while (!(await fn())) {
    if (Date.now() > end) throw new Error('Condition timed out')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
async function start(args, cwd, port) {
  const process = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'pipe' })
  processes.push(process)
  await waitFor(async () => {
    try {
      return (await fetch(`http://localhost:${port}/release.json`)).ok
    } catch {
      return false
    }
  })
  return process
}
await run(['bun', 'install', '--ignore-scripts'])
await run([
  'bun',
  join(parent, 'node_modules/@doan-labs/ipduo/index.mjs'),
  'create',
  'field-guide',
  '--packages',
  artifactPath
])
const project = join(parent, 'field-guide')
await run(['bun', 'install', '--ignore-scripts'], project)
const cli = join(project, 'node_modules/@doan-labs/ipduo/index.mjs')
const appSource = await Bun.file('examples/fold-compass/main.tsx').text()
await Bun.write(join(project, 'main.tsx'), appSource)
const id = 'dev.example.field-guide'
const server = Bun.serve({
  port: 3118,
  async fetch(req) {
    const path = new URL(req.url).pathname
    const file = Bun.file(join(root, 'dist', path === '/' ? 'index.html' : path))
    return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
  }
})
const profile = await mkdtemp(join(tmpdir(), 'duo-workflow-browser-'))
const launch = () =>
  puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: profile,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars']
  })
let browser = await launch()
let page = await browser.newPage()
const evidence = { project, artifacts, checks: [] }
const url = 'http://localhost:3118/'
async function view(page) {
  await page.setViewport({ width: 818, height: 664 })
  return page
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelectorAll('iframe[data-state="ready"]').length === 2, {
    timeout: 60000
  })
}
async function input(page, label, value) {
  await page.evaluate(
    ({ label, value }) => {
      const input = document.querySelector(`[aria-label="${label}"]`)
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    { label, value }
  )
}
async function loadCatalog(page) {
  await page.waitForSelector('[aria-label="Developer catalog URL"]')
  await input(page, 'Developer catalog URL', 'http://localhost:3117/index.json')
  await page.evaluate(() =>
    document.querySelector('[aria-label="Developer catalog URL"]').closest('form').requestSubmit()
  )
  await page.waitForSelector(`[data-store-app="${id}"]`)
}
async function button(page, label) {
  await page.waitForFunction(
    ({ id, label }) =>
      [...(document.querySelector(`[data-store-app="${id}"]`)?.querySelectorAll('button') ?? [])].some(
        (b) => b.textContent.trim() === label
      ),
    { timeout: 45000 },
    { id, label }
  )
  await page.evaluate(
    ({ id, label }) =>
      [...document.querySelector(`[data-store-app="${id}"]`).querySelectorAll('button')]
        .find((b) => b.textContent.trim() === label)
        .click(),
    { id, label }
  )
}
async function read(page, store, key) {
  return page.evaluate(
    async ({ store, key }) => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open('ipduo')
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      })
      const result = await new Promise((resolve) => {
        const r = db.transaction(store).objectStore(store).get(key)
        r.onsuccess = () => resolve(r.result)
      })
      db.close()
      return result
    },
    { store, key }
  )
}
async function note(page, value) {
  const frame = page.frames().find((f) => f.parentFrame())
  await frame.waitForSelector('[aria-label="Field note"]')
  if (value !== undefined) {
    await input(frame, 'Field note', value)
    await frame.waitForFunction(
      () => document.querySelector('[role="status"]').textContent === 'Saved in this app only'
    )
  }
  return frame.$eval('[aria-label="Field note"]', (input) => input.value)
}
async function build(version, source = appSource) {
  const manifest = await Bun.file(join(project, 'manifest.json')).json()
  manifest.version = version
  await Bun.write(join(project, 'manifest.json'), JSON.stringify(manifest))
  await Bun.write(join(project, 'CHANGELOG.md'), `# ${version}\n\nWorkflow verification.\n`)
  await Bun.write(join(project, 'main.tsx'), source)
  await run(['bun', cli, 'check', '.'], project)
  await run(['bun', cli, 'build', '.'], project)
}
try {
  await view(page)
  const dev = await start(['bun', cli, 'dev', '.', '--port', '3115', '--simulator', url], project, 3115)
  await page.goto(`${url}?debug&dev=http://localhost:3115&app=${id}&deg=180`, { timeout: 120000 })
  await ready(page)
  await note(page, 'preview memo')
  const ns = `dev:http://localhost:3115:${id}`
  assert.equal(await read(page, 'appdata', [ns, 'field-note']), 'preview memo')
  await page.reload({ timeout: 120000 })
  await ready(page)
  assert.equal(await note(page), 'preview memo')
  await page.screenshot({ path: `${cache}/preview.png` })
  evidence.checks.push('Packaged CLI create/install/develop and ?dev= preview reload preserve private data')
  console.log('Preview PASS')
  await page.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  dev.kill('SIGTERM')
  await dev.exited
  await assert.rejects(fetch('http://localhost:3115/release.json'))
  await build('1.0.0')
  const catalog = Bun.spawn(['bun', cli, 'serve', 'dist', '--port', '3117'], {
    cwd: project,
    stdout: 'pipe',
    stderr: 'pipe'
  })
  processes.push(catalog)
  await waitFor(async () => {
    try {
      return (await fetch('http://localhost:3117/index.json')).ok
    } catch {
      return false
    }
  })
  await loadCatalog(page)
  let interrupt = true
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    if (interrupt && request.url().startsWith('http://localhost:3117/') && request.url().endsWith('/app.html')) {
      interrupt = false
      void request.abort()
    } else void request.continue()
  })
  await button(page, 'GET')
  await page.waitForSelector(`[data-store-app="${id}"] [role="alert"]`)
  assert.equal(await read(page, 'installed', id), undefined)
  await button(page, 'GET')
  await button(page, 'OPEN')
  await ready(page)
  assert.equal(await note(page), '')
  await note(page, 'installed memo')
  for (const angle of [180, 120, 0]) {
    await input(page, 'Hinge angle', String(angle))
    const display = angle === 0 ? 'cover' : 'inner'
    const frames = page.frames().filter((f) => f.parentFrame())
    const target = (
      await Promise.all(
        frames.map(async (frame) => ({ frame, display: await frame.$eval('[data-demo]', (e) => e.dataset.display) }))
      )
    ).find((row) => row.display === display).frame
    await target.waitForFunction(
      (angle) => Number(document.querySelector('[data-demo]').dataset.angle) === angle,
      {},
      angle
    )
    assert.equal(await target.$eval('[aria-label="Field note"]', (input) => input.value), 'installed memo')
    await page.screenshot({ path: `${cache}/fold-${angle}.png` })
  }
  evidence.checks.push(
    'Interrupted download leaves no installed record; GET/open/fold/persist succeeds on retry with separate preview data'
  )
  console.log('Install/fold PASS')
  await browser.close()
  browser = await launch()
  page = await view(await browser.newPage())
  await page.goto(`${url}?debug&app=${id}&deg=180`, { timeout: 120000 })
  await ready(page)
  assert.equal(await note(page), 'installed memo')
  evidence.checks.push('Installed launch and private data survive browser-process restart')
  const storePage = await view(await browser.newPage())
  await storePage.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await loadCatalog(storePage)
  const first = await read(storePage, 'installed', id)
  await build('2.0.0', appSource.replaceAll('Fold Compass', 'Fold Compass 2'))
  await loadCatalog(storePage)
  await button(storePage, 'UPDATE')
  await waitFor(async () => !!(await read(storePage, 'installed', id)).candidate)
  const staged = await read(storePage, 'installed', id)
  assert.equal(staged.current, first.current)
  assert.equal(staged.generation, first.generation)
  assert.equal(await note(page), 'installed memo')
  await page.close()
  await waitFor(async () => (await read(storePage, 'installed', id)).current.startsWith('2.0.0+'))
  await button(storePage, 'OPEN')
  await ready(storePage)
  assert.equal(await note(storePage), 'installed memo')
  const title = await storePage
    .frames()
    .find((f) => f.parentFrame())
    .$eval('h1', (e) => e.textContent)
  assert.equal(title, 'Fold Compass 2')
  evidence.checks.push(
    'Explicit update stages while another tab runs, then activates on session end and preserves data'
  )
  console.log('Update PASS')
  await storePage.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  const failing =
    "import { os } from '@doan-labs/ipduo-sdk'; await os.connect(); await os.storage.set('trial-only','failed version edits'); dispatchEvent(new ErrorEvent('error',{message:'Intentional workflow launch failure'}));"
  await build('3.0.0', failing)
  await loadCatalog(storePage)
  await button(storePage, 'UPDATE')
  await waitFor(async () => (await read(storePage, 'installed', id)).current.startsWith('3.0.0+'))
  await button(storePage, 'OPEN')
  await storePage.waitForFunction(() =>
    [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Restore previous version')
  )
  await storePage.evaluate(() =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Restore previous version').click()
  )
  await ready(storePage)
  assert.equal(await note(storePage), 'installed memo')
  assert.equal(await read(storePage, 'appdata', [id, 'trial-only']), undefined)
  const recovered = await read(storePage, 'installed', id)
  assert.ok(recovered.failedVersion.startsWith('3.0.0+'))
  await storePage.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await loadCatalog(storePage)
  await button(storePage, 'Retry update')
  await waitFor(async () => (await read(storePage, 'installed', id)).current.startsWith('3.0.0+'))
  await button(storePage, 'OPEN')
  await storePage.waitForFunction(() =>
    [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Restore previous version')
  )
  await storePage.evaluate(() =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Restore previous version').click()
  )
  await ready(storePage)
  assert.equal(await note(storePage), 'installed memo')
  evidence.checks.push(
    'Failed-launch restore and explicit retry use preserved checkpoints; trial edits do not overwrite restored data'
  )
  await storePage.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await build('4.0.0', appSource.replaceAll('Fold Compass', 'Fold Compass 4'))
  await loadCatalog(storePage)
  await button(storePage, 'UPDATE')
  await waitFor(async () => (await read(storePage, 'installed', id)).current.startsWith('4.0.0+'))
  await button(storePage, 'OPEN')
  await ready(storePage)
  assert.equal(await note(storePage), 'installed memo')
  assert.equal((await read(storePage, 'installed', id)).failedVersion, undefined)
  evidence.checks.push('A newer fixed release is offered after recovery and clears the failed-version marker')
  await storePage.goto(`${url}?debug&app=App%20Store&deg=180`, { timeout: 120000 })
  await loadCatalog(storePage)
  await button(storePage, 'Remove App')
  await waitFor(async () => !(await read(storePage, 'installed', id)))
  assert.equal(await read(storePage, 'appdata', [id, 'field-note']), undefined)
  assert.equal(await read(storePage, 'appdata', [ns, 'field-note']), 'preview memo')
  evidence.checks.push('Uninstall clears installed data and registry while preserving the distinct preview namespace')
  await Bun.write(`${cache}/evidence.json`, JSON.stringify(evidence, null, 2))
  console.log('Developer workflow PASS', JSON.stringify(evidence, null, 2))
} catch (error) {
  const active = (await browser.pages()).at(-1)
  if (active && !active.isClosed()) {
    console.log(await active.evaluate(() => document.body.innerText.slice(-2500)))
    await active.screenshot({ path: `${cache}/failure.png` })
  }
  throw error
} finally {
  await browser.close()
  for (const process of processes) {
    process.kill('SIGTERM')
    await process.exited
  }
  server.stop(true)
}
