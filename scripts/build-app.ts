import { createHash } from 'node:crypto'
import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { documentPolicy } from '../packages/sdk/document-policy.ts'
import { type Catalog, manifestValid, type Release, releaseId } from '../packages/sdk/manifest.ts'
import { stylexPlugin } from '../stylex-plugin.ts'

const root = resolve(import.meta.dir, '..')
const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex')
const base64Hash = (data: string) => createHash('sha256').update(data).digest('base64')
const htmlAttribute = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

export function appDocument(js: string, css: string, name: string, network: string[] = []) {
  const policy = documentPolicy(base64Hash(js), [base64Hash(css), base64Hash('')], network)
  return `<!doctype html><html lang="en"><head><meta http-equiv="Content-Security-Policy" content="${htmlAttribute(policy)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${htmlAttribute(name)}</title><style>${css}</style><style id="duo-dynamic"></style></head><body><script type="module">${js}</script></body></html>`
}

async function assets(source: string, assetRoot: string) {
  const urls = [...new Set(source.match(/\/(?:icons|fonts)\/[a-zA-Z0-9._/-]+\.(?:webp|png|woff2?|ttf)/g) ?? [])]
  for (const url of urls) {
    const file = Bun.file(join(assetRoot, url))
    if (!(await file.exists())) throw new Error(`Missing asset ${url}`)
    source = source.replaceAll(
      url,
      `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`
    )
  }
  return source
}

export async function buildApp(
  folder: string,
  options: { dev?: boolean; output?: string; entry?: string; experiment?: boolean } = {}
) {
  folder = resolve(folder)
  const manifest = await Bun.file(join(folder, 'manifest.json')).json()
  if (!manifestValid(manifest, options.dev)) throw new Error('Invalid manifest')
  // Resolve the consumer's installed packages first; the local toolchain is a fallback for in-repo apps.
  const resolveDependency = (name: string) => {
    try {
      return Bun.resolveSync(name, folder)
    } catch {
      try {
        return Bun.resolveSync(name, root)
      } catch {
        return Bun.resolveSync(name, join(root, 'packages/shell'))
      }
    }
  }
  const sdkRoot = dirname(resolveDependency('@doan-labs/duo-sdk/package.json'))
  const kitRoot = dirname(resolveDependency('@doan-labs/duo-uikit/package.json'))
  const sx = stylexPlugin(false, { '@doan-labs/duo-uikit/*': join(kitRoot, '*') })
  const adapter = join(kitRoot, 'sandbox-stylex.ts')
  const assetRoot = (await Bun.file(join(kitRoot, 'assets/asset-manifest.json')).exists())
    ? join(kitRoot, 'assets')
    : join(root, 'public')
  const build = await Bun.build({
    entrypoints: [options.entry ?? join(folder, manifest.entry)],
    target: 'browser',
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      sx.plugin,
      {
        name: 'isolated-stylex',
        setup(build) {
          build.onResolve({ filter: /^@doan-labs\/duo-(sdk|uikit)(\/.*)?$/ }, (args) => {
            return { path: resolveDependency(args.path) }
          })
          build.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, (args) => ({
            path: resolveDependency(args.path)
          }))
          if (options.experiment)
            build.onResolve({ filter: /^\.\/store\.ts$/ }, (args) =>
              args.importer.includes('/apps/notes/')
                ? { path: join(root, 'scripts/checks/stage2/notes-store.ts') }
                : undefined
            )
          build.onResolve({ filter: /^@stylexjs\/stylex$/ }, (args) => ({
            path: args.importer === adapter ? Bun.resolveSync('@stylexjs/stylex', kitRoot) : adapter
          }))
        }
      }
    ]
  })
  if (!build.success) throw new AggregateError(build.logs, 'App build failed')
  const scripts = build.outputs.filter((output) => output.path.endsWith('.js'))
  if (scripts.length !== 1 || build.outputs.some((output) => !/\.(js|css)$/.test(output.path)))
    throw new Error('App must build to one script and inline styles')
  const js = (await assets(await scripts[0]!.text(), assetRoot)).replace(/<\/script/gi, '<\\/script')
  const packagedReset = Bun.file(join(root, 'reset.css'))
  const reset = (await packagedReset.exists())
    ? await packagedReset.text()
    : (await Bun.file(join(root, 'packages/shell/index.html')).text()).match(/<style>([\s\S]*?)<\/style>/)![1]!
  const css = await assets(
    reset +
      (
        await Promise.all(build.outputs.filter((output) => output.path.endsWith('.css')).map((output) => output.text()))
      ).join('\n') +
      sx.css(),
    assetRoot
  )
  const html = appDocument(js, css, manifest.name, manifest.network)
  if (new TextEncoder().encode(html).length > 4 * 1024 * 1024) throw new Error('Bundle exceeds 4 MiB hard cap')
  const icon = new Uint8Array(await Bun.file(join(folder, manifest.icon)).arrayBuffer())
  const view = new DataView(icon.buffer)
  if (
    icon.length < 24 ||
    view.getUint32(0) !== 0x89504e47 ||
    view.getUint32(16) !== 1024 ||
    view.getUint32(20) !== 1024
  )
    throw new Error('Icon must be a 1024px square PNG')
  const files = new Map<string, Uint8Array>([
    ['app.html', new TextEncoder().encode(html)],
    ['icon-1024.png', icon]
  ])
  const sdk = await Bun.file(join(sdkRoot, 'package.json')).json()
  const kit = await Bun.file(join(kitRoot, 'package.json')).json()
  const digest = createHash('sha256')
  for (const [, data] of [...files].sort(([a], [b]) => a.localeCompare(b))) digest.update(data)
  const commit = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: folder }).stdout.toString().trim() || 'local'
  const release: Release = {
    manifest,
    build: {
      sdk: sdk.version,
      kit: kit.version,
      at: new Date().toISOString(),
      commit,
      hash: digest.digest('hex').slice(0, 8)
    },
    files: [...files].map(([path, data]) => ({ path, bytes: data.length, sha256: hash(data) }))
  }
  const output = resolve(options.output ?? join(root, 'dist/cdn'))
  const target = join(output, 'apps', manifest.id, releaseId(release))
  if (await Bun.file(join(target, 'release.json')).exists())
    throw new Error(`Immutable release already exists: ${target}`)
  const temp = `${target}.building-${crypto.randomUUID()}`
  await mkdir(temp, { recursive: true })
  try {
    for (const [path, data] of files) await Bun.write(join(temp, path), data)
    await Bun.write(join(temp, 'release.json'), JSON.stringify(release, null, 2))
    await Bun.write(join(temp, 'manifest.json'), JSON.stringify(manifest, null, 2))
    await rename(temp, target)
  } catch (e) {
    await rm(temp, { recursive: true, force: true })
    throw e
  }
  const index: Catalog = { apps: {} }
  for (const id of await readdir(join(output, 'apps'))) {
    const entries = []
    for (const identity of await readdir(join(output, 'apps', id))) {
      const file = Bun.file(join(output, 'apps', id, identity, 'release.json'))
      if (!(await file.exists())) continue
      const text = await file.text()
      const r: Release = JSON.parse(text)
      entries.push({ r, sha256: hash(text) })
    }
    entries.sort((a, b) => b.r.build.at.localeCompare(a.r.build.at))
    if (!entries.length) continue
    const { name, lane, author, repo, permissions } = entries[0]!.r.manifest
    index.apps[id] = {
      name,
      lane,
      author,
      repo,
      permissions,
      releases: entries.map(({ r, sha256 }) => ({
        release: releaseId(r),
        sdk: r.build.sdk,
        bytes: r.files.find((f) => f.path === 'app.html')!.bytes,
        sha256
      }))
    }
  }
  await mkdir(dirname(join(output, 'index.json')), { recursive: true })
  await Bun.write(join(output, 'index.json'), JSON.stringify(index, null, 2))
  return { release, html, target, bytes: files.get('app.html')!.length }
}

if (import.meta.main) {
  const result = await buildApp(process.argv[2] ?? 'packages/apps/notes', {
    dev: process.argv.includes('--dev'),
    output: process.env.IPDUO_BUILD_OUTPUT,
    entry: process.env.IPDUO_BUILD_ENTRY,
    experiment: process.argv.includes('--experiment')
  })
  console.log(JSON.stringify({ target: result.target, bytes: result.bytes, release: releaseId(result.release) }))
}
