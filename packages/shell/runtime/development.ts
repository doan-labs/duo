import { networkOrigin, releaseId, releaseValid } from '../../sdk/manifest.ts'
import { appLock, broadcast, type Installed, put, range, read, type StoredRelease, transaction } from './database.ts'
import { clearNotices } from './notifications.ts'
import { boundedFetch, digest, download } from './releases.ts'

export const development = new Map<string, { bundle: StoredRelease; src: string }>()
export async function loadDevelopment(origin: string) {
  if (!networkOrigin(origin, true)) throw new Error('Development URL must be an HTTPS or loopback HTTP origin')
  const bytes = await boundedFetch(`${origin}/release.json`, 64 * 1024)
  const release: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!releaseValid(release, true)) throw new Error('Invalid development release')
  if (release.manifest.permissions?.length) throw new Error('Device permissions are deferred for local previews')
  const base = `${origin}/apps/${release.manifest.id}/${releaseId(release)}/`
  const bundle = await download(
    base,
    release.manifest.id,
    {
      release: releaseId(release),
      sdk: release.build.sdk,
      bytes: release.files.find((file) => file.path === 'app.html')!.bytes,
      sha256: await digest(bytes)
    },
    undefined,
    true
  )
  const id = `dev:${origin}:${bundle.release.manifest.id}`
  await appLock(id, async () => {
    await transaction(['marks'], 'readwrite', async (tx) => {
      const old = await read<Installed>(tx, 'marks', id)
      await put(tx, 'marks', id, {
        id,
        state: 'ready',
        current: releaseId(bundle.release),
        generation:
          old && old.current === releaseId(bundle.release) && old.state !== 'removing'
            ? old.generation
            : (old?.generation ?? 0) + 1,
        installedAt: Date.now(),
        attempts: 0
      } satisfies Installed)
    })
    const previous = development.get(id)
    // A second remote navigation could replace the HTML whose hash and CSP we checked.
    // Keep src-mode development, but pin it to those verified bytes for this release.
    const src =
      previous && releaseId(previous.bundle.release) === releaseId(bundle.release)
        ? previous.src
        : URL.createObjectURL(new Blob([bundle.html], { type: 'text/html' }))
    development.set(id, { bundle, src })
    if (previous && previous.src !== src) URL.revokeObjectURL(previous.src)
  })
  broadcast({ id })
  return id
}
export async function removeDevelopment(id: string) {
  await appLock(id, async () => {
    await transaction(
      ['marks', 'appdata', 'meta', 'widgets', 'checkpoints', 'recovery', 'leases'],
      'readwrite',
      async (tx) => {
        const old = await read<Installed>(tx, 'marks', id)
        if (old) await put(tx, 'marks', id, { ...old, generation: old.generation + 1, state: 'removing' })
        for (const store of ['appdata', 'widgets', 'checkpoints', 'recovery', 'leases'] as const)
          tx.objectStore(store).delete(range(id))
        tx.objectStore('meta').delete(id)
      }
    )
    const previous = development.get(id)
    development.delete(id)
    if (previous) URL.revokeObjectURL(previous.src)
    clearNotices(id)
  })
  broadcast({ id })
}
