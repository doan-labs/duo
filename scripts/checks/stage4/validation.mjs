import assert from 'node:assert/strict'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileDesignLiterals } from '../../../packages/cli/design.mjs'
import { typecheckApp, validateSources } from '../../../packages/cli/validate.mjs'

const folder = await mkdtemp(join(tmpdir(), 'duo-validation-'))
try {
  const source = join(folder, 'main.tsx')
  for (const code of [
    "import '../shell/main.ts'",
    "export * from '@doan-labs/duo-shell/native.ts'",
    "import { Notes } from '@doan-labs/duo-app-notes'",
    "import('/private/shell.ts')",
    "import('https://example.com/code.js')",
    "const file = 'arbitrary'; import(file)",
    'window.__TAURI_INTERNALS__.invoke("anything")'
  ]) {
    await Bun.write(source, code)
    await assert.rejects(validateSources(folder), undefined, code)
  }
  await Bun.write(source, "import './safe.ts'; export const ready = true")
  await symlink(join(process.cwd(), 'packages/shell/main.ts'), join(folder, 'safe.ts'))
  await assert.rejects(validateSources(folder), /symlink|escapes/)
  await rm(join(folder, 'safe.ts'))
  await Bun.write(source, 'export const count: number = "invalid"')
  await assert.rejects(typecheckApp(folder, await validateSources(folder)), /Typecheck failed/)
  await Bun.write(source, 'export const count: number = 42')
  await typecheckApp(folder, await validateSources(folder))
  await rm(source)
  await Bun.write(join(folder, 'main.js'), '/** @type {number} */\nexport const count = "invalid"')
  await assert.rejects(typecheckApp(folder, await validateSources(folder)), /Typecheck failed/)
  await Bun.write(join(folder, 'main.js'), '/** @type {number} */\nexport const count = 42')
  await typecheckApp(folder, await validateSources(folder))
  // DESIGN.md section 3: typed lengths in a style table are caught, token steps and plain data are not.
  const styled = join(folder, 'styles.ts')
  const kinds = async (code) => {
    await Bun.write(styled, code)
    return (await fileDesignLiterals(styled)).map((hit) => hit.kind)
  }
  assert.deepEqual(await kinds("stylex.create({ a: { paddingTop: 12, marginLeft: -4, gap: '6px' } })"), [
    'spacing',
    'spacing',
    'spacing'
  ])
  assert.deepEqual(await kinds("stylex.create({ a: { top: { default: 8, ':hover': space.sm } } })"), ['spacing'])
  assert.deepEqual(await kinds("stylex.create({ a: { color: '#fff', fontSize: 13 } })"), ['colour', 'style'])
  assert.deepEqual(
    await kinds("stylex.create({ a: { paddingTop: space.md, marginTop: 0, left: 1, width: '50%' } })"),
    []
  )
  assert.deepEqual(await kinds('const rect = { top: 5, left: 20 }'), [])
  await rm(styled)
  console.log(
    'Validation PASS: relative/package/remote/dynamic/native/symlink imports reject; strict type errors reject; typed style values caught; valid app passes'
  )
} finally {
  await rm(folder, { recursive: true, force: true })
}
