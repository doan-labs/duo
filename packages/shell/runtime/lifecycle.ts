import { bytes, keyValid, PlatformError, valueValid } from '../../sdk/guards.ts'
import { type CatalogRelease, releaseId } from '../../sdk/manifest.ts'
import { LIMITS } from '../../sdk/protocol.ts'
import {
  allInstalled,
  appLock,
  authority,
  broadcast,
  type Checkpoint,
  entries,
  getInstalled,
  type Installed,
  type Meta,
  put,
  range,
  read,
  result,
  STORES,
  type StoredRelease,
  type StoredWidget,
  transaction,
  writeAuthority
} from './database.ts'
import { download } from './releases.ts'
import { emptyMeta } from './storage.ts'

export const tabId = crypto.randomUUID()
const sessions = new Map<string, { generation: number; views: number }>()
export async function lease(id: string, generation: number, views: number) {
  if (views) sessions.set(id, { generation, views })
  else sessions.delete(id)
  await transaction(['installed', 'leases'], 'readwrite', async (tx) => {
    if (views) {
      await authority(tx, id, generation)
      await put(tx, 'leases', [id, tabId], { views, heartbeat: Date.now() })
    } else tx.objectStore('leases').delete([id, tabId])
  })
  if (!views) await activate(id)
}
async function freshLeases(tx: IDBTransaction, id: string) {
  const leases = await entries<{ views: number; heartbeat: number }>(tx, 'leases', id)
  for (const [key, value] of leases)
    if (Date.now() - value.heartbeat >= 30000) tx.objectStore('leases').delete([id, key])
  return leases.some(([, value]) => value.views > 0 && Date.now() - value.heartbeat < 30000)
}
let timer: ReturnType<typeof setInterval> | undefined
export function startLifecycle() {
  if (timer) return
  timer = setInterval(() => {
    for (const [id, value] of sessions) void lease(id, value.generation, value.views).catch(() => broadcast({ id }))
    void reconcile().catch(() => {})
  }, 10000)
  addEventListener('pagehide', () => {
    for (const id of sessions.keys())
      void transaction(['leases'], 'readwrite', async (tx) => {
        tx.objectStore('leases').delete([id, tabId])
      }).catch(() => {})
  })
}
async function checkpoint(tx: IDBTransaction, id: string): Promise<Checkpoint> {
  return {
    entries: await entries<string>(tx, 'appdata', id),
    meta: (await read<Meta>(tx, 'meta', id)) ?? emptyMeta(),
    widgets: await entries<StoredWidget>(tx, 'widgets', id),
    takenAt: Date.now()
  }
}
async function replaceData(tx: IDBTransaction, id: string, data: Checkpoint) {
  tx.objectStore('appdata').delete(range(id))
  tx.objectStore('widgets').delete(range(id))
  for (const [key, value] of data.entries) await put(tx, 'appdata', [id, key], value)
  for (const [key, value] of data.widgets) await put(tx, 'widgets', [id, key], value)
  await put(tx, 'meta', id, data.meta)
}
export async function migrateNotes(id: string) {
  if (id !== 'labs.doan.ipduo.notes') return
  const prefix = 'duo.notes.'
  const legacy: [string, string][] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!
    if (key.startsWith(prefix)) legacy.push([key, localStorage.getItem(key)!])
  }
  const installed = await getInstalled(id)
  if (!installed) return
  const imported = await transaction(['installed', 'appdata', 'meta', 'legacy', 'marks'], 'readwrite', async (tx) => {
    await authority(tx, id, installed.generation, true)
    const mark = (await read<{ seeded?: true; migrated?: true }>(tx, 'marks', id)) ?? {}
    if (mark.migrated) return false
    let used = 0
    for (const [key, value] of legacy) {
      const k = key.slice(prefix.length)
      if (!keyValid(k) || !valueValid(value)) throw new PlatformError('E_STORAGE', 'Legacy note exceeds storage limits')
      used += bytes(k) + bytes(value)
      await put(tx, 'appdata', [id, k], value)
    }
    if (used > LIMITS.storage || legacy.length > LIMITS.keys)
      throw new PlatformError('E_STORAGE', 'Legacy notes exceed quota')
    await put(tx, 'meta', id, { rev: legacy.length, used })
    await put(tx, 'legacy', id, legacy)
    await put(tx, 'marks', id, { ...mark, migrated: true })
    return true
  })
  // A restart after commit also verifies the saved snapshot before conditional cleanup.
  const saved = await transaction(['legacy', 'appdata', 'installed'], 'readonly', async (tx) => {
    await authority(tx, id, installed.generation)
    const snapshot = imported ? legacy : ((await read<[string, string][]>(tx, 'legacy', id)) ?? [])
    for (const [key, value] of snapshot)
      if ((await read(tx, 'appdata', [id, key.slice(prefix.length)])) !== value) return []
    return snapshot
  })
  for (const [key, value] of saved) if (localStorage.getItem(key) === value) localStorage.removeItem(key)
}
export async function install(
  id: string,
  base: string,
  listed?: CatalogRelease,
  options: { seeded?: boolean; progress?: (ratio: number) => void } = {}
) {
  return appLock(id, async () => {
    const old = await getInstalled(id)
    const source = new URL(base, location.href).origin
    if (old && (old.source ?? location.origin) !== source)
      throw new PlatformError('E_DENIED', 'Updates must come from the app’s installed catalog origin')
    const seeded = await transaction(['marks'], 'readonly', (tx) => read<{ seeded?: boolean }>(tx, 'marks', id))
    if (options.seeded && seeded?.seeded) return
    const bundle = await download(base, id, listed, options.progress)
    const next = releaseId(bundle.release)
    await transaction(['installed', 'releases', 'marks'], 'readwrite', async (tx) => {
      const current = await read<Installed>(tx, 'installed', id)
      if (current?.generation !== old?.generation || current?.state === 'removing') throw new PlatformError('E_STALE')
      const collision = await read<StoredRelease>(tx, 'releases', next)
      if (collision && collision.release.manifest.id !== id)
        throw new PlatformError('E_STORAGE', 'Release identity collision')
      await put(tx, 'releases', next, bundle)
      if (!current) {
        const mark = (await read<{ generation?: number }>(tx, 'marks', id)) ?? {}
        const generation = (mark.generation ?? 0) + 1
        await put(tx, 'marks', id, { ...mark, generation })
        await put(tx, 'installed', id, {
          id,
          current: next,
          state: 'ready',
          generation,
          installedAt: Date.now(),
          source,
          attempts: 0
        } satisfies Installed)
      } else if (current.current !== next && current.failedVersion !== next)
        await put(tx, 'installed', id, { ...current, candidate: next, failedVersion: undefined })
      if (options.seeded) await put(tx, 'marks', id, { ...(await read<object>(tx, 'marks', id)), seeded: true })
    })
    await migrateNotes(id)
    broadcast({ id })
    await activateLocked(id)
  })
}
async function activateLocked(id: string) {
  const initial = await getInstalled(id)
  if (!initial?.candidate || initial.state === 'removing' || initial.failedVersion === initial.candidate) return
  await transaction(['installed', 'leases', 'checkpoints', 'appdata', 'meta', 'widgets'], 'readwrite', async (tx) => {
    const app = await authority(tx, id, initial.generation, true)
    if (!app.candidate || (await freshLeases(tx, id))) return
    const old = app.current
    if (app.state === 'ready') {
      await put(tx, 'checkpoints', [id, old], await checkpoint(tx, id))
      app.recovery = { release: old, checkpoint: [id, old] }
    }
    app.current = app.candidate
    delete app.candidate
    app.state = 'trial'
    app.attempts = 0
    app.generation++
    app.migration = { from: old, to: app.current, done: false }
    await put(tx, 'installed', id, app)
  })
  broadcast({ id })
}
export const activate = (id: string) => appLock(id, () => activateLocked(id))
export async function launchAttempt(id: string, force = false): Promise<Installed> {
  return appLock(id, async () => {
    await migrateNotes(id)
    const initial = await getInstalled(id)
    if (!initial) throw new PlatformError('E_GONE')
    return transaction(['installed', 'leases'], 'readwrite', async (tx) => {
      const app = await authority(tx, id, initial.generation)
      if (app.attempts >= 2 && app.recovery && !force)
        throw new PlatformError('E_CLOSED', 'Restore previous version or try again')
      app.attempts++
      await writeAuthority(tx, app)
      await put(tx, 'leases', [id, tabId], { views: 1, heartbeat: Date.now() })
      sessions.set(id, { generation: app.generation, views: 1 })
      return app
    })
  })
}
export async function ready(id: string, generation: number) {
  if (id.startsWith('dev:')) return
  await appLock(id, () =>
    transaction(['installed', 'checkpoints', 'releases'], 'readwrite', async (tx) => {
      const app = await authority(tx, id, generation)
      app.attempts = 0
      app.state = 'ready'
      if (app.migration) app.migration.done = true
      const checkpoints = await entries<Checkpoint>(tx, 'checkpoints', id)
      for (const [release] of checkpoints)
        if (release !== app.recovery?.release) {
          tx.objectStore('checkpoints').delete([id, release])
          if (release !== app.current && release !== app.candidate && release !== app.failedVersion)
            tx.objectStore('releases').delete(release)
        }
      await put(tx, 'installed', id, app)
    })
  )
  broadcast({ id })
}
export async function restore(id: string) {
  await appLock(id, async () => {
    const initial = await getInstalled(id)
    if (!initial) throw new PlatformError('E_GONE')
    await transaction([...STORES], 'readwrite', async (tx) => {
      const app = await authority(tx, id, initial.generation, true)
      if (!app.recovery || (await freshLeases(tx, id)))
        throw new PlatformError('E_STALE', 'Close the app before restoring')
      const saved = await read<Checkpoint>(tx, 'checkpoints', app.recovery.checkpoint)
      if (!saved) throw new PlatformError('E_STORAGE', 'Recovery checkpoint missing')
      tx.objectStore('recovery').delete(range(id))
      await put(tx, 'recovery', [id, app.current], await checkpoint(tx, id))
      await replaceData(tx, id, saved)
      app.failedVersion = app.current
      app.current = app.recovery.release
      app.state = 'ready'
      app.attempts = 0
      app.generation++
      delete app.candidate
      delete app.migration
      await put(tx, 'installed', id, app)
    })
  })
  broadcast({ id })
}
export async function retry(id: string) {
  await appLock(id, async () => {
    await transaction(['installed'], 'readwrite', async (tx) => {
      const app = await read<Installed>(tx, 'installed', id)
      if (!app || app.state === 'removing') throw new PlatformError('E_GONE')
      app.candidate = app.failedVersion
      delete app.failedVersion
      await put(tx, 'installed', id, app)
    })
    await activateLocked(id)
  })
  broadcast({ id })
}
export async function uninstall(id: string) {
  await appLock(id, () =>
    transaction(['installed'], 'readwrite', async (tx) => {
      const app = await read<Installed>(tx, 'installed', id)
      if (!app) return
      if (app.state !== 'removing') {
        app.state = 'removing'
        app.generation++
        await put(tx, 'marks', id, { ...(await read<object>(tx, 'marks', id)), generation: app.generation })
        await put(tx, 'installed', id, app)
      }
    })
  )
  broadcast({ id })
  await finishRemoval(id)
}
async function finishRemoval(id: string) {
  await appLock(id, () =>
    transaction([...STORES], 'readwrite', async (tx) => {
      const app = await read<Installed>(tx, 'installed', id)
      if (!app || app.state !== 'removing' || (await freshLeases(tx, id))) return
      const releases = (await result(tx.objectStore('releases').getAll())) as StoredRelease[]
      for (const bundle of releases)
        if (bundle.release.manifest.id === id) tx.objectStore('releases').delete(releaseId(bundle.release))
      for (const store of ['appdata', 'checkpoints', 'recovery', 'widgets', 'leases'] as const)
        tx.objectStore(store).delete(range(id))
      for (const store of ['installed', 'meta', 'legacy'] as const) tx.objectStore(store).delete(id)
    })
  )
  broadcast({ id })
}
export async function reconcile() {
  const apps = await allInstalled()
  for (const app of apps) {
    if (app.state === 'removing') await finishRemoval(app.id)
    else {
      await activate(app.id)
      await appLock(app.id, () => migrateNotes(app.id))
    }
  }
  const bundles = await transaction(
    ['releases'],
    'readonly',
    (tx) => result(tx.objectStore('releases').getAll()) as Promise<StoredRelease[]>
  )
  for (const bundle of bundles)
    if (Date.now() - bundle.committedAt > 600000)
      await appLock(bundle.release.manifest.id, () =>
        transaction(['installed', 'releases', 'checkpoints'], 'readwrite', async (tx) => {
          const id = bundle.release.manifest.id
          const app = await read<Installed>(tx, 'installed', id)
          const rid = releaseId(bundle.release)
          if ([app?.current, app?.candidate, app?.recovery?.release, app?.failedVersion].includes(rid)) return
          // Older recovery code is retained until the trial has proved itself.
          if (app?.state === 'trial' && (await read(tx, 'checkpoints', [id, rid]))) return
          tx.objectStore('releases').delete(rid)
          tx.objectStore('checkpoints').delete([id, rid])
        })
      )
}
