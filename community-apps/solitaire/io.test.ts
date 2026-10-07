// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun io.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import { ackWrite, faultDelay, flushWrite, type PendingWrite, viewLive } from './io.ts'

let passed = 0
const failures: string[] = []
function check(name: string, fn: () => void | Promise<void>) {
  const done = async () => {
    try {
      await fn()
      passed++
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  checks.push(done)
}
const checks: Array<() => Promise<void>> = []
function eq(actual: unknown, want: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}
// --- view admission -------------------------------------------------------

check('viewLive requires both flags', () => {
  eq(viewLive({ visible: true, active: true }), true)
  // Sleep/clip: the view stays the active owner while off-screen.
  eq(viewLive({ visible: false, active: true }), false)
  // Folded away: the display reports neither.
  eq(viewLive({ visible: false, active: false }), false)
  // Shown but not owning (a cover preview, a backgrounded split).
  eq(viewLive({ visible: true, active: false }), false)
})

// --- parked-write flushing -------------------------------------------------

const rig = () => {
  const calls: string[] = []
  let record: string | null = null
  let rejects = 0
  return {
    calls,
    set stored(v: string | null) {
      record = v
    },
    set rejectReads(n: number) {
      rejects = n
    },
    deps: (pending: PendingWrite) => ({
      get: async () => {
        calls.push('get')
        if (rejects-- > 0) throw new Error('E_STORAGE')
        return record
      },
      foreign: (cur: string) => {
        calls.push(`foreign:${cur}`)
        return cur.startsWith('F:')
      },
      stale: () => false,
      issue: (raw: string) => {
        calls.push(`issue:${raw}`)
        pending.issued = raw
      },
      fault: () => {
        calls.push('fault')
      }
    })
  }
}

check('a rejected read parks the intent and never issues', async () => {
  const r = rig()
  r.stored = 'F:newer'
  r.rejectReads = 1
  const p: PendingWrite = { raw: 'mine' }
  const d = r.deps(p)
  eq(await flushWrite(p, d), 'fault')
  eq(await flushWrite(p, d), 'adopted')
  eq(r.calls.filter((c) => c.startsWith('issue')).length, 0)
})

check('a foreign record is adopted, not overwritten', async () => {
  const r = rig()
  r.stored = 'F:peer-deal'
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushWrite(p, r.deps(p)), 'adopted')
  eq(r.calls, ['get', 'foreign:F:peer-deal'])
})

check('a confirmed read issues the write once', async () => {
  const r = rig()
  r.stored = 'previous'
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushWrite(p, r.deps(p)), 'written')
  eq(r.calls, ['get', 'foreign:previous', 'issue:mine'])
  // An already-issued intent never double-writes.
  eq(await flushWrite(p, r.deps(p)), 'issued')
})

check('superseded intent is dropped, not written', async () => {
  const r = rig()
  r.stored = 'previous'
  const p: PendingWrite = { raw: 'mine' }
  const d = r.deps(p)
  d.stale = () => true
  eq(await flushWrite(p, d), 'stale')
  eq(r.calls.filter((c) => c.startsWith('issue')).length, 0)
})

check('an empty store is a null read, still one write', async () => {
  const r = rig()
  const p: PendingWrite = { raw: 'first-deal' }
  eq(await flushWrite(p, r.deps(p)), 'written')
  eq(r.calls.filter((c) => c === 'issue:first-deal').length, 1)
})

// --- mirror acknowledgement ------------------------------------------------

check('ackWrite confirms only the issued value landing ready', () => {
  const p: PendingWrite = { raw: 'mine' }
  eq(ackWrite(p, 'ready', 'mine'), 'waiting') // read never confirmed
  p.issued = 'mine'
  eq(ackWrite(p, 'saving', 'mine'), 'waiting')
  eq(ackWrite(p, 'ready', 'mine'), 'confirmed')
  // A foreign value landing instead stays parked, not confirmed.
  eq(ackWrite(p, 'ready', 'F:other'), 'waiting')
})

check('ackWrite requeues on a store error', () => {
  const p: PendingWrite = { raw: 'mine', issued: 'mine' }
  eq(ackWrite(p, 'error', 'mine'), 'requeue')
  eq(ackWrite(p, 'error', null), 'requeue')
})

// --- retry pacing ----------------------------------------------------------

check('faultDelay backs off and caps', () => {
  eq(faultDelay(0), 300)
  eq(faultDelay(1), 600)
  eq(faultDelay(4), 4000)
  eq(faultDelay(20), 4000)
})

const main = async () => {
  for (const run of checks) await run()
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`)
    throw new Error(`${failures.length} check(s) failed`)
  }
  console.log(`io.test.ts: ${passed} checks passed`)
}
await main()
