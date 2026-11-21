// @doan-labs/mono starts its storage worker from `new URL('./worker-host.js', import.meta.url)`,
// and the worker loads its WASM engine beside it. Bun inlines the client into the shell's
// chunks, so that URL would point next to a hashed chunk where nothing lives. This plugin
// points it at `mono/dist/worker-host.js` under the page, and `monoAssets` lists the files
// to put there: serve.ts answers them in development, build.ts copies them into dist/.

import { dirname, join } from 'node:path'
import type { BunPlugin } from 'bun'

const WORKER = 'new URL("./worker-host.js", import.meta.url)'
const root = join(dirname(Bun.resolveSync('@doan-labs/mono', join(import.meta.dir, 'packages/shell'))), '..')

/** URL path under the page -> file on disk. */
export const monoAssets = Object.fromEntries(
  ['dist/worker-host.js', 'wasm/mono.js', 'wasm/mono_bg.wasm'].map((file) => [`mono/${file}`, join(root, file)])
)

export const monoPlugin: BunPlugin = {
  name: 'mono-worker',
  setup(build) {
    build.onLoad({ filter: /[\\/]@doan-labs[\\/]mono[\\/]dist[\\/].*\.js$/ }, async (args) => {
      const text = await Bun.file(args.path).text()
      if (!text.includes(WORKER)) return undefined
      return {
        contents: text.replaceAll(WORKER, 'new URL("mono/dist/worker-host.js", document.baseURI)'),
        loader: 'js'
      }
    })
  }
}

export default monoPlugin
