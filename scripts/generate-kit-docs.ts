import { resolve } from 'node:path'
import { parseSync } from '@babel/core'

const components = [
  'button',
  'checkbox',
  'icon-button',
  'segmented',
  'select',
  'sheet',
  'text-field',
  'h-stack',
  'large-title',
  'list',
  'menu',
  'navigation-link',
  'placeholder',
  'row',
  'screen',
  'section',
  'sym',
  'text',
  'title',
  'toggle',
  'v-stack',
  'widget',
  'widget-label'
]
const metadata = await Bun.file('packages/uikit/package.json').json()
const api = { package: metadata.name, version: metadata.version, components: [] as unknown[] }
for (const name of components) {
  const path = `packages/uikit/${name}.tsx`
  const source = await Bun.file(path).text()
  const ast = parseSync(source, {
    filename: path,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['typescript', 'jsx'] }
  })!
  const declaration = ast.program.body.find(
    (node) =>
      node.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'TSTypeAliasDeclaration' &&
      node.declaration.id.name.endsWith('Props')
  )
  if (
    !declaration ||
    declaration.type !== 'ExportNamedDeclaration' ||
    declaration.declaration?.type !== 'TSTypeAliasDeclaration'
  )
    throw new Error(`Missing public props: ${path}`)
  const comment = source
    .match(/\/\*\*([\s\S]*?)\*\//)?.[1]
    ?.replace(/\n\s*\* ?/g, '\n')
    .trim()
  if (!comment) throw new Error(`Missing public TSDoc: ${path}`)
  api.components.push({
    name: declaration.declaration.id.name.replace(/Props$/, ''),
    description: comment,
    props: source.slice(declaration.declaration.start!, declaration.declaration.end!),
    source: path
  })
}
const output = JSON.stringify(api, null, 2) + '\n'
const target = resolve('docs/platform/api/uikit.json')
if (process.argv.includes('--check')) {
  if ((await Bun.file(target).text()) !== output)
    throw new Error('UI-kit API docs are stale: bun scripts/generate-kit-docs.ts')
  console.log('UI-kit API docs PASS')
} else await Bun.write(target, output)
