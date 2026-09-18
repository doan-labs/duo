// Writes src/generated/api.ts from the exports of packages/sdk and packages/uikit.
// TypeScript 7 ships no compiler API, so this parses with the Babel parser the
// StyleX plugin already brings and reads the TSDoc comments off the AST.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSync, type types as t } from '@babel/core'
import type { ApiEntry, ApiMember } from '../src/api-types.ts'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const PACKAGES = [
  { pkg: '@doan-labs/ipduo-sdk', dir: 'packages/sdk' },
  { pkg: '@doan-labs/ipduo-uikit', dir: 'packages/uikit' }
] as const

type Node = t.Node
type Parsed = { code: string; body: Node[] }
const parsed = new Map<string, Parsed>()
function load(path: string): Parsed {
  const hit = parsed.get(path)
  if (hit) return hit
  const code = readFileSync(root + path, 'utf8')
  const ast = parseSync(code, {
    filename: root + path,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['typescript', 'jsx'] }
  })
  if (ast?.type !== 'File') throw new Error(`cannot parse ${path}`)
  const out = { code, body: ast.program.body as Node[] }
  parsed.set(path, out)
  return out
}

const cleanDoc = (n: Node | null | undefined) => {
  const c = n?.leadingComments?.filter((c: t.Comment) => c.type === 'CommentBlock' && c.value.startsWith('*')).at(-1)
  if (!c) return ''
  return c.value
    .split('\n')
    .map((l: string) => l.replace(/^\s*\*+\s?/, '').trimEnd())
    .join('\n')
    .trim()
}

const text = (code: string, n: Node) => code.slice(n.start ?? 0, n.end ?? 0)

function members(code: string, lit: t.TSTypeLiteral): ApiMember[] {
  return lit.members.flatMap((m: t.TSTypeElement) => {
    if (m.type !== 'TSPropertySignature' || m.key.type !== 'Identifier') return []
    const p = m as t.TSPropertySignature
    return [
      {
        name: (p.key as { name: string }).name,
        type: p.typeAnnotation ? text(code, p.typeAnnotation.typeAnnotation) : 'unknown',
        optional: !!p.optional,
        doc: cleanDoc(m)
      }
    ]
  })
}

/** `{ variant = 'tinted', as: _as, ...props }` → { variant: "'tinted'" }. */
function defaults(code: string, param: Node | undefined): Record<string, string> {
  const pattern = param?.type === 'ObjectPattern' ? param : param?.type === 'AssignmentPattern' ? param.left : null
  if (pattern?.type !== 'ObjectPattern') return {}
  const out: Record<string, string> = {}
  for (const p of pattern.properties) {
    if (p.type !== 'ObjectProperty' || p.key.type !== 'Identifier' || p.value.type !== 'AssignmentPattern') continue
    out[p.key.name] = text(code, p.value.right)
  }
  return out
}

/** Finds the top-level declaration of `name` in a parsed file and turns it into an entry. */
function describe(pkg: ApiEntry['pkg'], path: string, name: string): ApiEntry | null {
  const { code, body } = load(path)
  const line = (n: Node) => code.slice(0, n.start ?? 0).split('\n').length
  const aliasOf = (typeName: string) => {
    for (const s of body) {
      const d = s.type === 'ExportNamedDeclaration' ? s.declaration : s
      if (d?.type === 'TSTypeAliasDeclaration' && d.id.name === typeName)
        return { doc: cleanDoc(s), type: d.typeAnnotation }
    }
    return null
  }
  // A props type is usually `PrimitiveProps<'button'> & { … }`: the literals
  // become the table, references that are not local aliases are reported as
  // what the props extend.
  const propsOf = (t: t.TSType | null): { members: ApiMember[]; extends: string[]; doc: string } => {
    const out = { members: [] as ApiMember[], extends: [] as string[], doc: '' }
    const visit = (node: t.TSType) => {
      if (node.type === 'TSTypeLiteral') out.members.push(...members(code, node))
      else if (node.type === 'TSIntersectionType') node.types.forEach(visit)
      else if (node.type === 'TSTypeReference' && node.typeName.type === 'Identifier') {
        const alias = aliasOf(node.typeName.name)
        if (alias) {
          out.doc ||= alias.doc
          visit(alias.type)
        } else out.extends.push(text(code, node))
      } else out.extends.push(text(code, node))
    }
    if (t) visit(t)
    return out
  }
  for (const s of body) {
    if (s.type === 'ExportNamedDeclaration' && !s.declaration) {
      // `export { Local as Name }` or `export { Name } from './other.ts'`: follow it once.
      const sp = s.specifiers.find(
        (x) => x.type === 'ExportSpecifier' && x.exported.type === 'Identifier' && x.exported.name === name
      )
      if (!sp || sp.type !== 'ExportSpecifier') continue
      const from = s.source ? `${path.slice(0, path.lastIndexOf('/') + 1)}${s.source.value.replace(/^\.\//, '')}` : path
      if (from === path && sp.local.name === name) continue
      const e = describe(pkg, from, sp.local.name)
      return e && { ...e, name }
    }
    const d = s.type === 'ExportNamedDeclaration' ? s.declaration : s
    if (!d) continue
    const doc = cleanDoc(s)
    if (d.type === 'TSTypeAliasDeclaration' && d.id.name === name) {
      const lit = d.typeAnnotation.type === 'TSTypeLiteral' ? d.typeAnnotation : null
      return {
        pkg,
        name,
        kind: 'type',
        file: path,
        line: line(s),
        doc,
        signature: text(code, d),
        ...(lit ? { members: members(code, lit) } : {})
      }
    }
    if (d.type === 'ClassDeclaration' && d.id?.name === name) {
      const head = code.slice(d.start ?? 0, d.body.start ?? 0).trim()
      return { pkg, name, kind: 'class', file: path, line: line(s), doc, signature: head }
    }
    if (d.type === 'TSInterfaceDeclaration' && d.id.name === name) {
      return { pkg, name, kind: 'type', file: path, line: line(s), doc, signature: text(code, d) }
    }
    if (d.type === 'FunctionDeclaration' && d.id?.name === name) {
      const head = code.slice(d.start ?? 0, d.body.start ?? 0).trim()
      const first = d.params[0]
      const ann = first && 'typeAnnotation' in first ? first.typeAnnotation : null
      const props = propsOf(ann?.type === 'TSTypeAnnotation' ? ann.typeAnnotation : null)
      const dflt = defaults(code, first)
      const isComponent = /^[A-Z]/.test(name) && path.endsWith('.tsx')
      return {
        pkg,
        name,
        kind: isComponent ? 'component' : name.startsWith('use') ? 'hook' : 'function',
        file: path,
        line: line(s),
        // The kit documents each component on its props type, one line above the function.
        doc: doc || props.doc,
        signature: head,
        ...(props.members.length
          ? { members: props.members.map((m) => (dflt[m.name] ? { ...m, default: dflt[m.name] } : m)) }
          : {}),
        ...(props.extends.length ? { extends: props.extends } : {})
      }
    }
    if (d.type === 'VariableDeclaration') {
      for (const v of d.declarations) {
        if (v.id.type !== 'Identifier' || v.id.name !== name) continue
        const init = v.init
        const head =
          init && init.type === 'ArrowFunctionExpression'
            ? `const ${name} = ${code.slice(init.start ?? 0, init.body.start ?? 0).trim()} …`
            : text(code, v)
        return {
          pkg,
          name,
          kind: name.startsWith('use') ? 'hook' : init?.type === 'ArrowFunctionExpression' ? 'function' : 'value',
          file: path,
          line: line(s),
          doc,
          signature: head
        }
      }
    }
  }
  return null
}

const entries: ApiEntry[] = []
for (const { pkg, dir } of PACKAGES) {
  const index = `${dir}/index.ts`
  for (const s of load(index).body) {
    if (s.type !== 'ExportNamedDeclaration') continue
    if (s.declaration?.type === 'VariableDeclaration') {
      // `export const os = createClient()` declared in the index itself.
      for (const v of s.declaration.declarations) {
        const e = v.id.type === 'Identifier' ? describe(pkg, index, v.id.name) : null
        if (e) entries.push(e)
      }
      continue
    }
    if (!s.source) continue
    const target = `${dir}/${s.source.value.replace(/^\.\//, '')}`
    for (const sp of s.specifiers) {
      if (sp.type !== 'ExportSpecifier') continue
      const exported = sp.exported.type === 'Identifier' ? sp.exported.name : sp.local.name
      const e = describe(pkg, target, sp.local.name)
      if (e) entries.push({ ...e, name: exported })
      else console.warn(`api: no declaration for ${sp.local.name} in ${target}`)
    }
  }
}

const versions = Object.fromEntries(
  ['sdk', 'uikit', 'shell', 'cli'].map((d) => {
    const pkg = JSON.parse(readFileSync(`${root}packages/${d}/package.json`, 'utf8')) as {
      name: string
      version: string
    }
    const log = `packages/${d}/CHANGELOG.md`
    return [
      d,
      {
        name: pkg.name,
        version: pkg.version,
        changelog: existsSync(root + log) ? readFileSync(root + log, 'utf8') : null
      }
    ]
  })
)

const out = `// Generated by packages/web/scripts/api.ts from the TSDoc in packages/sdk and packages/uikit. Do not edit.
import type { ApiEntry } from '../api-types'

export const api: ApiEntry[] = ${JSON.stringify(entries, null, 2)}

/** Package versions and changelogs, read from each package.json and CHANGELOG.md when one exists. */
export const versions: Record<string, { name: string; version: string; changelog: string | null }> = ${JSON.stringify(versions, null, 2)}
`
writeFileSync(fileURLToPath(new URL('../src/generated/api.ts', import.meta.url)), out)
console.log(`api: ${entries.length} exports → src/generated/api.ts`)
