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

/** Finds the top-level declaration of `name` in a parsed file and turns it into an entry. */
function describe(pkg: ApiEntry['pkg'], path: string, name: string): ApiEntry | null {
  const { code, body } = load(path)
  const line = (n: Node) => code.slice(0, n.start ?? 0).split('\n').length
  const literalOf = (typeName: string) => {
    for (const s of body) {
      const d = s.type === 'ExportNamedDeclaration' ? s.declaration : s
      if (d?.type === 'TSTypeAliasDeclaration' && d.id.name === typeName && d.typeAnnotation.type === 'TSTypeLiteral')
        return d.typeAnnotation
    }
    return null
  }
  for (const s of body) {
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
    if (d.type === 'TSInterfaceDeclaration' && d.id.name === name) {
      return { pkg, name, kind: 'type', file: path, line: line(s), doc, signature: text(code, d) }
    }
    if (d.type === 'FunctionDeclaration' && d.id?.name === name) {
      const head = code.slice(d.start ?? 0, d.body.start ?? 0).trim()
      const first = d.params[0]
      const ann = first && 'typeAnnotation' in first ? first.typeAnnotation : null
      const t = ann?.type === 'TSTypeAnnotation' ? ann.typeAnnotation : null
      const lit =
        t?.type === 'TSTypeLiteral'
          ? t
          : t?.type === 'TSTypeReference' && t.typeName.type === 'Identifier'
            ? literalOf(t.typeName.name)
            : null
      const isComponent = /^[A-Z]/.test(name) && path.endsWith('.tsx')
      return {
        pkg,
        name,
        kind: isComponent ? 'component' : name.startsWith('use') ? 'hook' : 'function',
        file: path,
        line: line(s),
        doc,
        signature: head,
        ...(lit ? { members: members(code, lit) } : {})
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
    if (s.type !== 'ExportNamedDeclaration' || !s.source) continue
    const target = `${dir}/${s.source.value.replace(/^\.\//, '')}`
    for (const sp of s.specifiers) {
      if (sp.type !== 'ExportSpecifier') continue
      const e = describe(pkg, target, sp.local.name)
      if (e) entries.push(e)
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
