export type SemVer = { major: number; minor: number; patch: number; prerelease: string[] }

/** Strict release versions exclude build metadata; identities add their own hash. */
export function semver(value: string): SemVer | null {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/.exec(value)
  if (!match) return null
  const [major, minor, patch] = match.slice(1, 4).map(Number) as [number, number, number]
  const prerelease = match[4]?.split('.') ?? []
  if (![major, minor, patch].every(Number.isSafeInteger)) return null
  if (prerelease.some((v) => /^\d+$/.test(v) && v.length > 1 && v.startsWith('0'))) return null
  return { major, minor, patch, prerelease }
}

export function compatible(host: SemVer, app: SemVer): boolean {
  if (host.prerelease.length || app.prerelease.length) return false
  const gte =
    host.major > app.major ||
    (host.major === app.major && (host.minor > app.minor || (host.minor === app.minor && host.patch >= app.patch)))
  if (app.major > 0) return host.major === app.major && gte
  if (app.minor > 0) return host.major === 0 && host.minor === app.minor && gte
  return host.major === 0 && host.minor === 0 && host.patch === app.patch
}

export const HOST_SDK = '0.0.0'
export const REQUIRES_PLATFORM = 'Requires a newer platform version'
export function supports(version: string, dev = false, host = HOST_SDK): boolean {
  const h = semver(host)
  const a = semver(version)
  if (!h || !a) return false
  if (dev && (a.prerelease.length || h.prerelease.length)) {
    return compatible({ ...h, prerelease: [] }, { ...a, prerelease: [] })
  }
  return compatible(h, a)
}
