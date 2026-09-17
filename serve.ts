// Dev server. Bun's plain HTML entry server answers every unknown path with
// the page itself, which turns the USD model into HTML; this serves public/
// as real files, the way `bun build` and Tauri ship it.
import index from './packages/shell/index.html'

const port = Number(process.env.PORT ?? 3000)
Bun.serve({
  port,
  routes: { '/': index },
  development: { hmr: true, console: true },
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname)
    const file = Bun.file(`./public${path}`)
    if (!path.includes('..') && (await file.exists())) return new Response(file)
    return new Response('Not found', { status: 404 })
  }
})
console.log(`http://localhost:${port}/`)
