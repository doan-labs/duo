// StyleX for Vite, the way stylex-plugin.ts does it for Bun: the Babel plugin
// compiles each module's `stylex.create` to class names and hands back its
// rules; this plugin collects them from every module (client and server
// environments share one map) and serves them as one stylesheet, the virtual
// `virtual:stylex.css` that the root route imports. Runtime injection stays
// off in development too: it would put a second <style> in the server-rendered
// head and break hydration. HMR instead refreshes the virtual stylesheet.
import { transformAsync } from '@babel/core'
import stylex from '@stylexjs/babel-plugin'
import type { Plugin } from 'vite'

type Rule = [string, { ltr: string; rtl?: string | null }, number]
const VIRTUAL = 'virtual:stylex.css'
const RESOLVED = `\0${VIRTUAL}`
const MARK = '.stylex-rules-placeholder{--stylex:pending}'

export function stylexVite(): Plugin {
  const rules = new Map<string, Rule>()
  let dev = false
  const css = () => stylex.processStylexRules([...rules.values()], true)
  return {
    name: 'stylex',
    enforce: 'pre',
    configResolved(c) {
      dev = c.command === 'serve'
    },
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : undefined
    },
    load(id) {
      // In dev the SSR pass has transformed every module of the page before the
      // browser asks for the stylesheet; in the build, generateBundle fills it in.
      return id === RESOLVED ? (dev ? css() : MARK) : undefined
    },
    async transform(source, id) {
      const path = id.split('?')[0] ?? id
      if (!/\.tsx?$/.test(path) || !source.includes('@stylexjs/stylex')) return undefined
      if (path.includes('/node_modules/') && !path.includes('/node_modules/@doan-labs/')) return undefined
      const out = await transformAsync(source, {
        filename: path,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: [
          [
            stylex,
            {
              dev,
              runtimeInjection: false,
              treeshakeCompensation: true,
              unstable_moduleResolution: { type: 'commonJS', rootDir: new URL('../../', import.meta.url).pathname }
            }
          ]
        ]
      })
      for (const r of (out?.metadata as { stylex?: Rule[] })?.stylex ?? []) rules.set(r[0], r)
      return out?.code ? { code: out.code, map: null } : undefined
    },
    handleHotUpdate({ server, modules }) {
      const css = server.moduleGraph.getModuleById(RESOLVED)
      return css && !modules.includes(css) ? [...modules, css] : undefined
    },
    generateBundle(_, bundle) {
      for (const item of Object.values(bundle)) {
        if (
          item.type !== 'asset' ||
          typeof item.source !== 'string' ||
          !item.source.includes('.stylex-rules-placeholder')
        )
          continue
        item.source = item.source.replace(/\.stylex-rules-placeholder\{[^}]*\}/, css())
      }
    }
  }
}
