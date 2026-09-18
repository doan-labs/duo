import { cp } from 'node:fs/promises'
import { buildApp } from './build-app.ts'

export async function buildPreinstalled() {
  for (const name of ['notes', 'weather']) {
    try {
      await buildApp(`packages/apps/${name}`)
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('Immutable release already exists:')) throw error
    }
  }
  await cp('dist/cdn', 'dist/preinstalled', { recursive: true })
}
if (import.meta.main) await buildPreinstalled()
