import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { example } from '../packages/web/src/builder/example.ts'

const url = process.argv[2] ?? 'http://localhost:3019/build'
const session = `duo-builder-check-${Date.now()}`
const output = resolve('.cache/debug/builder', session)
await mkdir(output, { recursive: true })
function browser(...args) {
  const result = Bun.spawnSync(['agent-browser', '--session', session, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 45_000
  })
  const stdout = result.stdout.toString()
  if (result.exitCode !== 0 || stdout.includes('✗'))
    throw new Error(`${args[0]} failed (${result.exitCode ?? 'timeout'}): ${stdout} ${result.stderr.toString()}`)
  return stdout
}
function evaluate(js) {
  return browser('eval', '-b', Buffer.from(js).toString('base64'))
}
function assert(js, message) {
  evaluate(`if (!(${js})) throw new Error(${JSON.stringify(message)}); 'PASS'`)
}
function button(name) {
  const line = browser('snapshot', '-i')
    .split('\n')
    .find((line) => line.includes(`button "${name}"`))
  const ref = line?.match(/ref=(\w+)/)?.[1]
  if (!ref) throw new Error(`Button missing: ${name}`)
  browser('scrollintoview', `@${ref}`)
  browser('click', `@${ref}`)
}
function appSnapshot() {
  browser('frame', 'main')
  let snapshot = browser('snapshot', '-i')
  const shell = snapshot.match(/Iframe "Duo simulator" \[ref=(\w+)\]/)?.[1]
  if (!shell) throw new Error('Missing simulator frame')
  browser('frame', `@${shell}`)
  snapshot = browser('snapshot', '-i')
  const app = snapshot.match(/Iframe "Focus(?: Plus)?" \[ref=(\w+)\]/)?.[1]
  if (!app) throw new Error('Missing app frame')
  browser('frame', `@${app}`)
  return browser('snapshot')
}
const changed = structuredClone(example)
changed.name = 'Focus Plus'
changed.summary = 'Added a five-minute preset while keeping your deadline.'
changed.files['app.tsx'] = changed.files['app.tsx']
  .replace('Time to focus.', 'Your focus, upgraded.')
  .replace(
    '<VStack>',
    '<VStack><Button onClick={() => deadline.set(String(Date.now() + 5 * 60 * 1000))}>Start 5 minutes</Button>'
  )
function fixture(source) {
  evaluate(`window.__builderFixture = ${JSON.stringify(JSON.stringify(source))}`)
}
try {
  browser('open', url)
  browser('set', 'viewport', '1440', '900')
  browser('wait', '--text', 'Ready')
  assert('document.documentElement.scrollWidth <= innerWidth', 'Desktop overflow')
  assert('document.body.scrollHeight <= innerHeight + 2', 'Workspace taller than viewport')
  evaluate(`window.__shell = document.querySelector('iframe'); window.__shellDocument = __shell.contentDocument; window.__requests = [];
    window.__previewPost = __shell.contentWindow.postMessage.bind(__shell.contentWindow);
    __shell.contentWindow.postMessage = (message, origin) => { if (message.bundle) window.__lastPreview = structuredClone(message); __previewPost(message, origin) };
    window.__fetch = fetch.bind(window);
    window.fetch = async (url, options) => {
      if (String(url) === 'https://openrouter.ai/api/v1/chat/completions') {
        __requests.push({body: JSON.parse(options.body), credentials: options.credentials, redirect: options.redirect});
        const text = window.__builderFixture; const encoder = new TextEncoder(); let index = 0;
        return new Response(new ReadableStream({pull(controller) {
          if (index >= text.length) { controller.enqueue(encoder.encode('data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\\n\\ndata: [DONE]\\n\\n')); controller.close(); return }
          const part = text.slice(index, index + 97); index += 97;
          controller.enqueue(encoder.encode('data: '+JSON.stringify({choices:[{delta:{content:part}}]})+'\\n\\n'))
        }}), {headers:{'Content-Type':'text/event-stream'}})
      }
      return __fetch(url, options)
    }; 'Fixture installed'`)
  fixture(changed)
  const initial = appSnapshot()
  if (!initial.includes('Time to focus.')) throw new Error('Timer missing')
  button('Start 25 minutes')
  browser('frame', 'main')
  button('Connection')
  browser('find', 'label', 'API key', 'fill', 'test-only-secret')
  browser('find', 'label', 'Describe your app or ask for a change', 'fill', 'Add a five-minute preset')
  button('Build app ↗')
  browser('wait', '--text', changed.summary)
  assert(
    '__shell === document.querySelector("iframe") && __shellDocument === __shell.contentDocument',
    'Simulator reloaded'
  )
  assert(
    '__requests.length === 1 && !JSON.stringify(__requests).includes("test-only-secret")',
    'Key entered request body or unexpected repair'
  )
  const updated = appSnapshot()
  if (
    !updated.includes('Your focus, upgraded.') ||
    !updated.includes('Start 5 minutes') ||
    !/24:[0-5][0-9]/.test(updated)
  )
    throw new Error(`Revision or timer continuity failed: ${updated}`)
  browser('frame', 'main')
  browser('wait', '1000')
  browser('screenshot', resolve(output, 'desktop.png'))
  // Opening the cover creates another sandbox view of the same running app.
  evaluate(`window.__views = [...__shellDocument.querySelectorAll('iframe[data-view]')];`)
  const shellRef = browser('snapshot', '-i').match(/Iframe "Duo simulator" \[ref=(\w+)\]/)?.[1]
  browser('frame', `@${shellRef}`)
  button('Close')
  browser('frame', 'main')
  browser(
    'wait',
    '--fn',
    `document.querySelector('iframe').contentDocument.querySelector('[data-os="narrow"] iframe[data-state="ready"]') !== null`
  )
  assert('__views.every(view => view.isConnected)', 'Folding replaced the inner view')
  browser('wait', '1000')
  browser('screenshot', resolve(output, 'folded.png'))
  browser('frame', `@${browser('snapshot', '-i').match(/Iframe "Duo simulator" \[ref=(\w+)\]/)?.[1]}`)
  button('Open')
  browser('frame', 'main')
  button('Undo')
  browser('wait', '--text', 'Ready')
  if (!appSnapshot().includes('Time to focus.')) throw new Error('Undo failed')
  browser('frame', 'main')
  const invalid = { ...changed, files: { 'app.tsx': 'export default function App( {' } }
  fixture(invalid)
  browser('find', 'label', 'Describe your app or ask for a change', 'fill', 'Broken compiler fixture')
  button('Build app ↗')
  browser('wait', '--text', 'Could not update')
  assert('__requests.length === 3', 'Repair did not stop after one extra request')
  if (!appSnapshot().includes('Time to focus.')) throw new Error('Compiler failure replaced working preview')
  browser('frame', 'main')
  const broken = {
    ...changed,
    files: {
      'app.tsx': `import {os} from '@doan-labs/duo-sdk'; await os.connect(); await os.storage.set('deadline', '0'); throw new Error('startup fixture'); export default function App() { return null }`
    }
  }
  fixture(broken)
  browser('find', 'label', 'Describe your app or ask for a change', 'fill', 'Startup failure fixture')
  button('Build app ↗')
  browser('wait', '--text', 'Could not update')
  const recovered = appSnapshot()
  if (!recovered.includes('Time to focus.') || !/2[0-4]:[0-5][0-9]/.test(recovered))
    throw new Error('Startup failure did not restore preview and data')
  browser('frame', 'main')
  evaluate(
    `window.fetch = (url, options) => String(url).includes('/chat/completions') ? new Promise((resolve, reject) => { options.signal.addEventListener('abort', () => { window.__cancelled = true; reject(new DOMException('Stopped', 'AbortError')) }, {once:true}) }) : __fetch(url, options)`
  )
  browser('find', 'label', 'Describe your app or ask for a change', 'fill', 'Cancelled fixture')
  button('Build app ↗')
  browser('wait', '--text', 'Generating')
  button('Stop')
  browser('wait', '--text', 'Stopped')
  assert('__cancelled === true', 'Stop did not abort the provider request')
  assert(
    'document.querySelector("[role=status]").textContent === "Stopped" && document.querySelector("button[type=submit]") !== null',
    'Stop restarted generation'
  )
  browser('set', 'viewport', '390', '844')
  assert('document.documentElement.scrollWidth <= innerWidth', 'Mobile overflow')
  browser('screenshot', resolve(output, 'mobile-chat.png'))
  button('Preview')
  browser('screenshot', resolve(output, 'mobile-preview.png'))
  assert('__shell === document.querySelector("iframe")', 'Mobile tab remounted simulator')
  evaluate(`window.__integrityReply = null; addEventListener('message', e => { if(e.source === __shell.contentWindow && e.data.sequence === 999) window.__integrityReply = e.data });
    const invalid = structuredClone(__lastPreview); invalid.sequence = 999; invalid.bundle.html += '<!-- tampered -->'; __previewPost(invalid, location.origin)`)
  browser('wait', '--fn', 'window.__integrityReply !== null')
  assert(
    '__integrityReply.status === "error" && __integrityReply.message.includes("integrity")',
    'Shell accepted altered document bytes'
  )
  browser('open', url)
  browser('wait', '--text', 'Ready')
  button('Connection')
  assert('document.querySelector("input[type=password]").value === ""', 'Key survived reload')
  assert('document.body.innerText.includes("Add a five-minute preset")', 'Conversation did not persist')
  console.log(
    `PASS: browser compilation, streaming revision, timer continuity, folding, Undo, bounded repair, startup/data rollback, cancellation, integrity refusal, mobile, persistence and key omission. Screenshots: ${output}`
  )
} catch (error) {
  browser('frame', 'main')
  browser('screenshot', resolve(output, 'failure.png'))
  console.error(browser('snapshot'))
  throw error
} finally {
  browser('close')
}
