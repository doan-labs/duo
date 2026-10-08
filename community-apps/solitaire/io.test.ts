// `bun:test` is a host import the submission gate refuses, so these checks run
// through the tiny runner below: `bun io.test.ts` directly, and `bun test`
// too (a failing check throws while the file is evaluated, which the runner
// reports as a failure).
import { type CasEntry, casSet, faultDelay, flushCas, type PendingWrite, viewLive } from './io.ts'

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

const err = (code: string) => Object.assign(new Error(code), { code })

/**
 * A fake conditional space honoring the accepted SDK semantics: `entry` hands
 * back value plus the space-global rev and generation in one read, `set`
 * writes only against the token of an unchanged read - a moved rev rejects
 * E_CONFLICT, a dead generation E_GONE - and scripted faults drop the ack
 * (E_TIMEOUT) with or without applying, or fail reads outright.
 */
class Space {
  v: string | null = null
  rev = 0
  gen = 1
  calls: string[] = []
  failReads = 0
  applyThenTimeout = 0
  dropThenTimeout = 0
  failSets = 0
  onEntry: (() => void) | null = null
  async entry(): Promise<CasEntry> {
    this.calls.push('entry')
    if (this.failReads > 0) {
      this.failReads--
      throw err('E_STORAGE')
    }
    this.onEntry?.()
    return { v: this.v, rev: this.rev, gen: this.gen }
  }
  async set(v: string, expect?: { rev: number; gen: number }): Promise<{ rev: number }> {
    this.calls.push('set')
    if (this.failSets > 0) {
      this.failSets--
      throw err('E_STORAGE')
    }
    // A dropped ack that never applied: the write is simply lost.
    if (this.dropThenTimeout > 0) {
      this.dropThenTimeout--
      throw err('E_TIMEOUT')
    }
    if (expect && expect.gen !== this.gen) throw err('E_GONE')
    if (expect && expect.rev !== this.rev) throw err('E_CONFLICT')
    this.v = v
    this.rev++
    // The write landed durably but its ack never made it back.
    if (this.applyThenTimeout > 0) {
      this.applyThenTimeout--
      throw err('E_TIMEOUT')
    }
    return { rev: this.rev }
  }
  /** Peer-admitted write: bumps the shared rev like the real space. */
  peerWrite(v: string) {
    this.v = v
    this.rev++
  }
  /** Recreate the record: value gone, generation bumped - old tokens die. */
  recreate() {
    this.v = null
    this.gen++
    this.rev++
  }
}

const rig = (store: Space): Parameters<typeof flushCas>[1] & { calls: string[] } => {
  const calls = store.calls
  return {
    calls,
    entry: () => store.entry(),
    set: (v: string, expect: { rev: number; gen: number }) => store.set(v, expect),
    foreign: (cur: string) => {
      calls.push(`foreign:${cur}`)
      return cur.startsWith('F:')
    },
    stale: () => {
      calls.push('stale?')
      return false
    },
    landed: (raw: string) => {
      calls.push(`landed:${raw}`)
    },
    fault: () => {
      calls.push('fault')
    }
  }
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

// --- conditional-write flushing --------------------------------------------

check('a rejected read parks the intent and never writes', async () => {
  const store = new Space()
  store.v = 'F:newer'
  store.failReads = 1
  const p: PendingWrite = { raw: 'mine' }
  const d = rig(store)
  eq(await flushCas(p, d), 'fault')
  eq(await flushCas(p, d), 'adopted')
  eq(store.calls.filter((c) => c === 'set').length, 0)
})

check('a foreign record is adopted, not overwritten', async () => {
  const store = new Space()
  store.v = 'F:peer-deal'
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushCas(p, rig(store)), 'adopted')
  eq(store.calls, ['entry', 'foreign:F:peer-deal'])
})

check('a confirmed read issues the write against its own token', async () => {
  const store = new Space()
  store.v = 'previous'
  let seenToken: { rev: number; gen: number } | undefined
  const p: PendingWrite = { raw: 'mine' }
  const d = rig(store)
  const set = d.set
  d.set = async (v, expect) => {
    seenToken = expect
    return set(v, expect)
  }
  eq(await flushCas(p, d), 'issued')
  eq(seenToken, { rev: 0, gen: 1 })
  eq(store.v, 'mine')
  // An already-issued intent never double-writes.
  eq(await flushCas(p, d), 'issued')
})

check('superseded intent is dropped, not written', async () => {
  const store = new Space()
  store.v = 'previous'
  const p: PendingWrite = { raw: 'mine' }
  const d = rig(store)
  d.stale = () => {
    store.calls.push('stale?')
    return true
  }
  eq(await flushCas(p, d), 'stale')
  eq(store.calls.filter((c) => c === 'set').length, 0)
})

check('an empty store seeds through the conditional write', async () => {
  const store = new Space()
  const p: PendingWrite = { raw: 'first-deal' }
  eq(await flushCas(p, rig(store)), 'issued')
  eq(store.v, 'first-deal')
  eq(store.rev, 1)
})

check('a conflict re-reads and never resends over a foreign record', async () => {
  const store = new Space()
  store.v = 'old'
  const p: PendingWrite = { raw: 'mine' }
  const d = rig(store)
  // A peer write lands between the entry read and the conditional set: the
  // token is stale, the set rejects, and the re-read sees the foreign record.
  let first = true
  const set = d.set
  d.set = async (v, expect) => {
    if (first) {
      first = false
      store.peerWrite('F:moved')
    }
    return set(v, expect)
  }
  eq(await flushCas(p, d), 'adopted')
  eq(store.v, 'F:moved')
  eq(store.calls.filter((c) => c === 'set').length, 1)
})

check('a conflict with only a sibling bump re-issues on the new token', async () => {
  const store = new Space()
  store.v = 'old'
  const p: PendingWrite = { raw: 'mine' }
  const d = rig(store)
  // Sibling-key write between read and set: same value, bumped rev - the
  // intent stays valid, so it re-reads and issues against the fresh token.
  let first = true
  const set = d.set
  d.set = async (v, expect) => {
    if (first) {
      first = false
      store.rev++
    }
    return set(v, expect)
  }
  eq(await flushCas(p, d), 'issued')
  eq(store.v, 'mine')
  eq(store.calls, ['entry', 'foreign:old', 'stale?', 'set', 'entry', 'foreign:old', 'stale?', 'set', 'landed:mine'])
})

check('a dead generation re-reads into the new generation and writes', async () => {
  const store = new Space()
  store.v = 'old'
  const p: PendingWrite = { raw: 'mine' }
  const d = rig(store)
  let setCalls = 0
  const set = d.set
  d.set = async (v, expect) => {
    setCalls++
    if (setCalls === 1) store.recreate() // gen dies after the read
    return set(v, expect)
  }
  eq(await flushCas(p, d), 'issued')
  eq(store.v, 'mine')
  eq(store.gen, 2)
})

check('an unknown ack reads back and confirms a landed write', async () => {
  const store = new Space()
  store.v = 'old'
  store.applyThenTimeout = 1 // write lands, ack never arrives
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushCas(p, rig(store)), 'issued')
  eq(store.v, 'mine')
  eq(store.calls.filter((c) => c === 'set').length, 1) // no blind retry
})

check('an unknown ack with a foreign readback adopts instead of resending', async () => {
  const store = new Space()
  store.v = 'old'
  store.dropThenTimeout = 1 // write did not land, ack lost
  // The readback itself sees a foreign record that landed meanwhile.
  const realEntry = store.entry.bind(store)
  let reads = 0
  store.entry = async () => {
    if (++reads === 2) store.peerWrite('F:landed')
    return realEntry()
  }
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushCas(p, rig(store)), 'adopted')
  eq(store.v, 'F:landed')
})

check('an unknown ack with the old value readback re-issues once', async () => {
  const store = new Space()
  store.v = 'old'
  store.dropThenTimeout = 1
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushCas(p, rig(store)), 'issued')
  eq(store.v, 'mine')
  eq(store.calls.filter((c) => c === 'set').length, 2)
})

check('a hard write fault parks the intent without looping forever', async () => {
  const store = new Space()
  store.failSets = 10
  const p: PendingWrite = { raw: 'mine' }
  eq(await flushCas(p, rig(store)), 'fault')
  eq(store.v, null)
  eq(p.issued, undefined)
})

check('rebase rederives the value from each confirmed entry', async () => {
  const store = new Space()
  store.v = 'plays:3'
  const p: PendingWrite = {} // intent carries no frozen bytes
  const d = rig(store)
  d.rebase = (e) => `plays:${Number(e.v!.split(':')[1]) + 1}`
  eq(await flushCas(p, d), 'issued')
  eq(store.v, 'plays:4')
  // A null rebase drops the intent honestly.
  const p2: PendingWrite = {}
  const d2 = rig(store)
  d2.rebase = () => null
  eq(await flushCas(p2, d2), 'stale')
})

// --- lone conditional writes -----------------------------------------------

// casSet talks to the three-argument KV surface (key, value, token), so the
// Space gets the same thin adapter main.tsx gives os.storage.
const kvOf = (store: Space) => ({
  entry: () => store.entry(),
  set: (_k: string, v: string, expect: { rev: number; gen: number }) => store.set(v, expect)
})

check('casSet writes through the read token and survives a conflict', async () => {
  const store = new Space()
  store.v = 'dark'
  const kv = kvOf(store)
  // A sibling write lands between the read and the set: token stale, re-read.
  let first = true
  const set = kv.set
  kv.set = async (k, v, expect) => {
    if (first) {
      first = false
      store.rev++
    }
    return set(k, v, expect)
  }
  eq(await casSet(kv, 'prefs', 'light'), true)
  eq(store.v, 'light')
  eq(store.calls.filter((c) => c === 'set').length, 2)
})

check('casSet reads a timed-out write back instead of retrying blind', async () => {
  const store = new Space()
  store.applyThenTimeout = 1
  eq(await casSet(kvOf(store), 'prefs', 'light'), true)
  eq(store.calls.filter((c) => c === 'set').length, 1)
})

check('casSet propagates a dead store honestly', async () => {
  const store = new Space()
  store.failReads = 10
  let threw = false
  try {
    await casSet(kvOf(store), 'prefs', 'light')
  } catch {
    threw = true
  }
  eq(threw, true)
  eq(store.v, null)
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
