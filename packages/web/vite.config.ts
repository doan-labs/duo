import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { stylexVite } from './vite-stylex.ts'

// The site is static: every route is prerendered from the crawl that starts at
// `/`, so the deploy is `dist/client` on any file host, next to the simulator.
export default defineConfig({
  server: { port: 3001, fs: { allow: ['../..'] } },
  plugins: [
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
    viteReact()
  ]
})
