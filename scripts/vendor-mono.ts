// Packs a local @doan-labs/mono build into vendor/mono/ so Duo can depend on it
// before Mono is on npm. Build Mono first (`bun run --cwd packages/mono build`
// in its checkout), then run `bun scripts/vendor-mono.ts [path/to/mono]`.
// The tarball carries the browser entry, the WASM engine and, when it was
// built, the Node addon of the machine that built it (for `bun test`).

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const mono = resolve(process.argv[2] ?? '../mono')
const pkg = join(mono, 'packages/mono')
const vendor = join(import.meta.dir, '..', 'vendor', 'mono')
const run = (cmd: string[], cwd: string) => {
  const p = Bun.spawnSync(cmd, { cwd, stdout: 'pipe', stderr: 'inherit' })
  if (!p.success) throw new Error(`${cmd.join(' ')} failed`)
  return p.stdout.toString().trim()
}

for (const file of ['dist/index.js', 'dist/worker-host.js', 'wasm/mono.js', 'wasm/mono_bg.wasm'])
  if (!existsSync(join(pkg, file))) throw new Error(`${file} is missing: build Mono first`)
if (run(['git', 'status', '--porcelain', '--', 'crates', 'packages/mono/src'], mono))
  throw new Error('the Mono checkout has uncommitted engine or client changes')

const commit = run(['git', 'rev-parse', 'HEAD'], mono)
const manifest = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'))
const version = `${manifest.version}-duo.${commit.slice(0, 7)}`
const addon = existsSync(join(pkg, 'addon/mono.node'))
// The platform addons are not published, so the optional dependencies only cost failed lookups.
const { optionalDependencies, devDependencies, scripts, ...rest } = manifest
const stage = mkdtempSync(join(tmpdir(), 'mono-vendor-'))
writeFileSync(
  join(stage, 'package.json'),
  `${JSON.stringify({ ...rest, version, files: [...rest.files, ...(addon ? ['addon/mono.node'] : [])] }, null, 2)}\n`
)
cpSync(join(pkg, 'dist'), join(stage, 'dist'), { recursive: true })
mkdirSync(join(stage, 'wasm'))
for (const file of ['mono.js', 'mono_bg.wasm']) cpSync(join(pkg, 'wasm', file), join(stage, 'wasm', file))
if (addon) cpSync(join(pkg, 'addon'), join(stage, 'addon'), { recursive: true })
cpSync(join(mono, 'LICENSE'), join(stage, 'LICENSE'))

mkdirSync(vendor, { recursive: true })
for (const old of readdirSync(vendor)) if (old.endsWith('.tgz')) rmSync(join(vendor, old))
run(['bun', 'pm', 'pack', '--destination', vendor], stage)
rmSync(stage, { recursive: true, force: true })
writeFileSync(
  join(vendor, 'mono.json'),
  `${JSON.stringify({ version, commit, addon: addon ? `${process.platform}-${process.arch}` : null }, null, 2)}\n`
)
console.log(
  `vendor/mono: @doan-labs/mono ${version}${addon ? ` with the ${process.platform}-${process.arch} addon` : ''}`
)
