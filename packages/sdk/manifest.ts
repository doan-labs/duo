import { semver } from './compat.ts'
import { type PermissionName, permissionsValid } from './permissions.ts'

export type Manifest = {
  id: string
  name: string
  version: string
  lane: 'official' | 'community'
  entry: string
  icon: string
  light?: boolean
  edge?: boolean
  widgets?: ('small' | 'medium')[]
  network?: string[]
  permissions?: PermissionName[]
  author: string
  repo: string
  license: 'MIT'
}
export type ReleaseId = `${string}+${string}`
export type Release = {
  manifest: Manifest
  build: { sdk: string; kit?: string; at: string; commit: string; hash: string }
  files: { path: string; bytes: number; sha256: string }[]
}
export type CatalogRelease = { release: ReleaseId; sdk: string; bytes: number; sha256: string; note?: string }
export type Catalog = {
  apps: Record<
    string,
    {
      name: string
      lane: Manifest['lane']
      author: string
      repo: string
      permissions?: PermissionName[]
      releases: CatalogRelease[]
    }
  >
}
export const releaseId = (release: Release): ReleaseId => `${release.manifest.version}+${release.build.hash}`
export const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function networkOrigin(value: unknown, dev = false): value is string {
  if (typeof value !== 'string' || /[\s;'"<>\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return (
      value === url.origin &&
      !url.username &&
      !url.password &&
      !url.hostname.includes('*') &&
      (url.protocol === 'https:' ||
        (dev && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    )
  } catch {
    return false
  }
}
const relative = (v: unknown): v is string =>
  typeof v === 'string' && /^(?:\.\/)?[a-zA-Z0-9_-][a-zA-Z0-9_./-]*$/.test(v) && !v.split('/').includes('..')

export function manifestValid(v: unknown, dev = false): v is Manifest {
  if (!record(v)) return false
  return (
    typeof v.id === 'string' &&
    v.id.length <= 64 &&
    /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.id) &&
    typeof v.name === 'string' &&
    v.name.trim().length > 0 &&
    [...v.name].length <= 12 &&
    typeof v.version === 'string' &&
    !!semver(v.version) &&
    (dev || !semver(v.version)!.prerelease.length) &&
    (v.lane === 'official' || v.lane === 'community') &&
    relative(v.entry) &&
    relative(v.icon) &&
    (v.light === undefined || typeof v.light === 'boolean') &&
    (v.edge === undefined || typeof v.edge === 'boolean') &&
    (v.permissions === undefined || permissionsValid(v.permissions)) &&
    (v.widgets === undefined ||
      (Array.isArray(v.widgets) &&
        new Set(v.widgets).size === v.widgets.length &&
        v.widgets.every((s) => s === 'small' || s === 'medium'))) &&
    (v.network === undefined || (Array.isArray(v.network) && v.network.every((o) => networkOrigin(o, dev)))) &&
    typeof v.author === 'string' &&
    v.author.length > 0 &&
    typeof v.repo === 'string' &&
    /^https:\/\//.test(v.repo) &&
    v.license === 'MIT'
  )
}
export function releaseValid(v: unknown, dev = false): v is Release {
  if (!record(v) || !manifestValid(v.manifest, dev) || !record(v.build) || !Array.isArray(v.files)) return false
  const b = v.build
  return (
    typeof b.sdk === 'string' &&
    !!semver(b.sdk) &&
    typeof b.hash === 'string' &&
    /^[a-f0-9]{8}$/.test(b.hash) &&
    typeof b.at === 'string' &&
    Number.isFinite(Date.parse(b.at)) &&
    typeof b.commit === 'string' &&
    (b.kit === undefined || (typeof b.kit === 'string' && !!semver(b.kit))) &&
    v.files.length >= 2 &&
    v.files.length <= 16 &&
    v.files.every(
      (f) =>
        record(f) &&
        typeof f.path === 'string' &&
        /^(app\.html|icon-[a-z0-9-]+\.png)$/.test(f.path) &&
        typeof f.bytes === 'number' &&
        Number.isSafeInteger(f.bytes) &&
        f.bytes > 0 &&
        typeof f.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(f.sha256)
    ) &&
    new Set(v.files.map((f) => f.path)).size === v.files.length &&
    v.files.some((f) => f.path === 'app.html')
  )
}
