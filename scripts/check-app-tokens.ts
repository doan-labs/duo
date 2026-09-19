// The token gate. Every fixed colour, size, weight, radius, shadow, tracking,
// leading, font and timing in an app or in the shell comes from
// `packages/uikit/tokens.stylex.ts`; an app may only read the `appAppearance`
// keys prefixed with its own folder name, and the shell reads none of them.
import { readdir } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import { parseSync, traverse } from '@babel/core'

async function files(folder: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'shaders') continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) found.push(...(await files(path)))
    else if (/\.tsx?$/.test(path)) found.push(path)
  }
  return found
}
// Canvas paint and the WebGL scene take raw strings; they are not CSS.
const EXEMPT = new Set(['packages/shell/screen.ts', 'packages/shell/main.ts', 'packages/shell/device.ts'])
const STYLE =
  /^(?:fontSize|fontFamily|fontWeight|lineHeight|letterSpacing|border(?:TopLeft|TopRight|BottomLeft|BottomRight)?Radius|boxShadow|textShadow|animationTimingFunction|transitionTimingFunction|backdropFilter|WebkitBackdropFilter)$/
// A ramp step's numeric size, when the ramp itself is not what is wanted.
const OK_NUMBER = new Set([0, 1])

const failures: string[] = []
for (const file of [...(await files('packages/apps')), ...(await files('packages/shell'))]) {
  if (EXEMPT.has(file)) continue
  const source = await Bun.file(file).text()
  const ast = parseSync(source, {
    filename: file,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['typescript', 'jsx'] }
  })!
  const owner = file.startsWith('packages/apps/') ? relative('packages/apps', file).split('/')[0] : null
  traverse(ast, {
    MemberExpression(path) {
      const { object, property } = path.node
      if (object.type !== 'Identifier' || object.name !== 'appAppearance' || property.type !== 'Identifier') return
      if (!owner || !property.name.startsWith(owner))
        failures.push(`${file}:${path.node.loc?.start.line}: appAppearance.${property.name} belongs to another app`)
    },
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
      const literalStyle = STYLE.test(property) && !(typeof value === 'number' && OK_NUMBER.has(value))
      if (literalColor || literalStyle)
        failures.push(
          `${file}:${node.loc?.start.line}: move ${literalColor ? 'fixed colour' : property} into tokens.stylex.ts`
        )
    }
  })
}
if (failures.length) throw new Error(`${failures.length} literals\n${failures.join('\n')}`)
console.log(`Appearance tokens PASS (${basename(process.cwd())})`)
