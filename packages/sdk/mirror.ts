import { PlatformError } from './guards.ts'
import type { Change, ErrCode, KV } from './protocol.ts'

export type KeyState = { value: string | null; status: 'hydrating' | 'ready' | 'saving' | 'error'; error?: ErrCode }
const empty: KeyState = { value: null, status: 'hydrating' }

/** Optimistic state is independent of hydration until the next hydrate re-reads storage. */
export class KVMirror {
  private states = new Map<string, KeyState>()
  private listeners = new Set<() => void>()
  private local = new Map<string, number>()
  private deferred = new Map<string, Change>()
  private queue = Promise.resolve()
  private rev = 0
  private hydrated = false
  private started = false
  private unwatch?: () => void
  private serial = 0
  /** `transition` wraps a change that arrived from outside this frame, so the screen can cross-fade to it. */
  constructor(
    private space: KV,
    private transition: (fn: () => void) => void = (fn) => fn()
  ) {}
  read = (key: string) => this.states.get(key) ?? (this.hydrated ? this.readyEmpty : empty)
  private readyEmpty: KeyState = { value: null, status: 'ready' }
  subscribe = (cb: () => void) => {
    this.listeners.add(cb)
    if (!this.started) {
      this.started = true
      void this.hydrate()
    } else if (this.readyEmpty.status === 'error') {
      // A failed hydrate leaves no watch behind, so a remount is the only way back in.
      void this.hydrate()
    }
    return () => {
      this.listeners.delete(cb)
    }
  }
  private emit() {
    for (const cb of this.listeners) cb()
  }
  private inflight = false
  private attempts = 0
  async hydrate() {
    if (this.inflight) return
    this.inflight = true
    try {
      await this.pull()
    } finally {
      this.inflight = false
    }
  }
  private async pull() {
    this.unwatch?.()
    try {
      const values = new Map<string, string>()
      let cursor: string | undefined
      let revision: number | undefined
      do {
        const page = await this.space.snapshot(cursor)
        if (revision !== undefined && page.rev !== revision) throw new PlatformError('E_STALE')
        revision = page.rev
        for (const [k, v] of page.entries) values.set(k, v)
        cursor = page.cursor
      } while (cursor)
      // In-flight writes keep their optimistic state; settled 'error' entries get
      // overwritten so a transient failure cannot wedge a key away from storage.
      for (const k of new Set([...this.states.keys(), ...values.keys()])) {
        if (!this.local.has(k)) this.states.set(k, { value: values.get(k) ?? null, status: 'ready' })
      }
      this.rev = revision ?? 0
      this.readyEmpty = { value: null, status: 'ready' }
      this.attempts = 0
      this.hydrated = true
      this.unwatch = this.space.watch(this.rev, (e) => this.change(e))
      this.emit()
    } catch (e) {
      if (e instanceof PlatformError && e.code === 'E_STALE') {
        await this.pull()
        return
      }
      const code = e instanceof PlatformError ? e.code : 'E_STORAGE'
      if ((code === 'E_TIMEOUT' || code === 'E_RATE' || code === 'E_STORAGE') && this.attempts < 8) {
        this.attempts++
        await new Promise((resolve) => setTimeout(resolve, Math.min(500 * this.attempts, 4000)))
        await this.pull()
        return
      }
      this.attempts = 0
      this.readyEmpty = { value: null, status: 'error', error: 'E_STORAGE' }
      this.hydrated = true
      this.emit()
    }
  }
  private change(e: Change) {
    if (e.rev < 0 || e.rev > this.rev + 1) {
      void this.hydrate()
      return
    }
    if (e.rev <= this.rev) return
    this.rev = e.rev
    if (this.local.has(e.k)) {
      this.deferred.set(e.k, e)
      return
    }
    this.transition(() => {
      this.states.set(e.k, { value: e.v, status: 'ready' })
      this.emit()
    })
  }
  write(key: string, value: string | null) {
    const serial = ++this.serial
    this.local.set(key, serial)
    this.states.set(key, { value, status: 'saving' })
    this.emit()
    this.queue = this.queue.then(async () => {
      try {
        const ack = await (value === null ? this.space.del(key) : this.space.set(key, value))
        if (this.local.get(key) !== serial) return
        const deferred = this.deferred.get(key)
        this.states.set(key, { value: deferred && deferred.rev > ack.rev ? deferred.v : value, status: 'ready' })
      } catch (e) {
        if (this.local.get(key) !== serial) return
        this.states.set(key, { value, status: 'error', error: e instanceof PlatformError ? e.code : 'E_STORAGE' })
      } finally {
        if (this.local.get(key) === serial) {
          this.local.delete(key)
          this.deferred.delete(key)
          this.emit()
        }
      }
    })
  }
}
