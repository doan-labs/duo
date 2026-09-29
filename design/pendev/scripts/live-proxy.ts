// Serves duo.doan-labs.com on localhost with scroll reveals forced visible.
// Pen's browser nodes throttle animation while off-screen, so motion's
// whileInView reveals never finish and the importer drops opacity-0 subtrees.
const ORIGIN = 'https://duo.doan-labs.com'
const FORCE = '<style>[style*="opacity:0"][style*="transform"],[style*="opacity: 0"][style*="transform"]{opacity:1!important;transform:none!important}</style>'
Bun.serve({
  port: Number(process.env.PORT ?? 4400),
  async fetch(req) {
    const url = new URL(req.url)
    const res = await fetch(ORIGIN + url.pathname + url.search, { headers: { 'user-agent': req.headers.get('user-agent') ?? '' } })
    const type = res.headers.get('content-type') ?? ''
    const headers = new Headers(res.headers)
    headers.delete('content-encoding')
    headers.delete('content-length')
    headers.delete('content-security-policy')
    if (!type.includes('text/html')) return new Response(res.body, { status: res.status, headers })
    const html = (await res.text()).replace('</head>', FORCE + '</head>')
    return new Response(html, { status: res.status, headers })
  }
})
console.log('live proxy on http://localhost:' + (process.env.PORT ?? 4400))
