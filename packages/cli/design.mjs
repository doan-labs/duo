// DESIGN.md section 3 as code: the style values that must come from the kit's
// tokens instead of being typed by hand. The repository gate and `duo check`
// both read it, so an app in this repo and a community app fail the same way.
import { readFile } from 'node:fs/promises'
import { parseSync, traverse } from '@babel/core'

const STYLE =
  /^(?:fontSize|fontFamily|fontWeight|lineHeight|letterSpacing|border(?:TopLeft|TopRight|BottomLeft|BottomRight)?Radius|boxShadow|textShadow|animationTimingFunction|transitionTimingFunction|backdropFilter|WebkitBackdropFilter)$/
// Gaps, padding, margins and insets pick a `space` step, never a number.
const SPACING = /^(?:gap|rowGap|columnGap|(?:padding|margin)(?:Top|Right|Bottom|Left)?|top|right|bottom|left|inset)$/
// A ramp step's numeric size, when the ramp itself is not what is wanted.
const OK_NUMBER = new Set([0, 1])
const COLOR = /#[\da-f]{3,8}\b|rgba?\(\s*\d/i
// A length typed in pixels; `0px` and `1px` pass like the bare numbers.
const PX = /(?<![\w.])(?!0px|1px)\d+(?:\.\d+)?px\b/

const key = (node) =>
  node.key.type === 'Identifier' ? node.key.name : node.key.type === 'StringLiteral' ? node.key.value : ''

// Only a `stylex.create` table: a `{ top, left }` rect in app logic is data, not style.
const inStyles = (path) =>
  path.isCallExpression() &&
  path.node.callee.type === 'MemberExpression' &&
  path.node.callee.object.type === 'Identifier' &&
  path.node.callee.object.name === 'stylex' &&
  path.node.callee.property.type === 'Identifier' &&
  path.node.callee.property.name === 'create'

/** Whether a spacing value, or any conditional branch of it (`{ default, ':hover' }`), is a hand-typed length. */
function typedLength(node) {
  if (node.type === 'NumericLiteral') return !OK_NUMBER.has(node.value)
  if (node.type === 'UnaryExpression' && node.operator === '-') return typedLength(node.argument)
  if (node.type === 'StringLiteral') return PX.test(node.value)
  if (node.type === 'TemplateLiteral') return node.quasis.some((q) => PX.test(q.value.raw))
  if (node.type === 'ObjectExpression')
    return node.properties.some((p) => p.type === 'ObjectProperty' && typedLength(p.value))
  return false
}

/**
 * Every hand-typed style value in one parsed file, as `{ line, kind, property }`.
 * `kind` is `colour`, `style` for the fixed type, radius, shadow and easing
 * scales, or `spacing`.
 */
export function designLiterals(ast) {
  const found = []
  traverse(ast, {
    'StringLiteral|NumericLiteral|TemplateElement'(path) {
      const node = path.node
      const value = node.type === 'TemplateElement' ? node.value.raw : node.value
      const property =
        path.parent.type === 'ObjectProperty' && path.key === 'value' && path.parent.key.type === 'Identifier'
          ? path.parent.key.name
          : ''
      const line = node.loc?.start.line
      if (typeof value === 'string' && COLOR.test(value)) found.push({ line, kind: 'colour', property })
      else if (STYLE.test(property) && !(typeof value === 'number' && OK_NUMBER.has(value)))
        found.push({ line, kind: 'style', property })
    },
    ObjectProperty(path) {
      const property = key(path.node)
      if (SPACING.test(property) && typedLength(path.node.value) && path.findParent(inStyles))
        found.push({ line: path.node.loc?.start.line, kind: 'spacing', property })
    }
  })
  return found
}

/** `designLiterals` for one source file, each hit carrying its path. */
export async function fileDesignLiterals(file) {
  const ast = parseSync(await readFile(file, 'utf8'), {
    filename: file,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['typescript', 'jsx'] }
  })
  return designLiterals(ast).map((hit) => ({ file, ...hit }))
}
