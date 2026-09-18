import { cp, mkdir, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// Staging never changes workspace manifests or publishes to a registry.
const output = resolve(process.argv[2] ?? '.cache/platform-packages')
const publishable = process.argv.includes('--publishable')
const stage = join(output, `stage-${Date.now()}`)
await mkdir(stage, { recursive: true })
const packages = ['sdk', 'uikit', 'cli']
const versions = Object.fromEntries(
  await Promise.all(
    packages.map(async (name) => {
      const metadata = await Bun.file(`packages/${name}/package.json`).json()
      return [metadata.name, metadata.version]
    })
  )
)
const artifacts: Record<string, string> = {}
for (const name of packages) {
  const source = resolve(`packages/${name}`)
  const directory = join(stage, name, 'package')
  await mkdir(directory, { recursive: true })
  for (const item of await readdir(source, { withFileTypes: true })) {
    if (['node_modules', 'tsconfig.json', 'package.json'].includes(item.name) || item.name.endsWith('.test.ts'))
      continue
    await cp(join(source, item.name), join(directory, item.name), { recursive: true })
  }
  const metadata = await Bun.file(join(source, 'package.json')).json()
  delete metadata.scripts
  metadata.engines = { bun: '>=1.3.0' }
  if (publishable) {
    delete metadata.private
    metadata.publishConfig = { access: 'public' }
    metadata.repository = {
      type: 'git',
      url: 'git+https://github.com/doan-labs/duo.git',
      directory: `packages/${name}`
    }
    metadata.description = `Duo developer platform ${name}; Bun-based preview tooling`
  }
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!metadata[field]) continue
    for (const [id, version] of Object.entries(metadata[field]))
      if (String(version).startsWith('workspace:')) metadata[field][id] = versions[id]
  }
  if (name === 'uikit') {
    await cp('public/icons', join(directory, 'assets/icons'), { recursive: true })
    await Bun.write(join(directory, 'assets/asset-manifest.json'), JSON.stringify({ icons: true }))
  }
  if (name === 'cli') {
    await mkdir(join(directory, 'tooling'), { recursive: true })
    const builder = await Bun.file('scripts/build-app.ts').text()
    await Bun.write(
      join(directory, 'tooling/build-app.ts'),
      builder.replaceAll('../packages/sdk/', '@doan-labs/duo-sdk/')
    )
    await cp('stylex-plugin.ts', join(directory, 'stylex-plugin.ts'))
    await cp('OFFICIAL.txt', join(directory, 'OFFICIAL.txt'))
    const html = await Bun.file('packages/shell/index.html').text()
    await Bun.write(join(directory, 'reset.css'), html.match(/<style>([\s\S]*?)<\/style>/)![1]!)
    const entry = await Bun.file(join(directory, 'index.mjs')).text()
    await Bun.write(
      join(directory, 'index.mjs'),
      entry
        .replace('../../scripts/build-app.ts', './tooling/build-app.ts')
        .replaceAll('../sdk/', '@doan-labs/duo-sdk/')
        .replaceAll('../uikit/', '@doan-labs/duo-uikit/')
    )
    const exports = await Bun.file(join(directory, 'index.ts')).text()
    await Bun.write(join(directory, 'index.ts'), exports.replaceAll('../sdk/', '@doan-labs/duo-sdk/'))
    const development = await Bun.file(join(directory, 'development.mjs')).text()
    await Bun.write(
      join(directory, 'development.mjs'),
      development.replace('../../scripts/build-app.ts', './tooling/build-app.ts')
    )
    const root = await Bun.file('package.json').json()
    const kit = await Bun.file('packages/uikit/package.json').json()
    metadata.dependencies = {
      '@doan-labs/duo-sdk': versions['@doan-labs/duo-sdk'],
      '@doan-labs/duo-uikit': versions['@doan-labs/duo-uikit'],
      '@babel/core': root.devDependencies['@babel/core'],
      typescript: root.devDependencies.typescript,
      '@types/react': root.devDependencies['@types/react'],
      '@types/react-dom': root.devDependencies['@types/react-dom'],
      '@stylexjs/babel-plugin': root.devDependencies['@stylexjs/babel-plugin'],
      '@stylexjs/stylex': kit.dependencies['@stylexjs/stylex'],
      react: kit.dependencies.react,
      'react-dom': kit.dependencies.react
    }
  }
  await Bun.write(join(directory, 'package.json'), JSON.stringify(metadata, null, 2))
  const artifact = join(output, `${metadata.name.replace('@', '').replace('/', '-')}-${metadata.version}.tgz`)
  const tar = Bun.spawnSync(['tar', '-czf', artifact, '-C', join(stage, name), 'package'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' }
  })
  if (tar.exitCode) throw new Error(tar.stderr.toString())
  artifacts[metadata.name] = artifact
  if (publishable && name === 'cli') {
    metadata.name = '@doan-labs/duo'
    metadata.description = 'Duo app development CLI (convenience distribution of @doan-labs/duo-cli)'
    await Bun.write(join(directory, 'package.json'), JSON.stringify(metadata, null, 2))
    const alias = join(output, `doan-labs-duo-${metadata.version}.tgz`)
    const packed = Bun.spawnSync(['tar', '-czf', alias, '-C', join(stage, name), 'package'], {
      env: { ...process.env, COPYFILE_DISABLE: '1' }
    })
    if (packed.exitCode) throw new Error(packed.stderr.toString())
    artifacts[metadata.name] = alias
  }
}
await Bun.write(join(output, 'artifacts.json'), JSON.stringify(artifacts, null, 2))
console.log(JSON.stringify(artifacts, null, 2))
