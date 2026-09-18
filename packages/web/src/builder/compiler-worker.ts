import type { NodePath } from '@babel/core'
import { packages, transform } from '@babel/standalone'
import stylex from '@stylexjs/babel-plugin/lib/index.browser.js'
import * as esbuild from 'esbuild-wasm'
import { previewBundle } from '../../../sdk/builder-preview'
import { runtimeURL, wasmURL } from '../generated/builder-assets'
import { parseSource, type Runtime } from './types'

const scope = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (data: unknown) => void }
let boot: Promise<Runtime> | undefined
function runtime() {
  boot ??= (async () => {
    await esbuild.initialize({ wasmURL, worker: false })
    const response = await fetch(runtimeURL, { credentials: 'omit' })
    if (!response.ok) throw new Error('Compiler assets unavailable. Reload the page.')
    return (await response.json()) as Runtime
  })()
  return boot
}
// Token values are produced by the same build as the kit, so browser and build-time hashes agree.
function inlineTokens(tokens: Runtime['tokens']) {
  const t = packages.types
  return {
    visitor: {
      Program(path: NodePath) {
        const names = new Map<string, Record<string, string>>()
        path.traverse({
          ImportDeclaration(importPath) {
            if (importPath.node.source.value !== '@doan-labs/duo-uikit/tokens.stylex') return
            for (const specifier of importPath.node.specifiers) {
              if (
                !t.isImportSpecifier(specifier) ||
                !t.isIdentifier(specifier.imported) ||
                !tokens[specifier.imported.name]
              )
                throw importPath.buildCodeFrameError('Use named token imports from the Duo kit')
              names.set(specifier.local.name, tokens[specifier.imported.name]!)
            }
          }
        })
        path.traverse({
          MemberExpression(member) {
            const node = member.node
            if (!t.isIdentifier(node.object) || !t.isIdentifier(node.property) || node.computed) return
            const value = names.get(node.object.name)?.[node.property.name]
            if (typeof value === 'string') member.replaceWith(t.stringLiteral(value))
          }
        })
      }
    }
  }
}
scope.onmessage = async (event) => {
  try {
    const source = parseSource(event.data)
    const lib = await runtime()
    const rules = new Map<string, [string, { ltr: string; rtl?: string | null }, number]>()
    const virtual = {
      ...source.files,
      '__entry.tsx': `import React from 'react'; import {createRoot} from 'react-dom/client'; import {os} from '@doan-labs/duo-sdk'; import App from './app';
await os.connect(); const root = document.createElement('div'); document.body.append(root);
class Boundary extends React.Component { state={failed:false}; static getDerivedStateFromError(){return {failed:true}} render(){return this.state.failed ? null : this.props.children} }
function Ready(){React.useEffect(()=>{os.ready()},[]); return <App/>}
createRoot(root).render(<Boundary><Ready /></Boundary>);`
    }
    const result = await esbuild.build({
      entryPoints: ['__entry.tsx'],
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2022',
      jsx: 'automatic',
      minify: true,
      logLevel: 'silent',
      plugins: [
        {
          name: 'duo-virtual-files',
          setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
              if (args.path === 'duo-runtime') return { path: 'runtime.js', namespace: 'library' }
              if (Object.hasOwn(lib.files, args.path)) return { path: args.path, namespace: 'library' }
              if (args.kind === 'entry-point') return { path: args.path, namespace: 'project' }
              if (!args.path.startsWith('./') && !args.path.startsWith('../'))
                throw new Error(`Unsupported import: ${args.path}`)
              const parts = args.importer.split('/').slice(0, -1)
              for (const part of args.path.split('/')) {
                if (part === '..') {
                  if (!parts.length) throw new Error('Import leaves project')
                  parts.pop()
                } else if (part !== '.') parts.push(part)
              }
              const path = parts.join('/')
              const found = [path, `${path}.tsx`, `${path}.ts`, `${path}.json`, `${path}/index.tsx`].find((p) =>
                Object.hasOwn(virtual, p)
              )
              if (!found) throw new Error(`Missing source file: ${path}`)
              return { path: found, namespace: 'project' }
            })
            build.onLoad({ filter: /.*/, namespace: 'library' }, (args) => ({
              contents: lib.files[args.path]!,
              loader: 'js'
            }))
            build.onLoad({ filter: /.*/, namespace: 'project' }, (args) => {
              const contents = (virtual as Record<string, string>)[args.path]!
              if (args.path.endsWith('.json')) return { contents, loader: 'json' }
              const out = transform(contents, {
                filename: args.path,
                babelrc: false,
                configFile: false,
                parserOpts: { plugins: ['typescript', 'jsx'] },
                plugins: [inlineTokens(lib.tokens), [stylex, { dev: false, runtimeInjection: false }]]
              })
              for (const rule of out.metadata.stylex ?? []) rules.set(rule[0], rule)
              return { contents: out.code, loader: 'tsx' }
            })
          }
        }
      ]
    })
    const css = lib.css + stylex.processStylexRules([...rules.values()], true)
    const bundle = await previewBundle(result.outputFiles![0]!.text, css, source.name, lib.sdk, lib.kit)
    scope.postMessage({ bundle })
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message.slice(0, 2500) : 'Compilation failed' })
  }
}
