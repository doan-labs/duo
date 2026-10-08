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
  parseProgress,
  parseUi,
  progressSubset,
  recordProgress,
  resumeStep
} from './engine'
import { live, type ViewLike } from './live'
import { MODELS } from './models'
import {
  durableProgress,
  parseReceipt,
  progressWrite,
  receiptKey,
  receiptWrite,
  reconcileProgress
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

class Backend {
  data = new Map<string, string>()
  rev = 0
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
  muted = false
  constructor(public backend: Backend) {}
  private async tick() {
    if (this.latency) await new Promise((r) => setTimeout(r, this.latency))
  }
  async get(k: string) {
    const done = this.backend.enter()
    await this.tick()
    done()
    return this.backend.data.get(k) ?? null
  }
  async set(k: string, v: string) {
    const done = this.backend.enter()
    await this.tick()
    done()
    if (this.failSets > 0) {
      this.failSets--
      throw new Error('E_QUOTA')
    }
    return this.backend.inject(k, v)
  }
  async del(k: string) {
    await this.tick()
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
  /useEffect\(\(\) => \{\n {4}if \(progressKV\.status === 'hydrating'\) return([\s\S]*?)\n {2}\}, \[progressWatch, progressKV\.value, progressKV\.status, progressKV\.set, view, scheduleProgRetry\]\)/
)
if (!effectBody) throw new Error('progress effect not found in main.tsx')

const uiEffectBody = source.match(
  /useEffect\(\(\) => \{\n {4}if \(ui\.status === 'hydrating'\) return([\s\S]*?)\n {2}\}, \[ui\.value, ui\.status, ui\.set\]\)/
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
    storage: space
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
  c.space.failSets = 3 // every set in the write's three rounds rejects
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

// ---- real ui/prefs effect bodies: repair dedupes on observed store doc -------

const uiEffectFn = new Function(
  'ui',
  'parseUi',
  'newerSeq',
  'uiBest',
  'setUiState',
  'liveRef',
  'uiWritten',
  `return () => {${uiEffectBody[1]}\n}`
)

const withUiWritten = (...args: unknown[]) => {
  const uiWritten = { current: null as string | null }
  return uiEffectFn(...args, uiWritten)
}

await check('ui effect: stale foreign doc is repaired once per observation', async () => {
  const best = { v: 1, model: 'dart' as string | null, step: 3, seq: 5, by: 'a' }
  const sets: string[] = []
  const ui = {
    status: 'ready',
    value: JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' }),
    set: (s: string) => {
      sets.push(s)
      ui.value = s // optimistic mirror echo
    }
  }
  const uiBest = { current: best }
  let rendered = ''
  const setUiState = (f: { model: string | null }) => {
    rendered = f.model ?? ''
  }
  const liveRef = { current: true }
  const effect = withUiWritten(ui, parseUi, newerSeq, uiBest, setUiState, liveRef) as () => void
  effect()
  eq(sets.length, 1, 'stale doc repaired once')
  eq(JSON.parse(sets[0]!).seq, 5)
  effect() // same observed value now covered by our own optimistic echo
  eq(sets.length, 1)
  // A fresh stale write to the same content is a new deficiency after coverage.
  ui.value = JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' })
  effect()
  eq(sets.length, 2)
  eq(rendered, '')
})

await check('ui effect: newer foreign doc is adopted, never overwritten', async () => {
  const best = { v: 1, model: 'dart' as string | null, step: 3, seq: 5, by: 'a' }
  const sets: string[] = []
  const ui = {
    status: 'ready',
    value: JSON.stringify({ v: 1, model: 'cup', step: 2, seq: 9, by: 'peer' }),
    set: (s: string) => sets.push(s)
  }
  const uiBest = { current: best }
  let adopted: string | null = null
  const setUiState = (f: { model: string | null }) => {
    adopted = f.model
  }
  const liveRef = { current: true }
  const effect = withUiWritten(ui, parseUi, newerSeq, uiBest, setUiState, liveRef) as () => void
  effect()
  eq(sets.length, 0, 'a newer foreign position is adopted, not repaired over')
  eq(adopted, 'cup')
  eq(uiBest.current.seq, 9)
})

await check('ui effect: hidden copy never repairs', async () => {
  const sets: string[] = []
  const ui = {
    status: 'ready',
    value: JSON.stringify({ v: 1, model: null, step: 0, seq: 2, by: 'stale' }),
    set: (s: string) => sets.push(s)
  }
  const uiBest = { current: { v: 1, model: 'dart', step: 3, seq: 5, by: 'a' } }
  const liveRef = { current: false }
  const effect = withUiWritten(ui, parseUi, newerSeq, uiBest, () => {}, liveRef) as () => void
  effect()
  eq(sets.length, 0)
})

if (failures.length) throw new Error(`${failures.length} failing: ${failures.join(', ')}`)
console.log('progress.test.ts: all checks passed')
