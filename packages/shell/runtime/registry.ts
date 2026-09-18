import { supports } from '../../sdk/compat.ts'
import type { Catalog } from '../../sdk/manifest.ts'
import { PREVIEW_FEATURES } from '../../sdk/preview-features.ts'
import type { App } from '../../uikit/app.ts'
import { APPS, LEFT, RIGHT } from '../apps.ts'
import { startCatalog } from './catalog.ts'
import { allInstalled, changes, getInstalled, getRelease, listenDatabase } from './database.ts'
import { development, loadDevelopment } from './development.ts'
import { install, reconcile, startLifecycle } from './lifecycle.ts'
import { startWidgets } from './widgets.tsx'

let revision = 0
const listeners = new Set<() => void>()
const icons = new Map<string, { release: string; url: string }>()
export const registryRevision = () => revision
export const subscribeRegistry = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
let boot: Promise<void> | undefined
let refreshing = Promise.resolve()
export function refreshRegistry() {
  refreshing = refreshing
    .catch(() => {})
    .then(async () => {
      const installed = (await allInstalled()).filter((a) => a.state !== 'removing')
      for (const id of development.keys()) {
        const app = await getInstalled(id)
        if (app && app.state !== 'removing') installed.push(app)
      }
      const current = new Set(installed.map((a) => a.id))
      for (const list of [APPS, LEFT, RIGHT])
        for (let i = list.length - 1; i >= 0; i--) if (list[i]!.id && !current.has(list[i]!.id!)) list.splice(i, 1)
      for (const [id, icon] of icons)
        if (!current.has(id)) {
          URL.revokeObjectURL(icon.url)
          icons.delete(id)
        }
      for (const app of installed) {
        const bundle = development.get(app.id)?.bundle ?? (await getRelease(app.current))
        if (!bundle) continue
        const old = icons.get(app.id)
        if (old?.release !== app.current) {
          if (old) URL.revokeObjectURL(old.url)
          icons.set(app.id, { release: app.current, url: URL.createObjectURL(bundle.icons[0]!) })
        }
        const manifest = bundle.release.manifest
        const tile: App = {
          id: app.id,
          name: manifest.name + (development.has(app.id) ? ' DEV' : ''),
          light: manifest.light,
          edge: manifest.edge,
          icon: icons.get(app.id)!.url,
          view: () => null
        }
        const existing = APPS.find((a) => a.id === app.id)
        if (existing) Object.assign(existing, tile)
        else {
          APPS.push(tile)
          if (app.id === 'labs.doan.ipduo.notes') LEFT.splice(5, 0, tile)
          else if (app.id === 'labs.doan.ipduo.weather') RIGHT.unshift(tile)
          else RIGHT.push(tile)
        }
      }
      revision++
      for (const fn of listeners) fn()
    })
  return refreshing
}
export function bootRegistry() {
  if (boot) return boot
  boot = (async () => {
    listenDatabase()
    startLifecycle()
    changes.addEventListener('change', () => {
      void refreshRegistry().catch(() => {})
    })
    await reconcile()
    // The bundled source is also the desktop's offline reinstall source.
    const response = await fetch('/preinstalled/index.json')
    if (!response.ok) throw new Error('Preinstalled catalog unavailable')
    const catalog: Catalog = await response.json()
    for (const [id, app] of Object.entries(catalog.apps)) {
      const release = app.releases.find((r) => supports(r.sdk))
      if (release) await install(id, `/preinstalled/apps/${id}/${release.release}/`, release, { seeded: true })
    }
    const dev = new URLSearchParams(location.search).get('dev')
    if (dev) {
      if (!PREVIEW_FEATURES.developmentLoader)
        throw new Error('Live development loading is deferred. Install the separate app catalog from App Store instead')
      await loadDevelopment(dev)
    }
    await refreshRegistry()
    startCatalog()
    startWidgets()
  })()
  return boot
}
