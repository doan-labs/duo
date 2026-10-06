// community-apps/registry.json: the maintainer-owned map of app ids to folders, developers
// and maintainers, plus the developer profiles the catalog publishes. The submission gate,
// the publisher and the website build all read it, so all three validate it here.
import { readFile } from 'node:fs/promises'

export type Profile = { name: string; description: string; imageUrl: string; website?: string; github?: string }
export type Registry = {
  reserved: string[]
  officialDeveloper: string
  developers: Record<string, Profile>
  apps: Record<string, { folder: string; developer: string; maintainers: string[] }>
}

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
const PROFILE_KEYS = new Set(['name', 'description', 'imageUrl', 'website', 'github'])

export const readRegistry = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as Registry

const https = (value: unknown) => {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

/** Every problem with the developer profiles and the apps' links to them; empty when publishable. */
export function registryIssues(registry: Registry): string[] {
  const issues: string[] = []
  const developers = registry.developers ?? {}
  for (const [handle, profile] of Object.entries(developers)) {
    const at = `developer ${handle}`
    if (!HANDLE.test(handle)) issues.push(`${at}: handle must be kebab-case`)
    const extra = Object.keys(profile).filter((key) => !PROFILE_KEYS.has(key))
    if (extra.length) issues.push(`${at}: unknown fields ${extra.join(', ')}`)
    if (typeof profile.name !== 'string' || !profile.name.trim() || [...profile.name].length > 32)
      issues.push(`${at}: name must be 1-32 characters`)
    // One or two lines under the name on the site; longer reads as a README.
    if (typeof profile.description !== 'string' || !profile.description.trim() || [...profile.description].length > 160)
      issues.push(`${at}: description must be 1-160 characters`)
    if (!https(profile.imageUrl)) issues.push(`${at}: imageUrl must be an https URL`)
    if (profile.website !== undefined && !https(profile.website)) issues.push(`${at}: website must be an https URL`)
    if (profile.github !== undefined && !LOGIN.test(profile.github)) issues.push(`${at}: github must be a GitHub login`)
  }
  if (!developers[registry.officialDeveloper])
    issues.push(`officialDeveloper ${registry.officialDeveloper} has no profile`)
  for (const [id, app] of Object.entries(registry.apps))
    if (!developers[app.developer]) issues.push(`${id} names developer ${app.developer}, which has no profile`)
  return issues
}
