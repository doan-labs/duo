import { rm, watch } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildApp } from '../../scripts/build-app.ts'

/** Immutable local releases; stopping closes requests, watcher and queued rebuilds. */
export async function serveDevelopment(folder, options = {}) {
  folder = resolve(folder)
  const output = join(tmpdir(), `ipduo-preview-${crypto.randomUUID()}`)
  const abort = new AbortController()
  let stopped = false
  let bundle
  let building = Promise.resolve()
  const rebuild = () =>
    (building = building
      .catch(() => {})
      .then(async () => {
        if (stopped) return
        try {
          const next = await buildApp(folder, { dev: true, output })
          if (!stopped) {
            bundle = next
            options.onBuild?.(next)
          }
        } catch (error) {
          if (!String(error).includes('Immutable release already exists')) throw error
        }
      }))
  await rebuild()
  if (!bundle) throw new Error('Initial build failed')
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: options.port ?? 5173,
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname)
      const rootFiles = {
        '/release.json': 'release.json',
        '/manifest.json': 'manifest.json',
        '/app.html': 'app.html',
        '/': 'app.html'
      }
      const filePath = Object.hasOwn(rootFiles, path)
        ? join(bundle.target, rootFiles[path])
        : resolve(output, `.${path}`)
      if (!filePath.startsWith(output + '/')) return new Response('Forbidden', { status: 403 })
      const file = Bun.file(filePath)
      return (await file.exists())
        ? new Response(file, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
        : new Response('Not found', { status: 404 })
    }
  })
  const watcher =
    options.watch === false
      ? Promise.resolve()
      : (async () => {
          try {
            for await (const event of watch(folder, { recursive: true, signal: abort.signal })) {
              const parts = event.filename?.split(/[\\/]/) ?? []
              if (
                !parts.length ||
                parts.some((part) => part.startsWith('.') || ['node_modules', 'dist'].includes(part)) ||
                /^(bun\.lock|package-lock\.json)$/.test(event.filename)
              )
                continue
              await rebuild().catch((error) => options.onError?.(error))
            }
          } catch (error) {
            if (!abort.signal.aborted) options.onError?.(error)
          }
        })()
  return {
    port: server.port,
    current: () => bundle,
    async stop() {
      if (stopped) return
      stopped = true
      abort.abort()
      server.stop(true)
      await watcher
      await building.catch(() => {})
      await rm(output, { recursive: true, force: true })
    }
  }
}
