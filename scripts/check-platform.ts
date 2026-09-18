const run = async (args: string[]) => {
  const child = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' })
  if (await child.exited) throw new Error(`Failed: ${args.join(' ')}`)
}
await run(['bun', 'run', 'typecheck'])
await run(['bun', 'test', 'packages/sdk', 'packages/fixtures'])
await run(['bun', 'scripts/generate-kit-docs.ts', '--check'])
await run(['bun', 'scripts/check-app-tokens.ts'])
await run(['bun', 'scripts/checks/stage4/validation.mjs'])
for (const folder of ['packages/apps/notes', 'packages/apps/weather', 'examples/fold-compass', 'examples/developer'])
  await run(['bun', 'packages/cli/index.mjs', 'check', folder])
await run(['bun', 'scripts/checks/publish/publisher.mjs'])
await run(['bun', 'run', 'build'])
