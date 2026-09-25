import { HOST_SDK } from './compat.ts'
import { envelope, keyValid, mutating, PlatformError, valueValid, viewValid } from './guards.ts'
import { record } from './manifest.ts'
import type { Photo } from './permissions.ts'
import {
  type Change,
  type Evt,
  type KV,
  LIMITS,
  type Method,
  PROTOCOL,
  type Req,
  type Res,
  type ViewInfo,
  type Welcome,
  type WidgetSnapshot
} from './protocol.ts'

type Pending = {
  req: Req
  resolve: (v: unknown) => void
  reject: (e: PlatformError) => void
  timer: ReturnType<typeof setTimeout>
  retries: number
}
type Command = { type: string; payload: string }

/** One client per app document; importing host-only types has no side effects. */
export function createClient() {
  let port: MessagePort | undefined
  let connection: Promise<void> | undefined
  let closed = false
  let seq = 0
  let argSeq = 0
  let frame = 0
  const pending = new Map<number, Pending>()
  const views = new Set<(v: ViewInfo) => void>()
  const owners = new Set<(o: { epoch: number } | null) => void>()
  const args = new Set<(arg: string) => void>()
  const sides = new Set<() => void>()
  const watches = { storage: new Set<(c: Change) => void>(), session: new Set<(c: Change) => void>() }
  const commands = new Set<(c: Command) => Promise<void> | void>()
  const commandWaiters = new Map<string, { resolve: () => void; reject: (e: Error) => void }>()
  const executing = new Set<string>()
  const completed = new Set<string>()
  const subscribe = <T>(set: Set<T>, cb: T) => {
    set.add(cb)
    return () => {
      set.delete(cb)
    }
  }
  function stop(code: 'E_CLOSED' | 'E_PROTOCOL') {
    closed = true
    port?.close()
    cancelAnimationFrame(frame)
    for (const p of pending.values()) {
      clearTimeout(p.timer)
      p.reject(new PlatformError(code))
    }
    pending.clear()
    for (const waiter of commandWaiters.values()) waiter.reject(new PlatformError(code))
    commandWaiters.clear()
  }
  function request<T>(m: Method, p?: unknown): Promise<T> {
    if (closed || !port) return Promise.reject(new PlatformError('E_CLOSED'))
    const req: Req = { id: ++seq, m, p, epoch: client.owner?.epoch }
    if (!envelope(req) || pending.size >= LIMITS.inflight) return Promise.reject(new PlatformError('E_ARGS'))
    return new Promise<T>((resolve, reject) => {
      // Reads go through the shell's serialized IDB queue and can sit behind slow
      // writes; mutating calls repost once early instead of waiting that whole window.
      const first = mutating(m) ? 5000 : 15000
      const timeout = () => {
        const entry = pending.get(req.id)
        if (!entry) return
        if (mutating(m) && entry.retries++ === 0) {
          port?.postMessage(req)
          entry.timer = setTimeout(timeout, 10000)
        } else {
          pending.delete(req.id)
          reject(new PlatformError('E_TIMEOUT', 'Timed out; read back before retrying with a new request.'))
        }
      }
      pending.set(req.id, {
        req,
        resolve: (v) => resolve(v as T),
        reject,
        retries: 0,
        timer: setTimeout(timeout, first)
      })
      port!.postMessage(req)
    })
  }
  function kv(space: 'storage' | 'session'): KV {
    const keyRequest = <T>(action: 'get' | 'set' | 'del', k: string, v?: string): Promise<T> => {
      if (!keyValid(k) || (action === 'set' && !valueValid(v))) return Promise.reject(new PlatformError('E_ARGS'))
      return request(`${space}.${action}`, { k, v })
    }
    return {
      get: (k) => keyRequest('get', k),
      set: (k, v) => keyRequest('set', k, v),
      del: (k) => keyRequest('del', k),
      keys: (cursor) => request(`${space}.keys`, { cursor }),
      snapshot: (cursor) => request(`${space}.snapshot`, { cursor }),
      watch(since, cb) {
        const remove = subscribe(watches[space], cb)
        void request(`${space}.watch`, { since }).catch(() => cb({ rev: -1, k: '', v: null }))
        return () => {
          remove()
          if (!watches[space].size) void request(`${space}.unwatch`).catch(() => {})
        }
      }
    }
  }
  async function command(p: Extract<Evt, { ev: 'cmd' }>['p']) {
    const epoch = client.owner?.epoch
    if (!epoch || executing.has(p.cmdId) || !commands.size) return
    executing.add(p.cmdId)
    try {
      if (!completed.has(p.cmdId)) {
        for (const cb of commands) await cb(p)
        completed.add(p.cmdId)
        if (completed.size > LIMITS.dedupe) completed.delete(completed.values().next().value!)
      }
      if (client.owner?.epoch === epoch) await request('cmd.ack', { cmdId: p.cmdId })
    } catch {
      /* Leave unacknowledged work for redelivery. */
    } finally {
      executing.delete(p.cmdId)
    }
  }
  function receive(data: unknown) {
    if (!record(data) || !envelope(data)) return stop('E_PROTOCOL')
    if ('id' in data) {
      if (!Number.isSafeInteger(data.id) || typeof data.ok !== 'boolean') return stop('E_PROTOCOL')
      const res = data as Res
      const p = pending.get(res.id)
      if (!p) return
      clearTimeout(p.timer)
      pending.delete(res.id)
      if (res.ok) p.resolve(res.v)
      else p.reject(new PlatformError(res.e, res.msg))
      return
    }
    const event = data as Evt
    switch (event.ev) {
      case 'bye':
        stop('E_CLOSED')
        break
      case 'view':
        if (!viewValid(event.p)) return stop('E_PROTOCOL')
        client.view = event.p
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0
            for (const cb of views) cb(client.view)
          })
        break
      case 'owner':
        if (event.p !== null && (!record(event.p) || !Number.isSafeInteger(event.p.epoch))) return stop('E_PROTOCOL')
        client.owner = event.p
        for (const cb of owners) cb(event.p)
        break
      case 'side':
        if (!record(event.p) || event.p.action !== 'double') return stop('E_PROTOCOL')
        for (const cb of sides) cb()
        break
      case 'arg':
        if (event.p.argSeq <= argSeq) return
        argSeq = event.p.argSeq
        client.session.arg = event.p.arg
        for (const cb of args) cb(event.p.arg)
        break
      case 'kv':
        if (
          !record(event.p) ||
          !['storage', 'session'].includes(event.p.space) ||
          !Number.isInteger(event.p.rev) ||
          !keyValid(event.p.k) ||
          (event.p.v !== null && !valueValid(event.p.v))
        )
          return stop('E_PROTOCOL')
        for (const cb of watches[event.p.space]) cb(event.p)
        break
      case 'command-result':
        if (!record(event.p) || typeof event.p.cmdId !== 'string') return stop('E_PROTOCOL')
        commandWaiters.get(event.p.cmdId)?.resolve()
        commandWaiters.delete(event.p.cmdId)
        break
      case 'cmd':
        if (
          !record(event.p) ||
          typeof event.p.cmdId !== 'string' ||
          typeof event.p.type !== 'string' ||
          typeof event.p.payload !== 'string'
        )
          return stop('E_PROTOCOL')
        void command(event.p)
        break
      default:
        stop('E_PROTOCOL')
    }
  }
  const client = {
    connect(): Promise<void> {
      if (connection) return connection
      connection = new Promise<void>((resolve, reject) => {
        const hello = () =>
          window.parent.postMessage({ t: 'hello', protocol: PROTOCOL, sdk: HOST_SDK, nonce: window.name }, '*')
        const retry = setInterval(hello, 1000)
        const timeout = setTimeout(() => {
          clean()
          stop('E_CLOSED')
          reject(new PlatformError('E_TIMEOUT'))
        }, 10000)
        const clean = () => {
          clearInterval(retry)
          clearTimeout(timeout)
          removeEventListener('message', welcome)
        }
        const welcome = (event: MessageEvent) => {
          if (event.source !== window.parent || !record(event.data)) return
          if (event.data.t === 'refused') {
            clean()
            stop('E_PROTOCOL')
            reject(new PlatformError('E_PROTOCOL', String(event.data.msg)))
            return
          }
          if (event.data.t !== 'welcome' || !event.ports[0]) return
          const data = event.data as Welcome
          if (!viewValid(data.view) || !record(data.session) || !Number.isSafeInteger(data.session.argSeq)) {
            clean()
            stop('E_PROTOCOL')
            reject(new PlatformError('E_PROTOCOL'))
            return
          }
          clean()
          client.view = data.view
          client.owner = data.owner
          argSeq = data.session.argSeq
          Object.assign(client.session, data.session)
          port = event.ports[0]
          port.onmessage = (event) => receive(event.data)
          port.onmessageerror = () => stop('E_PROTOCOL')
          port.postMessage({ ev: 'ack' })
          addEventListener(
            'keydown',
            (e) => {
              if (e.key === 'Escape') port?.postMessage({ ev: 'key', p: { key: 'Escape' } })
            },
            true
          )
          addEventListener('error', (e) =>
            port?.postMessage({ ev: 'error', p: { message: e.message, stack: e.error?.stack } })
          )
          resolve()
        }
        addEventListener('message', welcome)
        hello()
      })
      return connection
    },
    ready() {
      port?.postMessage({ ev: 'ready' })
    },
    view: {
      display: 'inner',
      placement: 'full',
      width: 0,
      height: 0,
      visible: false,
      active: false,
      focused: false,
      angle: 180
    } as ViewInfo,
    onView: (cb: (v: ViewInfo) => void) => subscribe(views, cb),
    owner: null as { epoch: number } | null,
    onOwner: (cb: (o: { epoch: number } | null) => void) => subscribe(owners, cb),
    session: Object.assign(kv('session'), {
      arg: undefined as string | undefined,
      migration: undefined as { from: string } | undefined,
      onArg: (cb: (arg: string) => void) => subscribe(args, cb)
    }),
    storage: Object.assign(kv('storage'), { limits: LIMITS }),
    commands: {
      async send(type: string, payload: string) {
        if (commandWaiters.size >= LIMITS.commands) throw new PlatformError('E_ARGS')
        const cmdId = crypto.randomUUID()
        let resolve!: () => void, reject!: (e: Error) => void
        const completed = new Promise<void>((yes, no) => {
          resolve = yes
          reject = no
        })
        void completed.catch(() => {})
        commandWaiters.set(cmdId, { resolve, reject })
        try {
          await request<void>('cmd.send', { cmdId, type, payload })
          await completed
        } finally {
          commandWaiters.delete(cmdId)
        }
      },
      onCommand: (cb: (c: Command) => Promise<void> | void) => subscribe(commands, cb)
    },
    widget: {
      set: (size: 'small' | 'medium', snapshot: WidgetSnapshot) => request<void>('widget.set', { size, snapshot })
    },
    open: (id: string, arg?: string) => request<void>('open', { id, arg }),
    home: () => request<void>('home'),
    sideButton: {
      claim: () => request<void>('side.claim'),
      release: () => request<void>('side.release'),
      onDouble: (cb: () => void) => subscribe(sides, cb)
    },
    photos: {
      list: () => request<Photo[]>('photos.list'),
      get: (id: string) => request<Blob>('photos.get', { id }),
      add: (blob: Blob) => request<Photo>('photos.add', { blob })
    }
  }
  return client
}
