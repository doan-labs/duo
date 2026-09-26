import { bytes, PlatformError } from '../../sdk/guards.ts'
import { type Change, type Evt, LIMITS, type ViewInfo } from '../../sdk/protocol.ts'
import { changes, getInstalled, getRelease, type Installed, type StoredRelease } from './database.ts'
import { development } from './development.ts'
import { launchAttempt, lease, ready } from './lifecycle.ts'
import { micRelease } from './mic.ts'
import { MemoryKV, snapshot } from './storage.ts'

export type SessionView = {
  id: string
  send: (event: Evt) => void
  revoke: (reason: 'closed' | 'uninstalled' | 'updating' | 'error' | 'revoked') => void
  info: ViewInfo
  ready: boolean
}
type Command = {
  cmdId: string
  type: string
  payload: string
  resolve: () => void
  reject: (e: Error) => void
  promise: Promise<void>
}
export class Session {
  id = crypto.randomUUID()
  views = new Map<string, SessionView>()
  owner?: SessionView
  epoch = 1
  memory = new MemoryKV()
  history: Change[] = []
  storageRev = 0
  argSeq = 0
  arg?: string
  commands = new Map<string, Command>()
  commandDone = new Set<string>()
  released = false
  proven = false
  private timer: ReturnType<typeof setInterval>
  private endTimer?: ReturnType<typeof setTimeout>
  private change: EventListener
  constructor(
    public app: Installed,
    public bundle: StoredRelease
  ) {
    this.proven = !app.migration || app.migration.done
    this.timer = setInterval(() => this.deliver(), 5000)
    this.change = () => {
      void this.reconcile().catch(() => this.end('error'))
    }
    changes.addEventListener('change', this.change)
  }
  async reconcile() {
    if (this.released) return
    const app = await getInstalled(this.app.id)
    if (!app || app.state === 'removing' || app.generation !== this.app.generation)
      return this.end(app?.state === 'removing' || !app ? 'uninstalled' : 'updating')
    const data = await snapshot(this.app.id, this.app.generation)
    if (data.rev > this.storageRev) {
      this.storageRev = data.rev
      // Cross-tab messages carry no trusted values; force a durable snapshot on a gap.
      for (const view of this.views.values()) view.send({ ev: 'kv', p: { space: 'storage', rev: -1, k: '', v: null } })
    }
  }
  add(view: SessionView) {
    clearTimeout(this.endTimer)
    this.views.set(view.id, view)
    if (!this.owner) this.owner = view
    void lease(this.app.id, this.app.generation, this.views.size).catch(() => this.end('uninstalled'))
  }
  remove(view: SessionView) {
    this.views.delete(view.id)
    if (view === this.owner) {
      this.epoch++
      view.send({ ev: 'owner', p: null })
      this.owner = this.views.values().next().value
      this.owner?.send({ ev: 'owner', p: { epoch: this.epoch } })
      this.deliver()
    }
    if (this.views.size)
      void lease(this.app.id, this.app.generation, this.views.size).catch(() => this.end('uninstalled'))
    // React removes old slots before attaching their replacements in the same commit.
    else
      this.endTimer = setTimeout(() => {
        if (!this.views.size) this.end('closed')
      }, 0)
  }
  end(reason: Parameters<SessionView['revoke']>[0]) {
    if (this.released) return
    this.released = true
    clearTimeout(this.endTimer)
    clearInterval(this.timer)
    changes.removeEventListener('change', this.change)
    for (const view of [...this.views.values()]) view.revoke(reason)
    // A session that dies mid-take cannot keep the microphone.
    micRelease(this)
    for (const cmd of this.commands.values()) cmd.reject(new PlatformError('E_CLOSED'))
    this.commands.clear()
    if (sessions.get(this.app.id)) sessions.delete(this.app.id)
    void lease(this.app.id, this.app.generation, 0).catch(() => {})
  }
  async ready(view: SessionView) {
    view.ready = true
    if (view === this.owner) {
      await ready(this.app.id, this.app.generation)
      this.proven = true
    }
  }
  assertOwner(view: SessionView, epoch: unknown) {
    if (view !== this.owner || epoch !== this.epoch) throw new PlatformError('E_STALE')
  }
  setArg(arg: string, always = false) {
    if (!always && this.arg === arg) return
    this.arg = arg
    this.argSeq++
    for (const view of this.views.values()) view.send({ ev: 'arg', p: { arg, argSeq: this.argSeq } })
  }
  changed(space: 'storage' | 'session', change: Change) {
    if (space === 'storage') {
      this.storageRev = Math.max(this.storageRev, change.rev)
      this.history.push(change)
      if (this.history.length > LIMITS.dedupe) this.history.shift()
    }
    for (const view of this.views.values()) view.send({ ev: 'kv', p: { space, ...change } })
  }
  watch(view: SessionView, space: 'storage' | 'session', since: unknown) {
    if (!Number.isSafeInteger(since) || Number(since) < 0) throw new PlatformError('E_ARGS')
    const history = space === 'storage' ? this.history : this.memory.history
    const rev = space === 'storage' ? this.storageRev : this.memory.rev
    if (Number(since) > rev || (Number(since) < rev && !history.some((e) => e.rev === Number(since) + 1))) {
      view.send({ ev: 'kv', p: { space, rev: -1, k: '', v: null } })
      return
    }
    for (const change of history) if (change.rev > Number(since)) view.send({ ev: 'kv', p: { space, ...change } })
  }
  command(p: Record<string, unknown>): Promise<void> {
    if (
      typeof p.cmdId !== 'string' ||
      !/^[\da-f-]{36}$/.test(p.cmdId) ||
      typeof p.type !== 'string' ||
      bytes(p.type) > 128 ||
      typeof p.payload !== 'string' ||
      bytes(p.payload) > LIMITS.command
    )
      throw new PlatformError('E_ARGS')
    if (this.commandDone.has(p.cmdId)) return Promise.resolve()
    const existing = this.commands.get(p.cmdId)
    if (existing) return existing.promise
    if (this.commands.size >= LIMITS.commands) throw new PlatformError('E_ARGS', 'Command queue full')
    let resolve!: () => void, reject!: (e: Error) => void
    const promise = new Promise<void>((yes, no) => {
      resolve = yes
      reject = no
    })
    void promise.catch(() => {})
    this.commands.set(p.cmdId, { cmdId: p.cmdId, type: p.type, payload: p.payload, promise, resolve, reject })
    this.deliver()
    return promise
  }
  ack(p: Record<string, unknown>) {
    if (typeof p.cmdId !== 'string') throw new PlatformError('E_ARGS')
    const cmd = this.commands.get(p.cmdId)
    if (!cmd) return
    this.commands.delete(p.cmdId)
    this.commandDone.add(p.cmdId)
    cmd.resolve()
    if (this.commandDone.size > LIMITS.dedupe) this.commandDone.delete(this.commandDone.values().next().value!)
  }
  deliver() {
    for (const cmd of this.commands.values())
      this.owner?.send({ ev: 'cmd', p: { cmdId: cmd.cmdId, type: cmd.type, payload: cmd.payload } })
  }
}
const sessions = new Map<string, Promise<Session>>()
/**
 * An arg for an app already running, parked or on stage: delivered like the
 * launch arg, without opening a session that does not exist (a notification's
 * deep link into a parked scene). Always emits: each tap is a user action, so a
 * repeated arg still bumps argSeq and reaches the app.
 */
export async function deliverArg(id: string, arg: string) {
  const current = await sessions.get(id)
  current?.setArg(arg, true)
}
export async function closeSession(id: string) {
  const current = await sessions.get(id)
  if (current) {
    current.end('closed')
    await lease(id, current.app.generation, 0)
  }
}
export async function session(id: string, arg?: string, force = false) {
  let opening = sessions.get(id)
  if (!opening) {
    opening = (async () => {
      const app = await launchAttempt(id, force)
      const bundle = development.get(id)?.bundle ?? (await getRelease(app.current))
      if (!bundle || (!development.has(id) && bundle.release.manifest.id !== id)) {
        await lease(id, app.generation, 0)
        throw new PlatformError('E_STORAGE', 'Installed release missing')
      }
      return new Session(app, bundle)
    })()
    sessions.set(id, opening)
    void opening.catch(() => {
      if (sessions.get(id) === opening) sessions.delete(id)
    })
  }
  const value = await opening
  if (arg !== undefined) value.setArg(arg)
  return value
}
