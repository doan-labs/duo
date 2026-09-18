import { cp, readdir } from 'node:fs/promises'

/** Every official app with a manifest: the ones that run as isolated releases rather than baked into the shell. */
export async function preinstalledApps() {
  const names = []
  for (const name of (await readdir('packages/apps')).sort())
    if (await Bun.file(`packages/apps/${name}/manifest.json`).exists()) names.push(name)
  return names
}

export async function buildPreinstalled() {
  // One process per app: the StyleX Babel plugin keeps module state that a fourth build in a row trips over.
  for (const name of await preinstalledApps()) {
    const run = Bun.spawnSync(['bun', 'scripts/build-app.ts', `packages/apps/${name}`], { stderr: 'pipe' })
    const stderr = run.stderr.toString()
    if (run.exitCode !== 0 && !stderr.includes('Immutable release already exists:')) throw new Error(stderr)
  }
  await cp('dist/cdn', 'dist/preinstalled', { recursive: true })
}
if (import.meta.main) await buildPreinstalled()
