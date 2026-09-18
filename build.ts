// Production build. The CLI has no plugin flag, so this is `bun build ./packages/shell/index.html
// --production` in code, plus the StyleX stylesheet the plugin collected.

import { buildPreinstalled } from './scripts/build-preinstalled.ts'
import { stylexPlugin } from './stylex-plugin.ts'

await buildPreinstalled()

const { plugin, css } = stylexPlugin(false)
const result = await Bun.build({
  entrypoints: ['./packages/shell/index.html'],
  outdir: 'dist',
  minify: true,
  sourcemap: 'linked',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [plugin]
})
if (!result.success) {
  console.error(...result.logs)
  process.exit(1)
}
await Bun.write('dist/stylex.css', css())
const html = await Bun.file('dist/index.html').text()
await Bun.write('dist/index.html', html.replace('</head>', '<link rel="stylesheet" href="./stylex.css"></head>'))
