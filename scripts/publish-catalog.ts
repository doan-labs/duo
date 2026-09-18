// Publisher: merges validated release output into the hosted catalog tree. It treats
// releases as data and never executes app code. The catalog tree is a directory (the
// `catalog` branch in CI, any folder locally); files under apps/ are immutable and
// index.json is rewritten last, from every release the tree contains.
import { createHash } from 'node:crypto'
import { access, cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { semver } from '../packages/sdk/compat.ts'
import { type Catalog, type Release, releaseId, releaseValid } from '../packages/sdk/manifest.ts'

const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex')
const RELEASE = 'release.json'

type Entry = { release: Release; text: string; sha256: string }

async function readReleases(tree: string): Promise<Entry[]> {
  const entries: Entry[] = []
  const apps = join(tree, 'apps')
  if (!(await exists(apps))) return entries
  for (const id of await readdir(apps)) {
    for (const identity of await readdir(join(apps, id))) {
      const text = await readFile(join(apps, id, identity, RELEASE), 'utf8').catch(() => undefined)
      if (text === undefined) continue
      const release: unknown = JSON.parse(text)
      if (!releaseValid(release)) throw new Error(`Invalid release metadata: ${join(id, identity)}`)
      if (release.manifest.id !== id || releaseId(release) !== identity)
        throw new Error(`Release folder does not match its metadata: ${join(id, identity)}`)
      entries.push({ release, text, sha256: hash(text) })
    }
  }
  return entries
}

const exists = async (path: string) => {
  try {
    await readdir(path)
    return true
  } catch {
    return false
  }
}

/** Newest version first; identical versions cannot coexist, so the hash is only a stable tiebreaker. */
export function compareReleases(a: Release, b: Release) {
  const x = semver(a.manifest.version)!
  const y = semver(b.manifest.version)!
  return y.major - x.major || y.minor - x.minor || y.patch - x.patch || b.build.hash.localeCompare(a.build.hash)
}

/**
 * The index from every release in the tree, minus delisted identities. App metadata
 * follows the newest listed release. Nothing outside `entries` is dropped, so one
 * app's publication cannot lose another's listing.
 */
export function assembleCatalog(entries: Entry[], delisted: Set<string> = new Set()): Catalog {
  const index: Catalog = { apps: {} }
  const byApp = new Map<string, Entry[]>()
  for (const entry of entries) {
    const id = entry.release.manifest.id
    if (delisted.has(`${id}@${releaseId(entry.release)}`)) continue
    byApp.set(id, [...(byApp.get(id) ?? []), entry])
  }
  for (const [id, list] of [...byApp].sort(([a], [b]) => a.localeCompare(b))) {
    list.sort((a, b) => compareReleases(a.release, b.release))
    const versions = new Set<string>()
    for (const { release } of list) {
      if (versions.has(release.manifest.version))
        throw new Error(`${id} ${release.manifest.version} is published twice with different bytes`)
      versions.add(release.manifest.version)
    }
    const { name, lane, author, repo, permissions } = list[0]!.release.manifest
    index.apps[id] = {
      name,
      lane,
      author,
      repo,
      permissions,
      releases: list.map(({ release, sha256 }) => ({
        release: releaseId(release),
        sdk: release.build.sdk,
        bytes: release.files.find((f) => f.path === 'app.html')!.bytes,
        sha256
      }))
    }
  }
  return index
}

/** Every file a release lists exists in the tree with the listed bytes. */
async function verifyRelease(tree: string, release: Release) {
  const folder = join(tree, 'apps', release.manifest.id, releaseId(release))
  for (const file of release.files) {
    const data = new Uint8Array(await readFile(join(folder, file.path)))
    if (data.length !== file.bytes || hash(data) !== file.sha256)
      throw new Error(
        `Uploaded file does not match its hash: ${join(release.manifest.id, releaseId(release), file.path)}`
      )
  }
}

export type PublishResult = { published: string[]; reused: string[]; delisted: string[] }

/**
 * Copy new releases from `built` (a builder output directory) into `tree`, then rewrite
 * the index. Re-running with the same input reuses the existing release untouched; the
 * original metadata (including its build timestamp) wins over a rebuilt variant.
 */
export async function publish(built: string, tree: string, delist: string[] = []): Promise<PublishResult> {
  built = resolve(built)
  tree = resolve(tree)
  const result: PublishResult = { published: [], reused: [], delisted: delist }
  const existing = await readReleases(tree)
  // Builder output accumulates rebuilds of the same version (dist/cdn on a dev machine);
  // only the newest build of each version is a candidate. Clashes with the tree still fail.
  const newest = new Map<string, Entry>()
  for (const entry of await readReleases(built)) {
    const key = `${entry.release.manifest.id}@${entry.release.manifest.version}`
    const prior = newest.get(key)
    if (!prior || entry.release.build.at > prior.release.build.at) newest.set(key, entry)
  }
  const incoming = [...newest.values()]
  for (const { release } of incoming) {
    const id = release.manifest.id
    const identity = releaseId(release)
    const target = join(tree, 'apps', id, identity)
    const same = existing.find((e) => e.release.manifest.id === id && releaseId(e.release) === identity)
    if (same) {
      const theirs = JSON.stringify(same.release.files)
      const ours = JSON.stringify(release.files)
      if (theirs !== ours) throw new Error(`${id}@${identity} exists with different file hashes; refusing to overwrite`)
      await verifyRelease(tree, same.release)
      result.reused.push(`${id}@${identity}`)
      continue
    }
    const clash = existing.find(
      (e) => e.release.manifest.id === id && e.release.manifest.version === release.manifest.version
    )
    if (clash)
      throw new Error(
        `${id} ${release.manifest.version} is already published as ${releaseId(clash.release)}; bump the version`
      )
    // Stage beside the target so a failed copy never leaves a half-written release folder.
    const staging = `${target}.publishing-${crypto.randomUUID()}`
    await mkdir(staging, { recursive: true })
    try {
      const from = join(built, 'apps', id, identity)
      for (const file of release.files) await cp(join(from, file.path), join(staging, file.path))
      await cp(join(from, 'manifest.json'), join(staging, 'manifest.json'))
      // release.json last: its presence is what marks the folder as a release.
      await cp(join(from, RELEASE), join(staging, RELEASE))
      await rename(staging, target)
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      throw error
    }
    await verifyRelease(tree, release)
    result.published.push(`${id}@${identity}`)
  }
  const delisted = new Set([...(await readDelisted(tree)), ...delist])
  await writeFile(join(tree, 'delisted.json'), JSON.stringify([...delisted].sort(), null, 2))
  const index = assembleCatalog(await readReleases(tree), delisted)
  for (const [id, app] of Object.entries(index.apps))
    for (const listed of app.releases)
      if (!(await present(join(tree, 'apps', id, listed.release, RELEASE))))
        throw new Error(`Index references a missing release: ${id}@${listed.release}`)
  await writeFile(join(tree, 'index.json'), JSON.stringify(index, null, 2))
  return result
}

async function readDelisted(tree: string): Promise<string[]> {
  const text = await readFile(join(tree, 'delisted.json'), 'utf8').catch(() => undefined)
  return text === undefined ? [] : (JSON.parse(text) as string[])
}
const present = (path: string) =>
  access(path).then(
    () => true,
    () => false
  )

if (import.meta.main) {
  const [built, tree] = process.argv.slice(2)
  if (!built || !tree)
    throw new Error(
      'Usage: bun scripts/publish-catalog.ts <built-output> <catalog-tree> [--delist id@version+hash ...]'
    )
  const flag = process.argv.indexOf('--delist')
  const delist = flag < 0 ? [] : process.argv.slice(flag + 1)
  const result = await publish(built, tree, delist)
  console.log(JSON.stringify(result, null, 2))
}
