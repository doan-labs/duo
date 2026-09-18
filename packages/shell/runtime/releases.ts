import { REQUIRES_PLATFORM, supports } from '../../sdk/compat.ts'
import { documentPolicy } from '../../sdk/document-policy.ts'
import { PlatformError } from '../../sdk/guards.ts'
import { type CatalogRelease, type Release, releaseId, releaseValid } from '../../sdk/manifest.ts'
import type { StoredRelease } from './database.ts'

// E0 measured Notes at 337,623 bytes. Leave room for the SDK and application growth.
export const BUNDLE_SOFT = 1024 * 1024
export const BUNDLE_HARD = 4 * 1024 * 1024
export const RELEASE_HARD = 8 * 1024 * 1024
export async function digest(data: Uint8Array) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')
}
export async function boundedFetch(
  url: string,
  bound: number,
  progress?: (bytes: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
  // Static hosts canonicalise paths (`+` → `%2B`, `app.html` → `app`) with redirects, so follow them
  // but never off the origin we asked; every byte is hash-checked by the caller anyway.
  const response = await fetch(url, { redirect: 'follow', credentials: 'omit', signal: AbortSignal.timeout(30000) })
  if (new URL(response.url).origin !== new URL(url, location.href).origin) throw new Error('Download left its origin')
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status})`)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.length
      if (bytes > bound) throw new Error('Download exceeds declared size')
      chunks.push(value)
      progress?.(bytes)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
  const data = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    data.set(chunk, offset)
    offset += chunk.length
  }
  return data
}
export async function download(
  base: string,
  id: string,
  listed?: CatalogRelease,
  progress?: (ratio: number) => void,
  dev = false
): Promise<StoredRelease> {
  const url = new URL(base, location.href)
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  const metadata = await boundedFetch(new URL('release.json', url).href, 64 * 1024)
  if (listed && (await digest(metadata)) !== listed.sha256) throw new Error('Release metadata hash mismatch')
  const parsed: unknown = JSON.parse(new TextDecoder().decode(metadata))
  if (!releaseValid(parsed, dev) || !supports(parsed.build.sdk, dev)) throw new Error(REQUIRES_PLATFORM)
  const release: Release = parsed
  if (release.manifest.id !== id || (listed && releaseId(release) !== listed.release))
    throw new Error('Release identity mismatch')
  if (listed && url.origin !== location.origin && release.manifest.permissions?.length)
    throw new Error('Device permissions are not enabled for external developer catalogs')
  const total = release.files.reduce((sum, file) => sum + file.bytes, 0)
  if (total > RELEASE_HARD || release.files.find((f) => f.path === 'app.html')!.bytes > BUNDLE_HARD)
    throw new Error('App exceeds the bundle limit')
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  let received = 0
  for (const file of release.files) {
    const data = await boundedFetch(
      new URL(file.path, url).href,
      Math.min(RELEASE_HARD, Math.ceil(file.bytes * 1.01)),
      (count) => progress?.((received + count) / total)
    )
    if (data.length !== file.bytes || (await digest(data)) !== file.sha256)
      throw new Error(`Hash or size mismatch: ${file.path}`)
    received += data.length
    files.set(file.path, data)
  }
  const joined = new Uint8Array(total)
  let offset = 0
  for (const [, data] of [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    joined.set(data, offset)
    offset += data.length
  }
  if ((await digest(joined)).slice(0, 8) !== release.build.hash) throw new Error('Build hash mismatch')
  const html = new TextDecoder('utf-8', { fatal: true }).decode(files.get('app.html'))
  const document = new DOMParser().parseFromString(html, 'text/html')
  if (document.head.firstElementChild?.getAttribute('http-equiv')?.toLowerCase() !== 'content-security-policy')
    throw new PlatformError('E_PROTOCOL', 'App document has no leading policy')
  const scripts = [...document.querySelectorAll('script')]
  const styles = [...document.querySelectorAll('style')]
  if (
    scripts.length !== 1 ||
    scripts[0]!.hasAttribute('src') ||
    scripts[0]!.type !== 'module' ||
    styles.length !== 2 ||
    styles[1]!.id !== 'duo-dynamic' ||
    styles[1]!.textContent !== ''
  )
    throw new PlatformError('E_PROTOCOL', 'App document must use the single-file builder')
  const hash64 = async (value: string) =>
    btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))))
  const expected = documentPolicy(
    await hash64(scripts[0]!.textContent),
    await Promise.all(styles.map((style) => hash64(style.textContent))),
    release.manifest.network
  )
  if (document.head.firstElementChild.getAttribute('content') !== expected)
    throw new PlatformError('E_PROTOCOL', 'Document policy does not match its declared network and content hashes')
  return {
    release,
    html,
    icons: [...files]
      .filter(([path]) => path !== 'app.html')
      .map(([, data]) => new Blob([data], { type: 'image/png' })),
    committedAt: Date.now()
  }
}
