import mdx from '@mdx-js/rollup'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { stylexVite } from './vite-stylex.ts'

// The blog's posts. The plugin drops the query before it filters, so it would
// compile the `?raw` copy posts.ts reads for the outline too; that one passes.
const blog = mdx({ include: /\.mdx$/ }) as Plugin & {
  transform: (code: string, id: string) => Promise<{ code: string } | undefined>
}
const posts: Plugin = {
  ...blog,
  enforce: 'pre',
  transform(code, id) {
    return id.includes('?raw') ? null : blog.transform.call(this, code, id)
  }
}

// The site is static: every route is prerendered from the crawl that starts at
// `/`, so the deploy is `dist/client` on any file host, next to the simulator.
export default defineConfig({
  server: { port: 3001, fs: { allow: ['../..'] } },
  plugins: [
    // Before React's plugin, so the blog's .mdx arrives as JSX it can refresh.
    posts,
    stylexVite(),
    tanstackStart({
      srcDirectory: 'src',
      // kebab-case is the repo rule (biome), so the generator's default camelCase name is renamed
      router: { generatedRouteTree: 'route-tree.gen.ts' },
      // The crawl skips the copied shell under /device (static files, not a
      // route) and trailing-slash duplicates such as /docs/. Ten parallel
      // fetches against the prerender server have timed out and killed the
      // build; three have not.
      prerender: {
        enabled: true,
        concurrency: 3,
        crawlLinks: true,
        autoStaticPathsDiscovery: true,
        filter: (page) => !page.path.startsWith('/device') && !(page.path.length > 1 && page.path.endsWith('/'))
      }
    }),
    viteReact({ include: /\.(mdx|[jt]sx?)$/ })
  ]
})
