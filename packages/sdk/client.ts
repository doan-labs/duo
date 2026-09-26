import { HOST_SDK } from './compat.ts'
import {
  deviceEventName,
  deviceEventValid,
  envelope,
  fileNameValid,
  keyValid,
  micStatusValid,
  mutating,
  noticeValid,
  PlatformError,
  valueValid,
  viewValid
} from './guards.ts'
import { record } from './manifest.ts'
import type { Photo } from './permissions.ts'
import {
  type Change,
  type DeviceEvent,
  type DeviceEvents,
  type Evt,
  type KV,
  LIMITS,
  type Method,
  type MicResult,
  type MicStatus,
  type Notice,
  PROTOCOL,
  type Req,
  type Res,
  type StoredFile,
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
type Listener = (e: unknown) => void
/** Device events that are a state, not a moment: a new listener hears the current value first. */
const STATES: DeviceEvent[] = ['orientation', 'switches']

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
  const devices = new Map<DeviceEvent, Set<Listener>>()
  const mics = new Set<(s: MicStatus) => void>()
  const latest = new Map<DeviceEvent, unknown>()
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
  function hear(type: DeviceEvent, data: unknown) {
    const listeners = devices.get(type)
    if (!listeners) return
    if (STATES.includes(type)) latest.set(type, data)
    for (const cb of listeners) cb(data)
  }
  /** Starts a device event on the host; a state's reply is its current value. */
  function watch(type: DeviceEvent) {
    const listeners = new Set<Listener>()
    devices.set(type, listeners)
    void client
      .connect()
      .then(() => request<unknown>('device.watch', { type }))
      .then((now) => {
        // An event that beat the reply is newer than the value the reply carries.
        if (now === undefined || devices.get(type) !== listeners || latest.has(type)) return
        if (!deviceEventValid(type, now)) return stop('E_PROTOCOL')
        hear(type, now)
      })
      .catch(() => {})
    return listeners
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
      case 'device':
        if (!record(event.p) || !deviceEventName(event.p.type) || !deviceEventValid(event.p.type, event.p.data))
          return stop('E_PROTOCOL')
        hear(event.p.type, event.p.data)
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
      case 'mic':
        if (!micStatusValid(event.p)) return stop('E_PROTOCOL')
        for (const cb of mics) cb(event.p)
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
    notify: {
      /**
       * Posts an OS notification: a banner over whatever is on screen, then a
       * card in Notification Center. Tapping it opens the app with `arg`, the
       * same deep link `os.open` carries. Ungated, like `open` and `home`.
       */
      post: (notice: Notice) =>
        noticeValid(notice)
          ? request<{ id: string }>('notify.post', notice)
          : Promise.reject(new PlatformError('E_ARGS')),
      /** Clears this app's own notices, one by `id` or all of them. */
      clear: (id?: string) => request<void>('notify.clear', { id })
    },
    sideButton: {
      claim: () => request<void>('side.claim'),
      release: () => request<void>('side.release'),
      onDouble: (cb: () => void) => subscribe(sides, cb)
    },
    device: {
      /**
       * Hears the phone's hardware: `os.device.on('volume', (e) => …)`. Returns
       * the unsubscribe. The first listener of a type starts it on the host and
       * the last one to leave stops it, so a button is only taken from the
       * system while something is listening for it.
       */
      on<K extends DeviceEvent>(type: K, cb: (e: DeviceEvents[K]) => void): () => void {
        const listener = cb as Listener
        const listeners = devices.get(type) ?? watch(type)
        if (latest.has(type))
          queueMicrotask(() => {
            if (listeners.has(listener) && latest.has(type)) listener(latest.get(type))
          })
        listeners.add(listener)
        return () => {
          if (!listeners.delete(listener) || listeners.size || devices.get(type) !== listeners) return
          devices.delete(type)
          latest.delete(type)
          void request('device.unwatch', { type }).catch(() => {})
        }
      }
    },
    photos: {
      list: () => request<Photo[]>('photos.list'),
      get: (id: string) => request<Blob>('photos.get', { id }),
      add: (blob: Blob) => request<Photo>('photos.add', { blob })
    },
    /**
     * The host's recorder, not a device handle: `start` is what asks the
     * browser for the microphone, so calling it is the Record press. `stop`
     * resolves with the take, or null when nothing was captured; an 'ended'
     * status means capture died on its own (track ended, device gone) and the
     * partial take is waiting for one `stop` to claim it.
     */
    mic: {
      start: () => request<void>('mic.start'),
      pause: () => request<void>('mic.pause'),
      resume: () => request<void>('mic.resume'),
      stop: () => request<MicResult | null>('mic.stop'),
      status: () => request<MicStatus>('mic.status'),
      onStatus: (cb: (s: MicStatus) => void) => subscribe(mics, cb)
    },
    /** Durable blobs in the app's own `appfiles` namespace; see LIMITS.file/filesBytes. */
    files: {
      list: () => request<StoredFile[]>('file.list'),
      get: (name: string) => request<Blob | null>('file.get', { name }),
      put: (name: string, blob: Blob) =>
        fileNameValid(name) && blob instanceof Blob
          ? request<StoredFile>('file.put', { name, blob })
          : Promise.reject(new PlatformError('E_ARGS')),
      del: (name: string) => request<void>('file.del', { name })
    }
  }
  return client
}
