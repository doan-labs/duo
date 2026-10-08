// Publisher: merges validated release output into the hosted catalog tree. It treats
// releases as data and never executes app code. The catalog tree is a directory (the
// `catalog` branch in CI, any folder locally); files under apps/ are immutable and
// index.json is rewritten last, from every release the tree contains. Developer profiles
// are mutable: given the registry, they are snapshotted into developers.json; without
// it, the tree's last snapshot stands.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semver } from '../packages/sdk/compat.ts'
import {
  type Catalog,
  type Developer,
  type Manifest,
  type Release,
  releaseId,
  releaseValid
} from '../packages/sdk/manifest.ts'
import { readRegistry, registryIssues } from './registry.ts'

const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex')
const RELEASE = 'release.json'

/** Repo-rooted git plumbing for provenance checks; undefined means the query failed. */
const gitOut = (args: string[], cwd: string) => {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' })
  return run.status === 0 ? run.stdout : undefined
}
const gitOk = (args: string[], cwd: string) => spawnSync('git', args, { cwd }).status === 0

/** Formatting-independent JSON compare: objects sorted by key, arrays keep order. */
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v
  )

type RegistryApps = Record<string, { folder: string }> | undefined

/** Kebab-case relative folder segments only; traversal and absolute paths fail closed. */
const SAFE_FOLDER = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

/**
 * Where an app's authored source lives in the repository: officials under
 * `packages/apps/<last id segment>`, community apps under their registry folder.
 * Community resolution needs the registry; anything unresolvable fails closed.
 */
const sourceDir = (id: string, lane: Manifest['lane'], apps: RegistryApps) => {
  if (lane === 'official') return `packages/apps/${id.split('.').at(-1)}`
  const folder = apps?.[id]?.folder
  return folder && SAFE_FOLDER.test(folder) ? `community-apps/${folder}` : undefined
}

/**
 * The same source directory resolved against a committed registry.json, read
 * data-only from the repository at `commit`. Officials take the fixed path;
 * a community id is unresolvable when the committed registry file is absent,
 * unparseable, has no entry for the id or maps it to an invalid folder.
 */
const committedSourceDir = (commit: string, id: string, lane: Manifest['lane'], repoRoot: string) => {
  if (lane === 'official') return `packages/apps/${id.split('.').at(-1)}`
  const text = gitOut(['show', `${commit}:community-apps/registry.json`], repoRoot)
  if (text === undefined) return undefined
  try {
    const folder = (JSON.parse(text) as { apps?: Record<string, { folder?: unknown }> }).apps?.[id]?.folder
    return typeof folder === 'string' && SAFE_FOLDER.test(folder) ? `community-apps/${folder}` : undefined
  } catch {
    return undefined
  }
}

const COMMIT = /^[a-f\d]{40}$/

/**
 * R4 republication gate: a second identity under an already-published version is a
 * shared-deps rebuild only when every authored input provably did not change and the
 * stamped toolchain matches the recorded commit. All checks fail closed.
 *   - identical manifest.json bytes (authored metadata unchanged),
 *   - both build commits are real commit objects, new one a descendant of the old,
 *   - the manifest committed at the new build commit equals the built one (the
 *     recorded commit is genuinely where the app was built from),
 *   - the registry maps the id to the same source folder at both recorded commits
 *     and that mapping equals the live registry's, so a remap cannot point the
 *     identity at a different folder's unchanged tree,
 *   - the app's source tree hash is identical between the two commits (only shared
 *     dependencies may have changed), and the range changed something at all,
 *   - build.sdk/build.kit equal the versions committed in packages/sdk and
 *     packages/uikit at the recorded commit, so a forged sdk/kit claim on a new hash
 *     cannot smuggle an identity the real toolchain never produced.
 */
async function verifySharedRebuild(
  prior: Entry,
  priorDir: string,
  next: Release,
  nextDir: string,
  sourceOf: (id: string, lane: Manifest['lane']) => string | undefined,
  repoRoot: string
): Promise<void> {
  const id = next.manifest.id
  const version = next.manifest.version
  const refuse = (why: string) =>
    new Error(`${id} ${version} is already published as ${releaseId(prior.release)}: ${why}; bump the version`)
  const [priorManifest, nextManifest] = await Promise.all([
    readFile(join(priorDir, 'manifest.json'), 'utf8'),
    readFile(join(nextDir, 'manifest.json'), 'utf8')
  ])
  if (priorManifest !== nextManifest) throw refuse('the authored manifest changed')
  const dir = sourceOf(id, next.manifest.lane)
  if (!dir) throw refuse('the authored source directory cannot be resolved')
  const older = prior.release.build.commit
  const newer = next.build.commit
  if (!COMMIT.test(older) || !COMMIT.test(newer)) throw refuse('build commits are missing or not full SHAs')
  if (
    !gitOk(['cat-file', '-e', `${older}^{commit}`], repoRoot) ||
    !gitOk(['cat-file', '-e', `${newer}^{commit}`], repoRoot)
  )
    throw refuse('recorded build commits are not in repository history')
  if (older !== newer && !gitOk(['merge-base', '--is-ancestor', older, newer], repoRoot))
    throw refuse('the new build commit is not a descendant of the published one')
  const [olderDir, newerDir] = [
    committedSourceDir(older, id, next.manifest.lane, repoRoot),
    committedSourceDir(newer, id, next.manifest.lane, repoRoot)
  ]
  if (!olderDir || !newerDir) throw refuse('the committed registry has no readable source mapping')
  if (olderDir !== newerDir || newerDir !== dir)
    throw refuse('the registry moved this app to a different source folder between the recorded commits')
  const committed = gitOut(['show', `${newer}:${dir}/manifest.json`], repoRoot)
  if (committed === undefined) throw refuse(`no committed manifest at ${newer}:${dir}`)
  if (stableJson(JSON.parse(committed)) !== stableJson(JSON.parse(nextManifest)))
    throw refuse('the built manifest differs from the recorded commit')
  const treeOf = (commit: string) => gitOut(['ls-tree', commit, '--', dir], repoRoot)?.split('\t')[0]?.split(' ')[2]
  const [oldTree, newTree] = [treeOf(older), treeOf(newer)]
  if (!oldTree || !newTree) throw refuse(`no source tree at ${dir} in the recorded commits`)
  if (oldTree !== newTree) throw refuse('the authored source changed under a published version')
  if (older !== newer && gitOk(['diff', '--quiet', older, newer], repoRoot))
    throw refuse('nothing changed in the recorded commit range; a new hash needs shared-code changes')
  for (const [pkg, stamped] of [
    ['packages/sdk', next.build.sdk],
    ['packages/uikit', next.build.kit]
  ] as const) {
    const text = gitOut(['show', `${newer}:${pkg}/package.json`], repoRoot)
    const committedVersion = text === undefined ? undefined : (JSON.parse(text) as { version?: unknown }).version
    if (stamped === undefined) throw refuse(`build metadata does not record a ${pkg} version`)
    if (committedVersion !== stamped)
      throw refuse(`stamped ${pkg} version ${String(stamped)} does not match ${newer} (${String(committedVersion)})`)
  }
}

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

/** Newest version first; inside one version (shared-deps rebuilds) newest build first. */
export function compareReleases(a: Release, b: Release) {
  const x = semver(a.manifest.version)!
  const y = semver(b.manifest.version)!
  return (
    y.major - x.major ||
    y.minor - x.minor ||
    y.patch - x.patch ||
    b.build.at.localeCompare(a.build.at) ||
    b.build.hash.localeCompare(a.build.hash)
  )
}

/** Who publishes what: profiles by handle, each community app's handle, and the official lane's. */
export type Profiles = { official: string; developers: Record<string, Developer>; apps: Record<string, string> }
const PROFILES = 'developers.json'

/**
 * The index from every release in the tree, minus delisted identities. App metadata
 * follows the newest listed release. Nothing outside `entries` is dropped, so one
 * app's publication cannot lose another's listing.
 */
export function assembleCatalog(entries: Entry[], delisted: Set<string> = new Set(), profiles?: Profiles): Catalog {
  const index: Catalog = profiles ? { apps: {}, developers: profiles.developers } : { apps: {} }
  const byApp = new Map<string, Entry[]>()
  for (const entry of entries) {
    const id = entry.release.manifest.id
    if (delisted.has(`${id}@${releaseId(entry.release)}`)) continue
    byApp.set(id, [...(byApp.get(id) ?? []), entry])
  }
  for (const [id, list] of [...byApp].sort(([a], [b]) => a.localeCompare(b))) {
    list.sort((a, b) => compareReleases(a.release, b.release))
    // One authored version may list several identities only as shared-deps rebuilds of the
    // same authored manifest; publish() verifies that provenance, this is the safety net.
    const manifests = new Map<string, string>()
    for (const { release } of list) {
      const written = manifests.get(release.manifest.version)
      if (written !== undefined && written !== JSON.stringify(release.manifest))
        throw new Error(`${id} ${release.manifest.version} is published under different manifests`)
      manifests.set(release.manifest.version, JSON.stringify(release.manifest))
    }
    const { name, lane, author, repo, permissions } = list[0]!.release.manifest
    const developer = profiles?.apps[id] ?? (lane === 'official' ? profiles?.official : undefined)
    index.apps[id] = {
      name,
      lane,
      author,
      repo,
      permissions,
      ...(developer ? { developer } : {}),
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

/** Provenance overrides for callers whose build commits live outside this checkout. */
export type PublishOptions = {
  sourceDir?: (id: string, lane: Manifest['lane'], apps: RegistryApps) => string | undefined
  repoRoot?: string
}

/** Snapshot the registry's developer profiles into the tree, refusing invalid ones. */
async function writeProfiles(tree: string, registryPath: string): Promise<Profiles> {
  const registry = await readRegistry(registryPath)
  const issues = registryIssues(registry)
  if (issues.length) throw new Error(`Invalid developer profiles:\n${issues.join('\n')}`)
  const apps = Object.fromEntries(Object.entries(registry.apps).map(([id, app]) => [id, app.developer]))
  const profiles: Profiles = { official: registry.officialDeveloper, developers: registry.developers, apps }
  await writeFile(join(tree, PROFILES), JSON.stringify(profiles, null, 2))
  return profiles
}

/**
 * Copy new releases from `built` (a builder output directory) into `tree`, then rewrite
 * the index. Re-running with the same input reuses the existing release untouched; the
 * original metadata (including its build timestamp) wins over a rebuilt variant.
 * `registry` (community-apps/registry.json) refreshes the developer profiles.
 */
export async function publish(
  built: string,
  tree: string,
  delist: string[] = [],
  registry?: string,
  options: PublishOptions = {}
): Promise<PublishResult> {
  built = resolve(built)
  tree = resolve(tree)
  const result: PublishResult = { published: [], reused: [], delisted: delist }
  const existing = await readReleases(tree)
  const registryApps = registry ? (await readRegistry(resolve(registry))).apps : undefined
  const sourceOf = options.sourceDir ?? sourceDir
  const repoRoot = options.repoRoot ?? fileURLToPath(new URL('..', import.meta.url))
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
    // Same version, new identity: a shared-deps rebuild must prove its provenance
    // against the newest release already published at that version.
    const clash = existing
      .filter((e) => e.release.manifest.id === id && e.release.manifest.version === release.manifest.version)
      .sort((a, b) => compareReleases(a.release, b.release))[0]
    if (clash)
      await verifySharedRebuild(
        clash,
        join(tree, 'apps', id, releaseId(clash.release)),
        release,
        join(built, 'apps', id, identity),
        (appId, lane) => sourceOf(appId, lane, registryApps),
        repoRoot
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
  const profiles = registry ? await writeProfiles(tree, resolve(registry)) : await readProfiles(tree)
  const index = assembleCatalog(await readReleases(tree), delisted, profiles)
  for (const [id, app] of Object.entries(index.apps))
    for (const listed of app.releases)
      if (!(await present(join(tree, 'apps', id, listed.release, RELEASE))))
        throw new Error(`Index references a missing release: ${id}@${listed.release}`)
  await writeFile(join(tree, 'index.json'), JSON.stringify(index, null, 2))
  return result
}

async function readProfiles(tree: string): Promise<Profiles | undefined> {
  const text = await readFile(join(tree, PROFILES), 'utf8').catch(() => undefined)
  return text === undefined ? undefined : (JSON.parse(text) as Profiles)
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
      'Usage: bun scripts/publish-catalog.ts <built-output> <catalog-tree> [--registry registry.json] [--delist id@version+hash ...]'
    )
  const registryFlag = process.argv.indexOf('--registry')
  const registry = registryFlag < 0 ? undefined : process.argv[registryFlag + 1]
  const flag = process.argv.indexOf('--delist')
  const delist = flag < 0 ? [] : process.argv.slice(flag + 1)
  const result = await publish(built, tree, delist, registry)
  console.log(JSON.stringify(result, null, 2))
}
