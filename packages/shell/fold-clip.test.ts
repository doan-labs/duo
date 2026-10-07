import assert from 'node:assert/strict'
import { test } from 'node:test'
import { foldClip, panelGone } from './fold-clip.ts'

// The glass plane and hinge of the Apple model, the same numbers main.ts hands
// the render loop. Duplicated here because they are geometry, not settings.
const INNER = { x: -7.89935, w: 15.7987, z: 0.24948 }
const HINGE_Z = 0.275454
const EYE_Z = 40

test('flat and closed are the exact ends: nothing taken, everything taken', () => {
  assert.equal(foldClip(0, 0, EYE_Z, INNER, HINGE_Z), 0)
  assert.equal(foldClip(Math.PI, 0, EYE_Z, INNER, HINGE_Z), 1)
})

test('the clip stays inside [0, 1] across the sweep and is finite at the ends', () => {
  for (let i = 0; i <= 360; i++) {
    const clip = foldClip((i / 360) * Math.PI, 0, EYE_Z, INNER, HINGE_Z)
    assert.ok(Number.isFinite(clip), `bend ${i}/360 pi`)
    assert.ok(clip >= 0 && clip <= 1, `bend ${i}/360 pi -> ${clip}`)
  }
})

test('closing takes more glass monotonically until the panel is gone', () => {
  let prev = -1
  for (const bend of [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4, Math.PI]) {
    const clip = foldClip(bend, 0, EYE_Z, INNER, HINGE_Z)
    assert.ok(clip > prev, `bend ${bend} -> ${clip} after ${prev}`)
    prev = clip
  }
})

test('panelGone only fires once the fold has taken the whole width', () => {
  assert.equal(panelGone(foldClip(Math.PI, 0, EYE_Z, INNER, HINGE_Z)), true)
  assert.equal(panelGone(foldClip(0, 0, EYE_Z, INNER, HINGE_Z)), false)
  // The free edge covers the last sliver of glass near 20 degrees, not at 0.
  assert.equal(panelGone(foldClip(2.5, 0, EYE_Z, INNER, HINGE_Z)), false)
  assert.equal(panelGone(0.9999), false)
  assert.equal(panelGone(1), true)
})

test('an orbited eye still cuts a finite clip inside bounds', () => {
  // 30 degrees off axis at the same distance: a sliver of the inner display
  // still peeks past the fold, so the panel is not gone.
  const x = EYE_Z * Math.sin(Math.PI / 6)
  const z = EYE_Z * Math.cos(Math.PI / 6)
  const clip = foldClip(Math.PI, x, z, INNER, HINGE_Z)
  assert.ok(Number.isFinite(clip))
  assert.ok(clip > 0 && clip < 1)
  assert.equal(panelGone(clip), false)
})

test('the degenerate eye-on-fold-plane case resolves by the limit, not NaN', () => {
  // An eye parked exactly on the folded edge's plane used to divide by zero.
  // The limit follows the lean of the edge instead of trusting the sign of t.
  const depth = -Math.sin(Math.PI) * INNER.x + Math.cos(Math.PI) * (INNER.z - HINGE_Z) + HINGE_Z
  assert.equal(foldClip(Math.PI, 0, depth, INNER, HINGE_Z), 1)
  assert.equal(foldClip(Math.PI, 10, depth, INNER, HINGE_Z), 0)
})
