// The site's Worker, in front of its static assets for the blog only (see
// wrangler.jsonc). Workers static assets answer every request with the whole
// file and ignore `Range`, so a 13 MB film can't be seeked until it has fully
// downloaded: the scrubber sits dead on a first visit. This answers ranges for
// video; everything else passes through untouched.

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await env.ASSETS.fetch(request)
    if (res.status !== 200 || !/\.(mp4|webm)$/.test(new URL(request.url).pathname)) return res
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
