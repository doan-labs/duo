// The publisher's required behaviors, on a scratch catalog tree:
// two apps published sequentially keep both listings; one is updated; a retry with
// identical bytes reuses the original metadata; a rebuilt version with different bytes
// is refused; a failed copy leaves the tree untouched; delisting hides a release without
// deleting its files.
import assert from 'node:assert/strict'
import { chmod, cp, mkdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { buildApp } from '../../build-app.ts'
import { publish } from '../../publish-catalog.ts'

// Inside the repository so the scratch app resolves React's transitive packages like an in-repo app.
const scratch = resolve(`.cache/publish-check/${crypto.randomUUID()}`)
await mkdir(scratch, { recursive: true })
const tree = join(scratch, 'catalog')
const app = join(scratch, 'app')
const index = async () => JSON.parse(await Bun.file(join(tree, 'index.json')).text())
const stage = async (version, marker = '') => {
  const out = join(scratch, `built-${crypto.randomUUID()}`)
  await cp('community-apps/fold-compass', app, { recursive: true })
  const manifest = await Bun.file('community-apps/fold-compass/manifest.json').json()
  manifest.version = version
  await Bun.write(join(app, 'manifest.json'), JSON.stringify(manifest))
  const main = await Bun.file('community-apps/fold-compass/main.tsx').text()
  await Bun.write(join(app, 'main.tsx'), marker ? main.replace('Fold Compass', `Fold Compass ${marker}`) : main)
  return { out, ...(await buildApp(app, { output: out })) }
}
try {
  const notes = await buildApp('packages/apps/notes', { output: join(scratch, 'built-notes') })
  const first = await publish(join(scratch, 'built-notes'), tree)
  assert.deepEqual(first.published, [
    `labs.doan.ipduo.notes@${notes.release.manifest.version}+${notes.release.build.hash}`
  ])
  const compass = await stage('1.0.0')
  await publish(compass.out, tree)
  let catalog = await index()
  assert.deepEqual(Object.keys(catalog.apps).sort(), ['labs.doan.fold-compass', 'labs.doan.ipduo.notes'])
  console.log('PASS two apps published sequentially keep both listings')

  // Identical bytes rebuilt later carry a new timestamp; the tree keeps the original metadata.
  const original = await Bun.file(
    join(tree, 'apps/labs.doan.fold-compass', `1.0.0+${compass.release.build.hash}`, 'release.json')
  ).text()
  await new Promise((r) => setTimeout(r, 1100))
  const again = await stage('1.0.0')
  assert.equal(again.release.build.hash, compass.release.build.hash)
  const retry = await publish(again.out, tree)
  assert.deepEqual(retry.published, [])
  assert.equal(retry.reused.length, 1)
  assert.equal(
    await Bun.file(
      join(tree, 'apps/labs.doan.fold-compass', `1.0.0+${compass.release.build.hash}`, 'release.json')
    ).text(),
    original
  )
  console.log('PASS retry reuses the verified existing release and keeps its metadata')

  const changed = await stage('1.0.0', 'B')
  await assert.rejects(publish(changed.out, tree), /already published/)
  assert.deepEqual(await index(), catalog)
  console.log('PASS a reused version with different bytes is refused and the index is unchanged')

  const update = await stage('1.1.0', 'C')
  await publish(update.out, tree)
  catalog = await index()
  assert.equal(catalog.apps['labs.doan.fold-compass'].releases.length, 2)
  assert.ok(catalog.apps['labs.doan.fold-compass'].releases[0].release.startsWith('1.1.0+'))
  assert.ok(catalog.apps['labs.doan.ipduo.notes'])
  console.log('PASS an update lists newest first and keeps history and other apps')

  // A copy that fails halfway (unreadable app.html) leaves no release folder and the old index.
  const broken = await stage('1.2.0', 'D')
  const folder = join(broken.out, 'apps/labs.doan.fold-compass', `1.2.0+${broken.release.build.hash}`)
  await chmod(join(folder, 'app.html'), 0o000)
  await assert.rejects(publish(broken.out, tree))
  assert.deepEqual(await index(), catalog)
  assert.equal(
    await Bun.file(
      join(tree, 'apps/labs.doan.fold-compass', `1.2.0+${broken.release.build.hash}`, 'release.json')
    ).exists(),
    false
  )
  await chmod(join(folder, 'app.html'), 0o644)
  const recovered = await publish(broken.out, tree)
  assert.equal(recovered.published.length, 1)
  console.log('PASS a failed upload leaves the catalog unchanged and the retry finishes')

  const faulty = `labs.doan.fold-compass@1.2.0+${broken.release.build.hash}`
  await publish(broken.out, tree, [faulty])
  catalog = await index()
  assert.ok(catalog.apps['labs.doan.fold-compass'].releases[0].release.startsWith('1.1.0+'))
  assert.equal(
    await Bun.file(
      join(tree, 'apps/labs.doan.fold-compass', `1.2.0+${broken.release.build.hash}`, 'app.html')
    ).exists(),
    true
  )
  console.log('PASS delisting stops offering a release without deleting its files')
  console.log('Publisher PASS')
} finally {
  await rm(scratch, { recursive: true, force: true })
}
