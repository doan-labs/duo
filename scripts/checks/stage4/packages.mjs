import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const artifactPath = resolve(process.env.PLATFORM_ARTIFACTS ?? '.cache/platform-packages/final/artifacts.json')
const artifacts = await Bun.file(artifactPath).json()
const directory = await mkdtemp(join(tmpdir(), 'duo-gallery-consumer-'))
const dependencies = Object.fromEntries(Object.entries(artifacts).map(([name, file]) => [name, `file:${file}`]))
await Bun.write(
  join(directory, 'package.json'),
  JSON.stringify({ private: true, dependencies, overrides: dependencies })
)
async function run(args, cwd = directory) {
  const child = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'pipe' })
  const [out, err, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ])
  console.log(out, err)
  assert.equal(exit, 0, args.join(' '))
}
await run(['bun', 'install', '--ignore-scripts'])
await run([
  'bun',
  join(directory, 'node_modules/@doan-labs/duo-cli/index.mjs'),
  'create',
  'developer',
  '--packages',
  artifactPath
])
const project = join(directory, 'developer')
await run(['bun', 'install', '--ignore-scripts'], project)
for (const file of ['main.tsx', 'manifest.json', 'CHANGELOG.md', 'icon.png'])
  await cp(`examples/developer/${file}`, join(project, file))
await run(['bun', 'run', 'check'], project)
await run(['bun', 'run', 'build'], project)
const index = await Bun.file(join(project, 'dist/index.json')).json()
const release = index.apps['dev.example.developer'].releases[0].release
const html = await Bun.file(join(project, 'dist/apps/dev.example.developer', release, 'app.html')).text()
assert.ok(html.includes('data:image/'), 'public symbol assets are embedded')
assert.ok(!html.includes('/icons/'), 'no workspace asset server needed')
assert.ok(!html.includes(process.cwd()), 'no workspace source paths in consumer bundle')
const hashes = {}
for (const [name, file] of Object.entries(artifacts))
  hashes[name] = createHash('sha256')
    .update(await Bun.file(file).bytes())
    .digest('hex')
await mkdir('.cache/debug/stage4', { recursive: true })
const evidence = {
  project,
  release,
  artifacts,
  hashes,
  bytes: Buffer.byteLength(html),
  checks: [
    'Installed archives outside repository',
    'Public CLI create/check/build with strict consumer type resolution',
    'All public gallery exports compile with embedded icon/CSS assets',
    'No workspace source paths or asset server'
  ]
}
await Bun.write('.cache/debug/stage4/packages.json', JSON.stringify(evidence, null, 2))
console.log('External gallery packages PASS', JSON.stringify(evidence, null, 2))
