#!/usr/bin/env bun
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { buildApp } from '../../scripts/build-app.ts'
import { manifestValid } from '../sdk/manifest.ts'
import { PERMISSIONS } from '../sdk/permissions.ts'
import { PREVIEW_FEATURES } from '../sdk/preview-features.ts'
import { serveDevelopment } from './development.mjs'
import { typecheckApp, validateSources } from './validate.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = (await Bun.file(join(here, 'OFFICIAL.txt')).exists()) ? here : resolve(here, '../..')
const [command, name] = process.argv.slice(2)
const option = (key, fallback) => {
  const index = process.argv.indexOf(`--${key}`)
  return index < 0 ? fallback : (process.argv[index + 1] ?? fallback)
}
const temporary = () => join(tmpdir(), `ipduo-${crypto.randomUUID()}`)
const folder = resolve(command === 'create' ? (name ?? 'my-app') : (name ?? '.'))
const metadata = () => Bun.file(join(folder, 'manifest.json')).json()
function placeholder() {
  const crc = (bytes) => {
    let n = -1
    for (const b of bytes) {
      n ^= b
      for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0)
    }
    return (n ^ -1) >>> 0
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const size = Buffer.alloc(4)
    size.writeUInt32BE(data.length)
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([size, body, sum])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1024, 0)
  header.writeUInt32BE(1024, 4)
  header[8] = 8
  header[9] = 2
  const pixels = Buffer.alloc((1024 * 3 + 1) * 1024)
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const i = y * 3073 + 1 + x * 3
      pixels[i] = 40
      pixels[i + 1] = 95
      pixels[i + 2] = 220
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0))
  ])
}
async function check() {
  const manifest = await metadata()
  if (!manifestValid(manifest)) throw new Error('Invalid manifest or unsupported permission')
  const changelog = await readFile(join(folder, 'CHANGELOG.md'), 'utf8')
  if (!changelog.includes(manifest.version)) throw new Error('CHANGELOG.md must describe this version')
  if (manifest.lane === 'official') {
    const official = await Bun.file(join(root, 'OFFICIAL.txt')).text()
    if (!official.split(/\s+/).includes(manifest.id)) throw new Error('Official lane requires OFFICIAL.txt membership')
  }
  const files = await validateSources(folder)
  await typecheckApp(folder, files)
  const output = temporary()
  let built
  try {
    built = await buildApp(folder, { output })
  } finally {
    await rm(output, { recursive: true, force: true })
  }
  if (built.bytes > 4 * 1024 * 1024) throw new Error('Bundle exceeds 4 MiB hard cap')
  console.log(
    `PASS ${manifest.id}: ${built.bytes} bytes. Can use: ${(manifest.permissions ?? []).map((p) => PERMISSIONS[p].label).join(', ') || 'none'}`
  )
  if (built.bytes > 1024 * 1024) console.warn('Bundle exceeds 1 MiB soft cap')
}
if (command === 'create') {
  if (!name || !/^[a-z][a-z0-9-]{0,11}$/.test(name))
    throw new Error('Use a kebab-case app name of at most 12 characters')
  await mkdir(folder, { recursive: false })
  const artifacts = option('packages') ? await Bun.file(resolve(option('packages'))).json() : {}
  const sdkVersion = (await Bun.file(Bun.resolveSync('../sdk/package.json', here)).json()).version
  const kitVersion = (await Bun.file(Bun.resolveSync('../uikit/package.json', here)).json()).version
  await Bun.write(
    join(folder, 'manifest.json'),
    JSON.stringify(
      {
        id: `dev.example.${name}`,
        name,
        version: '1.0.0',
        lane: 'community',
        entry: 'main.tsx',
        icon: 'icon.png',
        author: 'Your name',
        repo: 'https://github.com/your-name/your-app',
        license: 'MIT'
      },
      null,
      2
    )
  )
  await Bun.write(
    join(folder, 'package.json'),
    JSON.stringify(
      {
        name: `@example/${name}`,
        private: true,
        type: 'module',
        ...(Object.keys(artifacts).length
          ? { overrides: Object.fromEntries(Object.entries(artifacts).map(([name, path]) => [name, `file:${path}`])) }
          : {}),
        scripts: { check: 'duo check .', build: 'duo build .', dev: 'duo dev .' },
        devDependencies: {
          '@doan-labs/duo-cli': artifacts['@doan-labs/duo-cli'] ? `file:${artifacts['@doan-labs/duo-cli']}` : sdkVersion
        },
        dependencies: {
          '@doan-labs/duo-sdk': artifacts['@doan-labs/duo-sdk']
            ? `file:${artifacts['@doan-labs/duo-sdk']}`
            : sdkVersion,
          '@doan-labs/duo-uikit': artifacts['@doan-labs/duo-uikit']
            ? `file:${artifacts['@doan-labs/duo-uikit']}`
            : kitVersion,
          '@stylexjs/stylex': '0.19.0',
          react: '^19',
          'react-dom': '^19'
        }
      },
      null,
      2
    )
  )
  await Bun.write(join(folder, 'icon.png'), placeholder())
  await Bun.write(join(folder, 'CHANGELOG.md'), '# 1.0.0\n\nInitial release.\n')
  await Bun.write(
    join(folder, 'main.tsx'),
    `import { os } from '@doan-labs/duo-sdk'\nimport { Nav, Page } from '@doan-labs/duo-uikit/nav.tsx'\nimport { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'\nimport * as stylex from '@stylexjs/stylex'\nimport { useEffect } from 'react'\nimport { createRoot } from 'react-dom/client'\nfunction App() {\n  useEffect(() => { requestAnimationFrame(() => os.ready()) }, [])\n  return <main {...stylex.props(styles.root)}><Nav><Page title=${JSON.stringify(name)}><ul><li>Your first Duo app</li></ul></Page></Nav></main>\n}\nconst styles = stylex.create({ root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', color: colors.white, backgroundColor: colors.black } })\nawait os.connect()\ncreateRoot(document.body).render(<App />)\n`
  )
  console.log(`Created ${folder}. In that folder run bun install, bun run check, then bun run build.`)
} else if (command === 'check') await check()
else if (command === 'build') {
  const built = await buildApp(folder, { output: resolve(option('out', join(folder, 'dist'))) })
  console.log(
    JSON.stringify(
      { target: built.target, bytes: built.bytes, catalog: resolve(option('out', join(folder, 'dist')), 'index.json') },
      null,
      2
    )
  )
} else if (command === 'serve') {
  const base = folder
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: Number(option('port', process.env.PORT ?? 5173)),
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname)
      const path = resolve(base, `.${pathname === '/' ? '/index.json' : pathname}`)
      if (!path.startsWith(base + '/')) return new Response('Forbidden', { status: 403 })
      const file = Bun.file(path)
      return (await file.exists())
        ? new Response(file, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
        : new Response('Not found', { status: 404 })
    }
  })
  console.log(`Catalog: http://localhost:${server.port}/index.json`)
  const stop = () => {
    server.stop(true)
    process.exit(0)
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
} else if (command === 'dev' || command === 'preview') {
  if (!PREVIEW_FEATURES.developmentLoader)
    throw new Error(
      'Live dev loading is deferred at the MVP gate. Use build-app.ts with a separate catalog output and install it from App Store.'
    )
  const server = await serveDevelopment(folder, {
    port: Number(option('port', process.env.PORT ?? 5173)),
    watch: command === 'dev',
    onBuild: (bundle) => console.log(`Built ${bundle.bytes} bytes; reload the simulator to use this release.`),
    onError: (error) => console.error(error)
  })
  const simulator = new URL(option('simulator', 'http://localhost:3000/'))
  simulator.searchParams.set('dev', `http://localhost:${server.port}`)
  simulator.searchParams.set('app', server.current().release.manifest.id)
  console.log(`Preview: ${simulator.href}`)
  const stop = () => {
    void server.stop().then(() => process.exit(0))
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
} else
  throw new Error(
    'Usage: duo create <name> [--packages artifacts.json] | check [folder] | build [folder] [--out catalog] | dev [folder] | preview [folder] | serve [catalog]'
  )
