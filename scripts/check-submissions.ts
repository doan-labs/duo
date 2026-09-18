// Submission gate for community-apps/<slug>: identity and version, completeness,
// dependencies, release validity through the real builder, and (with --runtime) a
// headless install/launch on both displays. Writes reviewer evidence to
// .cache/submissions/<slug>/ and a Markdown summary to $GITHUB_STEP_SUMMARY when set.
// Usage: bun scripts/check-submissions.ts [community-apps/<slug> ...] [--runtime] [--base origin/main]
import { readdir } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import { semver } from '../packages/sdk/compat.ts'
import { type Catalog, type Manifest, manifestValid, releaseId } from '../packages/sdk/manifest.ts'
import { buildApp } from './build-app.ts'

const root = resolve(import.meta.dir, '..')
const COMMUNITY = 'community-apps'
const PLATFORM_DEPENDENCIES = new Set([
  '@doan-labs/duo-sdk',
  '@doan-labs/duo-uikit',
  '@stylexjs/stylex',
  'react',
  'react-dom'
])
const REQUIRED = ['manifest.json', 'package.json', 'icon.png', 'README.md', 'CHANGELOG.md', 'LICENSE']
const SCREENSHOTS = ['screenshots/inner.png', 'screenshots/cover.png']
const CATALOG_URL = process.env.DUO_CATALOG_URL ?? 'https://duo.doan-labs.com/catalog'

const argv = process.argv.slice(2)
const flag = (name: string) => argv.includes(`--${name}`)
const option = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`)
  return i < 0 ? fallback : (argv[i + 1] ?? fallback)
}
const base = option('base', 'origin/main')
const git = (...args: string[]) => {
  const run = Bun.spawnSync(['git', ...args], { cwd: root })
  return run.exitCode === 0 ? run.stdout.toString() : undefined
}

type Registry = { reserved: string[]; apps: Record<string, { folder: string; maintainers: string[] }> }
type Report = {
  folder: string
  id?: string
  version?: string
  baseline?: string
  release?: string
  bytes?: number
  network: string[]
  dependencies: { added: string[]; beyondPlatform: string[]; lockfile: boolean }
  build?: { sdk: string; kit?: string; commit: string; files: { path: string; bytes: number; sha256: string }[] }
  runtime?: unknown
  failures: string[]
  notes: string[]
}

async function changedFolders(): Promise<string[]> {
  const diff = git('diff', '--name-only', `${base}...HEAD`, '--', COMMUNITY) ?? ''
  const folders = new Set<string>()
  for (const line of diff.split('\n')) {
    const [, slug] = line.split('/')
    if (slug && !slug.includes('.')) folders.add(join(COMMUNITY, slug))
  }
  return [...folders]
}

const isPng = async (path: string) => {
  const file = Bun.file(path)
  if (!(await file.exists())) return false
  const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer())
  return bytes.length === 24 && new DataView(bytes.buffer).getUint32(0) === 0x89504e47
}

async function publishedVersions(id: string): Promise<Set<string> | undefined> {
  try {
    const response = await fetch(`${CATALOG_URL}/index.json`, { signal: AbortSignal.timeout(15000) })
    if (response.status === 404) return new Set()
    if (!response.ok) return undefined
    const catalog = (await response.json()) as Catalog
    return new Set((catalog.apps[id]?.releases ?? []).map((r) => r.release.split('+')[0]!))
  } catch {
    return undefined
  }
}

async function check(folder: string, registry: Registry, evidence: string): Promise<Report> {
  const report: Report = {
    folder,
    network: [],
    dependencies: { added: [], beyondPlatform: [], lockfile: false },
    failures: [],
    notes: []
  }
  const fail = (message: string) => report.failures.push(message)
  const slug = basename(folder)
  if (relative(join(root, COMMUNITY), resolve(root, folder)) !== slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    fail(`Folder must be community-apps/<kebab-case-slug>, got ${folder}`)
  for (const file of REQUIRED) if (!(await Bun.file(join(root, folder, file)).exists())) fail(`Missing ${file}`)
  for (const file of SCREENSHOTS) if (!(await isPng(join(root, folder, file)))) fail(`Missing PNG ${file}`)
  const licenseFile = Bun.file(join(root, folder, 'LICENSE'))
  if ((await licenseFile.exists()) && !/MIT License[\s\S]*Permission is hereby granted/.test(await licenseFile.text()))
    fail('LICENSE must be the MIT license text')

  const manifestFile = Bun.file(join(root, folder, 'manifest.json'))
  if (!(await manifestFile.exists())) return report
  const manifest: unknown = await manifestFile.json().catch(() => undefined)
  if (!manifestValid(manifest)) {
    fail('manifest.json is invalid')
    return report
  }
  const m: Manifest = manifest
  report.id = m.id
  report.version = m.version
  report.network = m.network ?? []
  if (m.lane !== 'community') fail('Community submissions use "lane": "community"')
  if (m.permissions?.length) fail('The first curated release accepts only empty "permissions"')
  for (const prefix of registry.reserved) if (m.id.startsWith(prefix)) fail(`Id uses the reserved namespace ${prefix}`)
  const entry = registry.apps[m.id]
  if (!entry) fail(`community-apps/registry.json has no entry for ${m.id}`)
  else if (entry.folder !== slug) fail(`registry.json maps ${m.id} to ${entry.folder}, not ${slug}`)
  else if (!entry.maintainers.length) fail(`registry.json lists no maintainers for ${m.id}`)
  const duplicates = Object.entries(registry.apps).filter(([id, e]) => e.folder === slug && id !== m.id)
  if (duplicates.length) fail(`Folder ${slug} is registered to another id: ${duplicates.map(([id]) => id).join(', ')}`)

  const changelog = await Bun.file(join(root, folder, 'CHANGELOG.md'))
    .text()
    .catch(() => '')
  if (!changelog.includes(m.version)) fail(`CHANGELOG.md has no entry for ${m.version}`)

  // Version: above the base branch when the folder changed, and never a version the catalog already lists.
  const baselineText = git('show', `${base}:${folder}/manifest.json`)
  if (baselineText) {
    const baseline = JSON.parse(baselineText) as Manifest
    report.baseline = baseline.version
    if (baseline.id !== m.id) fail(`Id changed from ${baseline.id}; identity changes need a maintainer decision`)
    const a = semver(m.version)!
    const b = semver(baseline.version)!
    const higher = a.major - b.major || a.minor - b.minor || a.patch - b.patch
    if (higher <= 0) fail(`Version ${m.version} must be higher than ${baseline.version} on ${base}`)
  } else report.notes.push('New app: no baseline manifest on the base branch')
  const published = await publishedVersions(m.id)
  if (!published) {
    const message = `Published release history at ${CATALOG_URL} was unavailable`
    if (process.env.CI) fail(message)
    else report.notes.push(message)
  } else if (published.has(m.version)) fail(`${m.id} ${m.version} is already published; bump the version`)

  // Dependencies: anything beyond the platform set needs a lockfile and a reviewer's eye.
  const pkg = (await Bun.file(join(root, folder, 'package.json'))
    .json()
    .catch(() => ({}))) as Record<string, Record<string, string>>
  const declared = { ...pkg.dependencies, ...pkg.devDependencies }
  const basePkgText = git('show', `${base}:${folder}/package.json`)
  const basePkg = basePkgText ? (JSON.parse(basePkgText) as Record<string, Record<string, string>>) : {}
  const before = { ...basePkg.dependencies, ...basePkg.devDependencies }
  report.dependencies.added = Object.keys(declared).filter((name) => !(name in before))
  report.dependencies.beyondPlatform = Object.keys(declared).filter((name) => !PLATFORM_DEPENDENCIES.has(name))
  report.dependencies.lockfile = await Bun.file(join(root, folder, 'bun.lock')).exists()
  if (report.dependencies.beyondPlatform.length && !report.dependencies.lockfile)
    fail(`Dependencies beyond the platform set need a bun.lock: ${report.dependencies.beyondPlatform.join(', ')}`)
  if (report.dependencies.beyondPlatform.length)
    report.notes.push(`Needs maintainer dependency review: ${report.dependencies.beyondPlatform.join(', ')}`)
  if (report.failures.length) return report

  // Source and release validity through the CLI and the real builder.
  const cli = Bun.spawnSync(['bun', 'packages/cli/index.mjs', 'check', folder], { cwd: root })
  if (cli.exitCode !== 0) {
    fail(`CLI check failed:\n${cli.stdout.toString()}${cli.stderr.toString()}`.trim())
    return report
  }
  const output = join(evidence, 'catalog')
  try {
    const built = await buildApp(join(root, folder), { output })
    report.release = releaseId(built.release)
    report.bytes = built.bytes
    report.build = { ...built.release.build, files: built.release.files }
    if (built.release.manifest.permissions?.length) fail('Built release declares permissions')
  } catch (error) {
    fail(`Build failed: ${error instanceof Error ? error.message : String(error)}`)
    return report
  }
  if (flag('runtime')) {
    const run = Bun.spawnSync(
      ['bun', 'scripts/checks/submission/runtime.mjs', m.id, output, join(evidence, 'runtime')],
      { cwd: root }
    )
    const text = run.stdout.toString()
    const runtimeFile = Bun.file(join(evidence, 'runtime', 'runtime.json'))
    report.runtime = (await runtimeFile.exists()) ? await runtimeFile.json() : { output: text }
    if (run.exitCode !== 0) fail(`Runtime check failed:\n${text}${run.stderr.toString()}`.trim())
  }
  return report
}

function summarize(reports: Report[]) {
  const lines = ['# Submission checks', '']
  for (const r of reports) {
    lines.push(`## ${r.folder}${r.id ? ` · ${r.id}` : ''}`, '')
    lines.push(`- **Result:** ${r.failures.length ? 'FAIL' : 'PASS (eligible for review, not accepted)'}`)
    if (r.version) lines.push(`- **Version:** ${r.version}${r.baseline ? ` (base ${r.baseline})` : ''}`)
    if (r.release)
      lines.push(`- **Release:** \`${r.release}\`, ${r.bytes} bytes, SDK ${r.build?.sdk}, commit ${r.build?.commit}`)
    lines.push(`- **Network:** ${r.network.join(', ') || 'none'}`)
    lines.push(
      `- **Dependencies:** added ${r.dependencies.added.join(', ') || 'none'}; beyond platform ${r.dependencies.beyondPlatform.join(', ') || 'none'}; lockfile ${r.dependencies.lockfile ? 'yes' : 'no'}`
    )
    for (const note of r.notes) lines.push(`- ${note}`)
    for (const failure of r.failures) lines.push('', '```', failure, '```')
    if (r.build) {
      lines.push('', '| File | Bytes | SHA-256 |', '| --- | ---: | --- |')
      for (const f of r.build.files) lines.push(`| ${f.path} | ${f.bytes} | \`${f.sha256}\` |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

const folders = argv.filter((a) => !a.startsWith('--') && a !== base)
const targets = folders.length ? folders.map((f) => relative(root, resolve(f))) : await changedFolders()
if (!targets.length) {
  console.log('No community-apps folders to check')
  process.exit(0)
}
const registry = (await Bun.file(join(root, COMMUNITY, 'registry.json')).json()) as Registry
for (const [id, entry] of Object.entries(registry.apps))
  if (!(await readdir(join(root, COMMUNITY, entry.folder)).catch(() => undefined)))
    console.warn(`registry.json: ${id} points at a missing folder ${entry.folder}`)
const reports: Report[] = []
for (const folder of targets) {
  const evidence = join(root, '.cache/submissions', basename(folder))
  await Bun.$`rm -rf ${evidence}`.quiet()
  const report = await check(folder, registry, evidence)
  await Bun.write(join(evidence, 'report.json'), JSON.stringify(report, null, 2))
  reports.push(report)
}
const summary = summarize(reports)
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) await Bun.write(process.env.GITHUB_STEP_SUMMARY, summary)
if (reports.some((r) => r.failures.length)) process.exit(1)
