import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { frameAllow } from '../../../packages/sdk/permissions.ts'
import { appDocument, buildApp } from '../../build-app.ts'
import { storageProbe } from './storage-probe.mjs'

const cache = resolve('.cache/debug/stage2')
await mkdir(cache, { recursive: true })
const built = await buildApp('packages/apps/notes', {
  experiment: true,
  entry: resolve('scripts/checks/stage2/notes-probe.tsx'),
  output: `${cache}/build-${Date.now()}`
})
const network = appDocument(
  `
const result = { loader: 'network', origin: location.origin };
for (const [key,url] of Object.entries({ forecast: 'https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current=temperature_2m', geocoding: 'https://geocoding-api.open-meteo.com/v1/search?name=Tokyo&count=1', denied: 'https://example.com', ipc: 'ipc://localhost/test' })) {
  try { const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(15000) }); result[key] = response.ok ? 'ok' : 'HTTP ' + response.status } catch(e) { result[key] = String(e) }
}
parent.postMessage({ stage2: result }, '*');`,
  '',
  'Network probe',
  ['https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com']
)

const hostScript = `
window.results = [];
document.documentElement.style.backgroundColor = 'white';
(${storageProbe.toString()})().then(result => {
  results.push(result); document.querySelector('#result').textContent = JSON.stringify(results,null,2);
  fetch('http://localhost:3107/evidence', { method: 'POST', body: JSON.stringify({ origin: location.origin, result }) }).catch(()=>{});
});
addEventListener('message', e => {
  if (!e.data?.stage2 || ![...document.querySelectorAll('iframe')].some(f => f.contentWindow === e.source)) return;
  results.push(e.data.stage2);
  document.querySelector('#result').textContent = JSON.stringify(results,null,2);
  fetch('http://localhost:3107/evidence', { method: 'POST', body: JSON.stringify({ origin: location.origin, result:e.data.stage2 }) }).catch(()=>{});
});
for (const mode of ['srcdoc','src','network']) {
  const frame = document.createElement('iframe'); frame.name=mode; frame.sandbox='allow-scripts'; frame.allow=${JSON.stringify(frameAllow())};
  frame.width='770';frame.height='500';
  if(mode==='src') frame.src='http://localhost:3107/app.html';
  else frame.srcdoc= mode==='network' ? ${JSON.stringify(network).replaceAll('<', String.fromCharCode(92) + 'u003c')} : ${JSON.stringify(built.html).replaceAll('<', String.fromCharCode(92) + 'u003c')};
  document.body.append(frame);
  const button = document.createElement('button'); button.textContent = 'Show ' + mode;
  button.onclick = () => { for (const f of document.querySelectorAll('iframe')) f.hidden = f !== frame; };
  document.querySelector('#loaders').append(button);
}
`
const host =
  '<!doctype html><html><head><meta charset="utf-8"><title>Stage 2 gates</title></head><body><h1>Stage 2 document and storage gates</h1><nav id="loaders"></nav><details><summary>Probe results</summary><pre id="result"></pre></details><script src="./stage2-host.js"></script></body></html>'
await Bun.write(`${cache}/stage2-gates.html`, host)
await Bun.write(`${cache}/stage2-host.js`, hostScript)
const server = Bun.serve({
  port: 3107,
  async fetch(req) {
    const path = new URL(req.url).pathname
    if (path === '/stage2-host.js') return new Response(hostScript, { headers: { 'Content-Type': 'text/javascript' } })
    if (path === '/evidence' && req.method === 'POST') {
      const body = await req.text()
      console.log(body)
      await Bun.write(`${cache}/native-${Date.now()}.json`, body)
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }
    const content = path === '/app.html' ? built.html : path === '/release.json' ? JSON.stringify(built.release) : host
    return new Response(content, {
      headers: {
        'Content-Type': path === '/release.json' ? 'application/json' : 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
if (process.argv.includes('--serve')) {
  console.log(
    JSON.stringify({ url: 'http://localhost:3107', nativeAsset: `${cache}/stage2-gates.html`, bytes: built.bytes })
  )
} else {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox']
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 1700 })
    page.on('console', (msg) => console.log(msg.type(), msg.text()))
    page.on('pageerror', (e) => console.log('pageerror', String(e)))
    await page.goto('http://localhost:3107')
    await page.waitForFunction(() => window.results?.length === 4, { timeout: 45000 })
    const results = await page.evaluate(() => window.results)
    await page.screenshot({ path: `${cache}/e0-chromium.png`, fullPage: true })
    await Bun.write(`${cache}/e0-chromium.json`, JSON.stringify({ bytes: built.bytes, results }, null, 2))
    for (const mode of ['srcdoc', 'src']) {
      const r = results.find((r) => r.loader === mode)
      assert.equal(r.rendered, true)
      assert.equal(r.cspFirst, true)
      assert.equal(r.icons, true)
      assert.ok(r.lifted > 0)
      assert.equal(r.color, 'rgb(255, 255, 255)')
      assert.equal(r.localStorage, 'denied')
      assert.equal(r.indexedDB, 'denied')
      assert.equal(r.parentDocument, 'denied')
    }
    const net = results.find((r) => r.loader === 'network')
    assert.equal(net.forecast, 'ok')
    assert.equal(net.geocoding, 'ok')
    assert.notEqual(net.denied, 'ok')
    console.log('E0 Chromium PASS', built.bytes)
  } finally {
    await browser.close()
    server.stop()
  }
}
