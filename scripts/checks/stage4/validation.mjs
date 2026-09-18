import assert from 'node:assert/strict'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  console.log(
    'Validation PASS: relative/package/remote/dynamic/native/symlink imports reject; strict type errors reject; valid app passes'
  )
} finally {
  await rm(folder, { recursive: true, force: true })
}
