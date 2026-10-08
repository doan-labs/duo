// casSet determinism: the primitive every Room write path routes through.
// The harness space enforces the real host contract - one space-global rev,
// a generation token, E_CONFLICT on a stale rev, E_GONE on a foreign
// generation, and a mutating call whose ACK can be dropped so its outcome is
// genuinely unknown until the caller reads back.
import { PlatformError } from '@doan-labs/duo-sdk/guards.ts'
import { type CasKV, casClass, casSet } from './cas.ts'

let passed = 0
const failures: string[] = []
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
function eq(actual: unknown, want: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(want))
    throw new Error(`got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`)
}

// A space enforcing the host's conditional-write contract. `opts` hooks let a
// test delay a write past a peer commit (`gate`), eat the ACK after the write
// lands (`dropAck`), or fail entries.
const space = (opts: {
  initial?: string | null
  gen?: number
  gate?: () => Promise<void>
  dropAck?: boolean
  entryFails?: () => boolean
  onSet?: (v: string) => void
}) => {
  let v: string | null = opts.initial ?? null
  let rev = 0
  const gen = opts.gen ?? 1
  let sets = 0
  let entries = 0
  const kv: CasKV = {
    entry: async (k) => {
      entries++
      if (opts.entryFails?.()) throw new Error('E_IO')
      return { k, v, rev, gen }
    },
    set: async (_k, nv, expect) => {
      sets++
      await opts.gate?.()
      if (expect) {
        if (expect.gen !== gen) throw new PlatformError('E_GONE')
        if (expect.rev !== rev) throw new PlatformError('E_CONFLICT')
      }
      v = nv
      rev++
      opts.onSet?.(nv)
      if (opts.dropAck) throw new PlatformError('E_TIMEOUT')
      return { rev }
    },
    del: async (_k, expect) => {
      if (expect) {
        if (expect.gen !== gen) throw new PlatformError('E_GONE')
        if (expect.rev !== rev) throw new PlatformError('E_CONFLICT')
      }
      v = null
      rev++
      return { rev }
    }
  }
  return {
    kv,
    v: () => v,
    rev: () => rev,
    sets: () => sets,
    entries: () => entries,
    // A foreign writer that knows the space but bypasses the app.
    peerSet: (nv: string) => {
      v = nv
      rev++
    }
  }
}

await check('a conditional write applies at the entry revision', async () => {
  const s = space({})
  const out = await casSet(s.kv, 'k', (cur) => (cur === null ? 'v1' : `${cur}+v1`))
  eq(out, 'applied')
  eq(s.v(), 'v1')
  eq(s.rev(), 1)
})

await check('a conflict rebases the intent over whatever actually landed', async () => {
  // Peer lands between our entry read and our set. The retry must call make()
  // again with the peer's value - the stale computed value is never resent.
  const s = space({})
  let gated = false
  const kv: CasKV = {
    ...s.kv,
    set: async (k, v, expect) => {
      if (!gated) {
        gated = true
        s.peerSet('peer')
      }
      return s.kv.set(k, v, expect)
    }
  }
  const seen: (string | null)[] = []
  const out = await casSet(kv, 'k', (cur) => {
    seen.push(cur)
    return cur === null ? 'mine' : `${cur}+mine`
  })
  eq(out, 'applied')
  eq(seen, [null, 'peer'])
  eq(s.v(), 'peer+mine')
})

await check('a dropped ACK whose write landed resolves applied via readback, not a duplicate', async () => {
  // The mutation lands, the E_TIMEOUT reaches the caller. Reading back finds
  // exactly the value we attempted - retrying a new request would risk
  // double-applying a non-idempotent intent.
  const s = space({ dropAck: true })
  const out = await casSet(s.kv, 'k', () => 'landed')
  eq(out, 'applied')
  eq(s.v(), 'landed')
  eq(s.sets(), 1)
})

await check('a dropped ACK whose write did not land retries with a fresh request', async () => {
  const s = space({})
  let eaten = 0
  const kv: CasKV = {
    ...s.kv,
    set: async (k, v, expect) => {
      eaten++
      if (eaten === 1) throw new PlatformError('E_TIMEOUT')
      return s.kv.set(k, v, expect)
    }
  }
  const out = await casSet(kv, 'k', () => 'mine')
  eq(out, 'applied')
  eq(s.v(), 'mine')
  eq(eaten, 2)
})

await check('E_GONE on a dead generation is refused terminally, never retried', async () => {
  const s = space({ gen: 2 })
  const foreign: CasKV = {
    entry: async (k) => ({ k, v: s.v(), rev: s.rev(), gen: 1 }),
    set: async (k, v, expect) => s.kv.set(k, v, expect),
    del: async (k, expect) => s.kv.del(k, expect)
  }
  const out = await casSet(foreign, 'k', () => 'mine')
  eq(out, 'refused')
  eq(s.sets(), 1)
  eq(s.v(), null)
})

await check('a failed entry is unknown and writes nothing', async () => {
  const s = space({ entryFails: () => true })
  const out = await casSet(s.kv, 'k', () => 'mine')
  eq(out, 'unknown')
  eq(s.sets(), 0)
})

await check('an intent that no longer applies is an honest noop', async () => {
  const s = space({ initial: 'peer' })
  const out = await casSet(s.kv, 'k', (cur) => (cur === 'peer' ? null : 'mine'))
  eq(out, 'noop')
  eq(s.sets(), 0)
  eq(s.v(), 'peer')
})

await check('unwinnable conflicts exhaust attempts and report unknown', async () => {
  const s = space({})
  const kv: CasKV = {
    ...s.kv,
    set: async (k, v, expect) => {
      s.peerSet(`p${s.rev()}`)
      return s.kv.set(k, v, expect)
    }
  }
  const out = await casSet(kv, 'k', (cur) => `${cur ?? ''}m`, 3)
  eq(out, 'unknown')
  eq(s.sets(), 3)
})

await check('the maker rebinding live state never ships the captured value', async () => {
  // Mirror-publish shape: make() reads the doc on screen NOW. A conflicted
  // first attempt must ship the newer doc on retry, not the one captured
  // when the caller scheduled the write.
  const s = space({})
  let live = 'doc-a'
  let once = true
  const kv: CasKV = {
    ...s.kv,
    set: async (k, v, expect) => {
      if (once) {
        once = false
        live = 'doc-b'
        s.peerSet('peer')
      }
      return s.kv.set(k, v, expect)
    }
  }
  const out = await casSet(kv, 'k', () => live)
  eq(out, 'applied')
  eq(s.v(), 'doc-b')
})

await check('conflict, refusal and unknown classify distinctly', () => {
  eq(casClass(new PlatformError('E_CONFLICT')), 'conflict')
  eq(casClass(new PlatformError('E_TIMEOUT')), 'timeout')
  eq(casClass(new PlatformError('E_GONE')), 'refused')
  eq(casClass(new PlatformError('E_QUOTA')), 'refused')
  eq(casClass(new PlatformError('E_DENIED')), 'refused')
  eq(casClass(new PlatformError('E_CLOSED')), 'unknown')
  eq(casClass(new Error('socket dropped')), 'unknown')
})

if (failures.length) throw new Error(`${failures.length} failing checks\n${failures.join('\n')}`)
console.log(`cas.test.ts: ${passed} checks passed`)
