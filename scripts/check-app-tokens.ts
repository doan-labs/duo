// The token gate. Every fixed colour, size, weight, radius, shadow, tracking,
// leading, font, timing and spacing value in an app, an example or the shell
// comes from `packages/uikit/tokens.stylex.ts`; an app may only read the
// `appAppearance` keys prefixed with its own folder name, and the shell reads
// none of them.
//
// Code written before a rule existed is held by `design-baseline.json`: a
// folder may not add hand-typed values past its count there, and a folder with
// no entry must have none. `--update` lowers counts after a cleanup and refuses
// to raise one, so the debt only shrinks.
import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { parseSync, traverse } from '@babel/core'
import { fileDesignLiterals } from '../packages/cli/design.mjs'

const BASELINE = 'design-baseline.json'

async function files(folder: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (['node_modules', 'shaders', 'dist', 'catalog'].includes(entry.name)) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) found.push(...(await files(path)))
    else if (/\.tsx?$/.test(path)) found.push(path)
  }
  return found
}
async function folders(parent: string): Promise<string[]> {
  return (await readdir(parent, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => join(parent, e.name))
    .sort()
}
// Canvas paint and the WebGL scene take raw strings; they are not CSS.
const EXEMPT = new Set(['packages/shell/screen.ts', 'packages/shell/main.ts', 'packages/shell/device.ts'])

const owners = [
  ...(await folders('packages/apps')),
  'packages/shell',
  ...(await folders('community-apps')),
  ...(await folders('examples'))
]
const baseline: Record<string, number> = await Bun.file(BASELINE).json()
const counts: Record<string, number> = {}
const failures: string[] = []
const hits: Record<string, string[]> = {}
for (const owner of owners) {
  counts[owner] = 0
  hits[owner] = []
  const app = owner.startsWith('packages/apps/') ? basename(owner) : null
  for (const file of await files(owner)) {
    if (EXEMPT.has(file)) continue
    for (const hit of await fileDesignLiterals(file)) {
      counts[owner]++
      hits[owner].push(`${file}:${hit.line}: move ${hit.kind === 'colour' ? 'fixed colour' : hit.property} into tokens`)
    }
    if (owner === 'packages/shell' || app) {
      const ast = parseSync(await Bun.file(file).text(), {
        filename: file,
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ['typescript', 'jsx'] }
      })!
      traverse(ast, {
        MemberExpression(path) {
          const { object, property } = path.node
          if (object.type !== 'Identifier' || object.name !== 'appAppearance' || property.type !== 'Identifier') return
          if (!app || !property.name.startsWith(app))
            failures.push(`${file}:${path.node.loc?.start.line}: appAppearance.${property.name} belongs to another app`)
        }
      })
    }
  }
}

if (process.argv.includes('--update')) {
  const raised = owners.filter((o) => counts[o] > (baseline[o] ?? 0))
  if (raised.length) throw new Error(`--update only lowers counts; these went up:\n${raised.join('\n')}`)
  const next = Object.fromEntries(owners.filter((o) => counts[o]).map((o) => [o, counts[o]]))
  await Bun.write(BASELINE, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`${BASELINE} updated`)
  process.exit(0)
}

for (const owner of owners) {
  const allowed = baseline[owner] ?? 0
  if (counts[owner] > allowed)
    failures.push(`${owner}: ${counts[owner]} hand-typed style values, baseline ${allowed}\n${hits[owner].join('\n')}`)
  else if (counts[owner] < allowed)
    failures.push(`${owner}: down to ${counts[owner]} from ${allowed}; run bun scripts/check-app-tokens.ts --update`)
}
for (const owner of Object.keys(baseline))
  if (!owners.includes(owner)) failures.push(`${BASELINE} lists ${owner}, which no longer exists; run --update`)
if (failures.length) throw new Error(`${failures.length} token failures\n${failures.join('\n')}`)
console.log(`Appearance tokens PASS (${basename(process.cwd())})`)
