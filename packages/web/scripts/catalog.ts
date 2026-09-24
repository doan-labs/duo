// The curated catalog the hosted Store loads at /catalog/index.json: the immutable
// release tree published to the `catalog` branch, plus the bundled Notes and Weather
// releases the root build wrote to dist/cdn, merged by the same publisher CI uses.
// Without the branch (a fresh fork, offline) the bundled releases alone are served.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { publish } from '../../../scripts/publish-catalog.ts'
import { type Catalog, type Release, releaseId } from '../../sdk/manifest.ts'
import { PERMISSIONS } from '../../sdk/permissions.ts'
import { ICONS } from '../../uikit/icons/index.ts'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const here = fileURLToPath(new URL('../', import.meta.url))
const target = `${here}public/catalog`
rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
const fetched = spawnSync('git', ['fetch', '--depth=1', 'origin', 'catalog'], { cwd: root, stdio: 'ignore' })
if (fetched.status === 0) {
  const archive = spawnSync('sh', ['-c', `git archive origin/catalog | tar -x -C "${target}"`], {
    cwd: root,
    stdio: 'inherit'
  })
  if (archive.status !== 0) {
    console.error('catalog: could not unpack origin/catalog')
    process.exit(archive.status ?? 1)
  }
  console.log('catalog: unpacked the catalog branch')
} else console.log('catalog: no catalog branch reachable; serving the bundled releases only')
const result = await publish(`${root}dist/cdn`, target)
console.log(
  `catalog: ${result.published.length} bundled releases added, ${result.reused.length} reused → public/catalog/`
)

// Hosted builds can check out a single commit; with no history behind it HEAD is the
// root commit and counts as touching every path, so every package would date to the
// deploy commit. Complete the history before git log dates any package below.
if (
  spawnSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).stdout.trim() === 'true'
)
  spawnSync('git', ['fetch', '--unshallow', 'origin'], { cwd: root, stdio: 'ignore' })

/** First and last commit that touched the package: the site's Created and Updated. */
const dates = (dir: string) => {
  const log = spawnSync('git', ['log', '--format=%aI', '--', `packages/apps/${dir}`], { cwd: root, encoding: 'utf8' })
  const all = log.stdout.split('\n').filter(Boolean)
  return { created: all.at(-1), updated: all[0] }
}
/** packages/apps/<dir> for an in-repo app id like labs.doan.ipduo.<dir>, else undefined. */
const repoDir = (id: string) => {
  const dir = id.split('.').at(-1)!
  return existsSync(`${root}packages/apps/${dir}`) ? dir : undefined
}

// The shelf on / and /apps reads the same index the Store installs from, so the site
// never lists an app that is not actually published.
const index: Catalog = JSON.parse(readFileSync(`${target}/index.json`, 'utf8'))
const shelf = Object.entries(index.apps).map(([id, app]) => {
  const releases = app.releases.map(
    ({ release }): Release => JSON.parse(readFileSync(`${target}/apps/${id}/${release}/release.json`, 'utf8'))
  )
  const newest = releases[0]!
  const released = releases.map((r) => r.build.at).sort()
  // In-repo officials rebuild into dist/cdn on every site build, so their build.at is
  // the deploy minute, not a date. The package history carries the real dates.
  const dir = app.lane === 'official' ? repoDir(id) : undefined
  const committed = dir ? dates(dir) : undefined
  return {
    id,
    name: app.name,
    author: app.author,
    lane: app.lane,
    repo: app.repo,
    version: newest.manifest.version,
    releases: releases.length,
    created: committed?.created ?? released[0]!,
    updated: committed?.updated ?? released.at(-1)!,
    permissions: (app.permissions ?? []).map((name) => ({ name, label: PERMISSIONS[name].label })),
    icon: `/catalog/apps/${id}/${releaseId(newest)}/icon-1024.png`
  }
})
// Every official app the simulator ships, from the shell's home-screen data: the ones
// with a catalog release above are published; the rest are working in the simulator
// or, when the shell marks them `mock`, still in development behind a static screen.
const shellSource = readFileSync(`${root}packages/shell/apps.ts`, 'utf8')
// Which package each baked app renders from, so its dates can come off the source tree.
const dirs = new Map<string, string>()
for (const [, names = '', dir = ''] of shellSource.matchAll(
  /import \{([^}]+)\} from '@doan-labs\/duo-app-([a-z-]+)\//g
))
  for (const name of names.split(',')) dirs.set(name.trim(), dir)
const seen = new Set<string>()
const shell = [...shellSource.matchAll(/\{ name: '([^']+)'(.*)$/gm)]
  .map(([, name = '', rest = '']) => {
    const dir = [...dirs].find(([component]) => new RegExp(`\\b${component}\\b`).test(rest))?.[1]
    return { name, icon: ICONS[name] ?? '', mock: rest.includes('mock: true'), ...(dir ? dates(dir) : {}) }
  })
  // Folders (Utilities) have no app icon and are not apps.
  .filter(({ name, icon }) => name && icon && !seen.has(name) && seen.add(name))
const generated = `${here}src/generated/catalog.ts`
writeFileSync(
  generated,
  [
    '// Generated by scripts/catalog.ts from public/catalog/index.json. Do not edit.',
    'export type CatalogApp = {',
    '  id: string',
    '  name: string',
    '  author: string',
    "  lane: 'official' | 'community'",
    '  repo: string',
    '  version: string',
    '  releases: number',
    '  created: string',
    '  updated: string',
    '  permissions: { name: string; label: string }[]',
    '  icon: string',
    '}',
    `export const CATALOG: CatalogApp[] = ${JSON.stringify(shelf, null, 2)}`,
    '/** Official apps built into the simulator; `mock` marks a static screen still in development.',
    ' *  Baked apps carry no release, so their dates are the first and last commit on their package. */',
    'export const SHELL: { name: string; icon: string; mock: boolean; created?: string; updated?: string }[] =',
    `  ${JSON.stringify(shell, null, 2)}`,
    ''
  ].join('\n')
)
console.log(`catalog: ${shelf.length} published and ${shell.length} shell apps → src/generated/catalog.ts`)
