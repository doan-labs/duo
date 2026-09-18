import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { parseSync, traverse } from '@babel/core'

async function sources(folder) {
  const files = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'catalog'].includes(entry.name)) continue
    const file = join(folder, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`App source must not contain symlinks: ${file}`)
    if (entry.isDirectory()) files.push(...(await sources(file)))
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(file)
  }
  return files
}

/** Source hygiene is a local/CI gate, not a replacement for the opaque sandbox. */
export async function validateSources(folder) {
  folder = await realpath(folder)
  const files = await sources(folder)
  for (const file of files) {
    const code = await readFile(file, 'utf8')
    const ast = parseSync(code, {
      filename: file,
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['typescript', 'jsx'] }
    })
    const imports = []
    traverse(ast, {
      ImportDeclaration(path) {
        imports.push(path.node.source.value)
      },
      ExportNamedDeclaration(path) {
        if (path.node.source) imports.push(path.node.source.value)
      },
      ExportAllDeclaration(path) {
        imports.push(path.node.source.value)
      },
      CallExpression(path) {
        const { callee, arguments: args } = path.node
        if (callee.type !== 'Import' && !(callee.type === 'Identifier' && callee.name === 'require')) return
        if (args.length !== 1 || args[0].type !== 'StringLiteral')
          throw new Error(`Imports must use literal paths: ${file}`)
        imports.push(args[0].value)
      },
      Identifier(path) {
        if (['__TAURI__', '__TAURI_INTERNALS__'].includes(path.node.name))
          throw new Error(`Host access is not allowed: ${file}`)
      }
    })
    for (const specifier of imports) {
      if (
        /^(?:@tauri-apps(?:\/|$)|@doan-labs\/ipduo-(?:shell|app-)|node:|bun:|https?:|file:)/.test(specifier) ||
        isAbsolute(specifier)
      )
        throw new Error(`Host or external source import is not allowed: ${specifier} in ${file}`)
      if (!specifier.startsWith('.')) continue
      const target = resolve(dirname(file), specifier)
      const path = relative(folder, target)
      if (path === '..' || path.startsWith('../')) throw new Error(`Import escapes app folder: ${specifier} in ${file}`)
      // Resolve the actual target when present so an asset symlink cannot bypass the folder boundary.
      try {
        const actual = relative(folder, await realpath(target))
        if (actual === '..' || actual.startsWith('../'))
          throw new Error(`Import escapes app folder: ${specifier} in ${file}`)
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    if (/\bwindow\.parent\b|\bparent\.postMessage\b|shell\/native/.test(code))
      throw new Error(`Host access is not allowed: ${file}`)
  }
  return files
}

/** Run the installed repository toolchain with strict settings, independent of a consumer's lax tsconfig. */
export async function typecheckApp(folder, files) {
  const here = import.meta.dir
  const dependency = (name) => {
    try {
      return Bun.resolveSync(name, folder)
    } catch {
      try {
        return Bun.resolveSync(name, here)
      } catch {
        return Bun.resolveSync(name, resolve(here, '../shell'))
      }
    }
  }
  const compiler = join(dirname(dependency('typescript/package.json')), 'bin/tsc')
  const typeRoots = [
    ...new Set(['react', 'react-dom'].map((name) => dirname(dirname(dependency(`@types/${name}/package.json`)))))
  ]
  const temporary = await mkdtemp(join(tmpdir(), 'duo-typecheck-'))
  const paths = {}
  // Repository examples are not workspaces. Installed external projects resolve their package exports normally.
  for (const name of ['@doan-labs/ipduo-sdk', '@doan-labs/ipduo-uikit', '@stylexjs/stylex']) {
    try {
      Bun.resolveSync(`${name}/package.json`, folder)
    } catch {
      const metadataPath = dependency(`${name}/package.json`)
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
      const root = dirname(metadataPath)
      paths[name] = [join(root, metadata.types ?? metadata.exports?.['.'] ?? 'index.ts')]
      paths[`${name}/*`] = [join(root, '*')]
    }
  }
  try {
    const config = join(temporary, 'tsconfig.json')
    await writeFile(
      config,
      JSON.stringify({
        compilerOptions: {
          target: 'ESNext',
          module: 'Preserve',
          moduleResolution: 'bundler',
          lib: ['ESNext', 'DOM', 'DOM.Iterable'],
          jsx: 'react-jsx',
          strict: true,
          noUncheckedIndexedAccess: true,
          noEmit: true,
          allowJs: true,
          checkJs: true,
          allowImportingTsExtensions: true,
          skipLibCheck: true,
          verbatimModuleSyntax: true,
          typeRoots,
          paths
        },
        files: files.map((file) => resolve(file))
      })
    )
    const process = Bun.spawn(['bun', compiler, '-p', config], { cwd: folder, stdout: 'pipe', stderr: 'pipe' })
    const [out, err, exit] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited
    ])
    if (exit) throw new Error(`Typecheck failed:\n${out}${err}`)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
