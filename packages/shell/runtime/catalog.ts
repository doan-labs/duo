import { supports } from '../../sdk/compat.ts'
import { type Catalog, networkOrigin, record, releaseId } from '../../sdk/manifest.ts'
import { PERMISSIONS } from '../../sdk/permissions.ts'
import { PREVIEW_FEATURES } from '../../sdk/preview-features.ts'
import type { Store, StoreRow, StoreState } from '../../sdk/store.ts'
import { allInstalled, changes, getRelease } from './database.ts'
import { development, removeDevelopment } from './development.ts'
import { install, restore, retry, uninstall } from './lifecycle.ts'
import { boundedFetch } from './releases.ts'

let catalog: Catalog = { apps: {} }
// The hosted site serves the curated catalog at /catalog; a local shell only has the bundled /cdn output.
const DEFAULT_SOURCES = ['/catalog', '/cdn', '/preinstalled']
const DUO_CATALOG = 'Duo catalog'
let source = '/cdn'
let selectedCatalog: string | undefined
let state: StoreState = { rows: [], loading: true, source: DUO_CATALOG, developer: false }
const listeners = new Set<() => void>()
const progress = new Map<string, number>()
const errors = new Map<string, string>()
const pending = new Set<string>()
const emit = () => {
  for (const cb of listeners) cb()
}
function valid(value: unknown): value is Catalog {
  return (
    record(value) &&
    record(value.apps) &&
    Object.entries(value.apps).every(
      ([id, row]) =>
        /^[a-z0-9.-]{1,64}$/.test(id) &&
        record(row) &&
        typeof row.name === 'string' &&
        typeof row.author === 'string' &&
        ['official', 'community'].includes(String(row.lane)) &&
        Array.isArray(row.releases) &&
        row.releases.every(
          (r) =>
            record(r) &&
            typeof r.release === 'string' &&
            /^[\dA-Za-z.-]+\+[a-f\d]{8}$/.test(r.release) &&
            typeof r.sdk === 'string' &&
            typeof r.sha256 === 'string' &&
            /^[a-f\d]{64}$/.test(r.sha256) &&
            typeof r.bytes === 'number' &&
            r.bytes > 0
        )
    )
  )
}
async function sync() {
  const installed = await allInstalled()
  const local: StoreRow[] = []
  for (const app of installed) {
    if (app.state === 'removing' || catalog.apps[app.id]) continue
    const bundle = await getRelease(app.current)
    if (!bundle) continue
    const manifest = bundle.release.manifest
    local.push({
      id: app.id,
      name: manifest.name,
      author: manifest.author,
      lane: manifest.lane,
      permissions: (manifest.permissions ?? []).map((p) => PERMISSIONS[p].label),
      version: app.current,
      installed: app.current,
      candidate: app.candidate,
      failed: app.failedVersion,
      recovery: !!app.recovery,
      compatible: supports(bundle.release.build.sdk),
      error: errors.get(app.id)
    })
  }
  for (const [id, { bundle }] of development) {
    const manifest = bundle.release.manifest
    local.push({
      id,
      name: `${manifest.name} DEV`,
      author: manifest.author,
      lane: 'development',
      permissions: [],
      version: releaseId(bundle.release),
      installed: releaseId(bundle.release),
      recovery: false,
      compatible: true,
      development: true,
      error: errors.get(id)
    })
  }
  state = {
    ...state,
    rows: Object.entries(catalog.apps)
      .map<StoreRow>(([id, app]) => {
        const current = installed.find((a) => a.id === id && a.state !== 'removing')
        const release = app.releases.find((r) => supports(r.sdk))
        return {
          id,
          name: app.name,
          author: app.author,
          lane: app.lane,
          permissions: Array.isArray(app.permissions) ? app.permissions.map((p) => PERMISSIONS[p]?.label ?? p) : [],
          version: release?.release,
          installed: current?.current,
          candidate: current?.candidate,
          failed: current?.failedVersion,
          recovery: !!current?.recovery,
          compatible: !!release,
          progress: progress.get(id),
          error: errors.get(id)
        }
      })
      .concat(local)
      .sort((a, b) => a.lane.localeCompare(b.lane) || a.name.localeCompare(b.name))
  }
  emit()
}
async function action(id: string, operation: () => Promise<void>) {
  if (pending.has(id)) return
  pending.add(id)
  errors.delete(id)
  try {
    await operation()
  } catch (e) {
    errors.set(id, String(e instanceof Error ? e.message : e))
  } finally {
    pending.delete(id)
    progress.delete(id)
    await sync()
  }
}
export const store: Store = {
  async loadCatalog(input) {
    const url = new URL(input, location.href)
    if (
      !networkOrigin(url.origin, true) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.endsWith('/index.json')
    )
      throw new Error('Use an HTTPS or loopback catalog URL ending in /index.json')
    const data: unknown = JSON.parse(new TextDecoder().decode(await boundedFetch(url.href, 1024 * 1024)))
    if (!valid(data)) throw new Error('Invalid catalog')
    if (Object.values(data.apps).some((app) => app.permissions?.length))
      throw new Error('External developer catalogs currently support apps without device permissions')
    catalog = data
    selectedCatalog = url.href
    source = new URL('.', url).href.replace(/\/$/, '')
    state = { ...state, loading: false, error: undefined, source: url.href, developer: true }
    await sync()
  },
  async resetCatalog() {
    selectedCatalog = undefined
    catalog = { apps: {} }
    state = { ...state, loading: true, error: undefined, source: DUO_CATALOG, developer: false }
    emit()
    await store.refresh()
  },
  subscribe(cb) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  snapshot: () => state,
  async refresh() {
    if (selectedCatalog) {
      try {
        await store.loadCatalog(selectedCatalog)
      } catch (error) {
        state = { ...state, error: String(error), loading: false }
        emit()
      }
      return
    }
    try {
      let bytes: Uint8Array | undefined
      for (const candidate of DEFAULT_SOURCES) {
        try {
          bytes = await boundedFetch(`${candidate}/index.json`, 1024 * 1024)
          source = candidate
          break
        } catch {
          /* Try the next bundled location. */
        }
      }
      if (!bytes) throw new Error('No default catalog is available')
      const value: unknown = JSON.parse(new TextDecoder().decode(bytes))
      if (!valid(value)) throw new Error('Invalid catalog')
      catalog = value
      state = { ...state, loading: false, error: undefined }
      localStorage.setItem('os.catalog.cache', JSON.stringify({ source, catalog }))
    } catch (error) {
      try {
        const cached = JSON.parse(localStorage.getItem('os.catalog.cache') ?? 'null')
        if (valid(cached?.catalog) && DEFAULT_SOURCES.includes(cached.source)) {
          catalog = cached.catalog
          source = cached.source
        }
      } catch {
        /* A missing cache grants nothing. */
      }
      state = { ...state, loading: false, error: String(error) }
    }
    await sync()
  },
  install: (id) =>
    action(id, async () => {
      if (!PREVIEW_FEATURES.stageUpdates && (await allInstalled()).some((app) => app.id === id))
        throw new Error('New update staging is deferred at the MVP gate')
      const release = catalog.apps[id]?.releases.find((r) => supports(r.sdk))
      if (!release) throw new Error('Requires a newer platform version')
      progress.set(id, 0)
      await sync()
      await install(id, `${source}/apps/${id}/${release.release}/`, release, {
        progress: (value) => {
          progress.set(id, value)
          void sync()
        }
      })
    }),
  remove: (id) => action(id, () => (development.has(id) ? removeDevelopment(id) : uninstall(id))),
  retry: (id) =>
    action(id, async () => {
      if (!PREVIEW_FEATURES.stageUpdates) throw new Error('Update retry is deferred at the MVP gate')
      await retry(id)
    }),
  restore: (id) => action(id, () => restore(id))
}
let started = false
export function startCatalog() {
  if (started) return
  started = true
  changes.addEventListener('change', () => {
    void sync().catch(() => {})
  })
  void store.refresh()
  // Catalog refresh is explicit at the MVP gate; no background update discovery.
}
