// Durable-progress integration tests, runnable via `bun progress.test.ts`.
// These drive the ACTUAL progress store module (progress.ts), the REAL SDK
// KVMirror adapter (packages/sdk/mirror.ts - read and transpiled here because
// a community app's source may not import outside its folder), and the exact
// writeProgress / progress-effect bodies extracted from the committed
// main.tsx - against a fake KV backend that models host semantics (whole-key
// set + rev-acked watch events, controllable latency, suppression and
// failures). A regression in the shipped write, merge or repair-dedupe path
// fails here.
// Community app tests must not import bun:test or node: modules.
import {
  mergeProgress,
  newerSeq,
  type ProgressMap,
  parsePrefs,
  parseProgress,
  parseUi,
  progressSubset,
  recordProgress,
  resumeStep
} from './engine'
import { live, type ViewLike } from './live'
import { MODELS } from './models'
import {
  casUpdate,
  decideSeq,
  durableProgress,
  parseReceipt,
  progressWrite,
  receiptKey,
  receiptReset,
  receiptWrite,
  reconcileProgress,
  repairAggregate
} from './progress.ts'

const failures: string[] = []

const check = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn()
    console.log(`ok - ${name}`)
  } catch (e) {
    failures.push(name)
    console.log(`FAIL - ${name}: ${(e as Error).message}`)
  }
}

const eq = <T>(a: T, b: T, msg = '') => {
  if (!Object.is(a, b)) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)} ${msg}`)
}
const ok = (v: unknown, msg = '') => {
  if (!v) throw new Error(`expected truthy ${msg}`)
}

const MODEL_IDS = MODELS.map((m) => m.id)
const stepsOf = (id: string) => MODELS.find((m) => m.id === id)!.steps.length

// ---- fake KV backend -------------------------------------------------------
// Models the host's storage semantics: set/del commit whole-key under a
// session-wide rev, watch delivers every committed change to every copy's
// mirror (own writes echo back), and each copy's ops can carry latency,
// failures and event suppression independently.

interface Change {
  rev: number
  k: string
  v: string | null
}

const kvError = (code: string) => Object.assign(new Error(code), { code })

class Backend {
  data = new Map<string, string>()
  rev = 0
  gen = 1
  watchers = new Set<{ cb: (e: Change) => void; space: Space }>()
  writes: [string, string][] = []
  inflight = 0
  maxInflight = 0
  ops = 0
  enter() {
    this.ops++
    this.maxInflight = Math.max(this.maxInflight, ++this.inflight)
    return () => {
      this.inflight--
    }
  }
  /** Commit like an ended peer's in-flight write landing late. */
  async inject(k: string, v: string) {
    const e: Change = { rev: ++this.rev, k, v }
    this.data.set(k, v)
    this.writes.push([k, v])
    for (const w of [...this.watchers]) if (!w.space.muted) w.cb(e)
    return e
  }
}

class Space {
  latency = 0
  failSets = 0
  failEntries = 0
  // commit-then-fail: the write lands durably but the ack is lost - the
  // unknown-outcome path the CAS contract asks the app to read back.
  commitThenFail = 0
  muted = false
  constructor(public backend: Backend) {}
  private async tick() {
    if (this.latency) await new Promise((r) => setTimeout(r, this.latency))
  }
  private checkToken(expect?: { rev: number; gen: number }) {
    if (!expect) return
    if (expect.gen !== this.backend.gen) throw kvError('E_GONE')
    if (expect.rev !== this.backend.rev) throw kvError('E_CONFLICT')
  }
  async get(k: string) {
    const done = this.backend.enter()
    await this.tick()
    done()
    return this.backend.data.get(k) ?? null
  }
  async entry(k: string) {
    const done = this.backend.enter()
    await this.tick()
    done()
    if (this.failEntries > 0) {
      this.failEntries--
      throw kvError('E_STORAGE')
    }
    return { k, v: this.backend.data.get(k) ?? null, rev: this.backend.rev, gen: this.backend.gen }
  }
  async set(k: string, v: string, expect?: { rev: number; gen: number }) {
    const done = this.backend.enter()
    await this.tick()
    try {
      this.checkToken(expect)
    } finally {
      done()
    }
    if (this.commitThenFail > 0) {
      this.commitThenFail--
      await this.backend.inject(k, v)
      throw kvError('E_TIMEOUT')
    }
    if (this.failSets > 0) {
      this.failSets--
      throw kvError('E_QUOTA')
    }
    return this.backend.inject(k, v)
  }
  async del(k: string, expect?: { rev: number; gen: number }) {
    const done = this.backend.enter()
    await this.tick()
    try {
      this.checkToken(expect)
    } finally {
      done()
    }
    const e: Change = { rev: ++this.backend.rev, k, v: null }
    this.backend.data.delete(k)
    this.backend.writes.push([k, ''])
    for (const w of [...this.backend.watchers]) if (!w.space.muted) w.cb(e)
    return e
  }
  async snapshot() {
    await this.tick()
    return { rev: this.backend.rev, entries: [...this.backend.data.entries()] as [string, string][] }
  }
  async keys() {
    await this.tick()
    return { keys: [...this.backend.data.keys()] }
  }
  watch(_since: number, cb: (e: Change) => void) {
    const w = { cb, space: this }
    this.backend.watchers.add(w)
    return () => this.backend.watchers.delete(w)
  }
}

// ---- adapter extraction: the real committed component glue -----------------

declare const Bun: {
  file(path: string): { text(): Promise<string> }
  Transpiler: new (opts: { loader: string }) => { transformSync(src: string): string }
}

const source = await Bun.file(new URL('./main.tsx', import.meta.url).pathname).text()
const transpiler = new Bun.Transpiler({ loader: 'tsx' })

// The REAL KVMirror adapter: read from the shipped SDK source and evaluated
// with its single runtime dep injected (PlatformError is the only value
// mirror.ts imports; the rest are types the transpiler erases).
const mirrorSource = await Bun.file(new URL('../../packages/sdk/mirror.ts', import.meta.url).pathname).text()
class PlatformError extends Error {
  constructor(
    public code: string,
    message?: string
  ) {
    super(message ?? code)
    this.name = 'PlatformError'
  }
}
const { KVMirror } = new Function(
  'PlatformError',
  `${transpiler
    .transformSync(mirrorSource)
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export /gm, '')}\nreturn { KVMirror };`
)(PlatformError) as { KVMirror: typeof import('../../packages/sdk/mirror.ts').KVMirror }

const writeBody = source.match(
  /const writeProgress = useCallback\(\s*\(modelId: string, step: number, steps: number\) => \{([\s\S]*?)\n {4}\},\n {4}\[scheduleProgRetry\]\s*\)/
)
if (!writeBody) throw new Error('writeProgress callback not found in main.tsx')
const writeJs = transpiler.transformSync(
  `const writeProgress = (modelId: string, step: number, steps: number) => {${writeBody[1]}\n}`
)

const effectBody = source.match(
  /useEffect\(\(\) => \{\n {4}if \(progressKV\.status === 'hydrating'\) return([\s\S]*?)\n {2}\}, \[progressWatch, progressKV\.status, view, scheduleProgRetry\]\)/
)
if (!effectBody) throw new Error('progress effect not found in main.tsx')

const uiEffectBody = source.match(
  /useEffect\(\(\) => \{\n {4}if \(ui\.status === 'hydrating'\) return([\s\S]*?)\n {2}\}, \[ui\.value, ui\.status\]\)/
)
if (!uiEffectBody) throw new Error('ui effect not found in main.tsx')

// Wall-clock settle: latency-modeled ops need real elapsed time, microtask
// chains resolve within a single timer turn.
const settle = async (ms = 40) => {
  const end = Date.now() + ms
  do {
    await new Promise((r) => setTimeout(r, 5))
  } while (Date.now() < end)
}

// A mounted copy: real KVMirror over its own Space on a shared backend, plus
// the extracted real writeProgress + progress-effect bodies driven the way
// React would (cleanup before each re-run, deps on mirror value/status).
const makeCopy = (backend: Backend, opts: { view?: ViewLike; latency?: number } = {}) => {
  const space = new Space(backend)
  space.latency = opts.latency ?? 0
  const mirror = new KVMirror(space as never)
  // One mutable view object shared by os.view and the injected `view` dep so a
  // setView flip is what the real component sees on its next render.
  const viewState: ViewLike = { ...(opts.view ?? { visible: true, active: true }) }
  const os = {
    get view() {
      return viewState
    },
    storage: space,
    // Session docs (ui position) get their own rev domain like the host.
    session: new Space(new Backend())
  }
  const progressKV = {
    get value() {
      return mirror.read('progress').value
    },
    get status() {
      return mirror.read('progress').status
    },
    set: (v: string) => mirror.write('progress', v)
  }
  const progressBest = { current: {} as ProgressMap }
  const progJson = { current: '{}' }
  const repairSig = { current: { sig: null as string | null } }
  const progBusy = { current: false }
  const progAgain = { current: false }
  const progPass = { current: () => {} }
  const retryLog: { scheduled: number } = { scheduled: 0 }
  // The real callback debounces 1500ms through window.setTimeout; the harness
  // records the retry and exposes runRetry() so checks stay deterministic.
  const scheduleProgRetry = () => {
    retryLog.scheduled++
  }
  let rendered: ProgressMap = {}
  const setProgress = (p: ProgressMap) => {
    rendered = p
  }
  const liveNow = () => live(os.view)

  // Extra injected refs cover the pre-fix bodies verbatim (progWritten et al)
  // so the same harness can evaluate an older committed main.tsx unchanged.
  const progWritten = { current: null as string | null }
  const writeProgress = new Function(
    'progressBest',
    'mergeProgress',
    'recordProgress',
    'progJson',
    'setProgress',
    'progressWrite',
    'os',
    'progressKV',
    'progWritten',
    'scheduleProgRetry',
    `${writeJs}\nreturn writeProgress;`
  )(
    progressBest,
    mergeProgress,
    recordProgress,
    progJson,
    setProgress,
    progressWrite,
    os,
    progressKV,
    progWritten,
    scheduleProgRetry
  ) as (modelId: string, step: number, steps: number) => void

  const liveRef = { current: true }
  const effectFn = new Function(
    'progressKV',
    'reconcileProgress',
    'os',
    'MODEL_IDS',
    'progressBest',
    'liveNow',
    'repairSig',
    'progJson',
    'setProgress',
    'receiptKey',
    'parseProgress',
    'progressSubset',
    'liveRef',
    'progWritten',
    'mergeProgress',
    'live',
    'view',
    'progBusy',
    'progAgain',
    'progPass',
    'receiptWrite',
    'repairAggregate',
    'scheduleProgRetry',
    'progressWatch',
    `return () => {${effectBody[1]}\n}`
  )(
    progressKV,
    reconcileProgress,
    os,
    MODEL_IDS,
    progressBest,
    liveNow,
    repairSig,
    progJson,
    setProgress,
    receiptKey,
    parseProgress,
    progressSubset,
    liveRef,
    progWritten,
    mergeProgress,
    live,
    os.view,
    progBusy,
    progAgain,
    progPass,
    receiptWrite,
    repairAggregate,
    scheduleProgRetry,
    ''
  ) as () => () => void

  let cleanup: (() => void) | undefined
  let lastDeps: string | null = null
  const fire = () => {
    cleanup?.()
    cleanup = effectFn() ?? undefined
  }
  // The real deps array also carries `view`: flip os.view through this to
  // re-fire the pass exactly the way a live transition re-runs React's effect.
  const setView = (v: ViewLike) => {
    Object.assign(viewState, v)
    fire()
  }
  const unsub = mirror.subscribe(() => {
    // The real effect also depends on every receipt key's value, so a foreign
    // per-model commit re-fires the pass even when the aggregate is untouched.
    const deps = `${progressKV.status}|${progressKV.value}|${MODEL_IDS.map((id) => mirror.read(receiptKey(id)).value).join('|')}`
    if (deps !== lastDeps) {
      lastDeps = deps
      fire()
    }
  })
  return {
    space,
    os,
    progressKV,
    progressBest,
    writeProgress,
    retryLog,
    // The 1500ms debounce in the real callback, fired by hand: runs the same
    // coalesced pass trigger the timer would.
    runRetry: () => {
      if (progBusy.current) progAgain.current = true
      else progPass.current()
    },
    ui: () => rendered,
    fire,
    setView,
    dispose: () => {
      cleanup?.()
      unsub()
    }
  }
}

const durableMap = (b: Backend): ProgressMap => parseProgress(b.data.get('progress') ?? null)
// Durable authority view: aggregate union receipts, exactly what a cold boot
// reconciles - used where the aggregate alone may lag receipts.
const durableFacts = async (b: Backend): Promise<ProgressMap> =>
  (await durableProgress(new Space(b) as never, MODEL_IDS)).facts

const allDoneMap = (): ProgressMap => {
  let m: ProgressMap = {}
  for (const id of MODEL_IDS) m = recordProgress(m, id, stepsOf(id), stepsOf(id), 1000)
  return m
}

// ---- scenarios -------------------------------------------------------------

await check('slow boot: write before progress hydrate merges durable truth', async () => {
  const b = new Backend()
  await b.inject('progress', JSON.stringify({ dart: { hi: 6, done: true, at: 1 } }))
  const c = makeCopy(b, { latency: 25 }) // hydrate still pending when input lands
  c.writeProgress('cup', 5, stepsOf('cup'))
  await settle(400)
  const d = await durableFacts(b)
  ok(d.dart?.done, 'pre-existing dart must survive a pre-hydrate write')
  ok(d.cup?.done, 'own cup write must land')
  eq(c.ui().cup?.done, true)
})

await check('unseen peer: write merges a foreign doc this copy never observed', async () => {
  const b = new Backend()
  await b.inject('progress', JSON.stringify({ dart: { hi: 6, done: true, at: 1 } }))
  const c = makeCopy(b)
  c.space.muted = true // never observed the foreign write or its hydrate facts
  c.writeProgress('cup', 3, stepsOf('cup'))
  await settle()
  const d = await durableFacts(b)
  ok(d.dart?.done, 'unobserved dart fact survives via the union readers use')
  eq(d.cup?.hi, 3)
})

await check('late stale whole-doc overwrite is repaired from durable evidence', async () => {
  const b = new Backend()
  const a = makeCopy(b)
  for (const id of MODEL_IDS) a.writeProgress(id, stepsOf(id), stepsOf(id))
  await settle()
  const pre = await durableFacts(b)
  ok(
    MODEL_IDS.every((id) => pre[id]?.done),
    'all six durable before the clobber'
  )
  const writesBefore = b.writes.length
  // An ended peer's stale whole-map flight lands late with only two entries.
  await b.inject(
    'progress',
    JSON.stringify({ dart: { hi: 1, done: false, at: 5 }, cup: { hi: 2, done: false, at: 6 } })
  )
  await settle()
  const d = durableMap(b)
  ok(
    MODEL_IDS.every((id) => d[id]?.done),
    `aggregate repaired to all-six: ${JSON.stringify(d)}`
  )
  ok(b.writes.length > writesBefore, 'a repair emission must have landed')
  ok(
    MODEL_IDS.every((id) => a.ui()[id]?.done ?? false),
    'a still shows every model done'
  )
})

await check('same-model latch: old hi1/false cannot unlatch durable hi8/done', async () => {
  const b = new Backend()
  await b.inject('progress', JSON.stringify({ boat: { hi: 8, done: true, at: 1 } }))
  const c = makeCopy(b)
  await settle()
  // Stale publisher lands the same model regressed.
  await b.inject('progress', JSON.stringify({ boat: { hi: 1, done: false, at: 2 } }))
  await settle()
  const d = durableMap(b)
  eq(d.boat?.hi, 8)
  eq(d.boat?.done, true)
  eq(c.ui().boat?.hi, 8)
  eq(c.ui().boat?.done, true)
})

await check('peer done then dispose: stale flight cannot erase receipt facts', async () => {
  const b = new Backend()
  const a = makeCopy(b)
  a.writeProgress('dart', 6, stepsOf('dart'))
  a.writeProgress('cup', 5, stepsOf('cup'))
  await settle()
  a.dispose() // publisher ends
  // Its earlier stale aggregate flight lands last: whole-key overwrite wins.
  await b.inject('progress', JSON.stringify({ cup: { hi: 2, done: false, at: 1 } }))
  // Fresh copy boots cold, unions aggregate + receipts, repairs the aggregate.
  const c = makeCopy(b)
  await settle()
  const d = await durableFacts(b)
  eq(d.dart?.done, true, 'dart done must survive via its receipt')
  eq(d.dart?.hi, 6)
  eq(d.cup?.done, true)
  eq((await durableFacts(b)).dart?.done, true)
  eq(c.ui().dart?.done, true)
  eq(resumeStep(stepsOf('dart'), c.ui().dart), 6, 'reopening lands on Result')
})

await check('receipts-only boot: missing aggregate repaired, facts preserved', async () => {
  const b = new Backend()
  await b.inject(receiptKey('tulip'), JSON.stringify({ hi: 4, done: true, at: 1 }))
  const c = makeCopy(b)
  await settle()
  eq(c.ui().tulip?.done, true)
  eq(durableMap(b).tulip?.done, true, 'aggregate rebuilt from receipts')
})

await check('legacy v1 doc migrates: receipts created without losing entries', async () => {
  const b = new Backend()
  await b.inject(
    'progress',
    JSON.stringify({ helmet: { hi: 6, done: true, at: 1 }, balloon: { hi: 3, done: false, at: 2 } })
  )
  const c = makeCopy(b)
  await settle()
  eq(c.ui().helmet?.done, true)
  eq(parseReceipt(b.data.get(receiptKey('helmet')))?.done, true, 'receipt backfilled')
  eq(parseReceipt(b.data.get(receiptKey('balloon')))?.hi, 3)
})

await check('corrupt aggregate + corrupt receipt recover truthfully', async () => {
  const b = new Backend()
  b.data.set('progress', '{not json')
  b.data.set(receiptKey('cup'), '{bad')
  const c = makeCopy(b)
  c.writeProgress('cup', 2, stepsOf('cup'))
  await settle()
  eq(durableMap(b).cup?.hi, 2, 'aggregate overwritten with the real superset')
  eq(parseReceipt(b.data.get(receiptKey('cup')))?.hi, 2)
})

await check('quota failure inside the write loop retries the next round', async () => {
  const b = new Backend()
  const c = makeCopy(b)
  c.space.failSets = 1 // first receipt set rejects; the loop's read-back retries
  c.writeProgress('cup', 5, stepsOf('cup'))
  await settle()
  eq(parseReceipt(b.data.get(receiptKey('cup')))?.done, true, 'receipt committed on the retry round')
  eq((await durableFacts(b)).cup?.done, true)
})

await check('unacked write schedules a deduped repair, not a silent drop', async () => {
  const b = new Backend()
  const c = makeCopy(b)
  await settle() // hydrate done first, so no reconcile fires during the write
  c.space.failSets = 1 // the set rejects; unknown outcome, never committed
  c.writeProgress('cup', 5, stepsOf('cup'))
  await settle()
  ok(c.retryLog.scheduled > 0, 'an unacked write asks the reconcile pass to retry')
  eq(b.data.get(receiptKey('cup')), undefined, 'nothing committed yet')
  c.runRetry()
  await settle()
  eq(parseReceipt(b.data.get(receiptKey('cup')))?.done, true, 'the deduped pass landed the fact')
  eq((await durableFacts(b)).cup?.done, true)
})

await check('stale same-model write is a no-op against the durable latch', async () => {
  const b = new Backend()
  await b.inject(receiptKey('boat'), JSON.stringify({ hi: 8, done: true, at: 1 }))
  const writesBefore = b.writes.length
  // An old publisher's regressed flight arrives: read-modify-verify merges it
  // into the committed record instead of replacing it.
  const r = await receiptWrite(new Space(b) as never, 'boat', { hi: 1, done: false, at: 9 })
  eq(r.acked, true)
  eq(parseReceipt(b.data.get(receiptKey('boat')))?.hi, 8)
  eq(parseReceipt(b.data.get(receiptKey('boat')))?.done, true)
  eq(b.writes.length, writesBefore, 'a covered intent emits no write')
})

await check('two copies converge: all six across both displays', async () => {
  const b = new Backend()
  const inner = makeCopy(b)
  const cover = makeCopy(b)
  for (const [i, id] of MODEL_IDS.entries()) {
    const copy = i % 2 === 0 ? inner : cover
    copy.writeProgress(id, stepsOf(id), stepsOf(id))
  }
  await settle(200)
  const d = await durableFacts(b)
  ok(
    MODEL_IDS.every((id) => d[id]?.done),
    'durable all-six across both copies'
  )
  ok(
    MODEL_IDS.every((id) => inner.ui()[id]?.done && cover.ui()[id]?.done),
    'both UIs converged'
  )
})

await check('both copies end; fresh snapshot restores every durable fact', async () => {
  const b = new Backend()
  const a = makeCopy(b)
  const c = makeCopy(b)
  a.writeProgress('dart', 6, stepsOf('dart'))
  c.writeProgress('boat', 8, stepsOf('boat'))
  c.writeProgress('cup', 5, stepsOf('cup'))
  await settle()
  a.dispose()
  c.dispose()
  const fresh = makeCopy(b)
  await settle()
  const d = await durableFacts(b)
  eq(d.dart?.done, true)
  eq(d.boat?.done, true)
  eq(d.cup?.done, true)
  eq(resumeStep(stepsOf('boat'), fresh.ui().boat), 8)
})

await check('hidden copy adopts but never emits repairs', async () => {
  const b = new Backend()
  await b.inject('progress', JSON.stringify({ dart: { hi: 6, done: true, at: 1 } }))
  const hidden = makeCopy(b, { view: { visible: false, active: true } })
  await settle()
  eq(hidden.ui().dart?.done, true, 'hidden copy still adopts foreign facts')
  const before = b.writes.length
  hidden.fire()
  await settle()
  eq(b.writes.length, before, 'a hidden copy writes nothing on its own')
})

await check('live transition re-arms a repair skipped while hidden', async () => {
  const b = new Backend()
  await b.inject('progress', JSON.stringify({ dart: { hi: 1, done: false, at: 1 } }))
  await b.inject('progress.m.dart', JSON.stringify({ hi: 6, done: true, at: 2 }))
  const c = makeCopy(b, { view: { visible: false, active: true } })
  await settle()
  eq(c.ui().dart?.done, true, 'hidden reconcile still adopts the receipt union')
  const cur = parseProgress(b.data.get('progress')!)
  eq(cur.dart?.hi, 1, 'aggregate left stale while the copy is hidden')
  c.setView({ visible: true, active: true })
  await settle(60)
  const repaired = parseProgress(b.data.get('progress')!)
  eq(repaired.dart?.done, true, 'turning live repairs the aggregate from receipts')
})

await check('delayed foreign write during own flight: deferred wins, union kept', async () => {
  const b = new Backend()
  const a = makeCopy(b)
  await settle()
  a.space.latency = 30 // slow its own ack so a foreign write lands mid-flight
  a.writeProgress('cup', 3, stepsOf('cup'))
  await new Promise((r) => setTimeout(r, 5))
  await b.inject('progress', JSON.stringify({ dart: { hi: 6, done: true, at: 1 } }))
  await settle(500)
  const d = await durableFacts(b)
  eq(d.dart?.done, true)
  eq(d.cup?.hi, 3)
  eq(a.ui().dart?.done, true, 'the foreign fact was adopted, not lost')
})

await check('watch suppression: reconcile verifies durable by get, not echo', async () => {
  const b = new Backend()
  await b.inject('progress', JSON.stringify(allDoneMap()))
  const c = makeCopy(b)
  await settle()
  c.space.muted = true // watch suppresses the clobber - mirror never echoes it
  b.data.set('progress', JSON.stringify({ dart: { hi: 1, done: false, at: 9 } }))
  // The next real write still merge-reads durable truth and re-publishes it.
  c.writeProgress('cup', 5, stepsOf('cup'))
  await settle()
  const d = await durableFacts(b)
  ok(
    MODEL_IDS.every((id) => d[id]?.done),
    'suppressed watch never let the clobber stand'
  )
})

await check('rapid write burst keeps concurrent requests bounded', async () => {
  // The host rejects a view with >=64 in-flight requests ('Too many
  // requests'): reconciles must tail-coalesce instead of stacking.
  const b = new Backend()
  const a = makeCopy(b, { latency: 40 })
  const c = makeCopy(b, { latency: 40 })
  await settle(120)
  const models = ['dart', 'boat', 'cup', 'helmet', 'tulip', 'balloon']
  for (let round = 0; round < 3; round++)
    for (const m of models) {
      a.writeProgress(m, round + 2, stepsOf(m))
      c.writeProgress(m, round + 3, stepsOf(m))
    }
  await settle(1200)
  // Each reconcile pass reads 7 keys; every own-write echo re-fires it. Without
  // coalescing a 36-write burst runs dozens of overlapping passes and the host
  // starts rejecting requests once 64 are in flight. A coalesced copy needs a
  // handful of passes, not one per echo.
  ok(b.ops < 300, `durable ops ${b.ops} stayed bounded under the burst`)
  ok(b.maxInflight < 64, `peak in-flight ${b.maxInflight} stayed under the host cap`)
  const facts = await durableProgress(a.space as never, MODEL_IDS)
  eq(Object.keys(facts.facts).length, 6, 'all six facts survived the burst')
})

await check('no idle write storm or repair ping-pong', async () => {
  const b = new Backend()
  const c = makeCopy(b)
  c.writeProgress('dart', 6, stepsOf('dart'))
  await settle()
  const covered = b.writes.length
  for (let i = 0; i < 6; i++) c.fire() // steady-state reconcile passes
  await settle()
  eq(b.writes.length, covered, 'a covered doc emits nothing')
  // A clobber emits exactly one repair for the same observed durable state.
  b.writes.length = 0
  await b.inject('progress', '{}')
  await settle()
  const once = b.writes.length
  ok(once > 0 && once <= MODEL_IDS.length + 1, `one repair burst, got ${once}`)
  c.fire()
  c.fire()
  await settle()
  eq(b.writes.length, once, 'same durable signature never re-emits')
  // ...but a NEW clobber after the repair landed is a fresh deficiency.
  await b.inject('progress', '{}')
  await settle()
  ok(b.writes.length > once, 'a repeated clobber is repaired again')
})

await check('best stays monotonic: late UI write never shrinks observed facts', async () => {
  const b = new Backend()
  const c = makeCopy(b)
  c.writeProgress('boat', 8, stepsOf('boat'))
  await settle()
  c.writeProgress('boat', 1, stepsOf('boat')) // revisit an early step
  await settle()
  const d = await durableFacts(b)
  eq(d.boat?.hi, 8)
  eq(d.boat?.done, true)
  eq(c.ui().boat?.hi, 8)
})

// ---- real ui/prefs effect bodies: conditional repair on observed doc -------

const uiEffectFn = new Function(
  'ui',
  'parseUi',
  'newerSeq',
  'uiBest',
  'setUiState',
  'liveRef',
  'os',
  'casUpdate',
  'decideSeq',
  `return () => {${uiEffectBody[1]}\n}`
)

const makeUiOs = () => {
  const backend = new Backend()
  return { backend, os: { session: new Space(backend) } }
}

await check('ui effect: stale foreign doc is repaired once per durable truth', async () => {
  const { backend, os } = makeUiOs()
  const best = { v: 1, model: 'dart' as string | null, step: 3, seq: 5, by: 'a' }
  const ui = { status: 'ready', value: JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' }) }
  const uiBest = { current: best }
  let rendered = ''
  const setUiState = (f: { model: string | null }) => {
    rendered = f.model ?? ''
  }
  const liveRef = { current: true }
  const effect = uiEffectFn(ui, parseUi, newerSeq, uiBest, setUiState, liveRef, os, casUpdate, decideSeq) as () => void
  effect()
  await settle()
  eq(backend.writes.length, 1, 'stale doc repaired once')
  eq(JSON.parse(backend.writes[0]![1]).seq, 5)
  effect() // same observed value; the committed doc now covers best - no write
  await settle()
  eq(backend.writes.length, 1, 'durable coverage dedupes without a write')
  // A fresh stale observation after coverage still emits nothing: CAS decides
  // on the durable entry, not on a frozen observation.
  ui.value = JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' })
  effect()
  await settle()
  eq(backend.writes.length, 1)
  eq(rendered, '')
})

await check('ui effect: newer foreign doc is adopted, never overwritten', async () => {
  const { backend, os } = makeUiOs()
  const ui = { status: 'ready', value: JSON.stringify({ v: 1, model: 'cup', step: 2, seq: 9, by: 'peer' }) }
  const uiBest = { current: { v: 1, model: 'dart' as string | null, step: 3, seq: 5, by: 'a' } }
  let adopted: string | null = null
  const setUiState = (f: { model: string | null }) => {
    adopted = f.model
  }
  const liveRef = { current: true }
  const effect = uiEffectFn(ui, parseUi, newerSeq, uiBest, setUiState, liveRef, os, casUpdate, decideSeq) as () => void
  effect()
  await settle()
  eq(backend.writes.length, 0, 'a newer foreign position is adopted, not repaired over')
  eq(adopted, 'cup')
  eq(uiBest.current.seq, 9)
})

await check('ui effect: hidden copy never repairs', async () => {
  const { backend, os } = makeUiOs()
  const ui = { status: 'ready', value: JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' }) }
  const uiBest = { current: { v: 1, model: 'dart', step: 3, seq: 5, by: 'a' } }
  const liveRef = { current: false }
  const effect = uiEffectFn(ui, parseUi, newerSeq, uiBest, () => {}, liveRef, os, casUpdate, decideSeq) as () => void
  effect()
  await settle()
  eq(backend.writes.length, 0)
})

await check('ui effect: a foreign seq that races the repair wins, intent adopted', async () => {
  const { backend, os } = makeUiOs()
  // Foreign doc committed at seq 9 between our observation and the repair.
  await backend.inject('ui', JSON.stringify({ v: 1, model: 'cup', step: 2, seq: 9, by: 'peer' }))
  const ui = { status: 'ready', value: JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' }) }
  const uiBest = { current: { v: 1, model: 'dart' as string | null, step: 3, seq: 5, by: 'a' } }
  let adopted: string | null = null
  const setUiState = (f: { model: string | null }) => {
    adopted = f.model
  }
  const liveRef = { current: true }
  const effect = uiEffectFn(ui, parseUi, newerSeq, uiBest, setUiState, liveRef, os, casUpdate, decideSeq) as () => void
  effect()
  await settle()
  eq(backend.writes.length, 1, 'only the foreign commit exists')
  eq(JSON.parse(backend.data.get('ui')!).model, 'cup', 'the racing newer seq survives')
  eq(adopted, 'cup', 'our stale intent is honestly refused and adopted out')
})

// ---- CAS matrix: typed conflict, unknown outcome, refusal, reset -----------

// Every two-copy scenario runs in both display directions: the admitted
// writer is the inner copy first, then the cover copy.
for (const dir of ['inner writes, cover races', 'cover writes, inner races'] as const) {
  await check(`delayed read after peer ACK rebases intent on the exact new entry (${dir})`, async () => {
    const b = new Backend()
    const inner = new Space(b)
    const cover = new Space(b)
    const [writer, peer] = dir.startsWith('cover') ? [cover, inner] : [inner, cover]
    writer.latency = 30 // every op on the writer lands/reads late
    await b.inject(receiptKey('boat'), JSON.stringify({ hi: 3, done: false, at: 1 }))
    // Writer's entry resolves after the peer's commit lands: the intent adds
    // facts the peer lacks, so the conflict rebase unions and commits.
    const w = receiptWrite(writer, 'boat', { hi: 8, done: true, at: 5 })
    await new Promise((r) => setTimeout(r, 5))
    await peer.set(receiptKey('boat'), JSON.stringify({ hi: 3, done: false, at: 2 })) // peer commit mid-flight
    const r = await w
    eq(r.acked, true)
    eq(r.gone, false)
    const d = parseReceipt(b.data.get(receiptKey('boat')))!
    eq(d.hi, 8)
    eq(d.done, true, 'the intent lands via conflict rebase union, not overwrite')
    eq(d.at, 5)
    // Covered intents adopt instead: a peer commit carrying the same facts
    // dedupes the retry to a zero-write ack.
    const r2 = await receiptWrite(writer, 'boat', { hi: 8, done: true, at: 9 })
    eq(r2.acked, true)
    eq(parseReceipt(b.data.get(receiptKey('boat')))!.at, 5, 'covered intent emits no write')
  })

  await check(`delayed admitted write after peer ACK conflicts and re-unions (${dir})`, async () => {
    const b = new Backend()
    const inner = new Space(b)
    const cover = new Space(b)
    const [writer, peer] = dir.startsWith('cover') ? [cover, inner] : [inner, cover]
    await b.inject(receiptKey('cup'), JSON.stringify({ hi: 2, done: false, at: 1 }))
    const e = await writer.entry(receiptKey('cup'))
    writer.latency = 25 // the admitted write lands after the peer commit
    const p = writer.set(receiptKey('cup'), JSON.stringify({ hi: 5, done: true, at: 9 }), {
      rev: e.rev,
      gen: e.gen
    })
    await new Promise((r) => setTimeout(r, 5))
    // A conservative rev token conflicts on ANY sibling write, not just this key.
    await peer.set('prefs', JSON.stringify({ v: 1, muted: true, motion: true, seq: 7, by: 'peer' }))
    let conflicted = false
    try {
      await p
    } catch (err) {
      conflicted = (err as { code?: string }).code === 'E_CONFLICT'
    }
    // The exact stale-token write typed-conflicts; the app's retry re-unions.
    ok(conflicted, 'stale token must reject E_CONFLICT, not clobber')
    const r = await receiptWrite(writer, 'cup', { hi: 5, done: true, at: 9 })
    eq(r.acked, true)
    const d = parseReceipt(b.data.get(receiptKey('cup')))!
    eq(d.done, true)
    eq(d.at, 9, 'rebased commit lands after the typed conflict')
    eq(parsePrefs(b.data.get('prefs')).seq, 7, 'the sibling commit is untouched')
  })
}

await check('six acked completions: a late same-model receipt cannot drop the set', async () => {
  // The confirmed regression: both copies close after all six acked
  // completions, then a stale same-model write lands. Union-on-conflict must
  // keep every receipt and the aggregate.
  const b = new Backend()
  for (const [i, id] of MODEL_IDS.entries()) {
    await b.inject(receiptKey(id), JSON.stringify({ hi: stepsOf(id), done: true, at: i + 1 }))
  }
  await b.inject('progress', JSON.stringify(allDoneMap()))
  // Late regressed same-model flight (an old build's whole-intent write).
  const stale = new Space(b)
  const r = await receiptWrite(stale, 'boat', { hi: 1, done: false, at: 99 })
  eq(r.acked, true, 'covered intent resolves as adopted - no regression write')
  const d = await durableFacts(b)
  ok(
    MODEL_IDS.every((id) => d[id]?.done),
    `all six completions survive: ${JSON.stringify(d)}`
  )
  eq(d.boat?.hi, stepsOf('boat'))
  eq(parseReceipt(b.data.get(receiptKey('boat')))!.done, true)
})

await check('two initial-null writers: one commits, the loser re-unions', async () => {
  const b = new Backend()
  const a = new Space(b)
  const c = new Space(b)
  c.latency = 15 // cover copy reads/writes late
  const [ra, rc] = await Promise.all([
    receiptWrite(a, 'helmet', { hi: 3, done: false, at: 10 }),
    receiptWrite(c, 'helmet', { hi: 6, done: true, at: 20 })
  ])
  ok(ra.acked && rc.acked)
  const d = parseReceipt(b.data.get(receiptKey('helmet')))!
  eq(d.hi, 6)
  eq(d.done, true, 'concurrent first writers converge on the union')
})

await check('same intent admitted twice dedupes to one committed fact', async () => {
  const b = new Backend()
  const a = makeCopy(b)
  const c = makeCopy(b)
  a.writeProgress('tulip', 4, stepsOf('tulip'))
  c.writeProgress('tulip', 4, stepsOf('tulip'))
  await settle(200)
  const d = parseReceipt(b.data.get(receiptKey('tulip')))!
  eq(d.done, true)
  eq(d.hi, 4)
  ok(a.ui().tulip?.done && c.ui().tulip?.done, 'both copies show the single fact')
})

await check('reset tombstone: pre-reset stale intent is refused, post-reset intent unions forward', async () => {
  const b = new Backend()
  const space = new Space(b)
  await receiptWrite(space, 'dart', { hi: 6, done: true, at: 1 })
  const reset = await receiptReset(space, 'dart', 500)
  eq(reset.acked, true)
  eq(reset.rec.hi, 0)
  eq(reset.rec.inc, 1)
  // A pre-reset write still in flight carries inc 0: honestly refused.
  const stale = await receiptWrite(space, 'dart', { hi: 6, done: true, at: 9 })
  eq(stale.acked, true)
  eq(stale.rec.hi, 0, 'adopted tombstone - erased progress stays erased')
  eq(parseReceipt(b.data.get(receiptKey('dart')))!.hi, 0)
  // An intent admitted after the reset unions forward on the same incarnation.
  const post = await receiptWrite(space, 'dart', { hi: 2, done: false, at: 600, inc: 1 })
  eq(post.acked, true)
  eq(parseReceipt(b.data.get(receiptKey('dart')))!.hi, 2)
})

await check('conditional delete+recreate through the same CAS surface', async () => {
  const b = new Backend()
  const space = new Space(b)
  await space.set('tmp', 'a', { rev: 0, gen: 1 })
  const e = await space.entry('tmp')
  await space.del('tmp', { rev: e.rev, gen: e.gen })
  eq(b.data.get('tmp'), undefined, 'conditional delete landed')
  const e2 = await space.entry('tmp')
  await space.set('tmp', 'b', { rev: e2.rev, gen: e2.gen })
  eq(b.data.get('tmp'), 'b', 'recreate commits under the fresh token')
  // A stale token held across the delete is refused.
  let refused = false
  try {
    await space.set('tmp', 'z', { rev: e.rev, gen: e.gen })
  } catch (err) {
    refused = (err as { code?: string }).code === 'E_CONFLICT'
  }
  ok(refused, 'a token from before the delete cannot write after it')
  eq(b.data.get('tmp'), 'b')
})

await check('unknown outcome: committed-but-lost ack resolves by same-key readback', async () => {
  const b = new Backend()
  const space = new Space(b)
  space.commitThenFail = 1 // write lands, ack is lost
  const r = await receiptWrite(space, 'cup', { hi: 5, done: true, at: 3 })
  eq(r.acked, true, 'the readback observes the committed write')
  eq(parseReceipt(b.data.get(receiptKey('cup')))!.done, true)
  // Same-operation identity: exactly one durable write, no blind re-write.
  eq(b.writes.filter(([k]) => k === receiptKey('cup')).length, 1)
})

await check('unknown outcome with no commit stays unknown, deduped retry lands it', async () => {
  const b = new Backend()
  const space = new Space(b)
  space.failSets = 1 // the set rejects before commit: unknown, never written
  const r = await receiptWrite(space, 'cup', { hi: 5, done: true, at: 3 })
  eq(r.acked, false, 'unconfirmed intent is reported unknown, not applied')
  eq(r.gone, false)
  eq(b.data.get(receiptKey('cup')), undefined, 'no blind write was emitted')
  // The same intent retried through the operation's own identity lands once.
  const r2 = await receiptWrite(space, 'cup', { hi: 5, done: true, at: 3 })
  eq(r2.acked, true)
  eq(parseReceipt(b.data.get(receiptKey('cup')))!.done, true)
  eq(b.writes.filter(([k]) => k === receiptKey('cup')).length, 1)
})

await check('lost-ACK vs peer commit: ambiguous readback emits no second write', async () => {
  // A's conditional mutation commits but the ack is lost; B writes the same
  // key and receives its ack. A's readback sees B's value - which does not
  // cover A's intent - so the operation reports unknown instead of rerunning
  // the old intent under a fresh request and clobbering B if the original
  // lands late.
  const b = new Backend()
  const a = new Space(b)
  const peer = new Space(b)
  a.commitThenFail = 1 // A's conditional write lands; the ack never returns
  a.latency = 8 // stage B's acked commit between A's commit and its readback
  const p = receiptWrite(a, 'cup', { hi: 5, done: true, at: 3 })
  await new Promise((r) => setTimeout(r, 18)) // A committed; B commits next
  await peer.set(receiptKey('cup'), JSON.stringify({ hi: 2, done: false, at: 4 })) // B acked
  const r = await p
  eq(r.acked, false, 'A cannot prove its original outcome: unknown, not applied')
  // No fresh write after the ambiguous readback: only A's landed original and
  // B's commit exist - a third write would risk racing the timed-out original.
  eq(b.writes.filter(([k]) => k === receiptKey('cup')).length, 2, 'no new write was authorized')
  // The deduped reconcile is what converges the fact, keyed on durable state.
  const r2 = await receiptWrite(a, 'cup', { hi: 5, done: true, at: 3 })
  eq(r2.acked, true)
  eq(parseReceipt(b.data.get(receiptKey('cup')))!.done, true)
})

await check('E_GONE: dead generation stops - no write, no retry, no clobber', async () => {
  const b = new Backend()
  const c = makeCopy(b)
  await settle()
  c.space.latency = 20 // entry mints the gen-1 token; the write commits late
  c.writeProgress('balloon', 3, stepsOf('balloon'))
  await new Promise((r) => setTimeout(r, 30)) // entry resolved at gen 1; set in flight
  b.gen = 2 // a restore killed this copy's generation before its write lands
  await settle(200)
  eq(c.retryLog.scheduled, 0, 'gone is not retried')
  eq(parseReceipt(b.data.get(receiptKey('balloon'))), null, 'nothing committed under a dead authority')
  c.space.latency = 0
})

await check('failed read never becomes a blank or seed overwrite', async () => {
  const b = new Backend()
  await b.inject(receiptKey('dart'), JSON.stringify({ hi: 6, done: true, at: 1 }))
  const space = new Space(b)
  space.failEntries = 10 // every read fails
  const r = await receiptWrite(space, 'dart', { hi: 0, done: false, at: 5 })
  eq(r.acked, false)
  eq(r.gone, false)
  eq(parseReceipt(b.data.get(receiptKey('dart')))!.hi, 6, 'durable record untouched by the blind write')
  eq(b.writes.length, 1, 'no write emitted at all')
})

await check('prefs CAS: foreign-newer adopts, intent-newer commits under token', async () => {
  const b = new Backend()
  const space = new Space(b)
  const intent = { v: 1 as const, muted: true, motion: false, seq: 3, by: 'inner' }
  const r = await casUpdate(space, 'prefs', parsePrefs, decideSeq, intent, JSON.stringify)
  eq(r.kind, 'committed')
  // A newer foreign seq adopted by a stale intent.
  const stale = await casUpdate(space, 'prefs', parsePrefs, decideSeq, { ...intent, seq: 2 }, JSON.stringify)
  eq(stale.kind, 'adopted')
  eq(b.data.get('prefs'), JSON.stringify(intent), 'foreign-newer doc survives')
})

if (failures.length) throw new Error(`${failures.length} failing: ${failures.join(', ')}`)
console.log('progress.test.ts: all checks passed')
