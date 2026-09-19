// StyleX for Bun. There is no official Bun plugin, so this runs the StyleX Babel
// plugin in onLoad. Dev (serve.ts via bunfig.toml) injects rules at runtime so
// HMR keeps working; build.ts collects them and writes one static stylesheet.
import { transformAsync } from '@babel/core'
import stylex from '@stylexjs/babel-plugin'
import type { BunPlugin } from 'bun'

type Rule = [string, { ltr: string; rtl?: string | null }, number]

export function stylexPlugin(dev: boolean, aliases?: Record<string, string>) {
  const rules = new Map<string, Rule>()
  const plugin: BunPlugin = {
    name: 'stylex',
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        if (args.path.includes('/node_modules/') && !args.path.includes('/node_modules/@doan-labs/')) return undefined
        const source = await Bun.file(args.path).text()
        if (!source.includes('@stylexjs/stylex')) return undefined
        const out = await transformAsync(source, {
          filename: args.path,
          babelrc: false,
          configFile: false,
          parserOpts: { plugins: ['typescript', 'jsx'] },
          plugins: [
            [
              stylex,
              {
                dev,
                runtimeInjection: dev,
                treeshakeCompensation: true,
                // StyleX 0.19 media-query reorder pass corrupts its tokenizer after a few
                // transforms in one process; the sequential CI builds hit it. No style here needs it.
                enableMediaQueryOrder: false,
                aliases,
                unstable_moduleResolution: { type: 'commonJS', rootDir: import.meta.dir }
              }
            ]
          ]
        })
        for (const r of (out?.metadata as { stylex?: Rule[] })?.stylex ?? []) rules.set(r[0], r)
        return { contents: out?.code ?? source, loader: 'tsx' }
      })
    }
  }
  const css = () => stylex.processStylexRules([...rules.values()], true)
  return { plugin, css }
}

export default stylexPlugin(true).plugin
