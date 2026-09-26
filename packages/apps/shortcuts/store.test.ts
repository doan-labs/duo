// Store-level coverage for the app: seed data is what the UI opens with, the
// runner produces states, history and feedback, and the editor flow creates,
// edits, toggles and deletes. `bun test` has no DOM - the runner takes a fake
// shell and the cells fall back to in-memory.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  automationsCell,
  closeEditor,
  deleteAutomation,
  deleteShortcut,
  GO_HOME,
  openAutomationEditor,
  openShortcutEditor,
  patchEditor,
  type Runner,
  runShortcut,
  runsCell,
  saveAutomation,
  saveShortcut,
  shortcutsCell,
  toggleAutomation
} from './store.ts'

const fakeOs = () => {
  const opened: string[] = []
  let home = 0
  const os: Runner = {
    open: (app, arg) => opened.push(arg ? `${app} ${arg}` : app),
    home: () => home++
  }
  return { os, opened, home: () => home }
}

test('the app opens on the seeded gallery: eight cards and three automations', () => {
  assert.equal(shortcutsCell.get().length, 8)
  assert.deepEqual(
    shortcutsCell.get().map((s) => s.name),
    [
      'Open Wikipedia',
      'Take a Photo',
      'Play Music',
      'Today’s News',
      'Call Home',
      'Find My Duo',
      'Start Sketch',
      'Go Home'
    ]
  )
  assert.equal(automationsCell.get().length, 3)
})

test('running a shortcut marks it done, reaches the shell and logs the run', async () => {
  const { os, opened } = fakeOs()
  const run = await runShortcut(shortcutsCell.get()[0]!, os, 0)
  assert.equal(run.ok, true)
  assert.match(run.detail, /Opened Safari/)
  assert.equal(opened[0], 'Safari https://en.m.wikipedia.org/wiki/Special:Random')
  assert.equal(runsCell.get()[0]!.id, run.id)
})

test('Go Home calls home and an unknown verb reports itself simulated', async () => {
  const { os, home } = fakeOs()
  const sc = { id: 't1', name: 'T', icon: '✨', steps: [{ action: GO_HOME }, { action: 'Bake Bread' }] }
  const run = await runShortcut(sc, os, 0)
  assert.equal(run.ok, true)
  assert.equal(home(), 1)
  assert.match(run.detail, /Simulated: Bake Bread/)
})

test('a shortcut with no actions fails visibly instead of dying silently', async () => {
  const { os } = fakeOs()
  const run = await runShortcut({ id: 't2', name: 'Empty', icon: '✨', steps: [] }, os, 0)
  assert.equal(run.ok, false)
  assert.equal(run.detail, 'No actions to run')
})

test('the editor creates, edits and deletes a shortcut', () => {
  const before = shortcutsCell.get().length
  openShortcutEditor()
  patchEditor({ name: '  My Thing  ', icon: '🔦', steps: [{ action: 'Safari', arg: 'https://x.dev' }] })
  const draft = { kind: 'shortcut', name: '  My Thing  ', icon: '🔦', steps: [{ action: 'Safari' }] } as const
  assert.equal(saveShortcut(draft), true)
  closeEditor()
  const made = shortcutsCell.get().at(-1)!
  assert.equal(made.name, 'My Thing')
  assert.equal(shortcutsCell.get().length, before + 1)

  assert.equal(
    saveShortcut({ kind: 'shortcut', id: made.id, name: 'Renamed', icon: '📖', steps: [{ action: 'Music' }] }),
    true
  )
  assert.equal(shortcutsCell.get().find((s) => s.id === made.id)!.name, 'Renamed')

  deleteShortcut(made.id)
  assert.equal(shortcutsCell.get().length, before)
  assert.equal(
    shortcutsCell.get().some((s) => s.id === made.id),
    false
  )
})

test('an empty draft cannot be saved', () => {
  assert.equal(saveShortcut({ kind: 'shortcut', name: '   ', icon: '✨', steps: [] }), false)
})

test('the automation editor opens a draft, saves edits and the row toggles', () => {
  const au = automationsCell.get()[0]!
  openAutomationEditor(au)
  assert.equal(
    saveAutomation({ kind: 'automation', id: au.id, trigger: 'At sunrise', action: 'Open Mail', enabled: false }),
    true
  )
  const saved = automationsCell.get().find((a) => a.id === au.id)!
  assert.equal(saved.trigger, 'At sunrise')
  assert.equal(saved.enabled, false)

  toggleAutomation(au.id)
  assert.equal(automationsCell.get().find((a) => a.id === au.id)!.enabled, true)

  const len = automationsCell.get().length
  deleteAutomation(au.id)
  assert.equal(automationsCell.get().length, len - 1)
})
