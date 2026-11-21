// The storage contract on @doan-labs/mono, through its Node engine in memory,
// plus what only this backend does: large values kept in fs, and field names
// Mono refuses carried as JSON text.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { open } from '@doan-labs/mono'
import { entries, put, read, remove, setBackend, transaction } from './database.ts'
import { monoBackend } from './database-mono.ts'
import { storageCases } from './storage-cases.test.ts'

const store = await open(`duo-test-${process.pid}`, { backend: 'memory' })
setBackend(monoBackend(store))
storageCases('mono')

test('blobs, icon lists and long strings live in fs and come back whole', async () => {
  const html = 'x'.repeat(200 * 1024)
  const icons = [new Blob(['a'], { type: 'image/png' }), new Blob(['bc'], { type: 'image/webp' })]
  await transaction(['releases'], 'readwrite', (tx) =>
    put(tx, 'releases', 'big@1', { release: { id: 'big' }, html, icons, committedAt: 1 })
  )
  const got = await transaction(['releases'], 'readonly', (tx) =>
    read<{ html: string; icons: Blob[]; committedAt: number }>(tx, 'releases', 'big@1')
  )
  assert.equal(got?.html, html)
  assert.deepEqual(await Promise.all(got!.icons.map(async (b) => [b.type, await b.text()])), [
    ['image/png', 'a'],
    ['image/webp', 'bc']
  ])
  assert.equal(got?.committedAt, 1)
  const files = await store.fs.readdir('/large')
  assert.equal(files.length, 3)
  await transaction(['releases'], 'readwrite', (tx) => remove(tx, 'releases', 'big@1'))
  assert.deepEqual(await store.fs.readdir('/large'), [])
})

test('a listing without large fields skips the fs reads', async () => {
  await transaction(['appfiles'], 'readwrite', (tx) =>
    put(tx, 'appfiles', ['files.app', 'a.txt'], { blob: new Blob(['hello']), type: '', size: 5, at: 2 })
  )
  const [[name, row]] = await transaction(['appfiles'], 'readonly', (tx) =>
    entries<{ blob?: Blob; size: number }>(tx, 'appfiles', 'files.app', { large: false })
  )
  assert.equal(name, 'a.txt')
  assert.equal(row.size, 5)
  assert.equal(row.blob, undefined)
  const full = await transaction(['appfiles'], 'readonly', (tx) =>
    read<{ blob: Blob }>(tx, 'appfiles', ['files.app', 'a.txt'])
  )
  assert.equal(await full?.blob.text(), 'hello')
})

test('values with dotted or dollar keys round-trip', async () => {
  const value = { 'labs.doan.notes': { $ref: 1 }, plain: [1, { 'a.b': true }] }
  await transaction(['legacy'], 'readwrite', (tx) => put(tx, 'legacy', 'dots', value))
  assert.deepEqual(await transaction(['legacy'], 'readonly', (tx) => read(tx, 'legacy', 'dots')), value)
})

test('an error thrown inside a transaction rolls back its fs writes too', async () => {
  await assert.rejects(
    transaction(['appfiles'], 'readwrite', async (tx) => {
      await put(tx, 'appfiles', ['files.app', 'b.bin'], { blob: new Blob(['zz']), type: '', size: 2, at: 3 })
      throw new Error('boom')
    })
  )
  assert.equal(
    await transaction(['appfiles'], 'readonly', (tx) => read(tx, 'appfiles', ['files.app', 'b.bin'])),
    undefined
  )
  assert.equal((await store.fs.readdir('/large')).length, 1)
})
