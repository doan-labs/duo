/**
 * Throw-runner tests for the sync primitives in `sync.ts` — the ordering
 * and failure semantics the review called out: stale echoes must never roll
 * back newer pending writes, foreign state is adopted only when nothing is
 * pending, and a failed port write reports failure instead of false success.
 * Run: bun community-apps/trip-planner/sync.test.ts
 */
import { applyWatch, clearPending, queuePending, WriteQueue } from './sync'

let passed = 0
let failed = 0
function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1
    console.log(`ok ${name}`)
  } else {
    failed += 1
    console.log(`FAIL ${name}`)
  }
}
const mkPending = () => new Map<string, (string | null)[]>()

// --- applyWatch ---------------------------------------------------------------

// In-order own echoes: effective value stays the newest write.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'B')
  check('older echo keeps pending tail', applyWatch(p, 'k', 'A') === 'B')
  check('latest echo leaves its own value', applyWatch(p, 'k', 'B') === 'B')
  check('pending drained after echoes', p.size === 0)
}

// The reported loss sequence: C rebases between echoA and echoB must see B.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'AB')
  const afterEchoA = applyWatch(p, 'k', 'A')
  check('echo of A does not roll back AB', afterEchoA === 'AB')
  queuePending(p, 'k', 'ABC')
  check('echo of AB keeps queued ABC', applyWatch(p, 'k', 'AB') === 'ABC')
  check('final echo converges', applyWatch(p, 'k', 'ABC') === 'ABC')
}

// Foreign write with nothing pending is adopted verbatim.
{
  const p = mkPending()
  check('foreign write adopted', applyWatch(p, 'k', 'F') === 'F')
  check('foreign delete adopted', applyWatch(p, 'k', null) === null)
}

// Foreign write while own writes are pending: the queued tail stays
// effective because the own writes land after it on the port (LWW).
{
  const p = mkPending()
  queuePending(p, 'k', 'B')
  check('foreign during pending is overridden by tail', applyWatch(p, 'k', 'F') === 'B')
  check('own echo then applies', applyWatch(p, 'k', 'B') === 'B')
}

// A pending delete (null tail) also survives an older echo.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', null)
  check('echo of A keeps pending delete', applyWatch(p, 'k', 'A') === null)
  check('delete echo converges', applyWatch(p, 'k', null) === null)
}

// Out-of-order echo that does not match the head is foreign data; the
// pending tail still wins and the head stays for its own echo.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  queuePending(p, 'k', 'B')
  check('unmatched echo leaves head queued', applyWatch(p, 'k', 'X') === 'B' && p.get('k')?.length === 2)
}

// clearPending drops the mask (post-failure path): next foreign echo applies.
{
  const p = mkPending()
  queuePending(p, 'k', 'A')
  clearPending(p, 'k')
  check('after clearPending foreign wins', applyWatch(p, 'k', 'F') === 'F')
}

// Per-key isolation: pending on k1 must not affect k2 events.
{
  const p = mkPending()
  queuePending(p, 'k1', 'A')
  check('other key adopts foreign', applyWatch(p, 'k2', 'F') === 'F')
  check('k1 echo still acks', applyWatch(p, 'k1', 'A') === 'A')
}

// --- WriteQueue ---------------------------------------------------------------

// Ordering: writes land serially in enqueue order.
{
  const q = new WriteQueue()
  const order: number[] = []
  let gate = 0
  const done = [
    q.send(
      async () => {
        await new Promise((r) => setTimeout(r, 5))
        order.push(1)
      },
      () => {}
    ),
    q.send(
      async () => {
        order.push(2)
      },
      () => {}
    ),
    q.send(
      async () => {
        order.push(3)
      },
      () => {}
    )
  ]
  const ok = await Promise.all(done)
  gate = 1
  check('writes execute in order', order.join(',') === '1,2,3' && gate === 1)
  check('all succeeded', ok.every(Boolean))
}

// Failure injection: rejected write resolves false, calls onFail once, and
// does not block or poison later writes.
{
  const q = new WriteQueue()
  let fails = 0
  const results = await Promise.all([
    q.send(
      async () => {},
      () => fails++
    ),
    q.send(
      async () => {
        throw new Error('port rejected')
      },
      () => fails++
    ),
    q.send(
      async () => {},
      () => fails++
    )
  ])
  check('failed write reports false', results[1] === false)
  check('neighbors still land', results[0] === true && results[2] === true)
  check('onFail fired once', fails === 1)
}

// settled(): false when any enqueued write failed, true when all landed.
{
  const q = new WriteQueue()
  q.send(
    async () => {},
    () => {}
  )
  check('settled true after success', (await q.settled()) === true)

  const q2 = new WriteQueue()
  q2.send(
    async () => {
      throw new Error('x')
    },
    () => {}
  )
  check('settled false after failure', (await q2.settled()) === false)

  // A failure snapshot taken at call time does not wait on writes enqueued later.
  const q3 = new WriteQueue()
  q3.send(
    async () => {},
    () => {}
  )
  const early = q3.settled()
  q3.send(
    async () => {},
    () => {}
  )
  check('settled snapshots inflight set', (await early) === true)
}

// send() itself never rejects on port failure (callers get boolean outcomes).
{
  const q = new WriteQueue()
  const r = await q.send(
    async () => {
      throw new Error('boom')
    },
    () => {}
  )
  check('send resolves not rejects on failure', r === false)
}

console.log(`\nsync: ${passed} passed, ${failed} failed`)
if (failed) throw new Error(`${failed} checks failed`)
