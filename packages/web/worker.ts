// The site's Worker, in front of its static assets for two concerns (see
// wrangler.jsonc). Workers static assets answer every request with the whole
// file and ignore `Range`, so a 13 MB film can't be seeked until it has fully
// downloaded: the scrubber sits dead on a first visit. This answers ranges for
// video; everything else passes through untouched.
//
// The release trees (/catalog, /cdn, /preinstalled under /apps) also run here
// because their Cache-Control must be status-conditional, which the asset layer
// cannot express: a flat immutable rule would stamp year-long freshness on a
// 404 and let a client cache the absence of a release it asked for before
// publication. Committed hits get the immutable no-transform contract - the
// bytes are hash-verified and identity-embedded, so a URL's content never
// changes and its body must reach the downloader unmodified; misses, redirects
// and errors stay no-store. Only Cache-Control is overridden; the body and all
// other headers pass through as the asset layer emitted them.

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } }

const RELEASE = /^\/(catalog|cdn|preinstalled)\/apps\//
const RELEASE_CACHE = 'public, max-age=31536000, immutable, no-transform'
const MISS_CACHE = 'no-store'
const NULL_BODY = new Set([101, 204, 205, 304])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await env.ASSETS.fetch(request)
    const path = new URL(request.url).pathname
    if (RELEASE.test(path)) {
      const headers = new Headers(res.headers)
      headers.set(
        'cache-control',
        (res.status >= 200 && res.status < 300) || res.status === 304 ? RELEASE_CACHE : MISS_CACHE
      )
      return new Response(NULL_BODY.has(res.status) ? null : res.body, {
        status: res.status,
        statusText: res.statusText,
        headers
      })
    }
    if (res.status !== 200 || !/\.(mp4|webm)$/.test(path)) return res
    const headers = new Headers(res.headers)
    headers.set('accept-ranges', 'bytes')
    const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
    if (!m || (!m[1] && !m[2])) return new Response(res.body, { headers })
    // ponytail: buffers the file per range request (films are under the 25 MiB asset cap); stream-skip if they grow.
    const body = await res.arrayBuffer()
    const size = body.byteLength
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    if (start >= size || start > end) {
      headers.set('content-range', `bytes */${size}`)
      return new Response(null, { status: 416, headers })
    }
    headers.set('content-range', `bytes ${start}-${end}/${size}`)
    headers.set('content-length', String(end - start + 1))
    return new Response(body.slice(start, end + 1), { status: 206, headers })
  }
}
