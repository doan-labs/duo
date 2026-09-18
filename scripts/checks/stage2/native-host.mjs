import { cp, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// Test-only instrumentation is copied beside frozen production assets, never into dist.
const stage = process.env.NATIVE_STAGE ?? 'stage2'
if (!/^stage[2-5]$/.test(stage)) throw new Error('Invalid native evidence stage')
const root = resolve(`.cache/debug/${stage}/native-shell`)
await mkdir(root, { recursive: true })
await cp('dist', root, { recursive: true })
const script = `
const endpoint = 'http://localhost:3113';
async function report(value) { await fetch(endpoint + '/report', {method:'POST', body:JSON.stringify(value)}); }
function state() {
  const field = document.querySelector('[aria-label="Developer catalog URL"]');
  const rect = field?.getBoundingClientRect();
  const point = rect ? {x:rect.x+rect.width/2,y:rect.y+rect.height/2} : null;
  return {origin:location.origin, text:document.body.innerText, active:document.activeElement?.outerHTML?.slice(0,500),
    point, hit:point && document.elementFromPoint(point.x,point.y)?.outerHTML?.slice(0,500),
    frames:[...document.querySelectorAll('iframe')].map(f=>({...f.dataset, sandbox:f.getAttribute('sandbox')}))};
}
addEventListener('pointerdown', event=>{void report({kind:'pointer', target:event.target.outerHTML?.slice(0,300), x:event.clientX,y:event.clientY})}, true);
async function command({action,value}) {
  if(action==='catalog') {
    const input=document.querySelector('[aria-label="Developer catalog URL"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.closest('form').requestSubmit();
  }
  if(action==='button') {
    const buttons=[...document.querySelectorAll('button')];
    const button=buttons.find(b=>b.textContent.trim()===value || b.title===value);
    if(!button) throw new Error('Missing button '+value);
    button.click();
  }
  if(action==='angle') {
    const range=document.querySelector('input[aria-label="Hinge angle"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(range,String(value));
    range.dispatchEvent(new Event('input',{bubbles:true}));
  }
  if(action==='focus-catalog') document.querySelector('[aria-label="Developer catalog URL"]').focus();
  if(action==='data') {
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ipduo');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    const data=await new Promise(resolve=>{const r=db.transaction('appdata').objectStore('appdata').get([value,'field-note']);r.onsuccess=()=>resolve(r.result)});
    db.close();return {data};
  }
  return state();
}
setInterval(async()=>{try {const next=await(await fetch(endpoint+'/command')).json(); if(next) await report({kind:'result',command:next,result:await command(next)});}catch(error){await report({kind:'error',error:String(error)})}},500);
void report({kind:'loaded',result:state()});
`
await Bun.write(join(root, 'native-test.js'), script)
const html = await Bun.file(join(root, 'index.html')).text()
await Bun.write(
  join(root, 'index.html'),
  html.replace('</body>', '<script type="module" src="./native-test.js"></script></body>')
)
const config = await Bun.file('packages/shell/desktop/tauri.conf.json').json()
// A raw debug binary's bundle identifier does not partition WKWebView storage.
// The test-only store survives binary restart without touching the ordinary app's data.
const dataStoreIdentifier = [...crypto.getRandomValues(new Uint8Array(16))]
const crate = resolve(`.cache/debug/${stage}/native-crate`)
await cp('packages/shell/desktop', crate, { recursive: true })
// Installed tauri-utils emits Vec<u8> for this array-valued config field.
// Its runtime config adapter also omits this field. Use the explicit builder
// in the copied test crate; production Rust and window settings stay untouched.
const main = await Bun.file(join(crate, 'main.rs')).text()
await Bun.write(
  join(crate, 'main.rs'),
  main
    .replace(
      'fn main() {',
      `fn main() {
    let mut context = tauri::generate_context!();
    let window = context.config().app.windows[0].clone();
    context.config_mut().app.windows.clear();`
    )
    .replace(
      'tauri::Builder::default()',
      `tauri::Builder::default()
        .setup(move |app| {
            tauri::WebviewWindowBuilder::from_config(app, &window)?
                .data_store_identifier([${dataStoreIdentifier.join(',')}])
                .build()?;
            Ok(())
        })`
    )
    .replace('.run(tauri::generate_context!())', '.run(context)')
)
await Bun.write(
  join(crate, 'tauri.conf.json'),
  JSON.stringify({
    ...config,
    identifier: `com.mnismt.iphoneduo.${stage}-native-test`,
    build: { beforeBuildCommand: '', frontendDist: root },
    app: {
      ...config.app,
      windows: config.app.windows.map((window) => ({ ...window, url: 'index.html?debug&app=App%20Store&deg=180' }))
    }
  })
)
await Bun.write(
  `.cache/debug/${stage}/native-test-profile.json`,
  JSON.stringify(
    { crate, dataStoreIdentifier, macosMinimum: '14.0', build: 'bun x tauri build --debug --no-bundle' },
    null,
    2
  )
)
const commands = []
const reports = []
Bun.serve({
  port: 3113,
  async fetch(req) {
    const path = new URL(req.url).pathname
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
    if (req.method === 'OPTIONS') return new Response(null, { headers })
    if (path === '/enqueue') {
      commands.push(await req.json())
      return Response.json({ queued: true }, { headers })
    }
    if (path === '/command') return Response.json(commands.shift() ?? null, { headers })
    if (path === '/report') {
      const report = await req.json()
      reports.push(report)
      await Bun.write(`.cache/debug/${stage}/native-shell-reports.json`, JSON.stringify(reports, null, 2))
      return Response.json({ ok: true }, { headers })
    }
    return Response.json(reports.at(-1) ?? null, { headers })
  }
})
console.log(`Native test harness ready on 3113; build from ${crate}`)
