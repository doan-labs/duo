import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from './client.ts'
import type { Evt, ViewInfo, Welcome } from './protocol.ts'

// A controllable clock for the globals client.ts reads: rAF/cAF and
// setTimeout/clearTimeout. rAF only fires on flushFrames() (what an occluded
// iframe never gets); timers fire on tick(). Everything else is a light stub.

type FrameCb = (t: number) => void

const view = (over: Partial<ViewInfo> = {}): ViewInfo => ({
  display: 'inner',
  placement: 'full',
  width: 778,
  height: 503,
  visible: true,
  active: true,
  focused: true,
  angle: 180,
  ...over
})

function harness() {
  let now = 0
  let nextId = 1
  const frames = new Map<number, FrameCb>()
  const timers = new Map<number, { at: number; cb: () => void }>()
  const saved = {
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    addEventListener: globalThis.addEventListener,
    removeEventListener: globalThis.removeEventListener,
    window: (globalThis as { window?: unknown }).window
  }
  const listeners = new Map<string, Set<(e: unknown) => void>>()
  const parentPosted: unknown[] = []
  ;(globalThis as { window?: unknown }).window = {
    name: 'nonce',
    parent: { postMessage: (m: unknown) => parentPosted.push(m) }
  }
  globalThis.addEventListener = ((type: string, cb: (e: unknown) => void) => {
    let set = listeners.get(type)
    if (!set) {
      set = new Set()
      listeners.set(type, set)
    }
    set.add(cb)
  }) as typeof addEventListener
  globalThis.removeEventListener = ((type: string, cb: (e: unknown) => void) => {
    listeners.get(type)?.delete(cb)
  }) as typeof removeEventListener
  globalThis.requestAnimationFrame = ((cb: FrameCb) => {
    const id = nextId++
    frames.set(id, cb)
    return id
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => {
    frames.delete(id)
  }) as typeof cancelAnimationFrame
  globalThis.setTimeout = ((cb: () => void, ms = 0) => {
    const id = nextId++
    timers.set(id, { at: now + ms, cb })
    return id
  }) as unknown as typeof setTimeout
  globalThis.clearTimeout = ((id: number) => {
    timers.delete(id)
  }) as typeof clearTimeout

  const tick = (ms: number) => {
    now += ms
    for (const [id, t] of [...timers]) {
      if (t.at <= now) {
        timers.delete(id)
        t.cb()
      }
    }
  }
  const flushFrames = () => {
    const cbs = [...frames.values()]
    frames.clear()
    for (const cb of cbs) cb(now)
  }
  const restore = () => {
    globalThis.requestAnimationFrame = saved.requestAnimationFrame
    globalThis.cancelAnimationFrame = saved.cancelAnimationFrame
    globalThis.setTimeout = saved.setTimeout
    globalThis.clearTimeout = saved.clearTimeout
    globalThis.addEventListener = saved.addEventListener
    globalThis.removeEventListener = saved.removeEventListener
    ;(globalThis as { window?: unknown }).window = saved.window
  }

  const port = {
    sent: [] as unknown[],
    closed: false,
    onmessage: null as ((e: { data: unknown }) => void) | null,
    onmessageerror: null as (() => void) | null,
    postMessage(m: unknown) {
      this.sent.push(m)
    },
    close() {
      this.closed = true
    }
  }
  const welcome = (v: ViewInfo) => {
    const data: Welcome = {
      t: 'welcome',
      view: v,
      session: { argSeq: 0 },
      owner: null,
      limits: {} as Welcome['limits']
    }
    for (const cb of listeners.get('message') ?? []) {
      cb({ source: (globalThis as { window: { parent: unknown } }).window.parent, data, ports: [port] })
    }
  }
  const feed = (e: Evt) => port.onmessage?.({ data: e })
  const feedView = (over: Partial<ViewInfo>) => feed({ ev: 'view', p: view(over) })
  return { restore, tick, flushFrames, frames, timers, welcome, feed, feedView, port }
}

async function connected(h: ReturnType<typeof harness>) {
  const client = createClient()
  const c = client.connect()
  h.welcome(view())
  await c
  return client
}

test('a hidden copy hears lifecycle changes on receipt, never waiting on rAF or timers', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    // Host marks the folded-away copy hidden. No flushFrames() and no tick():
    // the occluded document produces no frames and its timers are throttled,
    // so the lifecycle flip must reach subscribers synchronously on receipt.
    h.feedView({ visible: false, active: false, focused: false, angle: 0 })
    assert.equal(client.view.visible, false)
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.visible, false)
    assert.equal(seen[0]!.active, false)
    // Nothing is owed a repaint or a timer fire for the lifecycle delivery.
    assert.equal(h.frames.size, 0)
    assert.equal(h.timers.size, 0)
    // Geometry-only updates still coalesce and still get the bounded fallback.
    h.feedView({ angle: 45, visible: false, active: false, focused: false })
    assert.equal(seen.length, 1)
    h.tick(400)
    assert.equal(seen.length, 2)
    assert.equal(seen[1]!.angle, 45)
  } finally {
    h.restore()
  }
})

test('a copy that boots hidden reads the truthful state and hears its first show at once', async () => {
  const h = harness()
  try {
    const client = createClient()
    const c = client.connect()
    h.welcome(view({ display: 'cover', width: 0, height: 0, visible: false, active: false, focused: false, angle: 0 }))
    await c
    assert.equal(client.view.visible, false)
    assert.equal(client.view.active, false)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    h.feedView({ visible: true, active: true, focused: true })
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.visible, true)
    assert.equal(seen[0]!.active, true)
  } finally {
    h.restore()
  }
})

test('a lifecycle flip inside a coalesced geometry stream delivers the latest snapshot at once', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    for (let i = 0; i < 20; i++) h.feedView({ angle: 180 - i })
    assert.equal(seen.length, 0)
    h.feedView({ visible: false, active: false })
    // The pending frame is consumed by the synchronous delivery: no stale
    // geometry snapshot can overtake the lifecycle observation afterwards.
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.visible, false)
    assert.equal(seen[0]!.angle, 180)
    assert.equal(h.frames.size, 0)
    h.tick(400)
    h.flushFrames()
    assert.equal(seen.length, 1)
  } finally {
    h.restore()
  }
})

test('rapid lifecycle alternation delivers each transition once with the latest snapshot', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    h.feedView({ visible: false, angle: 40 })
    h.feedView({ visible: true, angle: 170 })
    h.feedView({ visible: false, angle: 0 })
    h.tick(400)
    assert.equal(seen.length, 3)
    assert.equal(seen[0]!.visible, false)
    assert.equal(seen[1]!.visible, true)
    assert.equal(seen[1]!.angle, 170)
    assert.equal(seen[2]!.visible, false)
    assert.equal(seen[2]!.angle, 0)
  } finally {
    h.restore()
  }
})

test('visible copies still coalesce updates to one callback per frame', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    for (let i = 0; i < 50; i++) h.feedView({ angle: 180 - i })
    h.flushFrames()
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.angle, 131)
    for (let i = 0; i < 50; i++) h.feedView({ angle: 131 - i })
    h.flushFrames()
    assert.equal(seen.length, 2)
    assert.equal(seen[1]!.angle, 82)
  } finally {
    h.restore()
  }
})

test('a subscribed callback that unsubscribed while a delivery is pending is not called', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const a: ViewInfo[] = []
    const b: ViewInfo[] = []
    const offA = client.onView((v) => a.push(v))
    client.onView((v) => b.push(v))
    // Geometry-only so the delivery stays pending until the fallback fires.
    h.feedView({ angle: 90 })
    offA()
    h.tick(400)
    assert.equal(a.length, 0)
    assert.equal(b.length, 1)
  } finally {
    h.restore()
  }
})

test('stop cancels a pending view delivery entirely', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    h.feedView({ angle: 90 })
    h.feed({ ev: 'bye' })
    h.tick(400)
    h.flushFrames()
    assert.equal(seen.length, 0)
  } finally {
    h.restore()
  }
})

test('a subscriber added late reads the latest view, not a queued old one', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    h.feedView({ visible: false, active: false, focused: false, angle: 0 })
    h.tick(400)
    const seen: ViewInfo[] = []
    client.onView((v) => seen.push(v))
    assert.equal(client.view.visible, false)
    h.feedView({ angle: 90 })
    h.flushFrames()
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.angle, 90)
  } finally {
    h.restore()
  }
})

test('entry and conditional writes send the versioned wire shape and surface conflicts', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    const entry = client.storage.entry('doc')
    const req = h.port.sent.at(-1) as { id: number; m: string; p: { k: string } }
    assert.equal(req.m, 'storage.entry')
    assert.equal(req.p.k, 'doc')
    h.feed({ id: req.id, ok: true, v: { k: 'doc', v: 'one', rev: 7 } } as unknown as Evt)
    assert.deepEqual(await entry, { k: 'doc', v: 'one', rev: 7 })

    const set = client.storage.set('doc', 'two', 7)
    const setReq = h.port.sent.at(-1) as { id: number; m: string; p: Record<string, unknown> }
    assert.equal(setReq.m, 'storage.set')
    assert.equal(setReq.p.expect, 7)
    h.feed({ id: setReq.id, ok: false, e: 'E_CONFLICT' } as unknown as Evt)
    await assert.rejects(set, (e: unknown) => (e as { code: string }).code === 'E_CONFLICT')

    const del = client.storage.del('doc', 8)
    const delReq = h.port.sent.at(-1) as { id: number; m: string; p: Record<string, unknown> }
    assert.equal(delReq.m, 'storage.del')
    assert.equal(delReq.p.expect, 8)
    h.feed({ id: delReq.id, ok: true, v: { rev: 9 } } as unknown as Evt)
    assert.deepEqual(await del, { rev: 9 })

    // A malformed precondition never reaches the wire.
    const posted = h.port.sent.length
    await assert.rejects(client.storage.set('doc', 'x', -1), (e: unknown) => (e as { code: string }).code === 'E_ARGS')
    await assert.rejects(client.storage.del('doc', 1.5), (e: unknown) => (e as { code: string }).code === 'E_ARGS')
    assert.equal(h.port.sent.length, posted)
  } finally {
    h.restore()
  }
})

test('teardown leaves no delivery timers behind', async () => {
  const h = harness()
  try {
    const client = await connected(h)
    client.onView(() => {})
    h.feedView({ angle: 30 })
    h.feed({ ev: 'bye' })
    assert.equal(h.frames.size, 0)
    assert.equal(h.timers.size, 0)
  } finally {
    h.restore()
  }
})
