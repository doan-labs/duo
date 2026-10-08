// The publisher's required behaviors, on a scratch catalog tree:
// two apps published sequentially keep both listings; one is updated; a retry with
// identical bytes reuses the original metadata; a rebuilt version with different bytes
// is refused; a failed copy leaves the tree untouched; delisting hides a release without
// deleting its files.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmod, cp, mkdir, rm, writeFile } from 'node:fs/promises'
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

  // Profiles come from the registry; a release-free run with it refreshes them, and a later
  // run without it keeps the last snapshot. Invalid profiles leave the index untouched.
  const profiled = join(scratch, 'registry.json')
  const registry = await Bun.file('community-apps/registry.json').json()
  await Bun.write(profiled, JSON.stringify(registry))
  const empty = join(scratch, 'empty')
  await mkdir(empty, { recursive: true })
  await publish(empty, tree, [], profiled)
  catalog = await index()
  assert.equal(catalog.apps['labs.doan.fold-compass'].developer, 'doan-labs')
  assert.equal(catalog.apps['labs.doan.ipduo.notes'].developer, registry.officialDeveloper)
  assert.deepEqual(catalog.developers, registry.developers)
  await publish(empty, tree)
  assert.deepEqual((await index()).developers, catalog.developers)
  const insecure = { ...registry.developers['doan-labs'], imageUrl: 'http://example.com/a.png' }
  await Bun.write(
    profiled,
    JSON.stringify({ ...registry, developers: { ...registry.developers, 'doan-labs': insecure } })
  )
  await assert.rejects(publish(empty, tree, [], profiled), /imageUrl must be an https URL/)
  assert.deepEqual(await index(), catalog)
  console.log('PASS developer profiles publish from the registry, persist, and refuse bad data')

  // R4: a second identity under an authored version is allowed only as a shared-deps
  // rebuild with verifiable provenance. A scratch git repo supplies controlled commits.
  const prov = join(scratch, 'prov-repo')
  await mkdir(join(prov, 'src/apps/myapp'), { recursive: true })
  const provenance = {
    sourceDir: (id, lane) => (lane === 'official' ? `packages/apps/${id.split('.').at(-1)}` : 'src/apps/myapp'),
    repoRoot: prov
  }
  const git = (args) =>
    Bun.spawnSync(['git', ...args], {
      cwd: prov,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'prov',
        GIT_AUTHOR_EMAIL: 'prov@x',
        GIT_COMMITTER_NAME: 'prov',
        GIT_COMMITTER_EMAIL: 'prov@x'
      }
    })
  const head = () => git(['rev-parse', 'HEAD']).stdout.toString().trim()
  const commitAll = async () => {
    git(['add', '-A'])
    git(['commit', '-qm', 'c'])
    return head()
  }
  const myappManifest = (version = '1.0.0', name = 'Prove') => ({
    id: 'labs.doan.myapp',
    name,
    version,
    lane: 'community',
    entry: 'main.tsx',
    icon: 'icon.png',
    author: 'devin',
    repo: 'https://github.com/doan-labs/duo',
    license: 'MIT'
  })
  const manifestText = JSON.stringify(myappManifest(), null, 2)
  const demoManifest = (version = '2.0.0') => ({
    ...myappManifest(version, 'Demo'),
    id: 'labs.doan.ipduo.demo',
    lane: 'official'
  })
  await writeFile(join(prov, 'src/apps/myapp/manifest.json'), manifestText)
  await writeFile(join(prov, 'src/apps/myapp/main.txt'), 'v1')
  await mkdir(join(prov, 'packages/apps/demo'), { recursive: true })
  await writeFile(join(prov, 'packages/apps/demo/manifest.json'), JSON.stringify(demoManifest(), null, 2))
  await writeFile(join(prov, 'packages/apps/demo/main.txt'), 'v1')
  await mkdir(join(prov, 'packages/sdk'), { recursive: true })
  await writeFile(join(prov, 'packages/sdk/package.json'), JSON.stringify({ version: '0.0.0' }))
  await mkdir(join(prov, 'packages/uikit'), { recursive: true })
  await writeFile(join(prov, 'packages/uikit/package.json'), JSON.stringify({ version: '0.0.0' }))
  await writeFile(join(prov, 'other.txt'), 'v1')
  git(['init', '-q', '-b', 'main'])
  const C1 = await commitAll()
  await writeFile(join(prov, 'other.txt'), 'v2')
  const C2 = await commitAll() // shared-code change only; the app trees are untouched
  await writeFile(join(prov, 'src/apps/myapp/main.txt'), 'v2')
  const C3 = await commitAll() // authored source change under myapp
  await writeFile(join(prov, 'src/apps/myapp/manifest.json'), JSON.stringify(myappManifest('1.0.0', 'Prove2'), null, 2))
  const C4 = await commitAll() // authored manifest change

  const digestOf = (files) => {
    const digest = createHash('sha256')
    for (const [, data] of [...files].sort(([a], [b]) => a.localeCompare(b))) digest.update(data)
    return digest.digest('hex').slice(0, 8)
  }
  // Writes a builder-shaped release folder: release.json + manifest.json + the listed files.
  const craft = async (
    base,
    { manifest, commit, sdk = '0.0.0', kit = '0.0.0', at = '2026-01-01T00:00:00.000Z', seed = 'a', tamper }
  ) => {
    const files = [
      ['app.html', `<!doctype html><title>${seed}</title>`],
      ['icon-1024.png', `png-${seed}`]
    ]
    const release = {
      manifest,
      build: { sdk, kit, at, commit, hash: digestOf(files.map(([p, d]) => [p, new TextEncoder().encode(d)])) },
      files: files.map(([path, text]) => {
        const data = new TextEncoder().encode(text)
        return { path, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }
      })
    }
    if (tamper) tamper(release)
    const dir = join(base, 'apps', manifest.id, `${manifest.version}+${release.build.hash}`)
    await mkdir(dir, { recursive: true })
    for (const [path, text] of files) await writeFile(join(dir, path), text)
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
    await writeFile(join(dir, 'release.json'), JSON.stringify(release, null, 2))
    return { dir, release }
  }

  const ptree = join(scratch, 'prov-tree')
  const publishedAt = '2026-01-01T00:00:00.000Z'
  const rebuiltAt = '2026-02-01T00:00:00.000Z'
  const seeded = await craft(join(scratch, 'prov-built-a'), { manifest: myappManifest(), commit: C1, at: publishedAt })
  await publish(join(scratch, 'prov-built-a'), ptree, [], undefined, provenance)

  // Same authored tree, forward commit, different bytes: a shared-deps rebuild is admitted,
  // the original identity's bytes and metadata stay untouched.
  const rebuilt = await craft(join(scratch, 'prov-built-b'), {
    manifest: myappManifest(),
    commit: C2,
    sdk: '0.0.0',
    at: rebuiltAt,
    seed: 'shared-deps-rebuild'
  })
  const merged = await publish(join(scratch, 'prov-built-b'), ptree, [], undefined, provenance)
  assert.equal(merged.published.length, 1)
  let pindex = JSON.parse(await Bun.file(join(ptree, 'index.json')).text())
  assert.deepEqual(
    pindex.apps['labs.doan.myapp'].releases.map((r) => [r.release.split('+')[0], r.sdk]),
    [
      ['1.0.0', '0.0.0'],
      ['1.0.0', '0.0.0']
    ]
  )
  assert.equal(pindex.apps['labs.doan.myapp'].releases[0].release, `1.0.0+${rebuilt.release.build.hash}`)
  assert.equal(
    await Bun.file(join(ptree, 'apps/labs.doan.myapp', `1.0.0+${seeded.release.build.hash}`, 'app.html')).text(),
    '<!doctype html><title>a</title>'
  )
  console.log('PASS shared-deps rebuild at one version coexists, newest first, original untouched')

  const refuse = async (name, base, pattern) => {
    await assert.rejects(publish(base, ptree, [], undefined, provenance), pattern, name)
    console.log(`PASS ${name}`)
  }
  // Same tree, forward commit, new hash, but a forged sdk claim: committed packages say 0.0.0.
  await craft(join(scratch, 'prov-spoof-sdk'), {
    manifest: myappManifest(),
    commit: C2,
    sdk: '9.9.9',
    seed: 'spoof'
  })
  await refuse('new-hash sdk spoof is refused', join(scratch, 'prov-spoof-sdk'), /does not match .* \(0\.0\.0\)/)

  // The forged kit claim is refused the same way.
  await craft(join(scratch, 'prov-spoof-kit'), {
    manifest: myappManifest(),
    commit: C2,
    kit: '9.9.9',
    seed: 'spoof-kit'
  })
  await refuse('new-hash kit spoof is refused', join(scratch, 'prov-spoof-kit'), /packages\/uikit/)

  // Authored source changed under the published version (C3 touched src/apps/myapp).
  await craft(join(scratch, 'prov-changed-src'), {
    manifest: myappManifest(),
    commit: C3,
    seed: 'changed-source'
  })
  await refuse(
    'authored source change under a published version',
    join(scratch, 'prov-changed-src'),
    /authored source changed/
  )

  // Built manifest no longer matches the manifest committed at the recorded commit (C4).
  await craft(join(scratch, 'prov-anchor'), {
    manifest: myappManifest(),
    commit: C4,
    seed: 'anchor'
  })
  await refuse(
    'built manifest unlike the recorded commit',
    join(scratch, 'prov-anchor'),
    /differs from the recorded commit/
  )

  // Authored manifest itself changed under the published version.
  await craft(join(scratch, 'prov-changed-manifest'), {
    manifest: myappManifest('1.0.0', 'Prove2'),
    commit: C2,
    seed: 'manifest'
  })
  await refuse(
    'authored manifest change under a published version',
    join(scratch, 'prov-changed-manifest'),
    /authored manifest changed/
  )

  // Missing, malformed, or backwards build commits cannot prove provenance. Each case
  // uses its own version so the seeds never clash with one another.
  for (const [name, bad, version, seedCommit] of [
    ['local build commit', 'local', '2.1.0', C1],
    ['absent build commit', '0'.repeat(40), '2.2.0', C1],
    ['non-descendant build commit', C1, '2.3.0', C4]
  ]) {
    const seedDir = join(scratch, `prov-seed-${version}`)
    await craft(seedDir, { manifest: myappManifest(version), commit: seedCommit, at: publishedAt })
    await publish(seedDir, ptree, [], undefined, provenance)
    const base = join(scratch, `prov-bad-${version}`)
    await craft(base, { manifest: myappManifest(version), commit: bad, at: rebuiltAt, seed: 'bad' })
    await refuse(
      `${name} is refused`,
      base,
      name === 'non-descendant build commit' ? /not a descendant/ : /already published as/
    )
  }

  // No resolvable source directory: community apps need the registry mapping.
  const noDir = join(scratch, 'prov-nodir')
  await craft(noDir, { manifest: myappManifest('3.0.0'), commit: C1, at: publishedAt })
  await publish(noDir, ptree, [], undefined, provenance)
  const noDirRebuild = join(scratch, 'prov-nodir-rebuild')
  await craft(noDirRebuild, { manifest: myappManifest('3.0.0'), commit: C2, at: rebuiltAt, seed: 'nodir' })
  await assert.rejects(
    publish(noDirRebuild, ptree, [], undefined, { ...provenance, sourceDir: () => undefined }),
    /cannot be resolved/
  )
  console.log('PASS unresolvable source directory fails closed')

  // Official lane resolves through packages/apps/<last id segment> and merges the same way.
  const offBuilt = join(scratch, 'prov-off-a')
  await craft(offBuilt, { manifest: demoManifest(), commit: C1, at: publishedAt })
  await publish(offBuilt, ptree, [], undefined, provenance)
  const offRebuilt = join(scratch, 'prov-off-b')
  await craft(offRebuilt, {
    manifest: demoManifest(),
    commit: C2,
    sdk: '0.1.0',
    at: rebuiltAt,
    seed: 'official-rebuild'
  })
  // The committed sdk is still 0.0.0 at C2, so a real SDK bump lands at a commit that records it:
  await writeFile(join(prov, 'packages/sdk/package.json'), JSON.stringify({ version: '0.1.0' }))
  const C5 = await commitAll()
  const offRebuilt5 = join(scratch, 'prov-off-c')
  await craft(offRebuilt5, {
    manifest: demoManifest(),
    commit: C5,
    sdk: '0.1.0',
    at: rebuiltAt,
    seed: 'official-rebuild'
  })
  await refuse('official rebuild at a commit that does not record the sdk bump', offRebuilt, /does not match/)
  await publish(offRebuilt5, ptree, [], undefined, provenance)
  pindex = JSON.parse(await Bun.file(join(ptree, 'index.json')).text())
  assert.deepEqual(
    pindex.apps['labs.doan.ipduo.demo'].releases.map((r) => r.sdk),
    ['0.1.0', '0.0.0']
  )
  console.log('PASS official same-version rebuild merges through packages/apps resolution, sdk rows ordered')

  // Forging sdk on an identical artifact is just the reuse path: original metadata stands.
  const spoofSame = join(scratch, 'prov-spoof-same')
  await craft(spoofSame, {
    manifest: myappManifest(),
    commit: C1,
    at: rebuiltAt,
    seed: 'a',
    tamper: (r) => (r.build.sdk = '9.9.9')
  })
  const spoofResult = await publish(spoofSame, ptree, [], undefined, provenance)
  assert.equal(spoofResult.published.length, 0)
  assert.equal(spoofResult.reused.length, 1)
  pindex = JSON.parse(await Bun.file(join(ptree, 'index.json')).text())
  assert.equal(pindex.apps['labs.doan.myapp'].releases.at(-1).sdk, '0.0.0')
  console.log('PASS sdk spoof on an identical release reuses the original metadata')

  // Same identity with different listed file hashes is still refused.
  const tampered = join(scratch, 'prov-tamper')
  await craft(tampered, {
    manifest: myappManifest(),
    commit: C1,
    seed: 'a',
    tamper: (r) => (r.files[0].sha256 = '1'.repeat(64))
  })
  await refuse('same identity with different file hashes', tampered, /different file hashes/)

  // The index-level safety net: two same-version entries with different manifests still throw.
  const netTree = join(scratch, 'prov-net-tree')
  await cp(join(scratch, 'prov-built-a'), netTree, { recursive: true })
  const other = await craft(join(scratch, 'prov-net-extra'), {
    manifest: myappManifest('1.0.0', 'Prove2'),
    commit: C1,
    seed: 'other'
  })
  await cp(other.dir, join(netTree, 'apps/labs.doan.myapp', `1.0.0+${other.release.build.hash}`), { recursive: true })
  const noInput = join(scratch, 'prov-empty')
  await mkdir(noInput, { recursive: true })
  await assert.rejects(publish(noInput, netTree, [], undefined, provenance), /different manifests/)
  console.log('PASS same version under different manifests is rejected at index assembly')

  console.log('Publisher PASS')
} finally {
  await rm(scratch, { recursive: true, force: true })
}
