// Representative invalid submissions fail the gate for the right reason. Each case
// copies the example, breaks one thing, and asserts the failure message names it.
import assert from 'node:assert/strict'
import { cp, mkdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = process.cwd()
const scratch = resolve('.cache/submission-negatives')
const registryPath = join(root, 'community-apps/registry.json')
const registry = await Bun.file(registryPath).json()
const slug = 'negative-case'
const folder = join(root, 'community-apps', slug)
const manifest = await Bun.file('community-apps/fold-compass/manifest.json').json()

async function fresh(id = 'labs.doan.negative-case') {
  await rm(folder, { recursive: true, force: true })
  await cp('community-apps/fold-compass', folder, { recursive: true })
  await Bun.write(join(folder, 'manifest.json'), JSON.stringify({ ...manifest, id }))
  await Bun.write(
    registryPath,
    JSON.stringify({ ...registry, apps: { ...registry.apps, [id]: { folder: slug, maintainers: ['doan-labs'] } } })
  )
}
async function expectFailure(name, pattern) {
  // Async: a synchronous spawn would block the fake catalog server in this process.
  const run = Bun.spawn(['bun', 'scripts/check-submissions.ts', `community-apps/${slug}`], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, DUO_CATALOG_URL: `http://127.0.0.1:${published.port}` }
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited
  ])
  const out = stdout + stderr
  assert.notEqual(exitCode, 0, `${name} should fail`)
  assert.match(out, pattern, `${name}: wrong reason\n${out}`)
  console.log(`PASS ${name}`)
}
// A fake hosted catalog that already lists 1.0.0 of the negative app.
const published = Bun.serve({
  port: 0,
  fetch: () =>
    Response.json({
      apps: {
        'labs.doan.negative-case': {
          name: 'x',
          lane: 'community',
          author: 'x',
          repo: 'https://x',
          releases: [{ release: '1.0.0+00000000', sdk: '0.0.0', bytes: 1, sha256: '0'.repeat(64) }]
        }
      }
    })
})
await mkdir(scratch, { recursive: true })
try {
  await fresh()
  await expectFailure('already published version', /already published; bump the version/)

  await fresh('labs.doan.ipduo.negative-case')
  await expectFailure('reserved namespace', /reserved namespace labs\.doan\.ipduo\./)

  await fresh('dev.other.negative-case')
  await Bun.write(registryPath, JSON.stringify(registry))
  await expectFailure('unregistered id', /registry\.json has no entry/)

  await fresh('dev.other.negative-case')
  await Bun.write(
    join(folder, 'manifest.json'),
    JSON.stringify({ ...manifest, id: 'dev.other.negative-case', permissions: ['geolocation'] })
  )
  await expectFailure('permissions', /only empty "permissions"/)

  await fresh('dev.other.negative-case')
  await rm(join(folder, 'screenshots/cover.png'))
  await expectFailure('missing cover screenshot', /Missing PNG screenshots\/cover\.png/)

  await fresh('dev.other.negative-case')
  await Bun.write(join(folder, 'LICENSE'), 'All rights reserved')
  await expectFailure('license', /MIT license text/)

  await fresh('dev.other.negative-case')
  await Bun.write(join(folder, 'CHANGELOG.md'), '# 0.9.0\n\nOld.\n')
  await expectFailure('changelog', /CHANGELOG\.md has no entry for 1\.0\.0/)

  await fresh('dev.other.negative-case')
  const pkg = await Bun.file(join(folder, 'package.json')).json()
  await Bun.write(
    join(folder, 'package.json'),
    JSON.stringify({ ...pkg, dependencies: { ...pkg.dependencies, lodash: '^4' } })
  )
  await expectFailure('unlocked dependency', /need a bun\.lock: lodash/)

  await fresh('dev.other.negative-case')
  await Bun.write(join(folder, 'main.tsx'), "import '../../packages/shell/main.ts'\n")
  await expectFailure('shell import', /CLI check failed[\s\S]*escapes app folder|Host or external source import/)

  console.log('Negative submissions PASS')
} finally {
  published.stop(true)
  await rm(folder, { recursive: true, force: true })
  await Bun.write(registryPath, `${JSON.stringify(registry, null, 2)}\n`)
}
