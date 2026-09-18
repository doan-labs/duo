// The site embeds the simulator it deploys with: build the shell at the repo
// root, then copy dist/ under public/device/ and its absolute-path assets
// (/model, /icons, /covers, and the /cdn and /preinstalled catalogs the runtime seeds
// Notes and Weather from) to the site root, because the shell loads them from `/`.
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const here = fileURLToPath(new URL('../', import.meta.url))
if (!existsSync(`${root}public/model/iPhone_Duo_Render.usdc`)) {
  console.error('simulator: public/model is missing; run `python3 scripts/prepare-model.py` at the repo root first')
  process.exit(1)
}
const build = spawnSync('bun', ['run', 'build'], { cwd: root, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)
const ROOTED = ['model', 'icons', 'covers', 'cdn', 'preinstalled']
// /catalog is assembled separately by catalog.ts from the catalog branch and dist/cdn.
for (const d of ['device', 'catalog', ...ROOTED]) rmSync(`${here}public/${d}`, { recursive: true, force: true })
cpSync(`${root}dist`, `${here}public/device`, { recursive: true })
for (const d of ROOTED) cpSync(`${root}dist/${d}`, `${here}public/${d}`, { recursive: true })
console.log(`simulator: copied dist/ → public/device/ and /${ROOTED.join(', /')}`)
