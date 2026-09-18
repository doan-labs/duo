import { documentPolicy } from './document-policy'
import type { Release } from './manifest'

export const BUILDER_CHANNEL = 'duo-builder-v1'
export const PREVIEW_LIMIT = 4 * 1024 * 1024
export type PreviewBundle = { html: string; release: Release; icon: string }
export type PreviewRequest = {
  channel: typeof BUILDER_CHANNEL
  token: string
  sequence: number
  project: string
  revision: string
  bundle: PreviewBundle
  restore?: boolean
}
export type PreviewReply = {
  channel: typeof BUILDER_CHANNEL
  token: string
  sequence: number
  status: 'connected' | 'ready' | 'error'
  message?: string
}
export const sha = async (data: Uint8Array) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>))
export const hex = (data: Uint8Array) => [...data].map((n) => n.toString(16).padStart(2, '0')).join('')
export const hashText = async (text: string) =>
  btoa(String.fromCharCode(...(await sha(new TextEncoder().encode(text)))))
const attribute = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
export async function previewBundle(
  js: string,
  css: string,
  name: string,
  sdk: string,
  kit: string
): Promise<PreviewBundle> {
  js = js.replace(/<\/script/gi, '<\\/script')
  css = css.replace(/<\/style/gi, '<\\/style')
  const policy = documentPolicy(await hashText(js), [await hashText(css), await hashText('')])
  const html = `<!doctype html><html lang="en"><head><meta http-equiv="Content-Security-Policy" content="${attribute(policy)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${attribute(name)}</title><style>${css}</style><style id="duo-dynamic"></style></head><body><script type="module">${js}</script></body></html>`
  const bytes = new TextEncoder().encode(html)
  if (bytes.length > PREVIEW_LIMIT) throw new Error('Compiled app exceeds 4 MiB')
  const icon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='
  const png = Uint8Array.from(atob(icon), (c) => c.charCodeAt(0))
  const joined = new Uint8Array(bytes.length + png.length)
  joined.set(bytes)
  joined.set(png, bytes.length)
  return {
    html,
    icon,
    release: {
      manifest: {
        id: 'labs.doan.builder',
        name,
        version: '0.0.0',
        lane: 'community',
        entry: 'app.tsx',
        icon: 'icon-builder.png',
        author: 'Local project',
        repo: 'https://github.com/doan-labs/duo',
        license: 'MIT',
        light: true,
        network: [],
        permissions: []
      },
      build: { sdk, kit, at: new Date().toISOString(), commit: 'browser', hash: hex(await sha(joined)).slice(0, 8) },
      files: [
        { path: 'app.html', bytes: bytes.length, sha256: hex(await sha(bytes)) },
        { path: 'icon-builder.png', bytes: png.length, sha256: hex(await sha(png)) }
      ]
    }
  }
}
