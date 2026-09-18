import { flushSync } from 'react-dom'
import {
  BUILDER_CHANNEL,
  PREVIEW_LIMIT,
  type PreviewBundle,
  type PreviewReply,
  type PreviewRequest
} from '../../sdk/builder-preview'
import { supports } from '../../sdk/compat'
import { record, releaseId, releaseValid } from '../../sdk/manifest'
import { device, goHome, unlockAll } from '../device'
import { isDesktop } from '../native'
import {
  appLock,
  broadcast,
  type Checkpoint,
  entries,
  getInstalled,
  type Installed,
  type Meta,
  put,
  range,
  read,
  type StoredRelease,
  transaction
} from './database'
import { development } from './development'
import { previewEvents } from './preview-events'
import { bootRegistry, refreshRegistry } from './registry'
import { digest, verifyDocument } from './releases'
import { closeSession } from './sessions'
import { emptyMeta } from './storage'

async function verify(bundle: PreviewBundle): Promise<StoredRelease> {
  if (
    !record(bundle) ||
    typeof bundle.html !== 'string' ||
    bundle.html.length > PREVIEW_LIMIT ||
    typeof bundle.icon !== 'string' ||
    bundle.icon.length > 4096 ||
    !releaseValid(bundle.release) ||
    !supports(bundle.release.build.sdk) ||
    bundle.release.manifest.id !== 'labs.doan.builder' ||
    bundle.release.manifest.network?.length ||
    bundle.release.manifest.permissions?.length ||
    bundle.release.manifest.widgets?.length
  )
    throw new Error('Invalid builder document or permissions')
  const bytes = new TextEncoder().encode(bundle.html)
  if (bytes.length > PREVIEW_LIMIT) throw new Error('App exceeds 4 MiB')
  const icon = Uint8Array.from(atob(bundle.icon), (c) => c.charCodeAt(0))
  const files = bundle.release.files
  if (files.length !== 2 || files[0]?.path !== 'app.html' || files[1]?.path !== 'icon-builder.png')
    throw new Error('Invalid preview files')
  for (const [index, data] of [bytes, icon].entries())
    if (files[index]!.bytes !== data.length || files[index]!.sha256 !== (await digest(data)))
      throw new Error('Preview integrity mismatch')
  const joined = new Uint8Array(bytes.length + icon.length)
  joined.set(bytes)
  joined.set(icon, bytes.length)
  if ((await digest(joined)).slice(0, 8) !== bundle.release.build.hash) throw new Error('Preview identity mismatch')
  await verifyDocument(bundle.html, bundle.release)
  return {
    html: bundle.html,
    release: bundle.release,
    icons: [new Blob([icon], { type: 'image/png' })],
    committedAt: Date.now()
  }
}

function waitForApp(id: string, hash: string) {
  let stop = () => {}
  const promise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      stop()
      reject(new Error('App did not become ready within 15 seconds'))
    }, 15_000)
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id !== id || (detail.hash && detail.hash !== hash)) return
      if (detail.state === 'ready') {
        stop()
        resolve()
      } else if (detail.state === 'revoked') {
        stop()
        reject(new Error('App failed to start'))
      }
    }
    stop = () => {
      clearTimeout(timer)
      previewEvents.removeEventListener('state', listener)
    }
    previewEvents.addEventListener('state', listener)
  })
  return { promise, stop }
}

export function startBuilderPreview() {
  const token = new URLSearchParams(location.search).get('builder')
  if (isDesktop || parent === window || !token || !/^[\da-f-]{36}$/.test(token)) return
  const origin = new URL(document.referrer || location.href).origin
  if (origin !== location.origin && !(location.hostname === 'localhost' && new URL(origin).hostname === 'localhost'))
    return
  let current: { id: string; revision: string } | undefined
  let releaseLock: (() => void) | undefined
  let latest = 0
  let busy = false
  const reply = (sequence: number, status: PreviewReply['status'], message?: string) =>
    parent.postMessage({ channel: BUILDER_CHANNEL, token, sequence, status, message } satisfies PreviewReply, origin)
  async function selectProject(project: string) {
    const id = `dev:builder:${project}`
    if (current?.id === id) return id
    if (current) {
      goHome()
      await closeSession(current.id)
      releaseLock?.()
      current = undefined
    }
    await new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request(`duo-builder:${project}`, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            reject(new Error('This project is open in another builder tab'))
            return
          }
          await new Promise<void>((release) => {
            releaseLock = release
            resolve()
          })
        })
        .catch(reject)
    })
    current = { id, revision: '' }
    return id
  }
  async function activate(request: PreviewRequest) {
    const bundle = await verify(request.bundle)
    await bootRegistry()
    const id = await selectProject(request.project)
    const previous = development.get(id)
    const pendingKey = `builder:pending:${id}`
    const currentKey = `builder:current:${id}`
    const restoreData = request.restore
      ? await transaction(['checkpoints'], 'readonly', (tx) =>
          read<Checkpoint>(tx, 'checkpoints', [id, request.revision])
        )
      : undefined
    if (request.restore && !restoreData) throw new Error('This revision has no saved data checkpoint')
    // Flush removal before revocation so React cannot attach an old view after the checkpoint.
    flushSync(goHome)
    await closeSession(id)
    let src: string | undefined
    let checkpoint: Checkpoint | undefined
    let staged = false
    let waiting: ReturnType<typeof waitForApp> | undefined
    try {
      await appLock(id, async () => {
        const old = await getInstalled(id)
        await transaction(['marks', 'appdata', 'meta', 'widgets', 'checkpoints'], 'readwrite', async (tx) => {
          // A tab may close during startup. Recover the durable checkpoint before accepting more code.
          const interrupted = await read<Checkpoint>(tx, 'marks', pendingKey)
          if (interrupted) {
            tx.objectStore('appdata').delete(range(id))
            for (const [key, value] of interrupted.entries) await put(tx, 'appdata', [id, key], value)
            await put(tx, 'meta', id, interrupted.meta)
          }
          checkpoint = {
            entries: await entries<string>(tx, 'appdata', id),
            meta: (await read<Meta>(tx, 'meta', id)) ?? emptyMeta(),
            widgets: [],
            takenAt: Date.now()
          }
          const previousRevision = current!.revision || (await read<string>(tx, 'marks', currentKey))
          if (previousRevision) await put(tx, 'checkpoints', [id, previousRevision], checkpoint)
          await put(tx, 'marks', pendingKey, checkpoint)
          if (restoreData) {
            tx.objectStore('appdata').delete(range(id))
            for (const [key, value] of restoreData.entries) await put(tx, 'appdata', [id, key], value)
            await put(tx, 'meta', id, restoreData.meta)
          }
          await put(tx, 'marks', id, {
            id,
            current: releaseId(bundle.release),
            state: 'ready',
            attempts: 0,
            generation: (old?.generation ?? 0) + 1,
            installedAt: Date.now()
          } satisfies Installed)
          const history = await entries<Checkpoint>(tx, 'checkpoints', id)
          for (const [key] of history.sort((a, b) => b[1].takenAt - a[1].takenAt).slice(10))
            tx.objectStore('checkpoints').delete([id, key])
        })
        staged = true
      })
      src = URL.createObjectURL(new Blob([bundle.html], { type: 'text/html' }))
      development.set(id, { bundle, src })
      broadcast({ id })
      waiting = waitForApp(id, bundle.release.build.hash)
      void waiting.promise.catch(() => {})
      await refreshRegistry()
      device.wake()
      unlockAll()
      device.open(id)
      await waiting.promise
      await transaction(['marks'], 'readwrite', async (tx) => {
        tx.objectStore('marks').delete(pendingKey)
        await put(tx, 'marks', currentKey, request.revision)
      })
      current = { id, revision: request.revision }
      if (previous) URL.revokeObjectURL(previous.src)
    } catch (error) {
      waiting?.stop()
      flushSync(goHome)
      await closeSession(id)
      if (staged && checkpoint) {
        const saved = checkpoint
        await appLock(id, async () => {
          const old = await getInstalled(id)
          await transaction(['marks', 'appdata', 'meta'], 'readwrite', async (tx) => {
            tx.objectStore('appdata').delete(range(id))
            for (const [key, value] of saved.entries) await put(tx, 'appdata', [id, key], value)
            await put(tx, 'meta', id, saved.meta)
            tx.objectStore('marks').delete(pendingKey)
            if (old)
              await put(tx, 'marks', id, {
                ...old,
                generation: old.generation + 1,
                attempts: 0,
                state: previous ? 'ready' : 'removing',
                current: previous ? releaseId(previous.bundle.release) : old.current
              })
          })
        })
      }
      if (src) URL.revokeObjectURL(src)
      if (previous) {
        development.set(id, previous)
        await refreshRegistry()
        device.open(id)
      } else {
        development.delete(id)
        await refreshRegistry()
      }
      throw error
    }
  }
  addEventListener('message', (event) => {
    if (event.source !== parent || event.origin !== origin || !record(event.data)) return
    const request = event.data as unknown as PreviewRequest
    if (request.channel !== BUILDER_CHANNEL || request.token !== token) return
    if (request.sequence === 0) {
      reply(0, 'connected')
      return
    }
    if (
      !Number.isSafeInteger(request.sequence) ||
      request.sequence <= latest ||
      typeof request.project !== 'string' ||
      !/^[\da-f-]{36}$/.test(request.project) ||
      typeof request.revision !== 'string' ||
      !/^[\da-f-]{36}$/.test(request.revision)
    )
      return
    latest = request.sequence
    if (busy) {
      reply(request.sequence, 'error', 'Another revision is starting')
      return
    }
    busy = true
    void activate(request)
      .then(() => reply(request.sequence, 'ready'))
      .catch((error) => reply(request.sequence, 'error', String(error.message).slice(0, 500)))
      .finally(() => {
        busy = false
      })
  })
  addEventListener('pagehide', () => releaseLock?.(), { once: true })
  reply(0, 'connected')
}
