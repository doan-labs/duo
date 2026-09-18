import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseSync, traverse } from '@babel/core'

async function files(folder: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) found.push(...(await files(path)))
    else if (/\.tsx?$/.test(path)) found.push(path)
  }
  return found
}
const failures: string[] = []
for (const file of await files('packages/apps')) {
  const source = await Bun.file(file).text()
  const ast = parseSync(source, {
    filename: file,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['typescript', 'jsx'] }
  })!
  traverse(ast, {
    'StringLiteral|NumericLiteral|TemplateElement'(path) {
      const node = path.node
      const value =
        node.type === 'TemplateElement'
          ? node.value.raw
          : node.type === 'StringLiteral' || node.type === 'NumericLiteral'
            ? node.value
            : undefined
      const literalColor = typeof value === 'string' && /#[\da-f]{3,8}\b|rgba?\(\s*\d/i.test(value)
      const property =
        path.parent.type === 'ObjectProperty' && path.key === 'value' && path.parent.key.type === 'Identifier'
          ? path.parent.key.name
          : ''
      const literalStyle =
        /^(?:fontSize|fontFamily|fontWeight|border(?:TopLeft|TopRight|BottomLeft|BottomRight)?Radius|animationTimingFunction|transitionTimingFunction)$/.test(
          property
        )
      if (literalColor || literalStyle)
        failures.push(
          `${file}:${node.loc?.start.line}: move ${literalColor ? 'fixed colour' : property} into tokens.stylex.ts`
        )
    }
  })
}
if (failures.length) throw new Error(failures.join('\n'))
console.log('App appearance tokens PASS')
