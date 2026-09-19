import { REQUIRES_PLATFORM, supports } from '../../sdk/compat.ts'
import { envelope, PlatformError, requestValid, widgetValid } from '../../sdk/guards.ts'
import { record } from '../../sdk/manifest.ts'
import { frameAllow, mutatingService, servicePermission } from '../../sdk/permissions.ts'
import { type Change, LIMITS, PROTOCOL, type Req, type Res, type ViewInfo } from '../../sdk/protocol.ts'
import { claimSide } from '../device.ts'
import { authority, broadcast, put, transaction } from './database.ts'
import { photoService } from './photos.ts'
import type { Session, SessionView } from './sessions.ts'
import { snapshot, storage } from './storage.ts'

type State = 'created' | 'bootstrapping' | 'connected' | 'ready' | 'revoked'
let generation = 0
export function launchFrame(
  session: Session,
  container: HTMLElement,
  info: ViewInfo,
  hooks: { state: (state: State, error?: string) => void; home: () => void; open: (id: string, arg?: string) => void },
  src?: string
) {
  const frame = document.createElement('iframe')
  frame.title = session.bundle.release.manifest.name
  frame.name = crypto.randomUUID().replaceAll('-', '')
  frame.sandbox.add('allow-scripts')
  frame.allow = frameAllow(session.bundle.release.manifest.permissions)
  frame.setAttribute('referrerpolicy', 'no-referrer')
  frame.style.cssText = 'border:0;width:100%;height:100%;display:block'
  const launch = {
    generation: ++generation,
    nonce: frame.name,
    state: 'created' as State,
    port: undefined as MessagePort | undefined
  }
  let helloTimer: ReturnType<typeof setTimeout>
  let readyTimer: ReturnType<typeof setTimeout>
  let waiting: ReturnType<typeof setInterval> | undefined
  let work = Promise.resolve()
  let replies = Promise.resolve()
  let tokens = LIMITS.burst as number
  let refilled = performance.now()
  let loaded = false
  const inflight = new Set<number>()
  const results = new Map<number, Res>()
  const watches = new Set<'storage' | 'session'>()
  const state = (value: State, error?: string) => {
    launch.state = value
    frame.dataset.state = value
    hooks.state(value, error)
  }
  let releaseSide: (() => void) | undefined
  const view: SessionView = {
    id: crypto.randomUUID(),
    info,
    ready: false,
    send(event) {
      if (event.ev === 'owner') frame.dataset.owner = event.p ? String(event.p.epoch) : ''
      if (launch.state === 'revoked' || (event.ev === 'kv' && !watches.has(event.p.space))) return
      launch.port?.postMessage(event)
    },
    revoke(reason) {
      if (launch.state === 'revoked') return
      releaseSide?.()
      state('revoked', reason === 'closed' ? undefined : reason)
      launch.generation++
      clearTimeout(helloTimer)
      clearTimeout(readyTimer)
      clearInterval(waiting)
      window.removeEventListener('message', hello)
      launch.port?.postMessage({ ev: 'bye', p: { reason } })
      launch.port?.close()
      frame.remove()
      session.remove(view)
    }
  }
  const fail = (error: string, e: 'E_PROTOCOL' | 'E_INCOMPATIBLE' = 'E_PROTOCOL') => {
    const ownerFailed = session.owner === view && !view.ready
    frame.contentWindow?.postMessage({ t: 'refused', e, msg: error }, '*')
    view.revoke('error')
    if (ownerFailed) session.end('error')
    hooks.state('revoked', error)
  }
  async function dispatch(req: Req): Promise<{ value?: unknown; deferred?: Promise<void> }> {
    const permission = servicePermission(req.m)
    if (permission && !session.bundle.release.manifest.permissions?.includes(permission))
      throw new PlatformError('E_DENIED')
    await transaction(['installed'], 'readonly', (tx) => authority(tx, session.app.id, session.app.generation))
    if (launch.state === 'revoked') throw new PlatformError('E_CLOSED')
    if (['widget.set', 'cmd.ack'].includes(req.m) || mutatingService(req.m)) session.assertOwner(view, req.epoch)
    const p = record(req.p) ? req.p : {}
    if (permission) return { value: await photoService(req.m, p) }
    if (req.m.startsWith('storage.') || req.m.startsWith('session.')) {
      const [space, action] = req.m.split('.') as ['storage' | 'session', string]
      if (action === 'watch') {
        if (space === 'storage') {
          const current = await snapshot(session.app.id, session.app.generation)
          session.storageRev = Math.max(session.storageRev, current.rev)
        }
        watches.add(space)
        session.watch(view, space, p.since)
        return {}
      }
      if (action === 'unwatch') {
        watches.delete(space)
        return {}
      }
      const value =
        space === 'storage'
          ? await storage(session.app.id, session.app.generation, action, p)
          : session.memory.run(action, p)
      if (action === 'set' || action === 'del') session.changed(space, value as Change)
      return { value }
    }
    if (req.m === 'cmd.send') {
      const completion = session.command(p)
      void completion.then(() => view.send({ ev: 'command-result', p: { cmdId: p.cmdId as string } })).catch(() => {})
      return {}
    }
    if (req.m === 'cmd.ack') {
      session.ack(p)
      return {}
    }
    if (req.m === 'widget.set') {
      if (
        (p.size !== 'small' && p.size !== 'medium') ||
        !session.bundle.release.manifest.widgets?.includes(p.size) ||
        !widgetValid(p.snapshot)
      )
        throw new PlatformError('E_ARGS')
      await transaction(['installed', 'widgets'], 'readwrite', async (tx) => {
        await authority(tx, session.app.id, session.app.generation)
        session.assertOwner(view, req.epoch)
        await put(tx, 'widgets', [session.app.id, p.size as string], {
          ...(p.snapshot as object),
          updatedAt: Date.now(),
          epoch: session.epoch
        })
      })
      broadcast({ id: session.app.id })
      return {}
    }
    if (req.m === 'open') {
      if (
        typeof p.id !== 'string' ||
        p.id.length > 256 ||
        (p.arg !== undefined && (typeof p.arg !== 'string' || p.arg.length > 4096))
      )
        throw new PlatformError('E_ARGS')
      hooks.open(p.id, p.arg as string | undefined)
      return {}
    }
    if (req.m === 'home') {
      setTimeout(hooks.home, 0)
      return {}
    }
    if (req.m === 'side.claim') {
      releaseSide ??= claimSide(() => {
        if (!view.info.visible || !view.info.active) return false
        view.send({ ev: 'side', p: { action: 'double' } })
        return true
      })
      return {}
    }
    if (req.m === 'side.release') {
      releaseSide?.()
      releaseSide = undefined
      return {}
    }
    throw new PlatformError('E_ARGS')
  }
  const errorResponse = (id: number, error: unknown): Res => ({
    id,
    ok: false,
    e: error instanceof PlatformError ? error.code : 'E_STORAGE',
    msg: String(error instanceof Error ? error.message : error)
  })
  // A hidden display's root is display:none, so its document never paints and an app
  // that reports ready from a frame callback cannot. The deadline runs only while visible.
  function armReady() {
    clearTimeout(readyTimer)
    if (launch.state === 'connected' && view.info.visible)
      readyTimer = setTimeout(() => fail('App did not become ready'), 10000)
  }
  function receive(data: unknown) {
    if (launch.state === 'revoked') return
    if (!record(data) || !envelope(data)) return fail('Invalid message')
    if ('ev' in data) {
      if (data.ev === 'ack' && launch.state === 'bootstrapping') {
        clearTimeout(helloTimer)
        state('connected')
        armReady()
        session.deliver()
        return
      }
      if (launch.state !== 'connected' && launch.state !== 'ready') return fail('Message before acknowledgement')
      if (data.ev === 'ready') {
        if (launch.state === 'ready') return
        clearTimeout(readyTimer)
        void session
          .ready(view)
          .then(() => {
            if (launch.state !== 'revoked') state('ready')
          })
          .catch((error) => fail(String(error)))
      } else if (data.ev === 'key' && record(data.p) && data.p.key === 'Escape') hooks.home()
      else if (data.ev === 'error' && launch.state !== 'ready')
        fail(record(data.p) ? String(data.p.message) : 'App error')
      else if (data.ev !== 'error') fail('Unexpected app event')
      return
    }
    if (!requestValid(data) || (launch.state !== 'connected' && launch.state !== 'ready'))
      return fail('Invalid request')
    const req = data
    if (results.has(req.id)) {
      launch.port?.postMessage(results.get(req.id))
      return
    }
    if (inflight.has(req.id)) return
    const now = performance.now()
    tokens = Math.min(LIMITS.burst, tokens + ((now - refilled) * LIMITS.rate) / 1000)
    refilled = now
    let early: PlatformError | undefined
    if (inflight.size >= LIMITS.inflight) early = new PlatformError('E_ARGS', 'Too many requests')
    else if (tokens < 1) early = new PlatformError('E_RATE', String(Math.ceil(((1 - tokens) * 1000) / LIMITS.rate)))
    else tokens--
    if (early) {
      launch.port?.postMessage(errorResponse(req.id, early))
      return
    }
    inflight.add(req.id)
    const liveGeneration = launch.generation
    const operation = work.then(async () => {
      if (early) throw early
      if (launch.state === 'revoked') throw new PlatformError('E_CLOSED')
      return dispatch(req)
    })
    work = operation.then(
      () => {},
      () => {}
    )
    const response = operation
      .then(async ({ value, deferred }): Promise<Res> => {
        if (deferred) await deferred
        return { id: req.id, ok: true, v: value }
      })
      .catch((e) => errorResponse(req.id, e))
    replies = replies.then(async () => {
      const res = await response
      inflight.delete(req.id)
      if (launch.generation !== liveGeneration || launch.state === 'revoked') return
      results.set(req.id, res)
      if (results.size > LIMITS.dedupe) results.delete(results.keys().next().value!)
      launch.port?.postMessage(res)
      if (!res.ok && res.e === 'E_GONE') view.revoke('uninstalled')
    })
  }
  function hello(event: MessageEvent) {
    if (
      event.source !== frame.contentWindow ||
      !record(event.data) ||
      event.data.t !== 'hello' ||
      event.data.nonce !== launch.nonce
    )
      return
    if (launch.state !== 'bootstrapping') {
      if (launch.state !== 'created') fail('Handshake already acknowledged')
      return
    }
    if (event.data.protocol !== PROTOCOL || event.data.sdk !== session.bundle.release.build.sdk)
      return fail('Protocol or SDK mismatch')
    if (!supports(event.data.sdk as string, !!src)) return fail(REQUIRES_PLATFORM, 'E_INCOMPATIBLE')
    launch.port?.close()
    const channel = new MessageChannel()
    launch.port = channel.port1
    channel.port1.onmessage = (e) => {
      if (launch.port === channel.port1) receive(e.data)
    }
    channel.port1.onmessageerror = () => fail('Unreadable message')
    frame.contentWindow!.postMessage(
      {
        t: 'welcome',
        view: view.info,
        session: {
          arg: session.arg,
          argSeq: session.argSeq,
          ...(view === session.owner && !session.proven && session.app.migration
            ? { migration: { from: session.app.migration.from } }
            : {})
        },
        owner: view === session.owner ? { epoch: session.epoch } : null,
        limits: LIMITS
      },
      '*',
      [channel.port2]
    )
  }
  function start() {
    clearInterval(waiting)
    state('bootstrapping')
    helloTimer = setTimeout(() => fail('App did not connect'), 10000)
    if (src) frame.src = src
    else frame.srcdoc = session.bundle.html
    container.append(frame)
  }
  session.add(view)
  frame.dataset.owner = session.owner === view ? String(session.epoch) : ''
  frame.dataset.view = view.id
  frame.dataset.session = session.id
  frame.dataset.generation = String(launch.generation)
  frame.onload = () => {
    if (loaded) fail('App navigated')
    loaded = true
  }
  addEventListener('message', hello)
  if (session.proven || session.owner === view) start()
  else
    waiting = setInterval(() => {
      if (session.proven || session.owner === view) start()
    }, 20)
  return {
    frame,
    view,
    launch,
    update(next: ViewInfo) {
      if (JSON.stringify(view.info) !== JSON.stringify(next)) {
        const shown = next.visible !== view.info.visible
        view.info = next
        view.send({ ev: 'view', p: next })
        if (shown) armReady()
      }
    },
    close: () => view.revoke('closed')
  }
}
