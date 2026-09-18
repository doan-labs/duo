// The playlist is real media under someone else's licence, so the two ways it
// rots are covered here: a cover path that no longer has a file behind it, and a
// track added under a licence the project cannot honour.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { TRACKS } from './tracks.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))

test('every cover names a file that ships in public/', () => {
  for (const t of TRACKS) {
    assert.match(t.cover, /^\/covers\/[a-z0-9-]+\.webp$/, `${t.title}: cover is not a /covers path`)
    assert.ok(existsSync(`${root}public${t.cover}`), `${t.title}: ${t.cover} is missing from public/`)
  }
})

test('every track streams from the Internet Archive item it credits', () => {
  for (const t of TRACKS) {
    const item = new URL(t.source).pathname.replace('/details/', '')
    assert.ok(t.src.startsWith(`https://archive.org/download/${item}/`), `${t.title}: src is not from ${item}`)
    assert.ok(t.secs > 0, `${t.title}: no running time`)
  }
})

test('nothing is under a NonCommercial or NoDerivatives licence', () => {
  for (const t of TRACKS)
    assert.match(t.license, /^(CC BY( |-SA )[0-9.]+|CC0 1\.0)$/, `${t.title}: ${t.license} is not usable here`)
})
