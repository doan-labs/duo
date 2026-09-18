import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PlatformError } from './guards.ts'
import { KVMirror } from './mirror.ts'
import type { Change, KV, Snapshot } from './protocol.ts'

test('typing during hydration and an old echo never replace the latest edit', async () => {
  let hydrate!: (s: Snapshot) => void
  let notify!: (c: Change) => void
  const acks: ((v: { rev: number }) => void)[] = []
  const space: KV = {
    get: async () => null,
    keys: async () => ({ keys: [] }),
    del: async () => ({ rev: 0 }),
    snapshot: () =>
      new Promise((resolve) => {
        hydrate = resolve
      }),
    watch: (_, cb) => {
      notify = cb
      return () => {}
    },
    set: () =>
      new Promise((resolve) => {
        acks.push(resolve)
      })
  }
  const mirror = new KVMirror(space)
  mirror.subscribe(() => {})
  mirror.write('note', 'first')
  hydrate({ rev: 0, entries: [['note', 'old']] })
  await new Promise((r) => setTimeout(r, 0))
  mirror.write('note', 'second')
  notify({ rev: 1, k: 'note', v: 'first' })
  acks[0]!({ rev: 1 })
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(mirror.read('note').value, 'second')
  assert.equal(mirror.read('note').status, 'saving')
  acks[1]!({ rev: 2 })
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(mirror.read('note').status, 'ready')
})
test('failed persistence keeps the optimistic empty string and exposes failure', async () => {
  const space: KV = {
    get: async () => null,
    keys: async () => ({ keys: [] }),
    del: async () => ({ rev: 0 }),
    snapshot: async () => ({ rev: 0, entries: [] }),
    watch: () => () => {},
    set: async () => {
      throw new PlatformError('E_STORAGE')
    }
  }
  const mirror = new KVMirror(space)
  mirror.subscribe(() => {})
  mirror.write('note', '')
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(mirror.read('note'), { value: '', status: 'error', error: 'E_STORAGE' })
})
